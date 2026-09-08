import { Chess, type Move } from "chess.js";
import { corDaCasa } from "./afirmacoes.ts";
import {
  casaDe,
  coluna,
  COR,
  fileira,
  FRENTE,
  MAPA,
  OUTRO,
  respostaDaTarefa,
  tarefaPorId,
  type Casa,
  type Lado,
} from "./exercicios.ts";

/**
 * O juiz do **lance** — o que separa "o aluno vê o tema" de "o aluno usa o tema".
 *
 * ## O buraco que este arquivo fecha
 *
 * `lib/meiojogo/exercicios.ts` julga **casas**: o aluno toca em d5 e o site diz
 * que ele achou a coluna aberta. Medido no Bloco 4, isso prova a primeira
 * metade de m9 e para ali — a dica manda "ligue a coluna a uma entrada", e
 * clicar na coluna não é ligá-la a nada. Aqui o aluno joga o lance, e o juiz
 * diz se aquele lance aplica o tema.
 *
 * ## O alvo sai das `grupos()` que já existem
 *
 * Nada de segundo critério. Cada juiz pergunta à tarefa de `exercicios.ts` qual
 * é o alvo da posição — a coluna aberta, o peão isolado dele, a casa de
 * bloqueio — e depois varre os lances legais atrás dos que **chegam** nele. Se
 * a tarefa devolve vazio (o traço não existe, ou existe duas vezes), o juiz
 * devolve vazio: a posição não serve, e é a mesma resposta dos dois lados.
 *
 * Duas tarefas não emprestam o alvo, e é de propósito:
 *
 * - **`torre-na-setima`** acha a torre que **já está** na sétima. O lance é
 *   chegar lá, então o alvo é a fileira, não a peça — e é por isso que as
 *   posições curadas para o clique podem não servir para o lance.
 * - **`bispo-com-peoes-na-propria-cor`** aponta o bispo, e o lance não é sobre
 *   o bispo: é sobre os peões que o atrapalham. O juiz conta antes e depois.
 *
 * ## Chegar, e não estar
 *
 * Todos os juízes de coluna e de fileira exigem que a **origem** esteja fora
 * dela. Uma torre que já mora na coluna aberta e desliza dentro dela não aplica
 * o tema — ele já está aplicado, e a posição pede outro exercício. Sem essa
 * regra o juiz aceitaria Td1-d4 como "ocupe a coluna d", e o aluno aprenderia
 * que qualquer lance de torre serve.
 *
 * ## O que este arquivo **não** decide
 *
 * Se o lance é bom. Um lance pode aplicar o tema e perder a partida — a torre
 * que ocupa a coluna aberta pendurando na casa de entrada. Quem reprova isso é
 * o motor, na curadoria (`scripts/medir-lances.ts`), e nunca em tempo de aula:
 * todo lance aceito tem de caber no `SALTO_PADRAO` de `lib/meiojogo/portas.ts`
 * contado do melhor lance, e um item que não caiba não pode ser publicado.
 */

export type LanceUci = string;

/**
 * O contrato de um juiz de lance. Os mesmos sete campos do `Contrato` das
 * tarefas, pela mesma razão: prosa sozinha apodrece, e `exemplo` e
 * `contraexemplo` são FEN e resposta, rodados pelo `npm test`.
 */
export type ContratoDeLance = {
  /** O que o lance aceito prova. */
  readonly aplica: string;
  /** O que ele **não** prova — e que a tela e o relatório não podem dizer. */
  readonly naoAutoriza: string;
  /** O que o juiz faz quando a posição admite mais de um lance do tema. */
  readonly lanceMultiplo: string;
  /** A frase que o aluno lê. Concreta antes do termo. */
  readonly enunciado: string;
  /** A linha do erro: por que aquele lance não é o do tema. */
  readonly foraDoTema: string;
  /**
   * A linha do lance que **aplica** o tema e o motor reprovou.
   *
   * Ela é a mais difícil de escrever das três, e é a que mais ensina: o aluno
   * fez o que a dica manda e perdeu. A frase não pode desdizer a dica ("então
   * não ocupe a coluna") nem elogiar o erro — ela diz que o padrão está certo e
   * que a conta da casa é a metade seguinte.
   */
  readonly custaCaro: string;
  /** Uma posição em que o tema tem lance, com os lances que o aplicam. */
  readonly exemplo: {
    readonly fen: string;
    readonly lado: Lado;
    readonly lances: readonly LanceUci[];
  };
  /** Uma posição em que ele **não** tem, e o motivo. */
  readonly contraexemplo: { readonly fen: string; readonly lado: Lado; readonly porque: string };
};

