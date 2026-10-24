import { ErroApi } from './erro-api';
import { buscarTodas } from './paginar';

describe('buscarTodas (T-37)', () => {
  it('pede página após página até vir uma incompleta', async () => {
    const linhas = Array.from({ length: 5 }, (_, i) => i);
    const pagina = vi.fn((de: number, ate: number) =>
      Promise.resolve({ data: linhas.slice(de, ate + 1), error: null }),
    );
    expect(await buscarTodas(pagina, 2)).toEqual([0, 1, 2, 3, 4]);
    expect(pagina.mock.calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it('número exato de linhas: uma página vazia no fim', async () => {
    const pagina = vi.fn((de: number) =>
      Promise.resolve({ data: de === 0 ? [1, 2] : [], error: null }),
    );
    expect(await buscarTodas(pagina, 2)).toEqual([1, 2]);
    expect(pagina).toHaveBeenCalledTimes(2);
  });

  it('erro numa página vira ErroApi', async () => {
    const pagina = () =>
      Promise.resolve({ data: null, error: { code: 'P0001', message: 'sem_permissao' } as never });
    await expect(buscarTodas(pagina)).rejects.toBeInstanceOf(ErroApi);
  });
});
