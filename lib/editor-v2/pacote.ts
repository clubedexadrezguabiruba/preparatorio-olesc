/**
 * O pacote de uma publicação v2 — plano final §13, especificação §20.1.
 *
 * ## O que é
 *
 * Tudo o que o aluno e o servidor precisam para jogar e **rejulgar** uma aula, num arquivo
 * só, sem depender de nada que possa mudar depois:
 *
 * - a aula v2;
 * - as posições que ela usa, **embutidas** — trocar a FEN de `content/positions/` depois de
 *   publicar não pode mudar o que uma aba antiga está jogando;
 * - a revisão de avaliação de cada treino e prática (`avaliacao.ts`);
 * - o manifesto: o hash de cada parte e a versão dos juízes.
 *
 * O `publicationId` é `pub-` + 16 hex do hash canônico do manifesto. Como o manifesto cobre
 * cada parte, o id cobre o pacote inteiro; como o hash é canônico, a ordem das chaves não
 * decide nada. Data de publicação **não** entra: republicar o mesmo conteúdo dá o mesmo id,
 * e a data mora no ponteiro que ativa a publicação.
 *
 * ## Por que 16 hex
 *
 * 64 bits. Uma aula terá dezenas de publicações na vida, não bilhões; a chance de colisão
 * entre elas é desprezível, e o nome cabe numa URL e numa coluna do banco sem virar ruído.
 * A verificação continua usando os hashes inteiros do manifesto.
 *
 * ## Onde roda
 *
 * No servidor (usa `node:crypto`). O pacote é conteúdo do servidor: comentários privados
 * de análise estão aqui dentro e **não** vão ao navegador do aluno — quem monta o que o
 * aluno recebe é o fluxo do aluno, que só leva narração, treino e prática.
 */
import { positionSchema, type Position } from "../lesson/schema.ts";
import { VERSAO_JUIZ_PRATICA_V2, VERSAO_JUIZ_TREINO_V2, revisoesDaAulaV2, type RevisoesDaAulaV2 } from "./avaliacao.ts";
import { hashCanonico, jsonCanonico } from "./hash.ts";
import { aulaV2Schema, type AulaV2 } from "./modelo.ts";

export const FORMATO_PACOTE_V2 = "pacote-aula-v2";

export type ManifestoDoPacoteV2 = {
  aulaId: string;
  aula: string;
  posicoes: Record<string, string>;
  revisoes: string;
  juizes: { pratica: number; treino: number };
};

export type PacoteV2 = {
  formato: typeof FORMATO_PACOTE_V2;
  versao: 1;
  publicationId: string;
  aula: AulaV2;
  posicoes: Record<string, Position>;
  revisoes: RevisoesDaAulaV2;
  manifesto: ManifestoDoPacoteV2;
};

/** As posições de `content/positions/` que a aula referencia, em qualquer campo. */
export function idsDePosicoesDaAulaV2(aula: AulaV2): string[] {
  const ids = new Set<string>();
  for (const analise of aula.analises) if (analise.inicio.tipo === "posicao") ids.add(analise.inicio.positionId);
  for (const pratica of aula.praticas) ids.add(pratica.positionId);
  for (const item of aula.proveniencia) ids.add(item.positionId);
  for (const treino of aula.treinos) if (treino.certificacao) ids.add(treino.certificacao.positionId);
  return [...ids].sort();
}

export function idDaPublicacaoV2(manifesto: ManifestoDoPacoteV2): string {
  return `pub-${hashCanonico(manifesto).slice(0, 16)}`;
}

function manifestoDe(aula: AulaV2, posicoes: Record<string, Position>, revisoes: RevisoesDaAulaV2): ManifestoDoPacoteV2 {
  return {
    aulaId: aula.id,
    aula: hashCanonico(aula),
    posicoes: Object.fromEntries(Object.keys(posicoes).sort().map((id) => [id, hashCanonico(posicoes[id])])),
    revisoes: hashCanonico(revisoes),
    juizes: { pratica: VERSAO_JUIZ_PRATICA_V2, treino: VERSAO_JUIZ_TREINO_V2 },
  };
}

/** Monta o pacote. Recusa aula que usa posição fora de `positions`. */
export function montarPacoteV2(aula: AulaV2, positions: Record<string, Position>): PacoteV2 {
  const posicoes: Record<string, Position> = {};
  for (const id of idsDePosicoesDaAulaV2(aula)) {
    const posicao = positions[id];
    if (!posicao) throw new Error(`a aula usa a posição ${id}, que não está no conteúdo`);
    posicoes[id] = posicao;
  }
  // Uma cópia desligada do documento de entrada: o pacote é imutável, e quem o montou
  // continuar editando a aula não pode mudá-lo por referência.
  //
  // **Na ordem de chaves do schema, e não na canônica.** A identidade do pacote é canônica
  // (não depende da ordem), mas dois hashes antigos dependem: o da proveniência
  // (`hashDaPosicao`) e o da fonte do treino (`propriedade-treino.ts`). Uma posição com as
  // chaves em ordem alfabética acusaria "caduca" em todo pacote.
  const copia = aulaV2Schema.parse(structuredClone(aula));
  const posicoesCopia = Object.fromEntries(Object.entries(posicoes).map(([id, posicao]) => [id, positionSchema.parse(structuredClone(posicao))]));
  const revisoes = revisoesDaAulaV2(copia, posicoesCopia);
  return selarPacoteV2({ formato: FORMATO_PACOTE_V2, versao: 1, publicationId: "", aula: copia, posicoes: posicoesCopia, revisoes, manifesto: manifestoDe(copia, posicoesCopia, revisoes) });
}

