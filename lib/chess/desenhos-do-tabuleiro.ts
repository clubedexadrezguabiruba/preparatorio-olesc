import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import type { Simbolo } from "../repertorio/passada.ts";

/**
 * Os três desenhos do tabuleiro estilo Chess.com (decididos em 14/9/2026): a seta
 * que ensina, pulsando; o símbolo no canto da casa de chegada; e a entrada grande
 * do Brilhante e do Ótimo.
 *
 * ## Por que eles entram pelo `customSvg` do chessground, e não por uma camada nossa
 *
 * O chessground não anima seta nenhuma, e a primeira ideia era uma camada SVG
 * irmã do tabuleiro, como a `.tabuleiro-camada` da caixa do rei. Ela tinha dois
 * defeitos que só apareceriam na mão: a camada é um contexto de empilhamento
 * próprio, então ficaria **por cima da peça arrastada** — o aluno da assistida
 * arrasta o bispo exatamente pelo caminho da seta, e o veria sumir debaixo dela —,
 * e teria de refazer a conta de orientação que o pacote já faz.
 *
 * O `customSvg` de um desenho automático cai em `.cg-custom-svgs`, dentro do
 * próprio contêiner do tabuleiro, no andar 9: acima das peças paradas e da peça
 * animando (8), abaixo da peça arrastada (11). É exatamente onde a seta do
 * Chess.com fica. O pacote posiciona o desenho na casa e o redesenha só quando o
 * texto muda (o `cgHash` inclui o `html`), e por isso a animação CSS de dentro
 * não recomeça a cada `setAutoShapes`.
 *
 * ## A geometria
 *
 * O pacote põe um `<svg width="1" height="1" viewBox="0 0 100 100">` com o canto
 * superior esquerdo no canto da casa (`orig` ou `dest`). Dentro dele **100 é uma
 * casa**, e as medidas abaixo são as da prévia aprovada
 * (`.playwright-mcp/previa-tabuleiro.html`), em casas × 100.
 *
 * As animações não moram aqui: as classes são daqui, os `@keyframes` e a guarda de
 * `prefers-reduced-motion` são de `app/globals.css`, como toda animação do site.
 * Nenhuma delas toca elemento que o chessground escreva — ele só escreve o
 * `transform` do `<g>` de fora. As cores também: cada símbolo leva a classe
 * `simbolo-cor-<veredito>`, e é a folha que a liga ao token.
 */

/** Haste 10/64 de casa, ponta 40/64 de largura e 30/64 de comprimento — as da prévia. */
const HASTE = (10 / 64) * 100;
const PONTA_LARGURA = (40 / 64) * 100;
const PONTA_COMPRIMENTO = (30 / 64) * 100;
/** Quanto a ponta recua no pulso: 14% de uma casa, medido no Chess.com. */
export const RECUO_DO_PULSO = 14;

const n = (x: number): string => String(Math.round(x * 1000) / 1000);

/** Coluna e fila da casa **na tela**, 0–7 a partir do canto de cima à esquerda. */
function naTela(casa: Key, orientacao: Color): { x: number; y: number } {
  const coluna = casa.charCodeAt(0) - 97;
  const fila = Number(casa[1]) - 1;
  return orientacao === "white" ? { x: coluna, y: 7 - fila } : { x: 7 - coluna, y: fila };
}

/**
 * A seta que ensina o lance: `#81B64C` opaco, sem contorno, com a cauda parada no
 * centro da casa de saída e a ponta no centro da de chegada.
 *
 * O pulso encolhe a haste pela cauda (`scaleX` com origem na cauda) e recua a
 * ponta o mesmo tanto — por isso cada seta leva o próprio `--encolhe`: 14 unidades
 * são uma fração diferente de uma haste de uma casa e de uma de seis.
 *
 * Precisa da orientação porque o ângulo é desenhado aqui, e não pelo pacote: com
 * as pretas embaixo, a seta de e2 para e4 aponta para baixo.
 */
export function setaQueEnsina(orig: Key, dest: Key, orientacao: Color): DrawShape {
  const de = naTela(orig, orientacao);
  const para = naTela(dest, orientacao);
  const dx = (para.x - de.x) * 100;
  const dy = (para.y - de.y) * 100;
  const comprimento = Math.hypot(dx, dy);
  const angulo = (Math.atan2(dy, dx) * 180) / Math.PI;
  const corpo = comprimento - PONTA_COMPRIMENTO;
  const encolhe = (corpo - RECUO_DO_PULSO) / corpo;

  const html =
    `<g class="seta-ensina" transform="translate(50 50) rotate(${n(angulo)})">` +
    `<rect class="seta-haste" x="0" y="${n(-HASTE / 2)}" width="${n(corpo + 1)}" height="${n(HASTE)}" rx="${n(HASTE / 2)}" style="--encolhe:${encolhe.toFixed(5)}"/>` +
    `<polygon class="seta-ponta" points="${n(corpo)},${n(-PONTA_LARGURA / 2)} ${n(comprimento)},0 ${n(corpo)},${n(PONTA_LARGURA / 2)}"/>` +
    `</g>`;
  return { orig, customSvg: { html, center: "orig" } };
}

