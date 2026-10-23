import { TestBed } from '@angular/core/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';

describe('SUPABASE', () => {
  it('fornece um SupabaseClient', () => {
    const cliente = TestBed.inject(SUPABASE);
    expect(cliente).toBeInstanceOf(SupabaseClient);
  });

  it('devolve sempre a mesma instância', () => {
    expect(TestBed.inject(SUPABASE)).toBe(TestBed.inject(SUPABASE));
  });
});
