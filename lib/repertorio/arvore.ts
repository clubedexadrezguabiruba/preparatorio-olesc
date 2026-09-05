import { Chess } from "chess.js";
import type { LancePgn, PartidaPgn } from "./pgn.ts";
import { idDaLinha, meiosLances, type Cor, type Linha, type Nivel } from "./linhas.ts";

/**
 * De árvore de PGN para linhas de treino.
 *
 * **A regra que organiza tudo:** um ramo é uma escolha, e quem escolhe muda o
 * que o ramo significa.
 *
 * - Ramo num lance **do adversário** → cada alternativa vira **uma linha
 *   própria**. Ele pode jogar qualquer uma, e o aluno precisa saber responder a
 *   todas.
 * - Ramo num lance **nosso** → **não** vira linha. Duas linhas que só diferem
 *   no nosso lance ensinariam respostas contraditórias para a mesma posição. O
 *   lance da linha principal é o treinado; os irmãos são classificados (abaixo)
 *   e não geram treino.
 *
 * ## A classificação dos irmãos nossos — e por que ela é o contrário do plano
 *
 * O plano dizia: "só irmão sem marca, `!` ou `!?` é alternativa aceita". Medido
 * nos 20 arquivos de fonte importados: **33 irmãos nossos não têm marca nenhuma**,
 * e vários
 * deles são lances que o próprio autor chama de piores — **em prosa, não em
 * NAG**. Exemplos reais: `PGN for Pirc Defense.pgn` traz
 * `4. Bc4 $1 ({Why 4.Nf3 is worse?} 4. Nf3)`, e `countering the English.pgn`
 * traz `2... g6 $1 (2... Nc6 {Why don't we start with 2...Nc6?})`. Pela regra do
 * plano os dois virariam resposta aceita, e o treinador diria "certo" para o
 * lance que a fonte desaconselha.
 *
 * Então o padrão é invertido, e o silêncio deixa de ser consentimento:
 *
 * - marca **boa** explícita (`!`, `!!`, `!?`, `$1`, `$3`, `$5`) → alternativa
 *   aceita: o treinador aceita, mas não cobra;
 * - marca **ruim** (`?`, `??`, `?!`, `$2`, `$4`, `$6`) → **erro nomeado**: nunca
 *   aceito, e guardado para o treinador dar o aviso certo quando o aluno cair
 *   nele. Sem esta regra, `6.Qd5?` — que o Krikor mostra de propósito para
 *   ensinar que é ruim — viraria resposta certa;
 * - **sem marca** → não é aceito e não é erro: vira **aviso** no relatório da
 *   importação, e quem decide é a pessoa que revisa o rascunho.
 *
 * Para crianças de 1000–1400 num treinador de "repetir até acertar 3×", uma
 * posição tem **uma** resposta. Alternativa aceita é exceção, e exceção precisa
 * estar escrita.
 *
 * ## O que este arquivo não decide
 *
 * Legalidade e SAN canônico são da `chess.js`: o que vai para o JSON é o SAN que
 * ela devolve, nunca o texto do autor. Um SAN que ela recusa vira **problema com
 * o lance nomeado** e derruba só aquele ramo — meia árvore aproveitável é melhor
 * que nenhuma, e a pessoa conserta vendo qual lance quebrou.
 */

export type Cabecalho = {
  abertura: string;
  nome: string;
  cor: Cor;
  nivel: Nivel;
  fonte: string;
  /** De onde a partida começa. Padrão: a posição inicial. */
  fen?: string;
};

export type TipoDeAviso =
  | "irmao-sem-marca"
  | "erro-do-adversario-sem-refutacao"
  | "termina-no-adversario"
  | "termina-em-pergunta"
  | "acima-da-profundidade";

export type Aviso = { tipo: TipoDeAviso; onde: string; detalhe: string };

export type Expansao = { linhas: Linha[]; avisos: Aviso[]; problemas: string[] };

const NAGS_BONS = new Set(["!", "!!", "!?", "$1", "$3", "$5"]);
const NAGS_RUINS = new Set(["?", "??", "?!", "$2", "$4", "$6"]);

/** Basta ter `nags`: serve tanto para o nó do PGN quanto para o passo do caminho. */
type Anotado = { nags: readonly string[] };

const temMarcaBoa = (l: Anotado): boolean => l.nags.some((n) => NAGS_BONS.has(n));
const temMarcaRuim = (l: Anotado): boolean => l.nags.some((n) => NAGS_RUINS.has(n));