export type JuizDeLance = {
  /** O id da tarefa de `exercicios.ts` de onde sai o alvo. */
  readonly id: string;
  /**
   * As dicas que este juiz serve.
   *
   * Explícito, e não derivado do `MAPA`, porque duas dicas podem compartilhar a
   * tarefa e **inverter** o lance: m12 manda bloquear o isolado **dele**, m28
   * manda dar atividade ao isolado **seu**. Mesma geometria, lances opostos —
   * e um `MAPA` que só diz a tarefa não separa os dois.
   */
  readonly dicas: readonly string[];
  /** De quem é o lance, dado o `lado` que a tarefa analisa. */
  quemJoga(lado: Lado): Lado;
  /** Os lances legais que aplicam o tema, em UCI, ordenados. */
  lances(fen: string, lado: Lado): LanceUci[];
  readonly contrato: ContratoDeLance;
};

/* ------------------------------------------------------------------ *
 * Régua
 * ------------------------------------------------------------------ */

/** `e2e4`, e `e7e8q` quando promove — o formato que o chessground devolve. */
export const uciDe = (m: Pick<Move, "from" | "to" | "promotion">): LanceUci =>
  `${m.from}${m.to}${m.promotion ?? ""}`;

/** Os lances legais de quem joga — vazio quando não é a vez dele. */
function legais(fen: string, quem: Lado): Move[] {
  const jogo = new Chess(fen);
  if (jogo.turn() !== COR[quem]) return [];
  return jogo.moves({ verbose: true });
}

/** O alvo da tarefa nesta posição, ou vazio quando ela não serve. */
function alvoDa(tarefa: string, fen: string, lado: Lado): Casa[] {
  const t = tarefaPorId(tarefa);
  if (!t) throw new Error(`tarefa desconhecida: ${tarefa}`);
  return respostaDaTarefa(fen, t, lado);
}

/** Chegar a uma coluna: a origem fora dela, o destino dentro. */
function chegaNaColuna(fen: string, quem: Lado, tipos: string, c: string): LanceUci[] {
  return legais(fen, quem)
    .filter((m) => tipos.includes(m.piece) && m.to[0] === c && m.from[0] !== c)
    .map(uciDe)
    .sort();
}

/** Chegar a uma fileira: a origem fora dela, o destino dentro. */
function chegaNaFileira(fen: string, quem: Lado, tipos: string, f: number): LanceUci[] {
  return legais(fen, quem)
    .filter((m) => tipos.includes(m.piece) && fileira(m.to) === f && fileira(m.from) !== f)
    .map(uciDe)
    .sort();
}

/** Chegar a uma casa. Aqui não há regra de origem: chegar já é mudar de lugar. */
function chegaNaCasa(fen: string, quem: Lado, tipos: string, casa: Casa): LanceUci[] {
  return legais(fen, quem)
    .filter((m) => tipos.includes(m.piece) && m.to === casa)
    .map(uciDe)
    .sort();
}

/** Quantos peões de `lado` estão em casas da cor dada. */
function peoesNaCor(fen: string, lado: Lado, cor: "claras" | "escuras"): number {
  const jogo = new Chess(fen);
  let quantos = 0;
  for (const fileiraDoTabuleiro of jogo.board()) {
    for (const casa of fileiraDoTabuleiro) {
      if (casa?.type === "p" && casa.color === COR[lado] && corDaCasa(casa.square) === cor) {
        quantos += 1;
      }
    }
  }
  return quantos;
}

/** Todas as peças, para os alvos em que qualquer uma serve. */
const QUALQUER = "pnbrqk";

/* ------------------------------------------------------------------ *
 * Os juízes
 * ------------------------------------------------------------------ */

