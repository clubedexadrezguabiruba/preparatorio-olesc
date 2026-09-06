import { Chess } from "chess.js";

/**
 * O que se lê e o que se escreve ao conversar com o motor — sem o motor.
 *
 * Estas funções eram do `scripts/motor-repertorio.ts`, e saíram de lá por um
 * motivo só: **um script não tem teste**. Ele tem efeitos no topo (`process.argv`,
 * um `await` solto), então importá-lo de um teste faria o teste tentar rodar o
 * Stockfish. Aqui elas são funções puras, e o `npm test` as cobre.
 *
 * O que ficou no script é o que precisa de processo: a cópia executável da
 * build, o `spawn`, a conversa UCI. **Nunca importe do script** — importe daqui.
 *
 * As três armadilhas de rodar aquela build no node estão escritas no cabeçalho
 * dele, e continuam valendo. A terceira é a que este arquivo defende: *lance
 * ilegal o Stockfish engole em silêncio*, e responde com convicção sobre outra
 * posição. `paraUci` é o portão — ela estoura no primeiro lance que a `chess.js`
 * recusar, nomeando o lance e a posição.
 */

export type Vez = "brancas" | "pretas";

/** Uma variante que o motor devolveu: a avaliação e a linha principal em UCI. */
export type Variante = { centesimos: number | null; pv: string };

/* ------------------------------------------------------------------ *
 * Os lances
 * ------------------------------------------------------------------ */

/** Só as letras que mudam. Bispo é `B` nas duas línguas. */
const PECAS_EM_PORTUGUES: Record<string, string> = { C: "N", D: "Q", T: "R" };

/** `Cf3` vira `Nf3`. `null` quando não há o que traduzir. */
function emIngles(token: string): string | null {
  const traduzida = PECAS_EM_PORTUGUES[token[0]];
  return traduzida === undefined ? null : traduzida + token.slice(1);
}

/**
 * De texto para UCI, passando pela `chess.js`.
 *
 * Aceita SAN inglês (`1.e4 c5 2.Bc4`), SAN português (`2.Bc4 Cc6 3.Df3`), UCI
 * (`e2e4 c7c5 f1c4`) e os três misturados, e descarta número de lance, pontos e
 * resultado. Estoura no primeiro lance que a `chess.js` recusar — que é
 * exatamente o contrário do que o Stockfish faz.
 *
 * **O português é tentado só depois de o inglês falhar**, e há um caso em que os
 * dois valem: `R`. Em inglês é torre, em português é rei. Ganha o inglês, que é
 * a língua da `chess.js` e do resto do projeto. Não é armadilha silenciosa: a
 * saída imprime sempre o SAN **canônico** do que foi entendido, então um `Rg1`
 * lido como torre aparece na tela como torre.
 */
export function paraUci(texto: string): { uci: string[]; sans: string[]; vez: Vez } {
  const jogo = new Chess();
  const uci: string[] = [];
  const sans: string[] = [];

  for (const bruto of texto.split(/\s+/).filter(Boolean)) {
    const token = bruto.replace(/^\d+\.+/, "");
    if (token === "" || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;

    const comoUci = /^([a-h][1-8])([a-h][1-8])([qrbn]?)$/.exec(token);
    type Pedido = Parameters<Chess["move"]>[0];
    const tentar = (lance: Pedido): ReturnType<Chess["move"]> | null => {
      try {
        return jogo.move(lance);
      } catch {
        return null;
      }
    };

    const feito = comoUci
      ? tentar({ from: comoUci[1], to: comoUci[2], promotion: comoUci[3] || undefined })
      : (tentar(token) ?? tentar(emIngles(token) ?? token));

    if (!feito) {
      throw new Error(
        `"${token}" não é lance legal depois de ${sans.join(" ") || "nada"}.\n` +
          "Tentei em inglês e em português. O Stockfish descartaria este lance em " +
          "silêncio e responderia com convicção sobre outra posição.",
      );
    }
    uci.push(`${feito.from}${feito.to}${feito.promotion ?? ""}`);
    sans.push(feito.san);
  }

  return { uci, sans, vez: jogo.turn() === "w" ? "brancas" : "pretas" };
}

/* ------------------------------------------------------------------ *
 * Apresentação
 * ------------------------------------------------------------------ */

/**
 * Do ponto de vista de quem tem a vez para o das brancas.
 *
 * O UCI devolve a avaliação sempre do lado que joga. Aqui ela é normalizada
 * para as **brancas**, que é a convenção de qualquer livro — e foi trocar esse
 * sinal de cabeça que quase pôs uma avaliação invertida no documento.
 */
export function paraBrancas(centesimos: number | null, vez: Vez): number | null {
  if (centesimos === null) return null;
  return vez === "brancas" ? centesimos : -centesimos;
}

/**
 * "pretas +0,67", "igual", "mate à vista".
 *
 * O corte de 25 centésimos é o que separa "igual" de "alguém está melhor": é a
 * folga em que dois lances do motor são a mesma posição para um aluno de 1200.
 */
export function quemEstaMelhor(brancas: number | null): string {
  if (brancas === null) return "mate à vista";
  if (Math.abs(brancas) < 25) return "igual";
  const lado = brancas > 0 ? "brancas" : "pretas";
  return `${lado} +${(Math.abs(brancas) / 100).toFixed(2).replace(".", ",")}`;
}

/** `e2e4 e7e5` → `1.e4 e5`, para a saída ser legível por quem joga xadrez. */
export function pvEmSan(caminho: readonly string[], pv: string, quantos: number): string {
  const jogo = new Chess();
  const jogar = (lance: string): ReturnType<Chess["move"]> =>
    jogo.move({ from: lance.slice(0, 2), to: lance.slice(2, 4), promotion: lance[4] || undefined });

  for (const lance of caminho) jogar(lance);

  const partes: string[] = [];
  let numeroDoLance = Math.floor(caminho.length / 2) + 1;
  let brancasJogam = caminho.length % 2 === 0;

  for (const lance of pv.split(" ").slice(0, quantos)) {
    let feito;
    try {
      feito = jogar(lance);
    } catch {
      break; // PV truncada pelo motor: mostramos o que deu para ler.
    }
    if (brancasJogam) {
      partes.push(`${numeroDoLance}.${feito.san}`);
    } else {
      partes.push(partes.length === 0 ? `${numeroDoLance}...${feito.san}` : feito.san);
      numeroDoLance += 1;
    }
    brancasJogam = !brancasJogam;
  }

  return partes.join(" ");
}