/**
 * O comentário é uma pergunta de "homework"?
 *
 * Os draft do ChessMood param em perguntas em vez de dar o lance ("Do you
 * remember what we play here? Check out the advanced section"). Reconhecer isso
 * é o que separa "a fonte tem um buraco aqui" de "a fonte acaba aqui", e é o
 * número que o relatório da importação precisa dar.
 *
 * As marcações de tabuleiro saem antes do teste porque `[%cal …]` e `[#]` não
 * são prosa — e porque `[#]` sozinho não é pergunta nenhuma.
 */
export function ehPergunta(comentario: string | null): boolean {
  if (!comentario) return false;
  const prosa = comentario.replace(/\[[^\]]*\]/g, " ").trim();
  if (prosa === "") return false;
  if (prosa.includes("?")) return true;
  return /\b(do you remember|check out|what do we play|how do we|what is the|why)\b/i.test(prosa);
}

/** `e2e4` a partir do que a chess.js devolveu. */
const uciDe = (m: { from: string; to: string; promotion?: string }): string =>
  `${m.from}${m.to}${m.promotion ?? ""}`;

/** Nossa vez? As brancas jogam nos meios-lances pares (0, 2, 4…). */
const ehMeu = (ply: number, cor: Cor): boolean => (ply % 2 === 0) === (cor === "brancas");

/** `8...Bc5 9.Be3` — como a linha aparece na lista do aluno. */
function nomearLinha(base: string, sans: readonly string[], quantos = 3): string {
  const inicio = Math.max(0, sans.length - quantos);
  const partes: string[] = [];
  for (let i = inicio; i < sans.length; i++) {
    const numero = Math.floor(i / 2) + 1;
    if (i % 2 === 0) partes.push(`${numero}.${sans[i]}`);
    else if (i === inicio) partes.push(`${numero}...${sans[i]}`);
    else partes.push(sans[i]);
  }
  return `${base} — ${partes.join(" ")}`;
}

type Passo = { uci: string; san: string; comentario: string | null; nags: string[] };

/**
 * Expande a árvore de um PGN nas linhas que o treinador vai cobrar.
 *
 * Devolve **todas** as pontas, inclusive as que terminam em lance do adversário
 * — elas saem como linha e como aviso, e quem as reprova é `validarBanco`. É de
 * propósito: no rascunho recém-importado essas pontas são a lista de trabalho a
 * fazer; no PGN revisado à mão elas são erro. A mesma função serve aos dois
 * momentos porque a regra mora num lugar só.
 */
