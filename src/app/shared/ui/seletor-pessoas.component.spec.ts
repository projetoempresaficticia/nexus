import { TestBed } from '@angular/core/testing';
import { OpcaoPessoa, SeletorPessoasComponent } from './seletor-pessoas.component';

const PESSOAS: OpcaoPessoa[] = [
  { id: 'p1', nome: 'Ana Ribeiro', iniciais: 'AR' },
  { id: 'p2', nome: 'Bruno Costa', iniciais: 'BC' },
];

describe('SeletorPessoasComponent (busca de pessoas)', () => {
  function montar(selecionados: string[] = []) {
    const fixture = TestBed.createComponent(SeletorPessoasComponent);
    fixture.componentRef.setInput('opcoes', PESSOAS);
    fixture.componentRef.setInput('selecionados', selecionados);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('ao focar o campo vazio, já mostra as pessoas para escolher (não parece um texto comum)', async () => {
    const { fixture, el } = montar();
    expect(el.querySelector('.lista')).toBeNull();
    el.querySelector('input')!.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    const opcoes = [...el.querySelectorAll('.mi')].map((b) => b.textContent?.trim());
    expect(opcoes).toEqual(['ARAna Ribeiro', 'BCBruno Costa']);
  });

  it('clicar numa pessoa escolhe, soma ao chip e mantém a lista aberta para escolher outra', async () => {
    const { fixture, el } = montar();
    el.querySelector('input')!.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    [...el.querySelectorAll('.mi')][0].dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect([...el.querySelectorAll('.chip')].map((c) => c.textContent)).toEqual([
      expect.stringContaining('Ana Ribeiro'),
    ]);
    // quem já foi escolhido sai da lista; o campo some sozinho da lista ao escolher o único que faltava
    expect([...el.querySelectorAll('.mi')].map((b) => b.textContent?.trim())).toEqual([
      'BCBruno Costa',
    ]);
  });

  it('digitar filtra; Enter escolhe a primeira sugestão', async () => {
    const { fixture, el } = montar();
    const input = el.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    input.value = 'bru';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect([...el.querySelectorAll('.mi')].map((b) => b.textContent?.trim())).toEqual([
      'BCBruno Costa',
    ]);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(el.querySelector('.chip')?.textContent).toContain('Bruno Costa');
  });

  it('× remove quem já foi escolhido', async () => {
    const { fixture, el } = montar(['p1']);
    expect(el.querySelector('.chip')?.textContent).toContain('Ana Ribeiro');
    el.querySelector('.x')!.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(el.querySelector('.chip')).toBeNull();
  });
});
