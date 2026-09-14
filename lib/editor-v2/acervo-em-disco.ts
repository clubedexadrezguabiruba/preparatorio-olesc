/**
 * "Adicionar ao acervo": a posição nova de uma prática vira arquivo em `content/positions/` —
 * fatia 10, parada 10C (§17.1, plano §12).
 *
 * ## Por que a prática precisa do acervo
 *
 * A prática aponta um `positionId` (o `PracticeStage` e a publicação v2 são assim desde a fatia 7),
 * e o juiz dela é a tablebase. Uma posição vinda de um estudo do Lichess ou de uma FEN colada não
 * tem arquivo: este módulo o cria, com o **resultado esperado** e a **proveniência** que o
 * `validate:content` exige de toda posição do curso.
 *
 * ## As regras, e o porquê de cada uma
 *
 * - **Até 7 peças.** É o que a tablebase alcança; o `validate:content` confere todo arquivo do
 *   acervo contra ela.
 * - **O resultado vem do cache da tablebase, sem rede.** Sem cache, o professor declara o resultado
 *   e a tela avisa: o `validate:content` confere pela rede antes do commit.
 * - **Origem desconhecida não entra.** O acervo exige obra registrada em `content/sources.json`
 *   (`OBRA_NAO_REGISTRADA`). Autoria própria usa `posicoes-do-preparatorio`; partida usa
 *   `lichess-open-database`; obra ou estudo de outra pessoa pede a obra do registro.
 * - **Nasce `candidate`.** Aprovar (`approved`) é conferência humana de QA, fora do editor.
 * - **A mesma FEN não entra duas vezes.** Se o acervo já tem a posição, ela é devolvida.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { normalizeFen, Tablebase, type TbEntry } from "../../scripts/tablebase.ts";
import { problemaDaPosicaoMontada } from "../chess/fen.ts";
import { positionSchema, type Position } from "../lesson/schema.ts";
import { pecasDaFen, type PosicaoDoAcervoV2 } from "./acervo.ts";
import { lerPosicoesDoConteudoV2 } from "./gate.ts";
import { hashDaPosicao } from "./hash.ts";
import type { RevisaoDaFenV2 } from "./modelo.ts";

export type PedidoDePosicaoNoAcervoV2 = {
  aulaId: string;
  fen: string;
  revisao: RevisaoDaFenV2;
  /** Obrigatória quando a origem é obra ou estudo de outra pessoa: o `slug` de `content/sources.json`. */
  obra?: string;
  /** Usado só quando a tablebase não tem a posição no cache. */
  resultadoDeclarado?: Position["expectedResult"];
  etiqueta: string;
};

export type ObraDoRegistro = { slug: string; titulo: string };

export type AdicaoAoAcervoV2 =
  | { ok: true; item: PosicaoDoAcervoV2; nova: boolean; avisos: string[] }
  | { ok: false; campo: "posicao" | "origem" | "obra" | "resultado"; mensagem: string };

export function obrasDoRegistro(raiz = process.cwd()): ObraDoRegistro[] {
  const cru = JSON.parse(readFileSync(path.join(raiz, "content", "sources.json"), "utf8")) as { sources: Array<{ slug: string; title: string; author: string }> };
  return cru.sources.map((obra) => ({ slug: obra.slug, titulo: `${obra.title} — ${obra.author}` }));
}

function resultadoDaTablebase(fen: string, entrada: TbEntry): Position["expectedResult"] | null {
  const vez = new Chess(fen).turn();
  if (entrada.category === "draw") return "draw";
  if (entrada.category === "win") return vez === "w" ? "win-white" : "win-black";
  if (entrada.category === "loss") return vez === "w" ? "win-black" : "win-white";
  return null;
}

const SLUG_POR_ORIGEM: Partial<Record<RevisaoDaFenV2["origem"], string>> = {
  "autoria-propria": "posicoes-do-preparatorio",
  partida: "lichess-open-database",
};

