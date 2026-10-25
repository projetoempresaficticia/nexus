import { STATUS_SOLICITACAO, TIPO_SOLICITACAO, TipoSolicitacao } from '../../core/models/rotulos';

/** O que uma notificação precisa para montar a frase (mesmo "dados" que o e-mail usa — API.md). */
export interface DadosNotificacao {
  tipo:
    | 'boas_vindas'
    | 'atribuicao'
    | 'mencao'
    | 'comentario'
    | 'solicitacao_recebida'
    | 'solicitacao_respondida'
    | 'lembrete_prazo';
  dados: Record<string, unknown>;
  autorNome: string | null;
}

/** "nome" entre aspas; vazio quando falta (nunca deveria, mas um texto errado não pode quebrar o sino). */
function item(dados: Record<string, unknown>): string {
  const nome = dados['nome'];
  return typeof nome === 'string' && nome ? `"${nome}"` : 'um item';
}

/**
 * Linha curta do sino para cada notificação (GLOSSARIO_UI.md §E-mails automáticos — mesmo tom, sem o
 * trecho citado: aqui é só a lista, o link abre o item). Alguém sem conta ainda = autorNome null.
 */
export function resumoNotificacao(n: DadosNotificacao): string {
  const autor = n.autorNome ?? 'Alguém';
  switch (n.tipo) {
    case 'boas_vindas':
      return 'Bem-vindo(a) ao Nexus!';
    case 'atribuicao':
      return `${autor} incluiu você como responsável em ${item(n.dados)}.`;
    case 'mencao':
      return `${autor} mencionou você em ${item(n.dados)}.`;
    case 'comentario':
      return `${autor} comentou em ${item(n.dados)}.`;
    case 'solicitacao_recebida': {
      const tipo = n.dados['tipo'] as TipoSolicitacao | undefined;
      const rotulo = tipo ? TIPO_SOLICITACAO[tipo].texto : 'uma solicitação';
      return `${autor} precisa de você: ${rotulo} em ${item(n.dados)}.`;
    }
    case 'solicitacao_respondida': {
      const resultado = n.dados['resultado'] as 'resolvida' | 'aprovada' | 'recusada' | undefined;
      const rotulo = resultado ? STATUS_SOLICITACAO[resultado].texto.toLowerCase() : 'respondida';
      return `Sua solicitação em ${item(n.dados)} foi ${rotulo}.`;
    }
    case 'lembrete_prazo':
      return `${item(n.dados)} vence amanhã.`;
  }
}
