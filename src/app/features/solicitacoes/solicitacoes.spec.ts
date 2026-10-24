import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { solicitacao } from '../../../testing/solicitacao';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { Pessoa } from '../../core/models/acesso.model';
import { SolicitacoesService } from '../../core/solicitacoes/solicitacoes.service';
import { ToastService } from '../../shared/ui/toast.service';
import { SolicitacoesItemComponent } from '../item/components/solicitacoes-item.component';
import { NovaSolicitacaoModal } from './nova-solicitacao.modal';

const PESSOAS: Pessoa[] = [
  {
    id: 'p-eu',
    nome: 'Ana Ribeiro',
    iniciais: 'AR',
    email: 'a@x',
    vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
  },
  {
    id: 'p-bruno',
    nome: 'Bruno Costa',
    iniciais: 'BC',
    email: 'b@x',
    vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
  },
  {
    id: 'p-carla',
    nome: 'Carla Dias',
    iniciais: 'CD',
    email: 'c@x',
    vinculos: [{ setor_id: SETORES.pedagogico, papel: 'lider' }],
  },
  {
    id: 'p-fin',
    nome: 'Duarte Faria',
    iniciais: 'DF',
    email: 'd@x',
    vinculos: [{ setor_id: SETORES.financeiro, papel: 'membro' }],
  },
];

async function preparar(servico: Partial<Record<keyof SolicitacoesService, unknown>>) {
  const dados = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]);
  dados.pessoas = PESSOAS;
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue(dados),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
      {
        provide: SolicitacoesService,
        useValue: { listar: vi.fn().mockResolvedValue([]), ...servico },
      },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
}

async function estabilizar(fixture: { whenStable(): Promise<unknown> }) {
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  await fixture.whenStable();
}

describe('NovaSolicitacaoModal', () => {
  async function montar(servico: Partial<Record<keyof SolicitacoesService, unknown>> = {}) {
    await preparar(servico);
    const fixture = TestBed.createComponent(NovaSolicitacaoModal);
    fixture.componentRef.setInput('item', item({ id: 't', setor_id: SETORES.sucesso }));
    await estabilizar(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const [para, tipo] = [...el.querySelectorAll('select')];
    return { fixture, el, para, tipo };
  }

  it('lista as pessoas menos eu, com o setor', async () => {
    const { para } = await montar();
    const opcoes = [...para.options].map((o) => o.textContent?.trim());
    expect(opcoes).toContain('Bruno Costa · Sucesso do Aluno');
    expect(opcoes.some((o) => o?.startsWith('Ana Ribeiro'))).toBe(false);
  });

  it('em Aprovação sugere o líder que decide pelo setor', async () => {
    const { fixture, para, tipo } = await montar();
    tipo.value = 'aprovacao';
    tipo.dispatchEvent(new Event('change'));
    await estabilizar(fixture);
    expect(para.value).toBe('p-carla');
    expect(para.selectedOptions[0].textContent).toContain('(decide por Pedagógico)');
  });

  it('valida pessoa e texto antes de enviar', async () => {
    const abrir = vi.fn();
    const { fixture, el, para } = await montar({ abrir });
    const enviar = () =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Enviar')!.click();
    enviar();
    await estabilizar(fixture);
    expect(el.querySelector('.erro')?.textContent).toContain('Escolha a pessoa');
    para.value = 'p-bruno';
    para.dispatchEvent(new Event('change'));
    enviar();
    await estabilizar(fixture);
    expect(el.querySelector('.erro')?.textContent).toContain('Descreva o que você precisa.');
    expect(abrir).not.toHaveBeenCalled();
  });

  it('envia, avisa e fecha', async () => {
    const abrir = vi.fn().mockResolvedValue({
      solicitacao: solicitacao(),
      item: item({ id: 't', status: 'bloqueada' }),
    });
    const { fixture, el, para } = await montar({ abrir });
    const fechou = vi.fn();
    fixture.componentInstance.fechar.subscribe(fechou);
    const sucesso = vi.spyOn(TestBed.inject(ToastService), 'sucesso');
    para.value = 'p-bruno';
    para.dispatchEvent(new Event('change'));
    (fixture.componentInstance as unknown as { texto: WritableSignal<string> }).texto.set(
      '<p>Preciso do contrato</p>',
    );
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Enviar')!.click();
    await estabilizar(fixture);
    expect(abrir).toHaveBeenCalledWith('t', 'p-bruno', 'informacao', '<p>Preciso do contrato</p>');
    expect(sucesso).toHaveBeenCalledWith('Solicitação enviada para Bruno Costa.');
    expect(fechou).toHaveBeenCalled();
  });
});

describe('SolicitacoesItemComponent', () => {
  it('mostra os cartões com tipo, status, outro setor e mensagens', async () => {
    await preparar({
      listar: vi.fn().mockResolvedValue([
        solicitacao({ id: 's1', para_id: 'p-fin', tipo: 'acao' }),
        solicitacao({
          id: 's2',
          status: 'resolvida',
          solicitacao_mensagens: [
            {
              id: 'm',
              solicitacao_id: 's2',
              autor_id: 'p-bruno',
              texto_html: '<p>ok</p>',
              criado_em: '2026-10-23T11:00:00Z',
              editado_em: null,
            },
          ],
        }),
        solicitacao({ id: 'outro-item', item_id: 'x' }),
      ]),
    });
    const fixture = TestBed.createComponent(SolicitacoesItemComponent);
    fixture.componentRef.setInput('item', item({ id: 't', setor_id: SETORES.sucesso }));
    fixture.componentRef.setInput('podeEditar', true);
    await estabilizar(fixture);
    const cartoes = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.solic-card')];
    expect(cartoes).toHaveLength(2);
    expect(cartoes[0].textContent).toContain('Outro setor: Financeiro');
    expect(cartoes[0].textContent).toContain('Para Duarte Faria · 0 mensagem(ns)');
    expect(cartoes[1].textContent).toContain('Resolvida');
    expect(cartoes[1].textContent).not.toContain('Outro setor');
    expect(cartoes[0].getAttribute('href')).toBe('/solicitacoes?id=s1');
  });

  it('sem solicitações mostra a dica', async () => {
    await preparar({});
    const fixture = TestBed.createComponent(SolicitacoesItemComponent);
    fixture.componentRef.setInput('item', item({ id: 't' }));
    await estabilizar(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('crie uma solicitação');
  });
});
