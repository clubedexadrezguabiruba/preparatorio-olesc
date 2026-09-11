/**
 * O corpus grande do Editor v2 — as duas fixtures que o plano final (§17) exige
 * antes de a importação ser liberada.
 *
 * ## Por que uma fixture **gerada**, e não um JSON guardado
 *
 * Uma linha de 500 meios-lances gravada em disco custaria dezenas de milhares de
 * bytes no Git para dizer uma coisa só: "é grande". Pior, seria conteúdo morto —
 * ninguém consegue revisar 500 lances num diff, e no dia em que o esquema mudasse
 * o arquivo viraria lixo silencioso. Aqui a fixture é **reconstruída** a cada
 * execução, sempre igual, a partir de uma semente fixa.
 *
 * ## Por que ela é sempre a mesma, sem `Math.random`
 *
 * O sorteio é um gerador congruente linear com semente explícita. `Math.random`
 * daria uma árvore diferente a cada execução, e um teste que falha só às terças é
 * pior do que teste nenhum: ninguém consegue reproduzir o defeito para consertar.
 *
 * ## Como a linha chega a 500 meios-lances sem virar uma partida absurda
 *
 * Duas regras no sorteio, e cada uma tem motivo medido:
 *
 * 1. **Captura é desempatada por último.** Sem isso, o sorteio come as peças em
 *    poucas dezenas de lances, o tabuleiro fica em rei contra rei e a linha morre
 *    afogada muito antes dos 500.
 * 2. **Lance que termina a partida é recusado e o próximo candidato entra.** Mate
 *    e afogamento zeram os lances legais; é o único jeito de a linha parar cedo.
 *    Repare que empate por repetição e pela regra dos 50 lances **não** são
 *    recusados: o plano diz, com todas as letras, que a linha longa é fixture de
 *    navegação, "não necessariamente partida competitiva concluída pelas regras de
 *    empate".
 *
 * ## Isto roda no Node, não no navegador
 *
 * O manifesto de proveniência da fixture é carimbado com `hashDaPosicao`, que usa
 * `node:crypto`. É fixture de teste e de medição; nunca é importada pela tela.
 */
import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import { hashDaPosicao } from "./hash.ts";
import type { AulaV2, NoV2 } from "./modelo.ts";

/** A posição de partida das duas fixtures: o tabuleiro inicial do xadrez padrão. */
export const POSICAO_DO_CORPUS: Position = {
  id: "pos-corpus-inicial",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  expectedResult: "draw",
  tags: ["fixture técnica", "posição inicial"],
  status: "fixture",
  provenance: {
    externalHumanSource: null,
    bibliographicSource: null,
    originalGame: null,
    authorComposer: null,
    license: null,
    editionFile: null,
    fenMethod: "fixture técnica gerada pelo corpus do Editor v2",
    qaApplied: null,
    pendingRisk: null,
  },
};

export const POSICOES_DO_CORPUS: Record<string, Position> = {
  [POSICAO_DO_CORPUS.id]: POSICAO_DO_CORPUS,
};

/** Gerador congruente linear — sorteio reproduzível, sem depender do ambiente. */
function sorteio(semente: number): () => number {
  let estado = semente;
  return () => {
    estado = (estado * 1103515245 + 12345) & 0x7fffffff;
    return estado / 0x7fffffff;
  };
}

/** Os lances legais, embaralhados por semente, com as capturas no fim da fila. */
function candidatos(jogo: Chess, proximo: () => number): string[] {
  return jogo
    .moves({ verbose: true })
    .map((lance) => ({ uci: `${lance.from}${lance.to}${lance.promotion ?? ""}`, peso: (lance.captured ? 2 : 0) + proximo() }))
    .sort((a, b) => a.peso - b.peso)
    .map((item) => item.uci);
}

/**
 * Joga um lance que não encerra a partida, e devolve o UCI dele.
 *
 * Só mate e afogamento zeram os lances legais, e é por isso que são os únicos
 * recusados aqui — recusar também repetição e regra dos 50 encurtaria a linha sem
 * necessidade nenhuma.
 */
function jogarSemEncerrar(jogo: Chess, proximo: () => number): string | null {
  for (const uci of candidatos(jogo, proximo)) {
    jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    if (jogo.isCheckmate() || jogo.isStalemate()) {
      jogo.undo();
      continue;
    }
    return uci;
  }
  return null;
}

type EsqueletoV2 = { id: string; titulo: string; nos: Record<string, NoV2>; raizId: string; caminho: string[] };

