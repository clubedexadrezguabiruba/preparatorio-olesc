import "server-only";
import { dominioDaAulaV2 } from "../editor-v2/dominio.ts";
import type { PacoteV2 } from "../editor-v2/pacote.ts";
import { pacoteAtivoDoAluno, pacoteDaPublicacao } from "../finais/conteudo-v2.ts";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { rodadaConcluida, type EtapaDaRodada, type RodadaDaAula } from "./rodada.ts";

/**
 * A rodada da aula de abertura no banco (`aula_rodada`, migração 0015) — regras 16 e 17 do curso
 * de abertura, especificação §18.1.
 *
 * Só o servidor escreve, com o cliente admin, e o `aluno` é sempre o do cookie de sessão (quem
 * chama é a server action). O que se confere antes de gravar uma etapa:
 *
 * - a aula é de abertura e a etapa existe no fluxo da publicação;
 * - **treino** (parada ou treino guiado): há tentativa com sucesso gravada **nesta rodada**;
 * - **capítulo com perguntas dentro**: cada pergunta tem tentativa com sucesso nesta rodada;
 * - **move trainer**: cada linha dele tem passada gravada nesta rodada (regra 17).
 *
 * Capítulo e introdução não têm lance a conferir — como `aula_lida`, valem pela palavra do aluno.
 */

type LinhaDaRodada = { rodada: number; publication_id: string; etapas_feitas: string[]; iniciada_em: string; concluida_em: string | null };

export type RodadaAberta = RodadaDaAula & { rodada: number; iniciadaEm: string };

const etapasDoPacote = (pacote: PacoteV2): EtapaDaRodada[] => pacote.aula.fluxo.map((etapa) => ({ id: etapa.id, tipo: etapa.tipo }));

/** A rodada em andamento, criada quando não há: a vez, as etapas feitas e quando ela começou. */
export async function abrirRodada(aluno: string, aula: string, publicationId: string): Promise<RodadaAberta> {
  const admin = criarClienteAdmin();
  const { data, error } = await admin
    .from("aula_rodada")
    .select("rodada, publication_id, etapas_feitas, iniciada_em, concluida_em")
    .eq("aluno", aluno)
    .eq("aula", aula)
    .order("rodada", { ascending: true });
  if (error) throw new Error(`não foi possível ler a rodada da aula: ${error.message}`);
  const linhas = (data ?? []) as LinhaDaRodada[];
  const concluidas = linhas.filter((linha) => linha.concluida_em !== null).length;
  const aberta = linhas.find((linha) => linha.concluida_em === null);
  if (aberta) return { rodada: aberta.rodada, vez: concluidas + 1, feitas: aberta.etapas_feitas, iniciadaEm: aberta.iniciada_em };
  const rodada = (linhas.at(-1)?.rodada ?? 0) + 1;
  const iniciadaEm = new Date().toISOString();
  const { error: erroAoCriar } = await admin
    .from("aula_rodada")
    .upsert({ aluno, aula, rodada, publication_id: publicationId, etapas_feitas: [], iniciada_em: iniciadaEm, atualizada_em: iniciadaEm }, { onConflict: "aluno,aula,rodada", ignoreDuplicates: true });
  if (erroAoCriar) throw new Error(`não foi possível abrir a rodada da aula: ${erroAoCriar.message}`);
  return { rodada, vez: concluidas + 1, feitas: [], iniciadaEm };
}

export type ResultadoDaEtapa = { ok: true; vez: number; feitas: string[]; concluida: boolean } | { ok: false; erro: string };

