import { Chess, type Color, type Square } from "chess.js";
import { casasEntre, conferirAfirmacao, corDaCasa } from "./afirmacoes.ts";

/**
 * As tarefas de reconhecimento do meio-jogo — o que o aluno faz entre ler a
 * dica e responder um quiz de plano.
 *
 * ## O buraco que este arquivo fecha
 *
 * Cada dica tinha **uma** posição, servindo ao mesmo tempo de exemplo ensinado
 * e de teste. Daí saem os dois defeitos medidos: 22 dos 30 quizzes são
 * respondíveis sem olhar o tabuleiro (a explicação tem de explicar, e ao
 * explicar entrega a resposta), e entre ler "o peão isolado é alvo" e escolher
 * um plano contra ele falta a etapa do meio — achar o traço numa posição que
 * ninguém montou para você.
 *
 * ## O juiz é um só
 *
 * Toda tarefa aqui decide pelo `conferirAfirmacao` de `lib/meiojogo/afirmacoes.ts`,
 * e nenhuma reimplementa o critério. É a mesma disciplina do gate e do teste
 * chamarem a mesma função: dois juízes com regras próprias divergem, e a
 * divergência aparece no pior momento — aqui seria a legenda dizendo que d5 é
 * posto e o exercício recusando o clique em d5.
 *
 * O custo é performance: `conferirAfirmacao` monta um `Chess` por chamada, e
 * varrer 64 casas custa 64 montagens. É aceitável porque quem varre é a
 * autoria (`scripts/escolher-exercicios.ts`), não o aluno — na tela a resposta
 * já vem escrita no item.
 *
 * ## Grupos, e não uma lista de casas
 *
 * `grupos()` devolve **conjuntos independentes** de resposta, e é isso que
 * responde à pergunta "o que a tarefa faz com resposta múltipla". Dois peões
 * isolados são dois grupos, e a posição não serve: o enunciado "toque no peão
 * sem vizinho" teria duas respostas certas e o aluno que acertasse uma poderia
 * ver a outra realçada. Um grupo com três casas — os dois peões de uma coluna
 * dobrada — é **uma** resposta, escrita em três cliques aceitáveis.
 *
 * A regra fica em `respostaDaTarefa`: um grupo devolve as casas; zero ou mais
 * de um devolvem vazio, que é a tarefa dizendo "esta posição não me serve".
 *
 * ## O contrato é executável
 *
 * Cada tarefa carrega os sete campos que a revisão pediu — o que mede, o que
 * **não** autoriza concluir, exemplo válido, contraexemplo, o que faz com
 * resposta múltipla, a frase do enunciado e a do feedback. Os dois primeiros
 * são prosa; o exemplo e o contraexemplo são **FEN e resposta esperada**, e o
 * teste os roda. Um contrato que a implementação desmente reprova no
 * `npm test`, e não numa conversa sobre o que a tarefa queria dizer.
 */

export type Lado = "brancas" | "pretas";
export type Casa = string;

const COR: Record<Lado, Color> = { brancas: "w", pretas: "b" };
const OUTRO: Record<Lado, Lado> = { brancas: "pretas", pretas: "brancas" };
const FRENTE: Record<Lado, number> = { brancas: 1, pretas: -1 };
const COLUNAS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const coluna = (casa: string): number => casa.charCodeAt(0) - 97;
const fileira = (casa: string): number => Number(casa[1]);
const casaDe = (c: number, f: number): Casa => `${String.fromCharCode(97 + c)}${f}`;

/** Verdade quando a afirmação passa — o único juiz do módulo. */
const vale = (fen: string, a: Parameters<typeof conferirAfirmacao>[1]): boolean =>
  conferirAfirmacao(fen, a) === null;

/**
 * O contrato de uma tarefa. Sete campos, e nenhum opcional.
 *
 * `naoAutoriza` é o que impede o relatório do professor de dizer mais do que o
 * clique provou. "Achou a peça com menos lances" não é "achou a pior peça", e a
 * diferença entre as duas frases é o que separa um número defensável de um
 * número que se desmancha ao lado do aluno.
 */
export type Contrato = {
  /** O que o acerto prova. */
  readonly mede: string;
  /** O que o acerto **não** prova — e que a tela e o relatório não podem dizer. */
  readonly naoAutoriza: string;
  /** O que a tarefa faz quando a posição admite mais de uma resposta. */
  readonly respostaMultipla: string;
  /** A frase que o aluno lê. Concreta antes do termo. */
  readonly enunciado: string;
  /** A linha escrita à mão que entra depois do acerto: por que isso importa. */
  readonly feedback: string;
  /** Uma posição em que a tarefa vale, com a resposta que ela devolve. */
  readonly exemplo: { readonly fen: string; readonly lado: Lado; readonly resposta: readonly Casa[] };
  /** Uma posição em que ela **não** vale, e o motivo. */
  readonly contraexemplo: { readonly fen: string; readonly lado: Lado; readonly porque: string };
};

