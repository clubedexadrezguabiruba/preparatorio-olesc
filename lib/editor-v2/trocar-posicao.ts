/**
 * Trocar a posição inicial de um capítulo que já existe — §9 da especificação
 * funcional e §5 do plano final.
 *
 * ## O que torna esta edição diferente de todas as outras
 *
 * Todas as outras edições do editor mexem numa coisa: um texto, um desenho, um
 * lance, a ordem de uma lista. Esta mexe no **chão**. A árvore inteira de uma
 * análise é uma sequência de lances UCI, e um UCI só quer dizer alguma coisa em
 * relação a uma posição: `e2e4` é um lance de peão numa posição e nada nenhuma
 * em outra. Trocar a posição inicial reavalia, de uma vez, todos os lances que
 * já estavam escritos.
 *
 * §5 do plano final diz exatamente o que fazer com o estrago:
 *
 * > "Trocar posição inicial revalida todos os ramos. Podar no primeiro lance
 * > ilegal de cada ramo; não descartar os ramos legais."
 *
 * **"No primeiro, e só dali"** é a regra inteira. Um ramo que fica ilegal no 8º
 * lance mantém os sete primeiros: eles continuam sendo lances legais de uma
 * partida que agora começa noutro lugar. Descartar o ramo inteiro seria jogar
 * fora trabalho que continua válido, e é o erro que um editor ingênuo comete.
 *
 * E **os irmãos não se contaminam**: se a variante `4…Ta8` fica ilegal, a irmã
 * `4…Rd6` é recalculada por si, do mesmo tabuleiro, e sobrevive se puder. Por
 * isso o percurso aqui é uma busca em profundidade com **um** tabuleiro que
 * desfaz o lance ao voltar — o mesmo desenho de `mapaDaAnalise`, pelo mesmo
 * motivo: cada lance é jogado uma vez, e cada irmão parte da posição do pai.
 *
 * ## A cascata: quando o chão que muda é o de outra árvore
 *
 * Uma análise pode **começar num nó desta** — é o que "começar desta posição"
 * (§8.3) cria, com `inicio: { tipo: "referencia" }`. Quando a posição inicial da
 * mãe muda, o nó de origem da filha continua existindo, mas a posição que ele
 * representa é outra: a filha mudou de tabuleiro junto, sem que ninguém tocasse
 * nela. A árvore dela precisa ser revalidada com a **mesma** regra — poda no
 * primeiro ilegal de cada ramo, irmãos preservados, sobreviventes marcados para
 * revisão —, na mesma transação, e o mesmo vale para as netas.
 *
 * Enquanto "começar desta posição" não existia, nenhum conteúdo caía nesse caso
 * e a troca simplesmente **bloqueava**. Agora que existe, bloquear seria
 * proibir o professor de mexer na posição inicial de qualquer capítulo do qual
 * ele tenha derivado um segundo — exatamente o gesto que a função foi feita para
 * permitir.
 *
 * Continua bloqueando **um** caso, e ele é diferente: quando o nó de origem da
 * filha é justamente um dos podados. Aí a filha não mudou de chão — ela ficou
 * **sem** chão, e §5 manda devolver a decisão ao professor: cancelar, remover a
 * filha ou materializá-la como independente.
 *
 * ## Por que o impacto é calculado antes, e devolvido inteiro
 *
 * §5: "a interface mostra nomes e contagens reais". Não "3 itens afetados" —
 * *quais*. O professor precisa poder olhar a lista e desistir; e para ele poder
 * desistir, a conta tem de acontecer sem tocar na aula. Por isso são duas
 * funções: `calcularTrocaDePosicao` só lê, e `aplicarTrocaDePosicao` recebe o
 * plano já calculado e escreve. É o mesmo par de `novo-capitulo.ts`, e pelo
 * mesmo motivo — o que o Refazer repete é o plano, não um sorteio novo.
 *
 * ## O que a máquina sabe e o que ela não sabe
 *
 * Ela sabe dizer que um lance ficou ilegal. Ela **não** sabe dizer que um
 * comentário ficou mentiroso. Por isso todo texto, desenho e narração que
 * sobrevive é marcado para revisão (§5: "legalidade não comprova validade
 * pedagógica") — um aviso, nunca um erro, para o professor reler quando chegar
 * ali. Ver `revisaoPendenteV2Schema`.
 */
