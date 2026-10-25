import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ancestrais, descendentes, ordenarArvore } from '../../shared/utils/arvore';
import { DadosIniciais, Papel, Pessoa } from '../models/acesso.model';
import { CacheLocalService } from '../services/cache-local.service';
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

interface Retrato {
  dados: DadosIniciais;
  pendentes: number;
}

/** Quem sou, o que vejo e o que administro — carregado uma vez por sessão (carregar_inicial). */
@Injectable({ providedIn: 'root' })
export class AcessoStore {
  private readonly service = inject(AcessoService);
  private readonly cache = inject(CacheLocalService);
  private readonly router = inject(Router);
  private readonly _dados = signal<DadosIniciais | null>(null);
  private readonly _pendentes = signal(0);
  /** Quem foi desativado: só para mostrar o nome (nunca entra em listas de escolha). */
  private readonly _inativos = signal<Pessoa[]>([]);

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
  readonly pessoaPorId = computed(
    () => new Map([...this._inativos(), ...this.pessoas()].map((p) => [p.id, p])),
  );
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

  /** Tempo real: uma solicitação mudou — conta de novo as pendentes para mim. */
  async recontarPendentes(): Promise<void> {
    const eu = this.perfil()?.id;
    if (!eu) return;
    try {
      this._pendentes.set(await this.service.contarSolicitacoesPendentes(eu));
    } catch {
      // mantém o número atual
    }
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
    // Abertura instantânea (T-44): mostra o retrato e confirma no servidor em segundo plano.
    const retrato = await this.cache.ler<Retrato>('acesso');
    if (!retrato) return this.buscar();
    this._dados.set(retrato.dados);
    this._pendentes.set(retrato.pendentes);
    void this.buscar().then(
      async (r) => {
        if (r === 'ok') return;
        // Foi desativado desde a última visita
        this.limpar();
        await this.cache.limpar();
        await this.router.navigateByUrl('/sem-acesso');
      },
      () => undefined, // sem internet: fica com o retrato
    );
    return 'ok';
  }

  private async buscar(): Promise<'ok' | 'sem_acesso'> {
    try {
      const dados = await this.service.carregarInicial();
      const pendentes = await this.service.contarSolicitacoesPendentes(dados.perfil.id);
      this._dados.set(dados);
      this._pendentes.set(pendentes);
      void this.cache.gravar('acesso', { dados, pendentes } satisfies Retrato);
      void this.carregarInativos();
      return 'ok';
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === 'sem_permissao') return 'sem_acesso';
      throw e;
    }
  }

  /** Depois de o Adm mudar pessoas ou vínculos: busca de novo, sem "Carregando…". */
  async recarregar(): Promise<void> {
    try {
      await this.buscar();
    } catch {
      // continua com o que tem
    }
  }

  private async carregarInativos(): Promise<void> {
    try {
      const l = await this.service.pessoasInativas();
      this._inativos.set(l.map((p) => ({ ...p, email: '', vinculos: [] })));
    } catch {
      // sem a lista, aparece "Pessoa removida"
    }
  }

  /** Liga/desliga o e-mail de avisos (T-59); o sino continua avisando dentro do app de qualquer jeito. */
  async atualizarPreferenciaEmail(valor: boolean): Promise<void> {
    const antes = this._dados();
    if (!antes) return;
    const depois: DadosIniciais = {
      ...antes,
      perfil: { ...antes.perfil, receber_email_notificacoes: valor },
    };
    this._dados.set(depois);
    void this.cache.gravar('acesso', {
      dados: depois,
      pendentes: this._pendentes(),
    } satisfies Retrato);
    try {
      await this.service.atualizarPreferenciaEmail(antes.perfil.id, valor);
    } catch (e) {
      this._dados.set(antes);
      void this.cache.gravar('acesso', {
        dados: antes,
        pendentes: this._pendentes(),
      } satisfies Retrato);
      throw e;
    }
  }

  limpar(): void {
    this._inativos.set([]);
    this._dados.set(null);
    this._pendentes.set(0);
    this.setorFiltro.set('todos');
  }
}
