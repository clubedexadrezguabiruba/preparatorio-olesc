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
 * ## As duas fases
 *
 * **Assistida** (primeira vez na linha): o cartão diz o lance por extenso, a
 * seta fica desenhada, e o aluno **executa**. Outro lance não conta — nem uma
 * `alternativa` marcada pelo autor, porque aqui a seta é a lei. Onde há
 * comentário do professor a passada trava até o aluno continuar, inclusive nos
 * comentários que caem em lance do adversário. **Nada sobe ao servidor.**
 *
 * **Quiz** (da segunda em diante): sem seta e sem o nome do lance. O primeiro
 * erro decide a passada na hora — é a regra que protege a verdade gravada
 * contra a aba fechada no meio —, mas a linha **vai até o fim**: a peça volta,
 * o lance do clube entra no lugar, e o aluno vê o resto. É o que permite o
 * boletim lance a lance sair completo.
 */

/* ------------------------------------------------------------------ *
 * Os tipos
 * ------------------------------------------------------------------ */

export type Modo = "assistido" | "quiz";

export type Fase =
  /** A vez do aluno, ou a espera do lance do adversário. */
  | "jogando"
  /** Travado num comentário do professor. Só a fase assistida entra aqui. */
  | "lendo"
  /** A peça voltou, e o tabuleiro está dizendo alguma coisa antes de seguir. */
  | "mostrando"
  /** A linha acabou. */
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
  /** O meio-lance da vez, indexando `linha.lances`. */
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
};

export type Evento =
  /** O aluno soltou uma peça. */
  | { readonly tipo: "jogou"; readonly uci: string }
  /** O relógio do lance automático do adversário venceu. */
  | { readonly tipo: "adversarioJogou" }
  /** O botão (ou a tecla →), e também o relógio que fecha a fase "mostrando". */
  | { readonly tipo: "continuar" }
  /** O botão "Dica". */
  | { readonly tipo: "pediuDica" };

export type Efeito =
  | { readonly tipo: "som-lance"; readonly captura: boolean; readonly xeque: boolean }
  | { readonly tipo: "som-recusa" }
  | { readonly tipo: "som-premio" }
  /** O disco transitório na casa de destino, que carrega o veredito. */
  | { readonly tipo: "selo"; readonly casa: string; readonly qual: Selo }
  /**
   * Manda os lances ao servidor. Acontece **uma vez** por passada.
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
  /** A linha acabou: o painel de fim entra. */
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
 * Os cartões de veredito (erro, alternativa, "siga a seta", dica) são escritos
 * no lugar onde o evento é tratado, e não aqui: eles dizem o que **acabou de**
 * acontecer, que é informação que o estado sozinho não tem.
 */