import { Chess } from "chess.js";
import { problemaDaPosicaoMontada } from "../chess/fen.ts";
import { fenSchema, type Position } from "../lesson/schema.ts";
import { fenInicialDaAnalise, mapaDaAnalise } from "./arvore.ts";
import {
  capitulosTocados,
  dependentesDasPerdas,
  narracoesPerdidas,
  reabrirTreinos,
  treinosQuePisamEm,
  type CapituloTocadoV2,
  type PerdasPorAnaliseV2,
  type TreinoAfetadoV2,
} from "./impacto.ts";
import type {
  AnaliseV2,
  AulaV2,
  CapituloV2,
  NoV2,
  RevisaoPendenteV2,
} from "./modelo.ts";

/** A marca única desta operação. Ver `revisaoPendenteV2Schema`. */
const MARCA: RevisaoPendenteV2 = { motivo: "posicao-inicial-trocada" };

/** Como esta edição destrói, em português, para a frase do dependente. */
const VERBO = "a posição nova torna ilegal";

export type PedidoDeTrocaV2 = {
  /** A análise cuja posição inicial muda. É a do capítulo aberto. */
  analiseId: string;
  /** A FEN completa, dos seis campos, saída do montador ou colada. */
  fen: string;
};

/**
 * Um ramo cortado: o **primeiro** lance que deixou de ser legal, e o tamanho do
 * que vai embora junto com ele.
 */
export type PodaDaTrocaV2 = {
  nodeId: string;
  /** O lance como o professor o lê hoje — `12… Rd6`, com a numeração do painel. */
  lance: string;
  /** Quantos nós somem: este e toda a continuação dele. */
  nosRemovidos: number;
};

/** Quem depende de um nó podado, e por isso impede a troca. */
export type BloqueioDaTrocaV2 = {
  tipo: "treino" | "introducao" | "analise";
  /** O nome que o professor escreveu — título do treino, da introdução, da análise. */
  nome: string;
  motivo: string;
};

export type CapituloAfetadoV2 = CapituloTocadoV2;

export type { TreinoAfetadoV2 };

/**
 * A poda de **uma** árvore: a mãe, ou uma das filhas que mudaram de chão junto.
 *
 * As filhas aparecem com o nome do capítulo delas porque é assim que o professor
 * as conhece — ele não sabe que existe uma "análise `analise-final-de-torre`";
 * ele sabe que existe um capítulo com esse nome.
 */
export type ArvoreRevalidadaV2 = {
  analiseId: string;
  /** O título do capítulo que mostra esta análise, ou o id quando não há nenhum. */
  nome: string;
  fenAnterior: string;
  fenNova: string;
  podas: PodaDaTrocaV2[];
  nosPodados: string[];
  nosMarcados: string[];
};

/**
 * Tudo o que a troca vai fazer, com nome e contagem — §5: "a interface mostra
 * nomes e contagens reais".
 */
export type ImpactoDaTrocaV2 = {
  fenAnterior: string;
  fenNova: string;
  podas: PodaDaTrocaV2[];
  /** Todos os nós da análise-mãe que somem, inclusive as continuações. */
  nosPodados: string[];
  /** Nós da mãe que sobrevivem e têm comentário ou desenho: ficam marcados. */
  nosMarcados: string[];
  /**
   * As análises que começam nesta e foram revalidadas junto — §8.3/§9.
   * Vazia no caso comum, em que ninguém deriva deste capítulo.
   */
  cascatas: ArvoreRevalidadaV2[];
  narracoesRemovidas: Array<{ capituloId: string; capitulo: string; narracaoId: string; texto: string }>;
  narracoesMarcadas: Array<{ capituloId: string; capitulo: string; narracaoId: string }>;
  quadrosMarcados: Array<{ introducaoId: string; introducao: string; quadroId: string }>;
  capitulosAfetados: CapituloAfetadoV2[];
  treinosAfetados: TreinoAfetadoV2[];
  /** A posição revisada que a análise deixa de usar, e cuja revisão é reaberta. */
  provenienciaReaberta: string | null;
  /** A mesma posição, quando outra parte da aula continua usando e a revisão fica de pé. */
  provenienciaMantida: string | null;
  bloqueios: BloqueioDaTrocaV2[];
};

