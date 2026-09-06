import { Chess, type Color, type Square } from "chess.js";
import { z } from "zod";
import { fenProblem } from "../chess/fen.ts";

/**
 * O juiz das legendas do meio-jogo.
 *
 * ## O problema que este arquivo resolve
 *
 * Uma aula de finais tem juiz: a tablebase Syzygy diz se "daqui você ganha" é
 * verdade, e o gate reprova a aula que mentir. Meio-jogo não tem esse juiz —
 * uma posição de 24 peças não cabe em tablebase nenhuma, e "o plano é atacar a
 * base da cadeia" não é o tipo de frase que uma máquina confirma.
 *
 * Sem juiz nenhum, porém, "posição verificada" vira palavra. E a legenda —
 * justamente a frase que o aluno lê **embaixo do diagrama**, e que ele vai
 * tomar como fato — é onde um erro custa mais caro: "o peão de d5 é isolado"
 * dito sobre um peão que tem vizinho em c6 ensina o contrário do que a dica
 * quer ensinar, e ninguém percebe até a aula ao vivo.
 *
 * A saída é cortar a dica em duas metades com donos diferentes:
 *
 * | metade | quem julga | onde mora |
 * |---|---|---|
 * | **o fato** — coluna aberta, peão isolado, posto, cor das casas | esta função, com chess.js | `legenda` + `afirma` |
 * | **o julgamento** — qual é o plano, qual peça é a pior | a autoria, e a tela diz isso | `explicacao`, `procure`, `quiz` |
 *
 * Toda posição carrega pelo menos uma afirmação (`.min(1)` no esquema), e a
 * legenda só pode dizer, como fato, o que as afirmações medem. O que for
 * julgamento vai para a explicação, onde o aluno lê "segundo o autor".
 *
 * ## Por que um vocabulário fechado, e não texto livre
 *
 * Porque texto livre não se confere. Cada `o` abaixo é uma pergunta que
 * chess.js responde com sim ou não — e a que responder "não" reprova a build,
 * do mesmo jeito que uma FEN ilegal reprova. O custo disso é que uma afirmação
 * nova exige uma linha de código; o benefício é que nenhuma afirmação escrita
 * fica sem ser medida.
 *
 * ## Quem chama
 *
 * `lib/meiojogo/dicas.test.ts` (o `npm test`) e `scripts/validate-content.ts`
 * (o gate). Os dois pela mesma função, pelo motivo de sempre: dois juízes com
 * regras próprias divergem, e a divergência aparece no pior momento.
 */

/* ------------------------------------------------------------------ *
 * O vocabulário
 * ------------------------------------------------------------------ */

const LADO = z.enum(["brancas", "pretas"]);
const CASA = z.string().regex(/^[a-h][1-8]$/, "casa no formato `e4`");
const COLUNA = z.string().regex(/^[a-h]$/, "coluna de `a` a `h`");
const PECA = z.enum(["rei", "dama", "torre", "bispo", "cavalo", "peao"]);
const COR_DA_CASA = z.enum(["claras", "escuras"]);
const CONTAGEM = z.number().int().min(0).max(16);

