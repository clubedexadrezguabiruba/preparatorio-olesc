import { applyUci } from "../chess/fen.ts";
import { RESPOSTA_MS, VOLTA_MS } from "../tatica/tempos.ts";
import type { Linha } from "./linhas.ts";
import { sanEmPortugues, semQuebras, vereditoDoLance } from "./treino.ts";

/**
 * Uma passada pela linha, como máquina de estado pura.
 *
 * ## Por que ela saiu do componente
 *
 * `Treino.tsx` tinha 872 linhas, e a passada era a parte arriscada: fase,
 * posição, erros e três relógios conversando por `ref`, com **zero testes** —
 * `treino.test.ts` cobria só as funções puras do juiz. Quando o treinador
 * ganhou uma segunda fase, manter as duas "no mesmo arquivo" produziria mil e
 * cem linhas com um `if (assistido)` dentro de cada função.
 *
 * Aqui é `estado + evento → estado + efeitos`. Não há React, não há relógio e
 * não há tabuleiro: quem agenda os `setTimeout` e desenha é a casca em
 * `app/aberturas/[cor]/[abertura]/Passada.tsx`, e ela só sabe interpretar a
 * lista de efeitos. É o mesmo princípio que o projeto já aplicou ao motor e à
 * aritmética do progresso — a regra num arquivo testável, a moldura fora.
 *
 * ## As três etapas
 *
 * Eram duas até 8/9/2026 — assistida e quiz —, e o aluno pulava da mão dada
 * direto para a prova. A etapa do meio é o lugar de praticar **sem a seta e
 * sem estar sendo medido**.
 *
 * **Assistida**: o cartão diz o lance por extenso, a seta fica desenhada, e o
 * aluno **executa**. Outro lance não conta — nem uma `alternativa` marcada
 * pelo autor, porque aqui a seta é a lei. Onde há comentário do professor a
 * passada trava até o aluno continuar, inclusive nos comentários que caem em
 * lance do adversário. É a única etapa em que se pode olhar para trás (ver
 * `olhou`).
 *
 * **Treino**: sem seta, sem comentário, e sem nota. Errar **recusa** em vez de
 * punir: a peça volta, nada é contado, e o aluno refaz o mesmo lance. Sem
 * isso ela seria o quiz repetido — as duas são "sem seta, sem comentário", e
 * as únicas outras diferenças (ajuda de graça, nada gravado) são invisíveis
 * para quem está jogando. A dica é de graça pelo mesmo motivo.
 *
 * **Quiz**: valendo. O primeiro erro decide a passada na hora — é a regra que
 * protege a verdade gravada contra a aba fechada no meio — e a passada
 * **para ali**: a peça volta, o lance do clube entra, o comentário dele
 * aparece, e a linha recomeça do zero (é o que o Move Trainer do chess.com
 * faz). Até 8/9 o quiz seguia até o fim depois do erro, para o boletim sair
 * completo; a troca custa o boletim das passadas com erro e compra o que
 * importa mais — o aluno relê o lance certo no instante em que errou, e não
 * cinco lances depois.
 *
 * ## O que sobe ao servidor
 *
 * **Só o quiz grava, e só por `gravar`.** Antes a assistida não gravava por
 * acidente de caminho — ela simplesmente não chegava aos ramos que emitiam
 * `decidir`. Com três etapas isso não basta: um ramo esquecido gravaria o
 * treino como prova, e a escada de revisão espaçada contaria três dias de
 * memória onde houve uma tarde de tentativas. As três etapas são **uma**
 * passada; a linha só fica aprendida com três passadas em três dias, e nada
 * aqui muda isso.
 */

/* ------------------------------------------------------------------ *
 * Os tipos
 * ------------------------------------------------------------------ */

export type Modo = "assistido" | "treino" | "quiz";

export type Fase =
  /** A vez do aluno, ou a espera do lance do adversário. */
  | "jogando"
  /** Travado num comentário do professor. Só a etapa assistida entra aqui. */
  | "lendo"
  /** A peça voltou, e o tabuleiro está dizendo alguma coisa antes de seguir. */
  | "mostrando"
  /**
   * O aluno recuou para olhar um meio-lance anterior. O tabuleiro não aceita
   * lance, e a frente da passada espera em `olhando`. Só a assistida entra.
   */
  | "olhando"
  /** A linha acabou — ou, no quiz, o erro a parou. */
  | "resolvido";

/** O que aconteceu com um lance nosso. É o que a fita do boletim desenha. */
export type Selo = "acerto" | "alternativa" | "falha";

export type Tom = "calma" | "bom" | "aviso" | "ruim";

/**
 * O cartão de comando: duas linhas, sempre no mesmo lugar.
 *
 * `comando` é o que fazer, em negrito; `estado` é onde a passada está. A
 * separação não é enfeite — é o que deixa o aluno achar a instrução sem ler a
 * tela inteira, que é o trabalho que o cartão branco do chess.com faz e que o
 * nosso balão de recado não fazia.
 */
