/**
 * Jogar do lado do aluno até o fim — fatia 10, parada 10G.
 *
 * O ensaio não lê a store do aluno: ele olha o tabuleiro como uma pessoa olha. O lance que o outro lado
 * jogou é o par de casas marcado como último lance (`square.last-move` do chessground); quem saiu é a
 * casa onde havia peça do outro lado. Um `Chess` local acompanha a partida para escolher o lance
 * seguinte — o do Stockfish em Node (`scripts/motor.ts`), na prática.
 */
import type { Locator, Page } from "@playwright/test";
import { Chess } from "chess.js";
import { prepararMotor, Motor } from "../../scripts/motor.ts";
import { jogar } from "./tabuleiro.ts";

async function casasMarcadas(alvo: Locator): Promise<string[]> {
  return alvo.evaluate((wrap) => {
    const tabuleiro = wrap.querySelector("cg-board");
    if (!tabuleiro) return [];
    const lado = tabuleiro.getBoundingClientRect().width / 8;
    const preta = wrap.className.includes("orientation-black");
    return Array.from(tabuleiro.querySelectorAll<HTMLElement>("square.last-move")).map((casa) => {
      const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(casa.style.transform);
      const x = Math.round(Number(m?.[1] ?? 0) / lado);
      const y = Math.round(Number(m?.[2] ?? 0) / lado);
      const coluna = preta ? 7 - x : x;
      const linha = preta ? y : 7 - y;
      return `${"abcdefgh"[coluna]}${linha + 1}`;
    }).sort();
  });
}

/**
 * Joga `uci` e espera a resposta do outro lado. Devolve o lance respondido (UCI), ou `null` se a
 * partida acabou no lance do aluno ou ninguém respondeu no prazo.
 */
export async function jogarEsperarResposta(pagina: Page, alvo: Locator, jogo: Chess, uci: string, prazoMs = 20_000): Promise<string | null> {
  const lance = jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  await jogar(pagina, uci, alvo);
  if (jogo.isGameOver()) return null;
  const meu = [lance.from, lance.to].sort().join();
  const limite = Date.now() + prazoMs;
  while (Date.now() < limite) {
    await pagina.waitForTimeout(250);
    const casas = await casasMarcadas(alvo);
    if (casas.length !== 2 || casas.join() === meu) continue;
    const vez = jogo.turn();
    const de = casas.find((casa) => jogo.get(casa as never)?.color === vez);
    const para = casas.find((casa) => casa !== de);
    if (!de || !para) continue;
    const resposta = jogo.moves({ verbose: true }).find((m) => m.from === de && m.to === para);
    if (!resposta) continue;
    jogo.move(resposta);
    return resposta.from + resposta.to + (resposta.promotion ?? "");
  }
  return null;
}

/** A prática inteira, com o Stockfish em Node escolhendo os lances do aluno. Devolve os meios-lances. */
export async function jogarPraticaComMotor(pagina: Page, alvo: Locator, fen: string, maxLances = 60): Promise<{ lances: string[]; fim: string }> {
  const motor = new Motor(prepararMotor());
  await motor.abrir(1);
  const jogo = new Chess(fen);
  const lances: string[] = [];
  try {
    for (let i = 0; i < maxLances && !jogo.isGameOver(); i += 1) {
      const [melhor] = await motor.pensar(`fen ${jogo.fen()}`, 14);
      const uci = melhor?.pv.split(" ")[0];
      if (!uci) break;
      lances.push(uci);
      const resposta = await jogarEsperarResposta(pagina, alvo, jogo, uci);
      if (resposta) lances.push(resposta);
      else if (!jogo.isGameOver()) break;
    }
  } finally {
    motor.fechar();
  }
  return { lances, fim: jogo.isCheckmate() ? "mate" : jogo.isDraw() ? "empate" : "inacabada" };
}
