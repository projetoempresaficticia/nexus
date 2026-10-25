# -*- coding: utf-8 -*-
"""Lê a planilha exportada do Nexus v26 e gera um .sql de importação para o Supabase do v2.

Uso:
    python scripts/importar-v26.py <planilha.xlsx> [saida.sql]

O SQL gerado roda tudo dentro de uma transação, com `session_replication_role = replica`
(desliga os gatilhos de notificação e de histórico automático do v2 — ninguém recebe e-mail
e o histórico vem só do que a própria planilha já tinha). Revise o arquivo gerado antes de
rodar (`npx supabase db query --file saida.sql --linked`, ou local sem `--linked`).

Decisões de negócio confirmadas com o Germano em 2026-10-25 (docs/DECISOES.md):
- Vínculo "Adm" na planilha -> is_admin=true no perfil (além do vínculo normal como líder).
- Itens com ativo=False (exclusão "mole" do v26) NÃO entram — o v2 não tem esse conceito.
- Notificações antigas NÃO entram (tipos não batem 1 pra 1 com os de hoje; baixo valor).
- Aba "Configurações" (ajustes do app antigo) NÃO entra — hoje isso é código/segredo.
- Histórico: só ITENS/SOLICITACOES/USUARIOS, só campo com coluna equivalente no v2.
  Vínculos não entram no histórico (ids de vínculo da planilha não eram rastreáveis 1:1).

Limitação conhecida: pessoas citadas em responsavel_id/de_id que não existem na aba
"Usuários" (ex.: alguém que já tinha saído quando a planilha foi gerada) ficam sem dono —
o item/solicitação é importado mesmo assim, só sem aquele responsável. Confira no fim.

Antes de rodar pra valer, ajuste EXISTENTES (perfis que já existem no banco de destino,
como os Adms cadastrados via Google) para não duplicar essas pessoas.
"""
import openpyxl
import uuid
import re
import sys
from datetime import datetime, date

CAMINHO = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\devel\Downloads\Nexus.xlsx'
SAIDA = sys.argv[2] if len(sys.argv) > 2 else 'importar-v26.sql'

# Perfis que já existem no banco de destino (email -> id real), pra não duplicar.
EXISTENTES = {
    'germano@estudeemportugal.org': '52c40652-43e2-4d9c-bd79-b254bae6d51f',
}

wb = openpyxl.load_workbook(CAMINHO, data_only=True, read_only=True)


def linhas(sheet):
    ws = wb[sheet]
    headers = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[0] is None:
            continue
        yield dict(zip(headers, row))


def b(v):
    return v is not None and str(v).strip().lower() == 'true'


def novo_id():
    return str(uuid.uuid4())


def sql_str(v):
    if v is None:
        return 'null'
    return "'" + str(v).replace("'", "''") + "'"


def sql_ts(v):
    if v is None:
        return 'null'
    if isinstance(v, (datetime, date)):
        return f"'{v.isoformat()}'"
    return f"'{v}'"


def sql_date(v):
    if v is None:
        return 'null'
    if isinstance(v, datetime):
        return f"'{v.date().isoformat()}'"
    if isinstance(v, date):
        return f"'{v.isoformat()}'"
    return f"'{str(v)[:10]}'"


def sql_bool(v):
    return 'true' if b(v) else 'false'


def sql_int(v):
    return 'null' if v is None else str(int(float(v)))


out = ['-- Importação Nexus v26 -> v2 (T-41). Rodar com session_replication_role=replica.', 'begin;',
       'set local session_replication_role = replica;']

# ---------------------------------------------------------------- pessoas
usr_id = {}
email_perfil = {}

admins_por_vinculo = {v['usuario_id'] for v in linhas('Vínculos') if str(v['perfil']).strip().lower() == 'adm'}

usuarios = list(linhas('Usuários'))
for u in usuarios:
    email = u['email'].strip().lower()
    is_admin = u['id'] in admins_por_vinculo
    if email in EXISTENTES:
        pid = EXISTENTES[email]
        usr_id[u['id']] = pid
        email_perfil[email] = pid
        extra = ', is_admin=true' if is_admin else ''
        out.append(f"update public.perfis set legacy_id={sql_str(u['id'])}{extra} where id='{pid}';")
        continue
    pid = novo_id()
    usr_id[u['id']] = pid
    email_perfil[email] = pid
    out.append(
        "insert into public.perfis (id, auth_id, email, nome, iniciais, is_admin, ativo, criado_em, legacy_id) values ("
        f"'{pid}', null, {sql_str(email)}, {sql_str(u['nome'])}, {sql_str(u['iniciais'])}, "
        f"{sql_bool(is_admin)}, {sql_bool(u['ativo'])}, {sql_ts(u['criado_em'])}, {sql_str(u['id'])});"
    )


