import { assinarJwt, consultaPastaSetor, Drive, lerConfig } from './drive';

async function contaDeTeste() {
  const par = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', par.privateKey));
  let bin = '';
  for (const b of der) bin += String.fromCharCode(b);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(bin).replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----\n`;
  return { conta: { client_email: 'nexus@projeto.iam.gserviceaccount.com', private_key: pem }, par };
}

const decodificar = (parte: string) =>
  JSON.parse(atob(parte.replace(/-/g, '+').replace(/_/g, '/')));

describe('Drive (T-52)', () => {
  it('config: sem JSON ou pasta fica desligado; domínio padrão da empresa', () => {
    expect(lerConfig(undefined, 'raiz', undefined)).toBeNull();
    expect(lerConfig('{"client_email":"a"}', 'raiz', undefined)).toBeNull();
    expect(lerConfig('não é json', 'raiz', undefined)).toBeNull();
    const ok = lerConfig('{"client_email":"a","private_key":"k"}', 'raiz', undefined);
    expect(ok?.dominio).toBe('estudeemportugal.org');
  });

  it('JWT da conta de serviço assinado com RS256 e válido por 1 h', async () => {
    const { conta, par } = await contaDeTeste();
    const jwt = await assinarJwt(conta, 1_700_000_000_000);
    const [cabecalho, corpo, assinatura] = jwt.split('.');
    expect(decodificar(cabecalho)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decodificar(corpo)).toMatchObject({
      iss: conta.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
    const bytes = Uint8Array.from(
      atob(assinatura.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const valido = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      par.publicKey,
      bytes,
      new TextEncoder().encode(`${cabecalho}.${corpo}`),
    );
    expect(valido).toBe(true);
  });

  it('consulta da pasta do setor escapa aspas', () => {
    const q = consultaPastaSetor("r'1", 'setor-1');
    expect(q).toContain("'r\\'1' in parents");
    expect(q).toContain("appProperties has { key='nexus_setor_id' and value='setor-1' }");
    expect(q).toContain('trashed = false');
  });

  it('cria a pasta do setor, envia o arquivo e ignora 404 na lixeira', async () => {
    const { conta } = await contaDeTeste();
    const pedidos: { url: string; metodo: string; corpo: unknown }[] = [];
    const buscar = vi.fn(async (url: string, init: RequestInit = {}) => {
      pedidos.push({ url, metodo: init.method ?? 'GET', corpo: init.body });
      if (url.includes('oauth2')) return Response.json({ access_token: 'tk' });
      if (url.includes('/files?q=')) return Response.json({ files: [] });
      if (url.includes('uploadType=resumable')) {
        return new Response(null, { status: 200, headers: { Location: 'https://up/sessao' } });
      }
      if (url === 'https://up/sessao') return Response.json({ id: 'f1', webViewLink: 'https://l/f1' });
      if (url.includes('/files/sumiu')) return new Response(null, { status: 404 });
      if (url.includes('/files?supportsAllDrives')) return Response.json({ id: 'pasta1' });
      return new Response(null, { status: 500 });
    });
    const drive = await Drive.conectar(
      { conta, raiz: 'raiz', dominio: 'estudeemportugal.org' },
      buscar as unknown as typeof fetch,
    );
    const pasta = await drive.pastaDoSetor('s1', 'Pedagógico');
    expect(pasta).toBe('pasta1');
    const criada = JSON.parse(pedidos.at(-1)!.corpo as string);
    expect(criada).toMatchObject({ name: 'Pedagógico', parents: ['raiz'] });
    expect(criada.appProperties).toEqual({ nexus_setor_id: 's1' });

    const arq = await drive.enviar({
      pasta,
      nome: 'a.pdf',
      mime: 'application/pdf',
      bytes: new Uint8Array([1, 2, 3]),
      descricao: 'd',
      propriedades: { nexus_anexo: '1' },
    });
    expect(arq).toEqual({ id: 'f1', link: 'https://l/f1' });
    expect(pedidos.at(-1)!.metodo).toBe('PUT');

    await expect(drive.lixeira('sumiu')).resolves.toBeUndefined();
    await expect(drive.compartilharComDominio('x')).rejects.toThrow('drive_500');
  });
});
