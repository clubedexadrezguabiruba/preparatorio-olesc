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
import { dominioDaAulaV2 } from "./dominio.ts";
import { sanEmPortugues } from "../repertorio/treino.ts";
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
  /** Os símbolos do lance que levou a esta posição (`!`, `??`, `$14`…) — a regra dos símbolos vale até o aluno. */
  nags?: number[];
  /** §15.2: a pausa que exige "Continuar" em vez de andar sozinha. */
  pausaManual: boolean;
  /** O rótulo da fala marcada no estudo (`[ARMADILHA]` → "Armadilha"), §13.3.5. */
  rotulo?: string;
  /** A pausa extra da narração, somada à leitura (o `espera` do roteiro v1). */
  esperaMs?: number;
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
  /**
   * A fita voltando (regra do Doug, 18/9/2026): este passo desfaz **um** lance, rápido, sem fala,
   * sem som e sem desenho, até o ponto de escolha de uma variante tocada na hora. O `nodeId` é a
   * posição a que ele volta. Como o retorno, nasce aqui e nunca entra no documento.
   */
  recuo?: boolean;
  /**
   * A pergunta jogada **dentro** do capítulo (curso de abertura, 18/9/2026): o id do treino
   * `papel: "parada"` da etapa. O tabuleiro está na posição da pergunta, a fala é a pergunta, e o
   * relógio não anda — quem anda é o aluno, jogando. O passo seguinte é o lance-resposta.
   */
  parada?: string;
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
  // A variante tocada dentro de uma etapa tem lugar: não é "fora do fluxo".
  const tocadas = new Set(aula.fluxo.flatMap((etapa) => etapa.comparacoes ?? []));
  for (const capitulo of aula.capitulos) {
    if (!tocadas.has(capitulo.id) && !ordenados.some((item) => item.id === capitulo.id)) ordenados.push(capitulo);
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
  for (let i = inicio; i < percurso.length; i += 1) passos.push(...passosDoNo(analise, capitulo, percurso[i], i > inicio));
  return passos;
}

/** Os passos de um nó do percurso: um por narração, ou um mudo. `comLance`: o nó entra jogando o lance que leva a ele. */
function passosDoNo(analise: AulaV2["analises"][number], capitulo: CapituloV2, nodeId: string, comLance: boolean, paradas?: ReadonlyMap<string, ParadaNoNo>): PassoDaPrevia[] {
  const no = analise.nos[nodeId];
  if (!no) return [];
  const falas = capitulo.narracoes.filter((narracao) => narracao.nodeId === nodeId);
  const lance = comLance ? no.uci : undefined;
  // O símbolo é do lance, e vale em toda fala parada na posição que ele criou.
  const nags = comLance && no.nags?.length ? { nags: no.nags } : {};
  // A pergunta vem depois das falas do nó, parada na mesma posição: o lance-resposta é o nó seguinte.
  const parada = paradas?.get(nodeId);
  const pergunta: PassoDaPrevia[] = parada ? [{ nodeId, fala: parada.fala, pausaManual: false, parada: parada.treinoId }] : [];
  if (!falas.length) {
    // Sem fala e com pergunta: o lance entra no próprio passo da pergunta, sem um passo mudo antes.
    if (parada) return [{ ...pergunta[0], ...(lance ? { lance } : {}), ...(no.desenhos ? { desenhos: no.desenhos } : {}), ...nags }];
    return [{ nodeId, lance, fala: "", desenhos: no.desenhos, pausaManual: false, ...nags }];
  }
  return [...falas.map((narracao, ordem) => ({
    nodeId,
    // Só a primeira narração do nó carrega o lance; as seguintes falam da mesma
    // posição. Repetir o lance o jogaria duas vezes.
    lance: ordem === 0 ? lance : undefined,
    fala: narracao.texto,
    // A fala com desenho próprio manda nele; sem, vale o desenho da posição.
    desenhos: narracao.desenhos ?? no.desenhos,
    pausaManual: narracao.pausa === "manual",
    ...(narracao.rotulo ? { rotulo: narracao.rotulo } : {}),
    ...(narracao.esperaMs ? { esperaMs: narracao.esperaMs } : {}),
    ...nags,
  })), ...pergunta];
}

