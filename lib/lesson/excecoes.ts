import { createHash } from "node:crypto";
import type { Lesson } from "./schema.ts";

/**
 * A última palavra é do professor — **por ponto, e não por aula**.
 *
 * ## O problema
 *
 * A tablebase é um juiz externo e certo: em finais de até 7 peças ela sabe o
 * resultado. Mas ela não sabe *ensinar*, e há casos em que o Doug quer publicar
 * assim mesmo — uma posição fora do alcance dela, ou uma divergência que ele
 * assume por escrito. Sem uma saída, ele teria duas: mentir no arquivo, ou
 * desligar o juiz. As duas são piores do que a exceção.
 *
 * ## Por que a exceção caduca
 *
 * Uma exceção "esta aula pode" seria um cheque em branco: o erro ficaria
 * perdoado para sempre, inclusive depois de alguém mudar a posição ou o lance
 * que a exceção descrevia. **O Doug decidiu sobre o que viu.**
 *
 * Por isso cada exceção carrega três coisas: o `codigo` do erro, o `alvo` (a
 * posição ou o passo do roteiro) e o `hash` do que estava ali no momento da
 * decisão. O gate rebaixa a aviso só o erro cujos três casam. Se o hash não
 * casar, a exceção **caduca** — vira o aviso `EXCECAO_CADUCA` e o erro volta a
 * bloquear, para alguém olhar de novo.
 *
 * ## O que entra no hash
 *
 * - Alvo `pos-…`: a FEN da posição. Mudou a FEN, é outro diagrama.
 * - Alvo `roteiro[i]`: a FEN da posição **mais** o passo inteiro, serializado.
 *   O passo carrega o lance, a fala e o desenho; qualquer mudança neles muda o
 *   ponto sobre o qual a decisão foi tomada.
 *
 * O hash não é segredo nem assinatura — ninguém está tentando enganar ninguém.
 * Ele é uma resposta a "isto ainda é aquilo?".
 *
 * ## Este arquivo não roda no navegador
 *
 * Ele importa `node:crypto`, e isso é deliberado: quem calcula o hash é o
 * **servidor**, na ação que cria a exceção. Um hash calculado no navegador e
 * outro conferido pelo gate seriam duas contas sobre a mesma pergunta, prontas
 * para divergir num detalhe de serialização — e a divergência apareceria como
 * uma exceção que caduca sozinha, sem ninguém ter mexido em nada.
 */

export type Excecao = {
  codigo: string;
  alvo: string;
  hash: string;
  motivo: string;
  em: string;
};

export type Veredito =
  | { tipo: "erro" }
  | { tipo: "aviso"; motivo: string }
  | { tipo: "caduca"; excecao: Excecao };

/** O alvo escondido numa string `where` do gate, ou `null`. */
export function alvoDoOnde(onde: string): string | null {
  const roteiro = /roteiro\[(\d+)\]/.exec(onde);
  if (roteiro) return `roteiro[${roteiro[1]}]`;
  const posicao = /\bpos-[a-z0-9-]+/.exec(onde);
  if (posicao) return posicao[0];
  return null;
}

/**
 * O hash do que estava no alvo, agora.
 *
 * Devolve `null` quando o alvo não existe mais — o passo foi apagado, a posição
 * trocou de id. Um alvo que sumiu não pode casar com exceção nenhuma, e o
 * chamador trata isso como caducidade, não como perdão.
 */
export function hashDoAlvo(
  lesson: Lesson,
  fenDaPosicao: (positionId: string) => string | null,
  alvo: string,
): string | null {
  if (alvo.startsWith("pos-")) {
    const fen = fenDaPosicao(alvo);
    return fen ? sha(fen) : null;
  }

  const passo = /^roteiro\[(\d+)\]$/.exec(alvo);
  if (!passo) return null;

  const objective = lesson.stages.objective;
  if (!objective) return null;
  const alvoDoPasso = objective.roteiro[Number(passo[1])];
  if (!alvoDoPasso) return null;

  const fen = fenDaPosicao(objective.positionId);
  if (!fen) return null;

  // A FEN e o passo inteiro. O passo carrega o lance — que é o que a decisão do
  // professor sobre a tablebase quase sempre é sobre.
  return sha(`${fen}\n${JSON.stringify(alvoDoPasso)}`);
}

/**
 * Este erro está perdoado?
 *
 * A ordem importa: procura-se a exceção pelo par `(codigo, alvo)` primeiro, e
 * só então se confere o hash. Assim uma exceção com hash velho **aparece** como
 * caduca, em vez de simplesmente não casar e sumir — o professor precisa saber
 * que a decisão dele ficou para trás, não descobrir um erro novo que nunca viu.
 */
export function julgarComExcecoes(
  excecoes: readonly Excecao[] | undefined,
  codigo: string,
  onde: string,
  hashAgora: string | null,
): Veredito {
  const alvo = alvoDoOnde(onde);
  if (!alvo || !excecoes) return { tipo: "erro" };

  const dela = excecoes.find((e) => e.codigo === codigo && e.alvo === alvo);
  if (!dela) return { tipo: "erro" };
  if (hashAgora !== null && dela.hash === hashAgora) {
    return { tipo: "aviso", motivo: dela.motivo };
  }
  return { tipo: "caduca", excecao: dela };
}

/**
 * Quais códigos podem ser perdoados.
 *
 * **A lista é curta de propósito.** O que o professor pode assumir é uma
 * divergência com o juiz externo — a tablebase —, e nada mais. Lance ilegal,
 * roteiro que não fecha, FEN impossível: isso não é opinião, é erro de
 * digitação, e perdoá-lo publicaria uma aula quebrada.
 */
export const CODIGOS_COM_EXCECAO = [
  /** A posição tem mais de 7 peças: não há juiz. */
  "TABLEBASE_FORA_DE_ALCANCE",
  /** A tablebase discorda do `expectedResult` declarado. */
  "RESULTADO_ERRADO",
  /** A linha do método não ganha, segundo a tablebase. */
  "METODO_NAO_GANHA",
] as const;

export function aceitaExcecao(codigo: string): boolean {
  return (CODIGOS_COM_EXCECAO as readonly string[]).includes(codigo);
}

function sha(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex").slice(0, 32);
}