/** O miolo do símbolo, desenhado por nós: a estrela é traço próprio, os sinais são texto. */
const ESTRELA =
  '<path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.2 1.4-6.4L2.7 9.3l6.5-.7z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>';

const SINAL: Record<Simbolo, string> = {
  acerto: "",
  brilhante: "!!",
  otimo: "!",
  alternativa: "!?",
  erro: "?",
  armadilha: "??",
};

/** O nome que a entrada grande escreve na etiqueta. */
const ROTULO: Partial<Record<Simbolo, string>> = { brilhante: "Brilhante!", otimo: "Ótimo!" };

/**
 * O disco no canto: 40% da casa, centro a 94% × 6%. Raio 20 e fonte de 23,5 são a
 * prévia; a sombra é o mesmo disco 2 unidades abaixo, a 28% de preto.
 *
 * `cx`/`cy` ficam em 0: quem põe o disco no canto é o `transform` de fora, e é
 * isso que deixa a entrada grande reaproveitar o mesmo desenho, só que começando
 * no meio da casa e maior.
 */
function disco(qual: Simbolo, raio: number, fonte: number, sombra: number, classe = ""): string {
  const sinal = SINAL[qual];
  const miolo =
    qual === "acerto"
      ? // A estrela ocupa 66% do disco, como na prévia: 24 unidades de desenho → 1,32 × raio.
        `<g transform="scale(${n((raio * 1.32) / 24)}) translate(-12 -12)">${ESTRELA}</g>`
      : `<text text-anchor="middle" dy="0.35em" font-size="${n(fonte)}" font-weight="800" letter-spacing="-0.04em" fill="#fff">${sinal}</text>`;
  return (
    `<circle${classe ? ` class="${classe}"` : ""} cy="${n(sombra)}" r="${n(raio)}" fill="rgb(0 0 0 / 0.28)"/>` +
    `<circle class="${classe ? `${classe} ` : ""}simbolo-cor-${qual}" r="${n(raio)}"/>` +
    miolo
  );
}

/**
 * O símbolo do veredito na casa de chegada.
 *
 * Estrela, `!?`, `?` e `??` surgem no canto em 150 ms. Brilhante e Ótimo têm a
 * entrada grande: a casa se pinta com a tinta deles a 0,8 por cima da peça, o
 * sinal cresce no meio com a etiqueta, e depois vai para o canto — 300 ms
 * entrando, 700 parado, 300 indo. Em repouso as classes da entrada já estão no
 * **estado final**, e é por isso que, com as animações desligadas no aparelho, o
 * aluno vê direto o disco no canto, sem tinta e sem etiqueta.
 */
export function simboloNaCasa(casa: Key, qual: Simbolo): DrawShape {
  const rotulo = ROTULO[qual];
  if (!rotulo) {
    const html = `<g class="simbolo-lance" transform="translate(94 6)">${disco(qual, 20, 23.5, 2)}</g>`;
    return { orig: casa, customSvg: { html, center: "orig" } };
  }

  // A etiqueta não tem como medir o próprio texto numa string: a largura é a
  // estimativa de negrito, 0,5 em por letra, mais o respiro de 0,17 casa de cada
  // lado da prévia. Medido no navegador em 14/9: "Brilhante!" ocupa 103 unidades
  // e "Ótimo!" 71 — 0,47 e 0,54 em por letra. Errar por pouco só muda o respiro.
  const fonte = 21.8;
  const largura = rotulo.length * fonte * 0.5 + 34;
  const altura = 36.4;
  const html =
    `<g class="entrada-grande">` +
    `<rect class="entrada-tinta tinta-${qual}" width="100" height="100"/>` +
    // Raio 35 e fonte 42 no meio da casa; a 0,57 no canto viram os 20 e 23,5 do disco pequeno.
    `<g class="entrada-icone">${disco(qual, 35, 42, 3.5, "entrada-bola")}</g>` +
    `<g class="entrada-rotulo" transform="translate(95 5)">` +
    `<g class="entrada-rotulo-miolo">` +
    `<rect x="${n(-largura / 2)}" y="${n(-altura / 2)}" width="${n(largura)}" height="${n(altura)}" rx="${n(altura / 2)}" fill="#fff"/>` +
    `<text text-anchor="middle" dy="0.35em" font-size="${n(fonte)}" font-weight="700" class="simbolo-cor-${qual}">${rotulo}</text>` +
    `</g></g>` +
    `</g>`;
  return { orig: casa, customSvg: { html, center: "orig" } };
}
