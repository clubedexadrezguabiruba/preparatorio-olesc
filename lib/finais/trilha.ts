import { semanaAtual, type Semana } from "../curso/calendario.ts";
import { aprendida, zerada, type ProgressoDaEscada } from "./escada.ts";

/**
 * A trilha de finais: **a fonte única** de quais aulas o curso tem, em que
 * classe, em que ordem, em que formato e a partir de que sábado.
 *
 * É o análogo de `lib/tatica/blocos.ts`, e existe pelo mesmo motivo: o painel,
 * a lista de `/finais`, a tarefa da semana e o relatório do professor fazem a
 * mesma pergunta — "quantas aulas o aluno dominou na classe E?" —, e quatro
 * respostas escritas em quatro arquivos são quatro chances de o painel dizer 6
 * e o relatório dizer 5 com o aluno na frente.
 *
 * ## O que está aqui e o que está em `docs/TRILHA-FINAIS.md`
 *
 * O documento é a **autoria**: a lista das 49, o porquê de cada uma, o livro
 * que a fundamenta, as fontes de domínio público da posição, o risco. Este
 * arquivo é a **cópia campo a campo** do que o site precisa saber para
 * funcionar, e nada mais. Quando os dois discordarem, o documento é que está
 * certo e este arquivo é que está desatualizado — a ordem de correção é essa.
 *
 * ## A regra da aula aberta
 *
 * > Aula aberta = está nesta trilha **e** o JSON existe em `content/lessons/`
 * > com `status: "published"` **e** a semana dela já chegou.
 *
 * As três condições respondem a três perguntas diferentes, e por isso nenhuma
 * substitui as outras: a trilha diz o que é *curso* (o `content/` também
 * guarda fixture e rascunho), o `status` diz o que passou pelo gate e está
 * pronto para uma criança, e a semana diz o que já foi *combinado no sábado*.
 * Publicar mais aulas é acrescentar linha aqui e arquivo no `content/`; nada
 * mais — nenhuma tela é reformada, nenhuma migration é escrita.
 *
 * ## Por que "dominada" é conta daqui, e não coluna do banco
 *
 * Porque ela depende do **formato**, e o formato mora aqui: aula completa exige
 * a etapa sem ajuda e a prática; aula curta exige só a prática; aula de leitura
 * é declaração do aluno. Uma coluna `dominada` no banco congelaria essa
 * decisão: rebaixar uma aula curta da classe B para leitura — que é a primeira
 * alavanca da §6 do documento, se o ritmo de autoria não sustentar — obrigaria
 * a reescrever histórico de aluno para continuar verdadeiro. O banco guarda o
 * que aconteceu (`tentativas_aula`, `aula_lida`); esta função diz o que aquilo
 * significa hoje.
 *
 * ## Puro
 *
 * Sem `server-only`, sem Supabase, sem disco: entram a lista de publicadas e o
 * progresso lido, saem estado e contagem. É o que permite ao `node --test`
 * cobrir a regra da aula aberta e os três critérios de domínio sem banco
 * nenhum — e é a mesma divisão que separa `lib/tarefas/estado.ts` de
 * `lib/tarefas/progresso.ts`.
 */

/**
 * As classes da USCF, da mais fraca para a mais forte (§1 do documento).
 *
 * A lista vem primeiro e o tipo sai dela — e não o contrário — para que o
 * schema da tarefa de finais (`lib/tarefas/tarefas.ts`) possa cobrar
 * exatamente estas quatro letras sem reescrevê-las. Duas listas seriam duas
 * opiniões sobre o que é uma classe.
 */
export const CLASSES = ["E", "D", "C", "B"] as const;

export type Classe = (typeof CLASSES)[number];

/** O cabeçalho de cada classe na tela. A faixa é a do chess.com, aproximada. */
export const CLASSE: Record<Classe, { nome: string; faixa: string; resumo: string }> = {
  E: {
    nome: "Classe E",
    faixa: "até ~1350",
    resumo: "Mates básicos, afogamento, o que dá mate e o rei como peça.",
  },
  D: {
    nome: "Classe D",
    faixa: "~1350 a 1550",
    resumo: "Rei e peão: quadrado, oposição, casas-chave. Peça menor e torre contra peão.",
  },
  C: {
    nome: "Classe C",
    faixa: "~1550 a 1800",
    resumo: "Torres: Lucena, Filidor, torre atrás do peão. Passados, bispo errado, dama contra peão.",
  },
  B: {
    nome: "Classe B",
    faixa: "~1800 a 2000",
    resumo: "Triangulação, oposição distante, corridas, sétima fila, Vancura, dois bispos.",
  },
};