/** A pergunta de um nó: o treino que a faz e a frase dela. */
type ParadaNoNo = { treinoId: string; fala: string };

/** As perguntas que a etapa deste capítulo faz, pelo nó da posição de cada uma. */
function paradasDaEtapa(aula: AulaV2, capitulo: CapituloV2): Map<string, ParadaNoNo> {
  const etapa = aula.fluxo.find((item) => item.tipo === "capitulo" && item.entidadeId === capitulo.id);
  const mapa = new Map<string, ParadaNoNo>();
  for (const id of etapa?.paradas ?? []) {
    const treino = aula.treinos.find((item) => item.id === id && item.papel === "parada" && item.inicio.analiseId === capitulo.analiseId);
    if (treino) mapa.set(treino.inicio.nodeId, { treinoId: treino.id, fala: treino.introducao ?? treino.objetivo ?? "" });
  }
  return mapa;
}

/**
 * A ordem em que a fita toca as linhas de uma etapa de curso de abertura (Doug, 18/9/2026): **a
 * principal até o fim**, e depois a fita volta a cada ramo — do mais fundo ao mais raso, e o ramo
 * de um ramo logo depois dele. Cada percurso é a lista de nós desde a raiz; o primeiro é a linha
 * principal. Devolve os índices, na ordem de tocar.
 *
 * A mãe de cada ramo é a linha **anterior** na lista com o começo comum mais longo — a mesma conta
 * de `passosNaHora`. O planejador (`planejar-curso.ts`) grava as `comparacoes` da etapa nesta ordem;
 * o Laboratório, que toca na ordem dos casos, não passa por aqui.
 */
export function ordemDaFita(percursos: readonly (readonly string[])[]): number[] {
  if (!percursos.length) return [];
  const filhas = new Map<number, { indice: number; ponto: number }[]>();
  percursos.forEach((meu, k) => {
    if (k === 0) return;
    let mae = -1;
    let maior = 0;
    percursos.slice(0, k).forEach((seu, j) => {
      const n = comecoComum(meu, seu);
      if (n === 0 || n >= meu.length || n >= seu.length) return;
      if (n > maior) { maior = n; mae = j; }
    });
    if (mae >= 0) filhas.set(mae, [...(filhas.get(mae) ?? []), { indice: k, ponto: maior }]);
  });
  const ordem: number[] = [];
  const tocar = (linha: number) => {
    ordem.push(linha);
    // Do ponto mais fundo ao mais raso; no empate, a ordem do estudo.
    const dela = [...(filhas.get(linha) ?? [])].sort((a, b) => b.ponto - a.ponto || a.indice - b.indice);
    for (const filha of dela) tocar(filha.indice);
  };
  tocar(0);
  // Linha que não sai de nenhuma outra desta etapa fica no fim, na ordem do estudo: não se perde.
  percursos.forEach((_, k) => { if (!ordem.includes(k)) ordem.push(k); });
  return ordem;
}

/**
 * A etapa de capítulo do curso de abertura, tocada pela fita (Doug, 18/9/2026): as linhas na ordem
 * das `comparacoes` da etapa (que o planejador gravou pela `ordemDaFita`, ou pelos casos no
 * Laboratório), cada uma até o fim; entre uma e outra, a fita volta — um passo de `recuo` por lance
 * — até o ponto onde as duas se separam, a fala diz "Voltamos a…", e a linha seguinte avança dali.
 * As perguntas (`paradas`) entram no nó delas, dentro da linha que as tem.
 */
