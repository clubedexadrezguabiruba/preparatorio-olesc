/**
 * O caminho de volta: da árvore do Editor v2 para o PGN — §14 da especificação
 * funcional e §11 do plano final.
 *
 * ## O leitor já existia; o escritor é que faltava
 *
 * `lib/repertorio/pgn.ts` lê PGN desde o repertório, e `importar-pgn.ts` o
 * traduz para a árvore v2. Exportar era o buraco: o professor conseguia trazer
 * material para dentro e não conseguia tirar nada.
 *
 * ## A cor de autoria: o aviso do plano, e o que se fez com ele
 *
 * §6 do plano final é um aviso explícito:
 *
 * > "Reutilizar `annotations.ts` exige adaptação: a conversão atual **não
 * > preserva necessariamente as cores de autoria**. A exportação não pode
 * > prometer preservação de cor usando uma conversão que a descarta."
 *
 * Este escritor **não passa por `annotations.ts`**. Ele lê `no.desenhos`, que é
 * onde o documento guarda a cor com o nome dela (`verde`, `vermelho`, `amarelo`,
 * `azul`), e escreve a letra do Lichess direto (`G`, `R`, `Y`, `B`). É a mesma
 * tabela da importação, no sentido inverso — e por isso a cor atravessa inteira,
 * de verdade, num ciclo PGN → editor → PGN.
 *
 * Sobra um caso em que ela **não** atravessa, e ele é anunciado em vez de
 * escondido: as três aulas v1 guardam setas na forma curta (`["e2","e4"]`), sem
 * cor nenhuma. Elas saem em verde — que é o pincel padrão — e cada uma vira uma
 * **perda declarada**, com o nome da casa. Dizer "exportado em verde porque a
 * origem não declarava cor" é honesto; dizer "preservamos as cores" não seria.
 *
 * ## Diretivas opacas: uma regra só, nos dois sentidos
 *
 * `%cal` e `%csl` são **sempre reconstruídos a partir de `no.desenhos`**, porque
 * é `desenhos` que o professor edita na tela. As diretivas guardadas em
 * `no.diretivas` — `[%clk 0:05:00]`, `[%anno …]`, o que o próximo exportador
 * inventar — saem **verbatim**, nunca interpretadas (§11: "diretivas
 * desconhecidas preserváveis continuam opacas").
 *
 * A exceção que fecha a regra: um `%cal`/`%csl` guardado com uma letra de cor
 * que o editor **não** modela (o importador a recusou e anunciou a perda) é
 * reemitido como está. Se não fosse, a única cópia daquele desenho morreria no
 * primeiro ciclo — e quem perdeu na importação perderia de novo, agora sem
 * aviso.
 *
 * ## O que o PGN não carrega, com número
 *
 * §14 manda a interface explicar que "PGN não representa integralmente narração,
 * fluxo, treino, histórico e certificação". A explicação aqui não é um parágrafo
 * fixo: é uma lista com a **contagem real** do que ficou de fora nesta
 * exportação — "3 narrações e 1 treino desta aula não cabem num PGN". Um aviso
 * genérico o professor aprende a pular; um que diz *quantas* ele lê.
 */
import { Chess } from "chess.js";
import { fenInicialDaAnalise } from "./arvore.ts";
import { FEN_INICIAL_PADRAO, type AnaliseV2, type AulaV2, type CorDesenhoV2, type NoV2 } from "./modelo.ts";
import type { Position } from "../lesson/schema.ts";

/** A letra do PGN para cada cor do documento. O inverso de `COR_POR_LETRA`. */
const LETRA_POR_COR: Record<CorDesenhoV2, string> = { verde: "G", vermelho: "R", amarelo: "Y", azul: "B" };

/** As letras que o editor modela. Outras, guardadas, saem verbatim. */
const LETRAS_CONHECIDAS = new Set(Object.values(LETRA_POR_COR));

/** Os seis símbolos da interface, escritos colados no SAN como o Lichess faz. */
const SIMBOLO_POR_NAG: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

export type PerdaExportacaoV2 = {
  codigo: "SETA_SEM_COR" | "CASA_SEM_COR" | "CHAVE_NO_COMENTARIO";
  mensagem: string;
};

export type PgnExportadoV2 = {
  texto: string;
  /** O que este PGN **não** leva, com a contagem desta aula. §14. */
  naoCabe: string[];
  /** O que atravessou com perda, item a item. Nunca silencioso. */
  perdas: PerdaExportacaoV2[];
};

/* ------------------------------------------------------------------ *
 * Comentários, desenhos e diretivas
 * ------------------------------------------------------------------ */

