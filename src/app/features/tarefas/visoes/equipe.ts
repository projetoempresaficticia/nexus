import { Pessoa } from '../../../core/models/acesso.model';
import { Item } from '../../../core/models/item.model';

/** Peças comuns das visões do líder (Por pessoa, Carga de trabalho). */

/** Setores da pessoa entre os que eu administro, ou "Adm por hierarquia". */
export function setoresDaPessoa(
  p: Pessoa,
  administrados: ReadonlySet<string>,
  nomeSetor: (id: string) => string,
  semVinculo: string,
): string {
  const nomes = p.vinculos
    .filter((v) => administrados.has(v.setor_id))
    .map((v) => nomeSetor(v.setor_id));
  return nomes.length ? nomes.join(', ') : semVinculo;
}

export function estaAtrasado(i: Item, hoje: string): boolean {
  return i.status !== 'concluida' && (i.atrasado || (!!i.prazo && i.prazo < hoje));
}

export function estaParado(i: Item): boolean {
  return i.status === 'bloqueada' || i.status === 'aguardando_aprovacao';
}
