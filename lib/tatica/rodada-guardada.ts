import type { Armazem } from "./rating-guardada.ts";

export type RespostaPendente = {
  puzzleId: string;
  origem: string;
  lances: string[];
  tempoMs: number;
};
const chave = (rodada: string) => `tatica:rodada:${rodada}:respostas`;

export function respostasPendentes(armazem: Armazem | null, rodada: string): RespostaPendente[] {
  try {
    const valor: unknown = JSON.parse(armazem?.getItem(chave(rodada)) ?? "[]");
    if (!Array.isArray(valor)) return [];
    return valor.filter((r): r is RespostaPendente => r !== null && typeof r === "object" &&
      typeof r.puzzleId === "string" && typeof r.origem === "string" &&
      typeof r.tempoMs === "number" && Array.isArray(r.lances) && r.lances.every((l: unknown) => typeof l === "string"));
  } catch { return []; }
}

export function guardarRespostaDaRodada(armazem: Armazem | null, rodada: string, resposta: RespostaPendente): void {
  try {
    const fila = respostasPendentes(armazem, rodada);
    if (!fila.some((r) => r.puzzleId === resposta.puzzleId)) fila.push(resposta);
    armazem?.setItem(chave(rodada), JSON.stringify(fila));
  } catch { /* Sem armazenamento disponível, a confirmação do servidor ainda é obrigatória. */ }
}

export function esquecerRespostaDaRodada(armazem: Armazem | null, rodada: string, puzzleId: string): void {
  try {
    const fila = respostasPendentes(armazem, rodada).filter((r) => r.puzzleId !== puzzleId);
    if (fila.length) armazem?.setItem(chave(rodada), JSON.stringify(fila));
    else armazem?.removeItem(chave(rodada));
  } catch { /* A chave única no servidor absorve um reenvio após falha de limpeza. */ }
}
