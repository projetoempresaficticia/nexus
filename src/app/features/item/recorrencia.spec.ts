import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { ItensStore } from '../../core/itens/itens.store';
import { ToastService } from '../../shared/ui/toast.service';
import { NovoItemModal } from '../tarefas/novo-item.modal';
import { StatusItemComponent } from './components/status-item.component';

async function preparar(servico: Partial<Record<keyof ItensService, unknown>>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi
            .fn()
            .mockResolvedValue(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }])),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
      { provide: ItensService, useValue: servico },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  await TestBed.inject(ItensStore).carregar();
}

describe('Recorrência (US-14)', () => {
  it('o modal envia a recorrência escolhida', async () => {
    const criar = vi.fn().mockResolvedValue(item({ id: 'n' }));
    await preparar({ listar: vi.fn().mockResolvedValue([]), criar });
    const fixture = TestBed.createComponent(NovoItemModal);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const nome = el.querySelector('input[type=text]') as HTMLInputElement;
    nome.value = 'Relatório semanal';
    nome.dispatchEvent(new Event('input'));
    const repetir = [...el.querySelectorAll('select')].at(-1) as HTMLSelectElement;
    expect([...repetir.options].map((o) => o.text.trim())).toEqual([
      'Não repete',
      'Diária',
      'Semanal',
      'Quinzenal',
      'Mensal',
      'Anual',
    ]);
    repetir.value = 'semanal';
    repetir.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    (
      [...el.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === 'Criar',
      ) as HTMLElement
    ).click();
    await new Promise((r) => setTimeout(r));
    expect(criar).toHaveBeenCalledWith(expect.objectContaining({ recorrencia: 'semanal' }));
  });

  it('concluir mostra a data da próxima ocorrência', async () => {
    const recorrente = item({ id: 't', recorrencia: 'semanal', prazo: '2026-11-02' });
    await preparar({
      listar: vi.fn().mockResolvedValue([recorrente]),
      mudarStatus: vi.fn().mockResolvedValue({
        item: { ...recorrente, status: 'concluida', recorrencia: null },
        novo_item_recorrente: item({ id: 't2', prazo: '2026-11-09', recorrencia: 'semanal' }),
      }),
    });
    const fixture = TestBed.createComponent(StatusItemComponent);
    fixture.componentRef.setInput('item', recorrente);
    fixture.componentRef.setInput('podeEditar', true);
    await fixture.whenStable();
    (
      [...fixture.nativeElement.querySelectorAll('.st-btn')].find(
        (b: HTMLElement) => b.textContent?.trim() === 'Concluída',
      ) as HTMLElement
    ).click();
    await new Promise((r) => setTimeout(r));
    expect(TestBed.inject(ToastService).atual()?.texto).toBe(
      'Próxima ocorrência criada para 09/11/2026.',
    );
    expect(TestBed.inject(ItensStore).porId('t2')).toBeTruthy();
  });
});
