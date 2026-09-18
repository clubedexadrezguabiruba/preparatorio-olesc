import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { puzzlePorId } from "./banco.ts";
import type { PuzzleServido } from "./puzzles.ts";
import { pendentesDaRodada, type ItemDaRodada, type RespostaDaRodada } from "./rodada.ts";
import type { Etapa } from "./serie.ts";

export type Rodada = {
  id: string;
  aluno: string;
  chave: string;
  numero: number;
  modo: Etapa | "prova-de-nivel";
  tema: string | null;
  puzzles: ItemDaRodada[];
  respostas: RespostaDaRodada[];
};

/** Admin sempre limitado ao aluno autenticado pelo chamador. */
export async function lerRodada(aluno: string, id: string): Promise<Rodada | null> {
  const db = criarClienteAdmin();
  const { data, error } = await db.from("tatica_rodadas").select("*").eq("aluno", aluno).eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível ler a rodada de tática.");
  if (!data) return null;
  const { data: respostas, error: falha } = await db.from("tentativas_puzzle")
    .select("puzzle_id, acertou").eq("aluno", aluno).eq("rodada_id", id);
  if (falha) throw new Error("Não foi possível ler as respostas da rodada.");
  return { ...data, respostas: respostas ?? [] } as Rodada;
}

export async function ultimaRodada(aluno: string, chave: string): Promise<Rodada | null> {
  const { data, error } = await criarClienteAdmin().from("tatica_rodadas").select("id")
    .eq("aluno", aluno).eq("chave", chave).order("numero", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Não foi possível retomar a rodada de tática.");
  return data ? lerRodada(aluno, data.id) : null;
}

/** Duas abas abertas juntas disputam a mesma chave; a vencedora define a lista. */
export async function obterRodada({
  aluno, chave, modo, tema, selecionar,
}: {
  aluno: string;
  chave: string;
  modo: Rodada["modo"];
  tema: string | null;
  selecionar: (numero: number) => Promise<PuzzleServido[]>;
}): Promise<Rodada> {
  const anterior = await ultimaRodada(aluno, chave);
  if (anterior && pendentesDaRodada(anterior.puzzles, anterior.respostas).length > 0) return anterior;
  const numero = (anterior?.numero ?? 0) + 1;
  const escolhidos = await selecionar(numero);
  const puzzles = [...new Map(escolhidos.map((p) => [p.id, { id: p.id, origem: p.origem }])).values()];
  if (puzzles.length === 0) throw new Error("Não há puzzles disponíveis para esta rodada.");
  const { data, error } = await criarClienteAdmin().from("tatica_rodadas")
    .insert({ aluno, chave, numero, modo, tema, puzzles }).select("id").single();
  if (error?.code === "23505") {
    const concorrente = await ultimaRodada(aluno, chave);
    if (concorrente) return concorrente;
  }
  if (error || !data) throw new Error("Não foi possível guardar a rodada de tática.");
  return { id: data.id, aluno, chave, numero, modo, tema, puzzles, respostas: [] };
}

export async function puzzlesPendentes(rodada: Rodada): Promise<PuzzleServido[]> {
  return Promise.all(pendentesDaRodada(rodada.puzzles, rodada.respostas).map(async (item) => {
    const puzzle = await puzzlePorId(item.origem, item.id);
    if (!puzzle) throw new Error("Um puzzle desta rodada está indisponível. Avise o professor.");
    return { ...puzzle, origem: item.origem };
  }));
}