export const JUIZES: readonly JuizDeLance[] = [
  {
    id: "coluna-aberta",
    dicas: ["m9"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const alvo = alvoDa("coluna-aberta", fen, lado);
      if (alvo.length === 0) return [];
      return chegaNaColuna(fen, this.quemJoga(lado), "rq", alvo[0][0]);
    },
    contrato: {
      aplica:
        "que o aluno leva uma peça pesada para a coluna sem peão nenhum — que é o que a dica m9 " +
        "manda fazer com ela, e não só reconhecê-la.",
      naoAutoriza:
        "concluir que a coluna vale a pena, nem que a casa de entrada é boa. Ocupar a coluna é o " +
        "primeiro lance do plano; se há entrada no fim dela é a conta seguinte, e o lance não a faz.",
      lanceMultiplo:
        "as duas torres podem entrar na coluna, e as duas aplicam o tema. É **uma** resposta com " +
        "dois lances aceitáveis — recusar Tad1 e aceitar Tfd1 ensinaria a adivinhar o autor.",
      enunciado: "Há uma coluna sem peão nenhum. Leve uma torre ou a dama para ela.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: ele não põe peça pesada na coluna aberta.",
      custaCaro:
        "Ocupar a coluna é o padrão certo, e este lance a ocupa. O que ele não conferiu foi o preço da casa: quem chega tem de aguentar ficar lá.",
      exemplo: {
        // A mesma posição do exemplo de `coluna-aberta`: a f é a única aberta,
        // e a torre de h1 é quem chega nela.
        fen: "r2qkbnr/ppp3pp/2n1p3/4p3/4P3/5N2/PPPP2PP/RNBQK2R w KQkq - 0 7",
        lado: "brancas",
        lances: ["h1f1"],
      },
      contraexemplo: {
        fen: "r5k1/p1pR2pp/1p6/8/8/8/PPP3PP/2K5 b - - 0 1",
        lado: "pretas",
        porque: "d, e e f estão todas abertas — o juiz não sabe qual coluna o enunciado pediu",
      },
    },
  },

  {
    id: "peao-na-semiaberta",
    dicas: ["m10"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const alvo = alvoDa("peao-na-semiaberta", fen, lado);
      if (alvo.length === 0) return [];
      return chegaNaColuna(fen, this.quemJoga(lado), "rq", alvo[0][0]);
    },
    contrato: {
      aplica:
        "que o aluno põe uma peça pesada na coluna em que só o adversário tem peão — a coluna que " +
        "leva ao alvo parado, que é o que a dica m10 ensina.",
      naoAutoriza:
        "concluir que o peão cairá. Ele pode estar defendido, e a torre não come o que está " +
        "defendido; pressionar é o lance, ganhar é outra conta.",
      lanceMultiplo: "qualquer peça pesada que chegue à coluna aplica o tema, venha de onde vier.",
      enunciado:
        "Nesta coluna você não tem peão e ele tem. Leve uma torre ou a dama para essa coluna.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: ele não põe peça pesada na coluna semiaberta.",
      custaCaro:
        "A ideia está certa — a peça pesada foi para a coluna do peão dele. O que faltou foi olhar quem defende a casa em que ela parou.",
      exemplo: {
        // d é a única semiaberta para as brancas, e o peão dele em d6 é o alvo.
        // As duas torres chegam a d1 — e as duas contam.
        fen: "r3r1k1/ppp2ppp/3p2n1/8/4P3/2N5/PPP2PPP/R4RK1 w - - 0 1",
        lado: "brancas",
        lances: ["a1d1", "f1d1"],
      },
      contraexemplo: {
        fen: "4k3/pp1p1p2/8/8/8/8/1P4P1/4K3 w - - 0 1",
        lado: "brancas",
        porque:
          "a, d e f são semiabertas para as brancas — três colunas, e nenhuma delas é a pedida",
      },
    },
  },

  {
    id: "torre-na-setima",
    dicas: ["m11"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      // O alvo é a fileira, e não a torre que a tarefa acha: o tema é **chegar**
      // à sétima, e a tarefa aponta quem já chegou.
      const setima = lado === "brancas" ? 7 : 2;
      return chegaNaFileira(fen, this.quemJoga(lado), "r", setima);
    },
    contrato: {
      aplica:
        "que o aluno leva uma torre à fileira onde moram os peões que nunca andaram — a invasão " +
        "que a dica m11 ensina.",
      naoAutoriza:
        "concluir que a torre ganha material ali. A dica é literalmente sobre a conta seguinte: " +
        "na sétima, confira alvo **e** defesa.",
      lanceMultiplo: "qualquer torre que chegue à sétima aplica o tema.",
      enunciado: "Leve uma torre para a fileira dos peões dele — a sétima.",
      foraDoTema: "Esse lance é legal, mas não é o da dica: nenhuma torre sua chegou à sétima.",
      custaCaro:
        "A sétima é o lugar certo para a torre, e ela chegou lá. Só que chegar não basta: nesta casa ela é capturada ou expulsa, e a invasão acaba antes de render.",
      exemplo: {
        fen: "2r3k1/p1p3pp/1p6/8/8/8/PPP3PP/2KR4 w - - 0 1",
        lado: "brancas",
        lances: ["d1d7"],
      },
      contraexemplo: {
        fen: "6k1/RR6/8/8/8/8/6PP/6K1 w - - 0 1",
        lado: "brancas",
        porque:
          "as duas torres já estão na sétima — o tema é chegar lá, e de dentro dela não há chegada",
      },
    },
  },

  {
    id: "peao-isolado",
    dicas: ["m12"],
    // O isolado é o **dele** (o `alvo` de m12 no MAPA), então quem joga é o outro.
    quemJoga: (lado) => OUTRO[lado],
    lances(fen, lado) {
      const alvo = alvoDa("peao-isolado", fen, lado);
      if (alvo.length === 0) return [];
      const frente = casaDe(coluna(alvo[0]), fileira(alvo[0]) + FRENTE[lado]);
      if (fileira(frente) < 1 || fileira(frente) > 8) return [];
      return chegaNaCasa(fen, this.quemJoga(lado), QUALQUER, frente);
    },
    contrato: {
      aplica:
        "que o aluno ocupa a casa bem na frente do peão isolado dele — a casa que o peão não " +
        "consegue disputar com outro peão, e por isso o alvo fica parado.",
      naoAutoriza:
        "concluir que o peão cai, nem que a peça está segura ali. Bloquear é o primeiro lance; " +
        "quem aguenta a casa é a conta seguinte.",
      lanceMultiplo:
        "cavalo, bispo, torre ou dama — qualquer peça que sente na casa da frente aplica o tema. " +
        "Qual delas é a melhor bloqueadora é julgamento, e a dica m16 é que o ensina.",
      enunciado: "O peão dele não tem vizinho. Ocupe a casa bem na frente dele.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: ele não põe peça nenhuma na frente do isolado.",
      custaCaro:
        "Bloquear o isolado é o plano certo, e esta peça bloqueia. O problema é quem paga a conta: a casa da frente também precisa ser sustentável para a peça que senta nela.",
      exemplo: {
        // O isolado é o d4 das brancas; quem joga é quem o bloqueia, e quatro
        // peças pretas chegam a d5.
        fen: "r2q1rk1/pb2bppp/1p2pn2/8/1nBP4/2N1BN2/PP2QPPP/R2R2K1 b - - 0 1",
        lado: "brancas",
        lances: ["b4d5", "b7d5", "d8d5", "f6d5"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/8/P1P1P3/4K3 b - - 0 1",
        lado: "brancas",
        porque: "a2, c2 e e2 são três isolados — três casas de bloqueio, e nenhuma é a pedida",
      },
    },
  },

  {
    id: "peao-dobrado",
    dicas: ["m13"],
    // A dobra é a **dele** (o `alvo` de m13 no MAPA).
    quemJoga: (lado) => OUTRO[lado],
    lances(fen, lado) {
      const alvo = alvoDa("peao-dobrado", fen, lado);
      if (alvo.length === 0) return [];
      return chegaNaColuna(fen, this.quemJoga(lado), "rq", alvo[0][0]);
    },
    contrato: {
      aplica:
        "que o aluno põe peça pesada na coluna dos dois peões dele — a coluna em que o alvo é " +
        "duplo e não anda em bloco.",
      naoAutoriza:
        "concluir que a dobra é desvantagem, nem que os peões caem. A dica m13 pede comparação, e " +
        "quase sempre a dobra veio com uma coluna aberta junto.",
      lanceMultiplo: "qualquer peça pesada que chegue à coluna aplica o tema.",
      enunciado: "Ele tem dois peões na mesma coluna. Leve uma torre ou a dama para essa coluna.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: ele não põe peça pesada na coluna dobrada.",
      custaCaro:
        "A coluna dos dois peões é o endereço certo, e este lance vai até lá. O que ele não olhou foi o que acontece com a peça depois de chegar.",
      exemplo: {
        // A dobra preta é na e (e5 e e6); quem joga são as brancas, e a dama de
        // d1 é quem chega à coluna.
        fen: "r2qkbnr/ppp3pp/2n1p3/4p3/4P3/5N2/PPPP2PP/RNBQK2R w KQkq - 0 7",
        lado: "pretas",
        lances: ["d1e2"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/P1P5/P1P5/4K3 b - - 0 1",
        lado: "brancas",
        porque: "as colunas a e c estão dobradas — duas colunas, e nenhuma delas é a pedida",
      },
    },
  },

  {
    id: "bispo-com-peoes-na-propria-cor",
    dicas: ["m14"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const alvo = alvoDa("bispo-com-peoes-na-propria-cor", fen, lado);
      if (alvo.length === 0) return [];
      const bispo = alvo[0];
      const cor = corDaCasa(bispo);
      const antes = peoesNaCor(fen, lado, cor);
      const aceitos: LanceUci[] = [];
      for (const m of legais(fen, lado)) {
        // A troca: o próprio bispo captura peça menor dele. Oferecer troca sem
        // capturar depende da resposta do adversário, e isso não é fato.
        if (m.from === bispo && m.captured && "nb".includes(m.captured)) {
          aceitos.push(uciDe(m));
          continue;
        }
        const jogo = new Chess(fen);
        jogo.move(m);
        if (peoesNaCor(jogo.fen(), lado, cor) < antes) aceitos.push(uciDe(m));
      }
      return aceitos.sort();
    },
    contrato: {
      aplica:
        "que o aluno faz uma das duas coisas que a dica m14 ensina: tira um peão seu da cor do " +
        "seu bispo, ou troca o bispo que a estrutura atrapalha.",
      naoAutoriza:
        'concluir que o bispo é ruim ou que a posição melhorou. "Bispo mau" é comparação, não ' +
        "decreto — e um peão que sai da cor do bispo pode deixar outra fraqueza atrás.",
      lanceMultiplo:
        "todo lance que reduz a conta aplica o tema, e a captura do bispo também. São vários " +
        "lances aceitáveis para a mesma ideia.",
      enunciado:
        "Seus peões atrapalham o seu bispo. Jogue um lance que tire um peão da cor dele — ou troque o bispo.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: depois dele o seu bispo continua com os mesmos " +
        "peões na frente.",
      custaCaro:
        "Tirar o peão da cor do bispo é a ideia da dica, e este lance tira. Só que peão não volta: o buraco que ele deixou atrás custa mais do que o bispo ganhou.",
      exemplo: {
        // O bispo de c1 anda em casas escuras, e b2, d4, f2 e h2 estão nelas.
        // Cada avanço para casa clara conta — e Bxg5 é a outra metade da dica.
        fen: "4k3/8/8/6n1/3P4/8/PP3PPP/2B1K3 w - - 0 1",
        lado: "brancas",
        lances: ["b2b3", "c1g5", "d4d5", "f2f3", "h2h3"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/8/PPP5/2B1KB2 w - - 0 1",
        lado: "brancas",
        porque:
          "três peões na cor do bispo é abaixo do piso — não há bispo a apontar, nem lance a pedir",
      },
    },
  },

  {
    id: "posto",
    dicas: ["m15"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const alvo = alvoDa("posto", fen, lado);
      if (alvo.length === 0) return [];
      return chegaNaCasa(fen, this.quemJoga(lado), "n", alvo[0]);
    },
    contrato: {
      aplica:
        "que o aluno instala o cavalo na casa que um peão seu defende e que peão dele nenhum " +
        "alcança — o segundo lance da dica m15, e o que ela pede de verdade.",
      naoAutoriza:
        "concluir que o cavalo ali ganha a partida. Ele não é expulso por peão; ainda pode ser " +
        "trocado, e a troca é a resposta normal do adversário.",
      lanceMultiplo: "qualquer cavalo que chegue ao posto aplica o tema.",
      enunciado:
        "Há uma casa que nenhum peão dele alcança e um peão seu defende. Leve um cavalo até ela.",
      foraDoTema: "Esse lance é legal, mas não é o da dica: nenhum cavalo seu ocupou o posto.",
      custaCaro:
        "O posto é a casa certa para o cavalo, e este lance o leva até lá. O que faltou foi a ordem: chegar agora custa material, e o posto continua lá no lance seguinte.",
      exemplo: {
        fen: "4k3/pp3ppp/8/2P2N2/1P6/8/5PPP/4K3 w - - 0 1",
        lado: "brancas",
        lances: ["f5d6"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/1P1P4/8/8/4K3 w - - 0 1",
        lado: "brancas",
        porque: "a5, c5 e e5 são três postos — três casas, e nenhuma delas é a pedida",
      },
    },
  },

  {
    id: "casa-de-bloqueio",
    dicas: ["m16"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const alvo = alvoDa("casa-de-bloqueio", fen, lado);
      if (alvo.length === 0) return [];
      return chegaNaCasa(fen, this.quemJoga(lado), QUALQUER, alvo[0]);
    },
    contrato: {
      aplica:
        "que o aluno senta uma peça na casa à frente do peão passado dele — o lance que para o " +
        "peão de vez, porque peão não pula.",
      naoAutoriza:
        "concluir que qualquer peça serve de bloqueador. A dica m16 diz o contrário: a boa é a " +
        "que continua fazendo outra coisa enquanto bloqueia.",
      lanceMultiplo: "qualquer peça que chegue à casa de bloqueio aplica o tema.",
      enunciado: "O peão dele já passou. Ponha uma peça bem na frente dele.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: o peão passado dele continua com a frente livre.",
      custaCaro:
        "Parar o peão passado é o plano certo, e esta peça o para. O preço é que ela fica presa ali — ou é capturada antes de bloquear coisa nenhuma.",
      exemplo: {
        fen: "3r3k/1b6/5n2/3p4/8/1N6/5B2/6K1 w - - 0 1",
        lado: "brancas",
        lances: ["b3d4", "f2d4"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/2p1p3/8/4K3 w - - 0 1",
        lado: "brancas",
        porque: "c3 e e3 são dois passados — duas casas de bloqueio, e nenhuma delas é a pedida",
      },
    },
  },
];

export const juizPorId = (id: string): JuizDeLance | undefined => JUIZES.find((j) => j.id === id);

/** O juiz de uma dica, ou `undefined` quando ela ainda não tem lance escrito. */
export const juizDaDica = (dica: string): JuizDeLance | undefined =>
  JUIZES.find((j) => j.dicas.includes(dica));

/** As dicas do `MAPA` que já têm juiz de lance. */
export const dicasComLance = (): string[] =>
  MAPA.filter((n) => juizDaDica(n.dica) !== undefined).map((n) => n.dica);

/**
 * Os lances que aplicam o tema, em UCI e ordenados — ou vazio.
 *
 * Vazio quer dizer três coisas, e o chamador não precisa distingui-las: a
 * posição não tem o traço (ou o tem duas vezes), não é a vez de quem deveria
 * jogar, ou ninguém consegue chegar ao alvo. Nos três casos a posição não vira
 * item, e é por isso que a mesma resposta serve.
 */
export function lancesQueAplicam(fen: string, tarefa: string, lado: Lado): LanceUci[] {
  const juiz = juizPorId(tarefa);
  if (!juiz) return [];
  return juiz.lances(fen, lado);
}
