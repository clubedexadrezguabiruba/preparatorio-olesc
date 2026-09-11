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
 * ## Por que o impacto é calculado antes, e devolvido inteiro
 *
 * §5: "a interface mostra nomes e contagens reais". Não "3 itens afetados" —
 * *quais*. O professor precisa poder olhar a lista e desistir; e para ele poder
 * desistir, a conta tem de acontecer sem tocar na aula. Por isso são duas
 * funções: `calcularTrocaDePosicao` só lê, e `aplicarTrocaDePosicao` recebe o
 * plano já calculado e escreve. É o mesmo par de `novo-capitulo.ts`, e pelo
 * mesmo motivo — o que o Refazer repete é o plano, não um sorteio novo.
 *
 * ## Por que existem bloqueios, e não só podas
 *
 * Um nó podado pode estar sendo apontado **de fora da análise**: por um treino,
 * por um quadro de introdução, por outra análise que começa nele. §5 é
 * explícito sobre esse caso: "excluir análise ou subárvore referenciada exige
 * cancelar, remover explicitamente os dependentes ou materializar os
 * dependentes como independentes". Nenhuma das três é uma coisa que a máquina
 * possa escolher sozinha. Então a troca **para**, diz o nome de quem depende, e
 * devolve a decisão a quem é dela. Um editor que apagasse o treino junto
 * estaria decidindo pelo professor a parte mais cara da aula.
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
import type {
  AnaliseV2,
  AulaV2,
  CapituloV2,
  NoV2,
  RevisaoPendenteV2,
  TreinoV2,
} from "./modelo.ts";

/** A marca única desta operação. Ver `revisaoPendenteV2Schema`. */
const MARCA: RevisaoPendenteV2 = { motivo: "posicao-inicial-trocada" };

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

export type CapituloAfetadoV2 = {
  id: string;
  titulo: string;
  /** O percurso do capítulo perdeu o fim porque ele passava por um lance podado. */
  percursoCortado: boolean;
  /** O capítulo começava num nó podado e volta a começar na raiz. */
  inicioReiniciado: boolean;
};

export type TreinoAfetadoV2 = {
  id: string;
  titulo: string;
  certificacaoReaberta: boolean;
  fonteAlterada: boolean;
};

/**
 * Tudo o que a troca vai fazer, com nome e contagem — §5: "a interface mostra
 * nomes e contagens reais".
 */
