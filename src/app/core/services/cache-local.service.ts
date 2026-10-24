import { Injectable } from '@angular/core';

const BANCO = 'nexus-cache';
const TABELA = 'retratos';
/** Mude quando o formato dos retratos mudar: os antigos deixam de ser lidos. */
const VERSAO = 1;

/**
 * Retratos das stores em IndexedDB para a primeira pintura ser imediata (ARQUITETURA.md — "Primeira pintura imediata").
 * Chave por usuário; apagado no logout. Sem IndexedDB (navegação privada antiga, testes) vira no-op.
 */
@Injectable({ providedIn: 'root' })
export class CacheLocalService {
  private dono: string | null = null;
  private banco: Promise<IDBDatabase | null> | null = null;
  private readonly agendados = new Map<string, ReturnType<typeof setTimeout>>();

  /** Quem está logado (auth.users.id); `null` desliga leitura e gravação. */
  definirDono(id: string | null): void {
    this.dono = id;
  }

  async ler<T>(nome: string): Promise<T | null> {
    const chave = this.chave(nome);
    const banco = chave ? await this.abrir() : null;
    if (!banco || !chave) return null;
    return this.pedir<T | undefined>(banco, 'readonly', (t) => t.get(chave)).then((v) => v ?? null);
  }

  async gravar(nome: string, valor: unknown): Promise<void> {
    const chave = this.chave(nome);
    const banco = chave ? await this.abrir() : null;
    if (!banco || !chave) return;
    await this.pedir(banco, 'readwrite', (t) => t.put(valor, chave));
  }

  /** Grava daqui a pouco, juntando mudanças seguidas numa só escrita. */
  agendar(nome: string, valor: unknown, ms = 1000): void {
    clearTimeout(this.agendados.get(nome));
    this.agendados.set(
      nome,
      setTimeout(() => {
        this.agendados.delete(nome);
        void this.gravar(nome, valor);
      }, ms),
    );
  }

  /** Logout: apaga os retratos de todos os usuários deste navegador. */
  async limpar(): Promise<void> {
    this.agendados.forEach((t) => clearTimeout(t));
    this.agendados.clear();
    const banco = await this.abrir();
    if (banco) await this.pedir(banco, 'readwrite', (t) => t.clear());
  }

  private chave(nome: string): string | null {
    return this.dono ? `${VERSAO}:${this.dono}:${nome}` : null;
  }

  private abrir(): Promise<IDBDatabase | null> {
    this.banco ??= new Promise((resolve) => {
      try {
        const pedido = indexedDB.open(BANCO, 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore(TABELA);
        pedido.onsuccess = () => resolve(pedido.result);
        pedido.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.banco;
  }

  /** Erros do IndexedDB não quebram a tela: o retrato é só um atalho. */
  private pedir<T>(
    banco: IDBDatabase,
    modo: IDBTransactionMode,
    fazer: (t: IDBObjectStore) => IDBRequest,
  ): Promise<T | null> {
    return new Promise((resolve) => {
      try {
        const pedido = fazer(banco.transaction(TABELA, modo).objectStore(TABELA));
        pedido.onsuccess = () => resolve(pedido.result as T);
        pedido.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
}
