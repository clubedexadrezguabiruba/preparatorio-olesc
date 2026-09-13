import { Chess } from "chess.js";
import {
  FEN_INICIAL_PADRAO,
  type AnaliseV2,
  type AulaV2,
  type CapituloV2,
  type CasaAcesaV2,
  type CorDesenhoV2,
  type DesenhoV2,
  type NoV2,
  type SetaV2,
} from "../../editor-v2/modelo.ts";
import { lerPgnsComIntervalos, type ArquivoComIntervalos, type LancePgn, type PartidaPgn } from "../pgn.ts";

/**
 * O `.pgn` do repertório visto pelo Editor v2 — e o caminho de volta.
 *
 * §15 do plano final: "No repertório, o `.pgn` continua sendo a fonte publicada e o
 * JSON compilado continua derivado. Reutilizar painel e comandos por adaptador; não
 * criar uma segunda fonte JSON autoral permanente para as mesmas linhas."
 *
 * Então a `AulaV2` que sai daqui é uma **casca que só existe em memória**: uma
 * análise por jogo do arquivo, começando na FEN do jogo, com as tags guardadas em
 * `origemPgn`. O painel de lances e os comandos do v2 trabalham nela; quem grava é
 * `escrever.ts`, que devolve PGN. Nenhum JSON autoral do repertório vai a disco.
 *
 * ## Os ids são determinísticos
 *
 * `analise-j<k>` e `no-j<k>-<n>`, com `n` na ordem em que a árvore é percorrida
 * (o lance da linha principal antes das variações que o substituem, igual ao
 * importador). Abrir o mesmo texto duas vezes dá os mesmos ids — é o que deixa o
 * escritor reencontrar, no original, a forma em que cada NAG foi escrita.
 *
 * ## O que o comentário carrega
 *
 * Só `[%cal]` e `[%csl]` com as quatro cores conhecidas saem do texto, para virar
 * `desenhos` que a tela desenha. Todo o resto fica **no comentário, verbatim**:
 * as quebras de linha que o autor escreveu, e o bloco `[%plano]`, que é regra do
 * repertório (`esquema.ts`) e não diretiva de exportador. Colapsar o espaço — o que
 * o importador de aula faz — mudaria o texto que o aluno lê no JSON compilado.
 */

/** Os seis símbolos da interface e o número de NAG deles. */
const NUMERO_DO_SIMBOLO: Record<string, number> = { "!": 1, "?": 2, "!!": 3, "??": 4, "!?": 5, "?!": 6 };
const SIMBOLO_DO_NUMERO: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

const COR_POR_LETRA: Record<string, CorDesenhoV2> = { G: "verde", R: "vermelho", Y: "amarelo", B: "azul" };
const LETRA_POR_COR: Record<CorDesenhoV2, string> = { verde: "G", vermelho: "R", amarelo: "Y", azul: "B" };

/** Como cada NAG foi escrito no arquivo (`"!?"` ou `"$5"`), por id de nó. */
export type FormasDosNags = Map<string, string[]>;

export type JogoAdaptado = {
  analise: AnaliseV2;
  capitulo: CapituloV2;
  formas: FormasDosNags;
  /** Lance ilegal ou símbolo desconhecido: o jogo **não** pode ser editado e regravado. */
  problemas: string[];
};

export type CascaDoArquivo = {
  aula: AulaV2;
  formas: FormasDosNags;
  intervalos: ArquivoComIntervalos;
  /** Por análise: o que impede editar aquele jogo pela tela. */
  problemas: Record<string, string[]>;
};

export const idDaAnaliseDoJogo = (k: number): string => `analise-j${k}`;
export const idDoCapituloDoJogo = (k: number): string => `capitulo-j${k}`;

/** O número do jogo (1, 2…) a partir do id da análise, ou `null` se não é de jogo do arquivo. */
export function numeroDoJogo(analiseId: string): number | null {
  const achado = /^analise-j(\d+)$/.exec(analiseId);
  return achado ? Number(achado[1]) : null;
}

/* ------------------------------------------------------------------ *
 * Comentário ↔ desenhos
 * ------------------------------------------------------------------ */

const DESENHO = /\[%(cal|csl)\s+([^\]]*)\]/g;