export type ImpactoDaTrocaV2 = {
  fenAnterior: string;
  fenNova: string;
  podas: PodaDaTrocaV2[];
  /** Todos os nós que somem, inclusive as continuações dos lances podados. */
  nosPodados: string[];
  /** Nós que sobrevivem e têm comentário ou desenho: ficam marcados para revisão. */
  nosMarcados: string[];
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
 */
function podar(analise: AnaliseV2, fenNova: string, nomeDoLance: (id: string) => string) {
  const jogo = new Chess(fenNova);
  const podados = new Set<string>();
  const podas: PodaDaTrocaV2[] = [];

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
      andar(filhoId);
      jogo.undo();
    }
  };
  andar(analise.raizId);
  return { podados, podas };
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

  // Os nomes dos lances vêm da posição **antiga**, porque é ela que o professor
  // está vendo no painel enquanto decide. Se a árvore já estiver quebrada, o
  // mapa não sai; então o nome cai para o UCI, que é sempre verdade.
  let nomeDoLance = (id: string) => analise.nos[id]?.uci ?? id;
  try {
    const mapa = mapaDaAnalise(aula, analise.id, positions);
    nomeDoLance = (id) => {
      const san = mapa.sans[id];
      if (!san) return analise.nos[id]?.uci ?? id;
      const rotulo = mapa.rotulos[id];
      return rotulo ? `${rotulo} ${san}` : san;
    };
  } catch {
    // Sem mapa, o UCI. Nenhum nome é melhor do que um nome errado.
  }

  const { podados, podas } = podar(analise, fenNova, nomeDoLance);

  const capitulosDaAnalise = aula.capitulos.filter((item) => item.analiseId === analise.id);

  const bloqueios: BloqueioDaTrocaV2[] = [];

  for (const treino of aula.treinos) {
    const apontados = [
      ...(treino.inicio.analiseId === analise.id ? [treino.inicio.nodeId] : []),
      ...treino.questoes.filter((q) => q.posicao.analiseId === analise.id).map((q) => q.posicao.nodeId),
      ...(treino.origem?.analiseId === analise.id ? treino.origem.nodeIds : []),
    ];
    // **Sem repetidos.** As três listas se sobrepõem de propósito — a receita de
    // um treino derivado costuma conter o nó de início e os das questões —, e
    // somá-las cruas faria a tela dizer "usa 12 lances" de uma árvore que só tem
    // 8 para perder. Contagem que não bate com o que o professor vê no painel
    // ensina a desconfiar do resto do aviso.
    const perdidos = new Set(apontados.filter((id) => podados.has(id)));
    if (perdidos.size > 0) {
      bloqueios.push({
        tipo: "treino",
        nome: treino.titulo,
        motivo: `usa ${perdidos.size === 1 ? "um lance que" : `${perdidos.size} lances que`} a posição nova torna ilegal`,
      });
    }
  }

  for (const introducao of aula.introducoes) {
    for (const quadro of introducao.quadros) {
      if (quadro.posicao.tipo !== "referencia" || quadro.posicao.origem.analiseId !== analise.id) continue;
      if (podados.has(quadro.posicao.origem.nodeId)) {
        bloqueios.push({
          tipo: "introducao",
          nome: introducao.titulo,
          motivo: "um dos seus quadros mostra um lance que a posição nova torna ilegal",
        });
      }
    }
  }

  for (const outra of aula.analises) {
    if (outra.id === analise.id || outra.inicio.tipo !== "referencia") continue;
    if (outra.inicio.origem.analiseId !== analise.id) continue;
    const nome = aula.capitulos.find((c) => c.analiseId === outra.id)?.titulo ?? outra.id;
    bloqueios.push({
      tipo: "analise",
      nome,
      motivo: podados.has(outra.inicio.origem.nodeId)
        ? "começa num lance que a posição nova torna ilegal"
        : "começa numa posição deste capítulo, e mudaria de tabuleiro junto — desfaça essa dependência antes",
    });
  }

  // Sobreviventes com texto ou desenho: legais, e nem por isso ainda verdadeiros.
  const nosMarcados = Object.values(analise.nos)
    .filter((no) => !podados.has(no.id) && (no.comentario !== undefined || no.desenhos !== undefined))
    .map((no) => no.id);

  const narracoesRemovidas: ImpactoDaTrocaV2["narracoesRemovidas"] = [];
  const narracoesMarcadas: ImpactoDaTrocaV2["narracoesMarcadas"] = [];
  for (const capitulo of capitulosDaAnalise) {
    for (const narracao of capitulo.narracoes) {
      if (podados.has(narracao.nodeId)) {
        narracoesRemovidas.push({ capituloId: capitulo.id, capitulo: capitulo.titulo, narracaoId: narracao.id, texto: narracao.texto });
      } else {
        narracoesMarcadas.push({ capituloId: capitulo.id, capitulo: capitulo.titulo, narracaoId: narracao.id });
      }
    }
  }

  const quadrosMarcados: ImpactoDaTrocaV2["quadrosMarcados"] = [];
  for (const introducao of aula.introducoes) {
    for (const quadro of introducao.quadros) {
      if (quadro.posicao.tipo !== "referencia" || quadro.posicao.origem.analiseId !== analise.id) continue;
      if (podados.has(quadro.posicao.origem.nodeId)) continue;
      quadrosMarcados.push({ introducaoId: introducao.id, introducao: introducao.titulo, quadroId: quadro.id });
    }
  }

  const capitulosAfetados: CapituloAfetadoV2[] = capitulosDaAnalise.map((capitulo) => ({
    id: capitulo.id,
    titulo: capitulo.titulo,
    inicioReiniciado: podados.has(capitulo.inicioNodeId),
    percursoCortado: capitulo.caminho.some((id) => podados.has(id)),
  }));

  const treinosAfetados: TreinoAfetadoV2[] = aula.treinos
    .filter((treino) =>
      treino.inicio.analiseId === analise.id ||
      treino.questoes.some((q) => q.posicao.analiseId === analise.id) ||
      treino.origem?.analiseId === analise.id)
    .map((treino) => ({
      id: treino.id,
      titulo: treino.titulo,
      certificacaoReaberta: treino.certificacao !== undefined && treino.certificacao.estado !== "pendente",
      fonteAlterada: treino.origem !== undefined && treino.fonte === "atual",
    }));

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
        podas,
        nosPodados: [...podados],
        nosMarcados,
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
 * transação só: um Ctrl+Z devolve os lances podados, as narrações apagadas, as
 * marcas de revisão e a proveniência, todos juntos — e o Refazer devolve
 * exatamente os mesmos ids, porque o plano é o mesmo objeto.
 */