export async function marcarEtapaDaRodada(
  aluno: string,
  pedido: { aula: string; publicationId: string; etapaId: string },
): Promise<ResultadoDaEtapa> {
  const { aula, publicationId, etapaId } = pedido;
  if (typeof aula !== "string" || dominioDaAulaV2(aula) !== "abertura") return { ok: false, erro: "esta aula não é de curso de abertura" };
  if (typeof publicationId !== "string" || typeof etapaId !== "string") return { ok: false, erro: "pedido malformado" };
  const pacote = pacoteDaPublicacao(aula, publicationId) ?? pacoteAtivoDoAluno(aula);
  if (!pacote) return { ok: false, erro: "a aula não está publicada" };
  const etapa = pacote.aula.fluxo.find((item) => item.id === etapaId);
  if (!etapa) return { ok: false, erro: "esta etapa não existe na aula" };

  const rodada = await abrirRodada(aluno, aula, pacote.publicationId);
  const admin = criarClienteAdmin();

  if (etapa.tipo === "treino") {
    const { count, error } = await admin
      .from("tentativas_aula")
      .select("id", { count: "exact", head: true })
      .eq("aluno", aluno).eq("aula", aula).eq("entidade_id", etapa.entidadeId).eq("sucesso", true)
      .gte("criada_em", rodada.iniciadaEm);
    if (error) return { ok: false, erro: error.message };
    if (!count) return { ok: false, erro: "o treino ainda não foi concluído nesta rodada" };
  }
  // O capítulo com perguntas dentro (18/9/2026): cada pergunta com acerto gravado nesta rodada.
  if (etapa.tipo === "capitulo" && etapa.paradas?.length) {
    const { data, error } = await admin
      .from("tentativas_aula")
      .select("entidade_id")
      .eq("aluno", aluno).eq("aula", aula).in("entidade_id", etapa.paradas).eq("sucesso", true)
      .gte("criada_em", rodada.iniciadaEm);
    if (error) return { ok: false, erro: error.message };
    const acertadas = new Set((data ?? []).map((linha: { entidade_id: string }) => linha.entidade_id));
    const faltam = etapa.paradas.filter((id) => !acertadas.has(id));
    if (faltam.length) return { ok: false, erro: `faltam ${faltam.length} pergunta(s) deste capítulo nesta rodada` };
  }
  if (etapa.tipo === "treinador") {
    const treinador = pacote.aula.treinadores?.find((item) => item.id === etapa.entidadeId);
    if (!treinador) return { ok: false, erro: "o treinador de lances desta etapa não existe" };
    const { data, error } = await admin
      .from("repertorio_progresso")
      .select("linha")
      .eq("aluno", aluno).in("linha", treinador.linhaIds)
      .gte("ultima_em", rodada.iniciadaEm);
    if (error) return { ok: false, erro: error.message };
    const passadas = new Set((data ?? []).map((linha: { linha: string }) => linha.linha));
    const faltam = treinador.linhaIds.filter((id) => !passadas.has(id));
    if (faltam.length) return { ok: false, erro: `faltam ${faltam.length} linha(s) do treinador de lances nesta rodada` };
  }

  const feitas = rodada.feitas.includes(etapaId) ? rodada.feitas : [...rodada.feitas, etapaId];
  const concluida = rodadaConcluida({ vez: rodada.vez, feitas }, etapasDoPacote(pacote));
  const agora = new Date().toISOString();
  const { error } = await admin
    .from("aula_rodada")
    .update({ etapas_feitas: feitas, atualizada_em: agora, ...(concluida ? { concluida_em: agora } : {}) })
    .eq("aluno", aluno).eq("aula", aula).eq("rodada", rodada.rodada);
  if (error) return { ok: false, erro: error.message };
  return { ok: true, vez: rodada.vez, feitas, concluida };
}

/** As aulas de abertura que o aluno já concluiu ao menos uma vez, com quantas vezes. */
export async function conclusoesDoAluno(aluno: string, aulas: readonly string[]): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (!aulas.length) return mapa;
  const { data } = await criarClienteAdmin()
    .from("aula_rodada")
    .select("aula, concluida_em")
    .eq("aluno", aluno)
    .in("aula", [...aulas])
    .not("concluida_em", "is", null);
  for (const linha of (data ?? []) as Array<{ aula: string }>) mapa.set(linha.aula, (mapa.get(linha.aula) ?? 0) + 1);
  return mapa;
}
