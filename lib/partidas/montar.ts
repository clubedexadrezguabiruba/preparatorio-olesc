import { Chess } from "chess.js";
import { idDaLinha, type Cor, type Linha } from "../repertorio/linhas.ts";
import { lerPgn } from "../repertorio/pgn.ts";
import { FichaSchema, normalizarNag, type Ficha } from "./ficha.ts";

/**
 * De `<slug>.pgn` + `<slug>.json` para a partida que as telas usam.
 *
 * **Puro:** recebe o texto, não abre arquivo. Quem lê o disco é `ler.ts`; o que
 * reprova é `conferir.ts`. Aqui só se monta — e cada coisa torta vira um
 * problema com o lugar nomeado, em vez de sumir.
 *
 * ## O PGN do repositório
 *
 * ```
 * [Nome "Morphy × Duque Karl e Conde Isouard"]
 * [Ordem "1"] [Nivel "1"] [Cor "brancas"] [Tema "…"]
 * [FonteSlug "weeramantry-eusebi-1993"] [Fonte "Weeramantry & Eusebi, …"]
 * [Status "rascunho"]
 *
 * 1. e4 e5 2. Nf3 d6 {[%autoria ADAPTAÇÃO DIDÁTICA DO PROJETO] Morphy ocupa o centro.}
 * 3. d4! Bg4 …
 * ```
 *
 * - **Só a linha principal.** Variação reprova: a partida modelo é a partida
 *   jogada, e uma variação que o leitor descartasse levaria os símbolos dela junto.
 * - **SAN canônico.** O que a chess.js escreveria. `24...Rac8` do v4 não passa.
 * - **`[%autoria …]`** sai do texto e fica em `autorias`, por meio-lance.
 */

export type StatusDaPartida = "rascunho" | "revisado-doug";

export type LanceDaPartida = {
  readonly san: string;
  readonly uci: string;
  /** A posição **antes** do lance — a do momento, quando há um neste ply. */
  readonly fenAntes: string;
};

export type Partida = {
  readonly slug: string;
  readonly nome: string;
  readonly nivel: number;
  readonly ordem: number;
  readonly cor: Cor;
  readonly tema: string;
  readonly status: StatusDaPartida;
  readonly fonteSlug: string;
  /** A citação legível: obra, capítulo, páginas. */
  readonly fonte: string;
  readonly brancas: string;
  readonly pretas: string;
  readonly ano: string;
  readonly resultado: string;
  /** A partida inteira, até o último meio-lance do PGN. */
  readonly lances: readonly LanceDaPartida[];
  /**
   * Os símbolos de **todos** os meios-lances, já normalizados (`$1` → `!`).
   * `linha.marcas` só leva `!`/`!!` dos lances do aluno, porque o schema da
   * `Linha` é `.strict()` e só conhece esses dois; o resto mora aqui.
   */
  readonly nags: Readonly<Record<string, readonly string[]>>;
  readonly autorias: Readonly<Record<string, string>>;
  readonly lancesNossos: number;
  /** O que o treinador de lances consome, para a partida inteira opcional. */
  readonly linha: Linha;
  readonly ficha: Ficha;
};

export type Montagem = { partida: Partida | null; problemas: string[] };

const STATUS: readonly StatusDaPartida[] = ["rascunho", "revisado-doug"];
const AUTORIA = /\[%autoria\s+([^\]]+)\]/;

const uciDe = (m: { from: string; to: string; promotion?: string }): string =>
  `${m.from}${m.to}${m.promotion ?? ""}`;

const ehMeu = (ply: number, cor: Cor): boolean => (ply % 2 === 0) === (cor === "brancas");