export const AfirmacaoSchema = z.discriminatedUnion("o", [
  /** De quem é a vez. A legenda que diz "as brancas jogam" declara isto. */
  z.strictObject({ o: z.literal("vez"), lado: LADO }),
  /** Uma peça está numa casa. É a âncora de toda legenda que nomeia peça. */
  z.strictObject({ o: z.literal("peca"), casa: CASA, peca: PECA, lado: LADO }),
  z.strictObject({ o: z.literal("rei-em"), lado: LADO, casa: CASA }),

  /* Material e peões — as contas que a legenda faz de cabeça. */
  z.strictObject({ o: z.literal("peoes"), brancas: CONTAGEM, pretas: CONTAGEM }),
  z.strictObject({
    o: z.literal("peoes-nas-colunas"),
    colunas: z.array(COLUNA).min(1).max(8),
    brancas: CONTAGEM,
    pretas: CONTAGEM,
  }),
  /**
   * Quantos peões daquele lado já cruzaram o meio do tabuleiro — a única
   * medida de "espaço" que não depende de opinião. Branco além do meio é
   * peão da quinta fileira para cima; preto, da quarta para baixo.
   */
  z.strictObject({ o: z.literal("peoes-alem-do-meio"), lado: LADO, quantos: CONTAGEM }),
  /**
   * As casas que só **um** dos lados alcança com peão — o que "ocupar o
   * centro" de fato compra. Cada casa listada é atacada por peão de `por` e
   * por peão nenhum do outro lado.
   */
  z.strictObject({
    o: z.literal("casas-negadas"),
    casas: z.array(CASA).min(1).max(8),
    por: LADO,
  }),
  z.strictObject({ o: z.literal("material-igual") }),
  z.strictObject({
    o: z.literal("material-a-mais"),
    lado: LADO,
    peca: PECA,
    quantas: z.number().int().min(1).max(8),
  }),
  z.strictObject({ o: z.literal("par-de-bispos"), lado: LADO }),
  /** Quantas peças daquele tipo cada lado tem. `dama 0×0` = damas fora. */
  z.strictObject({
    o: z.literal("pecas"),
    peca: PECA,
    brancas: CONTAGEM,
    pretas: CONTAGEM,
  }),

  /* Colunas. */
  z.strictObject({ o: z.literal("coluna-aberta"), coluna: COLUNA }),
  /** `lado` é quem **não** tem peão na coluna — quem ganha a estrada. */
  z.strictObject({ o: z.literal("coluna-semiaberta"), coluna: COLUNA, lado: LADO }),

  /* Peões, um a um. */
  z.strictObject({ o: z.literal("peao-isolado"), casa: CASA }),
  z.strictObject({ o: z.literal("peao-dobrado"), coluna: COLUNA, lado: LADO }),
  z.strictObject({ o: z.literal("peao-passado"), casa: CASA }),
  z.strictObject({ o: z.literal("peao-retardatario"), casa: CASA }),
  /** A casa que peão inimigo nenhum pode atacar, e que peão seu defende. */
  z.strictObject({ o: z.literal("posto"), casa: CASA, lado: LADO }),
  /** Uma peça de `por` está parada na casa à frente do peão de `peao`. */
  z.strictObject({ o: z.literal("bloqueio"), peao: CASA, por: LADO }),
  /** A cadeia, da base à ponta: cada peão defendido pelo anterior. */
  z.strictObject({
    o: z.literal("corrente-de-peoes"),
    lado: LADO,
    casas: z.array(CASA).min(2).max(6),
  }),

  /* A cor das casas — o que decide bispo bom e bispo ruim. */
  z.strictObject({ o: z.literal("peoes-na-cor-do-bispo"), bispo: CASA, quantos: CONTAGEM }),
  z.strictObject({
    o: z.literal("peoes-na-cor"),
    lado: LADO,
    cor: COR_DA_CASA,
    quantos: CONTAGEM,
  }),

  /* Contas de ataque e defesa. */
  z.strictObject({
    o: z.literal("atacantes"),
    casa: CASA,
    brancas: CONTAGEM,
    pretas: CONTAGEM,
  }),
  z.strictObject({ o: z.literal("cravada"), casa: CASA, por: CASA, contra: CASA }),

  /* Torres e rei. */
  z.strictObject({ o: z.literal("torres-ligadas"), lado: LADO, ligadas: z.boolean() }),
  z.strictObject({ o: z.literal("torre-na-setima"), lado: LADO, casa: CASA }),
  /** Quantos peões sobraram nas três colunas à frente do rei que rocou. */
  z.strictObject({ o: z.literal("escudo-do-rei"), lado: LADO, intactos: z.number().int().min(0).max(3) }),
  /** A janela: existe casa vazia à frente do rei para ele fugir da última fileira? */
  z.strictObject({ o: z.literal("janela-do-rei"), lado: LADO, tem: z.boolean() }),

  /* Duas afirmações que dependem da vez, e por isso a conferem antes. */
  z.strictObject({ o: z.literal("lances-da-peca"), casa: CASA, quantos: CONTAGEM }),
  z.strictObject({ o: z.literal("roque-disponivel"), lado: LADO, tipo: z.enum(["curto", "longo"]) }),
]);

export type Afirmacao = z.infer<typeof AfirmacaoSchema>;
type Lado = z.infer<typeof LADO>;
type NomeDePeca = z.infer<typeof PECA>;

/* ------------------------------------------------------------------ *
 * Régua de tabuleiro
 * ------------------------------------------------------------------ */

