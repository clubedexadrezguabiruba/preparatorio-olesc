import type { TreeGoal } from "./schema.ts";
import type { Fala } from "./voz.ts";

/**
 * **Tudo o que o motor de aula diz ao aluno e não vem do arquivo da aula.**
 *
 * ## Por que existe
 *
 * Metade da voz do curso mora em `content/lessons/*.json`, escrita pela
 * autoria, e a régua de `docs/VOZ-DO-CURSO.md` já a cobrava. A outra metade
 * morava espalhada em seis arquivos de componente — rótulo de botão, texto de
 * espera, veredito de fim de partida, o "Etapa concluída." do painel — e não
 * era cobrada por nada. Era exatamente ali que o vocabulário de bastidor tinha
 * vazado para a tela: "o teto de N lances acabou", "tentativa 2", "critério de
 * domínio", "passada", "Objetivo / Com ajuda / Sem ajuda".
 *
 * Juntas num módulo, essas falas viram varredura de máquina: o `voz.test.ts`
 * lê `TODAS_AS_FALAS` e as mede contra os mesmos tetos que mede as do arquivo.
 * Uma fala nova que não passe pela régua não chega ao aluno.
 *
 * ## O que NÃO entra aqui
 *
 * - Texto de aula, que é da autoria e mora no JSON.
 * - Mensagem de erro de gate, comentário de código, nome de campo — nada disso
 *   o aluno lê, e a régua §4 diz isso com todas as letras.
 * - Texto de tela que não é do motor de aula (índice, painel, aberturas). A
 *   dívida está declarada na §7.1 do documento.
 *
 * ## O vocabulário das três etapas
 *
 * "Aula · Treino · Valendo" não é invenção: é a mesma família que o módulo de
 * aberturas já usa nas abas dele ("seta · treino · valendo"). Antes eram
 * "Objetivo / Com ajuda / Sem ajuda" — três rótulos que descreviam o desenho do
 * sistema, e não o que o aluno vai fazer em cada um.
 */

/* ------------------------------------------------------------------ *
 * As três etapas, e o caminho entre elas
 * ------------------------------------------------------------------ */

export const TRILHA = {
  objective: "Aula",
  guided: "Treino",
  practice: "Valendo",
} as const;

export const AVANCO = {
  /** Do fim da aula assistida para o treino. */
  paraTreino: "Agora é a sua vez",
  /** Do fim do treino para a partida que vale. */
  paraValendo: "Jogar valendo",
  /** Quando não há próxima etapa nomeada. */
  padrao: "Continuar",
} as const;

/* ------------------------------------------------------------------ *
 * A aula assistida (etapa 1)
 * ------------------------------------------------------------------ */

export const AULA_ASSISTIDA = {
  pausar: "Pausar",
  continuar: "Continuar",
  rever: "Ver de novo",
} as const;

/* ------------------------------------------------------------------ *
 * O treino (etapa 2) e a partida (etapa 3)
 * ------------------------------------------------------------------ */

/**
 * As palavras que mudam com o que a posição pede. Metade dos 49 finais da
 * trilha se ganha e a outra metade se segura, e "o mate não saiu" dito a quem
 * só precisava empatar é a aula cobrando o que ela mesma não pediu.
 */
export const ALVO: Record<TreeGoal, { oQue: string; oFim: string }> = {
  win: { oQue: "a vitória", oFim: "o mate não saiu" },
  draw: { oQue: "o empate", oFim: "o empate não veio" },
};

export const TREINO = {
  /** O que o professor diz enquanto o aluno pensa, quando o nó não traz fala. */
  esperando: "Faça o seu lance no tabuleiro. Aqui errar não custa nada.",
  ilegal: "Esse lance não é legal nesta posição.",
  recomecar: "Começar de novo",
  /** O selo da conclusão, no painel. Era "Etapa concluída." */
  pronto: "Pronto.",
  semAjuda: (goal: TreeGoal) =>
    `Sem ajuda nenhuma. Um lance que jogue ${ALVO[goal].oQue} fora encerra a partida.`,
  perdeuOAlvo: (goal: TreeGoal) =>
    `Sem ${ALVO[goal].oQue} não há o que treinar. Acabou aqui — comece de novo.`,
  acabaramOsLances: (limite: number, goal: TreeGoal) =>
    `Acabaram os ${limite} lances e ${ALVO[goal].oFim}. Comece de novo.`,
  /** O contador de lances, quando a etapa tem limite. */
  lance: (feitos: number, limite: number) => `Lance ${feitos} de ${limite}`,
  /** Quantas vezes o aluno recomeçou. Era "tentativa 2". */
  vez: (n: number) => `${n}ª vez`,
} as const;

