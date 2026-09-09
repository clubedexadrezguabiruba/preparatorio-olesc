import { semanaAtual, type Semana } from "../curso/calendario.ts";
import { aprendida, zerada, type ProgressoDaEscada } from "./escada.ts";

/**
 * A trilha de finais: **a fonte única** de quais aulas o curso tem, em que
 * nível e em que ordem.
 *
 * É o análogo de `lib/tatica/blocos.ts`, e existe pelo mesmo motivo: o painel,
 * a lista de `/finais`, a tarefa da semana e o relatório do professor fazem a
 * mesma pergunta — "quantas aulas o aluno aprendeu no nível 2?" —, e quatro
 * respostas escritas em quatro arquivos são quatro chances de o painel dizer 6
 * e o relatório dizer 5 com o aluno na frente.
 *
 * ## Dois eixos ao mesmo tempo, e por quanto tempo
 *
 * Desde 2026-09-09 cada aula tem **`nivel` e `classe`**. O vigente é o `nivel`,
 * cortado pela `ordem` (§1 do documento); a `classe` e o `sabado` ficam até a
 * Etapa 2 do plano dos níveis, que roda no branch do repertório e apaga os dois
 * de uma vez, com as telas junto. Enquanto isso, quem lê este arquivo deve
 * preferir `nivel` — a `classe` sobrevive porque `lib/curso/mapa.ts`,
 * `app/finais/page.tsx` e o gate de rotação de livros ainda a leem.
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
 * Porque ela depende de **como a aula é hoje**: a que tem prática pede a
 * escada; a que não tem é declaração do aluno. Uma coluna `dominada` no banco
 * congelaria essa decisão — tirar a prática de uma aula da classe B, que é a
 * primeira alavanca da §6 do documento se o ritmo de autoria não sustentar,
 * obrigaria a reescrever histórico de aluno para continuar verdadeiro. O banco
 * guarda o que aconteceu (`tentativas_aula`, `aula_lida`); esta função diz o
 * que aquilo significa hoje.
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

/* ------------------------------------------------------------------ *
 * Os cinco níveis — o eixo novo, ao lado da classe
 * ------------------------------------------------------------------ */

/**
 * Os cinco níveis da escada (§1 do documento), do mais fraco para o mais forte.
 *
 * **Entram ao lado da `classe`, não no lugar dela, e é de propósito.** Apagar
 * `classe` e `sabado` é a Etapa 2 do plano dos níveis, que roda no branch do
 * repertório; fazê-lo aqui quebraria `lib/curso/trilha.test.ts`,
 * `lib/curso/mapa.ts` e `app/finais/page.tsx` por um ganho que este trabalho não
 * precisa. Enquanto isso, este arquivo carrega dois eixos, e o documento já
 * declara qual dos dois é o vigente.
 */
export const NIVEIS = [1, 2, 3, 4, 5] as const;

export type Nivel = (typeof NIVEIS)[number];

/**
 * O cabeçalho de cada nível na tela. **A faixa é FIDE, não chess.com**, e isso é
 * decisão do plano dos níveis: FIDE ≈ chess.com rápidas − 300/400, e rotular por
 * FIDE impede que o aluno de 1700 rapid conclua que pode pular os níveis baixos.
 */
export const NIVEL: Record<Nivel, { nome: string; fide: string; resumo: string }> = {
  1: {
    nome: "Nível 1",
    fide: "até 800",
    resumo: "Mates básicos, afogamento, o que dá mate e o rei como peça.",
  },
  2: {
    nome: "Nível 2",
    fide: "800 a 1000",
    resumo: "Rei e peão: quadrado, oposição, casas-chave, KPK, peão de torre.",
  },
  3: {
    nome: "Nível 3",
    fide: "1000 a 1200",
    resumo: "Oposição distante; bispo, cavalo e torre contra peão; o bloqueio.",
  },
  4: {
    nome: "Nível 4",
    fide: "1200 a 1400",
    resumo: "Torres: Lucena, Filidor, cortar o rei. Passados, bispo errado, dama contra peão.",
  },
  5: {
    nome: "Nível 5",
    fide: "1400 ou mais",
    resumo: "Triangulação, Réti, Vancura, sétima fila, bispos de cores opostas.",
  },
};

