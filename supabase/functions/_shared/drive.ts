// Google Drive pela API REST com a conta de serviço (T-52): anexos ficam num Drive partilhado, numa
// pasta por setor, e o Nexus guarda só o link. Sem Deno nem npm: aqui — o Vitest testa este módulo.
// A conta de serviço precisa de ser "Gestor de conteúdo" do Drive partilhado (DEPLOY.md).

export interface ContaServico {
  client_email: string;
  private_key: string;
}

export interface ConfigDrive {
  conta: ContaServico;
  /** Pasta (no Drive partilhado) onde ficam as pastas dos setores. */
  raiz: string;
  /** Domínio que pode abrir os arquivos pelo link (ex.: estudeemportugal.org). */
  dominio: string;
}

export interface ArquivoDrive {
  id: string;
  link: string;
}

type Buscar = typeof fetch;

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const TOKEN = 'https://oauth2.googleapis.com/token';
const ESCOPO = 'https://www.googleapis.com/auth/drive';
const PASTA = 'application/vnd.google-apps.folder';

/** Lê o JSON da conta de serviço; null se faltar algo (Drive desligado). */
export function lerConfig(
  json: string | undefined,
  raiz: string | undefined,
  dominio: string | undefined,
): ConfigDrive | null {
  if (!json || !raiz) return null;
  try {
    const conta = JSON.parse(json) as Partial<ContaServico>;
    if (!conta.client_email || !conta.private_key) return null;
    return {
      conta: { client_email: conta.client_email, private_key: conta.private_key },
      raiz,
      dominio: dominio || 'estudeemportugal.org',
    };
  } catch {
    return null;
  }
}

function base64url(dados: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof dados === 'string' ? new TextEncoder().encode(dados) : new Uint8Array(dados);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemParaDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** JWT RS256 que a Google troca por um token de acesso (válido 1 h). */
export async function assinarJwt(conta: ContaServico, agora = Date.now()): Promise<string> {
  const iat = Math.floor(agora / 1000);
  const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = base64url(
    JSON.stringify({ iss: conta.client_email, scope: ESCOPO, aud: TOKEN, iat, exp: iat + 3600 }),
  );
  const chave = await crypto.subtle.importKey(
    'pkcs8',
    pemParaDer(conta.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const assinatura = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    chave,
    new TextEncoder().encode(`${cabecalho}.${corpo}`),
  );
  return `${cabecalho}.${corpo}.${base64url(assinatura)}`;
}

/** Valor entre aspas simples na consulta do Drive (q=…). */
export function textoConsulta(valor: string): string {
  return `'${valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Consulta da pasta do setor: marcada com appProperties, para o nome do setor poder mudar. */
export function consultaPastaSetor(raiz: string, setorId: string): string {
  return [
    `${textoConsulta(raiz)} in parents`,
    `mimeType = '${PASTA}'`,
    `appProperties has { key='nexus_setor_id' and value=${textoConsulta(setorId)} }`,
    'trashed = false',
  ].join(' and ');
}

export class Drive {
  private constructor(
    private readonly config: ConfigDrive,
    private readonly token: string,
    private readonly buscar: Buscar,
  ) {}

  static async conectar(config: ConfigDrive, buscar: Buscar = fetch): Promise<Drive> {
    const resp = await buscar(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await assinarJwt(config.conta),
      }),
    });
    if (!resp.ok) throw new Error(`drive_token_${resp.status}`);
    const { access_token } = (await resp.json()) as { access_token: string };
    return new Drive(config, access_token, buscar);
  }

  private async pedir(url: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.token}`);
    return this.buscar(url, { ...init, headers });
  }

  private async pedirJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const resp = await this.pedir(url, init);
    if (!resp.ok) throw new Error(`drive_${resp.status}`);
    return (await resp.json()) as T;
  }

  /** Pasta do setor dentro da raiz; cria na primeira vez (o nome é o do setor nesse momento). */
  async pastaDoSetor(setorId: string, nomeSetor: string): Promise<string> {
    const q = new URLSearchParams({
      q: consultaPastaSetor(this.config.raiz, setorId),
      fields: 'files(id)',
      pageSize: '1',
      corpora: 'allDrives',
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
    });
    const achadas = await this.pedirJson<{ files: { id: string }[] }>(`${API}/files?${q}`);
    if (achadas.files[0]) return achadas.files[0].id;
    const nova = await this.pedirJson<{ id: string }>(
      `${API}/files?supportsAllDrives=true&fields=id`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nomeSetor,
          mimeType: PASTA,
          parents: [this.config.raiz],
          appProperties: { nexus_setor_id: setorId },
        }),
      },
    );
    return nova.id;
  }

  /** Envio "resumable" (serve para qualquer tamanho): abre a sessão e manda os bytes de uma vez. */
  async enviar(arquivo: {
    pasta: string;
    nome: string;
    mime: string;
    bytes: Uint8Array<ArrayBuffer>;
    descricao: string;
    propriedades: Record<string, string>;
  }): Promise<ArquivoDrive> {
    const sessao = await this.pedir(
      `${UPLOAD}/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': arquivo.mime,
          'X-Upload-Content-Length': String(arquivo.bytes.byteLength),
        },
        body: JSON.stringify({
          name: arquivo.nome,
          parents: [arquivo.pasta],
          description: arquivo.descricao,
          appProperties: arquivo.propriedades,
        }),
      },
    );
    const destino = sessao.headers.get('Location');
    if (!sessao.ok || !destino) throw new Error(`drive_${sessao.status}`);
    const enviado = await this.pedirJson<{ id: string; webViewLink?: string }>(destino, {
      method: 'PUT',
      headers: { 'Content-Type': arquivo.mime },
      body: arquivo.bytes,
    });
    return {
      id: enviado.id,
      link: enviado.webViewLink ?? `https://drive.google.com/file/d/${enviado.id}/view`,
    };
  }

  /** Quem é do domínio abre pelo link (não aparece na busca de quem não tem o link). */
  async compartilharComDominio(id: string): Promise<void> {
    await this.pedirJson(`${API}/files/${encodeURIComponent(id)}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'domain',
        role: 'reader',
        domain: this.config.dominio,
        allowFileDiscovery: false,
      }),
    });
  }

  /** Manda para a lixeira do Drive (recuperável por 30 dias). Arquivo que já não existe conta como feito. */
  async lixeira(id: string): Promise<void> {
    const resp = await this.pedir(`${API}/files/${encodeURIComponent(id)}?supportsAllDrives=true`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });
    if (!resp.ok && resp.status !== 404) throw new Error(`drive_${resp.status}`);
  }
}
