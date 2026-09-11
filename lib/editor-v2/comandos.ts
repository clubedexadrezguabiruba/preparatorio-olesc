import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import { quadroDoNo } from "./arvore.ts";
import type { AulaV2, NoV2 } from "./modelo.ts";

export type ComandoV2 =
  | { tipo: "RENOMEAR_CAPITULO"; capituloId: string; titulo: string }
  | { tipo: "EDITAR_COMENTARIO"; analiseId: string; nodeId: string; comentario: string }
  | { tipo: "ALTERNAR_NAG"; analiseId: string; nodeId: string; nag: number }
  | { tipo: "ADICIONAR_LANCE"; analiseId: string; nodeId: string; uci: string; novoNodeId: string }
  | { tipo: "PROMOVER_VARIANTE"; analiseId: string; parentId: string; nodeId: string }
  | { tipo: "EXCLUIR_RAMO"; analiseId: string; parentId: string; nodeId: string };

export function executarComando(aula: AulaV2, comando: ComandoV2, positions: Record<string, Position>): AulaV2 {
  if (comando.tipo === "RENOMEAR_CAPITULO") {
    return { ...aula, capitulos: aula.capitulos.map((c) => c.id === comando.capituloId ? { ...c, titulo: comando.titulo.trim() || c.titulo } : c) };
  }
  const indice = aula.analises.findIndex((a) => a.id === comando.analiseId);
  if (indice < 0) throw new Error("análise inexistente");
  const analise = aula.analises[indice];
  const alvoId = comando.tipo === "PROMOVER_VARIANTE" || comando.tipo === "EXCLUIR_RAMO"
    ? comando.parentId
    : comando.nodeId;
  const no = analise.nos[alvoId];
  if (!no) throw new Error("nó inexistente");
  let proxima = analise;

  if (comando.tipo === "EDITAR_COMENTARIO") {
    const comentario = comando.comentario.trim();
    const editado: NoV2 = { ...no };
    if (comentario) editado.comentario = comentario; else delete editado.comentario;
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: editado } };
  }
  if (comando.tipo === "ALTERNAR_NAG") {
    const nags = no.nags?.includes(comando.nag) ? no.nags.filter((n) => n !== comando.nag) : [...(no.nags ?? []), comando.nag];
    const editado: NoV2 = { ...no };
    if (nags.length) editado.nags = nags; else delete editado.nags;
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: editado } };
  }
  if (comando.tipo === "ADICIONAR_LANCE") {
    if (analise.nos[comando.novoNodeId]) throw new Error("o id do novo nó já existe");
    const fen = quadroDoNo(aula, analise.id, no.id, positions).fen;
    const game = new Chess(fen);
    try { game.move({ from: comando.uci.slice(0, 2), to: comando.uci.slice(2, 4), promotion: comando.uci.slice(4) || undefined }); }
    catch { throw new Error("esse lance não é legal nesta posição"); }
    const existente = no.filhos.find((filho) => analise.nos[filho]?.uci === comando.uci);
    if (existente) return aula;
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: { ...no, filhos: [...no.filhos, comando.novoNodeId] }, [comando.novoNodeId]: { id: comando.novoNodeId, uci: comando.uci, filhos: [] } } };
  }
  if (comando.tipo === "PROMOVER_VARIANTE") {
    if (!no.filhos.includes(comando.nodeId)) throw new Error("a variante não pertence a esta posição");
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: { ...no, filhos: [comando.nodeId, ...no.filhos.filter((id) => id !== comando.nodeId)] } } };
  }
  if (comando.tipo === "EXCLUIR_RAMO") {
    if (!no.filhos.includes(comando.nodeId)) throw new Error("o ramo não pertence a esta posição");
    const remover = new Set<string>();
    const colher = (id: string) => { if (remover.has(id)) return; remover.add(id); analise.nos[id]?.filhos.forEach(colher); };
    colher(comando.nodeId);
    const nos = Object.fromEntries(Object.entries(analise.nos).filter(([id]) => !remover.has(id)));
    nos[no.id] = { ...no, filhos: no.filhos.filter((id) => id !== comando.nodeId) };
    proxima = { ...analise, nos };
  }
  return { ...aula, analises: aula.analises.map((a, i) => i === indice ? proxima : a) };
}

export type Historico<T> = { presente: T; passados: T[]; futuros: T[] };
export const iniciarHistorico = <T>(presente: T): Historico<T> => ({ presente, passados: [], futuros: [] });
export function aplicarNoHistorico<T>(h: Historico<T>, proximo: T): Historico<T> {
  return proximo === h.presente ? h : { presente: proximo, passados: [...h.passados, h.presente], futuros: [] };
}
export function desfazer<T>(h: Historico<T>): Historico<T> {
  const anterior = h.passados.at(-1); if (anterior === undefined) return h;
  return { presente: anterior, passados: h.passados.slice(0, -1), futuros: [h.presente, ...h.futuros] };
}
export function refazer<T>(h: Historico<T>): Historico<T> {
  const proximo = h.futuros[0]; if (proximo === undefined) return h;
  return { presente: proximo, passados: [...h.passados, h.presente], futuros: h.futuros.slice(1) };
}
