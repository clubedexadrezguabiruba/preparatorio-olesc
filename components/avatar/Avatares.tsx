import type { CSSProperties, ReactNode } from "react";
import { ehAvatar, nomeDoAvatar, type AvatarId } from "@/lib/avatar/avatares";

/**
 * Os dez avatares do aluno, desenhados à mão em SVG (17/9/2026).
 *
 * ## O traço é um só
 *
 * Grade de 64×64, contorno quase preto de 2,5 com pontas redondas, peça creme,
 * disco de fundo colorido. É o que faz os dez parecerem da mesma família e o que
 * os deixa legíveis a 32 px: a 32 px o contorno tem 1,25 px, e o rosto é feito de
 * formas grandes (olho de raio 2, boca de traço 2) — detalhe menor que isso some.
 * O corte redondo é `clip-path` no próprio `<svg>`, sem `<clipPath>` com id: dois
 * avatares na mesma página não disputam identificador.
 *
 * ## As cores entram por `style`, nunca por atributo
 *
 * `fill="var(--x)"` como atributo de apresentação não é confiável (o comentário
 * dos pincéis em `app/globals.css` registra o mesmo problema no chessground).
 * Por `style` a variável sempre resolve. Os tokens `--color-avatar-*` moram no
 * fim da paleta, e cada um aparece escrito por extenso em `COR` — é assim que o
 * guarda de token órfão os encontra.
 *
 * Sem hooks e sem `"use client"`: o mesmo componente serve o cabeçalho (servidor)
 * e a grade de escolha (cliente).
 */

const COR = {
  contorno: "var(--color-avatar-contorno)",
  peca: "var(--color-avatar-peca)",
  sombra: "var(--color-avatar-sombra)",
  brilho: "var(--color-avatar-brilho)",
  bochecha: "var(--color-avatar-bochecha)",
  vermelho: "var(--color-avatar-vermelho)",
  amarelo: "var(--color-avatar-amarelo)",
  cafe: "var(--color-avatar-cafe)",
  gota: "var(--color-avatar-gota)",
  azul: "var(--color-avatar-fundo-azul)",
  verde: "var(--color-avatar-fundo-verde)",
  lilas: "var(--color-avatar-fundo-lilas)",
  laranja: "var(--color-avatar-fundo-laranja)",
  rosa: "var(--color-avatar-fundo-rosa)",
  // O peão neutro de quem ainda não escolheu: cores da página, e não de adesivo.
  neutroFundo: "var(--color-carta-alta)",
  neutroPeca: "var(--color-tinta-fraca)",
} as const;

/** Preenchido e contornado. */
const cheio = (fill: string, strokeWidth?: number): CSSProperties =>
  strokeWidth === undefined ? { fill } : { fill, strokeWidth };
/** Preenchido, sem contorno. */
const liso = (fill: string): CSSProperties => ({ fill, stroke: "none" });
/** Só traço. */
const linha = (strokeWidth: number, stroke?: string): CSSProperties =>
  stroke ? { strokeWidth, stroke } : { strokeWidth };

/* ------------------------------------------------------------------ *
 * As peças, sem rosto
 * ------------------------------------------------------------------ */

function Fundo({ cor }: { cor: string }) {
  return <rect width="64" height="64" style={liso(cor)} />;
}

/** A faixa escura da base, a mesma nas cinco peças: é o "pé" que as põe na mesma mesa. */
function Base() {
  return <path d="M13 60 H51 V67 H13 Z" style={cheio(COR.sombra)} />;
}

function Peao() {
  return (
    <>
      <path d="M22 37 C22 45 18 52 13 57 L13 67 L51 67 L51 57 C46 52 42 45 42 37 Z" style={cheio(COR.peca)} />
      <Base />
      <ellipse cx="32" cy="36" rx="12" ry="3.5" style={cheio(COR.peca)} />
      <circle cx="32" cy="23" r="11" style={cheio(COR.peca)} />
    </>
  );
}

function Torre() {
  return (
    <>
      <path
        d="M13 67 L13 60 Q13 55 19 54 L21 54 L21 33 L17 30 L17 12 L24 12 L24 17 L28.5 17 L28.5 12 L35.5 12 L35.5 17 L40 17 L40 12 L47 12 L47 30 L43 33 L43 54 L45 54 Q51 55 51 60 L51 67 Z"
        style={cheio(COR.peca)}
      />
      <Base />
      <path d="M17 30 H47" style={linha(2)} />
    </>
  );
}

