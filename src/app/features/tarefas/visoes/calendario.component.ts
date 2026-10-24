import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { podeEditarItem } from '../../../core/itens/permissoes';
import { Item } from '../../../core/models/item.model';
import { NIVEL, ORDEM_STATUS, PRIORIDADE, STATUS_ITEM } from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { LinhaItemComponent } from '../../../shared/ui/linha-item.component';
import { PillStatusComponent } from '../../../shared/ui/pill-status.component';
import { ToastService } from '../../../shared/ui/toast.service';
import {
  MESES,
  dataCurta,
  hojeIso,
  inicioDoMes,
  ocorrencias,
  segundaDaSemana,
  somarDias,
  somarMeses,
} from '../../../shared/utils/datas';

interface Chip {
  item: Item;
  /** Data prevista de uma próxima ocorrência (tracejado, não arrasta). */
  previsto: boolean;
}

interface Dia {
  iso: string;
  numero: number;
  fora: boolean;
  hoje: boolean;
  chips: Chip[];
}

/** Mês (grade de 5–6 semanas) ou Semana (7 colunas altas) pelo prazo; arrastar muda o prazo (US-24). */
@Component({
  selector: 'app-calendario',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, PillStatusComponent, LinhaItemComponent],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.css',
})
export class CalendarioComponent {
  private readonly store = inject(ItensStore);
  private readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;
  protected readonly status = ORDEM_STATUS;
  protected readonly prioridade = PRIORIDADE;
  protected readonly nivel = NIVEL;

  readonly itens = input.required<Item[]>();
  readonly modo = input<'mes' | 'semana'>('mes');
  /** Data de referência: o mês ou a semana mostrada. Compartilhada com a página. */
  readonly referencia = model(hojeIso());
  readonly hoje = input(hojeIso());
  /** "+N mais" num dia do mês: a página abre a Semana daquele dia. */
  readonly verSemana = output<string>();

  protected readonly sobre = signal<string | null>(null);
  private arrastou = false;

  private readonly inicio = computed(() =>
    this.modo() === 'mes'
      ? segundaDaSemana(inicioDoMes(this.referencia()))
      : segundaDaSemana(this.referencia()),
  );

  protected readonly titulo = computed(() => {
    const ref = this.referencia();
    if (this.modo() === 'mes') {
      return this.t.tarefas.calendario.mes(
        MESES[Number(ref.slice(5, 7)) - 1],
        Number(ref.slice(0, 4)),
      );
    }
    const ini = this.inicio();
    const fim = somarDias(ini, 6);
    const curto = (iso: string) =>
      `${Number(iso.slice(8))} ${MESES[Number(iso.slice(5, 7)) - 1].slice(0, 3).toLowerCase()}`;
    return `${curto(ini)} – ${curto(fim)} ${fim.slice(0, 4)}`;
  });

  protected readonly dias = computed<Dia[]>(() => {
    const ini = this.inicio();
    const mes = this.referencia().slice(0, 7);
    let n = 7;
    if (this.modo() === 'mes') {
      // 5 semanas, ou 6 se o mês ainda não acabou
      n = somarDias(ini, 35).slice(0, 7) === mes ? 42 : 35;
    }
    const fim = somarDias(ini, n - 1);
    const porDia = new Map<string, Chip[]>();
    const por = (iso: string, chip: Chip) => porDia.set(iso, [...(porDia.get(iso) ?? []), chip]);
    for (const i of this.itens()) {
      if (!i.prazo) continue;
      por(i.prazo, { item: i, previsto: false });
      if (i.recorrencia && i.status !== 'concluida') {
        for (const d of ocorrencias(i.prazo, i.recorrencia, fim))
          por(d, { item: i, previsto: true });
      }
    }
    return Array.from({ length: n }, (_, k) => {
      const iso = somarDias(ini, k);
      return {
        iso,
        numero: Number(iso.slice(8)),
        fora: this.modo() === 'mes' && iso.slice(0, 7) !== mes,
        hoje: iso === this.hoje(),
        chips: porDia.get(iso) ?? [],
      };
    });
  });

  protected readonly semPrazo = computed(() => this.itens().filter((i) => !i.prazo));

  protected mover(passo: number): void {
    const ref = this.referencia();
    this.referencia.set(
      this.modo() === 'mes' ? somarMeses(inicioDoMes(ref), passo) : somarDias(ref, 7 * passo),
    );
  }

  protected irHoje(): void {
    this.referencia.set(this.hoje());
  }

  protected classe(item: Item): string {
    return STATUS_ITEM[item.status].classe;
  }

  protected primeiroNome(item: Item): string {
    const p = item.responsaveis[0] ? this.acesso.pessoaPorId().get(item.responsaveis[0]) : null;
    return p?.nome.split(' ')[0] ?? this.t.comum.semResponsavel;
  }

  protected podeMexer(item: Item): boolean {
    return podeEditarItem(item, this.acesso.perfil()?.id ?? null, this.acesso.administrados());
  }

  protected abrir(item: Item): void {
    if (this.arrastou) return;
    void this.router.navigate(['/item', item.id]);
  }

  protected comecou(): void {
    this.arrastou = true;
  }

  protected async soltou(e: CdkDragDrop<string, string, Item>): Promise<void> {
    setTimeout(() => (this.arrastou = false));
    this.sobre.set(null);
    const item = e.item.data;
    const dia = e.container.data;
    if (e.previousContainer === e.container || item.prazo === dia) return;
    const ok = await this.store.atualizar(item.id, { prazo: dia });
    if (ok) this.toast.sucesso(this.t.tarefas.calendario.prazoMudou(item.nome, dataCurta(dia)));
  }
}