export type Cartao = {
  readonly comando: string;
  readonly estado: string;
  readonly tom: Tom;
};

export type EstadoDaPassada = {
  readonly modo: Modo;
  readonly fen: string;
  /**
   * O meio-lance da vez, indexando `linha.lances`. É a **frente** da passada
   * mesmo enquanto o aluno olha para trás — o que está na tela nessa hora é
   * `olhando.meioLance`.
   */
  readonly passo: number;
  readonly fase: Fase;
  readonly ultimoLance: readonly [string, string] | null;
  /** Os lances **do aluno**, na ordem de `meus`. É o que vai ao servidor. */
  readonly jogados: readonly string[];
  /** Um selo por lance nosso, na ordem de `meus`; nulo é "ainda não chegou lá". */
  readonly boletim: readonly (Selo | null)[];
  /** Em que meio-lance a casa da dica está acesa, se alguma. */
  readonly dicaNoPasso: number | null;
  /** A dica já foi pedida nesta passada — o que decide se ela custa. */
  readonly dicaPedida: boolean;
  /** O erro que **contou**. A recusa do treino e da assistida não acende isto. */
  readonly errou: boolean;
  /** A passada já foi mandada ao servidor. Uma gravação por passada. */
  readonly decidido: boolean;
  /** O lance da linha que entra quando a espera acabar. */
  readonly pendente: { readonly noTabuleiro: string; readonly doAluno: string } | null;
  /** O texto do professor a mostrar agora, já sem as quebras do PGN. */
  readonly comentario: string | null;
  readonly cartao: Cartao;
  /**
   * Sobe a cada peça que volta. O chessground já moveu a peça na tela por
   * conta própria, e a FEN não mudou — sem este número ele não ressincroniza.
   */
  readonly revisao: number;
  /**
   * O lance certo, revelado no erro do quiz: em que meio-lance o aluno errou e
   * o que a linha jogava ali, em UCI para a seta e em português para o texto.
   * É o que deixa a tela dizer "errou aqui, o certo era este" sem reler a
   * linha. Nulo fora do quiz e enquanto não houve erro.
   */
  readonly revelado: { readonly passo: number; readonly uci: string; readonly san: string } | null;
  /**
   * Onde o aluno está olhando, enquanto olha para trás. `meioLance` é quantos
   * meios-lances estão no tabuleiro (0 é a posição inicial); `deVolta` é a
   * fase em que a frente ficou esperando. Nulo quando ele está na frente.
   */
  readonly olhando: { readonly meioLance: number; readonly deVolta: Fase } | null;
};

export type Evento =
  /** O aluno soltou uma peça. */
  | { readonly tipo: "jogou"; readonly uci: string }
  /** O relógio do lance automático do adversário venceu. */
  | { readonly tipo: "adversarioJogou" }
  /** O botão (ou a tecla →), e também o relógio que fecha a fase "mostrando". */
  | { readonly tipo: "continuar" }
  /** O botão "Dica". */
  | { readonly tipo: "pediuDica" }
  /** As setas ← e → da assistida: olhar um meio-lance para trás, ou voltar. */
  | { readonly tipo: "olhou"; readonly para: "tras" | "frente" };

export type Efeito =
  | { readonly tipo: "som-lance"; readonly captura: boolean; readonly xeque: boolean }
  | { readonly tipo: "som-recusa" }
  | { readonly tipo: "som-premio" }
  /** O disco transitório na casa de destino, que carrega o veredito. */
  | { readonly tipo: "selo"; readonly casa: string; readonly qual: Selo }
  /**
   * Manda os lances ao servidor. Acontece **uma vez** por passada, e só no
   * quiz — é `gravar` quem o emite, e ninguém mais.
   *
   * O `porQue` não muda nada do que é gravado — o servidor julga os lances e
   * mais nada. Ele existe para a **tela** poder contar a verdade no fim: uma
   * passada decidida pela dica tem oito selos verdes e não conta como acerto,
   * e dizer ali "houve um erro no caminho" seria mentir para o aluno sobre o
   * que ele acabou de fazer.
   */
  | {
      readonly tipo: "decidir";
      readonly lances: readonly string[];
      readonly porQue: "erro" | "dica" | "fim";
    }
  | { readonly tipo: "agendar"; readonly evento: Evento; readonly ms: number }
  /** A linha acabou, ou o erro do quiz a parou: o painel de fim entra. */
  | { readonly tipo: "terminou" };

export type Passo = { readonly estado: EstadoDaPassada; readonly efeitos: readonly Efeito[] };

/* ------------------------------------------------------------------ *
 * O cartão em repouso
 * ------------------------------------------------------------------ */

