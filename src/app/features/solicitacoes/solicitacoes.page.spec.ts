import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { solicitacao } from '../../../testing/solicitacao';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { Papel, Pessoa } from '../../core/models/acesso.model';
import { Solicitacao, SolicitacoesService } from '../../core/solicitacoes/solicitacoes.service';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { SolicitacoesPage } from './solicitacoes.page';

function pessoas(papel: Papel): Pessoa[] {
  return [
    {
      id: 'p-eu',
      nome: 'Ana Ribeiro',
      iniciais: 'AR',
      email: 'a@x',
      vinculos: [{ setor_id: SETORES.sucesso, papel }],
    },
    {
      id: 'p-bruno',
      nome: 'Bruno Costa',
      iniciais: 'BC',
      email: 'b@x',
      vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
    },
    {
      id: 'p-fin',
      nome: 'Duarte Faria',
      iniciais: 'DF',
      email: 'd@x',
      vinculos: [{ setor_id: SETORES.financeiro, papel: 'membro' }],
    },
  ];
}

interface Opcoes {
  papel?: Papel;
  id?: string;
  servico?: Partial<Record<keyof SolicitacoesService, unknown>>;
}

async function montar(lista: Solicitacao[], opcoes: Opcoes = {}) {
  const papel = opcoes.papel ?? 'membro';
  const dados = dadosIniciais(
    [{ setor_id: SETORES.sucesso, papel }],
    papel === 'lider' ? [SETORES.sucesso] : [],
  );
  dados.pessoas = pessoas(papel);
  const servico = { listar: vi.fn().mockResolvedValue(lista), ...opcoes.servico };
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
        provide: ItensService,
        useValue: {
          listar: vi
            .fn()
            .mockResolvedValue([
              item({ id: 't', nome: 'Renovar contrato', criado_por: 'p-outro' }),
            ]),
        },
      },
      { provide: SolicitacoesService, useValue: servico },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const fixture = TestBed.createComponent(SolicitacoesPage);
  if (opcoes.id) fixture.componentRef.setInput('id', opcoes.id);
  const el = fixture.nativeElement as HTMLElement;
  const estabilizar = async () => {
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };
  await estabilizar();
  const botao = (txt: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === txt);
  return { fixture, el, servico, estabilizar, botao };
}

const textos = (el: Element, sel: string) =>
  [...el.querySelectorAll(sel)].map((e) => e.textContent?.replace(/\s+/g, ' ').trim());

describe('SolicitacoesPage', () => {
  const LISTA = [
    solicitacao({ id: 'recebida', de_id: 'p-bruno', para_id: 'p-eu', tipo: 'aprovacao' }),
    solicitacao({ id: 'enviada', para_id: 'p-fin', texto_html: '<p>Mandar a fatura</p>' }),
    solicitacao({ id: 'antiga', de_id: 'p-bruno', para_id: 'p-eu', status: 'resolvida' }),
  ];

  it('membro vê Para mim e Enviadas por mim com contagem; pendentes primeiro', async () => {
    const { el } = await montar(LISTA);
    expect(textos(el, '.tab')).toEqual(['Para mim · 2', 'Enviadas por mim · 1']);
    const linhas = [...el.querySelectorAll('.srow')];
    expect(linhas).toHaveLength(2);
    expect(linhas[0].textContent).toContain('Pendente');
    expect(linhas[1].textContent).toContain('Resolvida');
    expect(el.querySelector('.sol-detail')?.textContent).toContain('Selecione uma solicitação');
  });

  it('líder tem também a aba Dos meus setores', async () => {
    const { el } = await montar(LISTA, { papel: 'lider' });
    expect(textos(el, '.tab')).toContain('Dos meus setores · 3');
  });

  it('enviada para outro setor mostra "Entre setores"', async () => {
    const { el, botao, estabilizar } = await montar(LISTA);
    botao('Enviadas por mim · 1')!.click();
    await estabilizar();
    expect(el.querySelector('.srow')?.textContent).toContain('Entre setores');
    expect(el.querySelector('.srow')?.textContent).toContain('Ana Ribeiro → Duarte Faria');
  });

  it('abrir por ?id mostra item de origem, conversa e Aprovar/Recusar para o destinatário', async () => {
    const lista = [
      solicitacao({
        id: 'recebida',
        de_id: 'p-bruno',
        para_id: 'p-eu',
        tipo: 'aprovacao',
        solicitacao_mensagens: [
          {
            id: 'm1',
            solicitacao_id: 'recebida',
            autor_id: 'p-bruno',
            texto_html: '<p>Pode aprovar?</p>',
            criado_em: '2026-10-23T11:00:00Z',
            editado_em: null,
          },
        ],
      }),
    ];
    const { el, botao } = await montar(lista, { id: 'recebida' });
    const det = el.querySelector('.sol-detail')!;
    expect(det.querySelector('.origin')?.textContent).toContain('Renovar contrato');
    expect(det.querySelector('.origin')?.textContent).toContain(
      'Tarefa de origem · Sucesso do Aluno',
    );
    expect(det.querySelector('.bubble')?.textContent).toContain('Pode aprovar?');
    expect(det.querySelector('.who')?.textContent).toContain('Bruno Costa');
    expect(botao('Aprovar')).toBeDefined();
    expect(botao('Recusar')).toBeDefined();
    expect(botao('Marcar como resolvida')).toBeUndefined();
    expect(botao('Cancelar solicitação')).toBeUndefined();
  });

  it('autor vê Cancelar mas não Marcar como resolvida; cancelar pede confirmação', async () => {
    const cancelar = vi.fn().mockResolvedValue({ item: item({ id: 't' }) });
    const { botao, estabilizar } = await montar(LISTA, { id: 'enviada', servico: { cancelar } });
    expect(botao('Marcar como resolvida')).toBeUndefined();
    const confirmacao = TestBed.inject(ConfirmacaoService);
    botao('Cancelar solicitação')!.click();
    await estabilizar();
    expect(confirmacao.pedido()?.titulo).toBe('Cancelar solicitação?');
    confirmacao.responder(true);
    await estabilizar();
    expect(cancelar).toHaveBeenCalledWith('enviada');
  });

  it('resolver envia a resposta escrita junto', async () => {
    const lista = [solicitacao({ id: 'info', de_id: 'p-bruno', para_id: 'p-eu' })];
    const respondida = { ...lista[0], status: 'resolvida' as const };
    const responder = vi
      .fn()
      .mockResolvedValue({ solicitacao: respondida, item: item({ id: 't' }) });
    const obter = vi.fn().mockResolvedValue(respondida);
    const { fixture, el, botao, estabilizar } = await montar(lista, {
      id: 'info',
      servico: { responder, obter },
    });
    (fixture.componentInstance as unknown as { resposta: WritableSignal<string> }).resposta.set(
      '<p>Prazo é sexta</p>',
    );
    botao('Marcar como resolvida')!.click();
    await estabilizar();
    expect(responder).toHaveBeenCalledWith('info', 'resolvida', '<p>Prazo é sexta</p>');
    expect(el.querySelector('.sol-detail')?.textContent).toContain('Solicitação encerrada.');
  });

  it('mensagem vazia não é enviada', async () => {
    const enviarMensagem = vi.fn();
    const { el, botao, estabilizar } = await montar(LISTA, {
      id: 'recebida',
      servico: { enviarMensagem },
    });
    botao('Enviar')!.click();
    await estabilizar();
    expect(el.querySelector('.erro')?.textContent).toContain('Escreva a mensagem');
    expect(enviarMensagem).not.toHaveBeenCalled();
  });
});