const COR: Record<Lado, Color> = { brancas: "w", pretas: "b" };
const OUTRO: Record<Lado, Lado> = { brancas: "pretas", pretas: "brancas" };
const NOME_DA_COR: Record<Color, Lado> = { w: "brancas", b: "pretas" };

const TIPO: Record<NomeDePeca, "k" | "q" | "r" | "b" | "n" | "p"> = {
  rei: "k",
  dama: "q",
  torre: "r",
  bispo: "b",
  cavalo: "n",
  peao: "p",
};
const NOME_DO_TIPO: Record<string, string> = {
  k: "rei",
  q: "dama",
  r: "torre",
  b: "bispo",
  n: "cavalo",
  p: "peão",
};

const coluna = (casa: string): number => casa.charCodeAt(0) - 97;
const fileira = (casa: string): number => Number(casa[1]);
const casaDe = (coluna: number, fileira: number): Square =>
  `${String.fromCharCode(97 + coluna)}${fileira}` as Square;

/**
 * A cor da casa, pela soma coluna+fileira.
 *
 * `a1` é escura, e `0 + 1 = 1` é ímpar: ímpar é escura. É a mesma conta que o
 * diagrama impresso usa em `lib/diagrama/tabuleiro.ts` — ali com a paridade
 * invertida porque a origem do SVG é o canto de cima.
 */
export function corDaCasa(casa: string): "claras" | "escuras" {
  return (coluna(casa) + fileira(casa)) % 2 === 1 ? "escuras" : "claras";
}

/** Para onde o peão daquele lado anda: +1 para as brancas, −1 para as pretas. */
const FRENTE: Record<Lado, number> = { brancas: 1, pretas: -1 };

function peoesDe(jogo: Chess, lado: Lado): Square[] {
  return jogo.findPiece({ type: "p", color: COR[lado] });
}

function contarPecas(jogo: Chess, lado: Lado): Map<string, number> {
  const conta = new Map<string, number>();
  for (const fileiraDoTabuleiro of jogo.board()) {
    for (const casa of fileiraDoTabuleiro) {
      if (casa === null || casa.color !== COR[lado] || casa.type === "k") continue;
      conta.set(casa.type, (conta.get(casa.type) ?? 0) + 1);
    }
  }
  return conta;
}

function reiDe(jogo: Chess, lado: Lado): Square | null {
  return jogo.findPiece({ type: "k", color: COR[lado] })[0] ?? null;
}

/** As casas entre duas na mesma linha, exclusivas. `null` se não há linha. */
function entre(a: string, b: string): Square[] | null {
  const dc = Math.sign(coluna(b) - coluna(a));
  const df = Math.sign(fileira(b) - fileira(a));
  const passos = Math.max(Math.abs(coluna(b) - coluna(a)), Math.abs(fileira(b) - fileira(a)));
  const alinhado =
    (dc === 0 && df !== 0) ||
    (df === 0 && dc !== 0) ||
    Math.abs(coluna(b) - coluna(a)) === Math.abs(fileira(b) - fileira(a));
  if (!alinhado || passos === 0) return null;

  const caminho: Square[] = [];
  for (let i = 1; i < passos; i += 1) {
    caminho.push(casaDe(coluna(a) + dc * i, fileira(a) + df * i));
  }
  return caminho;
}

/* ------------------------------------------------------------------ *
 * O juiz
 * ------------------------------------------------------------------ */

/**
 * O problema da afirmação em português, ou `null` se ela é verdade na posição.
 *
 * Devolve texto e não `boolean` de propósito: quem lê o erro é quem escreveu a
 * dica, e "d5 tem vizinho em c6" conserta a legenda; "false" manda procurar.
 */
