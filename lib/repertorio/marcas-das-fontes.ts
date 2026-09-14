import { Chess } from "chess.js";
import { lerPgns, type LancePgn } from "./pgn.ts";

/**
 * **O símbolo vai junto com o lance — sempre.** A trava da regra de 14/9/2026.
 *
 * ## O que aconteceu
 *
 * Os rascunhos de `content/repertorio/rascunhos/` guardam os NAGs das fontes por
 * construção (`apenasLances` os mantém). A perda aconteceu depois, na revisão feita
 * à mão, rascunho → `content/repertorio/<cor>-<abertura>.pgn`: o texto do professor
 * foi redigido do zero e as marcas `!`, `?`, `!?` ficaram para trás. Medido em
 * 14/9: dos 27 lances que existiam nos dois lados com marca na fonte, **26 estavam
 * sem ela** no revisado — e o Ótimo do treino dependia justamente dessas marcas.
 * Nenhum portão viu, porque nenhum comparava a fonte com a revisão.
 *
 * O Doug mandou devolver tudo e fixar a regra: a partir daqui, importar ou revisar
 * PGN traz o símbolo junto. A regra escrita está em `AGENTS.md`; esta função é a
 * parte que não depende de alguém lembrar dela.
 *
 * ## As quatro situações de uma marca da fonte
 *
 * Cada lance marcado de um rascunho cai em uma, pela posição (FEN sem os contadores)
 * e pelo lance — e não pelo texto, porque o mesmo lance chega por ordens diferentes:
 *
 * - `faltando`: o lance **está** no repertório e a marca não. É perda pura, e reprova.
 * - `irmaoNossoCortado`: a posição está, é a nossa vez, e o lance marcado não está.
 *   Com marca, um irmão nosso é regra do treino (`!`/`!?` = também vale, `?`/`?!` =
 *   armadilha — ver `arvore.ts`), então cortá-lo muda o que o treino aceita. Reprova.
 * - `ramoDeleCortado`: a posição está, é a vez do adversário, e o lance dele não
 *   está. Devolver exige **linha nova**, que tem de fechar a régua do término
 *   (`fechamentosAbertos` em `linhas.ts`) — decisão de conteúdo. Relatado, não reprova.
 * - `ramoFora`: nem a posição existe no repertório. Relatado, não reprova.
 */

export type FontePgn = { nome: string; texto: string };

export type MarcaDaFonte = {
  /** O rascunho de onde a marca veio. */
  fonte: string;
  /** O lance em SAN canônico, com número: `3.d4`, `2…Nf6`. */
  lance: string;
  /** As marcas da fonte que não chegaram, como vieram (`$1`, `!?`). */
  marcas: string[];
  /** Os lances até a posição, para achar onde ela está. */
  antes: string;
};

export type ConferenciaDeMarcas = {
  faltando: MarcaDaFonte[];
  irmaoNossoCortado: MarcaDaFonte[];
  ramoDeleCortado: MarcaDaFonte[];
  ramoFora: number;
};

/** `$1` e `!` são a mesma marca; compara pelo número. */
const NUMERO: Record<string, string> = { "!": "$1", "?": "$2", "!!": "$3", "??": "$4", "!?": "$5", "?!": "$6" };
const normal = (nag: string): string => NUMERO[nag] ?? nag;

const chave = (fen: string): string => fen.split(" ").slice(0, 4).join(" ");

type Visita = { posicao: string; turno: "w" | "b"; uci: string; san: string; numero: string; nags: string[]; caminho: string[]; cor: string | undefined };

/** Anda por todos os lances de todos os jogos, com as variações. */
function visitar(fontes: readonly FontePgn[], aoVisitar: (v: Visita, fonte: string) => void): void {
  for (const { nome, texto } of fontes) {
    for (const jogo of lerPgns(texto)) {
      const andar = (lances: readonly LancePgn[], fen: string, caminho: string[]): void => {
        const tabuleiro = new Chess(fen);
        const aqui = [...caminho];
        for (const lance of lances) {
          const antes = tabuleiro.fen();
          for (const variacao of lance.variacoes) andar(variacao, antes, aqui);
          let feito;
          try {
            feito = tabuleiro.move(lance.san);
          } catch {
            return; // Lance ilegal é problema do compilador, não desta conferência.
          }
          const [, turno, , , , numero] = antes.split(" ");
          aoVisitar(
            {
              posicao: chave(antes),
              turno: turno as "w" | "b",
              uci: `${feito.from}${feito.to}${feito.promotion ?? ""}`,
              san: feito.san,
              numero: `${numero}${turno === "w" ? "." : "…"}`,
              nags: lance.nags,
              caminho: aqui,
              cor: jogo.tags.Cor,
            },
            nome,
          );
          aqui.push(feito.san);
        }
      };
      try {
        andar(jogo.lances, jogo.tags.FEN ?? new Chess().fen(), []);
      } catch {
        // FEN inválida: idem.
      }
    }
  }
}

/**
 * Compara as marcas dos rascunhos com o repertório revisado.
 *
 * "Nossa vez" é decidida pela tag `[Cor]` do jogo **revisado** que tem a posição: é
 * ele que diz de que lado o aluno está. Uma posição que aparece nas brancas e nas
 * pretas conta como nossa se for nossa em qualquer uma.
 */
export function conferirMarcasDasFontes(
  rascunhos: readonly FontePgn[],
  revisados: readonly FontePgn[],
): ConferenciaDeMarcas {
  const nagsNoRevisado = new Map<string, Set<string>>();
  const nossaVezEm = new Map<string, boolean>();
  visitar(revisados, (v) => {
    const k = `${v.posicao}|${v.uci}`;
    const nags = nagsNoRevisado.get(k) ?? new Set<string>();
    for (const n of v.nags) nags.add(normal(n));
    nagsNoRevisado.set(k, nags);
    const nossa = (v.turno === "w") === (v.cor === "brancas");
    nossaVezEm.set(v.posicao, (nossaVezEm.get(v.posicao) ?? false) || nossa);
  });

  const conferencia: ConferenciaDeMarcas = { faltando: [], irmaoNossoCortado: [], ramoDeleCortado: [], ramoFora: 0 };
  const vistos = new Set<string>();
  visitar(rascunhos, (v, fonte) => {
    if (v.nags.length === 0) return;
    const k = `${v.posicao}|${v.uci}`;
    // A mesma marca repetida em dois rascunhos (a Escocesa tem dois) conta uma vez.
    if (vistos.has(k)) return;
    vistos.add(k);
    const marca = (marcas: string[]): MarcaDaFonte => ({ fonte, lance: `${v.numero}${v.san}`, marcas, antes: v.caminho.join(" ") });

    const noRevisado = nagsNoRevisado.get(k);
    if (noRevisado) {
      const faltam = v.nags.filter((n) => !noRevisado.has(normal(n)));
      if (faltam.length > 0) conferencia.faltando.push(marca(faltam));
      return;
    }
    const nossa = nossaVezEm.get(v.posicao);
    if (nossa === undefined) conferencia.ramoFora += 1;
    else if (nossa) conferencia.irmaoNossoCortado.push(marca(v.nags));
    else conferencia.ramoDeleCortado.push(marca(v.nags));
  });
  return conferencia;
}
