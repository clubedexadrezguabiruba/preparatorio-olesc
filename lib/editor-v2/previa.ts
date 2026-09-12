/**
 * A prévia do Editor v2: o que o aluno vai ver, montado a partir do documento (§15).
 *
 * ## O que este arquivo é, e o que ele não é
 *
 * Ele **não é um player**. §15.1 é explícito — *"usa o mesmo runtime do aluno, nunca um
 * segundo player aproximado"* —, e o plano final §16 repete: *"não reproduzir o
 * comportamento pedagógico em um segundo player exclusivo do editor"*. O player
 * continua sendo o `ObjectiveStage`, com o relógio de leitura, a digitação da fala, o
 * som do lance e o palco do aluno.
 *
 * O que mora aqui é a **tradução**: dado o documento v2, quais posições, falas e
 * desenhos o player recebe, em que ordem, e onde uma comparação volta ao ponto de
 * escolha. É conta pura, roda em Node, e é o que pode ser provado sem tela.
 *
 * ## As três entradas de §15.1
 *
 * - **a aula inteira** — um trecho por capítulo, na ordem do `fluxo`, que é a única
 *   ordem pedagógica do documento;
 * - **o capítulo** — só ele;
 * - **daqui** — o capítulo a partir do lance selecionado, quando ele está no percurso.
 *
 * ## A comparação (§15.3) é calculada, não declarada
 *
 * O documento não tem um campo "isto é uma comparação", e não deve ter: os capítulos de
 * comparação nascem de *"mostrar esta variante na aula"*, que só cria um capítulo
 * apontando para um percurso. Um campo a mais seria uma segunda verdade, capaz de
 * divergir do percurso no dia em que um dos dois mudasse.
 *
 * Então a comparação é **lida dos percursos**: dois capítulos da mesma análise que
 * compartilham um começo e depois se separam estão comparando linhas, e o último nó do
 * começo comum é o **ponto de escolha**. É o que §15.3 pede que a experiência mostre:
 * *"retornar de forma compreensível à posição de comparação"*.
 *
 * Quando há mais de um candidato, vale o de **começo comum mais longo** — é o mais
 * próximo, e é a bifurcação que o professor acabou de criar.
 */
import { mapaDaAnalise } from "./arvore.ts";
import type { AulaV2, CapituloV2, DesenhoV2 } from "./modelo.ts";
import type { Position } from "../lesson/schema.ts";

/** Um passo da prévia: uma fala, e o que acontece no tabuleiro enquanto ela é dita. */
export type PassoDaPrevia = {
  /** O nó do percurso que este passo mostra. Vários passos podem ter o mesmo nó. */
  nodeId: string;
  /** O lance em UCI. Ausente no passo da posição de partida e nos passos que só falam. */
  lance?: string;
  /** A narração do capítulo para este nó. Vazia quando o professor ainda não escreveu. */
  fala: string;
  /** Os desenhos da posição, com a cor da autoria. */
  desenhos?: DesenhoV2;
  /** §15.2: a pausa que exige "Continuar" em vez de andar sozinha. */
  pausaManual: boolean;
  /**
   * §15.3: este passo é o **retorno ao ponto de escolha**, e não uma narração do
   * professor. Ele nasce na prévia da aula inteira, some na prévia do capítulo
   * sozinho, e nunca entra no documento.
   *
   * Ele é um passo do próprio player, e não uma tela à parte, porque o retorno é uma
   * coisa que acontece **no tabuleiro**: a posição da bifurcação volta, e a frase
   * explica o que muda dali. Uma tela intermediária tiraria o tabuleiro justamente do
   * momento em que ele é o argumento.
   */
  retorno?: boolean;
};

/** §15.3: este trecho volta a uma posição já mostrada, para mostrar a outra linha. */
export type ComparacaoDaPrevia = {
  comCapituloId: string;
  comTitulo: string;
  /** O ponto de escolha: o último nó que as duas linhas têm em comum. */
  nodeId: string;
  /** Como o professor chama esse ponto: "3. Rg2", ou "a posição inicial". */
  rotulo: string;
  /** A posição do ponto de escolha, para o cartão de retorno mostrar o tabuleiro certo. */
  fen: string;
  /** O que a outra linha jogou dali, e o que esta joga. */
  outraSegue: string;
  estaSegue: string;
  /** A frase que o player diz, com o tabuleiro parado na bifurcação. */
  texto: string;
};

