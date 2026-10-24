import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { Item } from '../../../core/models/item.model';
import { TEXTOS } from '../../../core/models/textos';
import { RealtimeService, afetaItem } from '../../../core/services/realtime.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { dataHora } from '../../../shared/utils/datas';
import { Anexo, AnexosService } from '../anexos.service';

/** "1,4 MB", "820 KB". */
export function tamanhoLegivel(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Anexos do item: arquivo (≤ 20 MB) ou link externo; quem vê o item pode anexar (SEGURANCA.md §3, US-20). */
@Component({
  selector: 'app-anexos-item',
  templateUrl: './anexos-item.component.html',
  styles: `
    .file button.nome,
    .file a.nome {
      margin-right: auto;
      overflow-wrap: anywhere;
      border: 0;
      background: transparent;
      padding: 0;
      text-align: left;
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
      font-size: 14px;
    }
    .anexar {
      border-style: dashed;
    }
    .link {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .link input {
      flex: 1 1 160px;
      min-width: 0;
      height: 38px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0 10px;
      background: var(--surface);
    }
    .acoes {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .hint {
      margin: 0;
    }
  `,
})
export class AnexosItemComponent {
  private readonly service = inject(AnexosService);
  private readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;
  protected readonly tamanho = tamanhoLegivel;
  protected readonly dataHora = dataHora;
  readonly item = input.required<Item>();

  protected readonly anexos = signal<Anexo[]>([]);
  protected readonly enviando = signal(false);
  protected readonly colandoLink = signal(false);
  protected readonly nomeLink = signal('');
  protected readonly urlLink = signal('');
  private readonly eu = computed(() => this.acesso.perfil()?.id ?? null);

  constructor() {
    effect(() => this.carregar(this.item().id));
    inject(RealtimeService).ouvirAqui(['anexos'], (e) => {
      const id = this.item().id;
      if (
        afetaItem(
          e,
          id,
          this.anexos().map((a) => a.id),
        )
      )
        this.carregar(id);
    });
  }

  private carregar(id: string): void {
    this.service.listar(id).then(
      (l) => this.anexos.set(l),
      (e) => this.toast.erro(e),
    );
  }

  protected podeRemover(a: Anexo): boolean {
    return a.enviado_por === this.eu() || this.acesso.administrados().has(this.item().setor_id);
  }

  protected async abrir(a: Anexo): Promise<void> {
    if (!a.caminho) return;
    try {
      window.open(await this.service.urlAssinada(a.caminho), '_blank', 'noopener');
    } catch (e) {
      this.toast.erro(e);
    }
  }

  protected async arquivoEscolhido(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    entrada.value = '';
    const eu = this.eu();
    if (!arquivo || !eu) return;
    this.enviando.set(true);
    try {
      const novo = await this.service.enviar(this.item(), arquivo, eu);
      this.anexos.update((l) => [...l, novo]);
      this.toast.sucesso(this.t.anexos.anexado);
    } catch (e) {
      this.toast.erro(e);
    } finally {
      this.enviando.set(false);
    }
  }

  protected async adicionarLink(): Promise<void> {
    const url = this.urlLink().trim();
    const eu = this.eu();
    if (!/^https:\/\/\S+$/i.test(url)) {
      this.toast.falha(this.t.anexos.linkInvalido);
      return;
    }
    if (!eu) return;
    try {
      const novo = await this.service.adicionarLink(
        this.item().id,
        this.nomeLink().trim() || url,
        url,
        eu,
      );
      this.anexos.update((l) => [...l, novo]);
      this.colandoLink.set(false);
      this.nomeLink.set('');
      this.urlLink.set('');
      this.toast.sucesso(this.t.anexos.linkAdicionado);
    } catch (e) {
      this.toast.erro(e);
    }
  }

  protected async remover(a: Anexo): Promise<void> {
    const antes = this.anexos();
    this.anexos.update((l) => l.filter((x) => x.id !== a.id));
    try {
      await this.service.apagar(a);
      this.toast.sucesso(this.t.anexos.removido);
    } catch (e) {
      this.anexos.set(antes);
      this.toast.erro(e);
    }
  }
}
