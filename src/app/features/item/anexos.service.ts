import { Injectable, inject } from '@angular/core';
import { Tables } from '../../core/models/database.types';
import { ErroApi, lancarSeErro } from '../../core/services/erro-api';
import { SUPABASE } from '../../core/supabase.client';

export type Anexo = Tables<'anexos'>;
export const LIMITE_BYTES = 20 * 1024 * 1024;
const BUCKET = 'anexos';

/** Nome seguro para o Storage: sem acentos, espaços ou barras. */
export function nomeSeguro(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(-120) || 'arquivo'
  );
}

/** Código de erro que a Edge Function devolve no corpo ({ erro }); sem corpo legível, rede. */
async function codigoDaFuncao(error: unknown): Promise<string> {
  const resposta = (error as { context?: unknown }).context;
  if (resposta instanceof Response) {
    const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
    if (corpo?.erro) return corpo.erro;
  }
  return 'rede';
}

/**
 * Anexos (US-20). Arquivo anexado vai para o Google Drive partilhado, numa pasta por setor, pela Edge
 * Function enviar-anexo; a linha guarda o link (link_externo) e o drive_id (T-52). Imagens coladas
 * no texto ficam no bucket privado `anexos` em {setor_id}/{item_id}/{uuid}-{nome}, com URL assinada.
 */
@Injectable({ providedIn: 'root' })
export class AnexosService {
  private readonly supabase = inject(SUPABASE);

  async listar(itemId: string): Promise<Anexo[]> {
    const { data, error } = await this.supabase
      .from('anexos')
      .select('*')
      .eq('item_id', itemId)
      .is('comentario_id', null)
      .order('criado_em');
    lancarSeErro(error);
    return data ?? [];
  }

  async enviar(
    item: { id: string; setor_id: string },
    arquivo: File,
    enviadoPor: string,
    comentarioId: string | null = null,
  ): Promise<Anexo> {
    if (arquivo.size > LIMITE_BYTES) throw new ErroApi('arquivo_grande');
    const corpo = new FormData();
    corpo.append('item_id', item.id);
    if (comentarioId) corpo.append('comentario_id', comentarioId);
    corpo.append('arquivo', arquivo);
    const { data, error } = await this.supabase.functions.invoke<Anexo>('enviar-anexo', {
      body: corpo,
    });
    if (!error && data) return data;
    const codigo = error ? await codigoDaFuncao(error) : 'rede';
    // Sem os secrets do Drive (desenvolvimento), o arquivo fica no Storage como antes
    if (codigo === 'drive_nao_configurado') {
      return this.enviarStorage(item, arquivo, enviadoPor, comentarioId);
    }
    throw new ErroApi(codigo);
  }

  private async enviarStorage(
    item: { id: string; setor_id: string },
    arquivo: File,
    enviadoPor: string,
    comentarioId: string | null = null,
  ): Promise<Anexo> {
    if (arquivo.size > LIMITE_BYTES) throw new ErroApi('arquivo_grande');
    const caminho = `${item.setor_id}/${item.id}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;
    const envio = await this.supabase.storage.from(BUCKET).upload(caminho, arquivo, {
      contentType: arquivo.type || undefined,
      upsert: false,
    });
    if (envio.error) throw new ErroApi('rede');
    const { data, error } = await this.supabase
      .from('anexos')
      .insert({
        item_id: item.id,
        comentario_id: comentarioId,
        nome: arquivo.name,
        caminho,
        tamanho_bytes: arquivo.size,
        mime: arquivo.type || null,
        enviado_por: enviadoPor,
      })
      .select()
      .single();
    if (error) {
      await this.supabase.storage.from(BUCKET).remove([caminho]);
      lancarSeErro(error);
    }
    return data!;
  }

  async adicionarLink(
    itemId: string,
    nome: string,
    url: string,
    enviadoPor: string,
  ): Promise<Anexo> {
    const { data, error } = await this.supabase
      .from('anexos')
      .insert({ item_id: itemId, nome, link_externo: url, enviado_por: enviadoPor })
      .select()
      .single();
    lancarSeErro(error);
    return data!;
  }

  /** Apaga a linha (RLS: quem enviou ou líder) e depois o arquivo (no Drive, pela fila do banco). */
  async apagar(anexo: Anexo): Promise<void> {
    const { error } = await this.supabase.from('anexos').delete().eq('id', anexo.id);
    lancarSeErro(error);
    if (anexo.caminho) await this.supabase.storage.from(BUCKET).remove([anexo.caminho]);
    if (anexo.drive_id) void this.limpar([]);
  }

  /**
   * Depois de excluir item ou anexo: a Edge Function apaga os arquivos órfãos do Storage e manda para
   * a lixeira do Drive os da fila (sem erro para a pessoa).
   */
  async limpar(caminhos: string[]): Promise<void> {
    try {
      await this.supabase.functions.invoke('limpar-anexos', { body: { caminhos } });
    } catch {
      // limpeza é melhor esforço: arquivo órfão não aparece para ninguém
    }
  }

  private readonly cacheImagens = new Map<string, { url: string; ate: number }>();

  /** URL de imagem embutida (1 h), guardada por 50 min para não pedir de novo a cada tela. */
  async urlImagem(caminho: string): Promise<string> {
    const guardada = this.cacheImagens.get(caminho);
    if (guardada && guardada.ate > Date.now()) return guardada.url;
    const url = await this.urlAssinada(caminho, 3600);
    this.cacheImagens.set(caminho, { url, ate: Date.now() + 50 * 60 * 1000 });
    return url;
  }

  /** Imagem colada no editor: vira anexo do item e devolve o que o editor precisa. */
  async enviarImagem(
    item: { id: string; setor_id: string },
    arquivo: File,
    enviadoPor: string,
  ): Promise<{ src: string; caminho: string }> {
    const anexo = await this.enviarStorage(item, arquivo, enviadoPor);
    return { src: await this.urlImagem(anexo.caminho!), caminho: anexo.caminho! };
  }

  /** URL temporária para abrir/baixar (60 s por padrão). */
  async urlAssinada(caminho: string, segundos = 60): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(caminho, segundos);
    if (error || !data) throw new ErroApi('nao_encontrado');
    return data.signedUrl;
  }
}