export type Tarefa = {
  readonly id: string;
  readonly contrato: Contrato;
  /** Os conjuntos de resposta independentes da posição. */
  grupos(fen: string, lado: Lado): Casa[][];
};

/* ------------------------------------------------------------------ *
 * Régua
 * ------------------------------------------------------------------ */

function pecasDe(fen: string, lado: Lado, tipos: string): Casa[] {
  const jogo = new Chess(fen);
  const casas: Casa[] = [];
  for (const fileiraDoTabuleiro of jogo.board()) {
    for (const casa of fileiraDoTabuleiro) {
      if (casa === null || casa.color !== COR[lado]) continue;
      if (tipos.includes(casa.type)) casas.push(casa.square);
    }
  }
  return casas.sort();
}

/** Quantos peões do lado do bispo estão na cor da casa dele. */
function peoesNaCorDoBispo(fen: string, bispo: Casa): number {
  const jogo = new Chess(fen);
  const p = jogo.get(bispo as Square);
  if (!p || p.type !== "b") return -1;
  const cor = corDaCasa(bispo);
  let quantos = 0;
  for (const fileiraDoTabuleiro of jogo.board()) {
    for (const casa of fileiraDoTabuleiro) {
      if (casa?.type === "p" && casa.color === p.color && corDaCasa(casa.square) === cor) {
        quantos += 1;
      }
    }
  }
  return quantos;
}

/* ------------------------------------------------------------------ *
 * As tarefas
 * ------------------------------------------------------------------ */

/** O piso a partir do qual "peões na cor do bispo" vira item, e não ruído. */
export const PEOES_NA_COR_MINIMO = 4;