function comentarioDe(linha: Linha, passo: number): string | null {
  const texto = linha.comentarios[String(passo)];
  return texto?.trim() ? semQuebras(texto) : null;
}

function minhaVez(linha: Linha, passo: number): boolean {
  return linha.meus.includes(passo);
}

/**
 * O cartão de quando nada acabou de acontecer — a instrução da vez.
 *
 * Os cartões de veredito (erro, alternativa, "siga a seta", dica, o limite da
 * navegação) são escritos no lugar onde o evento é tratado, e não aqui: eles
 * dizem o que **acabou de** acontecer, que é informação que o estado sozinho
 * não tem.
 */
function emRepouso(linha: Linha, estado: EstadoDaPassada): Cartao {
  const { modo, passo, fase } = estado;

  if (fase === "resolvido") {
    if (estado.revelado) {
      return {
        comando: "Parou aqui",
        estado: `A linha joga ${estado.revelado.san}. De novo, do começo.`,
        tom: "ruim",
      };
    }
    // Sem "muito bom": um aluno de 14 anos fareja elogio de máquina, e
    // seguir setas não é ter aprendido nada ainda.
    if (modo === "assistido") return { comando: "Pronto.", estado: "Agora sem a seta.", tom: "bom" };
    if (modo === "treino") return { comando: "Pronto.", estado: "Agora valendo.", tom: "bom" };
    return { comando: "Linha completa", estado: "", tom: "bom" };
  }

  if (fase === "lendo") {
    return {
      comando: "Leia o comentário",
      estado: "Continue quando estiver pronto.",
      tom: "calma",
    };
  }

  if (!minhaVez(linha, passo)) {
    return passo === 0
      ? { comando: "Ele começa", estado: "Olhe o primeiro lance.", tom: "calma" }
      : { comando: "Veja a resposta dele", estado: "Ele joga sozinho.", tom: "calma" };
  }

  if (modo === "assistido") {
    return {
      comando: `Jogue ${sanEmPortugues(linha.sans[passo])}`,
      estado: "Siga a seta.",
      tom: "calma",
    };
  }

  // Treino e quiz são iguais no tabuleiro — sem seta, sem comentário —, e o
  // cartão é o único lugar em que a diferença chega ao aluno: "não conta" de
  // um lado, "valendo" do outro.
  const qual = linha.meus.indexOf(passo) + 1;
  return modo === "treino"
    ? {
        comando: "Jogue o lance certo",
        estado: `Lance ${qual} de ${linha.meus.length}. Errar aqui não conta.`,
        tom: "calma",
      }
    : {
        comando: "Jogue o lance certo",
        estado: `Lance ${qual} de ${linha.meus.length}, valendo.`,
        tom: "calma",
      };
}

/* ------------------------------------------------------------------ *
 * O começo
 * ------------------------------------------------------------------ */

export function inicio(linha: Linha, modo: Modo): EstadoDaPassada {
  const cru: EstadoDaPassada = {
    modo,
    fen: linha.fenInicial,
    passo: 0,
    fase: "jogando",
    ultimoLance: null,
    jogados: [],
    boletim: linha.meus.map(() => null),
    dicaNoPasso: null,
    dicaPedida: false,
    errou: false,
    decidido: false,
    pendente: null,
    comentario: null,
    cartao: { comando: "", estado: "", tom: "calma" },
    revisao: 0,
    revelado: null,
    olhando: null,
  };
  return { ...cru, cartao: emRepouso(linha, cru) };
}

/* ------------------------------------------------------------------ *
 * O portão do servidor
 * ------------------------------------------------------------------ */

const parado = (estado: EstadoDaPassada): Passo => ({ estado, efeitos: [] });

/**
 * **O único lugar do arquivo que emite `decidir`.**
 *
 * Duas guardas, e as duas têm de morar aqui e não em quem chama. A do modo é
 * a garantia mais importante do bloco: um `decidir` que escape da assistida
 * ou do treino grava uma passada de aprendizagem como se fosse prova, e a
 * escada de revisão espaçada — que só sobe em linha vencida, um degrau por
 * dia — passa a contar dias que não existiram. A do `decidido` é a de sempre:
 * uma gravação por passada, mesmo quando o erro e o fim caem na mesma.
 *
 * Fora do quiz devolve o estado intacto, sem efeito nenhum: quem chama não
 * precisa perguntar o modo antes, e é por isso que não há `if (quiz)` em volta
 * de nenhuma chamada.
 */
function gravar(
  estado: EstadoDaPassada,
  lances: readonly string[],
  porQue: "erro" | "dica" | "fim",
): Passo {
  if (estado.modo !== "quiz" || estado.decidido) return parado(estado);
  return {
    estado: { ...estado, decidido: true },
    efeitos: [{ tipo: "decidir", lances, porQue }],
  };
}

/* ------------------------------------------------------------------ *
 * A conta de dentro: aplicar um lance
 * ------------------------------------------------------------------ */