export type PlanoDaTrocaV2 = {
  analiseId: string;
  fen: string;
  impacto: ImpactoDaTrocaV2;
};

export type CalculoDaTrocaV2 =
  | { ok: true; plano: PlanoDaTrocaV2 }
  | { ok: false; campo: "posicao"; mensagem: string };

/** A subárvore inteira a partir de um nó, ele incluído. */
function subarvore(analise: AnaliseV2, raiz: string): string[] {
  const colhidos: string[] = [];
  const vistos = new Set<string>();
  const colher = (id: string) => {
    if (vistos.has(id)) return;
    vistos.add(id);
    colhidos.push(id);
    analise.nos[id]?.filhos.forEach(colher);
  };
  colher(raiz);
  return colhidos;
}

/**
 * A poda propriamente dita: reexecuta a árvore desde a raiz na posição nova.
 *
 * Um tabuleiro só, em profundidade, desfazendo o lance ao voltar — cada irmão
 * parte da posição do pai, que é o que faz um ramo ilegal não contaminar o
 * vizinho.
 *
 * Devolve também a **FEN de cada nó sobrevivente**. Ela não é luxo: é o que a
 * cascata precisa para saber em que posição uma análise filha passa a começar,
 * e calculá-la depois obrigaria a rejogar a árvore uma segunda vez.
 */
function podar(analise: AnaliseV2, fenNova: string, nomeDoLance: (id: string) => string) {
  const jogo = new Chess(fenNova);
  const podados = new Set<string>();
  const podas: PodaDaTrocaV2[] = [];
  const fens = new Map<string, string>([[analise.raizId, jogo.fen()]]);

  const andar = (id: string) => {
    for (const filhoId of analise.nos[id].filhos) {
      const filho = analise.nos[filhoId];
      let jogado = null;
      if (filho?.uci) {
        try {
          jogado = jogo.move({
            from: filho.uci.slice(0, 2),
            to: filho.uci.slice(2, 4),
            promotion: filho.uci.slice(4) || undefined,
          });
        } catch {
          jogado = null;
        }
      }
      if (!jogado) {
        // O primeiro lance ilegal deste ramo — e só dali para baixo.
        const caem = subarvore(analise, filhoId);
        caem.forEach((no) => podados.add(no));
        podas.push({ nodeId: filhoId, lance: nomeDoLance(filhoId), nosRemovidos: caem.length });
        continue;
      }
      fens.set(filhoId, jogo.fen());
      andar(filhoId);
      jogo.undo();
    }
  };
  andar(analise.raizId);
  return { podados, podas, fens };
}

/**
 * Quem mais na aula usa esta posição revisada depois que a análise a larga.
 *
 * **Os treinos afetados não contam.** A certificação deles nomeia esta posição,
 * mas é a mesma troca que a reabre: um selo que acabou de voltar a "pendente"
 * não é alguém que continua atestando a revisão. Contá-lo faria a proveniência
 * ficar de pé apoiada exatamente no que deixou de se apoiar nela.
 */
