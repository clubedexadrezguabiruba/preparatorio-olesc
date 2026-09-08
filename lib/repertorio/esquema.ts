import type { Cor } from "./linhas.ts";

/**
 * O bloco `[%plano]` — o que a linha **não** fechou até o teto, dito no PGN.
 *
 * ## Por que isto existe
 *
 * A regra de término do repertório (§24 de `docs/REVISAO-FONTES.md`) é que uma
 * linha só acaba quando o aluno rocou e nenhuma peça menor dele está na casa de
 * origem. Nem toda linha fecha dentro do teto de 14 lances nossos — e quando
 * não fecha, a saída **não** é encurtar a régua nem esticar a linha inventando
 * lance: é o autor declarar, por escrito, o que ficou faltando e por quê.
 *
 * Um `[%plano]` é isso: uma promessa nomeada. "O bispo de c1 vai para b2, e só
 * sai depois do b3." O aluno lê no fim da linha, vê a seta no tabuleiro, e sai
 * da abertura sabendo o endereço de cada peça que ainda não saiu — que é o que
 * a linha ensinaria se coubesse.
 *
 * ## A forma, e por que ela é assim
 *
 * No comentário do último lance, depois da prosa:
 *
 * ```
 * 14. Qe2 {… prosa normal …
 * [%plano
 * c1>b2: só sai depois do b3, quando o …e5 dele tiver fechado a diagonal de f4
 * ]}
 * ```
 *
 * `origem>destino: motivo` para peça; `O-O:`, `O-O-O:` ou `rei-fica:` para o
 * rei. Uma entrada por linha; linha sem cabeça é continuação do motivo de cima.
 *
 * **O que não pode aparecer dentro do bloco:** `]`, `}` e aspas duplas. Não é
 * gosto — são os limites do leitor de PGN (`pgn.ts`, a varredura): o comentário
 * é `{[^}]*}` e o bloco termina no primeiro `]`. Um `}` no motivo cortaria o
 * comentário no meio; um `]` fecharia o bloco antes da hora.
 *
 * ## Por que a prosa sai daqui limpa
 *
 * O bloco é retirado do texto antes de o comentário virar `comentarios[i]`.
 * Duas consequências, e as duas são o motivo de esta função existir separada:
 *
 * 1. o gate "o último lance está sem comentário" continua valendo sobre a
 *    **prosa** — um comentário que fosse só o bloco não passaria a valer como
 *    comentário escrito;
 * 2. `ehPergunta` não se engana com um `?` que apareça dentro de um motivo.
 *
 * Puro e sem estado: recebe texto e cor, devolve texto, plano e erros. A cor
 * entra porque `O-O` só vira casa (`g1` ou `g8`) sabendo de quem é o rei — e é
 * a casa que a tela usa para desenhar a seta.
 */

/** Uma promessa: para onde a peça vai, e por que ela ainda não foi. */
export type EntradaDePlano = { casa: string | null; motivo: string };

/** Chave: a casa de origem da peça menor (`c8`) ou `rei`. */
export type Plano = Record<string, EntradaDePlano>;

export type Separado = {
  /** O comentário sem o bloco. `null` quando não sobrou prosa nenhuma. */
  prosa: string | null;
  plano: Plano;
  /** Sintaxe torta. Quem transforma em problema de compilação é `arvore.ts`. */
  erros: string[];
};

const ABRE = "[%plano";

/** `O-O` para as brancas é o rei em g1; para as pretas, em g8. */
function casaDoRoque(cabeca: string, cor: Cor): string | null {
  const fila = cor === "brancas" ? "1" : "8";
  if (cabeca === "O-O") return `g${fila}`;
  if (cabeca === "O-O-O") return `c${fila}`;
  return null; // rei-fica
}

const CASA = /^[a-h][1-8]$/;

/**
 * Tira o bloco `[%plano]` do comentário e lê o que estava dentro.
 *
 * Sem bloco, devolve o comentário como veio e um plano vazio — o caso de 99 %
 * das linhas, e o que mantém esta função barata de chamar em todo lance.
 */
export function separarPlano(comentario: string | null, cor: Cor): Separado {
  if (!comentario || !comentario.includes(ABRE)) {
    const prosa = comentario?.trim() ? comentario : null;
    return { prosa, plano: {}, erros: [] };
  }

  const erros: string[] = [];
  const inicio = comentario.indexOf(ABRE);
  const fim = comentario.indexOf("]", inicio);
  if (fim < 0) {
    erros.push("o bloco [%plano abriu e não fechou — falta o ] no fim");
    return { prosa: comentario.slice(0, inicio).trim() || null, plano: {}, erros };
  }

  const dentro = comentario.slice(inicio + ABRE.length, fim);
  const prosa = `${comentario.slice(0, inicio)} ${comentario.slice(fim + 1)}`.trim();

  const plano: Plano = {};
  let ultima: string | null = null;

  for (const bruta of dentro.split("\n")) {
    const linha = bruta.trim();
    if (linha === "") continue;

    const dePeca = /^([a-h][1-8])\s*>\s*([a-h][1-8])\s*:\s*(.*)$/.exec(linha);
    const deRei = /^(O-O-O|O-O|rei-fica)\s*:\s*(.*)$/.exec(linha);

    if (dePeca) {
      const [, origem, destino, motivo] = dePeca;
      if (plano[origem]) erros.push(`o plano fala duas vezes da peça de ${origem}`);
      plano[origem] = { casa: destino, motivo: motivo.trim() };
      ultima = origem;
      continue;
    }
    if (deRei) {
      const [, cabeca, motivo] = deRei;
      if (plano.rei) erros.push("o plano fala duas vezes do rei");
      plano.rei = { casa: casaDoRoque(cabeca, cor), motivo: motivo.trim() };
      ultima = "rei";
      continue;
    }

    // Sem cabeça: é continuação do motivo de cima. Antes da primeira cabeça,
    // não é continuação de nada — é erro de digitação, e calar aqui perderia o
    // texto do professor sem ninguém ver.
    if (ultima === null) {
      erros.push(
        `"${linha}" está dentro do [%plano] antes de qualquer entrada. ` +
          "Cada entrada começa com origem>destino:, O-O:, O-O-O: ou rei-fica:.",
      );
      continue;
    }
    // Uma cabeça mal escrita (`c1 > b2` sem casa válida, `O-O` sem os dois
    // pontos) viraria continuação silenciosa do motivo anterior. O sinal de que
    // alguém TENTOU abrir entrada é o `:` antes de qualquer espaço de prosa.
    const pareceCabeca = /^[^\s:]{1,7}\s*:/.exec(linha);
    if (pareceCabeca) {
      erros.push(
        `"${linha}" parece uma entrada do [%plano] com a cabeça errada. ` +
          "Use origem>destino: (casas como c1>b2), O-O:, O-O-O: ou rei-fica:.",
      );
      continue;
    }
    plano[ultima] = {
      casa: plano[ultima].casa,
      motivo: `${plano[ultima].motivo} ${linha}`.trim(),
    };
  }

  if (Object.keys(plano).length === 0) {
    erros.push("o bloco [%plano] está vazio — ou escreva uma entrada, ou tire o bloco");
  }

  return { prosa: prosa || null, plano, erros };
}

/** A casa é escura? `a1` é escura, e daí em diante alterna. */
export function casaEscura(casa: string): boolean {
  const coluna = casa.charCodeAt(0) - 97;
  const fila = Number(casa[1]);
  return (coluna + fila) % 2 === 1;
}

/** Só para a mensagem de erro: `c1` é casa de tabuleiro? */
export const ehCasa = (texto: string): boolean => CASA.test(texto);