function marcar(estado: EstadoDaPassada, k: number, selo: Selo): EstadoDaPassada {
  // A **primeira** tentativa de cada lance é a que conta. Hoje o quiz só dá uma
  // por lance — errar para a passada —, e a guarda é o que mantém isso verdade
  // se alguém devolver a repetição um dia.
  if (k < 0 || estado.boletim[k] !== null) return estado;
  const boletim = [...estado.boletim];
  boletim[k] = selo;
  return { ...estado, boletim };
}

function somDe(depois: NonNullable<ReturnType<typeof applyUci>>): Efeito {
  const lance = depois.game.history({ verbose: true }).at(-1);
  return { tipo: "som-lance", captura: Boolean(lance?.captured), xeque: depois.game.inCheck() };
}

const casas = (uci: string): readonly [string, string] => [uci.slice(0, 2), uci.slice(2, 4)];

/**
 * Põe um lance no tabuleiro e segue a linha.
 *
 * O lance que anda no tabuleiro pode ser **diferente** do que o aluno jogou: é
 * o caso da alternativa. O que se está decorando é a linha, e deixar duas
 * posições conviverem faria o aluno chegar ao lance seguinte com o tabuleiro
 * que ele inventou. Quem vai ao servidor é sempre `doAluno`.
 */
function aplicar(
  linha: Linha,
  estado: EstadoDaPassada,
  noTabuleiro: string,
  doAluno: string,
): Passo {
  const depois = applyUci(estado.fen, noTabuleiro);
  // Lance ilegal aqui é impossível por construção — o compilador do repertório
  // valida a linha inteira —, e engolir é melhor que travar a tela do aluno.
  if (!depois) return parado(estado);

  const passo = estado.passo;
  const acabou = passo + 1 >= linha.lances.length;
  const comentario = comentarioDe(linha, passo);
  const som = somDe(depois);

  const andou: EstadoDaPassada = {
    ...estado,
    fen: depois.fen,
    ultimoLance: casas(noTabuleiro),
    jogados: [...estado.jogados, doAluno],
    passo: passo + 1,
    pendente: null,
    dicaNoPasso: null,
    // Nas etapas de memória o comentário não aparece — nem sem travar, como o
    // quiz fazia até 8/9. O texto de um lance costuma nomear o plano e o lance
    // seguinte ("c3 prepara d4"), e deixá-lo no painel é dar a resposta da
    // pergunta seguinte pela metade.
    comentario: estado.modo === "assistido" ? comentario : null,
  };

  if (acabou) {
    // O comentário do último lance é o mais importante do arquivo — 42 dos 110
    // —, e na assistida e no treino não há painel de fim para mostrá-lo. Ele
    // fica na tela, abaixo do cartão. No quiz sai daqui porque o painel de
    // resultado o mostra logo abaixo, e as duas caixas juntas seriam o mesmo
    // texto duas vezes.
    const fim: EstadoDaPassada = {
      ...andou,
      fase: "resolvido",
      comentario: estado.modo === "quiz" ? null : comentario,
    };
    const gravado = gravar(fim, fim.jogados, "fim");
    // O prêmio só toca no quiz, e **no lugar** do som do lance: fechar a linha
    // valendo não pode soar igual a seguir uma seta — nem igual a um treino em
    // que nada foi contado.
    const efeitos: Efeito[] =
      estado.modo === "quiz"
        ? [{ tipo: "som-premio" }, ...gravado.efeitos, { tipo: "terminou" }]
        : [som, { tipo: "terminou" }];
    return { estado: { ...gravado.estado, cartao: emRepouso(linha, gravado.estado) }, efeitos };
  }

  // A pausa para ler é da etapa assistida. Nas outras o comentário nem chega.
  const trava = comentario !== null && estado.modo === "assistido";
  const seguinte: EstadoDaPassada = { ...andou, fase: trava ? "lendo" : "jogando" };
  return {
    estado: { ...seguinte, cartao: emRepouso(linha, seguinte) },
    efeitos: [som, ...esperaOAdversario(linha, seguinte)],
  };
}

/**
 * O fim do quiz pelo erro: o lance do clube entra, o comentário dele aparece,
 * e a passada para.
 *
 * Não é `aplicar` porque `aplicar` **segue** — agenda o adversário, e a linha
 * continuaria. Aqui o que entra no tabuleiro é a resposta que o aluno não deu,
 * e o que ele tem de fazer em seguida é recomeçar do zero, não jogar o lance
 * seguinte. A gravação já saiu no instante do erro; aqui não sobe nada.
 */