function aindaUsam(aula: AulaV2, positionId: string, analiseId: string, treinosAfetados: Set<string>): boolean {
  const outrasAnalises = aula.analises.some(
    (item) => item.id !== analiseId && item.inicio.tipo === "posicao" && item.inicio.positionId === positionId,
  );
  const praticas = aula.praticas.some((item) => item.positionId === positionId);
  const certificacoes = aula.treinos.some(
    (item) => !treinosAfetados.has(item.id) && item.certificacao?.positionId === positionId,
  );
  return outrasAnalises || praticas || certificacoes;
}

/** O nome de cada lance como o painel o escreve — `12… Rd6` —, caindo para o UCI. */
function nomeadorDeLances(aula: AulaV2, analise: AnaliseV2, positions: Record<string, Position>) {
  try {
    const mapa = mapaDaAnalise(aula, analise.id, positions);
    return (id: string) => {
      const san = mapa.sans[id];
      if (!san) return analise.nos[id]?.uci ?? id;
      const rotulo = mapa.rotulos[id];
      return rotulo ? `${rotulo} ${san}` : san;
    };
  } catch {
    // Sem mapa, o UCI. Nenhum nome é melhor do que um nome errado.
    return (id: string) => analise.nos[id]?.uci ?? id;
  }
}

/**
 * Confere a posição nova e calcula o impacto inteiro. **Não** toca na aula.
 *
 * As recusas vêm antes da conta, e na ordem em que o professor erra: uma FEN
 * que não tem os seis campos, uma posição impossível, e a posição que já é a
 * que está lá — trocar por ela mesma não é uma edição, e não pode entrar no
 * histórico como se fosse.
 */