export function montarPartida(slug: string, textoPgn: string, fichaCrua: unknown): Montagem {
  const problemas: string[] = [];
  const onde = `content/partidas/${slug}`;
  const pgn = lerPgn(textoPgn);
  const tag = (nome: string) => pgn.tags[nome]?.trim() ?? "";

  for (const nome of ["Nome", "Ordem", "Nivel", "Cor", "Tema", "FonteSlug", "Fonte", "Status", "White", "Black", "Result"]) {
    if (!tag(nome)) problemas.push(`${onde}.pgn: falta a tag [${nome}]`);
  }
  const cor = tag("Cor");
  if (cor && cor !== "brancas" && cor !== "pretas") {
    problemas.push(`${onde}.pgn: [Cor "${cor}"] — só "brancas" ou "pretas"`);
  }
  const status = tag("Status") as StatusDaPartida;
  if (tag("Status") && !STATUS.includes(status)) {
    problemas.push(`${onde}.pgn: [Status "${tag("Status")}"] — só ${STATUS.join(" ou ")}`);
  }
  const nivel = Number(tag("Nivel"));
  const ordem = Number(tag("Ordem"));
  if (tag("Nivel") && !(Number.isInteger(nivel) && nivel >= 1 && nivel <= 5)) {
    problemas.push(`${onde}.pgn: [Nivel "${tag("Nivel")}"] — de 1 a 5`);
  }
  if (tag("Ordem") && !(Number.isInteger(ordem) && ordem >= 1)) {
    problemas.push(`${onde}.pgn: [Ordem "${tag("Ordem")}"] — inteiro a partir de 1`);
  }
  if (pgn.intro?.trim()) {
    problemas.push(`${onde}.pgn: comentário antes do primeiro lance — a apresentação mora em "intro" da ficha`);
  }
  for (const token of pgn.naoReconhecidos) {
    problemas.push(`${onde}.pgn: o leitor não reconheceu "${token}"`);
  }

  const lida = FichaSchema.safeParse(fichaCrua);
  if (!lida.success) {
    for (const i of lida.error.issues) problemas.push(`${onde}.json [${i.path.join(".")}]: ${i.message}`);
  } else if (lida.data.slug !== slug) {
    problemas.push(`${onde}.json: "slug" é "${lida.data.slug}", e o arquivo se chama ${slug}`);
  }

  const jogo = new Chess();
  const lances: LanceDaPartida[] = [];
  const nags: Record<string, string[]> = {};
  const autorias: Record<string, string> = {};
  const comentarios: Record<string, string> = {};
  let legal = true;

  for (const [ply, no] of pgn.lances.entries()) {
    if (no.variacoes.length > 0) {
      problemas.push(`${onde}.pgn: variação no meio-lance ${ply} ("${no.san}") — só a linha principal`);
    }
    const fenAntes = jogo.fen();
    let feito;
    try {
      feito = jogo.move(no.san);
    } catch {
      problemas.push(`${onde}.pgn: "${no.san}" não é lance legal no meio-lance ${ply}`);
      legal = false;
      break;
    }
    if (feito.san !== no.san) {
      problemas.push(`${onde}.pgn: "${no.san}" no meio-lance ${ply} não é SAN canônico — escreva "${feito.san}"`);
    }
    lances.push({ san: feito.san, uci: uciDe(feito), fenAntes });
    if (no.nags.length > 0) nags[String(ply)] = no.nags.map(normalizarNag);
    const cru = no.comentario?.trim();
    if (cru) {
      const autoria = AUTORIA.exec(cru);
      if (autoria) autorias[String(ply)] = autoria[1].trim();
      const texto = cru.replace(AUTORIA, " ").replace(/\s+/g, " ").trim();
      if (texto) comentarios[String(ply)] = texto;
      if (texto && !autoria) {
        problemas.push(`${onde}.pgn: o comentário do meio-lance ${ply} está sem [%autoria …]`);
      }
    }
  }

  if (!legal || !lida.success || problemas.some((p) => p.includes("falta a tag [Cor]"))) {
    return { partida: null, problemas };
  }

  const corDaPartida: Cor = cor === "pretas" ? "pretas" : "brancas";

  /*
   * A partida inteira termina num lance **do aluno**: a mesma regra do
   * repertório, para a tela não ficar esperando uma vez que não vem. Quando o
   * PGN acaba no lance do perdedor, a `Linha` perde a ponta — e só a `Linha`: os
   * lances e os símbolos da partida continuam inteiros em `lances` e `nags`.
   */
  let fim = lances.length;
  while (fim > 0 && !ehMeu(fim - 1, corDaPartida)) {
    if (comentarios[String(fim - 1)]) {
      problemas.push(
        `${onde}.pgn: o último meio-lance (${fim - 1}) é do adversário e tem comentário, que a tela nunca mostraria`,
      );
    }
    fim--;
  }
  const naLinha = lances.slice(0, fim);
  const meus = naLinha.map((_, ply) => ply).filter((ply) => ehMeu(ply, corDaPartida));

  const marcas: Record<string, "!!" | "!"> = {};
  for (const ply of meus) {
    const deste = nags[String(ply)] ?? [];
    if (deste.includes("!!")) marcas[String(ply)] = "!!";
    else if (deste.includes("!")) marcas[String(ply)] = "!";
  }

  const fenFinal = naLinha.length > 0 ? new Chess(naLinha.at(-1)!.fenAntes) : new Chess();
  if (naLinha.length > 0) fenFinal.move(naLinha.at(-1)!.san);

  const linha: Linha = {
    id: idDaLinha(corDaPartida, slug, naLinha.map((l) => l.uci)),
    cor: corDaPartida,
    abertura: slug,
    nivel: "avancado",
    nome: tag("Nome") || slug,
    fenInicial: new Chess().fen(),
    fenFinal: fenFinal.fen(),
    lances: naLinha.map((l) => l.uci),
    sans: naLinha.map((l) => l.san),
    meus,
    alternativas: {},
    errosNomeados: {},
    ...(Object.keys(marcas).length > 0 ? { marcas } : {}),
    comentarios: Object.fromEntries(
      Object.entries(comentarios).filter(([ply]) => Number(ply) < naLinha.length),
    ),
    plano: {},
    fonte: tag("Fonte") || slug,
  };

  return {
    problemas,
    partida: {
      slug,
      nome: tag("Nome") || slug,
      nivel,
      ordem,
      cor: corDaPartida,
      tema: tag("Tema"),
      status: STATUS.includes(status) ? status : "rascunho",
      fonteSlug: tag("FonteSlug"),
      fonte: tag("Fonte"),
      brancas: tag("White"),
      pretas: tag("Black"),
      ano: tag("Date").slice(0, 4),
      resultado: tag("Result"),
      lances,
      nags,
      autorias,
      lancesNossos: meus.length,
      linha,
      ficha: lida.data,
    },
  };
}

/** `13.Rxd7` → meio-lance 24; `12...O-O` → 23. `null` se não for essa forma. */
export function plyDoLance(lance: string): { ply: number; san: string } | null {
  const casou = /^(\d+)(\.\.\.|\.)(\S+)$/.exec(lance);
  if (!casou) return null;
  return { ply: (Number(casou[1]) - 1) * 2 + (casou[2] === "..." ? 1 : 0), san: casou[3] };
}