/**
 * Os três formatos (§2 do documento). O que muda é quais etapas a aula tem — e,
 * por consequência, o que "dominada" quer dizer nela.
 */
export type Formato = "completa" | "curta" | "leitura";

/**
 * Os três formatos, na palavra que o aluno lê.
 *
 * **Os textos mudaram inteiros em 2026-09-08**, e não por gosto: a aula deixou
 * de ter seis etapas em posições diferentes e passou a ter **três numa posição
 * só**, e "dominada" deixou de ser uma vitória para sempre e virou o degrau 3
 * da escada (`lib/finais/escada.ts`). A trilha dizia "as seis etapas" para uma
 * aula que tem três, e "dominada ao vencer a prática" para um critério que
 * hoje pede três dias — as duas frases mentiam na tela do aluno.
 */
export const FORMATO: Record<Formato, { nome: string; etapas: string; criterio: string }> = {
  completa: {
    nome: "Aula completa",
    etapas: "objetivo, com ajuda e sem ajuda",
    criterio:
      "Aprendida com três vitórias sem ajuda, em três dias diferentes e espaçados.",
  },
  curta: {
    nome: "Aula curta",
    etapas: "objetivo e sem ajuda",
    criterio:
      "Aprendida com três vitórias (ou empates seguros) sem ajuda, em três dias diferentes.",
  },
  leitura: {
    nome: "Aula de leitura",
    etapas: "só o objetivo",
    criterio: "Aprendida quando você marcar que leu — esta aula não tem partida.",
  },
};

export type AulaDaTrilha = {
  /** O id do arquivo em `content/lessons/`, que é o do currículo do laboratório. */
  readonly id: string;
  readonly classe: Classe;
  /** A posição na lista das 49. Ordena a classe e não se repete. */
  readonly ordem: number;
  readonly formato: Formato;
  /** A semana do preparatório a partir da qual a aula aparece. */
  readonly sabado: Semana;
  /** Uma linha: é o que o aluno lê no cartão antes de abrir. */
  readonly nome: string;
};

/**
 * As 49 aulas, na ordem da §5 do documento.
 *
 * ## Uma decisão tomada aqui, e não lá: as duas aulas prontas abrem na semana 1
 *
 * A tabela "Quando cada aula abre" do documento põe as aulas 1–8, 10 e 11 na
 * semana 2, porque é a semana em que a **FN1/B5** entrega as oito novas. As
 * duas primeiras, porém, já existem, já passaram pelo gate e já jogam — e a
 * coluna "Fase" delas diz "pronta", não "B5". Deixá-las trancadas até 19 de
 * setembro seria o site escondendo o que ele tem: quem entrar no domingo
 * seguinte ao Sábado 1 encontraria um curso de finais com zero aulas abertas.
 * Então `sabado: 1` nas duas, e `sabado: 2` no resto do lote da B5.
 */
