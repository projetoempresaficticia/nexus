-- T-12 · Login: hook "Before User Created" e ligação perfis.auth_id (SEGURANCA.md §1; US-01, US-02)

-- ---------------------------------------------------------------- hook antes de criar usuário
-- Só cria conta para e-mail @estudeemportugal.org com perfil ativo pré-cadastrado pelo Adm.
-- Segue a recomendação do Supabase: sem security definer; permissões explícitas a supabase_auth_admin.
create function public.auth_hook_antes_criar_usuario(event jsonb)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_email text := lower(event -> 'user' ->> 'email');
begin
  if v_email is null
     or v_email !~ '^[^@\s]+@estudeemportugal\.org$'
     or not exists (select 1 from public.perfis p where lower(p.email::text) = v_email and p.ativo) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'acesso_nao_autorizado'));
  end if;
  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.auth_hook_antes_criar_usuario(jsonb) to supabase_auth_admin;
revoke execute on function public.auth_hook_antes_criar_usuario(jsonb) from authenticated, anon, public;
grant select on public.perfis to supabase_auth_admin;
create policy perfis_auth_admin_select on public.perfis for select to supabase_auth_admin using (true);

-- ---------------------------------------------------------------- liga a conta ao perfil no 1.º login
create function privado.ligar_perfil_ao_usuario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.perfis set auth_id = new.id
  where lower(email::text) = lower(new.email) and auth_id is null;
  return new;
end;
$$;
revoke all on function privado.ligar_perfil_ao_usuario() from public, anon, authenticated;

create trigger ligar_perfil_ao_usuario
  after insert on auth.users
  for each row execute function privado.ligar_perfil_ao_usuario();