export const PARTIDA = {
  abertura:
    "Agora é partida de verdade, na mesma posição. O computador joga com tudo o que sabe.",
  esperando:
    "Partida de verdade: o computador defende com tudo o que sabe. Quem decide é o resultado, não o lance.",
  pensando: "pensando…",
  recomecar: "Começar de novo",
  tentarDeNovo: "Tentar de novo",
  /** O relógio dos 50 lances, para o empate não cair do céu no lance 100. */
  semProgresso: (feitos: number, limite: number) => `Sem progresso: ${feitos} de ${limite}`,
  carregando: (tamanho: string) => `Carregando o computador — ${tamanho}, só na primeira vez.`,
  naoCarregou: "Não consegui carregar o computador.",
  /** Vem depois do texto acima, ou depois do erro que o motor devolveu. */
  tenteDeNovoDepois: "Confira a conexão e tente de novo. A aula e o treino continuam abertos.",
  lanceImpossivel: "O computador devolveu um lance impossível nesta posição.",
} as const;

/* ------------------------------------------------------------------ *
 * O fim da partida — o que o aluno lê depois do resultado
 * ------------------------------------------------------------------ */

export const VEREDITO = {
  venceu: (goal: TreeGoal) =>
    goal === "win"
      ? "Você venceu o computador. A técnica saiu inteira contra quem resiste."
      : "Mais do que o pedido: bastava empatar, e você venceu.",
  empatouQuandoBastava: "O empate era o que se queria aqui, e você o segurou.",
  perdeu: "O computador venceu. Comece de novo: a técnica precisa sair inteira.",
} as const;

/**
 * Por que o empate saiu, e o que fazer da próxima vez. Um conselho por motivo:
 * afogar o rei e andar em círculos são erros diferentes.
 */
export const CONSELHO_DO_EMPATE = {
  afogamento:
    "O rei adversário ficou sem lance legal, e não estava em xeque. Deixe sempre uma casa de fuga.",
  materialInsuficiente: "Sem a peça não há mate: a partida acabou quando ela caiu.",
  cinquentaLances:
    "A regra dos 50 lances fecha a partida quando nada anda. Cada lance precisa apertar o cerco.",
  repeticao:
    "A posição voltou três vezes ao mesmo lugar. Cada lance precisa tirar uma casa do rei adversário.",
  outro: "Aqui era para vencer.",
} as const;

/* ------------------------------------------------------------------ *
 * O selo do fim da aula
 * ------------------------------------------------------------------ */

export const SELO = {
  feito: (goal: TreeGoal) =>
    goal === "win"
      ? "Feito por hoje. Você venceu o computador sem ajuda — volte noutro dia."
      : "Feito por hoje. Você segurou o empate sem ajuda — volte noutro dia.",
  aindaNao: "Hoje ainda não saiu.",
  falta: (goal: TreeGoal) =>
    goal === "win"
      ? "Vencer o computador aqui, sem ajuda. Saber a técnica e fazê-la contra quem resiste são duas coisas."
      : "Segurar o empate aqui, sem ajuda. Saber a técnica e fazê-la contra quem resiste são duas coisas.",
  semPartida: "Esta aula é de leitura: não há partida para vencer aqui.",
} as const;

/* ------------------------------------------------------------------ *
 * A varredura
 * ------------------------------------------------------------------ */

/**
 * Tudo o que está acima, na forma que o `voz.test.ts` mede.
 *
 * As falas com buraco entram **montadas**, com um argumento de exemplo: o que
 * o aluno lê é a frase inteira, e medir só o pedaço fixo deixaria passar a
 * frase que só estoura depois de preenchida. Os dois objetivos da árvore entram
 * separados pelo mesmo motivo.
 *
 * A lista é escrita à mão, e não derivada por varredura do módulo, porque o
 * `tipo` de cada uma — fala ou rótulo — é julgamento, não estrutura: "Pausar" é
 * rótulo de botão e não paga teto de fala.
 */