export const TRILHA: readonly AulaDaTrilha[] = [
  // ---------------------------------------------------------------- Classe E
  { ordem: 1, id: "N0-Q-MATE", classe: "E", formato: "completa", sabado: 1, nome: "Mate de dama e rei: a caixa" },
  { ordem: 2, id: "N0-R-MATE", classe: "E", formato: "completa", sabado: 1, nome: "Mate de torre e rei: a caixa" },
  { ordem: 3, id: "N0-LADDER", classe: "E", formato: "curta", sabado: 2, nome: "Mate da escada: duas torres, e dama e torre" },
  { ordem: 4, id: "N0-STALEMATE", classe: "E", formato: "curta", sabado: 2, nome: "Afogamento: como não empatar a partida ganha" },
  { ordem: 5, id: "N0-MATING-MATERIAL", classe: "E", formato: "leitura", sabado: 2, nome: "O que dá mate e o que não dá" },
  { ordem: 6, id: "N1-KING-ACTIVITY", classe: "E", formato: "curta", sabado: 2, nome: "O rei é peça: use-o" },

  // ---------------------------------------------------------------- Classe D
  { ordem: 7, id: "N1-SQUARE", classe: "D", formato: "completa", sabado: 2, nome: "Regra do quadrado" },
  { ordem: 8, id: "N1-DIRECT-OPPOSITION", classe: "D", formato: "curta", sabado: 2, nome: "Oposição" },
  { ordem: 9, id: "N1-KEY-SQUARES", classe: "D", formato: "curta", sabado: 3, nome: "Casas-chave" },
  { ordem: 10, id: "N1-KPK", classe: "D", formato: "completa", sabado: 2, nome: "Rei e peão contra rei: o rei na frente do peão" },
  { ordem: 11, id: "N1-KPK-RANKS", classe: "D", formato: "curta", sabado: 2, nome: "Peão na 6ª e na 7ª: quem joga decide" },
  { ordem: 12, id: "N1-ROOK-PAWN", classe: "D", formato: "curta", sabado: 3, nome: "Peão de torre: o empate do canto" },
  { ordem: 13, id: "N2-KING-MANEUVER", classe: "D", formato: "curta", sabado: 3, nome: "Oposição além do básico: a distante" },
  { ordem: 14, id: "N4-B-VS-PAWNS", classe: "D", formato: "curta", sabado: 3, nome: "Bispo contra peão" },
  { ordem: 15, id: "N4-N-VS-PAWNS", classe: "D", formato: "curta", sabado: 3, nome: "Cavalo contra peão" },
  { ordem: 16, id: "N3-R-VS-PAWN", classe: "D", formato: "completa", sabado: 3, nome: "Torre contra peão: contar, cortar, aproximar" },
  { ordem: 17, id: "N1-KING-VS-PAWNS", classe: "D", formato: "curta", sabado: 3, nome: "Rei contra dois peões passados" },
  { ordem: 18, id: "N1-PAWNS-BLOCKADE", classe: "D", formato: "curta", sabado: 3, nome: "Um peão segura dois: o bloqueio" },

  // ---------------------------------------------------------------- Classe C
  { ordem: 19, id: "N3-LUCENA", classe: "C", formato: "completa", sabado: 3, nome: "Lucena: a ponte" },
  { ordem: 20, id: "N3-PHILIDOR", classe: "C", formato: "completa", sabado: 3, nome: "Filidor: a defesa da terceira fila" },
  { ordem: 21, id: "N3-ROOK-BEHIND", classe: "C", formato: "completa", sabado: 3, nome: "Torre atrás do peão passado" },
  { ordem: 22, id: "N3-SIDE-CHECKS", classe: "C", formato: "curta", sabado: 3, nome: "Lado curto, lado longo" },
  { ordem: 23, id: "N3-CUT-FILE", classe: "C", formato: "curta", sabado: 4, nome: "Cortar o rei pela coluna" },
  { ordem: 24, id: "N3-DEFENSIVE-EXCEPTIONS", classe: "C", formato: "curta", sabado: 4, nome: "Defesa passiva: quando ela segura" },
  { ordem: 25, id: "N3-R-VS-2P", classe: "C", formato: "curta", sabado: 4, nome: "Torre contra dois peões" },
  { ordem: 26, id: "N2-OUTSIDE-PASSER", classe: "C", formato: "curta", sabado: 4, nome: "Peão passado distante" },
  { ordem: 27, id: "N2-PROTECTED-PASSER", classe: "C", formato: "curta", sabado: 4, nome: "Peão passado protegido" },
  { ordem: 28, id: "N1-K2P-VS-K", classe: "C", formato: "curta", sabado: 4, nome: "Rei e dois peões contra rei: ligados e dobrados" },
  { ordem: 29, id: "N2-PAWN-RACES", classe: "C", formato: "curta", sabado: 4, nome: "Corrida de peões: quem promove primeiro" },
  { ordem: 30, id: "N4-Q-VS-PAWN", classe: "C", formato: "curta", sabado: 4, nome: "Dama contra peão na 7ª, e as exceções" },
  { ordem: 31, id: "N4-WRONG-BISHOP", classe: "C", formato: "curta", sabado: 4, nome: "Bispo errado com peão de torre" },
  { ordem: 32, id: "N4-OPPOSITE-BISHOPS", classe: "C", formato: "curta", sabado: 4, nome: "Bispos de cores opostas: a fortaleza" },
  { ordem: 33, id: "N4-N-AND-ROOK-PAWN", classe: "C", formato: "curta", sabado: 4, nome: "Cavalo e peão de torre contra rei" },
  { ordem: 34, id: "N4-Q-VS-ROOK", classe: "C", formato: "curta", sabado: 4, nome: "Dama contra torre: o básico" },

  // ---------------------------------------------------------------- Classe B
  { ordem: 35, id: "N2-TRIANGULATION", classe: "B", formato: "curta", sabado: 4, nome: "Triangulação" },
  { ordem: 36, id: "N2-OUTFLANKING", classe: "B", formato: "curta", sabado: 4, nome: "Flanquear o rei" },
  { ordem: 37, id: "N2-RESERVE-TEMPI", classe: "B", formato: "curta", sabado: 4, nome: "Tempos de reserva" },
  { ordem: 38, id: "N2-BREAKTHROUGH", classe: "B", formato: "curta", sabado: 4, nome: "Ruptura de peões" },
  { ordem: 39, id: "N2-RETI", classe: "B", formato: "curta", sabado: 4, nome: "Manobra de Réti: o rei que faz duas coisas" },
  { ordem: 40, id: "N3-R-2P-VS-R", classe: "B", formato: "curta", sabado: 4, nome: "Torre e dois peões ligados contra torre" },
  { ordem: 41, id: "N3-SEVENTH-RANK", classe: "B", formato: "curta", sabado: 4, nome: "A sétima fila" },
  { ordem: 42, id: "N5-VANCURA", classe: "B", formato: "curta", sabado: 4, nome: "Defesa de Vancura" },
  { ordem: 43, id: "N3-R-VS-RN-PAWNS", classe: "B", formato: "curta", sabado: 4, nome: "Torre contra peão de torre e de bispo: as exceções" },
  { ordem: 44, id: "N0-2B-MATE", classe: "B", formato: "curta", sabado: 4, nome: "Dois bispos contra rei" },
  { ordem: 45, id: "N4-OPPOSITE-BISHOPS-2P", classe: "B", formato: "curta", sabado: 4, nome: "Bispos de cores opostas com dois peões" },
  { ordem: 46, id: "N4-SAME-BISHOPS", classe: "B", formato: "curta", sabado: 4, nome: "Bispo e peão contra bispo da mesma cor" },
  { ordem: 47, id: "N4-BISHOP-VS-KNIGHT", classe: "B", formato: "curta", sabado: 4, nome: "Bispo contra cavalo com um peão" },
  { ordem: 48, id: "N2-DOUBLED-ISOLATED", classe: "B", formato: "curta", sabado: 4, nome: "Peões dobrados e isolados no final de peões" },
  { ordem: 49, id: "N2-ZUGZWANG", classe: "B", formato: "leitura", sabado: 4, nome: "Zugzwang: a obrigação de mover" },
];

