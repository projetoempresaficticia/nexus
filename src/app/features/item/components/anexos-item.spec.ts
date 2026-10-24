import { TestBed } from '@angular/core/testing';
import { dadosIniciais, SETORES } from '../../../../testing/dados-iniciais';
import { item } from '../../../../testing/item';
import { AcessoService } from '../../../core/auth/acesso.service';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ErroApi } from '../../../core/services/erro-api';
import { SUPABASE } from '../../../core/supabase.client';
import { ToastService } from '../../../shared/ui/toast.service';
import { Anexo, AnexosService, LIMITE_BYTES, nomeSeguro } from '../anexos.service';
import { AnexosItemComponent, tamanhoLegivel } from './anexos-item.component';

const anexo = (id: string, enviadoPor: string, extra: Partial<Anexo> = {}): Anexo => ({
  id,
  item_id: 't',
  comentario_id: null,
  nome: `arquivo-${id}.pdf`,
  caminho: `s/t/${id}.pdf`,
  link_externo: null,
  tamanho_bytes: 1_400_000,
  mime: 'application/pdf',
  enviado_por: enviadoPor,
  criado_em: '2026-10-23T10:00:00Z',
  ...extra,
});

describe('regras de anexo (US-20)', () => {
  it('recusa arquivo acima de 20 MB antes de enviar', async () => {
    const upload = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE, useValue: { storage: { from: () => ({ upload }) } } }],
    });
    const grande = new File(['x'], 'grande.pdf');
    Object.defineProperty(grande, 'size', { value: LIMITE_BYTES + 1 });
    await expect(
      TestBed.inject(AnexosService).enviar({ id: 't', setor_id: 's' }, grande, 'p-eu'),
    ).rejects.toEqual(new ErroApi('arquivo_grande'));
    expect(upload).not.toHaveBeenCalled();
  });

  it('nome seguro para o Storage e tamanho legível', () => {
    expect(nomeSeguro('Relatório Março/2026 final.pdf')).toBe('Relatorio-Marco-2026-final.pdf');
    expect(tamanhoLegivel(1_400_000)).toBe('1,3 MB');
    expect(tamanhoLegivel(500)).toBe('1 KB');
  });
});

describe('AnexosItemComponent', () => {
  async function montar(
    papel: 'lider' | 'membro',
    servico: Partial<Record<keyof AnexosService, unknown>>,
  ) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi
              .fn()
              .mockResolvedValue(
                dadosIniciais(
                  [{ setor_id: SETORES.sucesso, papel }],
                  papel === 'lider' ? [SETORES.sucesso] : [],
                ),
              ),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          },
        },
        { provide: AnexosService, useValue: servico },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(AnexosItemComponent);
    fixture.componentRef.setInput('item', item({ id: 't', setor_id: SETORES.sucesso }));
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('membro remove só o que enviou; links abrem em nova aba', async () => {
    const { el } = await montar('membro', {
      listar: vi.fn().mockResolvedValue([
        anexo('1', 'p-eu'),
        anexo('2', 'outro', {
          caminho: null,
          link_externo: 'https://drive.google.com/x',
          nome: 'Drive',
        }),
      ]),
    });
    const linhas = [...el.querySelectorAll('.file')];
    expect(linhas[0].querySelector('[aria-label^="Remover"]')).toBeTruthy();
    expect(linhas[1].querySelector('[aria-label^="Remover"]')).toBeNull();
    expect(linhas[1].querySelector('a')?.getAttribute('target')).toBe('_blank');
    expect(linhas[0].textContent).toContain('1,3 MB');
  });

  it('link sem https é recusado; com https é adicionado', async () => {
    const adicionarLink = vi
      .fn()
      .mockResolvedValue(
        anexo('3', 'p-eu', { caminho: null, link_externo: 'https://x.org', nome: 'Pasta' }),
      );
    const { fixture, el } = await montar('membro', {
      listar: vi.fn().mockResolvedValue([]),
      adicionarLink,
    });
    (
      [...el.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === 'Colar link',
      ) as HTMLElement
    ).click();
    await fixture.whenStable();
    const [nome, url] = [...el.querySelectorAll('.link input')] as HTMLInputElement[];
    nome.value = 'Pasta';
    nome.dispatchEvent(new Event('input'));
    url.value = 'http://inseguro';
    url.dispatchEvent(new Event('input'));
    url.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
    expect(TestBed.inject(ToastService).atual()?.texto).toBe(
      'Use um endereço que comece com https://',
    );
    expect(adicionarLink).not.toHaveBeenCalled();

    url.value = 'https://x.org';
    url.dispatchEvent(new Event('input'));
    url.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(adicionarLink).toHaveBeenCalledWith('t', 'Pasta', 'https://x.org', 'p-eu');
    expect(el.querySelectorAll('.file').length).toBe(1);
  });

  it('líder remove anexo de outra pessoa', async () => {
    const apagar = vi.fn().mockResolvedValue(undefined);
    const { fixture, el } = await montar('lider', {
      listar: vi.fn().mockResolvedValue([anexo('1', 'outro')]),
      apagar,
    });
    (el.querySelector('[aria-label^="Remover"]') as HTMLElement).click();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(apagar).toHaveBeenCalled();
    expect(el.querySelectorAll('.file').length).toBe(0);
  });
});
