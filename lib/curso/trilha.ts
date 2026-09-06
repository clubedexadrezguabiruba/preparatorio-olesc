import { CLASSES, TRILHA, type Classe } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { type Semana } from "./calendario.ts";

/**
 * O mapa do curso inteiro por **nível de força** — o que o aluno pergunta
 * quando quer saber o que vem depois.
 *
 * Cada módulo (tática, finais, meio-jogo) tem a própria escada, e elas não
 * conversavam: o bloco de tática fala em rating de puzzle do Lichess, a classe
 * de finais fala em USCF convertida para chess.com, e o meio-jogo não falava em
 * nada. Este arquivo é o único lugar que as põe lado a lado, e diz em qual
 * degrau o aluno está.
 *
 * ## A conversão, dita com todas as letras
 *
 * As faixas abaixo são de **rating de rápidas no chess.com**, que é o número
 * que o aluno conhece. As outras duas escalas entram convertidas:
 *
 * - **classe USCF → chess.com**: o chess.com roda 150–250 pontos acima do USCF
 *   nesta faixa. É a mesma conversão da §1 de `docs/TRILHA-FINAIS.md`, e ela já
 *   está escrita em `CLASSE[c].faixa`.
 * - **rating de puzzle do Lichess → chess.com de rápidas**: puzzle é outra
 *   habilidade e outra escala; a aproximação usada aqui é **puzzle ≈ rápidas +
 *   300** nesta faixa, que é o que casa os blocos 1–2 (600–1400 de puzzle) com
 *   um aluno de 600–1100 de rápidas.
 *
 * As duas são **aproximações declaradas**, não fatos. Elas servem para ordenar
 * a tela, e é por isso que a página escreve "aproximado" ao lado. Ninguém é
 * barrado por elas: todo tema aberto continua clicável em qualquer nível.
 */

/** Quanto o rating de puzzle do Lichess corre acima do rápidas do chess.com. */
export const PUZZLE_ACIMA_DO_RAPIDO = 300;

export type Nivel = {
  readonly id: string;
  /** O rótulo da faixa, em rápidas do chess.com. */
  readonly nome: string;
  /** Fim da faixa (exclusivo no último). `null` = sem teto. */
  readonly ate: number | null;
  /** Uma linha: o que o aluno deste nível está aprendendo a fazer. */
  readonly resumo: string;
  /** As classes de finais que caem neste nível. */
  readonly classes: readonly Classe[];
};

export const NIVEIS: readonly Nivel[] = [
  {
    id: "ate-1000",
    nome: "até 1000",
    ate: 1000,
    resumo: "Não entregar peça, ver o mate em um lance, e dar mate com dama e torre.",
    classes: ["E"],
  },
  {
    id: "1000-1200",
    nome: "1000 a 1200",
    ate: 1200,
    resumo: "Garfo, cravada e espeto; rei e peão contra rei; o rei que vai para a frente.",
    classes: ["D"],
  },
  {
    id: "1200-1400",
    nome: "1200 a 1400",
    ate: 1400,
    resumo: "Remover a defesa, ataque ao rei, e os finais de torre que decidem partida.",
    classes: ["C"],
  },
  {
    id: "1400-1600",
    nome: "1400 a 1600",
    ate: 1600,
    resumo: "Lances finos, defesa, conversão — e as técnicas de final que ninguém improvisa.",
    classes: ["B"],
  },
];

/**
 * Por que um item tem **três** estados, e não um booleano.
 *
 * `/finais` já separava os dois motivos de uma aula estar fechada, com a razão
 * escrita lá: *"abre no Sábado 3"* é uma data que o aluno pode esperar; *"em
 * escrita"* é uma aula que ainda não existe. A `/trilha` nascia desenhando os
 * dois com a mesma pastilha tracejada, e a criança que abrisse a tela no sábado
 * seguinte encontraria metade das promessas cumpridas e metade não, sem saber
 * de antemão quais.
 *
 * A regra é a mesma nos três módulos, e é ordenada — a data primeiro:
 *
 * | quando | estado | o que a pastilha diz |
 * |---|---|---|
 * | o sábado dela ainda não chegou | `por-abrir` | `Sáb 3` |
 * | o sábado chegou e o texto não existe | `em-escrita` | `em escrita` |
 * | o resto | `aberto` | vira link |
 *
 * A data vem primeiro porque é a única das duas que o aluno controla: esperar.
 * Anunciar "em escrita" numa aula cujo sábado é daqui a três semanas seria
 * expor o calendário de autoria a quem não tem nada que fazer com ele.
 */
export type Situacao = "aberto" | "por-abrir" | "em-escrita";

export type ItemDoNivel = {
  readonly id: string;
  /** O que o aluno lê: "4. Motivos fundamentais", "10. Rei e peão contra rei". */
  readonly nome: string;
  readonly href: string;
  /** Quantas unidades tem (puzzles, etapas), para a linha de progresso. */
  readonly total: number;
  readonly feitos: number;
  readonly situacao: Situacao;
  /**
   * O sábado em que o item abre. É `null` só no meio-jogo, que não espera
   * sábado nenhum — as trinta dicas estão abertas desde o primeiro dia.
   */
  readonly sabado: Semana | null;
};

/** Clicável hoje. Existe para que nenhuma tela compare a string à mão. */
export function estaAberto(item: ItemDoNivel): boolean {
  return item.situacao === "aberto";
}

export type ModuloDoNivel = {
  readonly modulo: "tatica" | "finais" | "meio-jogo";
  readonly itens: readonly ItemDoNivel[];
};

/** Em que nível cai um bloco de tática, pela faixa de puzzle dele. */
export function nivelDoBloco(faixa: readonly [number, number]): string {
  const equivalente = faixa[0] - PUZZLE_ACIMA_DO_RAPIDO;
  for (const nivel of NIVEIS) {
    if (nivel.ate === null || equivalente < nivel.ate) return nivel.id;
  }
  return NIVEIS[NIVEIS.length - 1].id;
}

/** Em que nível cai uma classe de finais. */
export function nivelDaClasse(classe: Classe): string {
  return NIVEIS.find((n) => n.classes.includes(classe))?.id ?? NIVEIS[0].id;
}

/**
 * Onde o aluno está: o primeiro nível que ainda tem coisa aberta por fazer.
 *
 * Não é o rating dele, e não é o nível mais alto que ele tocou: é onde o
 * trabalho está. Um aluno que dominou tudo o que está aberto recebe `null`, e
 * a tela diz isso em vez de apontar para um degrau vazio.
 */
export function vocEstaAqui(
  porNivel: ReadonlyMap<string, readonly ModuloDoNivel[]>,
): string | null {
  for (const nivel of NIVEIS) {
    const modulos = porNivel.get(nivel.id) ?? [];
    const temTrabalho = modulos.some((m) =>
      m.itens.some((i) => estaAberto(i) && i.feitos < i.total),
    );
    if (temTrabalho) return nivel.id;
  }
  return null;
}

/** Quantas aulas de finais e blocos de tática cada nível tem, no total. */
export function tamanhoDoNivel(id: string): { tatica: number; finais: number } {
  return {
    tatica: BLOCOS.filter((b) => nivelDoBloco(b.faixa) === id).length,
    finais: TRILHA.filter((a) => nivelDaClasse(a.classe) === id).length,
  };
}

/** As classes, na ordem, para a tela não reimportar a lista. */
export const CLASSES_EM_ORDEM = CLASSES;
