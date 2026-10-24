import { deHtml, paraHtml } from './mencoes-texto';

const ANA = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', nome: 'Ana' };
const ANA_R = { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', nome: 'Ana Ribeiro' };

describe('mencoes-texto', () => {
  it('escapa o texto e marca as menções, sem confundir nomes parecidos', () => {
    expect(paraHtml(' Falar com @Ana Ribeiro e @Ana <já> ', [ANA, ANA_R])).toBe(
      `Falar com <span class="mention" data-uid="${ANA_R.id}">@Ana Ribeiro</span> e ` +
        `<span class="mention" data-uid="${ANA.id}">@Ana</span> &lt;já&gt;`,
    );
  });

  it('ignora id que não é uuid', () => {
    expect(paraHtml('@X', [{ id: '"><img>', nome: 'X' }])).toBe('@X');
  });

  it('volta do HTML para texto e pessoas marcadas', () => {
    const html = paraHtml('Ligar a @Ana & cia', [ANA]);
    expect(deHtml(html)).toEqual({ texto: 'Ligar a @Ana & cia', marcadas: [ANA] });
  });
});