export const TODAS_AS_FALAS: Fala[] = [
  ...Object.entries(TRILHA).map(([k, texto]) => ({ onde: `TRILHA.${k}`, texto, tipo: "rotulo" as const })),
  ...Object.entries(AVANCO).map(([k, texto]) => ({ onde: `AVANCO.${k}`, texto, tipo: "rotulo" as const })),
  ...Object.entries(AULA_ASSISTIDA).map(([k, texto]) => ({
    onde: `AULA_ASSISTIDA.${k}`,
    texto,
    tipo: "rotulo" as const,
  })),

  { onde: "TREINO.esperando", texto: TREINO.esperando, tipo: "fala" },
  { onde: "TREINO.ilegal", texto: TREINO.ilegal, tipo: "fala" },
  { onde: "TREINO.recomecar", texto: TREINO.recomecar, tipo: "rotulo" },
  { onde: "TREINO.pronto", texto: TREINO.pronto, tipo: "rotulo" },
  { onde: "TREINO.semAjuda(win)", texto: TREINO.semAjuda("win"), tipo: "fala" },
  { onde: "TREINO.semAjuda(draw)", texto: TREINO.semAjuda("draw"), tipo: "fala" },
  { onde: "TREINO.perdeuOAlvo(win)", texto: TREINO.perdeuOAlvo("win"), tipo: "fala" },
  { onde: "TREINO.perdeuOAlvo(draw)", texto: TREINO.perdeuOAlvo("draw"), tipo: "fala" },
  { onde: "TREINO.acabaramOsLances(win)", texto: TREINO.acabaramOsLances(12, "win"), tipo: "fala" },
  { onde: "TREINO.acabaramOsLances(draw)", texto: TREINO.acabaramOsLances(12, "draw"), tipo: "fala" },
  { onde: "TREINO.lance", texto: TREINO.lance(3, 12), tipo: "rotulo" },
  { onde: "TREINO.vez", texto: TREINO.vez(2), tipo: "rotulo" },

  { onde: "PARTIDA.abertura", texto: PARTIDA.abertura, tipo: "fala" },
  { onde: "PARTIDA.esperando", texto: PARTIDA.esperando, tipo: "fala" },
  { onde: "PARTIDA.pensando", texto: PARTIDA.pensando, tipo: "rotulo" },
  { onde: "PARTIDA.recomecar", texto: PARTIDA.recomecar, tipo: "rotulo" },
  { onde: "PARTIDA.tentarDeNovo", texto: PARTIDA.tentarDeNovo, tipo: "rotulo" },
  { onde: "PARTIDA.semProgresso", texto: PARTIDA.semProgresso(12, 50), tipo: "rotulo" },
  { onde: "PARTIDA.carregando", texto: PARTIDA.carregando("41,3 MB"), tipo: "fala" },
  { onde: "PARTIDA.naoCarregou", texto: PARTIDA.naoCarregou, tipo: "fala" },
  { onde: "PARTIDA.tenteDeNovoDepois", texto: PARTIDA.tenteDeNovoDepois, tipo: "fala" },
  { onde: "PARTIDA.lanceImpossivel", texto: PARTIDA.lanceImpossivel, tipo: "fala" },

  { onde: "VEREDITO.venceu(win)", texto: VEREDITO.venceu("win"), tipo: "fala" },
  { onde: "VEREDITO.venceu(draw)", texto: VEREDITO.venceu("draw"), tipo: "fala" },
  {
    onde: "VEREDITO.empatouQuandoBastava",
    texto: VEREDITO.empatouQuandoBastava,
    tipo: "fala",
  },
  { onde: "VEREDITO.perdeu", texto: VEREDITO.perdeu, tipo: "fala" },

  ...Object.entries(CONSELHO_DO_EMPATE).map(([k, texto]) => ({
    onde: `CONSELHO_DO_EMPATE.${k}`,
    texto,
    tipo: "fala" as const,
  })),

  { onde: "SELO.feito(win)", texto: SELO.feito("win"), tipo: "fala" },
  { onde: "SELO.feito(draw)", texto: SELO.feito("draw"), tipo: "fala" },
  { onde: "SELO.aindaNao", texto: SELO.aindaNao, tipo: "fala" },
  { onde: "SELO.falta(win)", texto: SELO.falta("win"), tipo: "fala" },
  { onde: "SELO.falta(draw)", texto: SELO.falta("draw"), tipo: "fala" },
  { onde: "SELO.semPartida", texto: SELO.semPartida, tipo: "fala" },
];
