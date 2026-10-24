import { TestBed } from '@angular/core/testing';
import { CacheLocalService } from './cache-local.service';

describe('CacheLocalService', () => {
  const criar = () => TestBed.inject(CacheLocalService);

  it('sem IndexedDB (ou sem usuário) não lê nem quebra', async () => {
    const cache = criar();
    expect(await cache.ler('itens')).toBeNull();
    cache.definirDono('u1');
    await expect(cache.gravar('itens', [1])).resolves.toBeUndefined();
    expect(await cache.ler('itens')).toBeNull();
    await expect(cache.limpar()).resolves.toBeUndefined();
  });

  it('agendar junta mudanças seguidas numa só gravação', () => {
    vi.useFakeTimers();
    const cache = criar();
    const gravar = vi.spyOn(cache, 'gravar').mockResolvedValue();
    cache.agendar('itens', [1]);
    cache.agendar('itens', [1, 2]);
    vi.advanceTimersByTime(999);
    expect(gravar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(gravar).toHaveBeenCalledExactlyOnceWith('itens', [1, 2]);
    vi.useRealTimers();
  });

  it('limpar cancela gravações agendadas (logout)', async () => {
    vi.useFakeTimers();
    const cache = criar();
    const gravar = vi.spyOn(cache, 'gravar').mockResolvedValue();
    cache.agendar('itens', [1]);
    await cache.limpar();
    vi.advanceTimersByTime(2000);
    expect(gravar).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