function Cavalo() {
  return (
    <>
      <path
        d="M13 67 L13 60 Q13 56 19 55 L22 52 L27 45 Q19 46 14 42 Q9 38 11 33 L21 21 Q23 12 29 10 L31 4 L35 9.5 Q47 11 51 25 Q55 38 48 49 Q46 53 46 55 Q51 56 51 60 L51 67 Z"
        style={cheio(COR.peca)}
      />
      <Base />
      <path d="M38 12.5 Q44 16 45.5 24 M45 28 Q49 33 47.5 41" style={linha(2)} />
      <circle cx="14.5" cy="31" r="1.1" style={liso(COR.contorno)} />
    </>
  );
}

function Bispo({ corte = true }: { corte?: boolean }) {
  return (
    <>
      <circle cx="32" cy="8" r="3.5" style={cheio(COR.peca)} />
      <path d="M32 11.5 C21 18 19 30 23.5 38 L40.5 38 C45 30 43 18 32 11.5 Z" style={cheio(COR.peca)} />
      {corte ? <path d="M37 16 L31.5 23.5" style={linha(2.2)} /> : null}
    </>
  );
}

/** A cabeça da dama: coroa de cinco pontas sobre o rosto. */
function CabecaDeDama() {
  return (
    <>
      <path d="M20 19 Q17 33 24 41 L40 41 Q47 33 44 19 Q32 16 20 19 Z" style={cheio(COR.peca)} />
      <path d="M18 21 L20 7 L26 15 L32 4 L38 15 L44 7 L46 21 Z" style={cheio(COR.amarelo)} />
      <circle cx="20" cy="7" r="2.1" style={liso(COR.vermelho)} />
      <circle cx="32" cy="4" r="2.1" style={liso(COR.vermelho)} />
      <circle cx="44" cy="7" r="2.1" style={liso(COR.vermelho)} />
    </>
  );
}

/** A cabeça do rei: cruz, rosto e a faixa dourada da coroa. */
function CabecaDeRei() {
  return (
    <>
      <path d="M29.5 1.5 H34.5 V5.5 H38.5 V10.5 H34.5 V15 H29.5 V10.5 H25.5 V5.5 H29.5 Z" style={cheio(COR.amarelo, 2)} />
      <path d="M19 17 Q15 31 23 41 L41 41 Q49 31 45 17 Q32 12 19 17 Z" style={cheio(COR.peca)} />
      <path d="M19.3 17 Q32 12 44.7 17 L44.3 21.5 Q32 17 19.7 21.5 Z" style={cheio(COR.amarelo, 2)} />
    </>
  );
}

/** Um tubo com contorno: o traço escuro largo por baixo e a cor por cima. */
function Tubo({ d, cor, largura = 3.5 }: { d: string; cor: string; largura?: number }) {
  return (
    <>
      <path d={d} style={linha(largura + 3)} />
      <path d={d} style={linha(largura, cor)} />
    </>
  );
}

function CorpoDeBispo() {
  return (
    <>
      <path d="M23 43 C23 50 18 55 13 59 L13 67 L51 67 L51 59 C46 55 41 50 41 43 Z" style={cheio(COR.peca)} />
      <Base />
      <ellipse cx="32" cy="40" rx="12" ry="3.5" style={cheio(COR.peca)} />
    </>
  );
}

