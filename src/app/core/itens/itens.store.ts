import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../shared/ui/toast.service';
import { CamposEditaveis, Item, NovoItem } from '../models/item.model';
import { StatusItem } from '../models/rotulos';
import { ItensService, ResultadoStatus } from './itens.service';

/**
 * Cache de itens em signals. Toda ação é otimista: aplica já, chama o RPC, troca pela versão do servidor
 * ou desfaz e mostra o erro (FLUXOS.md §7). `aplicar()` faz o merge por id/atualizado_em (tempo real, T-43).
 */
@Injectable({ providedIn: 'root' })
export class ItensStore {
  private readonly service = inject(ItensService);
  private readonly toast = inject(ToastService);
  private readonly _itens = signal<ReadonlyMap<string, Item>>(new Map());
  private readonly _carregando = signal(false);
  private readonly _carregado = signal(false);

  readonly carregando = this._carregando.asReadonly();
  readonly carregado = this._carregado.asReadonly();
  readonly todos = computed(() => [...this._itens().values()]);

  porId(id: string): Item | undefined {
    return this._itens().get(id);
  }

  filhos(id: string): Item[] {
    return this.todos().filter((i) => i.pai_id === id);
  }

  /** Caminho do projeto até o pai (para "Projeto › Tarefa"). */
  caminho(item: Item): Item[] {
    const saida: Item[] = [];
    let pai = item.pai_id ? this.porId(item.pai_id) : undefined;
    while (pai) {
      saida.unshift(pai);
      pai = pai.pai_id ? this.porId(pai.pai_id) : undefined;
    }
    return saida;
  }

  async carregar(forcar = false): Promise<void> {
    if (this._carregado() && !forcar) return;
    this._carregando.set(true);
    try {
      const itens = await this.service.listar();
      this._itens.set(new Map(itens.map((i) => [i.id, i])));
      this._carregado.set(true);
    } catch (e) {
      this.toast.erro(e);
    } finally {
      this._carregando.set(false);
    }
  }

  /** Garante o item no cache (link direto para um item); false se não existe ou não é visível. */
  async garantir(id: string): Promise<boolean> {
    await this.carregar();
    if (this.porId(id)) return true;
    try {
      const item = await this.service.obter(id);
      if (item) this.aplicar(item);
      return !!item;
    } catch {
      return false;
    }
  }

  /** Merge: só substitui se a versão recebida for igual ou mais nova. */
  aplicar(item: Item): void {
    const atual = this._itens().get(item.id);
    if (atual && atual.atualizado_em > item.atualizado_em) return;
    this.mexer((m) => m.set(item.id, item));
  }

  remover(ids: Iterable<string>): void {
    this.mexer((m) => {
      for (const id of ids) m.delete(id);
    });
  }

  async criar(novo: NovoItem): Promise<Item | null> {
    try {
      const item = await this.service.criar(novo);
      this.aplicar(item);
      return item;
    } catch (e) {
      this.toast.erro(e);
      return null;
    }
  }

  async atualizar(id: string, campos: CamposEditaveis): Promise<Item | null> {
    return this.otimista(
      id,
      (i) => ({ ...i, ...campos }),
      () => this.service.atualizar(id, campos),
    );
  }

  async mudarStatus(
    id: string,
    status: StatusItem,
    motivoHtml?: string | null,
    aprovadorId?: string | null,
  ): Promise<ResultadoStatus | null> {
    let resultado: ResultadoStatus | null = null;
    const item = await this.otimista(
      id,
      (i) => ({ ...i, status }),
      async () => {
        resultado = await this.service.mudarStatus(id, status, motivoHtml, aprovadorId);
        return resultado.item;
      },
    );
    const novo = (resultado as ResultadoStatus | null)?.novo_item_recorrente;
    if (item && novo) this.aplicar(novo);
    return item ? resultado : null;
  }

  async contarDescendentes(id: string): Promise<number | null> {
    try {
      return await this.service.contarDescendentes(id);
    } catch (e) {
      this.toast.erro(e);
      return null;
    }
  }

  /** Exclui o item e tudo abaixo (US-13); tira do cache o item e os descendentes. */
  async excluir(id: string): Promise<{ apagados: number; caminhos: string[] } | null> {
    try {
      const r = await this.service.excluir(id);
      const abaixo = new Set([id]);
      let mudou = true;
      while (mudou) {
        mudou = false;
        for (const i of this.todos()) {
          if (i.pai_id && abaixo.has(i.pai_id) && !abaixo.has(i.id)) {
            abaixo.add(i.id);
            mudou = true;
          }
        }
      }
      this.remover(abaixo);
      return { apagados: r.apagados, caminhos: r.caminhos_storage };
    } catch (e) {
      this.toast.erro(e);
      return null;
    }
  }

  async definirResponsaveis(id: string, perfis: string[]): Promise<boolean> {
    const item = await this.otimista(
      id,
      (i) => ({ ...i, responsaveis: perfis }),
      async () => {
        const responsaveis = await this.service.definirResponsaveis(id, perfis);
        return { ...this.porId(id)!, responsaveis };
      },
    );
    return item !== null;
  }

  private async otimista(
    id: string,
    mudar: (i: Item) => Item,
    chamar: () => Promise<Item>,
  ): Promise<Item | null> {
    const antes = this.porId(id);
    if (antes) this.mexer((m) => m.set(id, mudar(antes)));
    try {
      const depois = await chamar();
      this.mexer((m) => m.set(id, depois));
      return depois;
    } catch (e) {
      if (antes) this.mexer((m) => m.set(id, antes));
      this.toast.erro(e);
      return null;
    }
  }

  private mexer(alterar: (m: Map<string, Item>) => void): void {
    this._itens.update((atual) => {
      const copia = new Map(atual);
      alterar(copia);
      return copia;
    });
  }
}