def ator_por_email(email):
    if not email:
        return None
    return email_perfil.get(str(email).split(' (via ')[0].strip().lower())


FALLBACK = next(iter(EXISTENTES.values()))

# ---------------------------------------------------------------- setores
setor_id = {s['id']: novo_id() for s in linhas('Setores')}
for s in linhas('Setores'):
    criado_por = ator_por_email(s['criado_por']) or FALLBACK
    pai = setor_id.get(s['setor_pai_id']) if s['setor_pai_id'] else None
    out.append(
        "insert into public.setores (id, nome, pai_id, ativo, criado_por, criado_em) values ("
        f"'{setor_id[s['id']]}', {sql_str(s['nome'])}, {sql_str(pai) if pai else 'null'}, "
        f"{sql_bool(s['ativo'])}, '{criado_por}', {sql_ts(s['criado_em'])});"
    )

# ---------------------------------------------------------------- vínculos
PAPEL = {'membro': 'membro', 'líder': 'lider', 'lider': 'lider', 'adm': 'lider'}
for v in linhas('Vínculos'):
    pid, sid = usr_id.get(v['usuario_id']), setor_id.get(v['setor_id'])
    if not pid or not sid:
        continue
    papel = PAPEL.get(str(v['perfil']).strip().lower(), 'membro')
    out.append(
        "insert into public.vinculos (perfil_id, setor_id, papel, criado_em) values ("
        f"'{pid}', '{sid}', '{papel}', {sql_ts(v['criado_em'])}) on conflict do nothing;"
    )

# ---------------------------------------------------------------- itens (só ativo=True)
NIVEL = {'projeto': 0, 'tarefa': 1, 'subtarefa': 2}
STATUS = {'a fazer': 'a_fazer', 'em andamento': 'em_andamento', 'bloqueada': 'bloqueada', 'concluída': 'concluida', 'concluida': 'concluida'}
PRIORIDADE = {'alta': 'alta', 'média': 'media', 'media': 'media', 'baixa': 'baixa'}
RECORRENCIA = {'diaria': 'diaria', 'semanal': 'semanal', 'mensal': 'mensal', 'quinzenal': 'quinzenal', 'anual': 'anual'}

item_id = {}
itens_ativos = []
for i in linhas('Itens'):
    if not b(i['ativo']):
        continue
    item_id[i['id']] = novo_id()
    itens_ativos.append(i)
ids_ativos = set(item_id.keys())

for i in itens_ativos:
    pai = i['pai_id'] if i['pai_id'] in ids_ativos else None
    status = STATUS.get(str(i['status']).strip().lower(), 'a_fazer')
    parado_desde = i['bloqueada_desde'] if status == 'bloqueada' else None
    descricao = sql_str(i['descricao_html']) if i['descricao_html'] else "''"
    out.append(
        "insert into public.itens (id, setor_id, pai_id, nivel, nome, descricao_html, status, prioridade, "
        "inicio, prazo, concluido_em, motivo_bloqueio_html, recorrencia, parado_desde, criado_por, criado_em, "
        "atualizado_em, legacy_id) values ("
        f"'{item_id[i['id']]}', '{setor_id.get(i['setor_id'])}', "
        f"{sql_str(item_id.get(pai)) if pai else 'null'}, "
        f"{NIVEL.get(str(i['nivel']).strip().lower(), 1)}, {sql_str(i['nome'])}, {descricao}, '{status}', "
        f"'{PRIORIDADE.get(str(i['prioridade']).strip().lower(), 'media')}', "
        f"{sql_date(i['data_inicio'])}, {sql_date(i['prazo'])}, {sql_ts(i['concluido_em'])}, "
        f"{sql_str(i['motivo_bloqueio_html'])}, "
        f"{sql_str(RECORRENCIA.get(str(i['recorrencia']).strip().lower())) if i['recorrencia'] else 'null'}, "
        f"{sql_ts(parado_desde)}, '{ator_por_email(i['criado_por']) or FALLBACK}', {sql_ts(i['criado_em'])}, "
        f"{sql_ts(i['atualizado_em'])}, {sql_str(i['id'])});"
    )
    if i['responsavel_id'] and i['responsavel_id'] in usr_id:
        out.append(
            "insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values ("
            f"'{item_id[i['id']]}', '{usr_id[i['responsavel_id']]}', '{ator_por_email(i['criado_por']) or FALLBACK}');"
        )

# ---------------------------------------------------------------- checklist (tabela só tem id/item_id/texto/feito/ordem)
for c in linhas('Checklist'):
    iid = item_id.get(c['item_id'])
    if not iid:
        continue
    out.append(
        "insert into public.checklist_itens (item_id, ordem, texto, feito) values ("
        f"'{iid}', {sql_int(c['ordem'])}, {sql_str(c['texto'])}, {sql_bool(c['feito'])});"
    )

