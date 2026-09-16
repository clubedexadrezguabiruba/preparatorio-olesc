import type { ReactNode } from "react";

/**
 * O ícone de cada tema de tática — um desenho simples do motivo, e não uma
 * posição (Doug, 16/9: "uma ilustração em cada cartão, referente ao tópico";
 * entre diagrama, ícone e posição real, escolheu o **ícone simples**).
 *
 * ## Como é desenhado
 *
 * Numa grade de 32×32, com **seis peças** desenhadas uma vez (`PECA`) e três
 * marcas: seta, linha de ação tracejada e o X da captura. Cada tema é uma
 * combinação delas — o cavalo com duas setas é o garfo, o bispo atrás de duas
 * peças numa linha é a cravada. Um vocabulário pequeno é o que faz os 63
 * parecerem uma família, e o que deixa o próximo tema ser desenhado em cinco
 * linhas.
 *
 * ## Por que peça desenhada, e não o glifo ♞
 *
 * Os glifos de xadrez do Unicode dependem da fonte do aparelho: no Android eles
 * viram emoji colorido, e no Windows cada navegador escolhe uma fonte. Uma
 * silhueta própria sai igual em qualquer tela.
 *
 * As cores vêm de fora: a peça clara é `tinta`, a escura é `tinta-inversa` com
 * contorno `tinta`, e setas e marcas são `currentColor` — o cartão pinta com a
 * tinta do metal do nível. O fundo é do quadro, e não daqui.
 */

type TipoDePeca = "p" | "n" | "b" | "r" | "q" | "k";

/** As silhuetas, numa caixa de −7 a 7, com a base em y = 6,5. */
const PECA: Record<TipoDePeca, string> = {
  p: "M2.6,-3.2A2.6,2.6 0 1 1 -2.6,-3.2A2.6,2.6 0 1 1 2.6,-3.2Z M-4.5,6.5H4.5V5C4.5,3.6 3,2.6 2,1.6L1.6,-0.4H-1.6L-2,1.6C-3,2.6 -4.5,3.6 -4.5,5Z",
  n: "M-4.5,6.5H4.5C4.8,2 4.2,-3 0.5,-6L-0.5,-7.2L-1.1,-5.3C-3.1,-4.6 -4.9,-2.6 -5.6,-0.2C-5.8,0.9 -5,1.7 -4,1.4L-1.2,0.2C-2,2.5 -4.2,3.8 -4.5,6.5Z",
  b: "M1.4,-6.3A1.4,1.4 0 1 1 -1.4,-6.3A1.4,1.4 0 1 1 1.4,-6.3Z M-4.5,6.5H4.5V5H2.5L2,2.6C4,1.1 4,-2.4 0,-5C-4,-2.4 -4,1.1 -2,2.6L-2.5,5H-4.5Z",
  r: "M-5,6.5H5V4.6H3.6L3,-2H4.6V-6.5H2.6V-4.8H1V-6.5H-1V-4.8H-2.6V-6.5H-4.6V-2H-3L-3.6,4.6H-5Z",
  q: "M-5,6.5H5L4.2,1.4L6,-4.6L2.5,-0.8L0,-6.8L-2.5,-0.8L-6,-4.6L-4.2,1.4Z",
  k: "M-4.5,6.5H4.5L3.6,0.6C5.6,-1.4 3.9,-4.6 0,-2.6C-3.9,-4.6 -5.6,-1.4 -3.6,0.6Z M-0.8,-7.6H0.8V-6.3H2V-4.9H0.8V-3.2H-0.8V-4.9H-2V-6.3H-0.8Z",
};

/** Uma peça em (x, y), `clara` ou escura, na escala `s` (1 = 14 de altura). */
function P({ t, x, y, s = 0.6, clara = false }: { t: TipoDePeca; x: number; y: number; s?: number; clara?: boolean }) {
  return (
    <path
      d={PECA[t]}
      transform={`translate(${x} ${y}) scale(${s})`}
      className={clara ? "fill-tinta stroke-tinta-inversa" : "fill-tinta-inversa stroke-tinta"}
      strokeWidth={1.1 / s}
      strokeLinejoin="round"
    />
  );
}

