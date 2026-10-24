import { TestBed } from '@angular/core/testing';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { DadosIniciais } from '../models/acesso.model';
import { Router, provideRouter } from '@angular/router';
import { cacheFalso } from '../../../testing/cache-falso';
import { CacheLocalService } from '../services/cache-local.service';
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

  describe('abertura instantânea (T-44)', () => {
    function criar(servidor: Promise<DadosIniciais>) {
      const membro = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]);
      const cache = cacheFalso({ acesso: { dados: membro, pendentes: 3 } });
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: CacheLocalService, useValue: cache },
          {
            provide: AcessoService,
            useValue: {
              carregarInicial: vi.fn(() => servidor),
              contarSolicitacoesPendentes: vi.fn().mockResolvedValue(1),
            },
          },
        ],
      });
      return { store: TestBed.inject(AcessoStore), cache };
    }

    it('abre com o retrato sem esperar o servidor e depois atualiza', async () => {
      let responder!: (d: DadosIniciais) => void;
      const { store, cache } = criar(new Promise((r) => (responder = r)));
      expect(await store.carregar()).toBe('ok');
      expect(store.pendentes()).toBe(3);
      expect(store.ehLider()).toBe(false);
      responder(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]));
      await new Promise((r) => setTimeout(r));
      expect(store.ehLider()).toBe(true);
      expect(store.pendentes()).toBe(1);
      expect(cache.gravar).toHaveBeenCalledWith(
        'acesso',
        expect.objectContaining({ pendentes: 1 }),
      );
    });

    it('desativado desde a última visita: apaga o retrato e vai para Sem acesso', async () => {
      const { store, cache } = criar(Promise.reject(new ErroApi('sem_permissao')));
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      expect(await store.carregar()).toBe('ok');
      await new Promise((r) => setTimeout(r));
      expect(cache.limpar).toHaveBeenCalled();
      expect(navegar).toHaveBeenCalledWith('/sem-acesso');
      expect(store.carregado()).toBe(false);
    });
  });
});
