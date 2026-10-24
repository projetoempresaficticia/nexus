import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { podeEditarItem } from '../../core/itens/permissoes';
import { NIVEL, StatusSolicitacao } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { podeCancelar, podeResponder } from '../../core/solicitacoes/permissoes-solicitacao';
import { Solicitacao } from '../../core/solicitacoes/solicitacoes.service';
import { SolicitacoesStore } from '../../core/solicitacoes/solicitacoes.store';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { HtmlSeguroPipe } from '../../shared/pipes/html-seguro.pipe';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { EditorRicoComponent } from '../../shared/ui/editor-rico/editor-rico.component';
import { PillStatusComponent } from '../../shared/ui/pill-status.component';
import { ToastService } from '../../shared/ui/toast.service';
import { VazioComponent } from '../../shared/ui/vazio.component';
import { dataCurta, dataHora } from '../../shared/utils/datas';
import { htmlVazio, sanitizar, textoPuro } from '../../shared/utils/html-seguro';

type Aba = keyof typeof TEXTOS.solicitacoes.abas;

/** Caixa de solicitações: abas, lista e conversa com as ações de resposta (US-16, US-17). */
@Component({
  selector: 'app-solicitacoes-page',
  imports: [
    RouterLink,
    CabecalhoComponent,
    CarregandoComponent,
    VazioComponent,
    PillStatusComponent,
    EditorRicoComponent,
    HtmlSeguroPipe,
  ],
  templateUrl: './solicitacoes.page.html',
  styleUrl: './solicitacoes.page.css',
})
export class SolicitacoesPage {
  protected readonly store = inject(SolicitacoesStore);
  protected readonly acesso = inject(AcessoStore);
  private readonly itens = inject(ItensStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmacao = inject(ConfirmacaoService);
  protected readonly t = TEXTOS;
  protected readonly nivel = NIVEL;

  /** ?id= da solicitação aberta (vem do bloco do item e das notificações). */
  readonly id = input<string>();
  protected readonly aba = signal<Aba>('recebidas');
  protected readonly resposta = signal('');
  protected readonly erro = signal<string | null>(null);
  protected readonly enviando = signal(false);

  private readonly eu = computed(() => this.acesso.perfil()?.id ?? null);

  private readonly filtros = computed<Record<Aba, (s: Solicitacao) => boolean>>(() => {
    const eu = this.eu();
    const adm = this.acesso.administrados();
    return {
      recebidas: (s) => s.para_id === eu,
      enviadas: (s) => s.de_id === eu,
      setor: (s) => {
        const setorItem = this.itens.porId(s.item_id)?.setor_id;
        const para = this.acesso.pessoaPorId().get(s.para_id);
        return (
          (!!setorItem && adm.has(setorItem)) || !!para?.vinculos.some((v) => adm.has(v.setor_id))
        );
      },
    };
  });

  protected readonly abas = computed(() => {
    const nomes = (Object.keys(this.t.solicitacoes.abas) as Aba[]).filter(
      (a) => a !== 'setor' || this.acesso.ehLider(),
    );
    return nomes.map((a) => ({
      id: a,
      nome: this.t.solicitacoes.abas[a],
      qtd: this.store.ordenadas().filter(this.filtros()[a]).length,
    }));
  });

  protected readonly linhas = computed(() =>
    this.store
      .ordenadas()
      .filter(this.filtros()[this.aba()])
      .map((s) => ({
        sol: s,
        texto: textoPuro(s.texto_html),
        entreSetores: this.entreSetores(s),
        dePara: this.t.solicitacoes.dePara(
          this.nome(s.de_id),
          this.nome(s.para_id),
          dataHora(s.criado_em),
        ),
      })),
  );

  protected readonly aberta = computed(() => {
    const id = this.id();
    return id ? (this.store.porId(id) ?? null) : null;
  });

  protected readonly detalhe = computed(() => {
    const s = this.aberta();
    if (!s) return null;
    const item = this.itens.porId(s.item_id) ?? null;
    const eu = this.eu();
    const adm = this.acesso.administrados();
    const setorItem = item?.setor_id ?? null;
    return {
      sol: s,
      item,
      de: this.pessoaComSetor(s.de_id),
      para: this.pessoaComSetor(s.para_id),
      quando: dataHora(s.criado_em),
      caminho: item
        ? this.itens
            .caminho(item)
            .map((c) => c.nome)
            .join(' › ')
        : '',
      resumo: item
        ? this.t.solicitacoes.resumoItem(
            item.responsaveis.map((r) => this.nome(r)).join(', '),
            dataCurta(item.prazo),
          )
        : '',
      dentro: !!item && podeEditarItem(item, eu, adm),
      mensagens: s.solicitacao_mensagens
        .slice()
        .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
        .map((m) => ({
          ...m,
          eu: m.autor_id === eu,
          autor: this.pessoaComSetor(m.autor_id),
          quando: dataHora(m.criado_em),
        })),
      responder: podeResponder(s, setorItem, eu, adm),
      cancelar: podeCancelar(s, setorItem, eu, adm),
    };
  });

  constructor() {
    void this.store.carregar(true);
    void this.itens.carregar();
    // Solicitação aberta por link: mostra a aba onde ela está e garante o item de origem
    effect(() => {
      const s = this.aberta();
      if (!s) return;
      untracked(() => {
        const filtros = this.filtros();
        if (!filtros[this.aba()](s)) {
          const aba = this.abas().find((a) => filtros[a.id](s));
          if (aba) this.aba.set(aba.id);
        }
        if (!this.itens.porId(s.item_id)) void this.itens.garantir(s.item_id);
      });
    });
    // Trocar de conversa limpa o rascunho
    effect(() => {
      this.id();
      this.resposta.set('');
      this.erro.set(null);
    });
  }

  protected escolherAba(aba: Aba): void {
    this.aba.set(aba);
  }

  protected abrir(id: string): void {
    void this.router.navigate([], { queryParams: { id }, replaceUrl: true });
  }

  protected async enviarMensagem(id: string): Promise<void> {
    if (htmlVazio(this.resposta())) {
      this.erro.set(this.t.solicitacoes.mensagemVazia);
      return;
    }
    this.erro.set(null);
    this.enviando.set(true);
    const ok = await this.store.enviarMensagem(id, sanitizar(this.resposta()));
    this.enviando.set(false);
    if (ok) this.resposta.set('');
  }

  protected async responder(id: string, resultado: StatusSolicitacao): Promise<void> {
    this.enviando.set(true);
    const texto = htmlVazio(this.resposta()) ? undefined : sanitizar(this.resposta());
    const ok = await this.store.responder(id, resultado, texto);
    this.enviando.set(false);
    if (!ok) return;
    this.resposta.set('');
    this.toast.sucesso(this.t.solicitacoes.respondida);
  }

  protected async cancelar(id: string): Promise<void> {
    const sim = await this.confirmacao.perguntar({
      titulo: this.t.solicitacoes.cancelarTitulo,
      mensagem: this.t.solicitacoes.cancelarMensagem,
      confirmar: this.t.solicitacoes.cancelar,
      perigo: true,
    });
    if (!sim || !(await this.store.cancelar(id))) return;
    this.toast.sucesso(this.t.solicitacoes.cancelada);
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  private nome(id: string): string {
    return this.acesso.pessoaPorId().get(id)?.nome ?? this.t.comentarios.pessoaRemovida;
  }

  private pessoaComSetor(id: string): { nome: string; setor: string } {
    const p = this.acesso.pessoaPorId().get(id);
    return {
      nome: p?.nome ?? this.t.comentarios.pessoaRemovida,
      setor: p?.vinculos[0] ? this.acesso.nomeSetor(p.vinculos[0].setor_id) : '—',
    };
  }

  /** O destinatário não tem vínculo no setor do item. */
  private entreSetores(s: Solicitacao): boolean {
    const item = this.itens.porId(s.item_id);
    const para = this.acesso.pessoaPorId().get(s.para_id);
    return !!item && !!para && !para.vinculos.some((v) => v.setor_id === item.setor_id);
  }
}