/**
 * Recalcula manifesto e id a partir do que está no pacote, **sem** recalcular as revisões.
 *
 * Existe para o teste de mutações: uma revisão adulterada com o pacote resselado precisa
 * disparar a regra da revisão, e não só "pacote adulterado".
 */
export function selarPacoteV2(pacote: PacoteV2): PacoteV2 {
  const manifesto = manifestoDe(pacote.aula, pacote.posicoes, pacote.revisoes);
  return { ...pacote, manifesto, publicationId: idDaPublicacaoV2(manifesto) };
}

/** Lê as posições do pacote na ordem do schema — a que os hashes de proveniência esperam. */
export function posicoesDoPacoteV2(pacote: PacoteV2): Record<string, Position> {
  return Object.fromEntries(Object.entries(pacote.posicoes).map(([id, posicao]) => [id, positionSchema.parse(posicao)]));
}

/**
 * O pacote lido do disco é o que diz ser? Lista vazia = íntegro.
 *
 * Recalcula tudo a partir do conteúdo — hashes, revisões e id — e compara com o que está
 * escrito. Não confia no nome do arquivo nem no manifesto: um manifesto adulterado junto
 * com o conteúdo muda o id, e o id recalculado não bate com o gravado.
 */
export function problemasDoPacoteV2(cru: unknown): string[] {
  if (!cru || typeof cru !== "object") return ["o pacote não é um objeto"];
  const pacote = cru as Partial<PacoteV2>;
  if (pacote.formato !== FORMATO_PACOTE_V2 || pacote.versao !== 1) return ["o arquivo não é um pacote de aula v2 na versão 1"];
  const forma = aulaV2Schema.safeParse(pacote.aula);
  if (!forma.success) return [`a aula do pacote não tem forma de aula v2: ${forma.error.issues[0]?.message ?? "?"}`];
  const problemas: string[] = [];
  const posicoes: Record<string, Position> = {};
  for (const [id, valor] of Object.entries(pacote.posicoes ?? {})) {
    const lida = positionSchema.safeParse(valor);
    if (!lida.success || lida.data.id !== id) problemas.push(`a posição ${id} do pacote não tem forma de posição`);
    else posicoes[id] = valor as Position;
  }
  if (problemas.length) return problemas;
  for (const id of idsDePosicoesDaAulaV2(pacote.aula as AulaV2)) {
    if (!posicoes[id]) problemas.push(`a aula usa a posição ${id}, que não está embutida no pacote`);
  }
  if (problemas.length) return problemas;

  const manifesto = pacote.manifesto;
  if (!manifesto) return ["o pacote não tem manifesto"];
  const aula = pacote.aula as AulaV2;
  if (manifesto.aulaId !== aula.id) problemas.push("o manifesto é de outra aula");
  if (hashCanonico(aula) !== manifesto.aula) problemas.push("o conteúdo da aula não é o que o manifesto registra");
  const idsManifesto = Object.keys(manifesto.posicoes ?? {}).sort();
  if (jsonCanonico(idsManifesto) !== jsonCanonico(Object.keys(posicoes).sort())) problemas.push("as posições embutidas não são as que o manifesto registra");
  for (const [id, posicao] of Object.entries(posicoes)) {
    if (manifesto.posicoes?.[id] !== undefined && hashCanonico(posicao) !== manifesto.posicoes[id]) problemas.push(`a posição ${id} não é a que o manifesto registra`);
  }
  let recalculadas: RevisoesDaAulaV2 | null = null;
  try {
    recalculadas = revisoesDaAulaV2(aula, posicoes);
  } catch (erro) {
    problemas.push(`não foi possível recalcular a revisão de avaliação: ${(erro as Error).message}`);
  }
  if (recalculadas && jsonCanonico(recalculadas) !== jsonCanonico(pacote.revisoes ?? {})) problemas.push("a revisão de avaliação gravada não é a que o conteúdo produz");
  if (hashCanonico(pacote.revisoes ?? {}) !== manifesto.revisoes) problemas.push("as revisões não são as que o manifesto registra");
  if (manifesto.juizes?.pratica !== VERSAO_JUIZ_PRATICA_V2 || manifesto.juizes?.treino !== VERSAO_JUIZ_TREINO_V2) {
    problemas.push("o pacote foi publicado com outra versão dos juízes");
  }
  if (idDaPublicacaoV2(manifesto) !== pacote.publicationId) problemas.push("o id da publicação não é o que o manifesto produz");
  return problemas;
}