export function calcularTrocaDePosicao(
  aula: AulaV2,
  pedido: PedidoDeTrocaV2,
  positions: Record<string, Position>,
): CalculoDaTrocaV2 {
  const analise = aula.analises.find((item) => item.id === pedido.analiseId);
  if (!analise) return { ok: false, campo: "posicao", mensagem: "este capítulo não tem análise para trocar de posição" };

  const fenNova = pedido.fen.trim();
  if (fenNova === "") return { ok: false, campo: "posicao", mensagem: "não há posição nenhuma para pôr no lugar" };
  if (!fenSchema.safeParse(fenNova).success) {
    return { ok: false, campo: "posicao", mensagem: "esta não é uma FEN dos seis campos (peças, vez, roque, en passant e os dois contadores)" };
  }
  const problema = problemaDaPosicaoMontada(fenNova);
  if (problema) return { ok: false, campo: "posicao", mensagem: `esta posição não serve: ${problema}` };

  let fenAnterior: string;
  try {
    fenAnterior = fenInicialDaAnalise(aula, analise, positions);
  } catch (erro) {
    return { ok: false, campo: "posicao", mensagem: erro instanceof Error ? erro.message : "não foi possível ler a posição atual deste capítulo" };
  }
  if (fenAnterior === fenNova) {
    return { ok: false, campo: "posicao", mensagem: "esta já é a posição inicial deste capítulo — não há o que trocar" };
  }

  /*
   * A fila da cascata. A mãe entra primeiro; cada árvore processada descobre as
   * filhas que começam nela **num nó que sobreviveu** e as enfileira com a
   * posição nova delas já resolvida. Filha cujo nó de origem foi podado não
   * entra aqui: ela virou dependente, e dependente é decisão do professor.
   *
   * `visitadas` existe porque o validador aceita — e acusa — ciclos entre
   * inícios de análises; percorrer um deles aqui seria um laço infinito num
   * documento que o professor ainda não consertou.
   */
  const fila: Array<{ analise: AnaliseV2; fenNova: string }> = [{ analise, fenNova }];
  const visitadas = new Set<string>();
  const revalidadas: ArvoreRevalidadaV2[] = [];
  const perdas: PerdasPorAnaliseV2 = new Map();

  while (fila.length > 0) {
    const { analise: atual, fenNova: fen } = fila.shift()!;
    if (visitadas.has(atual.id)) continue;
    visitadas.add(atual.id);

    // O nome de cada lance vem da posição **antiga**, porque é ela que o
    // professor está vendo no painel enquanto decide.
    const { podados, podas, fens } = podar(atual, fen, nomeadorDeLances(aula, atual, positions));
    perdas.set(atual.id, podados);

    let fenDeAntes = "";
    try {
      fenDeAntes = fenInicialDaAnalise(aula, atual, positions);
    } catch {
      fenDeAntes = "";
    }

    // Sobreviventes com texto ou desenho: legais, e nem por isso ainda verdadeiros.
    const nosMarcados = Object.values(atual.nos)
      .filter((no) => !podados.has(no.id) && (no.comentario !== undefined || no.desenhos !== undefined))
      .map((no) => no.id);

    revalidadas.push({
      analiseId: atual.id,
      nome: aula.capitulos.find((c) => c.analiseId === atual.id)?.titulo ?? atual.id,
      fenAnterior: fenDeAntes,
      fenNova: fen,
      podas,
      nosPodados: [...podados],
      nosMarcados,
    });

    for (const filha of aula.analises) {
      if (filha.id === atual.id || filha.inicio.tipo !== "referencia") continue;
      if (filha.inicio.origem.analiseId !== atual.id) continue;
      const chaoNovo = fens.get(filha.inicio.origem.nodeId);
      // Sem FEN nova, o nó de origem foi podado: a filha ficou sem chão, e isso
      // é dependência, não cascata. `dependentesDasPerdas` a apanha logo abaixo.
      if (chaoNovo) fila.push({ analise: filha, fenNova: chaoNovo });
    }
  }

  const mae = revalidadas[0];
  const cascatas = revalidadas.slice(1);

  const dependentes = dependentesDasPerdas(aula, perdas, positions, VERBO);
  const bloqueios: BloqueioDaTrocaV2[] = dependentes.map((dependente) => ({
    tipo: dependente.tipo,
    nome: dependente.nome,
    motivo: dependente.motivo,
  }));

  const analisesAfetadas = new Set(revalidadas.map((item) => item.analiseId));

  const narracoesRemovidas = narracoesPerdidas(aula, perdas);
  const removidas = new Set(narracoesRemovidas.map((item) => item.narracaoId));
  const narracoesMarcadas: ImpactoDaTrocaV2["narracoesMarcadas"] = [];
  for (const capitulo of aula.capitulos) {
    if (!analisesAfetadas.has(capitulo.analiseId)) continue;
    for (const narracao of capitulo.narracoes) {
      if (removidas.has(narracao.id)) continue;
      narracoesMarcadas.push({ capituloId: capitulo.id, capitulo: capitulo.titulo, narracaoId: narracao.id });
    }
  }

  const quadrosMarcados: ImpactoDaTrocaV2["quadrosMarcados"] = [];
  for (const introducao of aula.introducoes) {
    for (const quadro of introducao.quadros) {
      if (quadro.posicao.tipo !== "referencia") continue;
      const origem = quadro.posicao.origem;
      if (!analisesAfetadas.has(origem.analiseId)) continue;
      if (perdas.get(origem.analiseId)?.has(origem.nodeId)) continue;
      quadrosMarcados.push({ introducaoId: introducao.id, introducao: introducao.titulo, quadroId: quadro.id });
    }
  }

  const capitulosAfetados = capitulosTocados(aula, perdas);
  const treinosAfetados = treinosQuePisamEm(aula, analisesAfetadas);

  const positionIdAnterior = analise.inicio.tipo === "posicao" ? analise.inicio.positionId : null;
  const aindaEmUso = positionIdAnterior !== null
    && aindaUsam(aula, positionIdAnterior, analise.id, new Set(treinosAfetados.map((item) => item.id)));

  return {
    ok: true,
    plano: {
      analiseId: analise.id,
      fen: fenNova,
      impacto: {
        fenAnterior,
        fenNova,
        podas: mae.podas,
        nosPodados: mae.nosPodados,
        nosMarcados: mae.nosMarcados,
        cascatas,
        narracoesRemovidas,
        narracoesMarcadas,
        quadrosMarcados,
        capitulosAfetados,
        treinosAfetados,
        provenienciaReaberta: positionIdAnterior !== null && !aindaEmUso ? positionIdAnterior : null,
        provenienciaMantida: positionIdAnterior !== null && aindaEmUso ? positionIdAnterior : null,
        bloqueios,
      },
    },
  };
}