export type TrechoDaPrevia = {
  capituloId: string;
  titulo: string;
  /** A posição de partida deste trecho. */
  fen: string;
  orientacao: "white" | "black";
  passos: PassoDaPrevia[];
  comparacao?: ComparacaoDaPrevia;
};

export type Previa = {
  escopo: "aula" | "capitulo" | "daqui";
  /** O que a barra da prévia diz que está sendo visto. */
  rotulo: string;
  trechos: TrechoDaPrevia[];
};

/** O percurso de um capítulo, como lista de nós: o início e o caminho. */
export function percursoDoCapitulo(capitulo: CapituloV2): string[] {
  return [capitulo.inicioNodeId, ...capitulo.caminho];
}

/**
 * Dá para começar a prévia deste lance?
 *
 * Só quando ele está no percurso do capítulo. Um lance de variante não pertence ao que
 * o capítulo mostra, e "daqui" a partir dele mostraria uma linha que a aula não tem —
 * §15.2 é explícito: *"variantes de análise não tocam sozinhas: o capítulo reproduz
 * somente seu percurso"*.
 */
export function podePreverDaqui(capitulo: CapituloV2, nodeId: string): boolean {
  return percursoDoCapitulo(capitulo).includes(nodeId);
}

/** Os capítulos na ordem do fluxo — a única ordem pedagógica (§18). */
function capitulosNoFluxo(aula: AulaV2): CapituloV2[] {
  const porId = new Map(aula.capitulos.map((capitulo) => [capitulo.id, capitulo]));
  const ordenados: CapituloV2[] = [];
  for (const etapa of aula.fluxo) {
    if (etapa.tipo !== "capitulo") continue;
    const capitulo = porId.get(etapa.entidadeId);
    if (capitulo) ordenados.push(capitulo);
  }
  // Capítulo fora do fluxo é um problema que o diagnóstico acusa; aqui ele não some,
  // porque uma prévia que esconde conteúdo faria o professor procurar o defeito errado.
  for (const capitulo of aula.capitulos) {
    if (!ordenados.some((item) => item.id === capitulo.id)) ordenados.push(capitulo);
  }
  return ordenados;
}

/**
 * Os passos de um capítulo, a partir de um nó do percurso.
 *
 * O primeiro passo é a posição de partida e não tem lance: é ela que o aluno vê antes
 * de qualquer peça se mexer. Um nó com **várias** narrações vira vários passos — o
 * primeiro com o lance, os outros parados na mesma posição, que é exatamente como o
 * `montarQuadros` do runtime do aluno entende um passo sem lance.
 */
function passosDoTrecho(aula: AulaV2, capitulo: CapituloV2, de: string): PassoDaPrevia[] {
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
  if (!analise) return [];
  const percurso = percursoDoCapitulo(capitulo);
  const inicio = Math.max(0, percurso.indexOf(de));
  const passos: PassoDaPrevia[] = [];
  for (let i = inicio; i < percurso.length; i += 1) {
    const nodeId = percurso[i];
    const no = analise.nos[nodeId];
    if (!no) continue;
    const falas = capitulo.narracoes.filter((narracao) => narracao.nodeId === nodeId);
    const lance = i > inicio ? no.uci : undefined;
    if (!falas.length) {
      passos.push({ nodeId, lance, fala: "", desenhos: no.desenhos, pausaManual: false });
      continue;
    }
    falas.forEach((narracao, ordem) => {
      passos.push({
        nodeId,
        // Só a primeira narração do nó carrega o lance; as seguintes falam da mesma
        // posição. Repetir o lance o jogaria duas vezes.
        lance: ordem === 0 ? lance : undefined,
        fala: narracao.texto,
        desenhos: no.desenhos,
        pausaManual: narracao.pausa === "manual",
      });
    });
  }
  return passos;
}