export async function adicionarPosicaoAoAcervo(pedido: PedidoDePosicaoNoAcervoV2, raiz = process.cwd()): Promise<AdicaoAoAcervoV2> {
  const fen = pedido.fen.trim();
  const problema = problemaDaPosicaoMontada(fen);
  if (problema) return { ok: false, campo: "posicao", mensagem: `esta posição não serve: ${problema}` };
  const pecas = pecasDaFen(fen);
  if (pecas > 7) return { ok: false, campo: "posicao", mensagem: `a posição tem ${pecas} peças; o acervo de finais só aceita até 7, porque o juiz é a tablebase` };

  const existentes = lerPosicoesDoConteudoV2(raiz);
  const igual = Object.values(existentes).find((posicao) => normalizeFen(posicao.fen) === normalizeFen(fen));
  if (igual) return { ok: true, item: { position: igual, conteudoHash: hashDaPosicao(igual) }, nova: false, avisos: [`o acervo já tem esta posição: ${igual.id}. Ela foi usada, e nada foi criado.`] };

  if (pedido.revisao.origem === "desconhecida") return { ok: false, campo: "origem", mensagem: "posição de origem desconhecida não entra no acervo — o curso exige a obra de onde ela veio. Diga a origem (autoria própria vale)" };
  const slug = SLUG_POR_ORIGEM[pedido.revisao.origem] ?? pedido.obra;
  const obras = obrasDoRegistro(raiz);
  if (!slug) return { ok: false, campo: "obra", mensagem: "escolha a obra do registro de onde a posição veio" };
  if (!obras.some((obra) => obra.slug === slug)) return { ok: false, campo: "obra", mensagem: `a obra "${slug}" não está em content/sources.json — registre a obra antes (é o que o validate:content exige)` };

  const avisos: string[] = [];
  let expectedResult: Position["expectedResult"] | null = null;
  try {
    expectedResult = resultadoDaTablebase(fen, await new Tablebase(path.join(raiz, "content", "tablebase-cache"), false).lookup(fen));
  } catch {
    expectedResult = null;
  }
  if (expectedResult === null) {
    if (!pedido.resultadoDeclarado) return { ok: false, campo: "resultado", mensagem: "a tablebase ainda não tem esta posição no cache: declare o resultado esperado (o validate:content confere pela rede antes do commit)" };
    expectedResult = pedido.resultadoDeclarado;
    avisos.push("o resultado foi declarado por você, sem o cache da tablebase; rode npm run validate:content antes do commit para conferir pela rede");
  } else if (pedido.resultadoDeclarado && pedido.resultadoDeclarado !== expectedResult) {
    avisos.push(`você declarou "${pedido.resultadoDeclarado}", e a tablebase diz "${expectedResult}" — ficou o da tablebase`);
  }

  const serie = pedido.aulaId.startsWith("EX-") ? "EX" : pedido.aulaId.split("-")[0];
  const base = `pos-${pedido.aulaId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  let n = 1;
  while (existentes[`${base}-${n}`]) n += 1;
  const id = `${base}-${n}`;
  const r = pedido.revisao;
  const data = r.revisadoEm.slice(0, 10);
  const posicao = positionSchema.parse({
    id,
    fen,
    expectedResult,
    tags: [pedido.etiqueta.trim() || "prática"],
    status: "candidate",
    provenance: {
      externalHumanSource: r.autor ?? (r.origem === "autoria-propria" ? r.professor : "não informado pelo professor"),
      bibliographicSource: [r.obra, r.pagina && `p. ${r.pagina}`, r.link].filter(Boolean).join(", ") || "não se aplica — posição registrada pelo Editor v2 sem obra impressa",
      originalGame: r.origem === "partida" ? r.link ?? r.obra ?? "partida sem endereço informado" : "não se aplica",
      authorComposer: r.origem === "autoria-propria" ? r.professor : r.autor ?? "não informado",
      license: r.licenca ?? (r.origem === "autoria-propria" ? "CC0" : "não informada — conferir antes de aprovar"),
      editionFile: slug,
      fenMethod: `FEN registrada pelo Editor v2 em ${data} (origem: ${r.origem})`,
      qaApplied: `proveniência registrada por ${r.professor} em ${data} no Editor v2; resultado ${avisos.length ? "declarado pelo professor" : "conferido pelo cache da tablebase"}`,
      pendingRisk: `candidata: falta a conferência humana de QA para aprovar${r.nota ? `; nota: ${r.nota}` : ""}`,
    },
  });

  const pasta = path.join(raiz, "content", "positions", serie);
  mkdirSync(pasta, { recursive: true });
  const destino = path.join(pasta, `${id}.json`);
  if (existsSync(destino)) return { ok: false, campo: "posicao", mensagem: `já existe um arquivo ${id}.json; tente de novo` };
  writeFileSync(destino, JSON.stringify(posicao, null, 2) + "\n");
  return { ok: true, item: { position: posicao, conteudoHash: hashDaPosicao(posicao) }, nova: true, avisos };
}
