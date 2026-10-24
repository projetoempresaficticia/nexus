import {
  dataCurta,
  dataHora,
  dataLonga,
  diferencaDias,
  hojeIso,
  segundaDaSemana,
  somarDias,
} from './datas';

describe('datas', () => {
  it('hoje é a data de Lisboa, não a de UTC', () => {
    // 23:30 UTC de 23/10 = 00:30 de 24/10 em Lisboa (horário de verão, UTC+1)
    expect(hojeIso(new Date('2026-10-23T23:30:00Z'))).toBe('2026-10-24');
  });

  it('soma dias atravessando mês e mudança de hora', () => {
    expect(somarDias('2026-10-24', 8)).toBe('2026-11-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('diferença em dias', () => {
    expect(diferencaDias('2026-10-24', '2026-11-02')).toBe(9);
  });

  it('formatos curtos e longos', () => {
    expect(dataCurta('2026-11-02')).toBe('02/11');
    expect(dataLonga('2026-11-02')).toBe('02/11/2026');
    expect(dataCurta(null)).toBe('');
    expect(dataHora('2026-10-23T13:05:00Z')).toBe('23/10/2026 14:05');
  });

  it('segunda-feira da semana', () => {
    expect(segundaDaSemana('2026-10-24')).toBe('2026-10-19');
    expect(segundaDaSemana('2026-10-19')).toBe('2026-10-19');
  });
});