const POR_ID = new Map(TRILHA.map((aula) => [aula.id, aula]));

/** A aula da trilha, ou `undefined` se o id não é do curso. */
export function aulaDaTrilha(id: string): AulaDaTrilha | undefined {
  return POR_ID.get(id);
}

/** As aulas de uma classe, na ordem da lista. */
export function daClasse(aulas: readonly AulaDaTrilha[], classe: Classe): AulaDaTrilha[] {
  return aulas.filter((aula) => aula.classe === classe);
}

/**
 * As aulas abertas: na trilha, publicadas e com a semana já chegada.
 *
 * `publicadas` vem do disco (`lib/finais/conteudo.ts`), e é por isso que ela
 * entra como parâmetro em vez de ser lida aqui: assim esta função continua
 * pura, e o teste dela não precisa de `content/` montado de um jeito
 * específico.
 */
export function aulasAbertas(
  publicadas: ReadonlySet<string>,
  semana: Semana = semanaAtual(),
): AulaDaTrilha[] {
  return TRILHA.filter((aula) => aula.sabado <= semana && publicadas.has(aula.id));
}

/* ------------------------------------------------------------------ *
 * O que o aluno fez, e o que isso significa
 * ------------------------------------------------------------------ */

/**
 * O que o banco sabe de uma aula, para um aluno. É o que
 * `lib/finais/progresso.ts` monta da view `progresso_aula` e de `aula_lida`.
 */