/*
 * **Os três formatos saíram em 9/9/2026, e com eles a coluna `formato`.**
 *
 * `Formato` era `"completa" | "curta" | "leitura"`, e `FORMATO` dava a cada um
 * um nome, uma lista de etapas e um critério de domínio. Trinta e nove das 49
 * aulas eram `curta`, e o motivo estava escrito na §2 do documento: *"a etapa
 * cara de escrever é a árvore… quarenta e nove aulas completas não cabem no
 * prazo"*.
 *
 * A árvore deixou de ser escrita — ela é derivada do roteiro da aula
 * (`lib/lesson/derivar-treino.ts`) —, e com isso o formato curto perdeu a razão
 * de existir. O que ficou no lugar é **um formato só, quatro etapas, e a
 * ausência declarada por escrito no arquivo da aula** (`etapasAusentes` em
 * `lib/lesson/schema.ts`).
 *
 * Quem lê a ausência é `aprendeu`, e o que ela pergunta agora é uma coisa só:
 * a aula tem prática?
 */

export type AulaDaTrilha = {
  /**
   * O id do arquivo em `content/lessons/`, que é o do currículo do laboratório.
   *
   * **O prefixo `N0-`…`N5-` não é o nível.** É a competência do currículo do
   * Laboratório de Finais, e a colisão de vocabulário é herança, não descuido:
   * `N4-B-VS-PAWNS` é aula do **nível 3**. Renomear invalidaria as posições
   * aprovadas e o cache da tablebase (§11.3 do documento).
   */
  readonly id: string;
  /** Sai na Etapa 2 do plano dos níveis. Ainda é o que o gate de rotação agrupa. */
  readonly classe: Classe;
  /** O nível da escada, cortado pela `ordem` (§1 do documento). */
  readonly nivel: Nivel;
  /** A posição na lista das 49. É ordem de pré-requisito, e não se repete. */
  readonly ordem: number;
  /** A semana do preparatório a partir da qual a aula aparece. Sai na Etapa 2. */
  readonly sabado: Semana;
  /** Uma linha: é o que o aluno lê no cartão antes de abrir. */
  readonly nome: string;
};

/**
 * O corte da §1 do documento: qual nível a `ordem` cai.
 *
 * Existe como função, e não só como a coluna escrita na lista, porque é ela que
 * o teste usa para conferir as 49 linhas uma a uma. Uma lista escrita à mão erra
 * uma célula; a função não erra a mesma célula duas vezes.
 */
export function nivelDaOrdem(ordem: number): Nivel {
  if (ordem <= 6) return 1;
  if (ordem <= 12) return 2;
  if (ordem <= 18) return 3;
  if (ordem <= 34) return 4;
  return 5;
}

/**
 * As 49 aulas, na ordem da §5 do documento.
 *
 * O `nivel` é **derivado da `ordem`** pela regra da §1 (1–6 · 7–12 · 13–18 ·
 * 19–34 · 35–49) e escrito linha a linha aqui, não calculado na leitura: assim
 * ele é dado, como todo o resto desta lista, e o teste o confere contra
 * `nivelDaOrdem` em vez de contra si mesmo.
 *
 * O `sabado` continua escrito e **não vale mais nada de novo**: ele é do
 * calendário de sábados que o plano dos níveis aposentou, e a tabela "Quando
 * cada aula abre" já saiu do documento. Sai daqui na Etapa 2 daquele plano,
 * junto com `classe`. Enquanto ele estiver aqui, `aulasAbertas` continua
 * cobrando a semana — mudar isso agora é a reforma, não este trabalho.
 */
