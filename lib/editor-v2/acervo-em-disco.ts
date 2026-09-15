/**
 * "Adicionar ao acervo": a posição nova de uma prática vira arquivo em `content/positions/` —
 * fatia 10, parada 10C (§17.1, plano §12).
 *
 * ## Por que a prática precisa do acervo
 *
 * A prática aponta um `positionId` (o `PracticeStage` e a publicação v2 são assim desde a fatia 7),
 * Uma posição vinda de um estudo do Lichess ou de uma FEN colada não tem arquivo: este módulo o
 * cria, com o **resultado esperado** e o registro de proveniência.
 *
 * ## As regras, e o porquê de cada uma (travas de 15/9/2026)
 *
 * - **Qualquer número de peças.** A tablebase deixou de ser juiz (travas 1 a 3 de
 *   `docs/TRILHA-FINAIS.md`); o limite de 7 existia por causa dela.
 * - **O resultado é declarado pelo professor.** Ninguém consulta tablebase; o motor do professor
 *   fica na tela para ele conferir, e a decisão é dele.
 * - **"De onde veio" é opcional** (trava 7). Autoria própria usa `posicoes-do-preparatorio`;
 *   partida usa `lichess-open-database`; obra ou estudo pede a obra do registro, se houver. Sem
 *   origem, ou com obra fora do registro, a posição entra e o gate avisa.
 * - **Nasce `candidate`.** Aprovar (`approved`) é conferência humana de QA, fora do editor.
 * - **A mesma FEN não entra duas vezes.** Se o acervo já tem a posição, ela é devolvida.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { normalizeFen } from "../../scripts/tablebase.ts";
import { problemaDaPosicaoMontada } from "../chess/fen.ts";
import { positionSchema, type Position } from "../lesson/schema.ts";
import type { PosicaoDoAcervoV2 } from "./acervo.ts";
import { lerPosicoesDoConteudoV2 } from "./gate.ts";
import { hashDaPosicao } from "./hash.ts";
import type { RevisaoDaFenV2 } from "./modelo.ts";

export type PedidoDePosicaoNoAcervoV2 = {
  aulaId: string;
  fen: string;
  revisao: RevisaoDaFenV2;
  /** Quando a origem é obra ou estudo de outra pessoa: o `slug` de `content/sources.json`. Opcional. */
  obra?: string;
  /** O resultado da posição, declarado pelo professor. Obrigatório para criar arquivo novo. */
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

const SLUG_POR_ORIGEM: Partial<Record<RevisaoDaFenV2["origem"], string>> = {
  "autoria-propria": "posicoes-do-preparatorio",
  partida: "lichess-open-database",
};

export async function adicionarPosicaoAoAcervo(pedido: PedidoDePosicaoNoAcervoV2, raiz = process.cwd()): Promise<AdicaoAoAcervoV2> {
  const fen = pedido.fen.trim();
  const problema = problemaDaPosicaoMontada(fen);
  if (problema) return { ok: false, campo: "posicao", mensagem: `esta posição não serve: ${problema}` };

  const existentes = lerPosicoesDoConteudoV2(raiz);
  const igual = Object.values(existentes).find((posicao) => normalizeFen(posicao.fen) === normalizeFen(fen));
  if (igual) return { ok: true, item: { position: igual, conteudoHash: hashDaPosicao(igual) }, nova: false, avisos: [`o acervo já tem esta posição: ${igual.id}. Ela foi usada, e nada foi criado.`] };

  if (!pedido.resultadoDeclarado) return { ok: false, campo: "resultado", mensagem: "diga o resultado desta posição — quem ganha, ou se é empate. O motor do editor ajuda a conferir; a decisão é sua" };
  const expectedResult = pedido.resultadoDeclarado;
  const avisos: string[] = [];
  const slugDeclarado = SLUG_POR_ORIGEM[pedido.revisao.origem] ?? (pedido.obra || null);
  const registrada = slugDeclarado !== null && obrasDoRegistro(raiz).some((obra) => obra.slug === slugDeclarado);
  const slug = registrada ? slugDeclarado : null;
  if (!registrada) {
    avisos.push(slugDeclarado
      ? `a obra "${slugDeclarado}" não está em content/sources.json — a posição entrou, e a conferência avisa`
      : "a posição entrou sem dizer de onde veio — a conferência avisa até alguém dizer");
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
      qaApplied: `proveniência registrada por ${r.professor} em ${data} no Editor v2; resultado declarado pelo professor`,
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
