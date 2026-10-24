import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { Item } from '../../core/models/item.model';
import { PRIORIDADE, RECORRENCIA } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { dataCurta } from '../utils/datas';
import { AvataresComponent } from './avatares.component';
import { NivelComponent } from './nivel.component';
import { PillStatusComponent } from './pill-status.component';

/** Linha de lista (itemRow do protótipo): prioridade, nível, nome, setor › caminho, responsáveis, status, prazo. */
@Component({
  selector: 'app-linha-item',
  imports: [RouterLink, AvataresComponent, NivelComponent, PillStatusComponent],
  template: `
    <a class="row" [routerLink]="['/item', item().id]">
      <span
        class="dot"
        [style.background]="prioridade().cor"
        [title]="'Prioridade ' + prioridade().texto"
      ></span>
      <span class="row-main">
        <span class="titulo">
          <app-nivel [nivel]="item().nivel" />
          <strong>{{ item().nome }}</strong>
          @if (item().recorrencia; as r) {
            <span class="pill s-info">{{ recorrencia[r] }}</span>
          }
        </span>
        <span class="row-sub">{{ subtitulo() }}</span>
      </span>
      <app-avatares [pessoas]="responsaveis()" />
      <app-pill-status [status]="item().status" />
      <span class="prazo" [class.late]="item().atrasado">{{
        item().atrasado ? t.comum.atrasada : prazo()
      }}</span>
    </a>
  `,
  styles: `
    .row {
      text-decoration: none;
      color: inherit;
    }
    .titulo {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
  `,
})
export class LinhaItemComponent {
  private readonly acesso = inject(AcessoStore);
  private readonly itens = inject(ItensStore);
  protected readonly t = TEXTOS;
  protected readonly recorrencia = RECORRENCIA;
  readonly item = input.required<Item>();

  protected readonly prioridade = computed(() => PRIORIDADE[this.item().prioridade]);
  protected readonly prazo = computed(() => dataCurta(this.item().prazo));
  protected readonly responsaveis = computed(() =>
    this.item()
      .responsaveis.map((id) => this.acesso.pessoaPorId().get(id))
      .filter((p) => !!p),
  );
  protected readonly subtitulo = computed(() => {
    const caminho = this.itens
      .caminho(this.item())
      .map((i) => i.nome)
      .join(' › ');
    const setor = this.acesso.nomeSetor(this.item().setor_id);
    return caminho ? `${setor} · ${caminho}` : setor;
  });
}
