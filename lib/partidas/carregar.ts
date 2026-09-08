import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Chess } from "chess.js";
import { idDaLinha, type Cor, type Linha } from "../repertorio/linhas.ts";
import { lerPgn, type PartidaPgn } from "../repertorio/pgn.ts";

/**
 * **ISTO É UM TESTE.** Partidas instrutivas rodando no treinador de lances do
 * repertório, para ver se a experiência serve — não é conteúdo publicado, não
 * grava nada no banco e não passa pelo compilador.
 *
 * ## Por que não passa pelo compilador do repertório
 *
 * `scripts/compilar-repertorio.ts` escreve `public/repertorio/` e o
 * `validarBanco` que ele roda reprova três coisas que uma partida instrutiva
 * tem por natureza:
 *
 * - **profundidade.** `PROFUNDIDADE` limita o Avançado a 12 lances nossos (24
 *   meios-lances). A Partida da Ópera tem 17 lances brancos — 33 meios-lances;
 * - **`nivel`.** O enum é `base | avancado`, e partida instrutiva não é nível
 *   de repertório;
 * - **o id e o índice.** `index.json` é a lista de aberturas que `/aberturas`
 *   desenha, e uma partida entrando ali apareceria como se fosse repertório.
 *
 * Então este carregador lê o PGN **na hora**, no servidor, e monta um objeto
 * `Linha` na memória. A `Linha` é o contrato que `lib/repertorio/passada.ts`
 * consome; o schema Zod só roda em `validarBanco`, que aqui não é chamado. É
 * de propósito: o teste tem de medir o treinador, não a régua do repertório.
 *
 * Sem cache: é teste, e reler um PGN de 3 KB por request é mais barato que uma
 * cópia em memória que fica velha enquanto você edita o arquivo.
 */

const RAIZ = path.join(process.cwd(), "content", "partidas");

export type Partida = {
  slug: string;
  nome: string;
  cor: Cor;
  fonte: string;
  /** O comentário de antes do primeiro lance: a apresentação da partida. */
  resumo: string | null;
  /** Quantos lances **nossos** o aluno vai ter de jogar. */
  lancesNossos: number;
  /** O que o treinador consome. Mesma forma do repertório, sem a régua dele. */
  linha: Linha;
  /** O que ficou torto no PGN, sem derrubar a página. */
  avisos: string[];
};

/** `e2e4` a partir do que a chess.js devolveu. */
const uciDe = (m: { from: string; to: string; promotion?: string }): string =>
  `${m.from}${m.to}${m.promotion ?? ""}`;

/** Nossa vez? As brancas jogam nos meios-lances pares (0, 2, 4…). */
const ehMeu = (ply: number, cor: Cor): boolean => (ply % 2 === 0) === (cor === "brancas");

/**
 * De árvore de PGN para a linha única da partida.
 *
 * **Só a linha principal.** As variações que a fonte pendura (`10...cxb5 (10...
 * Qxb5?? 11.Bxb5+)`) são ignoradas nesta rodada de teste, e cada uma vira um
 * aviso — para você ver, no fim da página, quanta coisa da partida está sendo
 * jogada fora. Se elas se mostrarem essenciais, o lugar de tratá-las é aqui.
 */
function montar(pgn: PartidaPgn, slug: string, arquivo: string): Partida {
  const avisos: string[] = [];
  const tag = (nome: string) => pgn.tags[nome]?.trim() ?? "";

  const cor: Cor = tag("Cor") === "pretas" ? "pretas" : "brancas";
  if (tag("Cor") !== "brancas" && tag("Cor") !== "pretas") {
    avisos.push(`[Cor] ausente ou fora do padrão em ${arquivo}; assumi "brancas".`);
  }

  const jogo = new Chess();
  const fenInicial = pgn.tags.FEN ?? jogo.fen();
  if (pgn.tags.FEN) jogo.load(pgn.tags.FEN);

  const lances: string[] = [];
  const sans: string[] = [];
  const meus: number[] = [];
  const comentarios: Record<string, string> = {};

  for (const [i, no] of pgn.lances.entries()) {
    if (no.variacoes.length > 0) {
      avisos.push(
        `variação em "${no.san}" (meio-lance ${i}) ignorada — o teste joga só a linha principal.`,
      );
    }
    let feito;
    try {
      feito = jogo.move(no.san);
    } catch {
      avisos.push(`"${no.san}" não é lance legal no meio-lance ${i}; a partida para aqui.`);
      break;
    }
    lances.push(uciDe(feito));
    sans.push(feito.san);
    if (ehMeu(i, cor)) meus.push(i);
    if (no.comentario?.trim()) comentarios[String(i)] = no.comentario.trim();
  }

  /*
   * Uma partida que termina em lance **dele** deixaria o aluno olhando o
   * tabuleiro esperando uma vez que não vem. Acontece sempre que a fonte para
   * no lance depois do qual o perdedor abandonou. Corta-se a ponta, com aviso —
   * é a mesma regra do repertório ("toda linha termina num lance nosso"), e a
   * única do compilador que este teste mantém, porque ela não é sobre régua: é
   * sobre a tela não travar.
   */
  while (lances.length > 0 && !meus.includes(lances.length - 1)) {
    avisos.push(`a partida terminava em "${sans.at(-1)}", lance do adversário; cortei a ponta.`);
    lances.pop();
    sans.pop();
    delete comentarios[String(lances.length)];
    jogo.undo();
  }

  const ultimo = String(lances.length - 1);
  if (lances.length > 0 && !comentarios[ultimo]?.trim()) {
    avisos.push("o último lance está sem comentário — é o texto que o aluno lê no fim.");
  }

  return {
    slug,
    nome: tag("Nome") || slug,
    cor,
    fonte: tag("Fonte") || arquivo,
    resumo: pgn.intro?.trim() ? pgn.intro.trim() : null,
    lancesNossos: meus.length,
    avisos,
    linha: {
      id: idDaLinha(cor, slug, lances),
      cor,
      abertura: slug,
      nivel: "avancado",
      nome: tag("Nome") || slug,
      fenInicial,
      fenFinal: jogo.fen(),
      lances,
      sans,
      meus,
      alternativas: {},
      errosNomeados: {},
      comentarios,
      // As partidas comentadas não são repertório: elas não têm régua de
      // término, e por isso nunca declaram plano.
      plano: {},
      fonte: tag("Fonte") || arquivo,
    },
  };
}

async function arquivos(): Promise<string[]> {
  try {
    return (await readdir(RAIZ)).filter((n) => n.toLowerCase().endsWith(".pgn")).sort();
  } catch {
    return [];
  }
}

/** Todas as partidas de `content/partidas/`, na ordem do nome do arquivo. */
export async function listarPartidas(): Promise<Partida[]> {
  const lidas = await Promise.all((await arquivos()).map((n) => carregar(n.replace(/\.pgn$/i, ""))));
  return lidas.filter((p): p is Partida => p !== null);
}

export async function carregar(slug: string): Promise<Partida | null> {
  // O slug vem da URL: sem esta guarda, `../../.env.local` viraria um caminho.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const arquivo = `${slug}.pgn`;
  let texto: string;
  try {
    texto = await readFile(path.join(RAIZ, arquivo), "utf8");
  } catch {
    return null;
  }
  const montada = montar(lerPgn(texto), slug, arquivo);
  return montada.linha.lances.length === 0 ? null : montada;
}
