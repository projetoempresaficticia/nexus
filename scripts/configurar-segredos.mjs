// Grava os segredos do Nexus no GitHub (Actions: backup) e no Supabase (Edge Functions) a partir de um
// arquivo FORA do repositório (padrão: C:\Users\devel\nexus-segredos\segredos.json — modelo e passo a passo
// em docs/DEPLOY.md). Nunca mostra valores: só os nomes gravados e os que faltam.
// Uso:  node scripts/configurar-segredos.mjs [caminho/segredos.json]
// Com e-mail completo (SMTP_USUARIO, SMTP_SENHA_APP, APP_URL), também liga os agendamentos do banco
// (supabase/agendamentos.sql) com o mesmo NOTIFICACOES_SEGREDO.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

const ARQUIVO = resolve(process.argv[2] ?? 'C:/Users/devel/nexus-segredos/segredos.json');

function falhar(mensagem) {
  console.error(`configurar-segredos: ${mensagem}`);
  process.exit(1);
}

if (resolve(ARQUIVO).toLowerCase().startsWith(resolve('.').toLowerCase())) {
  falhar('o arquivo de segredos não pode ficar dentro da pasta do projeto.');
}
if (!existsSync(ARQUIVO)) falhar(`não encontrei ${ARQUIVO}`);
const dados = JSON.parse(readFileSync(ARQUIVO, 'utf8'));

const ref = readFileSync('supabase/.temp/project-ref', 'utf8').trim();
const repo = execFileSync(
  'gh',
  ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
  {
    encoding: 'utf8',
  },
).trim();

/** @type {{ nome: string, valor: string, destinos: string[] }[]} */
const lista = [];
for (const [nome, s] of Object.entries(dados.segredos ?? {})) {
  lista.push({ nome, valor: String(s.valor ?? '').trim(), destinos: s.destinos ?? [] });
}
const conta = dados.conta_servico_google;
if (conta?.arquivo && existsSync(conta.arquivo)) {
  const json = JSON.parse(readFileSync(conta.arquivo, 'utf8'));
  if (!json.client_email || !json.private_key)
    falhar('o JSON da conta de serviço não parece válido.');
  for (const d of conta.destinos) {
    const [destino, nome] = d.split(':');
    lista.push({ nome, valor: JSON.stringify(json), destinos: [destino] });
  }
} else {
  lista.push({ nome: 'GDRIVE_SERVICE_ACCOUNT_JSON', valor: '', destinos: ['github', 'supabase'] });
}

const valor = (nome) => lista.find((s) => s.nome === nome)?.valor ?? '';
const emailCompleto = ['SMTP_USUARIO', 'SMTP_SENHA_APP', 'APP_URL'].every((n) => valor(n));
if (emailCompleto) lista.push({ nome: 'EMAIL_PROVEDOR', valor: 'smtp', destinos: ['supabase'] });

const prontos = lista.filter((s) => s.valor);
const faltam = [...new Set(lista.filter((s) => !s.valor).map((s) => s.nome))];

console.log(`GitHub: ${repo} · Supabase: ${ref}`);
console.log(`Vou gravar: ${[...new Set(prontos.map((s) => s.nome))].join(', ') || '(nada)'}`);
if (faltam.length) console.log(`Ainda vazios (ficam para depois): ${faltam.join(', ')}`);
const rl = createInterface({ input: process.stdin, output: process.stdout });
const resposta = await rl.question('Confirmar? (s/N) ');
rl.close();
if (resposta.trim().toLowerCase() !== 's') falhar('cancelado.');

// GitHub: o valor vai pela entrada padrão (não aparece na linha de comando)
for (const s of prontos.filter((x) => x.destinos.includes('github'))) {
  execFileSync('gh', ['secret', 'set', s.nome, '--repo', repo], {
    input: s.valor,
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  console.log(`  GitHub   ✓ ${s.nome}`);
}

// Supabase: arquivo .env temporário com aspas simples (valor literal), apagado logo a seguir
const paraSupabase = prontos.filter((x) => x.destinos.includes('supabase'));
if (paraSupabase.length) {
  if (paraSupabase.some((s) => s.valor.includes("'") || s.valor.includes('\n'))) {
    falhar('um valor tem aspas simples ou quebra de linha; corrija o arquivo.');
  }
  const env = join(tmpdir(), `nexus-${randomBytes(6).toString('hex')}.env`);
  writeFileSync(env, paraSupabase.map((s) => `${s.nome}='${s.valor}'`).join('\n') + '\n', {
    mode: 0o600,
  });
  try {
    execFileSync('npx', ['supabase', 'secrets', 'set', '--env-file', env, '--project-ref', ref], {
      stdio: ['ignore', 'ignore', 'inherit'],
      shell: process.platform === 'win32',
    });
  } finally {
    rmSync(env, { force: true });
  }
  for (const s of paraSupabase) console.log(`  Supabase ✓ ${s.nome}`);
}

// Agendamentos (e-mails a cada 2 min e lembrete das 8h), só com o e-mail completo
if (emailCompleto && valor('NOTIFICACOES_SEGREDO')) {
  const modelo = readFileSync('supabase/agendamentos.sql', 'utf8')
    .replace('<ref-do-projeto>', ref)
    .replace('<mesmo valor de NOTIFICACOES_SEGREDO>', valor('NOTIFICACOES_SEGREDO'));
  const sql = join(tmpdir(), `nexus-${randomBytes(6).toString('hex')}.sql`);
  writeFileSync(
    sql,
    "delete from vault.secrets where name in ('nexus_url_notificacoes', 'nexus_segredo_notificacoes');\n" +
      modelo,
    { mode: 0o600 },
  );
  try {
    execFileSync('npx', ['supabase', 'db', 'query', '--linked', '-f', sql], {
      stdio: ['ignore', 'ignore', 'inherit'],
      shell: process.platform === 'win32',
    });
  } finally {
    rmSync(sql, { force: true });
  }
  console.log('  Agendamentos de e-mail ligados no banco ✓');
}
console.log('Pronto.');