export const TRILHA: readonly AulaDaTrilha[] = [
  // ---------------------------------------------------------------- Nível 1  ·  FIDE até 800
  //
  // A ordem mudou em 2026-09-09, por decisão do Doug (§5 e §11.11 do documento):
  // antes de aprender a dar mate, saber com que material dá. Depois a dificuldade
  // sobe — escada (duas torres, mecânico), dama (tranca sozinha), torre (precisa
  // do rei) —, e o afogamento vem logo depois dos dois mates, que é onde ele
  // acontece. O `sabado` das seis é 1: elas são a meta da OLESC, e o calendário
  // de sábados já foi aposentado.
  { ordem: 1, id: "N0-MATING-MATERIAL", nivel: 1, classe: "E", sabado: 1, nome: "O que dá mate e o que não dá" },
  { ordem: 2, id: "N0-LADDER", nivel: 1, classe: "E", sabado: 1, nome: "Mate da escada: duas torres, e dama e torre" },
  { ordem: 3, id: "N0-Q-MATE", nivel: 1, classe: "E", sabado: 1, nome: "Mate de dama e rei: a técnica do L" },
  { ordem: 4, id: "N0-R-MATE", nivel: 1, classe: "E", sabado: 1, nome: "Mate de torre e rei: a caixa" },
  { ordem: 5, id: "N0-STALEMATE", nivel: 1, classe: "E", sabado: 1, nome: "Afogamento: como não empatar a partida ganha" },
  { ordem: 6, id: "N1-KING-ACTIVITY", nivel: 1, classe: "E", sabado: 1, nome: "O rei é peça: use-o" },

  // ---------------------------------------------------------------- Nível 2  ·  FIDE 800–1000
  { ordem: 7, id: "N1-SQUARE", nivel: 2, classe: "D", sabado: 2, nome: "Regra do quadrado" },
  { ordem: 8, id: "N1-DIRECT-OPPOSITION", nivel: 2, classe: "D", sabado: 2, nome: "Oposição" },
  { ordem: 9, id: "N1-KEY-SQUARES", nivel: 2, classe: "D", sabado: 3, nome: "Casas-chave" },
  { ordem: 10, id: "N1-KPK", nivel: 2, classe: "D", sabado: 2, nome: "Rei e peão contra rei: o rei na frente do peão" },
  { ordem: 11, id: "N1-KPK-RANKS", nivel: 2, classe: "D", sabado: 2, nome: "Peão na 6ª e na 7ª: quem joga decide" },
  { ordem: 12, id: "N1-ROOK-PAWN", nivel: 2, classe: "D", sabado: 3, nome: "Peão de torre: o empate do canto" },
  // ---------------------------------------------------------------- Nível 3  ·  FIDE 1000–1200
  { ordem: 13, id: "N2-KING-MANEUVER", nivel: 3, classe: "D", sabado: 3, nome: "Oposição além do básico: a distante" },
  { ordem: 14, id: "N4-B-VS-PAWNS", nivel: 3, classe: "D", sabado: 3, nome: "Bispo contra peão" },
  { ordem: 15, id: "N4-N-VS-PAWNS", nivel: 3, classe: "D", sabado: 3, nome: "Cavalo contra peão" },
  { ordem: 16, id: "N3-R-VS-PAWN", nivel: 3, classe: "D", sabado: 3, nome: "Torre contra peão: contar, cortar, aproximar" },
  { ordem: 17, id: "N1-KING-VS-PAWNS", nivel: 3, classe: "D", sabado: 3, nome: "Rei contra dois peões passados" },
  { ordem: 18, id: "N1-PAWNS-BLOCKADE", nivel: 3, classe: "D", sabado: 3, nome: "Um peão segura dois: o bloqueio" },

  // ---------------------------------------------------------------- Nível 4  ·  FIDE 1200–1400
  { ordem: 19, id: "N3-LUCENA", nivel: 4, classe: "C", sabado: 3, nome: "Lucena: a ponte" },
  { ordem: 20, id: "N3-PHILIDOR", nivel: 4, classe: "C", sabado: 3, nome: "Filidor: a defesa da terceira fila" },
  { ordem: 21, id: "N3-ROOK-BEHIND", nivel: 4, classe: "C", sabado: 3, nome: "Torre atrás do peão passado" },
  { ordem: 22, id: "N3-SIDE-CHECKS", nivel: 4, classe: "C", sabado: 3, nome: "Lado curto, lado longo" },
  { ordem: 23, id: "N3-CUT-FILE", nivel: 4, classe: "C", sabado: 4, nome: "Cortar o rei pela coluna" },
  { ordem: 24, id: "N3-DEFENSIVE-EXCEPTIONS", nivel: 4, classe: "C", sabado: 4, nome: "Defesa passiva: quando ela segura" },
  { ordem: 25, id: "N3-R-VS-2P", nivel: 4, classe: "C", sabado: 4, nome: "Torre contra dois peões" },
  { ordem: 26, id: "N2-OUTSIDE-PASSER", nivel: 4, classe: "C", sabado: 4, nome: "Peão passado distante" },
  { ordem: 27, id: "N2-PROTECTED-PASSER", nivel: 4, classe: "C", sabado: 4, nome: "Peão passado protegido" },
  { ordem: 28, id: "N1-K2P-VS-K", nivel: 4, classe: "C", sabado: 4, nome: "Rei e dois peões contra rei: ligados e dobrados" },
  { ordem: 29, id: "N2-PAWN-RACES", nivel: 4, classe: "C", sabado: 4, nome: "Corrida de peões: quem promove primeiro" },
  { ordem: 30, id: "N4-Q-VS-PAWN", nivel: 4, classe: "C", sabado: 4, nome: "Dama contra peão na 7ª, e as exceções" },
  { ordem: 31, id: "N4-WRONG-BISHOP", nivel: 4, classe: "C", sabado: 4, nome: "Bispo errado com peão de torre" },
  { ordem: 32, id: "N4-OPPOSITE-BISHOPS", nivel: 4, classe: "C", sabado: 4, nome: "Bispos de cores opostas: a fortaleza" },
  { ordem: 33, id: "N4-N-AND-ROOK-PAWN", nivel: 4, classe: "C", sabado: 4, nome: "Cavalo e peão de torre contra rei" },
  { ordem: 34, id: "N4-Q-VS-ROOK", nivel: 4, classe: "C", sabado: 4, nome: "Dama contra torre: o básico" },

  // ---------------------------------------------------------------- Nível 5  ·  FIDE 1400+
  { ordem: 35, id: "N2-TRIANGULATION", nivel: 5, classe: "B", sabado: 4, nome: "Triangulação" },
  { ordem: 36, id: "N2-OUTFLANKING", nivel: 5, classe: "B", sabado: 4, nome: "Flanquear o rei" },
  { ordem: 37, id: "N2-RESERVE-TEMPI", nivel: 5, classe: "B", sabado: 4, nome: "Tempos de reserva" },
  { ordem: 38, id: "N2-BREAKTHROUGH", nivel: 5, classe: "B", sabado: 4, nome: "Ruptura de peões" },
  { ordem: 39, id: "N2-RETI", nivel: 5, classe: "B", sabado: 4, nome: "Manobra de Réti: o rei que faz duas coisas" },
  { ordem: 40, id: "N3-R-2P-VS-R", nivel: 5, classe: "B", sabado: 4, nome: "Torre e dois peões ligados contra torre" },
  { ordem: 41, id: "N3-SEVENTH-RANK", nivel: 5, classe: "B", sabado: 4, nome: "A sétima fila" },
  { ordem: 42, id: "N5-VANCURA", nivel: 5, classe: "B", sabado: 4, nome: "Defesa de Vancura" },
  { ordem: 43, id: "N3-R-VS-RN-PAWNS", nivel: 5, classe: "B", sabado: 4, nome: "Torre contra peão de torre e de bispo: as exceções" },
  { ordem: 44, id: "N0-2B-MATE", nivel: 5, classe: "B", sabado: 4, nome: "Dois bispos contra rei" },
  { ordem: 45, id: "N4-OPPOSITE-BISHOPS-2P", nivel: 5, classe: "B", sabado: 4, nome: "Bispos de cores opostas com dois peões" },
  { ordem: 46, id: "N4-SAME-BISHOPS", nivel: 5, classe: "B", sabado: 4, nome: "Bispo e peão contra bispo da mesma cor" },
  { ordem: 47, id: "N4-BISHOP-VS-KNIGHT", nivel: 5, classe: "B", sabado: 4, nome: "Bispo contra cavalo com um peão" },
  { ordem: 48, id: "N2-DOUBLED-ISOLATED", nivel: 5, classe: "B", sabado: 4, nome: "Peões dobrados e isolados no final de peões" },
  { ordem: 49, id: "N2-ZUGZWANG", nivel: 5, classe: "B", sabado: 4, nome: "Zugzwang: a obrigação de mover" },
];