/**
 * Tira do comentário os `[%cal]`/`[%csl]` que o editor sabe desenhar.
 *
 * Um desenho com cor desconhecida fica no texto, inteiro: tirá-lo perderia a única
 * cópia. O espaço só é mexido no ponto da emenda — duas palavras que o desenho
 * separava voltam separadas por um espaço —, nunca no resto do texto.
 */
export function separarDesenhos(bruto: string): { texto: string | null; desenhos?: DesenhoV2 } {
  const arrows: SetaV2[] = [];
  const highlights: CasaAcesaV2[] = [];
  let texto = bruto;

  for (const m of [...bruto.matchAll(DESENHO)].reverse()) {
    const itens = m[2].split(",").map((i) => i.trim()).filter(Boolean);
    const lidos = itens.map((item) =>
      m[1] === "cal"
        ? /^([A-Za-z])([a-h][1-8])([a-h][1-8])$/.exec(item)
        : /^([A-Za-z])([a-h][1-8])$/.exec(item),
    );
    if (lidos.length === 0 || lidos.some((l) => !l || !COR_POR_LETRA[l[1].toUpperCase()])) continue;

    const novos = lidos.map((l) => l!);
    if (m[1] === "cal") arrows.unshift(...novos.map((l) => ({ de: l[2], para: l[3], cor: COR_POR_LETRA[l[1].toUpperCase()] })));
    else highlights.unshift(...novos.map((l) => ({ casa: l[2], cor: COR_POR_LETRA[l[1].toUpperCase()] })));

    const antes = texto.slice(0, m.index).replace(/[ \t]+$/, "");
    const depois = texto.slice(m.index + m[0].length).replace(/^[ \t]+/, "");
    texto = antes === "" || depois === "" || /\s$/.test(antes) || /^\s/.test(depois) ? antes + depois : `${antes} ${depois}`;
  }

  const limpo = texto.trim();
  if (arrows.length + highlights.length === 0) return { texto: bruto.trim() === "" ? null : bruto };
  const desenhos: DesenhoV2 = {};
  if (arrows.length > 0) desenhos.arrows = arrows;
  if (highlights.length > 0) desenhos.highlights = highlights;
  return { texto: limpo === "" ? null : limpo, desenhos };
}

/** O comentário que vai ao PGN: o texto e, depois dele, os desenhos. */
export function juntarDesenhos(texto: string | undefined, desenhos: DesenhoV2 | undefined): string | null {
  const partes: string[] = [];
  if (texto && texto.trim() !== "") partes.push(texto);
  const setas = (desenhos?.arrows ?? []).map((s) => (Array.isArray(s) ? `G${s[0]}${s[1]}` : `${LETRA_POR_COR[s.cor]}${s.de}${s.para}`));
  const casas = (desenhos?.highlights ?? []).map((c) => (typeof c === "string" ? `G${c}` : `${LETRA_POR_COR[c.cor]}${c.casa}`));
  if (setas.length > 0) partes.push(`[%cal ${setas.join(",")}]`);
  if (casas.length > 0) partes.push(`[%csl ${casas.join(",")}]`);
  return partes.length > 0 ? partes.join(" ") : null;
}

/* ------------------------------------------------------------------ *
 * PGN → análise
 * ------------------------------------------------------------------ */

