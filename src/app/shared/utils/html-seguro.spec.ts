import { htmlVazio, sanitizar, textoPuro } from './html-seguro';

describe('sanitizar (US-18)', () => {
  it('remove script e handlers como onerror', () => {
    const limpo = sanitizar(
      '<p onclick="x()">oi</p><script>alert(1)</script><img src="https://a/b.png" onerror="alert(2)">',
    );
    expect(limpo).not.toContain('script');
    expect(limpo).not.toContain('onclick');
    expect(limpo).not.toContain('onerror');
    expect(limpo).toContain('<p>oi</p>');
    expect(limpo).toContain('src="https://a/b.png"');
  });

  it('links só https/mailto e abrindo em nova aba', () => {
    expect(sanitizar('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
    const ok = sanitizar('<a href="https://drive.google.com/x">x</a>');
    expect(ok).toContain('target="_blank"');
    expect(ok).toContain('rel="noopener noreferrer"');
  });

  it('não aceita imagem em base64 nem http', () => {
    expect(sanitizar('<img src="data:image/png;base64,AAAA">')).toBe('');
    expect(sanitizar('<img src="http://inseguro/x.png">')).toBe('');
  });

  it('mantém a pílula de menção e tira classes arbitrárias', () => {
    const html =
      '<span class="mention" data-uid="a0000000-0000-0000-0000-000000000004">@Bruno</span><span class="x" style="color:red">y</span>';
    const limpo = sanitizar(html);
    expect(limpo).toContain('class="mention" data-uid="a0000000-0000-0000-0000-000000000004"');
    expect(limpo).not.toContain('class="x"');
    expect(limpo).not.toContain('style');
  });

  it('remove tags fora da lista mantendo o texto', () => {
    expect(sanitizar('<table><tr><td>célula</td></tr></table>')).toBe('célula');
  });

  it('texto puro e vazio', () => {
    expect(textoPuro('<p>Olá <b>mundo</b></p>')).toBe('Olá mundo');
    expect(htmlVazio('<p></p><p><br></p>')).toBe(true);
    expect(htmlVazio('<p>x</p>')).toBe(false);
  });
});
