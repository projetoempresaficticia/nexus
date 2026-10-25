import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { TEXTOS } from '../../core/models/textos';
import { CATEGORIAS_NOTIFICACAO, CategoriaNotificacao } from '../../core/notificacoes/categorias';
import { Notificacao } from '../../core/notificacoes/notificacoes.service';
import { NotificacoesStore } from '../../core/notificacoes/notificacoes.store';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { dataHora } from '../../shared/utils/datas';
import { resumoNotificacao } from '../../shared/utils/notificacoes-texto';

/** Todas as notificações da pessoa, não só as 50 do sino (T-63, US-30). */
@Component({
  selector: 'app-notificacoes-page',
  imports: [CabecalhoComponent, CarregandoComponent],
  templateUrl: './notificacoes.page.html',
  styleUrl: './notificacoes.page.css',
})
export class NotificacoesPage {
  protected readonly notificacoes = inject(NotificacoesStore);
  protected readonly acesso = inject(AcessoStore);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;
  protected readonly dataHora = dataHora;
  protected readonly categorias = CATEGORIAS_NOTIFICACAO;

  protected readonly subtitulo = computed(() => {
    const n = this.notificacoes.naoLidas();
    return n ? this.t.notificacoes.naoLidas(n) : this.t.notificacoes.semNaoLidas;
  });

  constructor() {
    void this.notificacoes.carregarTudo();
  }

  protected resumo(n: Notificacao): string {
    return resumoNotificacao({
      tipo: n.tipo,
      dados: n.dados as Record<string, unknown>,
      autorNome: n.autor?.nome ?? null,
    });
  }

  protected async abrir(n: Notificacao): Promise<void> {
    void this.notificacoes.marcarLida(n.id);
    const dados = n.dados as Record<string, unknown>;
    const destino = dados['solicitacao_id']
      ? '/solicitacoes'
      : n.item_id
        ? `/item/${n.item_id}`
        : null;
    if (destino) await this.router.navigateByUrl(destino);
  }

  protected ligada(categoria: CategoriaNotificacao): boolean {
    return this.acesso.perfil()?.[categoria] ?? true;
  }

  protected mudarPreferencia(categoria: CategoriaNotificacao, valor: boolean): void {
    void this.acesso.atualizarPreferenciaEmail(categoria, valor);
  }
}