# ---------------------------------------------------------------- solicitações
sol_id = {}
STATUS_SOL = {'pendente': 'pendente', 'resolvida': 'resolvida'}
TIPO_SOL = {'informação': 'informacao', 'informacao': 'informacao', 'ação': 'acao', 'acao': 'acao', 'aprovação': 'aprovacao', 'aprovacao': 'aprovacao'}
for s in linhas('Solicitações'):
    iid, de, para = item_id.get(s['item_id']), usr_id.get(s['de_id']), usr_id.get(s['para_id'])
    if not iid or not de or not para:
        continue
    sid = novo_id()
    sol_id[s['id']] = sid
    tipo = TIPO_SOL.get(str(s['tipo']).strip().lower(), 'informacao')
    out.append(
        "insert into public.solicitacoes (id, item_id, de_id, para_id, tipo, texto_html, status, criado_em, respondido_em) values ("
        f"'{sid}', '{iid}', '{de}', '{para}', '{tipo}', {sql_str(s['texto_html'])}, "
        f"'{STATUS_SOL.get(str(s['status']).strip().lower(), 'pendente')}', {sql_ts(s['criado_em'])}, {sql_ts(s['resolvido_em'])});"
    )

# ---------------------------------------------------------------- mensagens
for m in linhas('Mensagens'):
    sid, autor = sol_id.get(m['solicitacao_id']), usr_id.get(m['autor_id'])
    if not sid or not autor:
        continue
    out.append(
        "insert into public.solicitacao_mensagens (solicitacao_id, autor_id, texto_html, criado_em) values ("
        f"'{sid}', '{autor}', {sql_str(m['texto_html'])}, {sql_ts(m['criado_em'])});"
    )

# ---------------------------------------------------------------- comentários
RE_MENCAO = re.compile(r'data-uid="(USR-[0-9a-zA-Z-]+)"')
for c in linhas('Comentários'):
    iid, autor = item_id.get(c['item_id']), usr_id.get(c['autor_id'])
    if not iid or not autor:
        continue
    cid = novo_id()
    texto = c['texto_html'] or ''
    texto = RE_MENCAO.sub(lambda m: f'data-uid="{usr_id[m.group(1)]}"' if m.group(1) in usr_id else m.group(0), texto)
    out.append(
        "insert into public.comentarios (id, item_id, autor_id, texto_html, criado_em, editado_em) values ("
        f"'{cid}', '{iid}', '{autor}', {sql_str(texto)}, {sql_ts(c['criado_em'])}, {sql_ts(c['editado_em'])});"
    )
    if c['mencoes']:
        for legacy in str(c['mencoes']).split(','):
            pid = usr_id.get(legacy.strip())
            if pid:
                out.append(f"insert into public.mencoes (comentario_id, perfil_id) values ('{cid}', '{pid}');")

# ---------------------------------------------------------------- histórico (só o que tem equivalente real no v2)
CAMPOS_ITENS = {'status', 'prioridade', 'prazo', 'nome', 'descricao_html', 'motivo_bloqueio_html'}
CAMPOS_SOLICITACOES = {'status'}
TABELA = {'ITENS': 'itens', 'SOLICITACOES': 'solicitacoes', 'USUARIOS': 'perfis'}
TRADUZ_VALOR = {**STATUS, **PRIORIDADE}


def traduz(v):
    return (TRADUZ_VALOR.get(str(v).strip().lower()) or v) if v is not None else None


n_historico = 0
for h in linhas('Histórico'):
    tabela = TABELA.get(h['entidade'])
    acao = {'criar': 'insert', 'atualizar': 'update'}.get(h['acao'])
    if not tabela or not acao:
        continue
    campo = h['campo']
    if tabela == 'itens':
        if campo is not None and campo not in CAMPOS_ITENS:
            continue
        rid = item_id.get(h['entidade_id'])
    elif tabela == 'solicitacoes':
        if campo is not None and campo not in CAMPOS_SOLICITACOES:
            continue
        rid = sol_id.get(h['entidade_id'])
    else:
        rid = usr_id.get(h['entidade_id'])
    if not rid:
        continue
    ator = ator_por_email(h['usuario_email'])
    out.append(
        "insert into public.historico (tabela, registro_id, perfil_id, acao, campo, valor_antes, valor_depois, criado_em) values ("
        f"{sql_str(tabela)}, '{rid}', {sql_str(ator) if ator else 'null'}, {sql_str(acao)}, "
        f"{sql_str(campo)}, {sql_str(traduz(h['de']))}, {sql_str(traduz(h['para']))}, {sql_ts(h['quando'])});"
    )
    n_historico += 1

out.append('commit;')

with open(SAIDA, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f'setores={len(setor_id)} usuarios={len(usuarios)} itens_ativos={len(itens_ativos)} historico={n_historico}')
print(f'SQL gerado: {SAIDA} ({len(out)} comandos)')