function passosPelaFita(
  aula: AulaV2,
  capitulo: CapituloV2,
  variantes: readonly CapituloV2[],
  de: string,
  rotuloDoNo: (id: string) => string,
): PassoDaPrevia[] {
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
  if (!analise) return [];
  const paradas = paradasDaEtapa(aula, capitulo);
  const passos: PassoDaPrevia[] = [];
  let naTela: string[] = [];
  const linhas = [capitulo, ...variantes];
  linhas.forEach((linha, k) => {
    const percurso = percursoDoCapitulo(linha);
    let desde = Math.max(0, percurso.indexOf(de));
    if (k > 0) {
      const comum = comecoComum(naTela, percurso);
      if (comum === 0 || comum >= percurso.length) return; // variante de outra raiz, ou sem lance próprio
      desde = comum - 1;
      for (let j = naTela.length - 1; j > desde; j -= 1) passos.push({ nodeId: naTela[j - 1], fala: "", pausaManual: false, recuo: true });
      const seguinte = percurso[desde + 1];
      const simbolo = analise.nos[seguinte]?.nags?.map((n) => GRAFIA_DO_SIMBOLO[n]).find(Boolean) ?? "";
      const rotulo = rotuloDoNo(percurso[desde]);
      const onde = rotulo === "a posição inicial" ? "à posição inicial" : `a ${rotulo}`;
      // "A outra escolha" só quando a linha nova se separa das já tocadas exatamente aqui. Senão (o
      // Laboratório indo a um caso que sai mais adiante), a fita volta e avança até ele.
      const separaAqui = linhas.slice(0, k).every((antes) => comecoComum(percursoDoCapitulo(antes), percurso) <= comum);
      passos.push({ nodeId: percurso[desde], fala: separaAqui ? `Voltamos ${onde}. A outra escolha: ${rotuloDoNo(seguinte)}${simbolo}.` : `Voltamos ${onde}.`, pausaManual: false, retorno: true });
    }
    // Depois da volta o tabuleiro já está no ponto de escolha: a linha nova começa no lance seguinte.
    for (let i = k > 0 ? desde + 1 : desde; i < percurso.length; i += 1) passos.push(...passosDoNo(analise, linha, percurso[i], i > desde, paradas));
    naTela = percurso;
  });
  return passos;
}

/** As variantes que a etapa deste capítulo toca na hora — só as da mesma análise, na ordem da etapa. */
function variantesDaEtapa(aula: AulaV2, capitulo: CapituloV2): CapituloV2[] {
  const etapa = aula.fluxo.find((item) => item.tipo === "capitulo" && item.entidadeId === capitulo.id);
  return (etapa?.comparacoes ?? []).flatMap((id) => aula.capitulos.find((item) => item.id === id && item.analiseId === capitulo.analiseId) ?? []);
}

const GRAFIA_DO_SIMBOLO: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

/**
 * O capítulo com as variantes tocadas **na hora** — a regra do Doug de 18/9/2026, e a decisão dele
 * de 17/9 sobre o momento: quando a aula chega à posição da escolha,
 *
 * 1. joga a variante até a consequência (as falas dela, do cadastro dela);
 * 2. a fita volta, um passo de `recuo` por lance, até a posição da escolha;
 * 3. o passo de retorno diz "Voltamos a…";
 * 4. a linha segue com o lance dela.
 *
 * Variante dentro de variante é a mesma coisa, uma dentro da outra. A mãe de cada variante é a
 * linha **anterior** a ela na lista com o começo comum mais longo — a importação lista a mãe antes
 * das filhas (`capitulosDasVariantes`), e no empate fica a linha principal, que vem primeiro. Duas
 * variantes do mesmo ponto tocam uma depois da outra, e o retorno de cada uma anuncia a seguinte.
 */
