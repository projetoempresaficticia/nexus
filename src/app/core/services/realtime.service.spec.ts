import { TestBed } from '@angular/core/testing';
import { mudanca } from '../../../testing/tempo-real';
import { supabaseFalso } from '../../../testing/supabase-falso';
import { SUPABASE } from '../supabase.client';
import { afetaItem, Evento, RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  function criar() {
    const supabase = supabaseFalso();
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE, useValue: supabase }] });
    return { realtime: TestBed.inject(RealtimeService), supabase };
  }

  it('abre um único canal com as 8 tabelas e mostra Ao vivo', () => {
    const { realtime, supabase } = criar();
    realtime.ligar();
    realtime.ligar();
    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(supabase.canal.tabelas).toHaveLength(9);
    expect(supabase.canal.tabelas).toContain('solicitacao_mensagens');
    expect(supabase.canal.tabelas).toContain('notificacoes');
    expect(realtime.estado()).toBe('ligando');
    supabase.canal.status('SUBSCRIBED');
    expect(realtime.estado()).toBe('ao_vivo');
  });

  it('quando a ligação cai mostra Reconectando e, ao voltar, pede recarga a quem ouve', () => {
    const { realtime, supabase } = criar();
    const ouvinte = vi.fn();
    realtime.ouvir(['itens', 'comentarios'], ouvinte);
    realtime.ligar();
    supabase.canal.status('SUBSCRIBED');
    expect(ouvinte).not.toHaveBeenCalled();
    supabase.canal.status('CHANNEL_ERROR');
    expect(realtime.estado()).toBe('reconectando');
    supabase.canal.status('SUBSCRIBED');
    expect(realtime.estado()).toBe('ao_vivo');
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(ouvinte).toHaveBeenCalledWith(null);
  });

  it('entrega o evento só a quem ouve a tabela; DELETE vem sem linha nova', () => {
    const { realtime } = criar();
    const itens = vi.fn();
    const comentarios = vi.fn();
    realtime.ouvir(['itens'], itens);
    const parar = realtime.ouvir(['comentarios'], comentarios);
    realtime.entregar('itens', mudanca('DELETE', {}, { id: 'i1' }));
    expect(itens).toHaveBeenCalledWith<[Evento]>({
      tabela: 'itens',
      tipo: 'DELETE',
      novo: null,
      antigo: { id: 'i1' },
    });
    expect(comentarios).not.toHaveBeenCalled();
    parar();
    realtime.entregar('comentarios', mudanca('INSERT', { id: 'c1' }));
    expect(comentarios).not.toHaveBeenCalled();
  });

  it('desligar remove o canal e para de renovar o token', async () => {
    const { realtime, supabase } = criar();
    realtime.ligar();
    await realtime.desligar();
    expect(supabase.removeChannel).toHaveBeenCalledWith(supabase.canal);
    expect(realtime.estado()).toBe('desligado');
    // status CLOSED depois do logout não volta a "Reconectando…"
    supabase.canal.status('CLOSED');
    expect(realtime.estado()).toBe('desligado');
  });

  it('afetaItem reconhece o item pela linha ou, no DELETE, pelos ids na tela', () => {
    const ev = (novo: Record<string, unknown> | null, antigo: Record<string, unknown> | null) =>
      ({ tabela: 'comentarios', tipo: 'INSERT', novo, antigo }) as Evento;
    expect(afetaItem(ev({ id: 'c', item_id: 't' }, null), 't')).toBe(true);
    expect(afetaItem(ev({ id: 'c', item_id: 'x' }, null), 't')).toBe(false);
    expect(afetaItem(ev(null, { id: 'c' }), 't', ['c'])).toBe(true);
    expect(afetaItem(ev(null, { id: 'c' }), 't', ['d'])).toBe(false);
    expect(afetaItem(ev(null, { item_id: 'x', depende_de_id: 't' }), 't')).toBe(true);
    expect(afetaItem(null, 't')).toBe(true);
  });
});
