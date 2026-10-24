import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { NIVEL } from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { Solicitacao } from '../../../core/solicitacoes/solicitacoes.service';
import { SolicitacoesStore } from '../../../core/solicitacoes/solicitacoes.store';
import { PillStatusComponent } from '../../../shared/ui/pill-status.component';
import { dataHora } from '../../../shared/utils/datas';
import { textoPuro } from '../../../shared/utils/html-seguro';

interface Par {
  de: string;
  para: string;
  solicitacoes: Solicitacao[];
}

// Geometria do mapa (mesma do protótipo): setores numa elipse, caixas 150×44.
const W = 720;
const H = 380;
const RX = 270;
const RY = 140;
const NW = 150;
const NH = 44;

/**
 * Dependências entre setores: solicitações pendentes em que o setor do item espera o setor do
 * destinatário, envolvendo os setores do filtro (US-27).
 */
@Component({
  selector: 'app-dependencias',
  imports: [RouterLink, PillStatusComponent],
  templateUrl: './dependencias.component.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .solic-card {
      color: inherit;
      text-decoration: none;
    }
    .topo {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
      width: 100%;
    }
    .topo .quando {
      margin-left: auto;
    }
    strong {
      font-size: 14px;
    }
  `,
})
export class DependenciasComponent {
  private readonly solicitacoes = inject(SolicitacoesStore);
  private readonly itens = inject(ItensStore);
  private readonly acesso = inject(AcessoStore);
  protected readonly t = TEXTOS;
  protected readonly nivel = NIVEL;
  protected readonly W = W;
  protected readonly H = H;
  protected readonly NW = NW;
  protected readonly NH = NH;

  private readonly meus = computed(() => new Set(this.acesso.setoresDoFiltro()));

  /** Pares setor que espera → setor que responde, mais esperas primeiro. */
  protected readonly pares = computed<Par[]>(() => {
    const meus = this.meus();
    const pares = new Map<string, Par>();
    for (const s of this.solicitacoes.lista()) {
      if (s.status !== 'pendente') continue;
      const de = this.itens.porId(s.item_id)?.setor_id;
      const para = this.acesso.pessoaPorId().get(s.para_id)?.vinculos[0]?.setor_id;
      if (!de || !para || de === para || (!meus.has(de) && !meus.has(para))) continue;
      const chave = `${de}>${para}`;
      if (!pares.has(chave)) pares.set(chave, { de, para, solicitacoes: [] });
      pares.get(chave)!.solicitacoes.push(s);
    }
    return [...pares.values()].sort((a, b) => b.solicitacoes.length - a.solicitacoes.length);
  });

  protected readonly nos = computed(() => {
    const ids: string[] = [];
    for (const p of this.pares())
      for (const id of [p.de, p.para]) if (!ids.includes(id)) ids.push(id);
    for (const id of this.meus()) if (!ids.includes(id)) ids.push(id);
    return ids.map((id, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / ids.length;
      return {
        id,
        nome: this.acesso.nomeSetor(id),
        meu: this.meus().has(id),
        x: W / 2 + RX * Math.cos(a),
        y: H / 2 + RY * Math.sin(a),
      };
    });
  });

  /** Setas entre as caixas, deslocadas para ida e volta não se sobreporem. */
  protected readonly setas = computed(() => {
    const pos = new Map(this.nos().map((n) => [n.id, n]));
    return this.pares().map((p) => {
      const a = pos.get(p.de)!;
      const b = pos.get(p.para)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ox = (-dy / len) * 14;
      const oy = (dx / len) * 14;
      const t0 = Math.min(
        Math.abs((NW / 2 + 6) / (dx || 0.001)),
        Math.abs((NH / 2 + 6) / (dy || 0.001)),
      );
      const x1 = a.x + dx * t0 + ox;
      const y1 = a.y + dy * t0 + oy;
      const x2 = b.x - dx * t0 + ox;
      const y2 = b.y - dy * t0 + oy;
      return {
        id: `${p.de}>${p.para}`,
        x1,
        y1,
        x2,
        y2,
        mx: (x1 + x2) / 2,
        my: (y1 + y2) / 2,
        n: p.solicitacoes.length,
      };
    });
  });

  protected readonly cartoes = computed(() =>
    this.pares().map((p) => ({
      id: `${p.de}>${p.para}`,
      titulo: `${this.acesso.nomeSetor(p.de)} → ${this.acesso.nomeSetor(p.para)}`,
      n: p.solicitacoes.length,
      itens: p.solicitacoes.map((s) => {
        const item = this.itens.porId(s.item_id);
        return {
          sol: s,
          nivel: item ? NIVEL[item.nivel] : '',
          nome: item?.nome ?? '',
          quando: dataHora(s.criado_em),
          texto: this.t.tarefas.deps.espera(
            this.nome(s.de_id),
            this.nome(s.para_id),
            textoPuro(s.texto_html),
          ),
        };
      }),
    })),
  );

  constructor() {
    void this.solicitacoes.carregar();
  }

  private nome(id: string): string {
    return this.acesso.pessoaPorId().get(id)?.nome ?? this.t.comentarios.pessoaRemovida;
  }
}
