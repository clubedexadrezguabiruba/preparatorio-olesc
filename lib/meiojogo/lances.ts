import { Chess, type Move, type Square } from "chess.js";
import { casasEntre, corDaCasa } from "./afirmacoes.ts";
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
  /**
   * O id do juiz.
   *
   * Nos oito primeiros ele é o id da tarefa de `exercicios.ts` de onde sai o
   * alvo. Nos seis de m1 a m8 não há tarefa por trás — o lance **é** a forma
   * natural do tema — e o id nomeia o tema direto (`roque`, `torres-ligadas`).
   * O gate cobra a correspondência só quando o MAPA dá tarefa à dica.
   */
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

/** As quatro casas do meio — as que a dica m3 manda mirar. */
const CENTRO = ["d4", "d5", "e4", "e5"] as const;

/** Quantas das quatro casas do meio as **peças** de um lado miram. */
function centroMirado(fen: string, lado: Lado): number {
  const jogo = new Chess(fen);
  let quantas = 0;
  for (const casa of CENTRO) {
    const mira = jogo
      .attackers(casa as Square, COR[lado])
      // Peça, e não peão: a dica m3 diz que controlar o centro não é ter peão
      // lá. O rei também fica de fora — ele controla casa do meio no final, e
      // no meio-jogo levá-lo para lá é o contrário de m2.
      .some((de) => "nbrq".includes(jogo.get(de as Square)?.type ?? ""));
    if (mira) quantas += 1;
  }
  return quantas;
}

/**
 * As duas torres de um lado se defendem — nada entre elas numa linha comum.
 *
 * Falso quando o lado não tem exatamente duas torres: com uma só não há o que
 * ligar, e com três (promoção) a dica deixa de descrever a posição.
 */
function ligadas(fen: string, lado: Lado): boolean {
  const jogo = new Chess(fen);
  const torres: Square[] = [];
  for (const fileiraDoTabuleiro of jogo.board()) {
    for (const casa of fileiraDoTabuleiro) {
      if (casa?.type === "r" && casa.color === COR[lado]) torres.push(casa.square);
    }
  }
  if (torres.length !== 2) return false;
  const caminho = casasEntre(torres[0], torres[1]);
  if (caminho === null) return false; // não estão na mesma linha
  return caminho.every((casa) => jogo.get(casa) === undefined);
}

/**
 * As peças **dele** que atacam alguma peça sua de valor igual ou maior.
 *
 * É a leitura de máquina de "a peça dele que está te incomodando" (m8): um
 * cavalo que ataca a sua torre incomoda; um que ataca o seu peão é troca de
 * peão por cavalo, e ninguém chama isso de incômodo. O rei fica fora dos dois
 * lados — ele não se troca, e ser atacado por ele é xeque, que é outra coisa.
 */
