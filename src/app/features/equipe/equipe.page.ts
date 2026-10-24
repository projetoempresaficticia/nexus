import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { Papel, Pessoa } from '../../core/models/acesso.model';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { NovoSetorModal } from '../setores/novo-setor.modal';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { PillStatusComponent } from '../../shared/ui/pill-status.component';
import { ancestrais, ordenarArvore } from '../../shared/utils/arvore';
import { progressoPorFilhos } from '../../shared/utils/progresso';

interface Passo {
  pessoa: Pessoa;
  setor: string;
}

const ORDEM_PAPEL: Record<Papel, number> = { lider: 0, membro: 1 } as Record<Papel, number>;

/**
 * Equipe (US-06): a minha linha de decisão e o organograma dos meus setores e dos de cima,
 * com líder, pessoas, projetos e itens abertos.
 */
@Component({
  selector: 'app-equipe-page',
  imports: [
    RouterLink,
    NgTemplateOutlet,
    CabecalhoComponent,
    AvatarComponent,
    PillStatusComponent,
    NovoSetorModal,
  ],
  templateUrl: './equipe.page.html',
  styleUrl: './equipe.page.css',
})
export class EquipePage {
  protected readonly acesso = inject(AcessoStore);
  private readonly itens = inject(ItensStore);
  protected readonly t = TEXTOS;

  /** Escolhas de abrir/fechar: 'k:<id>' subsetores, 'd:<id>' detalhes. */
  private readonly abertos = signal<ReadonlyMap<string, boolean>>(new Map());
  /** Modal de novo setor: null fechado, '' setor principal (Adm), id = subsetor de. */
  protected readonly criando = signal<string | null>(null);

  private readonly eu = computed(() => this.acesso.perfil()?.id ?? null);
  private readonly meusVinculos = computed(() => {
    const eu = this.eu();
    const p = eu ? this.acesso.pessoaPorId().get(eu) : undefined;
    return new Map((p?.vinculos ?? []).map((v) => [v.setor_id, v.papel]));
  });

  /** Líderes do setor (vínculo direto). */
  private lideres(setorId: string): Pessoa[] {
    return this.acesso
      .pessoas()
      .filter((p) => p.vinculos.some((v) => v.setor_id === setorId && v.papel === 'lider'));
  }

  /** Do setor até a raiz, cada líder encontrado (sem mim, se `semMim`). */
  protected cadeia(setorId: string, semMim = false): Passo[] {
    const setores = this.acesso.setores();
    const ids = [setorId, ...ancestrais(setorId, setores).map((s) => s.id)];
    return ids.flatMap((id) =>
      this.lideres(id)
        .filter((p) => !semMim || p.id !== this.eu())
        .map((pessoa) => ({ pessoa, setor: this.acesso.nomeSetor(id) })),
    );
  }

  protected readonly minhasLinhas = computed(() =>
    this.acesso.meusSetores().map((s) => ({
      id: s.id,
      texto: this.t.equipe.voceE(this.acesso.caminhoSetor(s.id), this.t.papel[s.papel]),
      passos: this.cadeia(s.id, true),
    })),
  );

  /** Nós do organograma em ordem de árvore, com profundidade (para recuo via org-kids). */
  protected readonly raizes = computed(() => {
    const setores = this.acesso.setores();
    const ids = new Set(setores.map((s) => s.id));
    return ordenarArvore(setores.filter((s) => !s.pai_id || !ids.has(s.pai_id))).map(
      ({ no }) => no.id,
    );
  });

  protected filhos(id: string): string[] {
    return this.acesso
      .setores()
      .filter((s) => s.pai_id === id)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
      .map((s) => s.id);
  }

  protected no(id: string) {
    const setor = this.acesso.setores().find((s) => s.id === id)!;
    const direto = this.meusVinculos().get(id) ?? null;
    const herdado = !direto && this.acesso.administrados().has(id);
    const pessoas = this.acesso
      .pessoas()
      .filter((p) => p.vinculos.some((v) => v.setor_id === id))
      .map((p) => ({ pessoa: p, papel: p.vinculos.find((v) => v.setor_id === id)!.papel }))
      .sort(
        (a, b) =>
          ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel] ||
          a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt'),
      );
    const projetos = this.itens.todos().filter((i) => i.nivel === 0 && i.setor_id === id);
    const abertos = this.itens
      .todos()
      .filter((i) => i.nivel > 0 && i.setor_id === id && i.status !== 'concluida').length;
    const filhos = this.filhos(id);
    return {
      id,
      nome: setor.nome,
      visivel: setor.visivel,
      meu: !!direto,
      papel: direto ? this.t.papel[direto] : herdado ? this.t.equipe.admHerdado : null,
      classePapel: direto === 'lider' ? 's-lider' : 's-adm',
      lideres: this.lideres(id),
      pessoas,
      projetos: projetos.map((p) => ({
        item: p,
        responsavel: p.responsaveis[0]
          ? this.acesso.pessoaPorId().get(p.responsaveis[0])
          : undefined,
        percentual: progressoPorFilhos(this.itens.filhos(p.id))?.percentual ?? 0,
      })),
      resumo:
        this.t.equipe.resumo(pessoas.length, projetos.length) +
        (setor.visivel ? this.t.equipe.abertos(abertos) : ''),
      filhos,
      filhosAbertos: this.abertos().get(`k:${id}`) ?? true,
      detalhesAbertos: this.abertos().get(`d:${id}`) ?? !!direto,
      cadeia: this.cadeia(id),
      // Líder cria subsetor só abaixo do que administra (o banco confere)
      podeSubsetor: this.acesso.administrados().has(id),
    };
  }

  constructor() {
    void this.itens.carregar();
  }

  protected alternar(chave: string, atual: boolean): void {
    this.abertos.update((m) => new Map(m).set(chave, !atual));
  }
}