export function aplicarTrocaDePosicao(aula: AulaV2, plano: PlanoDaTrocaV2): AplicacaoDaTrocaV2 {
  const indice = aula.analises.findIndex((item) => item.id === plano.analiseId);
  if (indice < 0) return { ok: false, mensagem: "análise inexistente" };
  if (plano.impacto.bloqueios.length > 0) {
    const nomes = plano.impacto.bloqueios.map((b) => `«${b.nome}» ${b.motivo}`).join("; ");
    return { ok: false, mensagem: `não dá para trocar a posição enquanto houver quem dependa do que seria apagado: ${nomes}. Nada foi mudado.` };
  }

  const analise = aula.analises[indice];
  const podados = new Set(plano.impacto.nosPodados);
  const marcados = new Set(plano.impacto.nosMarcados);

  const nos: Record<string, NoV2> = {};
  for (const no of Object.values(analise.nos)) {
    if (podados.has(no.id)) continue;
    const filhos = no.filhos.filter((id) => !podados.has(id));
    const base: NoV2 = { ...no, filhos };
    nos[no.id] = marcados.has(no.id) ? comRevisao(base) : base;
  }

  const proxima: AnaliseV2 = { ...analise, inicio: { tipo: "fen", fen: plano.fen }, nos };

  const capitulos: CapituloV2[] = aula.capitulos.map((capitulo) => {
    if (capitulo.analiseId !== analise.id) return capitulo;
    // O nó de partida podado leva o percurso inteiro junto: tudo o que vinha
    // depois dele era descendente dele, e descendente de nó podado foi podado.
    const inicioNodeId = podados.has(capitulo.inicioNodeId) ? proxima.raizId : capitulo.inicioNodeId;
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

  const introducoes = aula.introducoes.map((introducao) => ({
    ...introducao,
    quadros: introducao.quadros.map((quadro) =>
      quadro.posicao.tipo === "referencia" && quadro.posicao.origem.analiseId === analise.id
        ? comRevisao(quadro)
        : quadro),
  }));

  const afetados = new Set(plano.impacto.treinosAfetados.map((item) => item.id));
  const treinos: TreinoV2[] = aula.treinos.map((treino) => {
    if (!afetados.has(treino.id)) return treino;
    return {
      ...treino,
      // §10 do plano final: a revisão da avaliação volta a ficar pendente quando
      // a avaliação muda de posição. Título e lugar no fluxo não fariam isso;
      // o chão debaixo das questões, sim.
      revisaoAvaliacao: "pendente",
      // §8: "um treino pode ser personalizado e ter fonte alterada
      // simultaneamente" — por isso `fonte` muda e `propriedade` não.
      ...(treino.origem && treino.fonte === "atual" ? { fonte: "alterada" as const } : {}),
      // §9 da funcional: "reabre proveniência/certificação vinculada à posição
      // antiga". Um selo conferido contra outro tabuleiro não é um selo.
      ...(treino.certificacao ? { certificacao: { ...treino.certificacao, estado: "pendente" as const } } : {}),
    };
  });

  const proveniencia = plano.impacto.provenienciaReaberta
    ? aula.proveniencia.map((item) =>
        item.positionId === plano.impacto.provenienciaReaberta && item.estado === "approved"
          ? { ...item, estado: "candidate" as const }
          : item)
    : aula.proveniencia;

  return {
    ok: true,
    aula: {
      ...aula,
      analises: aula.analises.map((item, i) => (i === indice ? proxima : item)),
      capitulos,
      introducoes,
      treinos,
      proveniencia,
    },
  };
}

/**
 * Tira a marca de revisão de um nó, de uma narração ou de um quadro.
 *
 * Existe porque uma marca sem porta de saída é uma armadilha: §5 manda que as
 * revisões sejam resolvidas antes de publicar, e resolver é um gesto do
 * professor — ele releu, e o texto está de pé. É um comando como outro
 * qualquer, e portanto desfazível.
 */
export function semRevisao(aula: AulaV2, alvo: { analiseId: string; nodeId: string } | { capituloId: string; narracaoId: string }): AulaV2 {
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