export function expandir(partida: PartidaPgn, cabecalho: Cabecalho): Expansao {
  const linhas: Linha[] = [];
  const avisos: Aviso[] = [];
  const problemas: string[] = [];

  const fenInicial = cabecalho.fen ?? partida.tags.FEN ?? new Chess().fen();
  const jogo = new Chess();
  try {
    jogo.load(fenInicial);
  } catch (erro) {
    return { linhas, avisos, problemas: [`a posição de partida não é válida: ${String(erro)}`] };
  }

  const caminho: Passo[] = [];
  /** Alternativas aceitas e erros nomeados, por meio-lance do caminho atual. */
  const alternativas = new Map<number, string[]>();
  const errosNomeados = new Map<number, string[]>();
  const teto = meiosLances(cabecalho.nivel, cabecalho.cor);

  /** Onde estou, em texto, para o erro dizer alguma coisa útil. */
  const ondeEstou = (): string =>
    caminho.length === 0 ? "no começo" : `depois de ${caminho.map((p) => p.san).join(" ")}`;

  /** Joga um SAN e devolve o lance da chess.js, ou `null` se não é legal. */
  function jogar(san: string): { san: string; uci: string } | null {
    try {
      const feito = jogo.move(san);
      return { san: feito.san, uci: uciDe(feito) };
    } catch {
      return null;
    }
  }

  /** Chegou numa ponta: vira linha. */
  function emitir(): void {
    if (caminho.length === 0) return;
    const ultimo = caminho.length - 1;
    const lances = caminho.map((p) => p.uci);
    const sans = caminho.map((p) => p.san);
    const meus: number[] = [];
    const comentarios: Record<string, string> = {};
    for (const [i, passo] of caminho.entries()) {
      if (ehMeu(i, cabecalho.cor)) meus.push(i);
      if (passo.comentario) comentarios[String(i)] = passo.comentario;
    }

    const comoTexto = (m: Map<number, string[]>): Record<string, string[]> =>
      Object.fromEntries([...m].filter(([i]) => i < caminho.length).map(([i, v]) => [String(i), v]));

    const ponta = caminho[ultimo];
    const nome = nomearLinha(cabecalho.nome, sans);

    if (!ehMeu(ultimo, cabecalho.cor)) {
      avisos.push({
        tipo: "termina-no-adversario",
        onde: nome,
        detalhe: `a ponta é "${ponta.san}", lance do adversário — falta a nossa resposta`,
      });
      if (temMarcaRuim(ponta)) {
        avisos.push({
          tipo: "erro-do-adversario-sem-refutacao",
          onde: nome,
          detalhe: `"${ponta.san}" está marcado como erro dele e a punição não está escrita`,
        });
      }
    }
    if (ehPergunta(ponta.comentario)) {
      avisos.push({ tipo: "termina-em-pergunta", onde: nome, detalhe: ponta.comentario ?? "" });
    }
    if (caminho.length > teto) {
      avisos.push({
        tipo: "acima-da-profundidade",
        onde: nome,
        detalhe: `${caminho.length} meios-lances; o nível ${cabecalho.nivel} vai até ${teto}`,
      });
    }

    linhas.push({
      id: idDaLinha(cabecalho.cor, cabecalho.abertura, lances),
      cor: cabecalho.cor,
      abertura: cabecalho.abertura,
      nivel: cabecalho.nivel,
      nome,
      fenInicial,
      fenFinal: jogo.fen(),
      lances,
      sans,
      meus,
      alternativas: comoTexto(alternativas),
      errosNomeados: comoTexto(errosNomeados),
      comentarios,
      fonte: cabecalho.fonte,
    });
  }

  /**
   * Classifica um irmão de lance **nosso**: ele não vira linha, vira rótulo no
   * meio-lance em que apareceu. Só o primeiro lance do irmão interessa — o resto
   * da variação dele é continuação de um lance que não vamos treinar.
   */
  function classificarIrmao(irmao: LancePgn, ply: number, principal: string): void {
    const feito = jogar(irmao.san);
    if (!feito) {
      problemas.push(`"${irmao.san}" não é lance legal ${ondeEstou()}`);
      return;
    }
    jogo.undo();

    if (temMarcaRuim(irmao)) {
      errosNomeados.set(ply, [...(errosNomeados.get(ply) ?? []), feito.uci]);
    } else if (temMarcaBoa(irmao)) {
      alternativas.set(ply, [...(alternativas.get(ply) ?? []), feito.uci]);
    } else {
      avisos.push({
        tipo: "irmao-sem-marca",
        onde: `${cabecalho.nome} ${ondeEstou()}`,
        detalhe: `"${feito.san}" é irmão de "${principal}" sem marca nenhuma — ` +
          "não vira alternativa aceita; a revisão decide se entra",
      });
    }
  }

  /** Anda por uma lista de lances, com as variações que penduram nela. */
  function andar(lances: LancePgn[]): void {
    if (lances.length === 0) {
      emitir();
      return;
    }

    let jogados = 0;
    const marcados: number[] = [];

    for (const no of lances) {
      const ply = caminho.length;
      const meu = ehMeu(ply, cabecalho.cor);
      // Anotado antes de jogar: se o lance for ilegal e a lista morrer aqui, os
      // rótulos que os irmãos deixaram neste meio-lance ainda têm de ser limpos.
      marcados.push(ply);

      // As variações penduram no lance que elas **substituem**, então são
      // resolvidas com o tabuleiro ainda na posição de antes de jogá-lo.
      for (const variacao of no.variacoes) {
        if (variacao.length === 0) continue;
        if (meu) classificarIrmao(variacao[0], ply, no.san);
        else andar(variacao);
      }

      const feito = jogar(no.san);
      if (!feito) {
        problemas.push(`"${no.san}" não é lance legal ${ondeEstou()}`);
        break;
      }
      caminho.push({ uci: feito.uci, san: feito.san, comentario: no.comentario, nags: no.nags });
      jogados += 1;
    }

    if (jogados > 0) emitir();

    // Desfaz o que esta lista empilhou, para o irmão de cima começar da mesma
    // posição em que esta começou.
    for (let i = 0; i < jogados; i++) {
      jogo.undo();
      caminho.pop();
    }
    for (const ply of marcados) {
      alternativas.delete(ply);
      errosNomeados.delete(ply);
    }
  }

  andar(partida.lances);
  return { linhas, avisos, problemas };
}