/** Veste a árvore crua com o resto do documento v2: metadados, proveniência, capítulo e fluxo. */
function vestir(esqueleto: EsqueletoV2): AulaV2 {
  return {
    schemaVersion: 2,
    id: esqueleto.id,
    titulo: esqueleto.titulo,
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" },
    proveniencia: [{ positionId: POSICAO_DO_CORPUS.id, conteudoHash: hashDaPosicao(POSICAO_DO_CORPUS), estado: "fixture" }],
    excecoes: [],
    analises: [{ id: "analise-corpus", inicio: { tipo: "posicao", positionId: POSICAO_DO_CORPUS.id }, raizId: esqueleto.raizId, nos: esqueleto.nos }],
    introducoes: [],
    capitulos: [{ id: "capitulo-corpus", titulo: esqueleto.titulo, analiseId: "analise-corpus", inicioNodeId: esqueleto.raizId, caminho: esqueleto.caminho, orientacao: "white", narracoes: [] }],
    treinos: [],
    praticas: [],
    fluxo: [{ id: "etapa-corpus", tipo: "capitulo", entidadeId: "capitulo-corpus" }],
  };
}

/**
 * Uma linha reta de `meiosLances` meios-lances legais — a fixture de navegação.
 *
 * Estoura se a linha não alcançar o tamanho pedido, em vez de devolver uma fixture
 * menor em silêncio: uma medida de "500 lances" feita sobre 180 seria um número
 * falso no relatório, e ninguém desconfiaria dele.
 */
export function linhaLongaV2(meiosLances = 500, semente = 20260911): AulaV2 {
  const proximo = sorteio(semente);
  const jogo = new Chess(POSICAO_DO_CORPUS.fen);
  const nos: Record<string, NoV2> = { "no-0": { id: "no-0", filhos: [] } };
  const caminho: string[] = [];

  for (let i = 1; i <= meiosLances; i += 1) {
    const uci = jogarSemEncerrar(jogo, proximo);
    if (!uci) throw new Error(`a linha longa parou no meio-lance ${i}: todo lance legal encerrava a partida`);
    const id = `no-${i}`;
    nos[id] = { id, uci, filhos: [] };
    nos[`no-${i - 1}`].filhos.push(id);
    caminho.push(id);
  }

  return vestir({ id: "EX-LINHA-500", titulo: `Linha de ${meiosLances} meios-lances`, nos, raizId: "no-0", caminho });
}

/**
 * Uma árvore de pelo menos `nosAlvo` nós, com comentários e variantes — a fixture
 * de leitura e de edição.
 *
 * O desenho é o de uma partida anotada de verdade: um tronco, e a cada poucos
 * lances uma variante saindo dele. As variantes têm profundidades diferentes de
 * propósito — uma variante rasa e uma funda exercitam coisas diferentes no painel
 * de lances, e o recuo visual só aparece quando há ramo.
 *
 * Um comentário a cada três nós: o suficiente para o peso do texto aparecer na
 * medição de bytes sem transformar a fixture numa parede de prosa.
 */
export function arvoreLargaV2(nosAlvo = 1000, semente = 20260911): AulaV2 {
  const proximo = sorteio(semente);
  const jogo = new Chess(POSICAO_DO_CORPUS.fen);
  const nos: Record<string, NoV2> = { "no-0": { id: "no-0", filhos: [] } };
  const caminho: string[] = [];
  let contador = 0;

  const novoNo = (paiId: string, uci: string): string => {
    contador += 1;
    const id = `no-${contador}`;
    nos[id] = { id, uci, filhos: [] };
    if (contador % 3 === 0) nos[id].comentario = `Comentário de fixture no nó ${contador}, com texto suficiente para pesar na medição de bytes.`;
    nos[paiId].filhos.push(id);
    return id;
  };

  /** Desce `profundidade` lances a partir da posição corrente e desfaz tudo ao voltar. */
  const ramificar = (paiId: string, profundidade: number): void => {
    let atual = paiId;
    let jogados = 0;
    for (let i = 0; i < profundidade && contador < nosAlvo; i += 1) {
      const uci = jogarSemEncerrar(jogo, proximo);
      if (!uci) break;
      atual = novoNo(atual, uci);
      jogados += 1;
    }
    for (let i = 0; i < jogados; i += 1) jogo.undo();
  };

  let troncoId = "no-0";
  let passo = 0;
  while (contador < nosAlvo) {
    const paiId = troncoId;
    const uci = jogarSemEncerrar(jogo, proximo);
    if (!uci) throw new Error(`a árvore larga parou no lance ${passo} do tronco: todo lance legal encerrava a partida`);
    troncoId = novoNo(paiId, uci);
    caminho.push(troncoId);
    passo += 1;
    // A cada quatro lances do tronco sai uma variante. Ela é **irmã** do lance que
    // acabou de entrar — parte do mesmo pai —, que é o que o PGN chama de `( … )`.
    // A profundidade alterna entre curta, média e funda de propósito: o recuo do
    // painel e o custo do percurso se comportam diferente nos três casos.
    if (passo % 4 === 0 && contador < nosAlvo) {
      jogo.undo();
      ramificar(paiId, [2, 7, 18][(passo / 4) % 3]);
      jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    }
  }

  return vestir({ id: "EX-ARVORE-1000", titulo: `Árvore de ${contador} nós`, nos, raizId: "no-0", caminho });
}
