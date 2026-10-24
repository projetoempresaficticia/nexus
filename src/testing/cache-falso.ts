/** CacheLocalService falso: devolve os retratos dados e registra gravações. */
export function cacheFalso(retratos: Record<string, unknown> = {}) {
  return {
    definirDono: vi.fn(),
    ler: vi.fn((nome: string) => Promise.resolve(retratos[nome] ?? null)),
    gravar: vi.fn().mockResolvedValue(undefined),
    agendar: vi.fn(),
    limpar: vi.fn().mockResolvedValue(undefined),
  };
}