export const TAREFAS: readonly Tarefa[] = [
  {
    id: "peao-isolado",
    contrato: {
      mede:
        "que o aluno acha, no tabuleiro inteiro, o peão daquele lado que não tem nenhum peão " +
        "amigo nas duas colunas vizinhas.",
      naoAutoriza:
        "concluir que o peão é fraco, que ele será perdido, ou que o plano da posição é atacá-lo. " +
        "Isolado é uma descrição da estrutura; se isso pesa depende das peças, e é julgamento da " +
        "autoria — não do clique.",
      respostaMultipla:
        "cada peão isolado é um grupo. Dois peões isolados do mesmo lado tornam a posição " +
        "inutilizável para esta tarefa: o enunciado teria duas respostas certas.",
      enunciado: "Um peão sem nenhum peão amigo nas colunas ao lado. Toque nele.",
      feedback:
        "Como não há peão amigo nas colunas vizinhas, esse peão não pode receber a defesa simples " +
        "de outro peão na estrutura atual. Por isso pode exigir defesa de peças, ou virar alvo.",
      exemplo: {
        fen: "r2q1rk1/pb2bppp/1p2pn2/8/1nBP4/2N1BN2/PP2QPPP/R2R2K1 w - - 0 1",
        lado: "brancas",
        resposta: ["d4"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/8/P1P1P3/4K3 w - - 0 1",
        lado: "brancas",
        porque: "a2, c2 e e2 são três peões isolados — três respostas certas para uma pergunta só",
      },
    },
    grupos(fen, lado) {
      return pecasDe(fen, lado, "p")
        .filter((casa) => vale(fen, { o: "peao-isolado", casa }))
        .map((casa) => [casa]);
    },
  },

  {
    id: "coluna-aberta",
    contrato: {
      mede: "que o aluno acha a coluna em que nenhum dos dois lados tem peão.",
      naoAutoriza:
        "concluir que a coluna vale a pena. Coluna aberta sem casa de entrada útil é estrada que " +
        "não leva a lugar nenhum — é exatamente o que a dica m9 ensina, e o clique não o mede.",
      respostaMultipla:
        "cada coluna aberta é um grupo, com as oito casas dela. Duas colunas abertas tornam a " +
        "posição inutilizável: só o final tem várias, e ali a pergunta perde o sentido.",
      enunciado: "Uma coluna inteira sem peão nenhum, de nenhum dos dois lados. Toque nela.",
      feedback:
        "Sem peão na frente, a torre enxerga a coluna de ponta a ponta — e o que decide se ela vale " +
        "a pena é o que existe no fim dela.",
      exemplo: {
        // A mesma posição de m13, e não por acaso: a troca que dobrou os peões
        // pretos na coluna e é a que abriu a f, e a f é a única aberta aqui.
        fen: "r2qkbnr/ppp3pp/2n1p3/4p3/4P3/5N2/PPPP2PP/RNBQK2R w KQkq - 0 7",
        lado: "brancas",
        resposta: ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"],
      },
      contraexemplo: {
        fen: "r5k1/p1pR2pp/1p6/8/8/8/PPP3PP/2K5 b - - 0 1",
        lado: "pretas",
        porque: "as colunas d, e e f estão todas abertas — a pergunta tem três respostas",
      },
    },
    grupos(fen) {
      return COLUNAS.filter((c) => vale(fen, { o: "coluna-aberta", coluna: c })).map((c) =>
        [1, 2, 3, 4, 5, 6, 7, 8].map((f) => `${c}${f}`),
      );
    },
  },

  {
    id: "peao-na-semiaberta",
    contrato: {
      mede:
        "que o aluno acha o peão do adversário que está numa coluna em que o lado analisado não " +
        "tem peão nenhum — o alvo parado que a coluna semiaberta serve.",
      naoAutoriza:
        "concluir que o peão cairá. Ele pode estar defendido por outro peão, e a torre não come o " +
        "que está defendido; a dica m10 existe justamente para dizer isso.",
      respostaMultipla:
        "cada coluna semiaberta é um grupo, com os peões dele naquela coluna. Duas colunas " +
        "semiabertas tornam a posição inutilizável.",
      enunciado:
        "Nesta coluna você não tem peão e ele tem. Toque no peão dele que está parado ali.",
      feedback:
        "Peão não foge. Numa coluna em que só ele tem peão, suas torres enxergam esse peão sem " +
        "nada no caminho — e é isso que faz da coluna semiaberta um endereço, e não só um vazio.",
      exemplo: {
        fen: "r3r1k1/ppp2ppp/3p2n1/8/4P3/2N5/PPP2PPP/R2R2K1 w - - 0 1",
        lado: "brancas",
        resposta: ["d6"],
      },
      contraexemplo: {
        fen: "4k3/pp1p1p2/8/8/8/8/1P4P1/4K3 w - - 0 1",
        lado: "brancas",
        porque: "a, d e f são semiabertas para as brancas — três colunas, três respostas",
      },
    },
    grupos(fen, lado) {
      const grupos: Casa[][] = [];
      for (const c of COLUNAS) {
        if (!vale(fen, { o: "coluna-semiaberta", coluna: c, lado })) continue;
        const dele = pecasDe(fen, OUTRO[lado], "p").filter((casa) => casa[0] === c);
        if (dele.length > 0) grupos.push(dele);
      }
      return grupos;
    },
  },

  {
    id: "peao-dobrado",
    contrato: {
      mede: "que o aluno acha os dois peões daquele lado que estão na mesma coluna.",
      naoAutoriza:
        "concluir que a dobra é desvantagem. Quase sempre ela vem de uma captura, e a captura " +
        "costuma vir com alguma coisa junto — uma coluna aberta, um peão trazido ao centro. A dica " +
        "m13 pede comparação, não veredito.",
      respostaMultipla:
        "cada coluna dobrada é um grupo, com os peões dela. Duas colunas dobradas do mesmo lado " +
        "tornam a posição inutilizável.",
      enunciado: "Dois peões do mesmo lado, um atrás do outro, na mesma coluna. Toque neles.",
      feedback:
        "Um peão na frente do outro perde as duas coisas que peão faz bem: andar em bloco e " +
        "defender o vizinho. O que se ganhou em troca é a outra metade da conta.",
      exemplo: {
        fen: "r2qkbnr/ppp3pp/2n1p3/4p3/4P3/5N2/PPPP2PP/RNBQK2R w KQkq - 0 7",
        lado: "pretas",
        resposta: ["e5", "e6"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/P1P5/P1P5/4K3 w - - 0 1",
        lado: "brancas",
        porque: "as colunas a e c estão dobradas — duas respostas certas",
      },
    },
    grupos(fen, lado) {
      const grupos: Casa[][] = [];
      for (const c of COLUNAS) {
        if (!vale(fen, { o: "peao-dobrado", coluna: c, lado })) continue;
        grupos.push(pecasDe(fen, lado, "p").filter((casa) => casa[0] === c));
      }
      return grupos;
    },
  },

  {
    id: "posto",
    contrato: {
      mede:
        "que o aluno acha a casa que um peão do lado analisado defende e que peão nenhum do " +
        "adversário pode atacar — nem agora, nem andando.",
      naoAutoriza:
        "concluir que instalar uma peça ali ganha a partida, nem que a casa é a melhor da posição. " +
        "A dica m15 pede a conta seguinte: qual peça chega lá, e em quantos lances.",
      respostaMultipla:
        "cada casa que satisfaz é um grupo de uma casa. Duas ou mais tornam a posição inutilizável.",
      enunciado:
        "Uma casa que um peão seu defende e que nenhum peão dele consegue atacar. Toque nela.",
      feedback:
        "Peão inimigo nenhum alcança essa casa, então a peça que sentar ali não é expulsa por peão " +
        "— só por troca. É isso, e só isso, que a palavra posto quer dizer.",
      exemplo: {
        fen: "4k3/pp3ppp/8/2P5/1P6/8/5PPP/4K3 w - - 0 1",
        lado: "brancas",
        resposta: ["d6"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/1P1P4/8/8/4K3 w - - 0 1",
        lado: "brancas",
        porque: "a5, c5 e e5 são todas defendidas por peão e inatacáveis — três respostas",
      },
    },
    grupos(fen, lado) {
      const grupos: Casa[][] = [];
      for (let c = 0; c < 8; c += 1) {
        for (let f = 1; f <= 8; f += 1) {
          const casa = casaDe(c, f);
          if (vale(fen, { o: "posto", casa, lado })) grupos.push([casa]);
        }
      }
      return grupos;
    },
  },

  {
    id: "casa-de-bloqueio",
    contrato: {
      mede:
        "que o aluno acha a casa imediatamente à frente do peão passado do adversário — a casa em " +
        "que uma peça o para de vez.",
      naoAutoriza:
        "concluir que qualquer peça serve de bloqueador. A dica m16 diz o contrário: o bloqueador " +
        "bom é o que continua fazendo outra coisa enquanto bloqueia, e uma torre presa na tarefa é " +
        "só uma torre presa.",
      respostaMultipla:
        "cada peão passado dele é um grupo, com a casa à frente dele. Dois passados tornam a " +
        "posição inutilizável.",
      enunciado: "O peão dele já passou. Toque na casa bem na frente dele — a que o para.",
      feedback:
        "Vigiar de longe não resolve: ele avança, você captura, ele recaptura, e o problema mudou " +
        "de lugar. Uma peça sentada na casa da frente resolve, porque peão não pula.",
      exemplo: {
        fen: "3r3k/1b6/5n2/3p4/8/1N6/5B2/6K1 w - - 0 1",
        lado: "brancas",
        resposta: ["d4"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/2p1p3/8/4K3 w - - 0 1",
        lado: "brancas",
        porque: "c3 e e3 são dois peões passados das pretas — duas casas de bloqueio",
      },
    },
    grupos(fen, lado) {
      return pecasDe(fen, OUTRO[lado], "p")
        .filter((casa) => vale(fen, { o: "peao-passado", casa }))
        .map((casa) => [casaDe(coluna(casa), fileira(casa) + FRENTE[OUTRO[lado]])])
        .filter(([casa]) => fileira(casa) >= 1 && fileira(casa) <= 8);
    },
  },

  {
    id: "torre-na-setima",
    contrato: {
      mede: "que o aluno acha a torre daquele lado que está na sétima fileira do adversário.",
      naoAutoriza:
        "concluir que a torre ganha material ali. A dica m11 é literalmente sobre isso: na sétima, " +
        "confira alvo **e** defesa — quando a conta empata, a torre não captura.",
      respostaMultipla:
        "cada torre na sétima é um grupo. Duas torres na sétima tornam a posição inutilizável para " +
        "esta tarefa, ainda que sejam a melhor coisa que pode acontecer no tabuleiro.",
      enunciado: "Uma torre sua chegou à fileira onde moram os peões dele. Toque nela.",
      feedback:
        "A sétima é onde estão os peões que nunca andaram, e uma torre ali costuma olhar para dois " +
        "ou três de uma vez — sem sair do lugar.",
      exemplo: {
        fen: "2r3k1/p1pR2pp/1p6/8/8/8/PPP3PP/2K5 w - - 1 2",
        lado: "brancas",
        resposta: ["d7"],
      },
      contraexemplo: {
        fen: "6k1/RR6/8/8/8/8/6PP/6K1 w - - 0 1",
        lado: "brancas",
        porque: "as duas torres estão na sétima — duas respostas certas",
      },
    },
    grupos(fen, lado) {
      return pecasDe(fen, lado, "r")
        .filter((casa) => vale(fen, { o: "torre-na-setima", lado, casa }))
        .map((casa) => [casa]);
    },
  },

  {
    id: "bispo-com-peoes-na-propria-cor",
    contrato: {
      mede:
        `a relação estrutural entre o bispo e os peões do próprio lado: qual bispo seu tem mais ` +
        `peões seus em casas da cor dele, com piso de ${PEOES_NA_COR_MINIMO}.`,
      naoAutoriza:
        'concluir que o bispo é ruim, que deve ser trocado ou que está inútil. O termo "bispo mau" ' +
        "não aparece no enunciado; ele cabe na explicação, onde há espaço para dizer que é " +
        "comparação, e não decreto.",
      respostaMultipla:
        "bispos empatados no máximo são grupos separados — o par de bispos com quatro peões cada " +
        "torna a posição inutilizável. Abaixo do piso, nenhum grupo: não há o que apontar.",
      enunciado:
        "Olhe a cor das casas dos seus peões. Toque no seu bispo que anda na mesma cor da maioria " +
        "deles.",
      feedback:
        "Cada peão seu na cor do seu bispo é uma casa a menos para ele passar. Isso não faz do " +
        "bispo uma peça ruim — faz dele uma peça que depende de a estrutura mudar.",
      exemplo: {
        fen: "4k3/3n4/2p5/1pPp4/pP1P4/P7/8/2B1K3 b - - 0 1",
        lado: "brancas",
        resposta: ["c1"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/8/PPP5/2B1KB2 w - - 0 1",
        lado: "brancas",
        porque: "os peões de a2, b2 e c2 são só três — abaixo do piso, não há item",
      },
    },
    grupos(fen, lado) {
      const bispos = pecasDe(fen, lado, "b").map((casa) => ({
        casa,
        quantos: peoesNaCorDoBispo(fen, casa),
      }));
      const maximo = Math.max(0, ...bispos.map((b) => b.quantos));
      if (maximo < PEOES_NA_COR_MINIMO) return [];
      return bispos.filter((b) => b.quantos === maximo).map((b) => [b.casa]);
    },
  },

  {
    id: "peca-com-menos-lances",
    contrato: {
      mede:
        "mobilidade agora: qual peça daquele lado tem o menor número de lances legais nesta " +
        "posição, contando só peças (sem peões e sem o rei).",
      naoAutoriza:
        "concluir que ela é a pior peça, nem que é a que deve ser melhorada. Peça parada pode " +
        "estar segurando alguma coisa, e mobilidade é uma variável entre várias.",
      respostaMultipla:
        "cada peça empatada no mínimo é um grupo. Só entram posições em que o mínimo é único — o " +
        "caso medido em m17 é exatamente este: o bispo de d2 empata com a torre de a1 em 2 lances.",
      enunciado: "Conte os lances de cada peça sua. Toque na que tem menos.",
      feedback:
        "Peça com pouco lance costuma estar atrás de alguma coisa — sua, quase sempre. Descobrir " +
        "**o que** está na frente é o passo seguinte, e é ele que vira plano.",
      exemplo: {
        // A torre de a1, com dois lances (Rb1, Rc1). Medido, e não escolhido: o bispo
        // de c4 parece a peça travada e tem seis.
        fen: "r2q1rk1/pb2bppp/1p2pn2/8/1nBP4/2N1BN2/PP2QPPP/R2R2K1 w - - 0 1",
        lado: "brancas",
        resposta: ["a1"],
      },
      contraexemplo: {
        fen: "3r1rk1/3nbppp/pq2pn2/1p6/8/1NN1PQ2/PP1B1PPP/R2R2K1 w - - 0 1",
        lado: "brancas",
        porque: "o bispo de d2 e a torre de a1 têm 2 lances cada — o mínimo não é único",
      },
    },
    grupos(fen, lado) {
      const jogo = new Chess(fen);
      if ((jogo.turn() === "w" ? "brancas" : "pretas") !== lado) return [];
      const contadas = pecasDe(fen, lado, "qrbn").map((casa) => ({
        casa,
        quantos: jogo.moves({ square: casa as Square }).length,
      }));
      if (contadas.length === 0) return [];
      const minimo = Math.min(...contadas.map((c) => c.quantos));
      return contadas.filter((c) => c.quantos === minimo).map((c) => [c.casa]);
    },
  },

  {
    id: "peca-na-casa-de-origem",
    contrato: {
      mede: "que há uma peça daquele tipo na casa em que ela começa a partida.",
      naoAutoriza:
        "concluir que ela nunca saiu. A FEN não tem histórico: a peça pode ter ido e voltado, e " +
        'por isso o enunciado diz "está na casa onde começou", e não "ainda não jogou".',
      respostaMultipla:
        "cada peça na casa de origem é um grupo. A posição inicial tem oito — a tarefa só serve " +
        "quando resta uma, que é justamente o momento em que a pergunta ensina alguma coisa.",
      enunciado: "Uma peça sua ainda está na casa onde ela começou a partida. Toque nela.",
      feedback:
        "Peça que não saiu não conta. Antes de mexer de novo numa que já trabalha, vale olhar se " +
        "sobrou alguma parada — mas parada por escolha também existe.",
      exemplo: {
        // A posição de m10: das oito peças de origem das brancas, só a torre de
        // a1 continua onde nasceu. É esse o momento em que a pergunta ensina.
        fen: "r3r1k1/ppp2ppp/3p2n1/8/4P3/2N5/PPP2PPP/R2R2K1 w - - 0 1",
        lado: "brancas",
        resposta: ["a1"],
      },
      contraexemplo: {
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4",
        lado: "brancas",
        porque: "a1, c1, d1, e1, f1 e h1 continuam ocupadas pelas peças de origem — seis respostas",
      },
    },
    grupos(fen, lado) {
      const inicio: Record<string, string> = {
        r: "ah",
        n: "bg",
        b: "cf",
        q: "d",
        k: "e",
      };
      const casa1 = lado === "brancas" ? 1 : 8;
      const grupos: Casa[][] = [];
      for (const [tipo, colunas] of Object.entries(inicio)) {
        for (const c of colunas) {
          const casa = `${c}${casa1}`;
          const nome = { r: "torre", n: "cavalo", b: "bispo", q: "dama", k: "rei" }[tipo] as
            | "torre"
            | "cavalo"
            | "bispo"
            | "dama"
            | "rei";
          if (vale(fen, { o: "peca", casa, peca: nome, lado })) grupos.push([casa]);
        }
      }
      return grupos;
    },
  },

  {
    id: "peao-retardatario",
    contrato: {
      mede:
        "que o aluno acha o peão daquele lado que ficou atrás dos vizinhos e não consegue mais " +
        "alcançá-los: nenhum peão amigo ao lado pode defendê-lo, e a casa à frente dele é " +
        "controlada por peão inimigo.",
      naoAutoriza:
        "concluir que ele será perdido. O que a posição garante é que ele não anda sozinho e não " +
        "recebe defesa de peão — quem decide o resto são as peças.",
      respostaMultipla: "cada peão retardatário é um grupo. Dois tornam a posição inutilizável.",
      enunciado:
        "Um peão seu ficou para trás e não alcança mais os vizinhos: se avançar, é capturado. " +
        "Toque nele.",
      feedback:
        "Ele não anda e não recebe defesa de peão, então quem o defende é peça — e a coluna em que " +
        "só ele existe é estrada para as torres do outro lado.",
      exemplo: {
        fen: "4k3/8/4p3/3p1p2/3P1P2/8/8/4K3 w - - 0 1",
        lado: "pretas",
        resposta: ["e6"],
      },
      contraexemplo: {
        fen: "4k3/8/2p1p3/1p3p2/1P3P2/8/8/4K3 w - - 0 1",
        lado: "pretas",
        porque: "c6 e e6 ficaram os dois para trás — duas respostas certas",
      },
    },
    grupos(fen, lado) {
      return pecasDe(fen, lado, "p")
        .filter((casa) => vale(fen, { o: "peao-retardatario", casa }))
        .map((casa) => [casa]);
    },
  },

  {
    id: "ataque-descoberto",
    contrato: {
      mede:
        "que o aluno enxerga a fila de três peças: uma peça sua que ataca em linha, uma peça sua " +
        "na frente dela, e a dama ou o rei dele no fim da linha. Tirar a do meio revela o ataque.",
      naoAutoriza:
        "concluir que o descoberto ganha alguma coisa. A peça do meio precisa ter para onde ir, e " +
        "ir para um lugar que valha a pena; nada disso está no clique.",
      respostaMultipla:
        "cada peça que passaria a mirar é um grupo. Duas tornam a posição inutilizável — e são " +
        "raras, porque a fila exige alinhamento exato com exatamente uma peça sua no meio.",
      enunciado:
        "Tire uma peça sua do tabuleiro na sua cabeça. Toque na peça sua que passa a mirar a dama " +
        "ou o rei dele.",
      feedback:
        "Enquanto a peça do meio estiver ali, nada acontece. No instante em que ela sai, a de trás " +
        "passa a mirar — e quem enxerga a fila de três antes enxerga o ataque antes.",
      exemplo: {
        // A posição de m7: torre em f3, cavalo em e3, dama preta em c3, os três
        // na mesma fileira e nessa ordem.
        fen: "r1b2rk1/p1p1nppp/2np4/2p5/2B1PP2/1Pq1NR2/P2N2PP/R2Q2K1 b - - 0 1",
        lado: "brancas",
        resposta: ["f3"],
      },
      contraexemplo: {
        fen: "3q3k/8/8/8/8/8/1P1N4/B2R2K1 w - - 0 1",
        lado: "brancas",
        porque:
          "a torre de d1 revela a dama saindo o cavalo de d2, e o bispo de a1 revela o rei saindo " +
          "o peão de b2 — duas respostas certas",
      },
    },
    grupos(fen, lado) {
      const jogo = new Chess(fen);
      const alvos = pecasDe(fen, OUTRO[lado], "qk");
      const grupos: Casa[][] = [];
      for (const atirador of pecasDe(fen, lado, "qrb")) {
        const tipo = jogo.get(atirador as Square)?.type;
        for (const alvo of alvos) {
          const caminho = casasEntre(atirador, alvo);
          if (caminho === null) continue;
          // A peça tem de atacar **naquela** linha: torre não mira na diagonal.
          const emLinha = fileira(atirador) === fileira(alvo) || coluna(atirador) === coluna(alvo);
          const alcanca = emLinha ? tipo === "r" || tipo === "q" : tipo === "b" || tipo === "q";
          if (!alcanca) continue;
          const noCaminho = caminho.filter((c) => jogo.get(c));
          if (noCaminho.length !== 1) continue;
          // A peça do meio tem de ser **sua**: com peça dele no meio isto é uma
          // cravada, que é o desenho oposto e ensina outra coisa.
          if (jogo.get(noCaminho[0])?.color !== COR[lado]) continue;
          grupos.push([atirador]);
          break;
        }
      }
      return grupos;
    },
  },

  {
    id: "casa-negada",
    contrato: {
      mede:
        "que o aluno acha a casa que só os peões de um lado alcançam: um peão dele a ataca, e " +
        "nenhum peão do adversário chega nela.",
      naoAutoriza:
        "concluir que o lado tem vantagem de espaço, nem que a casa é útil. Uma casa negada no " +
        "canto do tabuleiro não compra nada — o que ela mede é controle, não valor.",
      respostaMultipla:
        "cada casa é um grupo, e posições com mais de uma são a regra e não a exceção. Esta tarefa " +
        "é a mais exigente do conjunto quanto a estoque, e o funil vai medir quanto sobra.",
      enunciado: "Uma casa que um peão seu ataca e que nenhum peão dele consegue atacar. Toque nela.",
      feedback:
        "Enquanto peão nenhum dele alcançar essa casa, ela é sua para usar — e o que decide se ela " +
        "vale alguma coisa é quem consegue chegar lá.",
      exemplo: {
        // Um peão na coluna a, e não no meio: peão do meio ataca **duas** casas,
        // e duas casas negadas são duas respostas. Este é o único formato de
        // posição em que a tarefa tem resposta única com um peão só — e já diz
        // muito sobre o estoque que ela vai encontrar.
        fen: "4k3/8/8/8/8/P7/8/4K3 w - - 0 1",
        lado: "brancas",
        resposta: ["b4"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/2P1P3/8/4K3 w - - 0 1",
        lado: "brancas",
        porque: "b4, d4 e f4 são todas negadas às pretas — três respostas",
      },
    },
    grupos(fen, lado) {
      const grupos: Casa[][] = [];
      for (let c = 0; c < 8; c += 1) {
        for (let f = 1; f <= 8; f += 1) {
          const casa = casaDe(c, f);
          if (vale(fen, { o: "casas-negadas", casas: [casa], por: lado })) grupos.push([casa]);
        }
      }
      return grupos;
    },
  },
];

export const tarefaPorId = (id: string): Tarefa | undefined => TAREFAS.find((t) => t.id === id);

/**
 * As casas aceitas como resposta, ou vazio quando a posição não serve.
 *
 * Vazio significa duas coisas diferentes e o chamador não precisa distingui-las:
 * o traço não existe na posição, ou existe mais de uma vez. Nos dois casos a
 * posição não pode virar item — e é por isso que a mesma resposta serve.
 */
export function respostaDaTarefa(fen: string, tarefa: Tarefa, lado: Lado): Casa[] {
  const grupos = tarefa.grupos(fen, lado);
  return grupos.length === 1 ? [...grupos[0]].sort() : [];
}

/* ------------------------------------------------------------------ *
 * O mapa: que tarefa cada dica ganha
 * ------------------------------------------------------------------ */

/** De quem é o traço que o item pede — o **seu**, ou o do adversário. */
export type Alvo = "meu" | "dele";

export type NoMapa = {
  readonly dica: string;
  /** `null` quando a dica não tem fato que uma máquina julgue. */
  readonly tarefa: string | null;
  readonly alvo: Alvo;
  /** Por que esta tarefa, e não outra — ou por que nenhuma. */
  readonly porque: string;
};

/**
 * A reclassificação das 30, **pelo que a dica ensina**.
 *
 * ## Por que a classificação anterior estava errada
 *
 * Ela foi feita pelas **afirmações da legenda**, e não pelo que a dica ensina.
 * A legenda de m7 diz "as pretas jogam; sua dama está em c3 e a torre branca em
 * f3" — três afirmações genéricas —, e por isso m7 entrou na lista de
 * "julgamento puro". Só que o quiz dela pergunta "se o cavalo de e3 sair, qual
 * peça passa a atacar a dama de c3?", que é ataque descoberto e a `chess.js`
 * confere. A legenda descreve a posição; a dica ensina outra coisa.
 *
 * ## O que mudou, medido
 *
 * O total não mudou — 15 dicas com fato conferível, 15 sem —, mas **12 das 30
 * trocaram de lado**. Ganharam tarefa: m1, m3, m7, m15, m17 e m24. Perderam:
 * m2, m5, m6, m18, m19 e m29, que tinham afirmação temática na legenda mas
 * nenhuma pergunta de "toque na casa" que a sustente. Um total certo por
 * acidente, com metade das entradas erradas.
 *
 * **Os oito conceitos da fatia do piloto (m9–m16) têm tarefa, os oito.** É o
 * achado que o Bloco 3 precisava antes de curar posição.
 *
 * ## Uma tarefa por objetivo, e não por traço
 *
 * m12 ("faça do isolado um alvo") e m28 ("dê atividade ao seu peão isolado")
 * usam a mesma tarefa e **não** podem receber o mesmo exercício. O que os
 * separa é o `alvo`: em m12 o aluno procura o isolado **dele**, em m28 o
 * **seu**. Mesma geometria, pergunta oposta — e é essa a diferença que a dica
 * ensina. O mesmo vale para m1 e m24, que compartilham
 * `peca-na-casa-de-origem`: numa é a sua peça que não saiu, na outra é o rei
 * dele que não rocou.
 */
export const MAPA: readonly NoMapa[] = [
  { dica: "m1", tarefa: "peca-na-casa-de-origem", alvo: "meu", porque: "a dica manda contar o que ainda está na sua primeira fileira — isso é fato" },
  { dica: "m2", tarefa: null, alvo: "meu", porque: "o fato é o roque ainda disponível, e disponibilidade não é casa a tocar" },
  { dica: "m3", tarefa: "casa-negada", alvo: "meu", porque: "disputar o centro é negar casa com peão; o funil dirá se há estoque (1,4%)" },
  { dica: "m4", tarefa: null, alvo: "meu", porque: "somar atacantes numa casa é conta, não busca — e qual casa atacar é julgamento" },
  { dica: "m5", tarefa: null, alvo: "meu", porque: "o escudo intacto se afirma, mas 'mexer só com motivo' é o motivo, e ele é da autoria" },
  { dica: "m6", tarefa: null, alvo: "meu", porque: "torres ligadas é afirmação sobre duas peças, não uma casa que o aluno ache" },
  { dica: "m7", tarefa: "ataque-descoberto", alvo: "meu", porque: "o quiz já pergunta um fato que a chess.js confere — foi a dica que denunciou a classificação antiga" },
  { dica: "m8", tarefa: null, alvo: "dele", porque: "qual troca alivia a posição é julgamento, e é o que a dica ensina" },
  { dica: "m9", tarefa: "coluna-aberta", alvo: "meu", porque: "achar a coluna sem peão nenhum é o primeiro passo da dica; a entrada no fim dela é o segundo, e esse é julgamento" },
  { dica: "m10", tarefa: "peao-na-semiaberta", alvo: "dele", porque: "o alvo parado da coluna semiaberta é dele, e é nele que o aluno toca" },
  { dica: "m11", tarefa: "torre-na-setima", alvo: "meu", porque: "a torre na sétima é sua; a conta de alvo e defesa vem depois, e é da autoria" },
  { dica: "m12", tarefa: "peao-isolado", alvo: "dele", porque: "o isolado é o alvo — o peão é dele" },
  { dica: "m13", tarefa: "peao-dobrado", alvo: "dele", porque: "achar a dobra é o fato; se ela pesa é a comparação que a dica ensina" },
  { dica: "m14", tarefa: "bispo-com-peoes-na-propria-cor", alvo: "meu", porque: "a conta prática da dica é sobre os **seus** peões e o **seu** bispo" },
  { dica: "m15", tarefa: "posto", alvo: "meu", porque: "a casa que peão dele nenhum alcança é fato geométrico, e a dica manda testá-la" },
  { dica: "m16", tarefa: "casa-de-bloqueio", alvo: "meu", porque: "o passado é dele, a casa da frente é sua para ocupar" },
  { dica: "m17", tarefa: "peca-com-menos-lances", alvo: "meu", porque: "mobilidade se conta; 'pior peça' não — e o contrato separa as duas" },
  { dica: "m18", tarefa: null, alvo: "meu", porque: "ter o par de bispos é afirmação; guardar diagonais para eles é plano" },
  { dica: "m19", tarefa: null, alvo: "dele", porque: "a cadeia se afirma, mas achar a base pede uma tarefa que ainda não existe" },
  { dica: "m20", tarefa: "peao-retardatario", alvo: "dele", porque: "o peão que ficou para trás é dele, e é nele que o cerco se monta" },
  { dica: "m21", tarefa: null, alvo: "meu", porque: "espaço se mede em peões além do meio, e isso é contagem, não casa a tocar" },
  { dica: "m22", tarefa: null, alvo: "meu", porque: "qual ruptura libera o jogo é julgamento — e a dica diz que romper abre uma conversa" },
  { dica: "m23", tarefa: null, alvo: "meu", porque: "a ordem 'primeiro as peças, depois os peões' é plano, não posição" },
  { dica: "m24", tarefa: "peca-na-casa-de-origem", alvo: "dele", porque: "o rei dele ainda na casa de origem é o fato da dica — e o `alvo` é o que a separa de m1" },
  { dica: "m25", tarefa: null, alvo: "meu", porque: "a segunda frente é escolha de onde atacar, e não há juiz de máquina para ela" },
  { dica: "m26", tarefa: null, alvo: "dele", porque: "profilaxia é atrasar um plano que ainda não existe — nada no tabuleiro a apontar" },
  { dica: "m27", tarefa: null, alvo: "meu", porque: "'olhe o centro antes de responder na ala' é ordem de exame, não traço" },
  { dica: "m28", tarefa: "peao-isolado", alvo: "meu", porque: "o mesmo traço de m12 com a pergunta oposta: o isolado é seu, e a dica ensina a usá-lo" },
  { dica: "m29", tarefa: null, alvo: "meu", porque: "defender criando tarefa ao rival é escolha de qual problema ter — julgamento puro" },
  { dica: "m30", tarefa: null, alvo: "meu", porque: "reavaliar é método de leitura, e a própria dica o entrega como quatro perguntas" },
];

/** As dicas que ganham exercício de reconhecimento com juiz de máquina. */
export const comTarefa = (): NoMapa[] => MAPA.filter((n) => n.tarefa !== null);