export function conferirAfirmacao(fen: string, a: Afirmacao): string | null {
  const jogo = new Chess(fen);

  const pecaEm = (casa: string) => jogo.get(casa as Square);
  const exigirPeao = (casa: string): Lado | string => {
    const p = pecaEm(casa);
    if (!p) return `${casa} está vazia`;
    if (p.type !== "p") return `${casa} tem ${NOME_DO_TIPO[p.type]}, não peão`;
    return NOME_DA_COR[p.color];
  };

  switch (a.o) {
    case "vez": {
      const vez = NOME_DA_COR[jogo.turn()];
      return vez === a.lado ? null : `a vez é das ${vez}`;
    }

    case "peca": {
      const p = pecaEm(a.casa);
      if (!p) return `${a.casa} está vazia`;
      if (p.type !== TIPO[a.peca] || NOME_DA_COR[p.color] !== a.lado) {
        return `${a.casa} tem ${NOME_DO_TIPO[p.type]} das ${NOME_DA_COR[p.color]}`;
      }
      return null;
    }

    case "rei-em": {
      const rei = reiDe(jogo, a.lado);
      return rei === a.casa ? null : `o rei das ${a.lado} está em ${rei}`;
    }

    case "peoes": {
      const brancas = peoesDe(jogo, "brancas").length;
      const pretas = peoesDe(jogo, "pretas").length;
      return brancas === a.brancas && pretas === a.pretas
        ? null
        : `são ${brancas} peões brancos e ${pretas} pretos`;
    }

    case "peoes-nas-colunas": {
      const nas = (lado: Lado) =>
        peoesDe(jogo, lado).filter((c) => a.colunas.includes(c[0])).length;
      const brancas = nas("brancas");
      const pretas = nas("pretas");
      return brancas === a.brancas && pretas === a.pretas
        ? null
        : `nas colunas ${a.colunas.join("")} são ${brancas} brancos e ${pretas} pretos`;
    }

    case "peoes-alem-do-meio": {
      const alem = peoesDe(jogo, a.lado).filter((c) =>
        a.lado === "brancas" ? fileira(c) >= 5 : fileira(c) <= 4,
      );
      return alem.length === a.quantos
        ? null
        : `são ${alem.length} peões das ${a.lado} além do meio (${alem.sort().join(", ") || "nenhum"})`;
    }

    case "casas-negadas": {
      const atacaComPeao = (lado: Lado, alvo: string) =>
        peoesDe(jogo, lado).some(
          (c) =>
            Math.abs(coluna(c) - coluna(alvo)) === 1 &&
            fileira(alvo) - fileira(c) === FRENTE[lado],
        );
      for (const alvo of a.casas) {
        if (!atacaComPeao(a.por, alvo)) return `peão nenhum das ${a.por} alcança ${alvo}`;
        if (atacaComPeao(OUTRO[a.por], alvo)) {
          return `${alvo} também é alcançada por peão das ${OUTRO[a.por]}`;
        }
      }
      return null;
    }

    case "material-igual": {
      const brancas = contarPecas(jogo, "brancas");
      const pretas = contarPecas(jogo, "pretas");
      const tipos = new Set([...brancas.keys(), ...pretas.keys()]);
      const diferentes = [...tipos].filter((t) => (brancas.get(t) ?? 0) !== (pretas.get(t) ?? 0));
      return diferentes.length === 0
        ? null
        : `difere em ${diferentes
            .map((t) => `${NOME_DO_TIPO[t]} ${brancas.get(t) ?? 0}×${pretas.get(t) ?? 0}`)
            .join(", ")}`;
    }

    case "material-a-mais": {
      const meu = contarPecas(jogo, a.lado);
      const dele = contarPecas(jogo, OUTRO[a.lado]);
      const tipo = TIPO[a.peca];
      const sobra = (meu.get(tipo) ?? 0) - (dele.get(tipo) ?? 0);
      if (sobra !== a.quantas) {
        return `a sobra de ${a.peca} é ${sobra}, não ${a.quantas}`;
      }
      const tipos = new Set([...meu.keys(), ...dele.keys()]);
      const outrosDesiguais = [...tipos].filter(
        (t) => t !== tipo && (meu.get(t) ?? 0) !== (dele.get(t) ?? 0),
      );
      return outrosDesiguais.length === 0
        ? null
        : `o resto do material não está igual: ${outrosDesiguais
            .map((t) => NOME_DO_TIPO[t])
            .join(", ")}`;
    }

    case "par-de-bispos": {
      const meus = jogo.findPiece({ type: "b", color: COR[a.lado] }).length;
      const dele = jogo.findPiece({ type: "b", color: COR[OUTRO[a.lado]] }).length;
      return meus >= 2 && dele <= 1
        ? null
        : `${a.lado} têm ${meus} bispos e ${OUTRO[a.lado]}, ${dele}`;
    }

    case "pecas": {
      const conta = (lado: Lado) =>
        jogo.findPiece({ type: TIPO[a.peca], color: COR[lado] }).length;
      const brancas = conta("brancas");
      const pretas = conta("pretas");
      return brancas === a.brancas && pretas === a.pretas
        ? null
        : `são ${brancas} de ${a.peca} das brancas e ${pretas} das pretas`;
    }

    case "coluna-aberta": {
      const naColuna = (lado: Lado) => peoesDe(jogo, lado).filter((c) => c[0] === a.coluna);
      const brancos = naColuna("brancas");
      const pretos = naColuna("pretas");
      return brancos.length === 0 && pretos.length === 0
        ? null
        : `a coluna ${a.coluna} tem peão em ${[...brancos, ...pretos].sort().join(", ")}`;
    }

    case "coluna-semiaberta": {
      const meus = peoesDe(jogo, a.lado).filter((c) => c[0] === a.coluna);
      const dele = peoesDe(jogo, OUTRO[a.lado]).filter((c) => c[0] === a.coluna);
      if (meus.length > 0) return `as ${a.lado} têm peão em ${meus.join(", ")}`;
      if (dele.length === 0) return `a coluna ${a.coluna} não tem peão nenhum — é aberta`;
      return null;
    }

    case "peao-isolado": {
      const dono = exigirPeao(a.casa);
      if (dono !== "brancas" && dono !== "pretas") return dono;
      const vizinhos = peoesDe(jogo, dono).filter(
        (c) => Math.abs(coluna(c) - coluna(a.casa)) === 1,
      );
      return vizinhos.length === 0 ? null : `tem vizinho em ${vizinhos.sort().join(", ")}`;
    }

    case "peao-dobrado": {
      const naColuna = peoesDe(jogo, a.lado).filter((c) => c[0] === a.coluna);
      return naColuna.length >= 2
        ? null
        : `as ${a.lado} têm ${naColuna.length} peão na coluna ${a.coluna}`;
    }

    case "peao-passado": {
      const dono = exigirPeao(a.casa);
      if (dono !== "brancas" && dono !== "pretas") return dono;
      const frente = FRENTE[dono];
      const barram = peoesDe(jogo, OUTRO[dono]).filter(
        (c) =>
          Math.abs(coluna(c) - coluna(a.casa)) <= 1 &&
          (fileira(c) - fileira(a.casa)) * frente > 0,
      );
      return barram.length === 0
        ? null
        : `os peões de ${barram.sort().join(", ")} ainda o barram`;
    }

    case "peao-retardatario": {
      const dono = exigirPeao(a.casa);
      if (dono !== "brancas" && dono !== "pretas") return dono;
      const frente = FRENTE[dono];
      // 1. Nenhum peão amigo ao lado que esteja atrás ou lado a lado: é isso
      //    que o impede de ser defendido por peão, agora ou depois.
      const podemDefender = peoesDe(jogo, dono).filter(
        (c) =>
          Math.abs(coluna(c) - coluna(a.casa)) === 1 &&
          (fileira(c) - fileira(a.casa)) * frente <= 0,
      );
      if (podemDefender.length > 0) {
        return `o peão de ${podemDefender.sort().join(", ")} pode defendê-lo`;
      }
      // 2. E a casa à frente é atacada por peão inimigo: é isso que o prende.
      const aFrente = casaDe(coluna(a.casa), fileira(a.casa) + frente);
      // O peão inimigo ataca `aFrente` de **um degrau atrás** dela, no sentido
      // em que ele anda: daí o sinal trocado. Escrito com o sinal direto, a
      // conferência procurava o guarda do lado errado do tabuleiro e todo peão
      // passava por retardatário.
      const guardas = peoesDe(jogo, OUTRO[dono]).filter(
        (c) =>
          Math.abs(coluna(c) - coluna(aFrente)) === 1 &&
          fileira(c) - fileira(aFrente) === -FRENTE[OUTRO[dono]],
      );
      return guardas.length > 0
        ? null
        : `nenhum peão inimigo controla ${aFrente} — ele anda quando quiser`;
    }

    case "posto": {
      const frente = FRENTE[a.lado];
      // Defendido por peão meu, um degrau atrás e numa coluna vizinha.
      const defensores = peoesDe(jogo, a.lado).filter(
        (c) =>
          Math.abs(coluna(c) - coluna(a.casa)) === 1 &&
          fileira(c) - fileira(a.casa) === -frente,
      );
      if (defensores.length === 0) return `nenhum peão das ${a.lado} defende ${a.casa}`;
      // E inatacável: nenhum peão inimigo nas colunas vizinhas ainda por vir.
      const ameacas = peoesDe(jogo, OUTRO[a.lado]).filter(
        (c) =>
          Math.abs(coluna(c) - coluna(a.casa)) === 1 &&
          (fileira(c) - fileira(a.casa)) * frente >= 1,
      );
      return ameacas.length === 0
        ? null
        : `o peão de ${ameacas.sort().join(", ")} ainda pode atacá-la`;
    }

    case "bloqueio": {
      const dono = exigirPeao(a.peao);
      if (dono !== "brancas" && dono !== "pretas") return dono;
      const aFrente = casaDe(coluna(a.peao), fileira(a.peao) + FRENTE[dono]);
      const p = pecaEm(aFrente);
      if (!p) return `${aFrente} está vazia`;
      return NOME_DA_COR[p.color] === a.por
        ? null
        : `${aFrente} tem ${NOME_DO_TIPO[p.type]} das ${NOME_DA_COR[p.color]}`;
    }

    case "corrente-de-peoes": {
      for (const casa of a.casas) {
        const p = pecaEm(casa);
        if (!p || p.type !== "p" || NOME_DA_COR[p.color] !== a.lado) {
          return `${casa} não tem peão das ${a.lado}`;
        }
      }
      for (let i = 1; i < a.casas.length; i += 1) {
        const atras = a.casas[i - 1];
        const frente = a.casas[i];
        const defende =
          Math.abs(coluna(frente) - coluna(atras)) === 1 &&
          fileira(frente) - fileira(atras) === FRENTE[a.lado];
        if (!defende) return `${atras} não defende ${frente}`;
      }
      return null;
    }

    case "peoes-na-cor-do-bispo": {
      const p = pecaEm(a.bispo);
      if (!p || p.type !== "b") return `${a.bispo} não tem bispo`;
      const lado = NOME_DA_COR[p.color];
      const cor = corDaCasa(a.bispo);
      const na = peoesDe(jogo, lado).filter((c) => corDaCasa(c) === cor);
      return na.length === a.quantos
        ? null
        : `são ${na.length} peões das ${lado} em casas ${cor} (${na.sort().join(", ")})`;
    }

    case "peoes-na-cor": {
      const na = peoesDe(jogo, a.lado).filter((c) => corDaCasa(c) === a.cor);
      return na.length === a.quantos
        ? null
        : `são ${na.length} peões das ${a.lado} em casas ${a.cor}`;
    }

    case "atacantes": {
      const brancas = jogo.attackers(a.casa as Square, "w").length;
      const pretas = jogo.attackers(a.casa as Square, "b").length;
      return brancas === a.brancas && pretas === a.pretas
        ? null
        : `${a.casa} é atacada ${brancas}× pelas brancas e ${pretas}× pelas pretas`;
    }

    case "cravada": {
      const presa = pecaEm(a.casa);
      const atacante = pecaEm(a.por);
      const atras = pecaEm(a.contra);
      if (!presa) return `${a.casa} está vazia`;
      if (!atacante) return `${a.por} está vazia`;
      if (!atras) return `${a.contra} está vazia`;
      if (atacante.color === presa.color) return `${a.por} é peça da mesma cor que ${a.casa}`;
      if (atras.color !== presa.color) return `${a.contra} não é peça da cor de ${a.casa}`;

      const caminho = entre(a.por, a.contra);
      if (caminho === null) return `${a.por} e ${a.contra} não estão na mesma linha`;
      if (!caminho.includes(a.casa as Square)) return `${a.casa} não está entre as duas`;

      const emLinha = fileira(a.por) === fileira(a.contra) || coluna(a.por) === coluna(a.contra);
      const podeCravar = emLinha
        ? atacante.type === "r" || atacante.type === "q"
        : atacante.type === "b" || atacante.type === "q";
      if (!podeCravar) return `${NOME_DO_TIPO[atacante.type]} em ${a.por} não ataca nessa linha`;

      const atravanca = caminho.filter((c) => c !== a.casa && pecaEm(c));
      return atravanca.length === 0
        ? null
        : `há peça no caminho em ${atravanca.join(", ")}`;
    }

    case "torres-ligadas": {
      const torres = jogo.findPiece({ type: "r", color: COR[a.lado] });
      const ligadas =
        torres.length === 2 &&
        entre(torres[0], torres[1]) !== null &&
        entre(torres[0], torres[1])!.every((c) => !pecaEm(c)) &&
        (fileira(torres[0]) === fileira(torres[1]) || coluna(torres[0]) === coluna(torres[1]));
      if (ligadas === a.ligadas) return null;
      return a.ligadas
        ? `as torres das ${a.lado} (${torres.join(", ") || "nenhuma"}) não se enxergam`
        : `as torres das ${a.lado} em ${torres.join(", ")} já estão ligadas`;
    }

    case "torre-na-setima": {
      const p = pecaEm(a.casa);
      if (!p || p.type !== "r" || NOME_DA_COR[p.color] !== a.lado) {
        return `${a.casa} não tem torre das ${a.lado}`;
      }
      const setima = a.lado === "brancas" ? 7 : 2;
      return fileira(a.casa) === setima
        ? null
        : `${a.casa} não é a sétima fileira das ${a.lado} (é a ${setima})`;
    }

    case "escudo-do-rei": {
      const rei = reiDe(jogo, a.lado);
      if (!rei) return `sem rei das ${a.lado}`;
      const casa = a.lado === "brancas" ? 2 : 7;
      const intactos = peoesDe(jogo, a.lado).filter(
        (c) => fileira(c) === casa && Math.abs(coluna(c) - coluna(rei)) <= 1,
      );
      return intactos.length === a.intactos
        ? null
        : `são ${intactos.length} peões no escudo (${intactos.sort().join(", ") || "nenhum"})`;
    }

    case "janela-do-rei": {
      const rei = reiDe(jogo, a.lado);
      if (!rei) return `sem rei das ${a.lado}`;
      const ultima = a.lado === "brancas" ? 1 : 8;
      if (fileira(rei) !== ultima) {
        return `o rei está em ${rei}, fora da última fileira — não há janela a medir`;
      }
      const adiante = fileira(rei) + FRENTE[a.lado];
      const janelas: Square[] = [];
      for (let d = -1; d <= 1; d += 1) {
        const c = coluna(rei) + d;
        if (c < 0 || c > 7) continue;
        const casa = casaDe(c, adiante);
        if (!pecaEm(casa)) janelas.push(casa);
      }
      const tem = janelas.length > 0;
      if (tem === a.tem) return null;
      return a.tem
        ? `não há casa vazia à frente do rei em ${rei}`
        : `o rei em ${rei} já tem janela em ${janelas.join(", ")}`;
    }

    case "lances-da-peca": {
      const p = pecaEm(a.casa);
      if (!p) return `${a.casa} está vazia`;
      if (p.color !== jogo.turn()) {
        return `a peça de ${a.casa} não é de quem tem a vez — a conta não existe`;
      }
      const lances = jogo.moves({ square: a.casa as Square });
      return lances.length === a.quantos
        ? null
        : `a peça de ${a.casa} tem ${lances.length} lances (${lances.join(", ") || "nenhum"})`;
    }

    case "roque-disponivel": {
      if (NOME_DA_COR[jogo.turn()] !== a.lado) {
        return `não é a vez das ${a.lado} — o roque não é conferível aqui`;
      }
      const alvo = a.tipo === "curto" ? "O-O" : "O-O-O";
      return jogo.moves().includes(alvo) ? null : `${alvo} não é lance legal`;
    }
  }
}

/* ------------------------------------------------------------------ *
 * A porta que o teste e o gate usam
 * ------------------------------------------------------------------ */

/** O que uma posição de dica precisa ter para ser conferida. */
export type PosicaoConferivel = {
  readonly fen: string;
  readonly afirma: readonly Afirmacao[];
};

/**
 * Todos os problemas de uma posição: a FEN primeiro, as afirmações depois.
 *
 * A FEN vem primeiro e corta o resto: numa posição impossível toda afirmação
 * ou estoura ou responde bobagem, e vinte linhas de erro derivado escondem a
 * única que importa.
 */
export function problemasDaPosicao(posicao: PosicaoConferivel): string[] {
  const problema = fenProblem(posicao.fen);
  if (problema) return [`FEN ilegal: ${problema}`];

  const problemas: string[] = [];
  for (const afirmacao of posicao.afirma) {
    const erro = conferirAfirmacao(posicao.fen, afirmacao);
    if (erro) problemas.push(`${JSON.stringify(afirmacao)} — ${erro}`);
  }
  return problemas;
}