/**
 * O tamanho do começo que dois percursos têm em comum.
 *
 * Só conta como começo comum o que vem **do mesmo nó**: dois capítulos de análises
 * diferentes podem ter lances iguais e não estarem comparando nada.
 */
function comecoComum(a: readonly string[], b: readonly string[]): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n += 1;
  return n;
}

function comparacaoDoTrecho(
  aula: AulaV2,
  capitulo: CapituloV2,
  anteriores: readonly CapituloV2[],
  positions: Record<string, Position>,
): ComparacaoDaPrevia | undefined {
  const meu = percursoDoCapitulo(capitulo);
  let melhor: { outro: CapituloV2; n: number } | null = null;
  for (const outro of anteriores) {
    if (outro.analiseId !== capitulo.analiseId) continue;
    const seu = percursoDoCapitulo(outro);
    const n = comecoComum(meu, seu);
    // `n < meu.length` e `n < seu.length`: as duas linhas precisam **seguir** dali,
    // ou não há escolha nenhuma para comparar — uma é só o começo da outra.
    if (n === 0 || n >= meu.length || n >= seu.length) continue;
    if (!melhor || n > melhor.n) melhor = { outro, n };
  }
  if (!melhor) return undefined;

  const mapa = mapaDaAnalise(aula, capitulo.analiseId, positions);
  const bifurcacao = meu[melhor.n - 1];
  const seu = percursoDoCapitulo(melhor.outro);
  const rotuloDoNo = (id: string) => {
    const san = mapa.sans[id];
    if (!san) return "a posição inicial";
    return `${mapa.rotulos[id] ?? ""} ${san}`.trim();
  };
  const rotulo = rotuloDoNo(bifurcacao);
  const outraSegue = rotuloDoNo(seu[melhor.n]);
  const estaSegue = rotuloDoNo(meu[melhor.n]);
  // "Voltamos a a posição inicial" não é frase. A preposição muda com o rótulo, e
  // isto é a única contração do arquivo — não vale uma biblioteca.
  const onde = rotulo === "a posição inicial" ? "à posição inicial" : `a ${rotulo}`;
  return {
    comCapituloId: melhor.outro.id,
    comTitulo: melhor.outro.titulo,
    nodeId: bifurcacao,
    rotulo,
    fen: mapa.quadros[bifurcacao]?.fen ?? "",
    outraSegue,
    estaSegue,
    texto: `Voltamos ${onde}. Em «${melhor.outro.titulo}» a partida seguiu com ${outraSegue}; agora, a outra escolha: ${estaSegue}.`,
  };
}

/**
 * O passo de retorno, inserido **depois** do último passo da bifurcação.
 *
 * Depois, e não antes: o tabuleiro precisa já estar na posição da escolha quando a
 * frase é dita. Antes, ela falaria de uma posição que ainda não está na tela.
 */
function comRetorno(passos: PassoDaPrevia[], comparacao: ComparacaoDaPrevia): PassoDaPrevia[] {
  let ultimo = -1;
  passos.forEach((passo, i) => {
    if (passo.nodeId === comparacao.nodeId) ultimo = i;
  });
  if (ultimo < 0) return passos;
  const retorno: PassoDaPrevia = {
    nodeId: comparacao.nodeId,
    fala: comparacao.texto,
    pausaManual: false,
    retorno: true,
  };
  return [...passos.slice(0, ultimo + 1), retorno, ...passos.slice(ultimo + 1)];
}

function trechoDoCapitulo(
  aula: AulaV2,
  capitulo: CapituloV2,
  positions: Record<string, Position>,
  de?: string,
): TrechoDaPrevia {
  const mapa = mapaDaAnalise(aula, capitulo.analiseId, positions);
  const percurso = percursoDoCapitulo(capitulo);
  const partida = de && percurso.includes(de) ? de : percurso[0];
  return {
    capituloId: capitulo.id,
    titulo: capitulo.titulo,
    fen: mapa.quadros[partida]?.fen ?? "",
    orientacao: capitulo.orientacao,
    passos: passosDoTrecho(aula, capitulo, partida),
  };
}