const uciDe = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ""}`;

function numeroDoNag(forma: string): number | null {
  if (NUMERO_DO_SIMBOLO[forma]) return NUMERO_DO_SIMBOLO[forma];
  const n = /^\$(\d+)$/.exec(forma);
  return n && Number(n[1]) >= 1 && Number(n[1]) <= 255 ? Number(n[1]) : null;
}

/** Um jogo do arquivo vira análise e capítulo, com ids determinísticos. */
export function analiseDoJogo(partida: PartidaPgn, k: number): JogoAdaptado {
  const problemas: string[] = [];
  const formas: FormasDosNags = new Map();
  const fen = partida.tags.FEN?.trim() || FEN_INICIAL_PADRAO;
  const raizId = `no-j${k}-0`;
  const nos: Record<string, NoV2> = { [raizId]: { id: raizId, filhos: [] } };
  let contador = 0;

  const jogo = new Chess();
  try {
    jogo.load(fen);
  } catch {
    problemas.push(`a posição de partida do jogo ${k} não é válida: "${fen}"`);
  }

  const sans: string[] = [];
  const ondeEstou = (): string => (sans.length === 0 ? "no começo" : `depois de ${sans.join(" ")}`);

  function converter(lances: LancePgn[], paiId: string): void {
    let atual = paiId;
    let jogados = 0;
    for (const lance of lances) {
      // As variações substituem ESTE lance: saem da posição de antes dele.
      const variacoes = lance.variacoes;
      let feito;
      try {
        feito = jogo.move(lance.san);
      } catch {
        feito = null;
      }
      if (!feito) {
        problemas.push(`"${lance.san}" não é lance legal ${ondeEstou()}`);
        break;
      }
      contador += 1;
      const id = `no-j${k}-${contador}`;
      const no: NoV2 = { id, uci: uciDe(feito), filhos: [] };
      if (lance.comentario) {
        const { texto, desenhos } = separarDesenhos(lance.comentario);
        if (texto !== null) no.comentario = texto;
        if (desenhos) no.desenhos = desenhos;
      }
      const numeros = lance.nags.map(numeroDoNag);
      if (numeros.some((n) => n === null)) {
        problemas.push(`o símbolo "${lance.nags.join(" ")}" depois de ${feito.san} não é um símbolo de PGN conhecido`);
      }
      const validos = numeros.filter((n): n is number => n !== null);
      if (validos.length > 0) {
        no.nags = validos;
        formas.set(id, [...lance.nags]);
      }
      nos[id] = no;
      nos[atual].filhos.push(id);
      sans.push(feito.san);

      for (const variacao of variacoes) {
        jogo.undo();
        sans.pop();
        converter(variacao, atual);
        jogo.move(feito.san);
        sans.push(feito.san);
      }

      atual = id;
      jogados += 1;
    }
    for (let i = 0; i < jogados; i++) {
      jogo.undo();
      sans.pop();
    }
  }

  if (problemas.length === 0) converter(partida.lances, raizId);

  if (partida.intro) {
    const { texto, desenhos } = separarDesenhos(partida.intro);
    if (texto !== null) nos[raizId].comentario = texto;
    if (desenhos) nos[raizId].desenhos = desenhos;
  }

  const analise: AnaliseV2 = {
    id: idDaAnaliseDoJogo(k),
    inicio: { tipo: "fen", fen },
    origemPgn: {
      tags: { ...partida.tags },
      ...(partida.resultado ? { resultado: partida.resultado } : {}),
      naoReconhecidos: [...partida.naoReconhecidos],
    },
    raizId,
    nos,
  };

  const caminho: string[] = [];
  for (let andando = raizId; nos[andando].filhos.length > 0; ) {
    andando = nos[andando].filhos[0];
    caminho.push(andando);
  }

  const capitulo: CapituloV2 = {
    id: idDoCapituloDoJogo(k),
    titulo: partida.tags.Nome?.trim() || `Jogo ${k}`,
    analiseId: analise.id,
    inicioNodeId: raizId,
    caminho,
    orientacao: partida.tags.Cor === "pretas" ? "black" : "white",
    narracoes: [],
  };

  if (partida.naoReconhecidos.length > 0) {
    problemas.push(`o jogo ${k} traz texto que o leitor não entende: ${partida.naoReconhecidos.map((t) => `«${t.slice(0, 40)}»`).join(", ")}`);
  }

  return { analise, capitulo, formas, problemas };
}

/** O id em memória de uma casca: nunca vai a disco, só precisa passar no schema. */
export function idDaCasca(arquivo: string): string {
  return `EX-REPERTORIO-${arquivo.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}

