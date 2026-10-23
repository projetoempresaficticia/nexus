import { TestBed } from '@angular/core/testing';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { DadosIniciais } from '../models/acesso.model';
import { ErroApi } from '../services/erro-api';
import { AcessoService } from './acesso.service';
import { AcessoStore } from './acesso.store';

describe('AcessoStore', () => {
  async function carregar(dados: DadosIniciais | Error, pendentes = 0) {
    const service = {
      carregarInicial: vi.fn(() =>
        dados instanceof Error ? Promise.reject(dados) : Promise.resolve(dados),
      ),
      contarSolicitacoesPendentes: vi.fn().mockResolvedValue(pendentes),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AcessoService, useValue: service }] });
    const store = TestBed.inject(AcessoStore);
    const resultado = await store.carregar();
    return { store, resultado };
  }

  it('membro: não lidera e só vê o seu setor', async () => {
    const { store } = await carregar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]),
      3,
    );
    expect(store.ehLider()).toBe(false);
    expect(store.pendentes()).toBe(3);
    expect(store.opcoesSetor().map((o) => o.nome)).toEqual(['Sucesso do Aluno']);
  });

  it('líder: setores abaixo aparecem recuados e como Adm herdado', async () => {
    const { store } = await carregar(
      dadosIniciais(
        [{ setor_id: SETORES.pedagogico, papel: 'lider' }],
        [SETORES.pedagogico, SETORES.sucesso],
      ),
    );
    expect(store.ehLider()).toBe(true);
    expect(store.opcoesSetor()).toEqual([
      { id: SETORES.pedagogico, nome: 'Pedagógico', nivel: 0, papel: 'lider' },
      { id: SETORES.sucesso, nome: 'Sucesso do Aluno', nivel: 1, papel: 'adm' },
    ]);
    expect(store.meusSetores()).toEqual([
      { id: SETORES.pedagogico, nome: 'Pedagógico', papel: 'lider' },
    ]);
  });

  it('filtro de setor inclui os setores abaixo', async () => {
    const { store } = await carregar(
      dadosIniciais(
        [{ setor_id: SETORES.pedagogico, papel: 'lider' }],
        [SETORES.pedagogico, SETORES.sucesso],
      ),
    );
    expect(store.setoresDoFiltro().sort()).toEqual([SETORES.pedagogico, SETORES.sucesso].sort());
    store.setorFiltro.set(SETORES.sucesso);
    expect(store.setoresDoFiltro()).toEqual([SETORES.sucesso]);
  });

  it('perfil sem acesso devolve sem_acesso', async () => {
    const { store, resultado } = await carregar(new ErroApi('sem_permissao'));
    expect(resultado).toBe('sem_acesso');
    expect(store.carregado()).toBe(false);
  });
});
