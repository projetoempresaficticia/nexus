import { Component, DestroyRef, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { AuthService } from '../../core/auth/auth.service';
import { ItensStore } from '../../core/itens/itens.store';
import { TEXTOS } from '../../core/models/textos';
import { RealtimeService } from '../../core/services/realtime.service';
import { SincronizacaoService } from '../../core/services/sincronizacao.service';
import { TemaService } from '../../core/services/tema.service';
import { SolicitacoesStore } from '../../core/solicitacoes/solicitacoes.store';

interface ItemMenu {
  rota: string;
  texto: string;
  contador?: number;
}

/** Barra lateral escura + área de trabalho (DESIGN.md §Navegação). O menu muda conforme o perfil. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  protected readonly acesso = inject(AcessoStore);
  protected readonly tema = inject(TemaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly itensStore = inject(ItensStore);
  private readonly solicitacoes = inject(SolicitacoesStore);
  protected readonly t = TEXTOS;
  protected readonly realtime = inject(RealtimeService);

  /** Indicador do rodapé: só "Ao vivo" ou "Reconectando…" (nada enquanto liga pela primeira vez). */
  protected readonly ligacao = computed(() => {
    const e = this.realtime.estado();
    return e === 'ao_vivo' || e === 'reconectando' ? e : null;
  });

  constructor() {
    // Tempo real enquanto o shell existe: abre o canal ao entrar e fecha no logout (T-43).
    const sincronizacao = inject(SincronizacaoService);
    sincronizacao.iniciar();
    inject(DestroyRef).onDestroy(() => void sincronizacao.parar());
  }

  protected readonly itens = computed<ItemMenu[]>(() => {
    const m = this.t.menu;
    const solicitacoes = {
      rota: '/solicitacoes',
      texto: m.solicitacoes,
      contador: this.acesso.pendentes(),
    };
    if (!this.acesso.ehLider()) {
      return [
        { rota: '/tarefas', texto: m.minhasTarefas },
        { rota: '/projetos', texto: m.projetos },
        solicitacoes,
        { rota: '/equipe', texto: m.equipe },
      ];
    }
    const itens: ItemMenu[] = [
      { rota: '/painel', texto: m.painel },
      { rota: '/produtividade', texto: m.produtividade },
      { rota: '/projetos', texto: m.projetos },
      { rota: '/tarefas', texto: m.tarefas },
      solicitacoes,
      { rota: '/equipe', texto: m.equipe },
    ];
    if (this.acesso.ehAdmin()) {
      itens.push({ rota: '/usuarios', texto: m.usuarios }, { rota: '/setores', texto: m.setores });
    }
    return itens;
  });

  protected readonly resumoPapel = computed(() => {
    const n = this.acesso.qtdLideranca();
    if (n) return this.t.resumoLideranca(n);
    return this.acesso.ehAdmin() ? this.t.papel.adm : this.t.papel.membro;
  });

  protected async sair(): Promise<void> {
    await this.auth.sair();
    this.acesso.limpar();
    this.itensStore.limpar();
    this.solicitacoes.limpar();
    await this.router.navigateByUrl('/login');
  }
}
