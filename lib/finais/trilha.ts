import type { Nivel } from "../curso/nivel.ts";
import { aprendida, zerada, type ProgressoDaEscada } from "./escada.ts";

/**
 * A trilha de finais: **a fonte única** de quais aulas o curso tem, em que
 * nível, em que classe e em que ordem.
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
 * > com `status: "published"`.
 *
 * As duas condições respondem a perguntas diferentes, e por isso nenhuma
 * substitui a outra: a trilha diz o que é *curso* (o `content/` também guarda
 * fixture e rascunho), e o `status` diz o que passou pelo gate e está pronto
 * para uma criança. A terceira condição — "a semana dela já chegou" — saiu com
 * o eixo de semanas, que virou o eixo de níveis em 2026-09-09.
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

/*
 * **Os três formatos saíram em 9/9/2026, e com eles a coluna `formato`.**
 *
 * **Os cinco níveis moram em `lib/curso/nivel.ts`, e não aqui.** Este arquivo
 * chegou a declarar os seus, "ao lado da classe", enquanto a Etapa 2 do plano
 * dos níveis rodava no branch do repertório. As duas metades se encontraram no
 * merge de 2026-09-09: `nivel.ts` traz a escada inteira — `situacaoDoItem`,
 * `nivelDoAluno`, a prova de nível —, e duas definições do mesmo `Nivel` seriam
 * duas opiniões sobre o que é o degrau 3. Aqui ficou o `import type`, que é
 * apagado na compilação e por isso não fecha ciclo com o `import` que `nivel.ts`
 * faz de volta para pegar a `TRILHA`.
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
  /** O id do arquivo em `content/lessons/`, que é o do currículo do laboratório. */
  readonly id: string;
  readonly classe: Classe;
  /** A posição na lista das 49. Ordena a classe e não se repete. */
  readonly ordem: number;
  /**
   * O degrau da escada em que a aula mora — 1 a 5, de `lib/curso/nivel.ts`.
   *
   * **Cortado pela `ordem`, e não pela `classe`.** Quatro classes não cabem em
   * cinco níveis, e o teste que exigia "as 4 classes em 4 níveis distintos" era
   * a própria prova de que derivar da classe não escala. A `ordem` já é ordem
   * de pré-requisito: os cortes são 1–6, 7–12, 13–18, 19–34 e 35–49.
   *
   * O campo é declarado, como em `Bloco.nivel`, e pelo mesmo motivo.
   */
  readonly nivel: Nivel;
  /** Uma linha: é o que o aluno lê no cartão antes de abrir. */
  readonly nome: string;
};

/**
 * As 49 aulas, na ordem da §5 do documento.
 *
 * ## A escada de finais está oca, e o `nivel` não esconde isso
 *
 * Das 49, **uma** existe em disco — e ela é `N1-KPK`, do nível 2. Os níveis 1 e
 * 3 fecham hoje com requisito zero, pelo clamp de `fechamentoDoNivel`, e o
 * nível 1 nasce sendo tática mais repertório. O clamp torna isso honesto na
 * tela; não conserta. O caminho barato, quando alguém encarar, são os ~135 mil
 * puzzles de final CC0 já em disco que o `filtrar-puzzles.ts` sabe recortar.
 */
