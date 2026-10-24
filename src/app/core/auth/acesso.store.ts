import { Injectable, computed, inject, signal } from '@angular/core';
import { ancestrais, descendentes, ordenarArvore } from '../../shared/utils/arvore';
import { DadosIniciais, Papel } from '../models/acesso.model';
import { ErroApi } from '../services/erro-api';
import { AcessoService } from './acesso.service';

/** Papel efetivo num setor: vínculo direto, ou "adm" herdado de liderar um setor acima. */
export type PapelEfetivo = Papel | 'adm';

export interface OpcaoSetor {
  id: string;
  nome: string;
  nivel: number;
  papel: PapelEfetivo | null;
}

/** Quem sou, o que vejo e o que administro — carregado uma vez por sessão (carregar_inicial). */
@Injectable({ providedIn: 'root' })
export class AcessoStore {
  private readonly service = inject(AcessoService);
  private readonly _dados = signal<DadosIniciais | null>(null);
  private readonly _pendentes = signal(0);

  /** Filtro de setor do cabeçalho: 'todos' ou o id de um setor. */
  readonly setorFiltro = signal<string>('todos');

  readonly carregado = computed(() => this._dados() !== null);
  readonly perfil = computed(() => this._dados()?.perfil ?? null);
  readonly ehAdmin = computed(() => this.perfil()?.is_admin ?? false);
  readonly administrados = computed(() => new Set(this._dados()?.setores_administrados ?? []));
  /** Líder de algum setor (o Adm do sistema também conta). */
  readonly ehLider = computed(() => this.administrados().size > 0);
  readonly setores = computed(() => this._dados()?.setores ?? []);
  readonly pessoas = computed(() => this._dados()?.pessoas ?? []);
  readonly pendentes = this._pendentes.asReadonly();
  readonly pessoaPorId = computed(() => new Map(this.pessoas().map((p) => [p.id, p])));
  private readonly setorPorId = computed(() => new Map(this.setores().map((s) => [s.id, s])));

  nomeSetor(id: string): string {
    return this.setorPorId().get(id)?.nome ?? '—';
  }

  /** Quem pode ser responsável no setor: vínculo direto ou líder de um setor acima (= privado.perfil_no_setor). */
  pessoasDoSetor(setorId: string) {
    const acima = new Set(ancestrais(setorId, this.setores()).map((s) => s.id));
    return this.pessoas().filter((p) =>
      p.vinculos.some(
        (v) => v.setor_id === setorId || (v.papel === 'lider' && acima.has(v.setor_id)),
      ),
    );
  }

  /** Linha de decisão: líderes do setor e dos setores acima, do mais próximo à raiz (US-06). */
  decisores(setorId: string): { setor: string; lideres: string[] }[] {
    const cadeia = [this.setorPorId().get(setorId), ...ancestrais(setorId, this.setores())].filter(
      (s) => !!s,
    );
    return cadeia.map((s) => ({
      setor: s.nome,
      lideres: this.pessoas()
        .filter((p) => p.vinculos.some((v) => v.setor_id === s.id && v.papel === 'lider'))
        .map((p) => p.nome),
    }));
  }

  /** Caminho do setor: "Secretaria › Pedagógico › Sucesso do Aluno". */
  caminhoSetor(setorId: string): string {
    return [
      ...ancestrais(setorId, this.setores())
        .reverse()
        .map((s) => s.nome),
      this.nomeSetor(setorId),
    ].join(' › ');
  }

  incrementarPendentes(delta: number): void {
    this._pendentes.update((n) => Math.max(0, n + delta));
  }

  /** Setores com vínculo direto, em ordem de árvore, com o papel (bloco "Meus setores"). */
  readonly meusSetores = computed(() => {
    const papeis = new Map((this._dados()?.vinculos ?? []).map((v) => [v.setor_id, v.papel]));
    return ordenarArvore(this.setores().filter((s) => papeis.has(s.id))).map(({ no }) => ({
      id: no.id,
      nome: no.nome,
      papel: papeis.get(no.id)!,
    }));
  });

  readonly qtdLideranca = computed(
    () => (this._dados()?.vinculos ?? []).filter((v) => v.papel === 'lider').length,
  );

  /** Opções do seletor de Setor: setores visíveis em árvore, com o papel efetivo. */
  readonly opcoesSetor = computed<OpcaoSetor[]>(() => {
    const visiveis = this.setores().filter((s) => s.visivel);
    const diretos = new Map((this._dados()?.vinculos ?? []).map((v) => [v.setor_id, v.papel]));
    return ordenarArvore(visiveis).map(({ no, nivel }) => ({
      id: no.id,
      nome: no.nome,
      nivel,
      papel: diretos.get(no.id) ?? (this.administrados().has(no.id) ? 'adm' : null),
    }));
  });

  /** Ids de setor que as telas devem mostrar conforme o filtro (o escolhido e os de baixo). */
  readonly setoresDoFiltro = computed(() => {
    const visiveis = this.setores().filter((s) => s.visivel);
    const filtro = this.setorFiltro();
    if (filtro === 'todos') return visiveis.map((s) => s.id);
    const abaixo = descendentes(filtro, visiveis);
    return visiveis.filter((s) => abaixo.has(s.id)).map((s) => s.id);
  });

  /** 'sem_acesso' quando o perfil não existe ou está desativado. */
  async carregar(): Promise<'ok' | 'sem_acesso'> {
    try {
      const dados = await this.service.carregarInicial();
      this._dados.set(dados);
      this._pendentes.set(await this.service.contarSolicitacoesPendentes(dados.perfil.id));
      return 'ok';
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === 'sem_permissao') return 'sem_acesso';
      throw e;
    }
  }

  limpar(): void {
    this._dados.set(null);
    this._pendentes.set(0);
    this.setorFiltro.set('todos');
  }
}