/** O corpo da dama e do rei: o mesmo manto, a cabeça é que muda. */
function Manto() {
  return (
    <>
      <path d="M23 45 C23 52 18 56 13 59 L13 67 L51 67 L51 59 C46 56 41 52 41 45 Z" style={cheio(COR.peca)} />
      <Base />
      <ellipse cx="32" cy="43" rx="12.5" ry="3.5" style={cheio(COR.peca)} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Pedaços de rosto e de cena
 * ------------------------------------------------------------------ */

function Olho({ x, y, r = 2.2 }: { x: number; y: number; r?: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={r} style={liso(COR.contorno)} />
      <circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.36} style={liso(COR.brilho)} />
    </>
  );
}

function Bochechas({ y, dx, cx = 32 }: { y: number; dx: number; cx?: number }) {
  return (
    <>
      <circle cx={cx - dx} cy={y} r="2.3" style={liso(COR.bochecha)} />
      <circle cx={cx + dx} cy={y} r="2.3" style={liso(COR.bochecha)} />
    </>
  );
}

/** A faísca de quatro pontas, de lados curvos. */
function Faisca({ x, y, r, cor = COR.amarelo }: { x: number; y: number; r: number; cor?: string }) {
  return (
    <path
      d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`}
      style={cheio(cor, 1.3)}
    />
  );
}

function Nota({ x, y }: { x: number; y: number }) {
  return (
    <>
      <path d={`M${x + 2.6} ${y} V${y - 9} Q${x + 7} ${y - 7.5} ${x + 6.5} ${y - 3.5}`} style={linha(2)} />
      <ellipse cx={x} cy={y} rx="3" ry="2.3" transform={`rotate(-20 ${x} ${y})`} style={liso(COR.contorno)} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Os dez
 * ------------------------------------------------------------------ */

const DESENHOS: Record<AvatarId, () => ReactNode> = {
  "peao-heroi": () => (
    <>
      <Fundo cor={COR.azul} />
      {/* A capa atrás do corpo, mais larga que ele. */}
      <path d="M22 33 C11 41 7 54 3 67 L61 67 C57 54 53 41 42 33 Z" style={cheio(COR.vermelho)} />
      <Peao />
      <path
        d="M32 43.5 L33.4 47 L37 47.3 L34.2 49.6 L35.1 53.2 L32 51.2 L28.9 53.2 L29.8 49.6 L27 47.3 L30.6 47 Z"
        style={cheio(COR.amarelo, 1.5)}
      />
      {/* A máscara, com as duas pontas soltas atrás. */}
      <path d="M21.5 19.5 C17 17 14 18.5 11.5 16 C12.5 20.5 15.5 22.5 21.5 23.5 Z" style={liso(COR.contorno)} />
      <path d="M21 18.5 Q32 14.5 43 18.5 L43 25.5 Q37 23.5 32 26 Q27 23.5 21 25.5 Z" style={liso(COR.contorno)} />
      <circle cx="27.5" cy="21.5" r="2.3" style={liso(COR.brilho)} />
      <circle cx="36.5" cy="21.5" r="2.3" style={liso(COR.brilho)} />
      <path d="M27 29 Q32 33 37 29" style={linha(2.2)} />
    </>
  ),

  "peao-ninja": () => (
    <>
      <Fundo cor={COR.verde} />
      <Peao />
      {/* As pontas da faixa voando para trás. */}
      <path d="M42 18 C48 13 53 16 59 11 C57 18 51 20.5 43 21.5 Z" style={cheio(COR.vermelho, 2)} />
      <path d="M42.5 20.5 C49 21 53 25 59 23.5 C55.5 29 48 26.5 42 23 Z" style={cheio(COR.vermelho, 2)} />
      <path d="M21.2 16.5 Q32 12.5 42.8 16.5 L43.2 21.5 Q32 17.5 20.8 21.5 Z" style={cheio(COR.vermelho, 2)} />
      <path d="M25 23.5 L30 25.3 M39 23.5 L34 25.3" style={linha(2.4)} />
      <Olho x={28} y={28} r={2} />
      <Olho x={36} y={28} r={2} />
      <path d="M29.5 31.8 H34.5" style={linha(2.2)} />
      {/* A estrelinha de arremesso. */}
      <path d="M10 32 L12.2 37.8 L18 40 L12.2 42.2 L10 48 L7.8 42.2 L2 40 L7.8 37.8 Z" style={liso(COR.contorno)} />
      <circle cx="10" cy="40" r="1.6" style={liso(COR.verde)} />
    </>
  ),

  "peao-promovido": () => (
    <>
      <Fundo cor={COR.lilas} />
      <Peao />
      <Bochechas y={29} dx={8.5} />
      <path d="M25.3 26 Q28 23.2 30.7 26 M33.3 26 Q36 23.2 38.7 26" style={linha(2.3)} />
      <path d="M27 28.5 Q32 35.5 37 28.5 Z" style={cheio(COR.contorno, 2)} />
      {/* A coroa grande demais, escorregando. */}
      <g transform="rotate(-11 32 12)">
        <path d="M18 18 L17 7 L24.5 12.5 L32 4.5 L39.5 12.5 L47 7 L46 18 Z" style={cheio(COR.amarelo)} />
        <path d="M17.7 14.5 H46.3" style={linha(2)} />
        <circle cx="17" cy="7" r="2" style={liso(COR.vermelho)} />
        <circle cx="32" cy="5" r="2" style={liso(COR.vermelho)} />
        <circle cx="47" cy="7" r="2" style={liso(COR.vermelho)} />
      </g>
      <Faisca x={9} y={27} r={4.5} />
      <Faisca x={54} y={36} r={3.5} />
    </>
  ),

  "torre-oculos": () => (
    <>
      <Fundo cor={COR.laranja} />
      <Torre />
      <path
        d="M19.5 36 H31 V40 Q31 44.5 25.3 44.5 Q19.5 44.5 19.5 40 Z M33 36 H44.5 V40 Q44.5 44.5 38.8 44.5 Q33 44.5 33 40 Z"
        style={cheio(COR.contorno, 2)}
      />
      <path d="M31 37.2 H33" style={linha(2)} />
      <path d="M22.5 38.3 L25.5 38.3 M36 38.3 L39 38.3" style={linha(1.6, COR.brilho)} />
      <path d="M27.5 50 Q33 53 38 48.5" style={linha(2.4)} />
      <Faisca x={46} y={33} r={3.8} cor={COR.brilho} />
    </>
  ),

  "torre-foguete": () => (
    <>
      <Fundo cor={COR.rosa} />
      {/* O fogo sai de baixo; a torre encolheu e subiu para dar lugar a ele. */}
      <path d="M19 47 Q12 57 22 59.5 Q26 66 32 63 Q38 66 42 59.5 Q52 57 45 47 Z" style={cheio(COR.vermelho, 2)} />
      <path d="M25 47 Q23 55 32 59.5 Q41 55 39 47 Z" style={liso(COR.amarelo)} />
      <path d="M9 16 V28 M55 14 V26 M8 36 V44 M56 34 V42" style={linha(2.5, COR.brilho)} />
      {/* A escala afina o traço junto; 3,3 × 0,75 devolve os 2,5 das outras peças. */}
      <g transform="translate(8 1) scale(0.75)" style={{ strokeWidth: 3.3 }}>
        <Torre />
        <circle cx="27" cy="39" r="3.4" style={cheio(COR.brilho, 2)} />
        <circle cx="37" cy="39" r="3.4" style={cheio(COR.brilho, 2)} />
        <circle cx="27.4" cy="38.2" r="1.5" style={liso(COR.contorno)} />
        <circle cx="37.4" cy="38.2" r="1.5" style={liso(COR.contorno)} />
        <ellipse cx="32" cy="48" rx="2.6" ry="3.2" style={liso(COR.contorno)} />
      </g>
    </>
  ),

  "cavalo-dj": () => (
    <>
      <Fundo cor={COR.lilas} />
      <Cavalo />
      <path d="M38 16 C37 3 24 2 21.5 14" style={linha(3.2)} />
      <rect x="33" y="14.5" width="9.5" height="12.5" rx="3.5" style={cheio(COR.vermelho, 2.2)} />
      <path d="M23 21 Q25.8 18 28.6 21" style={linha(2.3)} />
      <path d="M12.5 37.5 Q16.5 40.5 21.5 37" style={linha(2.2)} />
      <circle cx="21.5" cy="29.5" r="2.3" style={liso(COR.bochecha)} />
      <Nota x={53} y={17} />
      <Nota x={7} y={20} />
    </>
  ),

  "cavalo-unicornio": () => (
    <>
      <Fundo cor={COR.azul} />
      <Cavalo />
      {/* A casquinha de ponta-cabeça: a bola na testa, o cone para cima. */}
      <path d="M18.5 17.5 L26 13.5 L16.5 4.5 Z" style={cheio(COR.amarelo, 2)} />
      <path d="M19 10.5 L22.5 9 M20.5 14.5 L24 12.5" style={linha(1.3)} />
      <circle cx="22" cy="16.5" r="4.2" style={cheio(COR.bochecha, 2)} />
      <Olho x={29.5} y={21.5} />
      <path d="M28.3 17.8 L27.6 16.2 M31 18.2 L31.8 16.6" style={linha(1.6)} />
      <circle cx="21.5" cy="30.5" r="2.3" style={liso(COR.bochecha)} />
      <path d="M12.5 37.5 Q16.5 40.5 21.5 37" style={linha(2.2)} />
      <Faisca x={50} y={9} r={4} />
      <Faisca x={8} y={51} r={3.2} />
    </>
  ),

  "bispo-soneca": () => (
    <>
      <Fundo cor={COR.rosa} />
      <CorpoDeBispo />
      {/* A cabeça tomba para o lado, e a bolha sai do nariz. */}
      <g transform="rotate(-14 32 40)">
        <Bispo />
        <path d="M25.5 28 Q28 30.5 30.5 28 M33.5 28 Q36 30.5 38.5 28" style={linha(2.3)} />
        <ellipse cx="32" cy="33.8" rx="1.8" ry="2.2" style={liso(COR.contorno)} />
        <circle cx="38.5" cy="34" r="2.8" style={cheio(COR.gota, 1.5)} />
      </g>
      <path d="M45 17 H52 L45 25 H52 M42.5 6.5 H47 L42.5 11.5 H47" style={linha(2.4)} />
    </>
  ),

  "dama-cafe": () => (
    <>
      <Fundo cor={COR.verde} />
      <Manto />
      <path d="M20 19 Q17 33 24 41 L40 41 Q47 33 44 19 Q32 16 20 19 Z" style={cheio(COR.peca)} />
      <g transform="rotate(13 32 20)">
        <path d="M18 21 L20 7 L26 15 L32 4 L38 15 L44 7 L46 21 Z" style={cheio(COR.amarelo)} />
        <circle cx="20" cy="7" r="2.1" style={liso(COR.vermelho)} />
        <circle cx="32" cy="4" r="2.1" style={liso(COR.vermelho)} />
        <circle cx="44" cy="7" r="2.1" style={liso(COR.vermelho)} />
      </g>
      <path d="M24.5 28.5 Q27 31 29.5 28.5 M34.5 28.5 Q37 31 39.5 28.5" style={linha(2.3)} />
      <Bochechas y={33} dx={9} />
      <path d="M28.5 34.5 Q32 37 35.5 34.5" style={linha(2.2)} />
      {/* A xícara. */}
      <path d="M52 51 Q56 51 56 54.5 Q56 58 51 58" style={linha(2.2)} />
      <path d="M36 49 H52 V54 Q52 60.5 44 60.5 Q36 60.5 36 54 Z" style={cheio(COR.brilho, 2.2)} />
      <ellipse cx="44" cy="49" rx="8" ry="2.2" style={cheio(COR.cafe, 2)} />
      <path d="M45 45 Q43 42.5 45 40 Q47 37.5 45 35 M50 45 Q48 42.5 50 40 Q52 37.5 50 35" style={linha(1.8)} />
    </>
  ),

  "rei-sufoco": () => (
    <>
      <Fundo cor={COR.laranja} />
      <Manto />
      <CabecaDeRei />
      <path d="M23.5 26 L29.5 23.8 M40.5 26 L34.5 23.8" style={linha(2.2)} />
      <circle cx="27" cy="29.5" r="2.8" style={cheio(COR.brilho, 1.8)} />
      <circle cx="37" cy="29.5" r="2.8" style={cheio(COR.brilho, 1.8)} />
      <circle cx="27" cy="30" r="1.3" style={liso(COR.contorno)} />
      <circle cx="37" cy="30" r="1.3" style={liso(COR.contorno)} />
      <path d="M26 36.5 Q27.5 35 29 36.5 Q30.5 38 32 36.5 Q33.5 35 35 36.5 Q36.5 38 38 36.5" style={linha(1.9)} />
      <path d="M48 18 Q52.5 24.5 48 27.5 Q43.5 24.5 48 18 Z" style={cheio(COR.gota, 1.8)} />
      <path d="M13 21 Q16.5 26.5 13 29 Q9.5 26.5 13 21 Z" style={cheio(COR.gota, 1.8)} />
      {/* O relógio de xadrez na frente, com um lado já apertado. */}
      <rect x="22" y="44" width="6" height="3" rx="1" style={liso(COR.contorno)} />
      <rect x="37" y="45.5" width="6" height="1.8" rx="0.9" style={liso(COR.contorno)} />
      <rect x="16" y="47" width="32" height="12.5" rx="2.5" style={cheio(COR.cafe, 2)} />
      <circle cx="24.5" cy="53.2" r="4.4" style={cheio(COR.brilho, 1.8)} />
      <circle cx="39.5" cy="53.2" r="4.4" style={cheio(COR.brilho, 1.8)} />
      <path d="M24.5 53.2 V50 M39.5 53.2 L42 51.8" style={linha(1.5)} />
      <path d="M26.5 49.6 L29 50.5 L26.8 51.6 Z" style={liso(COR.vermelho)} />
    </>
  ),

  /* ---------------------------------------------------------------- *
   * A segunda leva (17/9/2026)
   * ---------------------------------------------------------------- */

  "peao-mergulho": () => (
    <>
      <Fundo cor={COR.azul} />
      <Peao />
      {/* A máscara de mergulho: o vidro aumenta os olhos. */}
      <path d="M19.5 17 H44.5 V26.5 Q44.5 30 41 30 H36 Q32 26.5 28 30 H23 Q19.5 30 19.5 26.5 Z" style={cheio(COR.gota)} />
      <Olho x={27} y={23} r={2.8} />
      <Olho x={37} y={23} r={2.8} />
      <path d="M40.5 19 L42.5 21" style={linha(1.6, COR.brilho)} />
      <ellipse cx="32" cy="32.5" rx="2" ry="1.6" style={liso(COR.contorno)} />
      <Tubo d="M34 32.5 H47 V13 Q47 8.5 51 8.5" cor={COR.amarelo} />
      <circle cx="55" cy="17" r="2.6" style={cheio(COR.gota, 1.8)} />
      <circle cx="53" cy="25" r="1.8" style={cheio(COR.gota, 1.6)} />
      <circle cx="11" cy="30" r="2.2" style={cheio(COR.gota, 1.6)} />
    </>
  ),

  "peao-skate": () => (
    <>
      <Fundo cor={COR.laranja} />
      <path d="M3 30 H11 M4.5 39 H13 M7 21 H13" style={linha(2.5, COR.brilho)} />
      <g transform="rotate(-9 32 56)">
        {/* O peão encolhido cabe em cima do skate; o traço volta aos 2,5 das outras peças. */}
        <g transform="translate(6.4 -3) scale(0.8)" style={{ strokeWidth: 3.1 }}>
          <Peao />
          <path d="M21.5 20 Q21.5 11 32 11 Q42.5 11 42.5 20 Z" style={cheio(COR.vermelho)} />
          <path d="M42 17 H50 Q51.5 20 48 20.5 H42.5" style={cheio(COR.vermelho)} />
          <Olho x={28} y={24.5} r={2.3} />
          <Olho x={36} y={24.5} r={2.3} />
          <path d="M27 28.5 Q32 35 37 28.5 Z" style={cheio(COR.contorno, 2.5)} />
        </g>
        <path d="M8 51.5 Q10 57 16 57 H48 Q54 57 56 51.5 L53 51.5 Q51 54 47 54 H17 Q13 54 11 51.5 Z" style={cheio(COR.vermelho, 2)} />
        <circle cx="20" cy="60" r="2.8" style={cheio(COR.amarelo, 2)} />
        <circle cx="44" cy="60" r="2.8" style={cheio(COR.amarelo, 2)} />
      </g>
    </>
  ),

  "torre-farol": () => (
    <>
      <Fundo cor={COR.lilas} />
      {/* Os dois fachos saem da lâmpada, atrás da torre. */}
      {/* Opacos e com contorno: translúcido sobre o lilás, o amarelo virava cor de barro. */}
      <path d="M30 8 L2 1 L4 15 Z M34 8 L62 1 L60 15 Z" style={cheio(COR.amarelo, 1.8)} />
      <Torre />
      <circle cx="32" cy="8" r="5" style={cheio(COR.amarelo, 2)} />
      <path d="M21 46 H43 V51.5 H21 Z" style={cheio(COR.vermelho, 2)} />
      <circle cx="27" cy="37.5" r="3.6" style={cheio(COR.brilho, 2)} />
      <circle cx="37" cy="37.5" r="3.6" style={cheio(COR.brilho, 2)} />
      <circle cx="28.7" cy="37.5" r="1.6" style={liso(COR.contorno)} />
      <circle cx="38.7" cy="37.5" r="1.6" style={liso(COR.contorno)} />
      <path d="M30 43 Q32 42 34 43" style={linha(2)} />
    </>
  ),

  "torre-bolo": () => (
    <>
      <Fundo cor={COR.rosa} />
      <g transform="translate(0 7)">
        <Torre />
        {/* A cobertura escorrendo pela borda. */}
        <path
          d="M17 24 H47 V30 Q45.5 35.5 43 30.5 Q40.5 37 37.5 30.5 Q35 35 32 30.5 Q29 37 26.5 30.5 Q24 35.5 21 30.5 Q19 34 17 30 Z"
          style={cheio(COR.brilho, 2)}
        />
        <path d="M26.5 39.5 Q29 37 31.5 39.5 M32.5 39.5 Q35 37 37.5 39.5" style={linha(2.3)} />
        <path d="M28 43 Q32 47.5 36 43 Z" style={cheio(COR.contorno, 2)} />
        <Bochechas y={43} dx={8} />
        {/* As velas nas três ameias. */}
        {[20.5, 32, 43.5].map((x) => (
          <g key={x}>
            <rect x={x - 1.8} y="4" width="3.6" height="8" rx="1" style={cheio(COR.gota, 1.8)} />
            <path d={`M${x} -2.5 Q${x + 3} 1 ${x} 3 Q${x - 3} 1 ${x} -2.5 Z`} style={cheio(COR.amarelo, 1.5)} />
          </g>
        ))}
      </g>
    </>
  ),

  "cavalo-detetive": () => (
    <>
      <Fundo cor={COR.verde} />
      <Cavalo />
      <path d="M26.5 10.5 Q31 2 42 7.5 L44.5 12 Q36 8.5 26 13 Z" style={cheio(COR.cafe, 2)} />
      <path d="M12.5 38 Q16 39.5 20.5 37" style={linha(2.2)} />
      {/* A lupa: o olho do outro lado do vidro é o dobro do tamanho. */}
      <Tubo d="M32.5 27 L40 35" cor={COR.cafe} largura={4} />
      <circle cx="27" cy="21" r="7.5" style={cheio(COR.brilho, 3)} />
      <Olho x={27} y={21.5} r={4} />
      <path d="M22.5 16.5 Q24.5 14.5 27 14.3" style={linha(1.8, COR.gota)} />
    </>
  ),

  "cavalo-astronauta": () => (
    <>
      <Fundo cor={COR.lilas} />
      <Faisca x={55} y={45} r={3} cor={COR.brilho} />
      <Faisca x={9} y={52} r={3} />
      <Faisca x={8} y={12} r={2.4} cor={COR.brilho} />
      <Cavalo />
      <path d="M18 45 Q32 51 48 45 L47.5 51 Q32 57 18.5 51 Z" style={cheio(COR.brilho, 2)} />
      <Olho x={27.5} y={21} />
      <circle cx="21.5" cy="30" r="2.3" style={liso(COR.bochecha)} />
      <path d="M12.5 37.5 Q16.5 40.5 21.5 37" style={linha(2.2)} />
      {/* O capacete-bolha, translúcido: a cabeça aparece por dentro. */}
      <circle cx="31" cy="24" r="19" style={{ ...cheio(COR.gota), fillOpacity: 0.15 }} />
      <path d="M18 17 Q21 9.5 29 7.5" style={linha(2.5, COR.brilho)} />
    </>
  ),

  "bispo-mago": () => (
    <>
      <Fundo cor={COR.verde} />
      <CorpoDeBispo />
      <Bispo />
      <Olho x={27.5} y={28} />
      <path d="M33.5 28.3 Q36 26 38.5 28.3" style={linha(2.3)} />
      <path d="M27.5 33 Q32 36.5 36.5 33" style={linha(2.2)} />
      <Bochechas y={32} dx={9} />
      {/* A varinha e a estrela que ela solta. */}
      <Tubo d="M40 55 L50 38" cor={COR.contorno} largura={2} />
      <path d="M48.3 41 L50 38" style={linha(2.2, COR.brilho)} />
      <path
        d="M53 25.5 L54.4 29.1 L58.2 29.3 L55.3 31.7 L56.2 35.5 L53 33.4 L49.8 35.5 L50.7 31.7 L47.8 29.3 L51.6 29.1 Z"
        style={cheio(COR.amarelo, 1.8)}
      />
      <Faisca x={45} y={18} r={3} />
      <Faisca x={57} y={45} r={2.4} cor={COR.brilho} />
    </>
  ),

  "bispo-pirata": () => (
    <>
      <Fundo cor={COR.azul} />
      <CorpoDeBispo />
      <Bispo corte={false} />
      <path d="M25 18.5 L18.5 15 L19.5 22 Z" style={cheio(COR.vermelho, 2)} />
      <path d="M25 16.5 Q32 13.5 39 16.5 L40.5 21 Q32 17.5 23.5 21 Z" style={cheio(COR.vermelho, 2)} />
      <path d="M23.5 23 L41 30.5" style={linha(1.8)} />
      <path d="M33 25.5 Q37.5 24 40 27.5 Q39.5 32 35.5 31.5 Q32.5 30.5 33 25.5 Z" style={liso(COR.contorno)} />
      <Olho x={27.5} y={28.5} />
      <path d="M32 34 Q28.5 31.5 26.5 34.5 Q25 36.5 23.5 34.5 M32 34 Q35.5 31.5 37.5 34.5 Q39 36.5 40.5 34.5" style={linha(2.2)} />
    </>
  ),

  "dama-chiclete": () => (
    <>
      <Fundo cor={COR.laranja} />
      <Manto />
      <CabecaDeDama />
      {/* Vesga: as duas pupilas olham para a bola. */}
      <circle cx="27" cy="26.5" r="3" style={cheio(COR.brilho, 1.8)} />
      <circle cx="37" cy="26.5" r="3" style={cheio(COR.brilho, 1.8)} />
      <circle cx="28.3" cy="27.8" r="1.4" style={liso(COR.contorno)} />
      <circle cx="35.7" cy="27.8" r="1.4" style={liso(COR.contorno)} />
      <circle cx="32" cy="40" r="9" style={cheio(COR.bochecha, 2.2)} />
      <path d="M26.5 37.5 Q27.5 34.5 30.5 33.5" style={linha(2, COR.brilho)} />
    </>
  ),

  "rei-pipoca": () => (
    <>
      <Fundo cor={COR.rosa} />
      <Manto />
      <CabecaDeRei />
      <path d="M23.5 25.5 L29.5 26.5 M40.5 25.5 L34.5 26.5" style={linha(2.2)} />
      <Olho x={27.5} y={29.5} r={2.4} />
      <Olho x={36.5} y={29.5} r={2.4} />
      <path d="M28.5 34.5 Q32 38.5 35.5 34.5 Z" style={cheio(COR.contorno, 2)} />
      <circle cx="47" cy="32" r="2.6" style={cheio(COR.brilho, 1.8)} />
      {/* O balde listrado e a pipoca transbordando. */}
      <path d="M18 48 H46 L42.5 67 H21.5 Z" style={cheio(COR.vermelho, 2.2)} />
      <path d="M24 48 L25.5 67 H29.5 L28.8 48 Z M35.2 48 L34.5 67 H38.5 L40 48 Z" style={liso(COR.brilho)} />
      <path d="M18 48 H46 L42.5 67 H21.5 Z" style={linha(2.2)} />
      {[
        [21, 46, 4],
        [27.5, 43.5, 4.5],
        [34, 45.5, 4],
        [40, 43.5, 4.2],
        [45, 46.5, 3.6],
      ].map(([x, y, r]) => (
        <circle key={x} cx={x} cy={y} r={r} style={cheio(COR.brilho, 2)} />
      ))}
      <circle cx="26.5" cy="43" r="1.1" style={liso(COR.amarelo)} />
      <circle cx="39.5" cy="44" r="1.1" style={liso(COR.amarelo)} />
    </>
  ),
};

function Neutro() {
  return (
    <>
      <rect width="64" height="64" style={liso(COR.neutroFundo)} />
      <circle cx="32" cy="25" r="10" style={liso(COR.neutroPeca)} />
      <path d="M23 38 H41 C41 46 45 52 50 56 L50 67 L14 67 L14 56 C19 52 23 46 23 38 Z" style={liso(COR.neutroPeca)} />
    </>
  );
}

const RAIZ: CSSProperties = {
  clipPath: "circle(50%)",
  fill: "none",
  stroke: COR.contorno,
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/**
 * Um avatar, em qualquer tamanho. `id` desconhecido ou nulo desenha o peão neutro —
 * nunca quebra: o id vem do banco, e o banco pode estar à frente ou atrás do código.
 *
 * `decorativo` quando o nome do aluno ou do avatar já está escrito ao lado: o leitor
 * de tela não precisa ouvir a mesma coisa duas vezes.
 */
export function Avatar({
  id,
  tamanho = 40,
  className = "",
  decorativo = false,
}: {
  id: string | null | undefined;
  tamanho?: number;
  className?: string;
  decorativo?: boolean;
}) {
  const valido = ehAvatar(id) ? id : null;
  return (
    <svg
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      className={`shrink-0 ${className}`}
      style={RAIZ}
      focusable="false"
      {...(decorativo
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": valido ? nomeDoAvatar(valido) : "Sem avatar" })}
    >
      {valido ? DESENHOS[valido]() : <Neutro />}
    </svg>
  );
}
