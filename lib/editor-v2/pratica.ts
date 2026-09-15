/**
 * A prática contra o computador, criada e editada pela tela — especificação §17.1, fatia 10.
 *
 * ## O que a prática é, e o que ela não é
 *
 * É a avaliação que já existia no v1 e que a publicação v2 preservou: o aluno joga a posição
 * contra o Stockfish e precisa **vencer** ou **segurar o empate**. Desde 15/9/2026 (travas 1 e 9 de
 * `docs/TRILHA-FINAIS.md`) não há limite de peças, e a aula tem **nenhuma, uma ou várias** práticas:
 * com várias, a aula é aprendida quando todas são; sem nenhuma, o aluno a fecha marcando que assistiu.
 *
 * Os campos são os que o `PracticeStage` sabe jogar: título, posição, lado, objetivo e o
 * adversário (força e tempo por lance). O que §17.1 pede e o runtime não tem — ajuda permitida
 * na prática, limite de lances configurável, prática opcional — não é inventado aqui;
 * fica aberto no diário.
 *
 * ## A versão da avaliação
 *
 * Posição, lado, objetivo e adversário entram na `assessmentRevision` (`avaliacao.ts`); o título
 * não. A tela avisa antes de salvar quando a mudança cria versão nova — a conta exata do hash roda
 * no servidor, mas **quais campos** a movem é conhecido e cabe aqui, no navegador.
 */
import { comoId, idsDaAulaV2 } from "./ids.ts";
import type { AulaV2, PraticaV2 } from "./modelo.ts";
import type { Position } from "../lesson/schema.ts";

/** O adversário padrão, o da N0-LADDER publicada: força máxima, 300 ms por lance. */
export const ADVERSARIO_PADRAO = { skill: 20, moveTimeMs: 300 } as const;

export type PedidoDePraticaV2 = {
  titulo: string;
  positionId: string;
  ladoAluno: "white" | "black";
  objetivo: "win" | "draw";
  skill: number;
  moveTimeMs: number;
};

export type RegistroDaPosicaoV2 = { positionId: string; conteudoHash: string; estado: "fixture" | "candidate" | "approved" };

export type PraticaPreparadaV2 = { pratica: PraticaV2; etapaId: string; registro?: RegistroDaPosicaoV2 };

export type PreparoDaPraticaV2 =
  | { ok: true; preparo: PraticaPreparadaV2 }
  | { ok: false; campo: "titulo" | "posicao" | "adversario"; mensagem: string };

/**
 * Confere o pedido e decide os ids. Não toca na aula.
 *
 * `praticaId` presente = edição daquela prática (os ids ficam).
 */
export function prepararPratica(
  aula: AulaV2,
  pedido: PedidoDePraticaV2,
  positions: Record<string, Position>,
  registro?: RegistroDaPosicaoV2,
  praticaId?: string,
): PreparoDaPraticaV2 {
  const titulo = pedido.titulo.trim();
  if (!titulo) return { ok: false, campo: "titulo", mensagem: "dê um título à prática — é o que o aluno lê na trilha" };
  const posicao = positions[pedido.positionId];
  if (!posicao) return { ok: false, campo: "posicao", mensagem: "escolha a posição da prática no acervo" };
  const esperado = posicao.expectedResult;
  const doAluno = esperado === "draw" ? "draw" : (esperado === "win-white") === (pedido.ladoAluno === "white") ? "win" : "loss";
  if (doAluno === "loss") return { ok: false, campo: "posicao", mensagem: "nesta posição o lado do aluno perde — a prática não tem objetivo possível" };
  if (pedido.objetivo === "win" && doAluno === "draw") return { ok: false, campo: "posicao", mensagem: "o resultado esperado desta posição é empate; o objetivo da prática tem de ser segurar o empate" };
  if (!Number.isInteger(pedido.skill) || pedido.skill < 0 || pedido.skill > 20) return { ok: false, campo: "adversario", mensagem: "a força do computador vai de 0 a 20" };
  if (!Number.isInteger(pedido.moveTimeMs) || pedido.moveTimeMs < 50 || pedido.moveTimeMs > 5000) return { ok: false, campo: "adversario", mensagem: "o tempo por lance do computador vai de 50 a 5000 ms" };

  const existente = praticaId ? aula.praticas.find((item) => item.id === praticaId) : undefined;
  if (praticaId && !existente) return { ok: false, campo: "titulo", mensagem: "esta prática não existe mais" };
  const usados = idsDaAulaV2(aula);
  let id = existente?.id ?? `pratica-${comoId(titulo, "aula")}`;
  if (!existente) for (let n = 2; usados.has(id) || usados.has(`etapa-${id}`); n += 1) id = `pratica-${comoId(titulo, "aula")}-${n}`;
  const etapaId = aula.fluxo.find((etapa) => etapa.tipo === "pratica" && etapa.entidadeId === id)?.id ?? `etapa-${id}`;

  return {
    ok: true,
    preparo: {
      pratica: { id, titulo, positionId: posicao.id, ladoAluno: pedido.ladoAluno, objetivo: pedido.objetivo, engine: { skill: pedido.skill, moveTimeMs: pedido.moveTimeMs } },
      etapaId,
      ...(registro ? { registro } : {}),
    },
  };
}