/** §15.1: a prévia de um capítulo, inteiro ou a partir do lance selecionado. */
export function previaDoCapitulo(
  aula: AulaV2,
  positions: Record<string, Position>,
  capituloId: string,
  de?: string,
): Previa {
  const capitulo = aula.capitulos.find((item) => item.id === capituloId);
  if (!capitulo) throw new Error(`capítulo inexistente: ${capituloId}`);
  const daqui = Boolean(de && podePreverDaqui(capitulo, de));
  const trecho = trechoDoCapitulo(aula, capitulo, positions, daqui ? de : undefined);
  return {
    escopo: daqui ? "daqui" : "capitulo",
    rotulo: daqui ? `«${capitulo.titulo}», daqui em diante` : `«${capitulo.titulo}»`,
    trechos: [trecho],
  };
}

/** §15.1: a aula inteira, na ordem do fluxo, com os retornos de comparação marcados. */
export function previaDaAula(aula: AulaV2, positions: Record<string, Position>): Previa {
  const capitulos = capitulosNoFluxo(aula);
  const trechos: TrechoDaPrevia[] = [];
  capitulos.forEach((capitulo, i) => {
    const trecho = trechoDoCapitulo(aula, capitulo, positions);
    const comparacao = comparacaoDoTrecho(aula, capitulo, capitulos.slice(0, i), positions);
    trechos.push(comparacao ? { ...trecho, comparacao, passos: comRetorno(trecho.passos, comparacao) } : trecho);
  });
  return { escopo: "aula", rotulo: `A aula «${aula.titulo}», inteira`, trechos };
}

/* ------------------------------------------------------------------ *
 * O relógio da prévia (§15.2)
 * ------------------------------------------------------------------ */

/** As três velocidades de §15.2, e nenhuma outra. */
export const VELOCIDADES = [0.5, 1, 2] as const;
export type Velocidade = (typeof VELOCIDADES)[number];

/**
 * O intervalo de um passo **sem fala** — o lance que só acontece.
 *
 * É o mesmo piso que o runtime do aluno usa (`PAUSA_MINIMA_MS`, em
 * `lib/lesson/roteiro.ts`), e está repetido aqui de propósito: lá ele é o **piso da
 * leitura**, aqui ele é um **intervalo**. São dois números com o mesmo valor e
 * significados diferentes, e é por isso que a velocidade mexe neste e não naquele.
 */
export const INTERVALO_SEM_FALA_MS = 1000;

/**
 * Quanto o passo espera antes do próximo — `null` quando ele **não anda sozinho**.
 *
 * ## A regra de §15.2, escrita como código
 *
 * > *"Velocidade altera movimentos e intervalos. No primeiro corte, o tempo de leitura
 * > da narração continua calculado pela régua existente e não é comprimido pela
 * > velocidade."*
 *
 * Onde há texto, o relógio é a **régua de leitura** do aluno (`pausaDoPasso`), e a
 * velocidade não encosta nela: acelerar a leitura é acelerar o aluno, e o plano final
 * §6 diz por que não — *"isso evita acelerar involuntariamente a leitura"*.
 *
 * Onde **não** há texto, o que corre não é leitura, é intervalo: o lance acontece e o
 * próximo vem. Aí a velocidade vale inteira. Numa partida importada, em que a maioria
 * dos lances ainda não tem narração, é isso que faz o 2× ser de fato duas vezes mais
 * rápido — e o capítulo narrado continuar legível.
 *
 * A pausa manual devolve `null`: quem anda é o professor, no botão "Continuar".
 */
export function pausaDaPrevia(
  passo: PassoDaPrevia,
  velocidade: number,
  reguaDeLeitura: (fala: string) => number,
): number | null {
  if (passo.pausaManual) return null;
  if (!passo.fala) return Math.round(INTERVALO_SEM_FALA_MS / velocidade);
  return reguaDeLeitura(passo.fala);
}

/** A duração da animação da peça, que é "movimento" e por isso obedece à velocidade. */
export const ANIMACAO_PADRAO_MS = 180;
export function animacaoDaPrevia(velocidade: number): number {
  return Math.round(ANIMACAO_PADRAO_MS / velocidade);
}