/** As entradas de `%cal`/`%csl` guardadas cuja cor o editor não modela. */
function diretivasPreservadas(no: NoV2): string[] {
  const guardadas = no.diretivas ?? [];
  const saida: string[] = [];
  for (const diretiva of guardadas) {
    const desenho = /^\[%(cal|csl)\s+(.*)\]$/.exec(diretiva);
    if (!desenho) {
      // Não é desenho: é opaca, e sai inteira.
      saida.push(diretiva);
      continue;
    }
    const sobrando = desenho[2]
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "" && !LETRAS_CONHECIDAS.has(item[0]?.toUpperCase() ?? ""));
    if (sobrando.length > 0) saida.push(`[%${desenho[1]} ${sobrando.join(",")}]`);
  }
  return saida;
}

/** O `{comentário}` inteiro deste nó, ou `null` quando não há o que escrever. */
function comentarioDoNo(no: NoV2, perdas: PerdaExportacaoV2[], onde: string): string | null {
  const partes: string[] = [];

  if (no.comentario) {
    // Chave fecha comentário no PGN: um `}` no meio do texto partiria o arquivo
    // ao meio, e o leitor seguinte encontraria lances dentro de prosa.
    const limpo = no.comentario.replace(/[{}]/g, (achado) => (achado === "{" ? "(" : ")"));
    if (limpo !== no.comentario) {
      perdas.push({ codigo: "CHAVE_NO_COMENTARIO", mensagem: `o comentário ${onde} tem chaves ({ ou }), que fecham comentário no PGN; elas viraram parênteses` });
    }
    partes.push(limpo);
  }

  const setas = (no.desenhos?.arrows ?? []).map((seta) => {
    if (Array.isArray(seta)) {
      perdas.push({ codigo: "SETA_SEM_COR", mensagem: `a seta ${seta[0]}→${seta[1]} ${onde} não declara cor (é material v1) e foi exportada em verde` });
      return `G${seta[0]}${seta[1]}`;
    }
    return `${LETRA_POR_COR[seta.cor]}${seta.de}${seta.para}`;
  });
  if (setas.length > 0) partes.push(`[%cal ${setas.join(",")}]`);

  const casas = (no.desenhos?.highlights ?? []).map((casa) => {
    if (typeof casa === "string") {
      perdas.push({ codigo: "CASA_SEM_COR", mensagem: `a casa acesa ${casa} ${onde} não declara cor (é material v1) e foi exportada em verde` });
      return `G${casa}`;
    }
    return `${LETRA_POR_COR[casa.cor]}${casa.casa}`;
  });
  if (casas.length > 0) partes.push(`[%csl ${casas.join(",")}]`);

  partes.push(...diretivasPreservadas(no));

  return partes.length > 0 ? `{ ${partes.join(" ")} }` : null;
}

/** O SAN com os símbolos colados e os outros NAGs como `$n`. */
function lanceEscrito(san: string, nags: number[] | undefined): string {
  const simbolos = (nags ?? []).filter((nag) => SIMBOLO_POR_NAG[nag]).map((nag) => SIMBOLO_POR_NAG[nag]).join("");
  const numericos = (nags ?? []).filter((nag) => !SIMBOLO_POR_NAG[nag]).map((nag) => ` $${nag}`).join("");
  return `${san}${simbolos}${numericos}`;
}

/* ------------------------------------------------------------------ *
 * As tags do cabeçalho
 * ------------------------------------------------------------------ */

