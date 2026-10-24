import { TestBed } from '@angular/core/testing';
import { dadosIniciais, SETORES } from '../../../../testing/dados-iniciais';
import { item } from '../../../../testing/item';
import { AcessoService } from '../../../core/auth/acesso.service';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { Papel } from '../../../core/models/acesso.model';
import { ConfirmacaoService } from '../../../shared/ui/confirmacao.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { Comentario, ItemService } from '../item.service';
import { ComentariosItemComponent } from './comentarios-item.component';

const com = (
  id: string,
  autor: string,
  texto: string,
  editado: string | null = null,
): Comentario => ({
  id,
  item_id: 't',
  autor_id: autor,
  texto_html: texto,
  criado_em: '2026-10-23T13:05:00Z',
  editado_em: editado,
  legacy_id: null,
});

async function montar(papel: Papel, servico: Partial<Record<keyof ItemService, unknown>>) {
  const dados = dadosIniciais(
    [{ setor_id: SETORES.sucesso, papel }],
    papel === 'lider' ? [SETORES.sucesso] : [],
  );
  dados.pessoas = [
    { id: 'p-eu', nome: 'Ana Ribeiro', iniciais: 'AR', email: 'a@x', vinculos: [] },
    { id: 'p-bruno', nome: 'Bruno Costa', iniciais: 'BC', email: 'b@x', vinculos: [] },
  ];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue(dados),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
      { provide: ItemService, useValue: servico },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const fixture = TestBed.createComponent(ComentariosItemComponent);
  fixture.componentRef.setInput('item', item({ id: 't', setor_id: SETORES.sucesso }));
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}
const botoes = (el: Element, txt: string) =>
  [...el.querySelectorAll('button')].filter((b) => b.textContent?.trim() === txt);

describe('ComentariosItemComponent', () => {
  it('lista com autor, data em Lisboa e "(editado)"', async () => {
    const { el } = await montar('membro', {
      listarComentarios: vi
        .fn()
        .mockResolvedValue([com('1', 'p-bruno', '<p>oi</p>', '2026-10-23T14:00:00Z')]),
    });
    const c = el.querySelector('.com')!;
    expect(c.textContent).toContain('Bruno Costa');
    expect(c.textContent).toContain('23/10/2026 14:05');
    expect(c.textContent).toContain('(editado)');
  });

  it('publica sanitizado e recusa vazio (US-18)', async () => {
    const salvarComentario = vi.fn().mockResolvedValue(com('2', 'p-eu', '<p>feito</p>'));
    const { fixture, el } = await montar('membro', {
      listarComentarios: vi.fn().mockResolvedValue([]),
      salvarComentario,
    });
    botoes(el, 'Comentar')[0].click();
    await fixture.whenStable();
    expect(TestBed.inject(ToastService).atual()?.texto).toBe('Escreva algo antes de comentar.');
    expect(salvarComentario).not.toHaveBeenCalled();

    (fixture.componentInstance as unknown as { novo: { set(v: string): void } }).novo.set(
      '<p>feito<script>x()</script></p>',
    );
    botoes(el, 'Comentar')[0].click();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(salvarComentario).toHaveBeenCalledWith(null, 't', '<p>feito</p>');
    expect(el.querySelectorAll('.com').length).toBe(1);
  });

  it('membro edita e apaga só o que é seu (US-19)', async () => {
    const { el } = await montar('membro', {
      listarComentarios: vi
        .fn()
        .mockResolvedValue([com('1', 'p-eu', '<p>meu</p>'), com('2', 'p-bruno', '<p>dele</p>')]),
    });
    const [meu, dele] = [...el.querySelectorAll('.com')];
    expect(botoes(meu, 'Editar').length).toBe(1);
    expect(botoes(meu, 'Apagar').length).toBe(1);
    expect(botoes(dele, 'Editar').length).toBe(0);
    expect(botoes(dele, 'Apagar').length).toBe(0);
  });

  it('líder apaga comentário de outra pessoa', async () => {
    const apagarComentario = vi.fn().mockResolvedValue(undefined);
    const { fixture, el } = await montar('lider', {
      listarComentarios: vi.fn().mockResolvedValue([com('2', 'p-bruno', '<p>dele</p>')]),
      apagarComentario,
    });
    vi.spyOn(TestBed.inject(ConfirmacaoService), 'perguntar').mockResolvedValue(true);
    botoes(el, 'Apagar')[0].click();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(apagarComentario).toHaveBeenCalledWith('2');
    expect(el.querySelectorAll('.com').length).toBe(0);
  });
});