function quemAmeaca(fen: string, lado: Lado): Square[] {
  const jogo = new Chess(fen);
  const valor: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const ameacam = new Set<Square>();
  for (const fileiraDoTabuleiro of jogo.board()) {
    for (const casa of fileiraDoTabuleiro) {
      if (casa === null || casa.color !== COR[lado] || !"nbrq".includes(casa.type)) continue;
      for (const de of jogo.attackers(casa.square, COR[OUTRO[lado]])) {
        const atacante = jogo.get(de as Square);
        if (!atacante || !"nbrq".includes(atacante.type)) continue;
        if ((valor[atacante.type] ?? 0) <= (valor[casa.type] ?? 0)) ameacam.add(de as Square);
      }
    }
  }
  return [...ameacam].sort();
}



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

  /* ---------------------------------------------------------------- *
   * Os seis de m1 a m8 (§1.1 do plano)
   *
   * Estes não vêm de tarefa de `exercicios.ts`, e é por isso que eles têm
   * `tarefa: null`: o lance **é** a forma natural do tema, e não a consequência
   * de um traço que já existisse no tabuleiro. Rocar, ligar as torres e tirar
   * uma peça da casa de origem são fatos de regra, não julgamento — e a
   * `chess.js` os nomeia sozinha.
   *
   * Duas das oito dicas ficam **sem exercício**, e a decisão é declarada:
   *
   * - **m5** é uma regra negativa. "Não mexa nos peões da frente do seu rei sem
   *   motivo" não tem lance que a aplique — tem lances que a violam. O
   *   exercício honesto ali seria escolher entre dois lances, e escolher entre
   *   alternativas é o quiz que o Doug mandou tirar em 2026-09-07.
   * - **m7** é profilaxia: a ameaça tapada do adversário depende do que ele
   *   quer jogar, e isso é julgamento. A proposta do plano — "qual peça dele
   *   está mirando a sua casa fraca" — é um exercício de **clique**, e a mesma
   *   decisão o descartou.
   *
   * As duas continuam no ar com a explicação, sem exercício, e o gate imprime o
   * número: dizer "6 de 8" é melhor do que o site fingir que todo tema tem
   * prática.
   * ---------------------------------------------------------------- */

  {
    id: "peca-na-casa-de-origem",
    dicas: ["m1"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      // O alvo é a peça que ainda está onde nasceu; o lance é ela **sair da
      // primeira fileira**, e não só sair da casa.
      //
      // As duas restrições vieram de medir os 40 candidatos que o funil achou:
      //
      // - **fora da primeira fileira.** Trinta e três dos quarenta resolviam
      //   com a torre andando de a1 para b1, e o próprio "o que procurar" da
      //   dica pergunta *quantas peças suas já saíram da primeira fileira*.
      //   Torre que anda dentro dela não saiu — ela mudou de casa.
      // - **o rei não conta.** Ele é peça na casa de origem como as outras, e
      //   levá-lo para o meio do tabuleiro é o contrário do que a dica m2
      //   acabou de ensinar. Um exercício cuja resposta é Re8-d7 no meio-jogo
      //   ensinaria a perder a partida.
      const alvo = alvoDa("peca-na-casa-de-origem", fen, lado);
      if (alvo.length === 0) return [];
      const quem = this.quemJoga(lado);
      const jogo = new Chess(fen);
      if (jogo.get(alvo[0] as Square)?.type === "k") return [];
      const casa1 = quem === "brancas" ? 1 : 8;
      return legais(fen, quem)
        .filter((m) => m.from === alvo[0] && fileira(m.to) !== casa1)
        .map(uciDe)
        .sort();
    },
    contrato: {
      aplica:
        "que o aluno tira do lugar a peça que ainda está na casa onde ela nasceu — que é a única " +
        "coisa que a dica m1 manda fazer, e a que ele mais esquece de fazer.",
      naoAutoriza:
        "concluir que a casa de chegada é a melhor para ela. Sair é o assunto da dica; para onde " +
        "ir é a conta seguinte, e a dica m17 é que a ensina.",
      lanceMultiplo:
        "qualquer casa para onde a peça parada vá conta. O tema é ela sair, e não o destino — " +
        "recusar um destino aqui seria cobrar m17 no exercício de m1.",
      enunciado: "Uma peça sua ainda está na casa onde começou a partida. Ponha-a para jogar.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: ele mexe numa peça que já estava trabalhando.",
      custaCaro:
        "Desenvolver é o padrão certo, e essa peça precisava mesmo sair. O que faltou foi a casa: " +
        "ali ela sai de casa e entra num problema.",
      exemplo: {
        // Das oito peças de origem das brancas só a torre de a1 continua onde
        // nasceu, e é ela que a dica manda mexer.
        // A torre de a1 é a única peça branca ainda na casa em que nasceu, e a
        // coluna a é o caminho dela para fora da primeira fileira.
        fen: "r3r1k1/1pp2ppp/3p2n1/8/4P3/2N5/1PP2PPP/R2R2K1 w - - 0 1",
        lado: "brancas",
        lances: ["a1a2", "a1a3", "a1a4", "a1a5", "a1a6", "a1a7", "a1a8"],
      },
      contraexemplo: {
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4",
        lado: "brancas",
        porque: "seis peças brancas continuam nas casas de origem — a pergunta teria seis respostas",
      },
    },
  },

  {
    id: "roque",
    dicas: ["m2"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      // O único juiz do módulo que não precisa de alvo nenhum: a `chess.js` já
      // nomeia o roque na bandeira do lance, e roque é roque.
      return legais(fen, this.quemJoga(lado))
        .filter((m) => m.flags.includes("k") || m.flags.includes("q"))
        .map(uciDe)
        .sort();
    },
    contrato: {
      aplica:
        "que o aluno roca — que é o lance que a dica m2 ensina, e o que ela chama de duas coisas " +
        "num lance só: o rei sai da coluna do meio e a torre entra no jogo.",
      naoAutoriza:
        "concluir que o lado escolhido é o certo, nem que era a hora. Rocar cedo é quase sempre " +
        "bom e não é sempre; qual dos dois lados é a conta que a dica não faz.",
      lanceMultiplo:
        "os dois roques contam quando os dois são legais. Escolher entre curto e longo é " +
        "julgamento, e este exercício não o cobra.",
      enunciado: "O seu rei ainda está no meio. Roque.",
      foraDoTema: "Esse lance é legal, mas não é o da dica: o seu rei continua na coluna do meio.",
      custaCaro:
        "Rocar é o padrão certo e esse roque o cumpre. O que ele não conferiu foi o que está " +
        "esperando o rei do outro lado — abrigo com buraco não é abrigo.",
      exemplo: {
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5",
        lado: "brancas",
        lances: ["e1g1"],
      },
      contraexemplo: {
        fen: "r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R4RK1 w kq - 6 9",
        lado: "brancas",
        porque: "as brancas já rocaram — não há roque a jogar, e a posição não serve",
      },
    },
  },

  {
    id: "peca-no-centro",
    dicas: ["m3"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const quem = this.quemJoga(lado);
      const antes = centroMirado(fen, quem);
      const aceitos: LanceUci[] = [];
      for (const m of legais(fen, quem)) {
        // Peça, e não peão: a dica m3 diz com todas as letras que controlar o
        // centro não é ter peão lá. O rei fica de fora porque levá-lo ao centro
        // no meio-jogo é o contrário do que m2 acabou de ensinar.
        if (!"nbrq".includes(m.piece)) continue;
        const jogo = new Chess(fen);
        jogo.move(m);
        if (centroMirado(jogo.fen(), quem) > antes) aceitos.push(uciDe(m));
      }
      return aceitos.sort();
    },
    contrato: {
      aplica:
        "que o aluno põe uma peça a mirar uma das quatro casas do meio que ela não mirava antes — " +
        "que é o que a dica m3 chama de disputar o centro com peça.",
      naoAutoriza:
        "concluir que ele controla o centro. Mirar é uma casa a mais na conta; quem controla é " +
        "quem tem mais peças mirando, e essa comparação a dica não pede aqui.",
      lanceMultiplo:
        "todo lance de peça que aumenta a conta conta. São vários, e é assim que a dica é: ela " +
        "descreve uma direção, e não um lance.",
      enunciado: "Ponha uma peça sua a mirar uma casa do meio que ela ainda não alcança.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: depois dele as suas peças miram as mesmas casas " +
        "do meio de antes.",
      custaCaro:
        "Disputar o centro com peça é o padrão certo, e este lance o cumpre. O que ele não " +
        "conferiu foi se a peça sobrevive na casa em que parou.",
      exemplo: {
        // Depois de 1.e4 e5, o cavalo de g1 é a peça que passa a mirar o centro.
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        lado: "brancas",
        lances: ["b1c3", "d1e2", "d1f3", "d1g4", "d1h5", "f1c4", "f1d3", "g1e2", "g1f3"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
        lado: "brancas",
        porque: "não há peça nenhuma no tabuleiro para mirar o centro — só os dois reis",
      },
    },
  },

  {
    id: "segunda-peca-no-alvo",
    dicas: ["m4"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const quem = this.quemJoga(lado);
      const jogo = new Chess(fen);
      // Os alvos são as peças **dele**: reunir peças é reunir sobre alguma
      // coisa, e uma casa vazia não é alvo de ataque, é casa de manobra.
      // Só os alvos que hoje têm **exatamente um** atacante seu interessam: é
      // deles que a segunda peça faz diferença, e filtrar aqui poupa uma
      // varredura por lance. Medido no funil: sem este corte a porta geométrica
      // levava horas em 80 mil puzzles.
      const alvos: Square[] = [];
      for (const fileiraDoTabuleiro of jogo.board()) {
        for (const casa of fileiraDoTabuleiro) {
          if (casa === null || casa.color !== COR[OUTRO[quem]]) continue;
          if (jogo.attackers(casa.square, COR[quem]).length === 1) alvos.push(casa.square);
        }
      }
      if (alvos.length === 0) return [];

      const aceitos: LanceUci[] = [];
      for (const m of legais(fen, quem)) {
        // Um `Chess` por lance, e não um por alvo: o `attackers` roda sobre o
        // mesmo tabuleiro montado, quantas vezes for preciso.
        const depois = new Chess(fen);
        depois.move(m);
        for (const alvo of alvos) {
          // A peça capturada some do tabuleiro e não é mais alvo de ninguém.
          if (m.to === alvo) continue;
          if (depois.attackers(alvo, COR[quem]).length >= 2) {
            aceitos.push(uciDe(m));
            break;
          }
        }
      }
      return aceitos.sort();
    },
    contrato: {
      aplica:
        "que o aluno põe a **segunda** peça a atacar a mesma peça dele — que é o que a dica m4 " +
        "chama de reunir antes de atacar.",
      naoAutoriza:
        "concluir que o alvo cai. Duas peças atacando é uma pergunta, e a resposta depende de " +
        "quantas defendem — a conta de atacantes e defensores é a dica m11.",
      lanceMultiplo:
        "todo lance que leve a segunda peça ao mesmo alvo conta, e alvos diferentes também. O " +
        "tema é a soma, e não o alvo escolhido.",
      enunciado: "Uma peça sua já ataca uma peça dele. Traga a segunda para o mesmo alvo.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: depois dele nenhuma peça dele passou a ter dois " +
        "atacantes seus.",
      custaCaro:
        "Somar a segunda peça no alvo é o padrão certo, e este lance soma. O que ele não " +
        "conferiu foi o preço da casa em que a segunda peça parou.",
      exemplo: {
        // Só a torre de d1 ataca o peão preto de d5; a dama de d2 é a segunda,
        // e chega por d3 ou d4.
        fen: "4k3/pp3ppp/8/3p4/8/8/PP1Q1PPP/3RK3 w - - 0 1",
        lado: "brancas",
        // A dama sai da frente e a torre de d1 passa a ser a segunda peça
        // atacando o peão preto de d5 — que é o gesto que a dica descreve.
        lances: ["d2a5", "d2g5"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
        lado: "brancas",
        porque: "não há peça dele no tabuleiro além do rei, e rei não é alvo de ataque somado",
      },
    },
  },

  {
    id: "torres-ligadas",
    dicas: ["m6"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const quem = this.quemJoga(lado);
      if (ligadas(fen, quem)) return []; // já estão ligadas: a posição não pergunta nada
      const aceitos: LanceUci[] = [];
      for (const m of legais(fen, quem)) {
        // O roque **liga as torres** e mesmo assim não conta aqui: ele é o
        // lance da dica m2, e um exercício de m6 cuja resposta é "roque"
        // ensinaria o aluno a etiquetar o mesmo lance com dois nomes.
        if (m.flags.includes("k") || m.flags.includes("q")) continue;
        const jogo = new Chess(fen);
        jogo.move(m);
        if (ligadas(jogo.fen(), quem)) aceitos.push(uciDe(m));
      }
      return aceitos.sort();
    },
    contrato: {
      aplica:
        "que o aluno tira a última peça de entre as duas torres — depois deste lance elas se " +
        "defendem sozinhas, que é o que a dica m6 chama de dar trabalho às duas.",
      naoAutoriza:
        "concluir que as torres estão ativas. Ligadas quer dizer que uma defende a outra; se elas " +
        "têm coluna por onde entrar é a dica m9, e é outra pergunta.",
      lanceMultiplo:
        "qualquer lance que esvazie o caminho entre elas conta — e às vezes é a torre que se " +
        "mexe, e não a peça do meio.",
      enunciado: "Suas duas torres não se enxergam. Tire o que está entre elas.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: depois dele ainda há peça entre as suas torres.",
      custaCaro:
        "Ligar as torres é o padrão certo, e este lance as liga. O que ele não conferiu foi para " +
        "onde a peça do meio foi — ela saiu do caminho e entrou num problema.",
      exemplo: {
        // As torres estão em a1 e e1, e só o bispo de c1 as separa. O rei já
        // rocou e está fora do caminho — se ele estivesse entre elas, o único
        // lance que as ligaria seria o roque, e o roque é da dica m2.
        fen: "6k1/8/8/8/8/8/PPP2PPP/R1B1R1K1 w - - 0 1",
        lado: "brancas",
        lances: ["c1d2", "c1e3", "c1f4", "c1g5", "c1h6"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/8/PPPPPPPP/R3K2R w KQ - 0 1",
        lado: "brancas",
        porque:
          "só o rei está entre as torres, e o único jeito de tirá-lo dali é rocar — que é o lance " +
          "da dica m2, e este juiz não o aceita",
      },
    },
  },

  {
    id: "trocar-o-atacante",
    dicas: ["m8"],
    quemJoga: (lado) => lado,
    lances(fen, lado) {
      const quem = this.quemJoga(lado);
      const incomoda = quemAmeaca(fen, quem);
      // Uma peça dele incomodando, e uma só. Duas tornam a posição inutilizável
      // pela mesma razão de sempre: o enunciado teria duas respostas certas.
      if (incomoda.length !== 1) return [];
      return legais(fen, quem)
        .filter((m) => m.to === incomoda[0])
        .map(uciDe)
        .sort();
    },
    contrato: {
      aplica:
        "que o aluno tira do tabuleiro a peça dele que estava incomodando — que é o que a dica m8 " +
        "manda trocar, e não uma peça qualquer.",
      naoAutoriza:
        "concluir que a troca é boa em geral. A dica é condicional: trocar joga a seu favor **com " +
        "material a mais**, e é a peça que incomoda que tem de sair.",
      lanceMultiplo: "qualquer peça sua que capture a que incomoda aplica o tema.",
      enunciado: "Uma peça dele está incomodando as suas. Tire-a do tabuleiro.",
      foraDoTema:
        "Esse lance é legal, mas não é o da dica: a peça dele que incomodava continua no jogo.",
      custaCaro:
        "Trocar quem incomoda é o padrão certo, e esta captura o faz. O que ela não conferiu foi " +
        "a recaptura: a peça que tomou vale mais do que a que ela tomou.",
      exemplo: {
        // O cavalo preto de d4 é a única peça dele atacando peça branca de
        // valor igual ou maior — a torre de c2. Duas peças brancas o capturam.
        fen: "4k3/8/8/8/3n4/2P5/2R5/3QK3 w - - 0 1",
        lado: "brancas",
        lances: ["c3d4", "d1d4"],
      },
      contraexemplo: {
        fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
        lado: "brancas",
        porque: "não há peça dele incomodando nenhuma sua — não há o que trocar",
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