const POR_ID = new Map(TRILHA.map((aula) => [aula.id, aula]));

/** A aula da trilha, ou `undefined` se o id não é do curso. */
export function aulaDaTrilha(id: string): AulaDaTrilha | undefined {
  return POR_ID.get(id);
}

/** As aulas de uma classe, na ordem da lista. Some na Etapa 2 do plano dos níveis. */
export function daClasse(aulas: readonly AulaDaTrilha[], classe: Classe): AulaDaTrilha[] {
  return aulas.filter((aula) => aula.classe === classe);
}

/** As aulas de um nível, na ordem da lista. É a `daClasse` do eixo novo. */
export function doNivel(aulas: readonly AulaDaTrilha[], nivel: Nivel): AulaDaTrilha[] {
  return aulas.filter((aula) => aula.nivel === nivel);
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
 * Aprendeu esta aula? A pergunta é uma só: **a aula tem prática?**
 *
 * ## O que mudou em 9/9/2026
 *
 * Ela recebia o `formato` da trilha — `completa`, `curta` ou `leitura` — e o
 * `leitura` era o que não tinha partida. Os formatos saíram, e a pergunta que
 * eles respondiam ficou: com prática, o critério é a escada; sem prática, é a
 * declaração do aluno de que leu.
 *
 * O `temPratica` **vem do arquivo da aula** (`aulasComPratica` em
 * `lib/finais/conteudo.ts`), e é isso que tira a última decisão de conteúdo da
 * tabela da trilha: a lista das 49 diz o que é curso e quando abre; o arquivo
 * da aula diz o que a aula é. Esta função continua pura — quem lê disco é quem
 * chama.
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
 * A aula sem prática continua fora da escada: não há partida para vencer, e o
 * que ela tem é a declaração do aluno, gravada em `aula_lida`.
 */
export function aprendeu(temPratica: boolean, p: ProgressoDaAula): boolean {
  if (!temPratica) return p.lida;
  return aprendida(p.escada);
}

export function estadoDaAula(temPratica: boolean, p: ProgressoDaAula): EstadoDeAula {
  if (aprendeu(temPratica, p)) return "aprendida";
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
  comPratica: ReadonlySet<string>,
): Set<string> {
  const feitas = new Set<string>();
  for (const aula of aulas) {
    if (aprendeu(comPratica.has(aula.id), progresso.get(aula.id) ?? AULA_ZERADA)) {
      feitas.add(aula.id);
    }
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
  comPratica: ReadonlySet<string>,
): AulaDaTrilha | undefined {
  return abertas.find(
    (aula) => !aprendeu(comPratica.has(aula.id), progresso.get(aula.id) ?? AULA_ZERADA),
  );
}