function emRepouso(linha: Linha, estado: EstadoDaPassada): Cartao {
  const { modo, passo, fase } = estado;

  if (fase === "resolvido") {
    return modo === "assistido"
      ? // Sem "muito bom": um aluno de 14 anos fareja elogio de máquina, e
        // seguir setas não é ter aprendido nada ainda.
        { comando: "Pronto.", estado: "Agora de memória.", tom: "bom" }
      : { comando: "Linha completa", estado: "", tom: "bom" };
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

  const qual = linha.meus.indexOf(passo) + 1;
  return {
    comando: "Jogue o lance certo",
    estado: `Lance ${qual} de ${linha.meus.length}, de memória.`,
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
  };
  return { ...cru, cartao: emRepouso(linha, cru) };
}

/* ------------------------------------------------------------------ *
 * A conta de dentro: aplicar um lance
 * ------------------------------------------------------------------ */

const parado = (estado: EstadoDaPassada): Passo => ({ estado, efeitos: [] });

function marcar(estado: EstadoDaPassada, k: number, selo: Selo): EstadoDaPassada {
  // A **primeira** tentativa de cada lance é a que conta. Hoje o quiz só dá uma
  // por lance — errar avança —, e a guarda é o que mantém isso verdade se
  // alguém devolver a repetição um dia.
  if (k < 0 || estado.boletim[k] !== null) return estado;
  const boletim = [...estado.boletim];
  boletim[k] = selo;
  return { ...estado, boletim };
}

/**
 * Põe um lance no tabuleiro e segue a linha.
 *
 * O lance que anda no tabuleiro pode ser **diferente** do que o aluno jogou: é
 * o caso da alternativa e, agora, o do erro. O que se está decorando é a linha,
 * e deixar duas posições conviverem faria o aluno chegar ao lance seguinte com
 * o tabuleiro que ele inventou. Quem vai ao servidor é sempre `doAluno`.
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
  const lance = depois.game.history({ verbose: true }).at(-1);
  const som: Efeito = {
    tipo: "som-lance",
    captura: Boolean(lance?.captured),
    xeque: depois.game.inCheck(),
  };

  const andou: EstadoDaPassada = {
    ...estado,
    fen: depois.fen,
    ultimoLance: [noTabuleiro.slice(0, 2), noTabuleiro.slice(2, 4)],
    jogados: [...estado.jogados, doAluno],
    passo: passo + 1,
    pendente: null,
    dicaNoPasso: null,
    comentario,
  };

  if (acabou) {
    // O comentário do último lance é o mais importante do arquivo — 42 dos 110
    // —, e na assistida não há painel de fim para mostrá-lo. Ele fica na tela,
    // abaixo do cartão. No quiz sai daqui porque o painel de resultado o mostra
    // logo abaixo, e as duas caixas juntas seriam o mesmo texto duas vezes.
    const fim: EstadoDaPassada = {
      ...andou,
      fase: "resolvido",
      comentario: estado.modo === "assistido" ? comentario : null,
    };
    // O prêmio só toca no quiz, e **no lugar** do som do lance: fechar a linha
    // de memória não pode soar igual a seguir uma seta.
    const efeitos: Efeito[] =
      estado.modo === "quiz"
        ? [
            { tipo: "som-premio" },
            ...(estado.decidido
              ? []
              : [{ tipo: "decidir", lances: fim.jogados, porQue: "fim" } satisfies Efeito]),
            { tipo: "terminou" },
          ]
        : [som, { tipo: "terminou" }];
    return { estado: { ...fim, decidido: true, cartao: emRepouso(linha, fim) }, efeitos };
  }

  // A pausa para ler é da fase assistida. No quiz o comentário aparece, mas não
  // trava: lá o exercício é o ritmo, e uma parada por lance o mataria.
  const trava = comentario !== null && estado.modo === "assistido";
  const seguinte: EstadoDaPassada = { ...andou, fase: trava ? "lendo" : "jogando" };
  return {
    estado: { ...seguinte, cartao: emRepouso(linha, seguinte) },
    efeitos: [som, ...esperaOAdversario(linha, seguinte)],
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
      const lance = depois.game.history({ verbose: true }).at(-1);
      const andou: EstadoDaPassada = {
        ...estado,
        fen: depois.fen,
        ultimoLance: [uci.slice(0, 2), uci.slice(2, 4)],
        passo: estado.passo + 1,
        comentario,
        // Os 4 comentários do repertório que caem em lance **dele** travavam
        // nada antes deste bloco: o efeito de resposta automática atropelava a
        // leitura. Na assistida eles param a passada como os nossos.
        fase: comentario !== null && estado.modo === "assistido" ? "lendo" : "jogando",
      };
      return {
        estado: { ...andou, cartao: emRepouso(linha, andou) },
        efeitos: [
          {
            tipo: "som-lance",
            captura: Boolean(lance?.captured),
            xeque: depois.game.inCheck(),
          },
        ],
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
          // A recusa da fase assistida: nada entrou no tabuleiro, e o aluno
          // continua devendo o mesmo lance.
          const solto: EstadoDaPassada = { ...estado, fase: "jogando" };
          return { estado: { ...solto, cartao: emRepouso(linha, solto) }, efeitos: [] };
        }
        const { noTabuleiro, doAluno } = estado.pendente;
        return aplicar(linha, estado, noTabuleiro, doAluno);
      }
      return parado(estado);
    }

    case "pediuDica":
      return pediuDica(linha, estado);
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

  /* --- A fase assistida: a seta é a lei ------------------------------- */
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
  // passada já está decidida — e agora ela **continua**, porque o aluno que
  // esqueceu o terceiro lance ainda tem quatro para ver.
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

  const marcado = marcar(estado, k, "falha");
  const decidir: Efeito[] = estado.decidido
    ? []
    : [{ tipo: "decidir", lances: [...estado.jogados, uci], porQue: "erro" }];

  return {
    estado: {
      ...mostrar(linha, marcado, cartao, { noTabuleiro: principal, doAluno: uci }),
      errou: true,
      decidido: true,
    },
    efeitos: [
      { tipo: "selo", casa: destino, qual: "falha" },
      { tipo: "som-recusa" },
      ...decidir,
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
 * A dica é **pedida**, e a primeira de uma passada limpa custa a passada.
 *
 * O buraco que ela fecha: com a escada de revisão, dica de graça deixaria o
 * aluno fechar qualquer linha apertando "Dica" a cada lance — e o servidor não
 * teria como saber, porque ele só vê lances. Então o pedido antes de qualquer
 * erro **manda os lances até aqui**: `conferirLinha` reprova lista curta por
 * conta própria ("parar no meio não é acertar"), e a passada fica gravada como
 * tentativa sem acerto. Zero código novo do lado do servidor.
 *
 * Depois do primeiro erro é de graça: a passada já foi decidida, e uma dica
 * ali não compra nada — só evita que a aba feche.
 *
 * Um nível só, sem escalonar: a casa de **origem**, que é a pergunta "qual
 * peça?". A escada automática de dois-erros-acende-a-casa saiu junto com o
 * público de 10 anos que a justificava.
 */
function pediuDica(linha: Linha, estado: EstadoDaPassada): Passo {
  if (estado.modo !== "quiz" || estado.fase !== "jogando") return parado(estado);
  if (!minhaVez(linha, estado.passo)) return parado(estado);
  if (estado.dicaNoPasso === estado.passo) return parado(estado);

  const cobra = !estado.decidido;
  return {
    estado: {
      ...estado,
      dicaPedida: true,
      dicaNoPasso: estado.passo,
      decidido: estado.decidido || cobra,
      cartao: {
        comando: "Jogue o lance certo",
        estado: cobra
          ? "Você pediu ajuda: esta passada conta como treino, não como acerto."
          : "A casa acesa é a peça que resolve.",
        tom: "aviso",
      },
    },
    efeitos: cobra ? [{ tipo: "decidir", lances: [...estado.jogados], porQue: "dica" }] : [],
  };
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

