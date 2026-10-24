-- T-56 · Pedido do Germano (2026-10-24): além de @estudeemportugal.org, só entra quem foi
-- explicitamente cadastrado — mesmo fora do domínio da empresa (hoje: a conta do Google Cloud/GitHub
-- usada para administrar a infraestrutura, projetoempresaficticia@gmail.com). A lista fica numa função
-- só, chamada tanto pela constraint de perfis quanto pelo hook de login — as duas nunca se desalinham.
-- Para aprovar mais alguém fora do domínio: nova migration trocando esta função (nunca a lista "solta"
-- em dois lugares).

create function privado.email_permitido(p_email text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select lower(p_email) ~* '^[^@\s]+@estudeemportugal\.org$'
      or lower(p_email) = any (array['projetoempresaficticia@gmail.com']);
$$;
revoke all on function privado.email_permitido(text) from public, anon, authenticated;
grant execute on function privado.email_permitido(text) to supabase_auth_admin;

alter table public.perfis drop constraint perfis_email_check;
alter table public.perfis add constraint perfis_email_check check (privado.email_permitido(email::text));

create or replace function public.auth_hook_antes_criar_usuario(event jsonb)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_email text := lower(event -> 'user' ->> 'email');
begin
  if v_email is null
     or not privado.email_permitido(v_email)
     or not exists (select 1 from public.perfis p where lower(p.email::text) = v_email and p.ativo) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'acesso_nao_autorizado'));
  end if;
  return '{}'::jsonb;
end;
$$;