function revelar(
  linha: Linha,
  estado: EstadoDaPassada,
  noTabuleiro: string,
  doAluno: string,
): Passo {
  const depois = applyUci(estado.fen, noTabuleiro);
  if (!depois) return parado(estado);
  const fim: EstadoDaPassada = {
    ...estado,
    fen: depois.fen,
    ultimoLance: casas(noTabuleiro),
    jogados: [...estado.jogados, doAluno],
    passo: estado.passo + 1,
    pendente: null,
    fase: "resolvido",
    comentario: comentarioDe(linha, estado.passo),
  };
  return {
    estado: { ...fim, cartao: emRepouso(linha, fim) },
    efeitos: [somDe(depois), { tipo: "terminou" }],
  };
}

/** Volta a peça e mostra alguma coisa antes de a linha seguir sozinha. */
function mostrar(
  linha: Linha,
  estado: EstadoDaPassada,
  cartao: Cartao,
  pendente: EstadoDaPassada["pendente"],
): EstadoDaPassada {
  return {
    ...estado,
    fase: "mostrando",
    revisao: estado.revisao + 1,
    pendente,
    cartao,
    // O comentário do lance anterior sai: o que a caixa tem de dizer agora é o
    // veredito, e os dois textos disputando o mesmo canto foi o defeito que o
    // cartão veio consertar.
    comentario: null,
    dicaNoPasso: null,
  };
}

const esperaAVolta: Efeito = {
  tipo: "agendar",
  evento: { tipo: "continuar" },
  ms: VOLTA_MS,
};

/**
 * **Uma regra só para o adversário: enquanto o meio-lance não é nosso, ele
 * joga sozinho.** Cobre o `1.d4` que abre as linhas das pretas e as respostas
 * do meio com o mesmo código — e a linha sempre termina num lance nosso, pela
 * regra de `lib/repertorio/linhas.ts`, então isto nunca fica esperando.
 *
 * Ela mora no redutor, e não na casca, porque o único jeito de a casca fazê-lo
 * era um `useEffect` que observa fase e passo — e esse efeito reagenda o
 * relógio toda vez que uma dependência muda de identidade, o que significa um
 * adversário que nunca joga se alguém esquecer um `useCallback` três arquivos
 * acima. Aqui a espera é emitida uma vez, no instante exato em que a vez passa
 * a ser dele, e o sequenciamento inteiro de uma passada cabe num arquivo só.
 *
 * O **primeiro** lance dele é a exceção, e é a casca que o dispara: não há
 * evento anterior de onde emiti-lo, e ele espera mais — o aluno precisa ver a
 * posição parada antes de a primeira peça andar.
 */
function esperaOAdversario(linha: Linha, estado: EstadoDaPassada): Efeito[] {
  if (estado.fase !== "jogando") return [];
  if (estado.passo >= linha.lances.length || minhaVez(linha, estado.passo)) return [];
  return [{ tipo: "agendar", evento: { tipo: "adversarioJogou" }, ms: RESPOSTA_MS }];
}

/* ------------------------------------------------------------------ *
 * O redutor
 * ------------------------------------------------------------------ */

export function reduzir(linha: Linha, estado: EstadoDaPassada, evento: Evento): Passo {
  switch (evento.tipo) {
    case "jogou":
      return jogou(linha, estado, evento.uci);

    case "adversarioJogou": {
      if (estado.fase !== "jogando" || minhaVez(linha, estado.passo)) return parado(estado);
      if (estado.passo >= linha.lances.length) return parado(estado);
      const uci = linha.lances[estado.passo];
      const depois = applyUci(estado.fen, uci);
      if (!depois) return parado(estado);

      const comentario = comentarioDe(linha, estado.passo);
      const andou: EstadoDaPassada = {
        ...estado,
        fen: depois.fen,
        ultimoLance: casas(uci),
        passo: estado.passo + 1,
        comentario: estado.modo === "assistido" ? comentario : null,
        // Os 4 comentários do repertório que caem em lance **dele** travavam
        // nada antes deste bloco: o efeito de resposta automática atropelava a
        // leitura. Na assistida eles param a passada como os nossos.
        fase: comentario !== null && estado.modo === "assistido" ? "lendo" : "jogando",
      };
      return {
        estado: { ...andou, cartao: emRepouso(linha, andou) },
        efeitos: [somDe(depois)],
      };
    }

    case "continuar": {
      if (estado.fase === "lendo") {
        // A pausa acabou. Se o próximo meio-lance é dele, a espera começa
        // **agora** — durante a leitura ela não podia estar correndo.
        const solto: EstadoDaPassada = { ...estado, fase: "jogando" };
        return {
          estado: { ...solto, cartao: emRepouso(linha, solto) },
          efeitos: esperaOAdversario(linha, solto),
        };
      }
      if (estado.fase === "mostrando") {
        if (!estado.pendente) {
          // A recusa da assistida e do treino: nada entrou no tabuleiro, e o
          // aluno continua devendo o mesmo lance.
          const solto: EstadoDaPassada = { ...estado, fase: "jogando" };
          return { estado: { ...solto, cartao: emRepouso(linha, solto) }, efeitos: [] };
        }
        const { noTabuleiro, doAluno } = estado.pendente;
        // Com o lance certo já revelado no estado, o que entra é o fim: a
        // alternativa segue a linha, o erro a para.
        return estado.revelado
          ? revelar(linha, estado, noTabuleiro, doAluno)
          : aplicar(linha, estado, noTabuleiro, doAluno);
      }
      return parado(estado);
    }

    case "pediuDica":
      return pediuDica(linha, estado);

    case "olhou":
      return olhou(linha, estado, evento.para);
  }
}

