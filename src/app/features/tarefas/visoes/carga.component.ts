import { Component, computed, inject, input } from '@angular/core';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { Pessoa } from '../../../core/models/acesso.model';
import { Item } from '../../../core/models/item.model';
import { TEXTOS } from '../../../core/models/textos';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { dataCurta, hojeIso, segundaDaSemana, somarDias } from '../../../shared/utils/datas';
import { estaAtrasado, setoresDaPessoa } from './equipe';

/** Carga de trabalho: barras por status de cada pessoa e mapa de prazos das próximas 4 semanas (US-26). */
@Component({
  selector: 'app-carga',
  imports: [AvatarComponent],
  template: `
    <section class="panel">
      <div class="panel-h">
        <h2>{{ t.tarefas.carga.porPessoa }}</h2>
        <span class="bar-tools hint">
          <span class="leg"
            ><span class="dot andamento"></span>{{ t.tarefas.carga.andamento }}</span
          >
          <span class="leg"><span class="dot bloq"></span>{{ t.tarefas.carga.bloqueada }}</span>
          <span class="leg"><span class="dot aprov"></span>{{ t.tarefas.carga.aprovacao }}</span>
        </span>
      </div>
      @for (d of dados(); track d.pessoa.id) {
        <div class="load-row">
          <span class="quem">
            <app-avatar [pessoa]="d.pessoa" />
            <span class="nomes">
              <strong>{{ d.pessoa.nome }}</strong>
              <span class="row-sub">{{ d.setores }}</span>
            </span>
          </span>
          <div class="stack" role="img" [attr.aria-label]="t.tarefas.carga.itensAbertos(d.total)">
            <span class="andamento" [style.width.%]="(d.andamento / maximo()) * 100"></span>
            <span class="bloq" [style.width.%]="(d.bloqueada / maximo()) * 100"></span>
            <span class="aprov" [style.width.%]="(d.aprovacao / maximo()) * 100"></span>
          </div>
          <span class="total">
            <strong>{{ d.total }}</strong> {{ t.tarefas.carga.abertos }}
            @if (d.atrasados) {
              <br /><span class="atraso">{{ t.tarefas.carga.atrasados(d.atrasados) }}</span>
            }
          </span>
        </div>
      }
    </section>

    <section class="panel">
      <div class="panel-h">
        <h2>{{ t.tarefas.carga.prazos }}</h2>
        <span class="row-sub">{{ t.tarefas.carga.prazosAjuda }}</span>
      </div>
      <div class="tbl-wrap">
        <table class="heat">
          <thead>
            <tr>
              <th>{{ t.tarefas.carga.pessoa }}</th>
              @for (s of semanas(); track s.de) {
                <th>{{ s.rotulo }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (d of dados(); track d.pessoa.id) {
              <tr>
                <td>{{ d.pessoa.nome }}</td>
                @for (c of d.semanas; track $index) {
                  <td
                    class="cell"
                    [style.background]="cor(c)"
                    [style.color]="intensidade(c) > 55 ? 'var(--accent-fg)' : 'var(--fg)'"
                  >
                    {{ c || '·' }}
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .panel-h h2 {
      margin-right: auto;
    }
    .leg {
      display: inline-flex;
      gap: 6px;
      align-items: center;
    }
    .andamento {
      background: var(--prog-fg);
    }
    .bloq {
      background: var(--bloq-fg);
    }
    .aprov {
      background: var(--aprov-fg);
    }
    .quem {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .nomes {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .nomes strong {
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .total {
      font-variant-numeric: tabular-nums;
      font-size: 14px;
      text-align: right;
    }
    .atraso {
      color: var(--danger);
      font-weight: 600;
      font-size: 12px;
    }
  `,
})
export class CargaComponent {
  private readonly acesso = inject(AcessoStore);
  protected readonly t = TEXTOS;

  readonly itens = input.required<Item[]>();
  readonly pessoas = input.required<Pessoa[]>();
  readonly hoje = input(hojeIso());

  protected readonly semanas = computed(() => {
    const seg = segundaDaSemana(this.hoje());
    return [0, 1, 2, 3].map((i) => {
      const de = somarDias(seg, i * 7);
      const ate = somarDias(de, 6);
      return {
        de,
        ate,
        rotulo:
          i === 0
            ? this.t.tarefas.carga.estaSemana
            : this.t.tarefas.carga.semana(dataCurta(de), dataCurta(ate)),
      };
    });
  });

  protected readonly dados = computed(() => {
    const adm = this.acesso.administrados();
    return this.pessoas()
      .map((p) => {
        const l = this.itens().filter((i) => i.responsaveis.includes(p.id));
        return {
          pessoa: p,
          setores: setoresDaPessoa(
            p,
            adm,
            (id) => this.acesso.nomeSetor(id),
            this.t.tarefas.pessoaVisao.admHierarquia,
          ),
          total: l.length,
          andamento: l.filter((i) => i.status === 'em_andamento' || i.status === 'a_fazer').length,
          bloqueada: l.filter((i) => i.status === 'bloqueada').length,
          aprovacao: l.filter((i) => i.status === 'aguardando_aprovacao').length,
          atrasados: l.filter((i) => estaAtrasado(i, this.hoje())).length,
          semanas: this.semanas().map(
            (s) => l.filter((i) => !!i.prazo && i.prazo >= s.de && i.prazo <= s.ate).length,
          ),
        };
      })
      .sort((a, b) => b.total - a.total);
  });

  protected readonly maximo = computed(() => Math.max(1, ...this.dados().map((d) => d.total)));
  private readonly maximoSemana = computed(() =>
    Math.max(1, ...this.dados().flatMap((d) => d.semanas)),
  );

  /** 0 = vazio; senão 18–80 % de cor de destaque. */
  protected intensidade(n: number): number {
    return n ? 18 + Math.round((n / this.maximoSemana()) * 62) : 0;
  }

  protected cor(n: number): string {
    return `color-mix(in srgb, var(--accent) ${this.intensidade(n)}%, var(--surface))`;
  }
}