/**
 * O corte da §1 do documento: em que nível a `ordem` cai.
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

export const TRILHA: readonly AulaDaTrilha[] = [
  // ---------------------------------------------------------------- Nível 1  ·  FIDE até 800
  //
  // A ordem mudou em 2026-09-09, por decisão do Doug (§5 e §11.11 do documento):
  // antes de aprender a dar mate, saber com que material dá. Depois a dificuldade
  // sobe — escada (duas torres, mecânico), dama (tranca sozinha), torre (precisa
  // do rei) —, e o afogamento vem logo depois dos dois mates, que é onde ele
  // acontece.
  { ordem: 1, id: "N0-MATING-MATERIAL", nivel: 1, classe: "E", nome: "O que dá mate e o que não dá" },
  { ordem: 2, id: "N0-LADDER", nivel: 1, classe: "E", nome: "Mate da escada: duas torres, e dama e torre" },
  { ordem: 3, id: "N0-Q-MATE", nivel: 1, classe: "E", nome: "Mate de dama e rei: a técnica do L" },
  { ordem: 4, id: "N0-R-MATE", nivel: 1, classe: "E", nome: "Mate de torre e rei: a caixa" },
  { ordem: 5, id: "N0-STALEMATE", nivel: 1, classe: "E", nome: "Afogamento: como não empatar a partida ganha" },
  { ordem: 6, id: "N1-KING-ACTIVITY", nivel: 1, classe: "E", nome: "O rei é peça: use-o" },

  // ---------------------------------------------------------------- Nível 2  ·  FIDE 800–1000
  { ordem: 7, id: "N1-SQUARE", nivel: 2, classe: "D", nome: "Regra do quadrado" },
  { ordem: 8, id: "N1-DIRECT-OPPOSITION", nivel: 2, classe: "D", nome: "Oposição" },
  { ordem: 9, id: "N1-KEY-SQUARES", nivel: 2, classe: "D", nome: "Casas-chave" },
  { ordem: 10, id: "N1-KPK", nivel: 2, classe: "D", nome: "Rei e peão contra rei: o rei na frente do peão" },
  { ordem: 11, id: "N1-KPK-RANKS", nivel: 2, classe: "D", nome: "Peão na 6ª e na 7ª: quem joga decide" },
  { ordem: 12, id: "N1-ROOK-PAWN", nivel: 2, classe: "D", nome: "Peão de torre: o empate do canto" },
  // ---------------------------------------------------------------- Nível 3  ·  FIDE 1000–1200
  { ordem: 13, id: "N2-KING-MANEUVER", nivel: 3, classe: "D", nome: "Oposição além do básico: a distante" },
  { ordem: 14, id: "N4-B-VS-PAWNS", nivel: 3, classe: "D", nome: "Bispo contra peão" },
  { ordem: 15, id: "N4-N-VS-PAWNS", nivel: 3, classe: "D", nome: "Cavalo contra peão" },
  { ordem: 16, id: "N3-R-VS-PAWN", nivel: 3, classe: "D", nome: "Torre contra peão: contar, cortar, aproximar" },
  { ordem: 17, id: "N1-KING-VS-PAWNS", nivel: 3, classe: "D", nome: "Rei contra dois peões passados" },
  { ordem: 18, id: "N1-PAWNS-BLOCKADE", nivel: 3, classe: "D", nome: "Um peão segura dois: o bloqueio" },

  // ---------------------------------------------------------------- Nível 4  ·  FIDE 1200–1400
  { ordem: 19, id: "N3-LUCENA", nivel: 4, classe: "C", nome: "Lucena: a ponte" },
  { ordem: 20, id: "N3-PHILIDOR", nivel: 4, classe: "C", nome: "Filidor: a defesa da terceira fila" },
  { ordem: 21, id: "N3-ROOK-BEHIND", nivel: 4, classe: "C", nome: "Torre atrás do peão passado" },
  { ordem: 22, id: "N3-SIDE-CHECKS", nivel: 4, classe: "C", nome: "Lado curto, lado longo" },
  { ordem: 23, id: "N3-CUT-FILE", nivel: 4, classe: "C", nome: "Cortar o rei pela coluna" },
  { ordem: 24, id: "N3-DEFENSIVE-EXCEPTIONS", nivel: 4, classe: "C", nome: "Defesa passiva: quando ela segura" },
  { ordem: 25, id: "N3-R-VS-2P", nivel: 4, classe: "C", nome: "Torre contra dois peões" },
  { ordem: 26, id: "N2-OUTSIDE-PASSER", nivel: 4, classe: "C", nome: "Peão passado distante" },
  { ordem: 27, id: "N2-PROTECTED-PASSER", nivel: 4, classe: "C", nome: "Peão passado protegido" },
  { ordem: 28, id: "N1-K2P-VS-K", nivel: 4, classe: "C", nome: "Rei e dois peões contra rei: ligados e dobrados" },
  { ordem: 29, id: "N2-PAWN-RACES", nivel: 4, classe: "C", nome: "Corrida de peões: quem promove primeiro" },
  { ordem: 30, id: "N4-Q-VS-PAWN", nivel: 4, classe: "C", nome: "Dama contra peão na 7ª, e as exceções" },
  { ordem: 31, id: "N4-WRONG-BISHOP", nivel: 4, classe: "C", nome: "Bispo errado com peão de torre" },
  { ordem: 32, id: "N4-OPPOSITE-BISHOPS", nivel: 4, classe: "C", nome: "Bispos de cores opostas: a fortaleza" },
  { ordem: 33, id: "N4-N-AND-ROOK-PAWN", nivel: 4, classe: "C", nome: "Cavalo e peão de torre contra rei" },
  { ordem: 34, id: "N4-Q-VS-ROOK", nivel: 4, classe: "C", nome: "Dama contra torre: o básico" },

  // ---------------------------------------------------------------- Nível 5  ·  FIDE 1400+
  { ordem: 35, id: "N2-TRIANGULATION", nivel: 5, classe: "B", nome: "Triangulação" },
  { ordem: 36, id: "N2-OUTFLANKING", nivel: 5, classe: "B", nome: "Flanquear o rei" },
  { ordem: 37, id: "N2-RESERVE-TEMPI", nivel: 5, classe: "B", nome: "Tempos de reserva" },
  { ordem: 38, id: "N2-BREAKTHROUGH", nivel: 5, classe: "B", nome: "Ruptura de peões" },
  { ordem: 39, id: "N2-RETI", nivel: 5, classe: "B", nome: "Manobra de Réti: o rei que faz duas coisas" },
  { ordem: 40, id: "N3-R-2P-VS-R", nivel: 5, classe: "B", nome: "Torre e dois peões ligados contra torre" },
  { ordem: 41, id: "N3-SEVENTH-RANK", nivel: 5, classe: "B", nome: "A sétima fila" },
  { ordem: 42, id: "N5-VANCURA", nivel: 5, classe: "B", nome: "Defesa de Vancura" },
  { ordem: 43, id: "N3-R-VS-RN-PAWNS", nivel: 5, classe: "B", nome: "Torre contra peão de torre e de bispo: as exceções" },
  { ordem: 44, id: "N0-2B-MATE", nivel: 5, classe: "B", nome: "Dois bispos contra rei" },
  { ordem: 45, id: "N4-OPPOSITE-BISHOPS-2P", nivel: 5, classe: "B", nome: "Bispos de cores opostas com dois peões" },
  { ordem: 46, id: "N4-SAME-BISHOPS", nivel: 5, classe: "B", nome: "Bispo e peão contra bispo da mesma cor" },
  { ordem: 47, id: "N4-BISHOP-VS-KNIGHT", nivel: 5, classe: "B", nome: "Bispo contra cavalo com um peão" },
  { ordem: 48, id: "N2-DOUBLED-ISOLATED", nivel: 5, classe: "B", nome: "Peões dobrados e isolados no final de peões" },
  { ordem: 49, id: "N2-ZUGZWANG", nivel: 5, classe: "B", nome: "Zugzwang: a obrigação de mover" },
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
 * As aulas abertas: as da trilha que têm JSON publicado.
 *
 * **Perdeu o parâmetro de semana em 2026-09-09.** A data deixou de trancar
 * qualquer coisa, e o nível não tranca rota — a trava é mole. Sobrou o único
 * motivo que sempre foi de verdade: a aula existir em disco.
 *
 * `publicadas` vem do disco (`lib/finais/conteudo.ts`), e é por isso que ela
 * entra como parâmetro em vez de ser lida aqui: assim esta função continua
 * pura, e o teste dela não precisa de `content/` montado de um jeito
 * específico.
 */
/** As aulas de um nível, na ordem da lista. É a `daClasse` do eixo novo. */
export function doNivel(aulas: readonly AulaDaTrilha[], nivel: Nivel): AulaDaTrilha[] {
  return aulas.filter((aula) => aula.nivel === nivel);
}

export function aulasAbertas(publicadas: ReadonlySet<string>): AulaDaTrilha[] {
  return TRILHA.filter((aula) => publicadas.has(aula.id));
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