/* ------------------------------------------------------------------ *
 * O lance do aluno
 * ------------------------------------------------------------------ */

function jogou(linha: Linha, estado: EstadoDaPassada, uci: string): Passo {
  if (estado.fase !== "jogando" || !minhaVez(linha, estado.passo)) return parado(estado);

  const passo = estado.passo;
  const veredito = vereditoDoLance(linha, passo, uci);
  const principal = linha.lances[passo];
  const destino = uci.slice(2, 4);
  const k = linha.meus.indexOf(passo);
  const ultimoPly = passo + 1 >= linha.lances.length;
  const san = sanEmPortugues(linha.sans[passo]);

  /* --- A assistida: a seta é a lei ------------------------------------ */
  if (estado.modo === "assistido") {
    if (veredito === "certo") {
      const feito = aplicar(linha, estado, uci, uci);
      return {
        estado: feito.estado,
        efeitos: [{ tipo: "selo", casa: destino, qual: "acerto" }, ...feito.efeitos],
      };
    }
    // Nem a `alternativa` passa aqui, e é deliberado: a seta aponta para uma
    // casa, e ver a peça parar noutra ensinaria que a seta não vale nada.
    return {
      estado: mostrar(
        linha,
        estado,
        { comando: "Siga a seta", estado: `Aqui a linha joga ${san}.`, tom: "aviso" },
        null,
      ),
      efeitos: [{ tipo: "som-recusa" }, esperaAVolta],
    };
  }

  /* --- O treino: recusa, e não pune ----------------------------------- */
  if (estado.modo === "treino") {
    if (veredito === "certo") {
      // Sem selo no boletim: aqui toda tentativa acaba certa, e uma fita toda
      // verde de uma etapa em que errar não conta não diria nada.
      const feito = aplicar(linha, estado, uci, uci);
      return {
        estado: feito.estado,
        efeitos: [{ tipo: "selo", casa: destino, qual: "acerto" }, ...feito.efeitos],
      };
    }
    // O cartão **não revela o lance certo**, e isso é a diferença para a
    // assistida: lá a seta já o dava. Revelar aqui viraria "erra, lê, joga" —
    // a assistida de novo, sem a seta. Quem precisa de ajuda tem a dica, que
    // nesta etapa é de graça e mostra só a peça. A alternativa é recusada pelo
    // mesmo motivo da assistida: o que se decora é a linha do clube.
    const jogadoEmPortugues = sanEmPortugues(sanDe(estado.fen, uci));
    const cartao: Cartao =
      veredito === "erro-nomeado"
        ? {
            comando: `${jogadoEmPortugues} é a armadilha`,
            estado: "A fonte mostra esse lance de propósito como errado. Errar aqui não conta — tente de novo.",
            tom: "aviso",
          }
        : veredito === "alternativa"
          ? {
              comando: "Bom lance, mas não é o da linha",
              estado: "Aqui você decora o lance do clube. Errar não conta — tente de novo.",
              tom: "aviso",
            }
          : {
              comando: "Não é esse",
              estado: "Errar aqui não conta. Tente de novo.",
              tom: "aviso",
            };
    return {
      estado: mostrar(linha, estado, cartao, null),
      efeitos: [{ tipo: "som-recusa" }, esperaAVolta],
    };
  }

  /* --- O quiz --------------------------------------------------------- */
  if (veredito === "certo") {
    const feito = aplicar(linha, marcar(estado, k, "acerto"), uci, uci);
    return {
      estado: feito.estado,
      efeitos: [{ tipo: "selo", casa: destino, qual: "acerto" }, ...feito.efeitos],
    };
  }

  if (veredito === "alternativa") {
    return {
      estado: mostrar(
        linha,
        marcar(estado, k, "alternativa"),
        {
          comando: "Também vale",
          estado: ultimoPly
            ? `A linha do clube termina com ${san}.`
            : `A linha do clube joga ${san}.`,
          tom: "aviso",
        },
        { noTabuleiro: principal, doAluno: uci },
      ),
      efeitos: [{ tipo: "selo", casa: destino, qual: "alternativa" }, esperaAVolta],
    };
  }

  // Errado, ou o erro que a fonte mostra de propósito como errado. Nos dois a
  // passada está decidida e **para aqui**: a peça volta, o lance do clube
  // entra quando a espera acabar (`revelar`), e o aluno recomeça do zero. A
  // gravação sai agora, e não na revelação, pelo motivo de sempre — a aba pode
  // fechar nos 850 ms em que a peça está voltando.
  const jogadoEmPortugues = sanEmPortugues(sanDe(estado.fen, uci));
  const cartao: Cartao =
    veredito === "erro-nomeado"
      ? {
          comando: `${jogadoEmPortugues} é a armadilha`,
          estado: `A fonte mostra esse lance de propósito como errado. A linha joga ${san}.`,
          tom: "ruim",
        }
      : {
          comando: "Não é esse",
          estado: `A linha joga ${san}. Esta passada já contou.`,
          tom: "ruim",
        };

  const gravado = gravar(marcar(estado, k, "falha"), [...estado.jogados, uci], "erro");
  return {
    estado: {
      ...mostrar(linha, gravado.estado, cartao, { noTabuleiro: principal, doAluno: uci }),
      errou: true,
      revelado: { passo, uci: principal, san },
    },
    efeitos: [
      { tipo: "selo", casa: destino, qual: "falha" },
      { tipo: "som-recusa" },
      ...gravado.efeitos,
      esperaAVolta,
    ],
  };
}

