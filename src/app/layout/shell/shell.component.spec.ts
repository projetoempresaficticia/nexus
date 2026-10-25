import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { supabaseFalso } from '../../../testing/supabase-falso';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { DadosIniciais } from '../../core/models/acesso.model';
import { SUPABASE } from '../../core/supabase.client';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  async function montar(dados: DadosIniciais, pendentes = 0) {
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        { provide: SUPABASE, useValue: supabaseFalso() },
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi.fn().mockResolvedValue(dados),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(pendentes),
          },
        },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      menu: [...el.querySelectorAll('.nav-item span:first-child')].map((s) =>
        s.textContent?.trim(),
      ),
      el,
    };
  }

  it('membro vê Minhas tarefas, sem Painel', async () => {
    const { menu } = await montar(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]));
    expect(menu).toEqual(['Minhas tarefas', 'Projetos', 'Solicitações', 'Equipe', 'Notificações']);
  });

  it('líder vê Painel, Produtividade e Setores, sem Usuários', async () => {
    const { menu } = await montar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]),
    );
    expect(menu).toEqual([
      'Painel',
      'Produtividade',
      'Projetos',
      'Tarefas',
      'Solicitações',
      'Equipe',
      'Notificações',
      'Setores',
    ]);
  });

  it('adm do sistema vê Usuários e Setores', async () => {
    const { menu } = await montar(
      dadosIniciais([], [SETORES.secretaria, SETORES.financeiro], true),
    );
    expect(menu).toContain('Usuários');
    expect(menu).toContain('Setores');
  });

  it('mostra o contador de solicitações pendentes e o papel no rodapé', async () => {
    const { el } = await montar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]),
      2,
    );
    expect(el.querySelector('.count')?.textContent?.trim()).toBe('2');
    expect(el.querySelector('.quem')?.textContent).toContain('Líder de 1 setor(es)');
    expect(el.querySelector('.setor .pill.lider')?.textContent?.trim()).toBe('Líder');
  });

  it('abre o tempo real e mostra Ao vivo / Reconectando… no rodapé (US-37)', async () => {
    const { el, fixture } = await montar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]),
    );
    const supabase = TestBed.inject(SUPABASE) as unknown as ReturnType<typeof supabaseFalso>;
    expect(supabase.channel).toHaveBeenCalledWith('nexus');
    expect(el.querySelector('.ao-vivo')).toBeNull();
    supabase.canal.status('SUBSCRIBED');
    await fixture.whenStable();
    expect(el.querySelector('.ao-vivo')?.textContent?.trim()).toBe('Ao vivo');
    window.dispatchEvent(new Event('offline'));
    await fixture.whenStable();
    expect(el.querySelector('.ao-vivo')?.textContent?.trim()).toBe('Reconectando…');
    fixture.destroy();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