function passosNaHora(
  aula: AulaV2,
  capitulo: CapituloV2,
  variantes: readonly CapituloV2[],
  de: string,
  rotuloDoNo: (id: string) => string,
): PassoDaPrevia[] {
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
  if (!analise) return [];
  const linhas = [capitulo, ...variantes];
  const filhas = new Map<string, { variante: CapituloV2; ponto: number }[]>();
  linhas.forEach((variante, k) => {
    if (k === 0) return;
    const meu = percursoDoCapitulo(variante);
    let melhor: { mae: CapituloV2; n: number } | null = null;
    for (const mae of linhas.slice(0, k)) {
      const seu = percursoDoCapitulo(mae);
      const n = comecoComum(meu, seu);
      if (n === 0 || n >= meu.length || n >= seu.length) continue;
      if (!melhor || n > melhor.n) melhor = { mae, n };
    }
    // Variante que não sai de linha nenhuma desta etapa não tem onde tocar.
    if (melhor) filhas.set(melhor.mae.id, [...(filhas.get(melhor.mae.id) ?? []), { variante, ponto: melhor.n - 1 }]);
  });

  const passos: PassoDaPrevia[] = [];
  const tocar = (linha: CapituloV2, desde: number, entraJogando: boolean) => {
    const percurso = percursoDoCapitulo(linha);
    for (let i = desde; i < percurso.length; i += 1) {
      passos.push(...passosDoNo(analise, linha, percurso[i], i > desde || entraJogando));
      const aqui = (filhas.get(linha.id) ?? []).filter((filha) => filha.ponto === i);
      aqui.forEach(({ variante }, k) => {
        tocar(variante, i + 1, true);
        const dela = percursoDoCapitulo(variante);
        for (let j = dela.length - 1; j > i; j -= 1) passos.push({ nodeId: dela[j - 1], fala: "", pausaManual: false, recuo: true });
        // O que se joga dali: a próxima variante do mesmo ponto, se houver, ou a própria linha.
        const seguinte = aqui[k + 1] ? percursoDoCapitulo(aqui[k + 1].variante)[i + 1] : percurso[i + 1];
        const simbolo = analise.nos[seguinte]?.nags?.map((n) => GRAFIA_DO_SIMBOLO[n]).find(Boolean) ?? "";
        const rotulo = rotuloDoNo(percurso[i]);
        const onde = rotulo === "a posição inicial" ? "à posição inicial" : `a ${rotulo}`;
        passos.push({ nodeId: percurso[i], fala: `Voltamos ${onde}. A outra escolha: ${rotuloDoNo(seguinte)}${simbolo}.`, pausaManual: false, retorno: true });
      });
    }
  };
  const percurso = percursoDoCapitulo(capitulo);
  tocar(capitulo, Math.max(0, percurso.indexOf(de)), false);
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

/** Como o aluno lê um nó: "1. Rd6", "1... Re8", ou "a posição inicial". */
function rotuloDoNo(mapa: ReturnType<typeof mapaDaAnalise>, id: string): string {
  const san = mapa.sans[id];
  if (!san) return "a posição inicial";
  // Em português (18/9/2026): a frase é lida pelo aluno, que conhece o rei como R e a dama como D.
  return `${mapa.rotulos[id] ?? ""} ${sanEmPortugues(san)}`.trim();
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
  const rotulo = rotuloDoNo(mapa, bifurcacao);
  const outraSegue = rotuloDoNo(mapa, seu[melhor.n]);
  const estaSegue = rotuloDoNo(mapa, meu[melhor.n]);
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
  const variantes = variantesDaEtapa(aula, capitulo);
  return {
    capituloId: capitulo.id,
    titulo: capitulo.titulo,
    fen: mapa.quadros[partida]?.fen ?? "",
    orientacao: capitulo.orientacao,
    passos: dominioDaAulaV2(aula.id) === "abertura"
      ? passosPelaFita(aula, capitulo, variantes, partida, (id) => rotuloDoNo(mapa, id))
      : variantes.length ? passosNaHora(aula, capitulo, variantes, partida, (id) => rotuloDoNo(mapa, id)) : passosDoTrecho(aula, capitulo, partida),
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
  // A pausa extra do autor é tempo de olhar a posição, como a leitura: não acelera.
  const extra = passo.esperaMs ?? 0;
  if (!passo.fala) return Math.round(INTERVALO_SEM_FALA_MS / velocidade) + extra;
  return reguaDeLeitura(passo.fala) + extra;
}

/** A duração da animação da peça, que é "movimento" e por isso obedece à velocidade. */
export const ANIMACAO_PADRAO_MS = 180;
export function animacaoDaPrevia(velocidade: number): number {
  return Math.round(ANIMACAO_PADRAO_MS / velocidade);
}