function comRegistro(aula: AulaV2, registro: RegistroDaPosicaoV2 | undefined): AulaV2["proveniencia"] {
  if (!registro || aula.proveniencia.some((item) => item.positionId === registro.positionId)) return aula.proveniencia;
  return [...aula.proveniencia, registro];
}

/** Acrescenta a prática no **fim** do fluxo — a avaliação vem depois do que prepara para ela (§18). */
export function aplicarNovaPratica(aula: AulaV2, preparo: PraticaPreparadaV2): AulaV2 {
  if (aula.praticas.some((item) => item.id === preparo.pratica.id)) throw new Error("esta prática já existe");
  return {
    ...aula,
    proveniencia: comRegistro(aula, preparo.registro),
    praticas: [...aula.praticas, preparo.pratica],
    fluxo: [...aula.fluxo, { id: preparo.etapaId, tipo: "pratica", entidadeId: preparo.pratica.id }],
  };
}

export function aplicarEdicaoDePratica(aula: AulaV2, preparo: PraticaPreparadaV2): AulaV2 {
  const atual = aula.praticas.find((item) => item.id === preparo.pratica.id);
  if (!atual) throw new Error("esta prática não existe mais");
  const registro = comRegistro(aula, preparo.registro);
  if (JSON.stringify(atual) === JSON.stringify(preparo.pratica) && registro === aula.proveniencia) return aula;
  return { ...aula, proveniencia: registro, praticas: aula.praticas.map((item) => (item.id === atual.id ? preparo.pratica : item)) };
}

/** Exclui a prática e a etapa dela. A proveniência da posição fica: outra parte pode usar. */
export function aplicarExclusaoDePratica(aula: AulaV2, praticaId: string): AulaV2 {
  if (!aula.praticas.some((item) => item.id === praticaId)) return aula;
  return {
    ...aula,
    praticas: aula.praticas.filter((item) => item.id !== praticaId),
    fluxo: aula.fluxo.filter((etapa) => !(etapa.tipo === "pratica" && etapa.entidadeId === praticaId)),
  };
}

/** Os campos da avaliação que esta edição muda — vazio: a versão da avaliação continua a mesma. */
export function mudancasDeAvaliacao(antes: PraticaV2, depois: PraticaV2, positions: Record<string, Position>): string[] {
  const mudou: string[] = [];
  if (positions[antes.positionId]?.fen !== positions[depois.positionId]?.fen) mudou.push("posição");
  if (antes.ladoAluno !== depois.ladoAluno) mudou.push("lado do aluno");
  if (antes.objetivo !== depois.objetivo) mudou.push("objetivo");
  if (antes.engine.skill !== depois.engine.skill || antes.engine.moveTimeMs !== depois.engine.moveTimeMs) mudou.push("adversário");
  return mudou;
}