/** O arquivo inteiro como uma aula v2 em memória — uma análise e um capítulo por jogo. */
export function cascaDoArquivo(arquivo: string, texto: string): CascaDoArquivo {
  const intervalos = lerPgnsComIntervalos(texto);
  const formas: FormasDosNags = new Map();
  const problemas: Record<string, string[]> = {};
  const analises: AnaliseV2[] = [];
  const capitulos: CapituloV2[] = [];

  for (const [i, { partida }] of intervalos.jogos.entries()) {
    const adaptado = analiseDoJogo(partida, i + 1);
    analises.push(adaptado.analise);
    capitulos.push(adaptado.capitulo);
    for (const [id, f] of adaptado.formas) formas.set(id, f);
    if (adaptado.problemas.length > 0) problemas[adaptado.analise.id] = adaptado.problemas;
  }

  const aula: AulaV2 = {
    schemaVersion: 2,
    id: idDaCasca(arquivo),
    titulo: capitulos[0]?.titulo.split(" — ")[0] ?? arquivo,
    proveniencia: [],
    excecoes: [],
    analises,
    introducoes: [],
    capitulos,
    treinos: [],
    praticas: [],
    fluxo: capitulos.map((c) => ({ id: `etapa-${c.id}`, tipo: "capitulo" as const, entidadeId: c.id })),
  };

  return { aula, formas, intervalos, problemas };
}

/* ------------------------------------------------------------------ *
 * Análise → PGN (em árvore, ainda sem texto)
 * ------------------------------------------------------------------ */

/**
 * As formas dos NAGs de um nó: as do arquivo, se os números ainda são os mesmos;
 * senão, símbolo colado para os seis da interface e `$n` para o resto.
 *
 * Só **um** símbolo sai colado: dois colados (`!?` seguido de `!`) seriam relidos
 * como um símbolo só, e o NAG mudaria de sentido.
 */
export function formasDosNags(no: NoV2, formas?: ReadonlyMap<string, string[]>): string[] {
  const nags = no.nags ?? [];
  const guardadas = formas?.get(no.id);
  if (guardadas && guardadas.length === nags.length && guardadas.every((f, i) => numeroDoNag(f) === nags[i])) {
    return [...guardadas];
  }
  let colou = false;
  return nags.map((n) => {
    if (!colou && SIMBOLO_DO_NUMERO[n]) {
      colou = true;
      return SIMBOLO_DO_NUMERO[n];
    }
    return `$${n}`;
  });
}

/**
 * A análise de volta para a árvore do leitor de PGN — sem texto no meio.
 *
 * Serve duas vezes: o escritor imprime o resultado, e a conferência instantânea da
 * tela roda `expandir` nele sem gravar nada.
 */
export function partidaDaAnalise(analise: AnaliseV2, formas?: ReadonlyMap<string, string[]>): { partida: PartidaPgn; problemas: string[] } {
  const problemas: string[] = [];
  const fen = analise.inicio.tipo === "fen" ? analise.inicio.fen : FEN_INICIAL_PADRAO;
  const jogo = new Chess(fen);

  function jogar(id: string): LancePgn | null {
    const no = analise.nos[id];
    if (!no?.uci) return null;
    let feito;
    try {
      feito = jogo.move({ from: no.uci.slice(0, 2), to: no.uci.slice(2, 4), promotion: no.uci.slice(4) || undefined });
    } catch {
      problemas.push(`o lance ${no.uci} não é legal na posição em que está`);
      return null;
    }
    return { san: feito.san, nags: formasDosNags(no, formas), comentario: juntarDesenhos(no.comentario, no.desenhos), variacoes: [] };
  }

  function desde(paiId: string): LancePgn[] {
    const saida: LancePgn[] = [];
    let pai = paiId;
    let jogados = 0;
    for (;;) {
      const [principal, ...alternativas] = analise.nos[pai]?.filhos ?? [];
      if (!principal) break;
      const variacoes: LancePgn[][] = [];
      for (const alternativa of alternativas) {
        const primeiro = jogar(alternativa);
        if (!primeiro) continue;
        variacoes.push([primeiro, ...desde(alternativa)]);
        jogo.undo();
      }
      const lance = jogar(principal);
      if (!lance) break;
      lance.variacoes = variacoes;
      saida.push(lance);
      pai = principal;
      jogados += 1;
    }
    for (let i = 0; i < jogados; i++) jogo.undo();
    return saida;
  }

  const raiz = analise.nos[analise.raizId];
  const partida: PartidaPgn = {
    tags: { ...(analise.origemPgn?.tags ?? {}) },
    intro: raiz ? juntarDesenhos(raiz.comentario, raiz.desenhos) : null,
    lances: desde(analise.raizId),
    resultado: analise.origemPgn?.resultado ?? null,
    naoReconhecidos: [...(analise.origemPgn?.naoReconhecidos ?? [])],
  };
  return { partida, problemas };
}
