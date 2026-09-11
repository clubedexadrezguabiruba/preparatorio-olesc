import { validarAulaV2, type AulaV2 } from "./modelo.ts";

const BANCO = "preparatorio-editor-v2";
const LOJA = "recuperacao";

type Recuperacao = { aula: AulaV2; baseHash: string; em: string };
const chave = (id: string, sessaoId: string) => `${id}:${sessaoId}`;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA);
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export async function guardarRecuperacao(id: string, sessaoId: string, aula: AulaV2, baseHash: string): Promise<void> {
  const banco = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = banco.transaction(LOJA, "readwrite");
    tx.objectStore(LOJA).put({ aula, baseHash, em: new Date().toISOString() } satisfies Recuperacao, chave(id, sessaoId));
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  banco.close();
}

export async function lerRecuperacao(id: string, sessaoId: string): Promise<Recuperacao | null> {
  const banco = await abrir();
  const valor = await new Promise<unknown>((resolve, reject) => {
    const tx = banco.transaction(LOJA, "readonly");
    const pedido = tx.objectStore(LOJA).get(chave(id, sessaoId));
    pedido.onsuccess = () => resolve(pedido.result); pedido.onerror = () => reject(pedido.error);
  });
  banco.close();
  if (!valor || typeof valor !== "object") return null;
  const r = valor as Partial<Recuperacao>;
  const valida = validarAulaV2(r.aula);
  return valida.ok && typeof r.baseHash === "string" && typeof r.em === "string" ? { aula: valida.aula, baseHash: r.baseHash, em: r.em } : null;
}

export async function apagarRecuperacao(id: string, sessaoId: string): Promise<void> {
  const banco = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = banco.transaction(LOJA, "readwrite"); tx.objectStore(LOJA).delete(chave(id, sessaoId));
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  banco.close();
}