export type ProgressoDaAula = {
  /**
   * A etapa 4, que saiu do formato em 2026-09-08.
   *
   * O campo fica porque a coluna fica: `progresso_aula.solo_ok` guarda as
   * linhas históricas dos alunos, e apagar o passado deles para arrumar o
   * presente do código seria caro e mentiroso. **Nenhuma aula nova o liga**, e
   * nada mais o lê para decidir coisa nenhuma.
   */
  readonly soloOk: boolean;
  /** Alguma partida vencida, em algum dia. **Não é "aprendida"** — ver `escada`. */
  readonly praticaOk: boolean;
  readonly tentativas: number;
  readonly lida: boolean;
  /** Quando foi a última tentativa nesta aula (ISO), ou `null`. */
  readonly ultima: string | null;
  /**
   * Onde a aula está na escada de revisão (`lib/finais/escada.ts`).
   *
   * **É esta a resposta para "o aluno sabe isto?"**, e ela substituiu um
   * booleano permanente em 2026-09-08. Vem de `finais_progresso`, uma linha por
   * (aluno, aula), escrita pelo servidor depois de reproduzir a partida.
   */
  readonly escada: ProgressoDaEscada;
};

export const AULA_ZERADA: ProgressoDaAula = {
  soloOk: false,
  praticaOk: false,
  tentativas: 0,
  lida: false,
  ultima: null,
  escada: zerada(),
};

export type EstadoDeAula = "nao-comecou" | "praticando" | "aprendida";

export const NOME_DO_ESTADO: Record<EstadoDeAula, string> = {
  "nao-comecou": "Não começou",
  praticando: "Praticando",
  aprendida: "Aprendida",
};

/**
 * Aprendeu esta aula? A pergunta depende do formato, e é aqui que ela mora.
 *
 * ## O que mudou em 2026-09-08, e mudou no site inteiro
 *
 * Ela chamava-se `dominou` e era um **booleano permanente**: `praticaOk`, isto
 * é, uma vitória em algum momento. O banco reforçava com `bool_or` e o
 * comentário *"final não se desaprende"*. É bonito e é falso — o aluno de 11
 * anos que deu o mate de torre na terça não sabe dá-lo no sábado.
 *
 * Passa a ser o **degrau 3 da escada**: três passadas em dias distintos e
 * espaçados (`lib/finais/escada.ts`). E, como lá, uma aula pode **perder
 * posto** sem desaprender: quem chegou ao degrau 3 uma vez continua aprendido,
 * e o que cai é o degrau — por isso a leitura é de `aprendidaEm`, e não de
 * `degrau >= 3`.
 *
 * A aula de leitura continua fora da escada: não há partida para vencer, e o
 * que ela tem é a declaração do aluno, gravada em `aula_lida`.
 */
export function aprendeu(formato: Formato, p: ProgressoDaAula): boolean {
  if (formato === "leitura") return p.lida;
  return aprendida(p.escada);
}

export function estadoDaAula(formato: Formato, p: ProgressoDaAula): EstadoDeAula {
  if (aprendeu(formato, p)) return "aprendida";
  return p.tentativas > 0 ? "praticando" : "nao-comecou";
}

/**
 * Os ids que o aluno aprendeu, entre as aulas dadas.
 *
 * Recebe a lista de aulas em vez de varrer a `TRILHA` inteira porque quem
 * pergunta já sabe o recorte: o painel conta sobre as **abertas**, e uma aula
 * que o professor aprendeu revisando um rascunho não pode virar "1 de 0".
 */
export function aprendidasDaTrilha(
  aulas: readonly AulaDaTrilha[],
  progresso: ReadonlyMap<string, ProgressoDaAula>,
): Set<string> {
  const feitas = new Set<string>();
  for (const aula of aulas) {
    if (aprendeu(aula.formato, progresso.get(aula.id) ?? AULA_ZERADA)) feitas.add(aula.id);
  }
  return feitas;
}

/**
 * A próxima aula a estudar: a primeira aberta que ainda não foi aprendida.
 *
 * Na ordem da trilha, que é ordem de pré-requisito — não na ordem em que o
 * aluno abriu as abas. `undefined` quer dizer que ele aprendeu tudo o que está
 * aberto, e o painel diz isso em vez de sugerir coisa nenhuma.
 */
export function proximaAula(
  abertas: readonly AulaDaTrilha[],
  progresso: ReadonlyMap<string, ProgressoDaAula>,
): AulaDaTrilha | undefined {
  return abertas.find((aula) => !aprendeu(aula.formato, progresso.get(aula.id) ?? AULA_ZERADA));
}