/** A ponta de seta em (x2, y2), apontando na direção de (x1, y1) → (x2, y2). */
function ponta(x1: number, y1: number, x2: number, y2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const bx = x2 - Math.cos(a) * 3.2;
  const by = y2 - Math.sin(a) * 3.2;
  const pontos = [
    [x2, y2],
    [bx + Math.sin(a) * 2.3, by - Math.cos(a) * 2.3],
    [bx - Math.sin(a) * 2.3, by + Math.cos(a) * 2.3],
  ];
  return { bx, by, d: pontos.map((p) => p.map((n) => n.toFixed(2)).join(",")).join(" ") };
}

/** Seta reta. */
function S({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const { bx, by, d } = ponta(x1, y1, x2, y2);
  return (
    <g className="stroke-current">
      <line x1={x1} y1={y1} x2={bx} y2={by} strokeWidth={2} strokeLinecap="round" />
      <polygon points={d} className="fill-current" strokeWidth={0.5} strokeLinejoin="round" />
    </g>
  );
}

/** Seta curva: de (x1, y1) a (x2, y2), puxada por (cx, cy). */
function C({ x1, y1, cx, cy, x2, y2 }: { x1: number; y1: number; cx: number; cy: number; x2: number; y2: number }) {
  const { bx, by, d } = ponta(cx, cy, x2, y2);
  return (
    <g className="stroke-current">
      <path d={`M${x1},${y1} Q${cx},${cy} ${bx},${by}`} fill="none" strokeWidth={2} strokeLinecap="round" />
      <polygon points={d} className="fill-current" strokeWidth={0.5} strokeLinejoin="round" />
    </g>
  );
}

/** A linha de ação de uma peça de longo alcance, tracejada. Desenha-se antes das peças. */
function L({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-current" strokeWidth={1.6} strokeDasharray="2 2" strokeLinecap="round" />;
}

/** O X da peça que sai do tabuleiro. */
function X({ x, y, r = 3.2 }: { x: number; y: number; r?: number }) {
  return (
    <path
      d={`M${x - r},${y - r}L${x + r},${y + r}M${x + r},${y - r}L${x - r},${y + r}`}
      className="stroke-erro-texto"
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  );
}

/** Texto curto — o número do mate, a casa, o "!!". */
function T({ x, y, children, tamanho = 9 }: { x: number; y: number; children: string; tamanho?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={tamanho} fontWeight={700} className="fill-current">
      {children}
    </text>
  );
}

/** O disco do número do mate, no canto: "mate em N". */
function Numero({ n }: { n: string }) {
  return (
    <g>
      <circle cx={24.5} cy={8} r={5.6} className="fill-current" />
      <text x={24.5} y={8.4} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={800} className="fill-tinta-inversa">
        {n}
      </text>
    </g>
  );
}

/** Sinal de "não passa": um traço curto com a barra no fim. */
function B({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const dx = Math.sin(a) * 2.2;
  const dy = -Math.cos(a) * 2.2;
  return (
    <g className="stroke-current" strokeWidth={1.8} strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x2 - dx} y1={y2 - dy} x2={x2 + dx} y2={y2 + dy} />
    </g>
  );
}

/**
 * Os 63 desenhos. As brancas atacam de baixo; o rei preto mora em cima.
 * Linhas tracejadas vêm antes das peças, para a peça cobrir a linha.
 */
const DESENHOS: Record<string, ReactNode> = {
  // 1. Mates curtos e peça de graça — o rei e o número de lances.
  mateIn1: (
    <>
      <P t="k" x={13} y={18} s={1} />
      <Numero n="1" />
    </>
  ),
  mateIn2: (
    <>
      <P t="k" x={13} y={18} s={1} />
      <Numero n="2" />
    </>
  ),
  hangingPiece: (
    <>
      <P t="n" x={13} y={19} s={0.95} />
      <S x1={28} y1={5} x2={21} y2={12} />
      <T x={24} y={25} tamanho={11}>?</T>
    </>
  ),

  // 2. Padrões de mate I.
  backRankMate: (
    <>
      <L x1={9} y1={7} x2={18} y2={7} />
      <P t="r" x={5.5} y={7.5} s={0.55} clara />
      <P t="k" x={22.5} y={7.5} s={0.55} />
      <P t="p" x={15} y={17} s={0.5} />
      <P t="p" x={22.5} y={17} s={0.5} />
      <P t="p" x={29} y={17} s={0.5} />
      <S x1={9} y1={27} x2={9} y2={12} />
    </>
  ),
  smotheredMate: (
    <>
      <P t="k" x={25} y={7.5} s={0.55} />
      <P t="r" x={16.5} y={7.5} s={0.5} />
      <P t="p" x={16.5} y={16.5} s={0.5} />
      <P t="p" x={25} y={16.5} s={0.5} />
      <P t="n" x={8} y={25} s={0.6} clara />
      <C x1={10} y1={19} cx={10} cy={12} x2={19.5} y2={10} />
    </>
  ),
  arabianMate: (
    <>
      <L x1={11} y1={24} x2={22} y2={17} />
      <P t="k" x={25} y={7.5} s={0.55} />
      <P t="r" x={25} y={18} s={0.55} clara />
      <P t="n" x={9} y={25} s={0.6} clara />
    </>
  ),
  anastasiaMate: (
    <>
      <L x1={26} y1={23} x2={26} y2={17} />
      <P t="k" x={26} y={12} s={0.55} />
      <P t="p" x={17.5} y={12.5} s={0.5} />
      <P t="n" x={8} y={12} s={0.55} clara />
      <P t="r" x={26} y={26} s={0.55} clara />
    </>
  ),
  hookMate: (
    <>
      <L x1={10} y1={8} x2={18} y2={8} />
      <L x1={13} y1={24} x2={18} y2={19} />
      <P t="r" x={6} y={8.5} s={0.55} clara />
      <P t="k" x={22.5} y={8.5} s={0.55} />
      <P t="n" x={21} y={18.5} s={0.55} clara />
      <P t="p" x={10} y={26.5} s={0.5} clara />
    </>
  ),

  // 3. Padrões de mate II.
  bodenMate: (
    <>
      <L x1={6} y1={26} x2={24} y2={8} />
      <L x1={26} y1={26} x2={8} y2={8} />
      <P t="k" x={16} y={7} s={0.5} />
      <P t="b" x={5.5} y={26} s={0.55} clara />
      <P t="b" x={26.5} y={26} s={0.55} clara />
    </>
  ),
  doubleBishopMate: (
    <>
      <L x1={5} y1={21} x2={19} y2={7} />
      <L x1={12} y1={27} x2={26} y2={13} />
      <P t="k" x={24} y={7} s={0.5} />
      <P t="b" x={5.5} y={21} s={0.55} clara />
      <P t="b" x={12} y={26.5} s={0.55} clara />
    </>
  ),
  dovetailMate: (
    <>
      <P t="p" x={9.5} y={7.5} s={0.45} />
      <P t="p" x={24} y={21} s={0.45} />
      <P t="k" x={21} y={10} s={0.55} />
      <P t="q" x={11} y={22} s={0.6} clara />
      <S x1={14} y1={17} x2={17} y2={14} />
    </>
  ),
  mateIn3: (
    <>
      <P t="k" x={13} y={18} s={1} />
      <Numero n="3" />
    </>
  ),

  // 4. Táticas fundamentais.
  fork: (
    <>
      <S x1={13.5} y1={18} x2={8} y2={12.5} />
      <S x1={18.5} y1={18} x2={24} y2={12.5} />
      <P t="k" x={6} y={7.5} s={0.5} />
      <P t="r" x={26} y={7.5} s={0.5} />
      <P t="n" x={16} y={24} s={0.7} clara />
    </>
  ),
  pin: (
    <>
      <L x1={6} y1={26} x2={26} y2={6} />
      <P t="k" x={26} y={6.5} s={0.5} />
      <P t="n" x={16} y={16.5} s={0.5} />
      <P t="b" x={6} y={26} s={0.55} clara />
    </>
  ),
  skewer: (
    <>
      <L x1={6} y1={26} x2={26} y2={6} />
      <P t="r" x={26} y={6.5} s={0.5} />
      <P t="k" x={16} y={16.5} s={0.5} />
      <P t="b" x={6} y={26} s={0.55} clara />
    </>
  ),
  discoveredAttack: (
    <>
      <L x1={9} y1={8} x2={24} y2={8} />
      <P t="r" x={5.5} y={8.5} s={0.5} clara />
      <P t="k" x={26.5} y={8.5} s={0.5} />
      <P t="n" x={16} y={8.5} s={0.5} clara />
      <S x1={16} y1={14} x2={16} y2={27} />
    </>
  ),
  doubleCheck: (
    <>
      <S x1={16} y1={24} x2={16} y2={14} />
      <S x1={6} y1={21} x2={12} y2={15} />
      <P t="k" x={16} y={9} s={0.55} />
      <P t="r" x={16} y={27} s={0.45} clara />
      <P t="b" x={5} y={24} s={0.45} clara />
    </>
  ),

  // 5. Remover a defesa.
  capturingDefender: (
    <>
      <L x1={10} y1={11} x2={21} y2={20} />
      <P t="n" x={9} y={10} s={0.55} />
      <P t="q" x={23} y={22} s={0.55} />
      <X x={9} y={10} r={4} />
    </>
  ),
  deflection: (
    <>
      <P t="q" x={12} y={18} s={0.7} />
      <C x1={17} y1={13} cx={27} cy={10} x2={26} y2={25} />
    </>
  ),
  attraction: (
    <>
      <rect x={4} y={21} width={8} height={8} rx={1} className="stroke-current" strokeWidth={1.6} strokeDasharray="2 1.6" fill="none" />
      <P t="k" x={23} y={10} s={0.6} />
      <C x1={19} y1={15} cx={16} cy={24} x2={12.5} y2={24.5} />
    </>
  ),
  trappedPiece: (
    <>
      <P t="b" x={16} y={16} s={0.7} />
      <B x1={9} y1={9} x2={6} y2={6} />
      <B x1={23} y1={9} x2={26} y2={6} />
      <B x1={9} y1={23} x2={6} y2={26} />
      <B x1={23} y1={23} x2={26} y2={26} />
    </>
  ),
  xRayAttack: (
    <>
      <line x1={6} y1={16} x2={28} y2={16} className="stroke-current" strokeWidth={2.2} strokeLinecap="round" />
      <P t="r" x={5} y={16.5} s={0.5} clara />
      <P t="r" x={16} y={16.5} s={0.45} />
      <P t="k" x={27} y={16.5} s={0.45} />
    </>
  ),

  // 6. Ataque ao rei.
  exposedKing: (
    <>
      <S x1={4} y1={4} x2={10} y2={10} />
      <S x1={28} y1={4} x2={22} y2={10} />
      <S x1={4} y1={28} x2={9} y2={23} />
      <S x1={28} y1={28} x2={23} y2={23} />
      <P t="k" x={16} y={16.5} s={0.65} />
    </>
  ),
  attackingF2F7: (
    <>
      <rect x={9} y={10} width={14} height={14} rx={2} className="stroke-current" strokeWidth={1.8} fill="none" />
      <T x={16} y={17.3} tamanho={9}>f7</T>
      <S x1={3} y1={29} x2={8} y2={25} />
      <S x1={29} y1={29} x2={24} y2={25} />
    </>
  ),
  kingsideAttack: (
    <>
      <S x1={4} y1={20} x2={14} y2={10} />
      <S x1={8} y1={27} x2={18} y2={17} />
      <S x1={15} y1={29} x2={22} y2={22} />
      <P t="k" x={25} y={8} s={0.55} />
    </>
  ),
  sacrifice: (
    <>
      <P t="q" x={13} y={18} s={0.85} clara />
      <T x={25} y={9} tamanho={11}>!!</T>
    </>
  ),

  // 7. Lances finos.
  intermezzo: (
    <>
      <path d="M4,22 C9,22 11,22 13,17 C15,10 22,10 20,16 C18,21 22,22 24,22" fill="none" className="stroke-current" strokeWidth={2} strokeLinecap="round" />
      <S x1={23} y1={22} x2={29} y2={22} />
      <T x={17} y={27.5} tamanho={7}>!</T>
    </>
  ),
  quietMove: (
    <>
      <P t="p" x={12} y={21} s={0.8} clara />
      <S x1={12} y1={11} x2={12} y2={4.5} />
      <circle cx={21} cy={7} r={1.3} className="fill-current" />
      <circle cx={25} cy={7} r={1.3} className="fill-current" />
      <circle cx={29} cy={7} r={1.3} className="fill-current" />
    </>
  ),
  clearance: (
    <>
      <L x1={8} y1={21} x2={8} y2={4} />
      <P t="r" x={8} y={25.5} s={0.55} clara />
      <P t="b" x={8} y={12} s={0.5} clara />
      <S x1={12} y1={12} x2={25} y2={12} />
    </>
  ),
  interference: (
    <>
      <L x1={9} y1={8} x2={23} y2={8} />
      <P t="r" x={5.5} y={8.5} s={0.5} />
      <P t="q" x={26.5} y={8.5} s={0.5} />
      <P t="n" x={16} y={25} s={0.55} clara />
      <S x1={16} y1={19} x2={16} y2={12} />
    </>
  ),
  zugzwang: (
    <>
      <P t="k" x={16} y={16.5} s={0.65} />
      <B x1={16} y1={9} x2={16} y2={4.5} />
      <B x1={16} y1={24} x2={16} y2={28.5} />
      <B x1={8.5} y1={16} x2={4} y2={16} />
      <B x1={23.5} y1={16} x2={28} y2={16} />
    </>
  ),
  defensiveMove: (
    <>
      <path d="M16,3 L27,7 V15 C27,22 22,27 16,29 C10,27 5,22 5,15 V7 Z" className="stroke-current" strokeWidth={2} fill="none" strokeLinejoin="round" />
      <P t="k" x={16} y={16.5} s={0.6} clara />
    </>
  ),
  advancedPawn: (
    <>
      <L x1={4} y1={5} x2={28} y2={5} />
      <P t="p" x={16} y={23} s={0.75} clara />
      <S x1={16} y1={14} x2={16} y2={7} />
    </>
  ),
  promotion: (
    <>
      <P t="p" x={8} y={24} s={0.55} clara />
      <S x1={12} y1={19} x2={18} y2={13} />
      <P t="q" x={23} y={9} s={0.6} clara />
    </>
  ),
  underPromotion: (
    <>
      <P t="p" x={8} y={24} s={0.55} clara />
      <S x1={12} y1={19} x2={18} y2={13} />
      <P t="n" x={23} y={9} s={0.6} clara />
    </>
  ),
  enPassant: (
    <>
      <rect x={6} y={5} width={9} height={9} rx={1} className="stroke-current" strokeWidth={1.6} strokeDasharray="2 1.6" fill="none" />
      <P t="p" x={10.5} y={21} s={0.55} />
      <X x={10.5} y={20} r={3} />
      <P t="p" x={22} y={21} s={0.55} clara />
      <S x1={19} y1={16} x2={14} y2={11} />
    </>
  ),

  // 4. Táticas fundamentais (acrescentado em 16/9).
  discoveredCheck: (
    <>
      <L x1={6} y1={26} x2={25} y2={7} />
      <P t="b" x={6} y={26} s={0.55} clara />
      <P t="n" x={15.5} y={17} s={0.5} clara />
      <P t="k" x={25.5} y={7} s={0.5} />
      <C x1={19} y1={20} cx={27} cy={20} x2={27} y2={28} />
    </>
  ),

  // 6. Ataque ao rei (acrescentados em 16/9).
  queensideAttack: (
    <>
      <S x1={28} y1={20} x2={18} y2={10} />
      <S x1={24} y1={27} x2={14} y2={17} />
      <S x1={17} y1={29} x2={10} y2={22} />
      <P t="k" x={7} y={8} s={0.55} />
    </>
  ),
  greekGift: (
    <>
      <L x1={7} y1={25} x2={23} y2={14} />
      <P t="k" x={25} y={6.5} s={0.5} />
      <P t="p" x={25} y={14.5} s={0.45} />
      <X x={25} y={14} r={3.4} />
      <P t="b" x={6.5} y={26} s={0.55} clara />
    </>
  ),

  // 7. Lances finos (acrescentados em 16/9).
  counterCheck: (
    <>
      <S x1={12} y1={11} x2={12} y2={21} />
      <S x1={20} y1={21} x2={20} y2={11} />
      <P t="k" x={20} y={6.5} s={0.5} />
      <P t="k" x={12} y={26.5} s={0.5} clara />
    </>
  ),
  // O cavalo atacado pelo peão come o bispo antes de cair (em teste, 16/9).
  desperado: (
    <>
      <L x1={9} y1={10} x2={10.5} y2={19} />
      <P t="p" x={8} y={8.5} s={0.45} />
      <S x1={15.5} y1={20} x2={21.5} y2={14} />
      <P t="b" x={25} y={10} s={0.5} />
      <X x={25} y={9.5} r={3.4} />
      <P t="n" x={10.5} y={25.5} s={0.55} clara />
    </>
  ),

  // 9. Padrões de mate III.
  operaMate: (
    <>
      <L x1={26} y1={25} x2={14} y2={10} />
      <P t="r" x={12.5} y={7.5} s={0.5} clara />
      <P t="k" x={22.5} y={7.5} s={0.5} />
      <P t="b" x={26} y={25.5} s={0.55} clara />
    </>
  ),
  pillsburysMate: (
    <>
      <L x1={16} y1={23} x2={16} y2={10} />
      <L x1={6} y1={26} x2={26} y2={6} />
      <P t="k" x={16} y={6.5} s={0.5} />
      <P t="r" x={16} y={26.5} s={0.5} clara />
      <P t="b" x={5.5} y={26.5} s={0.5} clara />
    </>
  ),
  epauletteMate: (
    <>
      <L x1={16} y1={22} x2={16} y2={12} />
      <P t="r" x={6.5} y={7.5} s={0.5} />
      <P t="k" x={16} y={7.5} s={0.5} />
      <P t="r" x={25.5} y={7.5} s={0.5} />
      <P t="q" x={16} y={25.5} s={0.55} clara />
    </>
  ),
  swallowstailMate: (
    <>
      <P t="r" x={7} y={8.5} s={0.45} />
      <P t="r" x={25} y={8.5} s={0.45} />
      <P t="k" x={16} y={15} s={0.5} />
      <P t="q" x={16} y={24} s={0.55} clara />
    </>
  ),
  damianoMate: (
    <>
      <L x1={19} y1={21} x2={23} y2={18} />
      <P t="k" x={17} y={7.5} s={0.5} />
      <P t="q" x={25.5} y={15.5} s={0.5} clara />
      <P t="p" x={17} y={23.5} s={0.45} clara />
    </>
  ),
  lolliMate: (
    <>
      <L x1={10} y1={22} x2={13} y2={18} />
      <P t="k" x={16} y={7} s={0.5} />
      <P t="q" x={16} y={15.5} s={0.5} clara />
      <P t="p" x={8} y={24.5} s={0.45} clara />
      <P t="p" x={16} y={24.5} s={0.45} />
    </>
  ),

  // 10. Padrões de mate IV.
  morphysMate: (
    <>
      <L x1={6} y1={26} x2={24} y2={8} />
      <L x1={19} y1={23} x2={19} y2={4} />
      <P t="k" x={26} y={6.5} s={0.5} />
      <P t="b" x={5.5} y={26.5} s={0.5} clara />
      <P t="r" x={19} y={26.5} s={0.5} clara />
    </>
  ),
  cornerMate: (
    <>
      <L x1={19} y1={23} x2={19} y2={12} />
      <P t="k" x={26} y={6.5} s={0.5} />
      <P t="p" x={26} y={14.5} s={0.45} />
      <P t="r" x={19} y={26.5} s={0.5} clara />
      <S x1={14} y1={11} x2={22} y2={8} />
      <P t="n" x={11} y={14.5} s={0.55} clara />
    </>
  ),
  triangleMate: (
    <>
      <polygon points="16,9 7,22 25,22" className="stroke-current" strokeWidth={1.6} strokeDasharray="2 2" strokeLinejoin="round" fill="none" />
      <P t="k" x={16} y={8.5} s={0.5} />
      <P t="q" x={7} y={23} s={0.5} clara />
      <P t="r" x={25} y={23} s={0.5} clara />
    </>
  ),
  blindSwineMate: (
    <>
      <S x1={20} y1={16} x2={28} y2={16} />
      <P t="k" x={24} y={6.5} s={0.5} />
      <P t="r" x={6} y={16.5} s={0.5} clara />
      <P t="r" x={14} y={16.5} s={0.5} clara />
      <P t="p" x={12} y={26.5} s={0.45} />
      <X x={12} y={26} r={3.2} />
    </>
  ),
  killBoxMate: (
    <>
      <rect x={5} y={4} width={22} height={22} rx={1.5} className="stroke-current" strokeWidth={1.6} strokeDasharray="2 1.6" fill="none" />
      <L x1={13} y1={17.5} x2={20} y2={13} />
      <P t="k" x={16} y={10} s={0.45} />
      <P t="r" x={23} y={10} s={0.45} clara />
      <P t="q" x={10} y={20} s={0.5} clara />
    </>
  ),
  anderssenMate: (
    <>
      <L x1={17} y1={13} x2={23} y2={9} />
      <P t="k" x={14} y={7.5} s={0.5} />
      <P t="r" x={25} y={7.5} s={0.5} clara />
      <P t="p" x={14} y={16.5} s={0.45} clara />
      <P t="k" x={14} y={26.5} s={0.45} clara />
    </>
  ),
  pawnMate: (
    <>
      <P t="p" x={7} y={9} s={0.45} />
      <P t="k" x={16} y={8.5} s={0.5} />
      <P t="p" x={25} y={9} s={0.45} />
      <P t="p" x={22} y={18} s={0.55} clara />
      <S x1={22} y1={30} x2={22} y2={25} />
    </>
  ),
  grecoMate: (
    <>
      <L x1={26} y1={23} x2={26} y2={12} />
      <L x1={6} y1={20} x2={18} y2={8} />
      <P t="k" x={26} y={6.5} s={0.5} />
      <P t="p" x={19} y={15} s={0.45} />
      <P t="q" x={26} y={26.5} s={0.5} clara />
      <P t="b" x={5.5} y={20.5} s={0.5} clara />
    </>
  ),
  suffocationMate: (
    <>
      <L x1={16} y1={26} x2={27} y2={15} />
      <P t="r" x={13} y={6.5} s={0.45} />
      <P t="k" x={22} y={6.5} s={0.5} />
      <P t="n" x={13} y={17} s={0.55} clara />
      <P t="b" x={15.5} y={26.5} s={0.5} clara />
    </>
  ),
  mateIn4: (
    <>
      <P t="k" x={13} y={18} s={1} />
      <Numero n="4" />
    </>
  ),

  // 11. Mates raros e armadilhas.
  vukovicMate: (
    <>
      <L x1={20} y1={24} x2={17} y2={17} />
      <P t="k" x={16} y={6.5} s={0.5} />
      <P t="r" x={16} y={15} s={0.5} clara />
      <P t="k" x={21} y={26} s={0.45} clara />
      <P t="n" x={6} y={21} s={0.55} clara />
    </>
  ),
  balestraMate: (
    <>
      <L x1={6} y1={26} x2={22} y2={10} />
      <P t="k" x={25} y={7} s={0.5} />
      <P t="b" x={5.5} y={26.5} s={0.5} clara />
      <P t="q" x={11} y={11} s={0.55} clara />
    </>
  ),
  blackburneMate: (
    <>
      <L x1={6} y1={26} x2={19} y2={16} />
      <P t="k" x={25} y={6.5} s={0.5} />
      <P t="b" x={26} y={15} s={0.45} clara />
      <P t="b" x={5.5} y={26.5} s={0.5} clara />
      <P t="n" x={25} y={24} s={0.55} clara />
    </>
  ),
  retiMate: (
    <>
      <L x1={23} y1={25} x2={23} y2={19} />
      <P t="p" x={9} y={7} s={0.4} />
      <P t="k" x={16} y={9} s={0.5} />
      <P t="p" x={9} y={15} s={0.4} />
      <P t="b" x={23} y={16} s={0.45} clara />
      <P t="r" x={23} y={27} s={0.5} clara />
    </>
  ),
  maxLangeMate: (
    <>
      <L x1={9} y1={17} x2={16} y2={10} />
      <P t="k" x={26} y={15} s={0.5} />
      <P t="q" x={18} y={8} s={0.5} clara />
      <P t="b" x={9} y={17} s={0.5} clara />
      <P t="p" x={26} y={25} s={0.45} />
    </>
  ),
  legalMate: (
    <>
      <L x1={25} y1={22} x2={24} y2={13} />
      <P t="k" x={14} y={9} s={0.5} />
      <P t="b" x={24} y={9} s={0.45} clara />
      <P t="n" x={25} y={25} s={0.5} clara />
      <P t="n" x={7} y={21} s={0.5} clara />
    </>
  ),
  mateIn5: (
    <>
      <P t="k" x={13} y={18} s={1} />
      <Numero n="5" />
    </>
  ),
};

/** O ícone do tema, ou uma peça neutra para um tema sem desenho (nunca some). */
export function IconeDoTema({ tag, tamanho = 32, className = "" }: { tag: string; tamanho?: number; className?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden className={className} fill="none">
      {DESENHOS[tag] ?? <P t="p" x={16} y={16} s={1} clara />}
    </svg>
  );
}