function escaparTag(valor: string): string {
  return valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * O cabeçalho: o que veio do PGN original, mais o que esta exportação sabe.
 *
 * **`FEN` e `SetUp` são reescritos, não copiados.** O cabeçalho guardado é o da
 * importação, e a posição inicial pode ter mudado desde então — foi exatamente
 * isso que a troca de posição de §9 passou a permitir. Exportar a FEN antiga
 * produziria um arquivo em que o primeiro lance é ilegal.
 */
function tags(analise: AnaliseV2, fenInicial: string, titulo: string): string[] {
  const guardadas = { ...(analise.origemPgn?.tags ?? {}) };
  delete guardadas.FEN;
  delete guardadas.SetUp;
  const resultado = guardadas.Result ?? analise.origemPgn?.resultado ?? "*";
  delete guardadas.Result;
  if (!guardadas.Event) guardadas.Event = titulo;

  const linhas = Object.entries(guardadas).map(([chave, valor]) => `[${chave} "${escaparTag(valor)}"]`);
  if (fenInicial !== FEN_INICIAL_PADRAO) {
    linhas.push('[SetUp "1"]', `[FEN "${fenInicial}"]`);
  }
  linhas.push(`[Result "${escaparTag(resultado)}"]`);
  return linhas;
}

/* ------------------------------------------------------------------ *
 * O corpo
 * ------------------------------------------------------------------ */

/**
 * Escreve os lances a partir de um nó. **Devolve o tabuleiro como o encontrou.**
 *
 * Esse contrato é o que faz as variantes funcionarem: uma variante parte da
 * posição do **pai**, e não da posição em que a linha principal já chegou.
 *
 * `forcarNumero` existe por causa de uma regra de tipografia do PGN: o número
 * do lance aparece sempre antes de um lance das brancas, e antes de um lance
 * das pretas **só** quando alguma coisa se meteu no meio — um comentário ou uma
 * variante. É o que faz `1. e4 { forte } 1… e5` se ler sem ambiguidade.
 */
function escreverFilhos(
  analise: AnaliseV2,
  parentId: string,
  jogo: Chess,
  saida: string[],
  forcarNumero: boolean,
  permitidos: Set<string> | null,
  perdas: PerdaExportacaoV2[],
): void {
  const filhos = (analise.nos[parentId]?.filhos ?? []).filter((id) => !permitidos || permitidos.has(id));
  if (filhos.length === 0) return;

  const jogar = (id: string, numerar: boolean): boolean => {
    const no = analise.nos[id];
    if (!no?.uci) return false;
    const numero = jogo.moveNumber();
    const brancas = jogo.turn() === "w";
    let jogado;
    try {
      jogado = jogo.move({ from: no.uci.slice(0, 2), to: no.uci.slice(2, 4), promotion: no.uci.slice(4) || undefined });
    } catch {
      return false;
    }
    if (brancas) saida.push(`${numero}.`);
    else if (numerar) saida.push(`${numero}...`);
    saida.push(lanceEscrito(jogado.san, no.nags));
    const comentario = comentarioDoNo(no, perdas, `do lance ${jogado.san}`);
    if (comentario) saida.push(comentario);
    return true;
  };

  const principal = filhos[0];
  if (!jogar(principal, forcarNumero)) return;
  let precisaNumero = Boolean(analise.nos[principal]?.comentario || analise.nos[principal]?.desenhos);

  for (const alternativa of filhos.slice(1)) {
    jogo.undo();
    saida.push("(");
    if (jogar(alternativa, true)) {
      escreverFilhos(analise, alternativa, jogo, saida, Boolean(analise.nos[alternativa]?.comentario), permitidos, perdas);
      jogo.undo();
    }
    saida.push(")");
    // O tabuleiro volta à linha principal para a continuação dela seguir daqui.
    const no = analise.nos[principal];
    if (no?.uci) jogo.move({ from: no.uci.slice(0, 2), to: no.uci.slice(2, 4), promotion: no.uci.slice(4) || undefined });
    precisaNumero = true;
  }

  escreverFilhos(analise, principal, jogo, saida, precisaNumero, permitidos, perdas);
  jogo.undo();
}

/** Quebra o movetext em linhas de até `largura` colunas, sem cortar um símbolo. */
function embrulhar(partes: string[], largura = 80): string {
  const linhas: string[] = [];
  let atual = "";
  for (const parte of partes) {
    if (atual === "") atual = parte;
    else if (atual.length + 1 + parte.length <= largura) atual += ` ${parte}`;
    else { linhas.push(atual); atual = parte; }
  }
  if (atual !== "") linhas.push(atual);
  return linhas.join("\n");
}

/* ------------------------------------------------------------------ *
 * As três exportações de §14
 * ------------------------------------------------------------------ */

/** Os nós de um percurso e de tudo o que nasce do último deles. */
function subarvoreEcaminho(analise: AnaliseV2, nodeId: string): Set<string> {
  const permitidos = new Set<string>();
  const pais = new Map<string, string>();
  for (const no of Object.values(analise.nos)) for (const filho of no.filhos) pais.set(filho, no.id);

  let subindo: string | undefined = nodeId;
  while (subindo) {
    permitidos.add(subindo);
    if (subindo === analise.raizId) break;
    subindo = pais.get(subindo);
  }
  const descer = (id: string) => {
    if (permitidos.has(id) && id !== nodeId) return;
    permitidos.add(id);
    analise.nos[id]?.filhos.forEach(descer);
  };
  descer(nodeId);
  return permitidos;
}

/** O que este PGN deixa para trás, com as contagens desta aula. */
function oQueNaoCabe(aula: AulaV2, analiseIds: string[]): string[] {
  const avisos: string[] = [];
  const narracoes = aula.capitulos
    .filter((c) => analiseIds.includes(c.analiseId))
    .reduce((total, c) => total + c.narracoes.length, 0);
  if (narracoes > 0) {
    avisos.push(`${narracoes} ${narracoes === 1 ? "narração fica de fora" : "narrações ficam de fora"}: o PGN guarda o comentário da posição, não o texto que o aluno ouve`);
  }
  if (aula.treinos.length > 0) {
    avisos.push(`${aula.treinos.length} ${aula.treinos.length === 1 ? "treino não cabe" : "treinos não cabem"} num PGN — respostas, defensor, dicas e término não têm representação no formato`);
  }
  if (aula.introducoes.length > 0) {
    avisos.push(`a introdução da aula não cabe num PGN`);
  }
  avisos.push("a ordem da aula, o histórico e a certificação só voltam pelo pacote JSON v2");
  return avisos;
}

export type OpcoesDePgnV2 = {
  /** Vira `[Event]` quando o cabeçalho guardado não tinha um. */
  titulo?: string;
  /** Exporta só o percurso até este lance e o que nasce dele — "esta variante". */
  ateNodeId?: string;
};

/** Uma análise inteira (ou uma variante dela) como um jogo de PGN. */
export function pgnDaAnalise(
  aula: AulaV2,
  analiseId: string,
  positions: Record<string, Position>,
  opcoes: OpcoesDePgnV2 = {},
): PgnExportadoV2 {
  const analise = aula.analises.find((item) => item.id === analiseId);
  if (!analise) return { texto: "", naoCabe: [], perdas: [] };

  const titulo = opcoes.titulo ?? aula.capitulos.find((c) => c.analiseId === analiseId)?.titulo ?? aula.titulo;
  const perdas: PerdaExportacaoV2[] = [];

  let fenInicial: string;
  try {
    fenInicial = fenInicialDaAnalise(aula, analise, positions);
  } catch {
    return { texto: "", naoCabe: [], perdas: [] };
  }

  const permitidos = opcoes.ateNodeId ? subarvoreEcaminho(analise, opcoes.ateNodeId) : null;
  const jogo = new Chess(fenInicial);
  const partes: string[] = [];

  // O comentário da raiz é do jogo inteiro, e no PGN ele vem antes do 1º lance.
  const daRaiz = comentarioDoNo(analise.nos[analise.raizId], perdas, "da posição inicial");
  if (daRaiz) partes.push(daRaiz);

  escreverFilhos(analise, analise.raizId, jogo, partes, true, permitidos, perdas);
  partes.push(analise.origemPgn?.resultado ?? "*");

  const texto = `${tags(analise, fenInicial, titulo).join("\n")}\n\n${embrulhar(partes)}\n`;
  return { texto, naoCabe: oQueNaoCabe(aula, [analiseId]), perdas };
}

/** O capítulo: a análise dele, com o título do capítulo no `[Event]`. */
export function pgnDoCapitulo(aula: AulaV2, capituloId: string, positions: Record<string, Position>): PgnExportadoV2 {
  const capitulo = aula.capitulos.find((item) => item.id === capituloId);
  if (!capitulo) return { texto: "", naoCabe: [], perdas: [] };
  return pgnDaAnalise(aula, capitulo.analiseId, positions, { titulo: capitulo.titulo });
}

/** A variante selecionada: o percurso até este lance, e o que nasce dele. */
export function pgnDaVariante(
  aula: AulaV2,
  analiseId: string,
  nodeId: string,
  positions: Record<string, Position>,
): PgnExportadoV2 {
  return pgnDaAnalise(aula, analiseId, positions, { ateNodeId: nodeId });
}

/**
 * Todas as análises da aula, um jogo atrás do outro.
 *
 * A ordem é a do **fluxo**, e não a do cadastro de análises: é a ordem em que o
 * professor lê a aula, e `fluxo` é a única fonte dela (§10 do plano). Análise
 * que ainda não tem capítulo entra no fim, para não sumir do arquivo.
 */
export function pgnDaAula(aula: AulaV2, positions: Record<string, Position>): PgnExportadoV2 {
  const naOrdem: string[] = [];
  for (const etapa of aula.fluxo) {
    if (etapa.tipo !== "capitulo") continue;
    const capitulo = aula.capitulos.find((item) => item.id === etapa.entidadeId);
    if (capitulo && !naOrdem.includes(capitulo.analiseId)) naOrdem.push(capitulo.analiseId);
  }
  for (const analise of aula.analises) if (!naOrdem.includes(analise.id)) naOrdem.push(analise.id);

  const perdas: PerdaExportacaoV2[] = [];
  const jogos = naOrdem.map((analiseId) => {
    const exportado = pgnDaAnalise(aula, analiseId, positions);
    perdas.push(...exportado.perdas);
    return exportado.texto;
  }).filter((texto) => texto !== "");

  return { texto: jogos.join("\n"), naoCabe: oQueNaoCabe(aula, naOrdem), perdas };
}
