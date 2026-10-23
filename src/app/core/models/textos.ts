// Textos da interface (PT-BR) — fonte única, conforme docs/GLOSSARIO_UI.md. Não espalhe textos pelos templates.

export const TEXTOS = {
  marca: 'Gerenciador de Tarefas',
  login: {
    destaque: 'Projetos, tarefas e subtarefas num só lugar.',
    descricao:
      'Acompanhe o que está andando, o que está parado e de quem depende, mesmo quando é outro setor.',
    rodape: 'Prepara Portugal · uso interno',
    titulo: 'Entrar',
    subtitulo: 'Entre com a sua conta Google da empresa.',
    entrarGoogle: 'Entrar com Google',
    aviso: 'Acesso restrito ao domínio da empresa. Os usuários são cadastrados pelo administrador.',
    senhaTitulo: 'Desenvolvimento · entrar com e-mail',
    senhaAjuda: 'Só neste ambiente. Use um e-mail cadastrado; na primeira vez, crie a senha.',
    email: 'E-mail',
    senha: 'Senha',
    entrar: 'Entrar',
    criarSenha: 'Criar senha',
    senhaInvalida: 'E-mail ou senha incorretos.',
    contaCriada: 'Conta criada. Se pedir confirmação, verifique o seu e-mail.',
  },
  semAcesso: {
    titulo: 'Acesso não autorizado',
    comEmail: (email: string) =>
      `Acesso não autorizado. Sua conta (${email}) não está cadastrada ou está inativa. Fale com um administrador do sistema.`,
    semEmail:
      'Acesso não autorizado. Sua conta não está cadastrada ou está inativa. Fale com um administrador do sistema.',
    voltar: 'Voltar ao início',
  },
  sair: 'Sair',
  erros: {
    sem_permissao: 'Você não tem permissão para fazer isto.',
    nao_encontrado: 'Não encontramos este item. Ele pode ter sido excluído.',
    motivo_obrigatorio: 'Conte o motivo do bloqueio para a equipe entender.',
    aprovador_obrigatorio: 'Escolha quem vai aprovar.',
    nivel_invalido: 'Não é possível criar um item neste nível.',
    ciclo_dependencia: 'Essa dependência criaria um ciclo.',
    ciclo_setor: 'Um setor não pode ficar dentro de si mesmo.',
    ja_respondida: 'Esta solicitação já foi respondida.',
    resposta_invalida: 'Essa resposta não vale para este tipo de solicitação.',
    arquivo_grande: 'O arquivo passa de 20 MB. Cole um link do Drive em vez de enviar.',
    setor_obrigatorio: 'Escolha o setor da tarefa.',
    responsavel_fora_do_setor: 'Essa pessoa não faz parte do setor deste item.',
    rede: 'Não foi possível salvar. Verifique a internet e tente de novo.',
  },
} as const;

export type CodigoErro = keyof typeof TEXTOS.erros;

/** Traduz o código devolvido pela API (API.md §Erros) no texto para a pessoa. */
export function textoErro(codigo: string | null | undefined): string {
  const erros: Record<string, string> = TEXTOS.erros;
  return (codigo && erros[codigo]) || TEXTOS.erros.rede;
}