/** O SAN de um lance qualquer nesta posição — para nomear o que o aluno fez. */
function sanDe(fen: string, uci: string): string {
  return applyUci(fen, uci)?.game.history().at(-1) ?? uci;
}

/* ------------------------------------------------------------------ *
 * A dica
 * ------------------------------------------------------------------ */

/**
 * A dica é **pedida**, e no quiz a primeira de uma passada limpa custa a
 * passada.
 *
 * O buraco que ela fecha: com a escada de revisão, dica de graça deixaria o
 * aluno fechar qualquer linha apertando "Dica" a cada lance — e o servidor não
 * teria como saber, porque ele só vê lances. Então o pedido antes de qualquer
 * erro **manda os lances até aqui**: `conferirLinha` reprova lista curta por
 * conta própria ("parar no meio não é acertar"), e a passada fica gravada como
 * tentativa sem acerto. Zero código novo do lado do servidor.
 *
 * Depois de decidida é de graça: uma dica ali não compra nada — só evita que
 * a aba feche. No treino é de graça sempre, e pelo mesmo raciocínio: não há
 * nada gravado para comprar.
 *
 * Um nível só, sem escalonar: a casa de **origem**, que é a pergunta "qual
 * peça?". A escada automática de dois-erros-acende-a-casa saiu junto com o
 * público de 10 anos que a justificava. Na assistida não há dica: a seta já
 * está na tela.
 */
function pediuDica(linha: Linha, estado: EstadoDaPassada): Passo {
  if (estado.modo === "assistido" || estado.fase !== "jogando") return parado(estado);
  if (!minhaVez(linha, estado.passo)) return parado(estado);
  if (estado.dicaNoPasso === estado.passo) return parado(estado);

  const gravado = gravar(estado, [...estado.jogados], "dica");
  const cobrou = gravado.efeitos.length > 0;
  return {
    estado: {
      ...gravado.estado,
      dicaPedida: true,
      dicaNoPasso: estado.passo,
      cartao: {
        comando: "Jogue o lance certo",
        estado: cobrou
          ? "Você pediu ajuda: esta passada conta como treino, não como acerto."
          : estado.modo === "treino"
            ? "A casa acesa é a peça que resolve. Aqui a dica é de graça."
            : "A casa acesa é a peça que resolve.",
        tom: "aviso",
      },
    },
    efeitos: gravado.efeitos,
  };
}

/* ------------------------------------------------------------------ *
 * Olhar para trás
 * ------------------------------------------------------------------ */

/** A posição depois de `n` meios-lances da linha, rejogada do início. */
function posicaoApos(linha: Linha, n: number): string | null {
  let fen = linha.fenInicial;
  for (const uci of linha.lances.slice(0, n)) {
    const depois = applyUci(fen, uci);
    if (!depois) return null;
    fen = depois.fen;
  }
  return fen;
}

/** "2.Cf3" ou "1…e5": o meio-lance `i` com o número do lance na frente. */
function lanceNumerado(linha: Linha, i: number): string {
  return `${Math.floor(i / 2) + 1}${i % 2 === 0 ? "." : "…"}${sanEmPortugues(linha.sans[i])}`;
}

