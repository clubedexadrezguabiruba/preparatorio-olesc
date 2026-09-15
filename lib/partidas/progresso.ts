import "server-only";
import type { ProgressoDasPartidas } from "@/lib/curso/nivel";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { listarPartidas, partidasPublicadas } from "./carregar.ts";
import { situacaoDaPartida, type LinhaDeMomento, type SituacaoDaPartida } from "./concluir.ts";

/**
 * O que o aluno fez nas partidas modelo, lido de `tentativa_partida_momento`.
 *
 * O cliente é o da sessão, e quem filtra é a RLS: o aluno lê só as linhas dele,
 * e o professor lê as de todos — por isso o `aluno` é explícito aqui, para o
 * relatório do professor não somar a turma inteira.
 */

type Linha = LinhaDeMomento & { partida: string };

async function linhasDoAluno(aluno: string): Promise<Linha[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("tentativa_partida_momento")
    .select("partida, momento, versao, acertou, tentativa, apoio")
    .eq("aluno", aluno);
  return (data ?? []) as Linha[];
}

/** A situação de cada partida visível, por slug. */
export async function situacoesDoAluno(
  aluno: string,
  verRascunho: boolean,
): Promise<Map<string, SituacaoDaPartida>> {
  const [partidas, linhas] = await Promise.all([listarPartidas(verRascunho), linhasDoAluno(aluno)]);
  return new Map(
    partidas.map((p) => [p.slug, situacaoDaPartida(p.momentos, linhas.filter((l) => l.partida === p.slug))]),
  );
}

/** A quarta trilha do nível: as publicadas e as que o aluno concluiu entre elas. */
export async function progressoDasPartidas(aluno: string): Promise<ProgressoDasPartidas> {
  const [publicadas, situacoes] = await Promise.all([partidasPublicadas(), situacoesDoAluno(aluno, false)]);
  return {
    publicadas,
    concluidas: new Set([...situacoes].filter(([, s]) => s.concluida).map(([slug]) => slug)),
  };
}