export type AplicacaoDaTrocaV2 =
  | { ok: true; aula: AulaV2 }
  | { ok: false; mensagem: string };

/** A marca de revisão posta em qualquer item que a aceite: nó, narração ou quadro. */
function comRevisao<T extends { revisao?: RevisaoPendenteV2 }>(item: T): T {
  return { ...item, revisao: MARCA };
}

/**
 * Escreve a troca — tudo, ou nada.
 *
 * A aula nova é montada inteira numa cópia; a que entrou nunca é tocada. Com o
 * histórico guardando documentos inteiros, isto é o que faz a troca ser uma
 * transação só: um Ctrl+Z devolve os lances podados **da mãe e das filhas**, as
 * narrações apagadas, as marcas de revisão e a proveniência, todos juntos — e o
 * Refazer devolve exatamente os mesmos ids, porque o plano é o mesmo objeto.
 */
export function aplicarTrocaDePosicao(aula: AulaV2, plano: PlanoDaTrocaV2): AplicacaoDaTrocaV2 {
  const indice = aula.analises.findIndex((item) => item.id === plano.analiseId);
  if (indice < 0) return { ok: false, mensagem: "análise inexistente" };
  if (plano.impacto.bloqueios.length > 0) {
    const nomes = plano.impacto.bloqueios.map((b) => `«${b.nome}» ${b.motivo}`).join("; ");
    return { ok: false, mensagem: `não dá para trocar a posição enquanto houver quem dependa do que seria apagado: ${nomes}. Nada foi mudado.` };
  }

  /**
   * A mãe e as filhas, na mesma lista. Só a mãe troca de `inicio`: a filha
   * continua começando **no mesmo nó** da mãe — o que mudou foi a posição que
   * esse nó representa, e reescrever a referência dela apagaria justamente a
   * dependência que o professor pediu quando fez "começar desta posição".
   */
  const revalidadas = [
    { analiseId: plano.analiseId, fen: plano.fen, nosPodados: plano.impacto.nosPodados, nosMarcados: plano.impacto.nosMarcados },
    ...plano.impacto.cascatas.map((item) => ({ analiseId: item.analiseId, fen: null, nosPodados: item.nosPodados, nosMarcados: item.nosMarcados })),
  ];
  const porAnalise = new Map(revalidadas.map((item) => [item.analiseId, item]));

  const analises = aula.analises.map((analise) => {
    const revalidada = porAnalise.get(analise.id);
    if (!revalidada) return analise;
    const podados = new Set(revalidada.nosPodados);
    const marcados = new Set(revalidada.nosMarcados);
    const nos: Record<string, NoV2> = {};
    for (const no of Object.values(analise.nos)) {
      if (podados.has(no.id)) continue;
      const base: NoV2 = { ...no, filhos: no.filhos.filter((id) => !podados.has(id)) };
      nos[no.id] = marcados.has(no.id) ? comRevisao(base) : base;
    }
    return revalidada.fen
      ? { ...analise, inicio: { tipo: "fen" as const, fen: revalidada.fen }, nos }
      : { ...analise, nos };
  });

  const capitulos: CapituloV2[] = aula.capitulos.map((capitulo) => {
    const revalidada = porAnalise.get(capitulo.analiseId);
    if (!revalidada) return capitulo;
    const podados = new Set(revalidada.nosPodados);
    const raizId = aula.analises.find((item) => item.id === capitulo.analiseId)!.raizId;
    // O nó de partida podado leva o percurso inteiro junto: tudo o que vinha
    // depois dele era descendente dele, e descendente de nó podado foi podado.
    const inicioNodeId = podados.has(capitulo.inicioNodeId) ? raizId : capitulo.inicioNodeId;
    const corte = capitulo.caminho.findIndex((id) => podados.has(id));
    const caminho = podados.has(capitulo.inicioNodeId)
      ? []
      : corte < 0 ? capitulo.caminho : capitulo.caminho.slice(0, corte);
    return {
      ...capitulo,
      inicioNodeId,
      caminho,
      narracoes: capitulo.narracoes
        .filter((narracao) => !podados.has(narracao.nodeId))
        .map((narracao) => comRevisao(narracao)),
    };
  });

  const analisesAfetadas = new Set(revalidadas.map((item) => item.analiseId));
  const introducoes = aula.introducoes.map((introducao) => ({
    ...introducao,
    quadros: introducao.quadros.map((quadro) =>
      quadro.posicao.tipo === "referencia" && analisesAfetadas.has(quadro.posicao.origem.analiseId)
        ? comRevisao(quadro)
        : quadro),
  }));

  const proveniencia = plano.impacto.provenienciaReaberta
    ? aula.proveniencia.map((item) =>
        item.positionId === plano.impacto.provenienciaReaberta && item.estado === "approved"
          ? { ...item, estado: "candidate" as const }
          : item)
    : aula.proveniencia;

  const comTreinos = reabrirTreinos(
    { ...aula, analises, capitulos, introducoes, proveniencia },
    new Set(plano.impacto.treinosAfetados.map((item) => item.id)),
  );

  return { ok: true, aula: comTreinos };
}