/**
 * As setas ← e → da assistida: olhar um meio-lance anterior e voltar.
 *
 * **Recuar vai até a posição inicial; avançar não passa da frente** — do
 * meio-lance mais adiantado que a passada de fato alcançou. A trava vem de
 * decisão registrada: em 6/9/2026 o modo "só olhar" foi revogado porque
 * "assistir não é treinar: o aluno via a linha andar sozinha e chegava ao
 * quiz sem ter movido uma peça". Uma seta → que mostrasse o lance seguinte
 * traria o modo de volta por outra porta. Por isso o limite é **dito no
 * cartão**: apertar → na frente sem resposta nenhuma lê como tecla quebrada, e
 * o aluno precisa saber que dali para a frente se joga.
 *
 * A posição sai de rejogar a linha desde o início. Na assistida o tabuleiro
 * nunca sai da linha — a alternativa é recusada —, então a frente rejogada é
 * a mesma que estava na tela, e a conta é determinística sem tabuleiro. Só a
 * assistida navega: no treino e no quiz olhar o lance anterior é olhar a
 * resposta que acabou de ser dada, e a linha inteira, na revisão, é justamente
 * o que o aluno tem de lembrar sozinho.
 *
 * Enquanto olha, a fase é `olhando`: o tabuleiro não aceita lance, e o relógio
 * do adversário que vencer nesse meio-tempo é ignorado. Ao voltar à frente a
 * espera é emitida de novo, se a vez era dele — o mesmo desenho da leitura.
 */
function olhou(linha: Linha, estado: EstadoDaPassada, para: "tras" | "frente"): Passo {
  if (estado.modo !== "assistido") return parado(estado);
  // Na recusa o relógio da volta está correndo: sair daqui deixaria a peça
  // voltada e o `continuar` cairia numa fase que não o espera.
  if (estado.fase === "mostrando") return parado(estado);

  const frente = estado.passo;
  const naTela = estado.olhando?.meioLance ?? frente;
  const alvo = naTela + (para === "tras" ? -1 : 1);

  if (alvo > frente) {
    return {
      estado: {
        ...estado,
        cartao: {
          ...estado.cartao,
          estado: "Você já está na frente — o que vem agora se joga, não se vê.",
          tom: "aviso",
        },
      },
      efeitos: [],
    };
  }

  if (alvo < 0) {
    // Sem nada para trás (ainda no lance zero, na frente) o tabuleiro tem de
    // continuar vivo; só quem já está olhando ganha o aviso.
    if (!estado.olhando) return parado(estado);
    return {
      estado: {
        ...estado,
        cartao: {
          comando: "Começo da linha",
          estado: "Não há lance antes deste. → volta para a frente.",
          tom: "calma",
        },
      },
      efeitos: [],
    };
  }

  const fen = posicaoApos(linha, alvo);
  if (!fen) return parado(estado);
  const visto: EstadoDaPassada = {
    ...estado,
    fen,
    ultimoLance: alvo > 0 ? casas(linha.lances[alvo - 1]) : null,
    comentario: alvo > 0 ? comentarioDe(linha, alvo - 1) : null,
  };
  // A fase em que a frente ficou: a que já estava guardada, ou a de agora, se
  // este é o primeiro passo para trás.
  const faseDaFrente = estado.olhando?.deVolta ?? estado.fase;

  if (alvo === frente) {
    // De volta à frente: a fase que ficou esperando, e a espera do adversário
    // recomeça se a vez era dele.
    const deVolta: EstadoDaPassada = { ...visto, fase: faseDaFrente, olhando: null };
    return {
      estado: { ...deVolta, cartao: emRepouso(linha, deVolta) },
      efeitos: esperaOAdversario(linha, deVolta),
    };
  }

  return parado({
    ...visto,
    fase: "olhando",
    olhando: { meioLance: alvo, deVolta: faseDaFrente },
    cartao: {
      comando: alvo === 0 ? "Começo da linha" : lanceNumerado(linha, alvo - 1),
      estado: "Só olhando. → volta para a frente.",
      tom: "calma",
    },
  });
}

/* ------------------------------------------------------------------ *
 * O boletim
 * ------------------------------------------------------------------ */

/**
 * O placar da passada, para a fita e para o "6 de 8".
 *
 * **Não é gravado, e é de propósito.** O que o servidor guarda continua sendo o
 * veredito da passada inteira, decidido no primeiro erro — inclusive contra o
 * aluno que fecha a aba depois de errar. O boletim é exibição, e mandá-lo ao
 * servidor seria pedir a ele que confiasse numa conta feita no navegador.
 *
 * Desde que o erro para a passada, a fita completa só existe em passada limpa
 * — na errada os lances depois do erro ficam nulos, e o "N de M" conta o que
 * o aluno chegou a jogar.
 *
 * `acertou` tem de concordar com `conferirLinha` sobre os mesmos lances, e há
 * teste disso: duas contas do mesmo fato que discordem fazem a tela mentir.
 */
export function acuracia(estado: EstadoDaPassada): {
  acertos: number;
  total: number;
  acertou: boolean;
} {
  const acertos = estado.boletim.filter((s) => s === "acerto" || s === "alternativa").length;
  return {
    acertos,
    total: estado.boletim.length,
    acertou: acertos === estado.boletim.length,
  };
}
