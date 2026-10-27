import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { BarraComponent } from '../../shared/ui/barra.component';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { VazioComponent } from '../../shared/ui/vazio.component';
import {
  ehResponsavelAbaixo,
  paradosAbaixo,
  progressoPorFilhos,
} from '../../shared/utils/progresso';
import { NovoItemModal } from '../tarefas/novo-item.modal';

/** Grade de projetos com progresso e parados (US-07); cartão "Sem projeto" para as tarefas avulsas (US-34). */
@Component({
  selector: 'app-projetos-page',
  imports: [
    RouterLink,
    CabecalhoComponent,
    BarraComponent,
    VazioComponent,
    CarregandoComponent,
    NovoItemModal,
  ],
  templateUrl: './projetos.page.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0;
    }
    .pcard {
      text-decoration: none;
      color: inherit;
    }
    .topo,
    .rodape {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .topo .row-sub,
    .rodape .muted {
      margin-right: auto;
    }
    .rodape {
      font-size: 13px;
    }
    .nome {
      font-size: 18px;
      font-family: var(--f-display);
    }
    .parados {
      color: var(--bloq-fg);
      font-weight: 600;
    }
    .avulsas {
      border-style: dashed;
    }
  `,
})
export class ProjetosPage {
  protected readonly acesso = inject(AcessoStore);
  protected readonly itens = inject(ItensStore);
  protected readonly t = TEXTOS;
  protected readonly novo = signal(false);

  private readonly noFiltro = (setorId: string) =>
    this.acesso.setorFiltro() === 'todos' || this.acesso.setoresDoFiltro().includes(setorId);

  /**
   * Filtro por pessoa (igual ao de Tarefas, US-39): só para quem lidera; lista quem tem vínculo
   * nos setores que eu administro dentro do setor do cabeçalho. '' = todas.
   */
  protected readonly pessoaEscolhida = signal('');
  protected readonly pessoasFiltro = computed(() => {
    if (!this.acesso.ehLider()) return [];
    const adm = this.acesso.administrados();
    const setores = new Set(this.acesso.setoresDoFiltro().filter((s) => adm.has(s)));
    return this.acesso
      .pessoas()
      .filter((p) => p.vinculos.some((v) => setores.has(v.setor_id)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  });
  /** A escolha some se a pessoa sair da lista (ex.: trocou o setor do cabeçalho). */
  protected readonly pessoa = computed(() => {
    const id = this.pessoaEscolhida();
    return this.pessoasFiltro().some((p) => p.id === id) ? id : '';
  });

  protected readonly cartoes = computed(() => {
    const todos = this.itens.todos();
    const pessoa = this.pessoa();
    return todos
      .filter(
        (i) =>
          i.nivel === 0 &&
          this.noFiltro(i.setor_id) &&
          (!pessoa || ehResponsavelAbaixo(i.id, pessoa, todos)),
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
      .map((p) => {
        const papel = this.acesso.opcoesSetor().find((o) => o.id === p.setor_id)?.papel ?? null;
        return {
          projeto: p,
          setor: this.acesso.nomeSetor(p.setor_id),
          papel: papel ? this.t.papel[papel] : null,
          lider: papel === 'lider',
          progresso: progressoPorFilhos(todos.filter((f) => f.pai_id === p.id)),
          parados: paradosAbaixo(p.id, todos),
        };
      });
  });

  protected readonly avulsas = computed(
    () =>
      this.itens.todos().filter((i) => i.nivel === 1 && !i.pai_id && this.noFiltro(i.setor_id))
        .length,
  );

  constructor() {
    void this.itens.carregar();
  }
}