/** Onde uma marca de revisão pode estar — os três lugares que o schema aceita. */
export type AlvoDeRevisaoV2 =
  | { analiseId: string; nodeId: string }
  | { capituloId: string; narracaoId: string }
  | { introducaoId: string; quadroId: string };

/**
 * Tira a marca de revisão de um nó, de uma narração ou de um quadro.
 *
 * Existe porque uma marca sem porta de saída é uma armadilha: §5 manda que as
 * revisões sejam resolvidas antes de publicar, e resolver é um gesto do
 * professor — ele releu, e o texto está de pé. É um comando como outro
 * qualquer, e portanto desfazível.
 *
 * O quadro de introdução entrou depois dos outros dois: ele era marcado pela
 * troca e **não tinha como ser desmarcado**, porque o editor de introdução ainda
 * não tem tela. A lista de revisões pendentes (§19.2) é essa tela — e sem este
 * caso ela teria itens que ninguém consegue resolver.
 */
export function semRevisao(aula: AulaV2, alvo: AlvoDeRevisaoV2): AulaV2 {
  if ("nodeId" in alvo) {
    return {
      ...aula,
      analises: aula.analises.map((analise) => {
        if (analise.id !== alvo.analiseId) return analise;
        const no = analise.nos[alvo.nodeId];
        if (!no?.revisao) return analise;
        const limpo: NoV2 = { ...no };
        delete limpo.revisao;
        return { ...analise, nos: { ...analise.nos, [no.id]: limpo } };
      }),
    };
  }
  if ("narracaoId" in alvo) {
    return {
      ...aula,
      capitulos: aula.capitulos.map((capitulo) => {
        if (capitulo.id !== alvo.capituloId) return capitulo;
        return {
          ...capitulo,
          narracoes: capitulo.narracoes.map((narracao) => {
            if (narracao.id !== alvo.narracaoId || !narracao.revisao) return narracao;
            const limpo = { ...narracao };
            delete limpo.revisao;
            return limpo;
          }),
        };
      }),
    };
  }
  return {
    ...aula,
    introducoes: aula.introducoes.map((introducao) => {
      if (introducao.id !== alvo.introducaoId) return introducao;
      return {
        ...introducao,
        quadros: introducao.quadros.map((quadro) => {
          if (quadro.id !== alvo.quadroId || !quadro.revisao) return quadro;
          const limpo = { ...quadro };
          delete limpo.revisao;
          return limpo;
        }),
      };
    }),
  };
}
