/**
 * A paleta clicável de desenho do Editor v2 (§10.2 e §25).
 *
 * ## Por que ela existe
 *
 * O desenho já nascia no tabuleiro com o botão direito, e as quatro cores já saíam de
 * Shift e Alt. §10.2 pede a outra porta, com uma frase que é um requisito e não um
 * enfeite: *"a tela também possui ferramentas clicáveis: seta, casa, cor e limpar,
 * **para que o recurso seja descoberto sem conhecer atalhos**"*. §25 diz a mesma coisa
 * por outro lado: *"ação de botão direito tem equivalente em botão/teclado"*.
 *
 * Com a paleta, desenhar vira: escolher a ferramenta, escolher a cor, clicar nas casas.
 * Nenhuma tecla precisa ser segurada, e nada do gesto antigo muda.
 *
 * ## Por que a conta mora num arquivo puro
 *
 * Pelo mesmo motivo de `desenhos.ts`: o clique no tabuleiro não se prova por script — o
 * chessground só confia em evento de ponteiro de verdade (`drag.js:6`). Então a máquina
 * de estados fica aqui, onde roda em Node sem tela, e o que sobra para o teste humano é
 * o gesto, não a regra.
 *
 * ## A regra do segundo clique é a mesma do botão direito
 *
 * O chessground, no `addShape` (`draw.js`), faz três coisas com o traço novo: se já
 * existe um com **as mesmas pontas** e a **mesma cor**, ele apaga; se existe com cor
 * diferente, ele troca a cor; se não existe, acrescenta. A paleta repete isso à risca.
 * Duas portas para o mesmo desenho com duas regras diferentes seriam duas maneiras de
 * o professor se enganar.
 */
import { PINCEL_POR_COR } from "../chess/annotations.ts";
import type { FormaCrua } from "./desenhos.ts";
import type { CorDesenhoV2 } from "./modelo.ts";

/**
 * O que o clique no tabuleiro faz agora.
 *
 * `mover` é o estado normal do editor: clicar e arrastar joga um lance. As outras duas
 * desligam o movimento de peça enquanto durarem — sem isso, o mesmo clique tentaria
 * desenhar e mexer a peça ao mesmo tempo.
 */
export type FerramentaDeDesenho = "mover" | "seta" | "casa";

export type EstadoDaPaleta = {
  ferramenta: FerramentaDeDesenho;
  cor: CorDesenhoV2;
  /**
   * A casa de partida de uma seta já começada.
   *
   * Uma seta precisa de duas casas, e o tabuleiro só sabe falar de uma por vez. Entre
   * o primeiro e o segundo clique a paleta guarda a origem aqui, e a tela diz em voz
   * alta que está esperando o destino.
   */
  origem?: string;
};

export const ESTADO_INICIAL_DA_PALETA: EstadoDaPaleta = { ferramenta: "mover", cor: "verde" };

/** As quatro cores, na ordem em que aparecem na tela e nos atalhos do Lichess. */
export const CORES_DA_PALETA: readonly CorDesenhoV2[] = ["verde", "vermelho", "azul", "amarelo"];

/** O resultado de um clique: o estado novo e, quando houve traço, a lista nova de formas. */
export type EfeitoDoClique = {
  estado: EstadoDaPaleta;
  /** Ausente quando o clique não mexeu no desenho (escolheu a origem, ou desistiu). */
  formas?: FormaCrua[];
};

const mesmasPontas = (a: FormaCrua, b: FormaCrua) => a.orig === b.orig && (a.dest ?? null) === (b.dest ?? null);

/** A regra do `addShape` do chessground, escrita uma vez e usada pelas duas portas. */
function comForma(formas: readonly FormaCrua[], nova: FormaCrua): FormaCrua[] {
  const anterior = formas.find((forma) => mesmasPontas(forma, nova));
  const restantes = formas.filter((forma) => !mesmasPontas(forma, nova));
  // Mesmo gesto, mesma cor: o professor está apagando.
  if (anterior && anterior.brush === nova.brush) return restantes;
  return [...restantes, nova];
}

/**
 * O professor clicou numa casa do tabuleiro.
 *
 * Com a ferramenta `casa`, um clique acende ou apaga aquela casa. Com `seta`, o
 * primeiro clique marca a origem e o segundo fecha o traço; clicar duas vezes na mesma
 * casa **desiste** da seta em vez de virar uma casa acesa — a ferramenta de acender
 * casa é a outra, e adivinhar qual delas o professor queria seria inventar intenção.
 */
export function cliqueNaCasa(
  estado: EstadoDaPaleta,
  formas: readonly FormaCrua[],
  casa: string,
): EfeitoDoClique {
  if (estado.ferramenta === "mover") return { estado };
  const brush = PINCEL_POR_COR[estado.cor];
  // Cor sem pincel seria uma forma que o tabuleiro desenha com o padrão dele e que
  // `desenhos.ts` depois descarta — um traço que some sem erro. Melhor não criar.
  if (!brush) return { estado };

  if (estado.ferramenta === "casa") {
    return { estado, formas: comForma(formas, { orig: casa, brush }) };
  }

  if (!estado.origem) return { estado: { ...estado, origem: casa } };
  if (estado.origem === casa) return { estado: { ...estado, origem: undefined } };
  return {
    estado: { ...estado, origem: undefined },
    formas: comForma(formas, { orig: estado.origem, dest: casa, brush }),
  };
}

/**
 * Clicar na ferramenta que já está ligada a desliga.
 *
 * Sem isso, quem entrasse no modo desenho não teria como voltar a mover peça a não ser
 * descobrindo o botão "Mover peças" — e um modo em que não se sabe entrar e sair é um
 * modo em que o professor fica preso.
 */
export function escolherFerramenta(estado: EstadoDaPaleta, ferramenta: FerramentaDeDesenho): EstadoDaPaleta {
  const nova = estado.ferramenta === ferramenta ? "mover" : ferramenta;
  return { ...estado, ferramenta: nova, origem: undefined };
}

/**
 * Trocar a cor **não** desiste da seta em curso.
 *
 * Quem já marcou a origem e percebeu que queria outra cor não deveria ter de começar de
 * novo; e a cor que vale é a do momento em que o traço nasce, que é o segundo clique.
 */
export function escolherCor(estado: EstadoDaPaleta, cor: CorDesenhoV2): EstadoDaPaleta {
  return { ...estado, cor };
}

/** Esc, ou qualquer saída: esquece a seta pela metade sem sair do modo desenho. */
export function desistirDaSeta(estado: EstadoDaPaleta): EstadoDaPaleta {
  return estado.origem ? { ...estado, origem: undefined } : estado;
}

/**
 * A frase que a tela mostra embaixo do tabuleiro.
 *
 * Ela existe aqui, e não no componente, porque é a única parte da paleta que o teste
 * consegue ler sem abrir o navegador: se a instrução divergir do estado, o teste
 * acusa.
 */
export function instrucaoDaPaleta(estado: EstadoDaPaleta): string {
  if (estado.ferramenta === "mover") {
    return "Arraste uma peça para acrescentar um lance a partir da posição selecionada. Promoção usa dama por padrão.";
  }
  if (estado.ferramenta === "casa") {
    return "Clique numa casa para acendê-la. Clicar de novo na mesma casa, com a mesma cor, apaga.";
  }
  if (estado.origem) {
    return `Seta de ${estado.origem}: clique na casa de destino. Clicar em ${estado.origem} de novo desiste.`;
  }
  return "Clique na casa de onde a seta parte e depois na casa de destino.";
}
