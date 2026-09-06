import { chaveDe } from "./chave.ts";
import type { Puzzle } from "./puzzles.ts";

/**
 * Como o tema é servido: aquecimento, série e prova.
 *
 * O desenho é o do `lichess.org/practice`, com uma diferença que importa para
 * um aluno de 8 a 15 anos: **a série sobe de dificuldade sozinha**. Ele não
 * escolhe o nível, e não precisa saber que existe um.
 *
 * - **Aquecimento** (5): os mais fáceis da faixa mais baixa, e de preferência
 *   de um lance só. Servem para o olho pegar o padrão antes de o cálculo
 *   entrar.
 * - **Série** (24): o tema em rating crescente, do começo ao fim da faixa do
 *   bloco. É aqui que o aluno passa a maior parte do tempo.
 * - **Prova** (10): o tema **misturado** com os que ele já viu, fora de ordem
 *   de rating. Reconhecer o motivo sem saber o nome dele é o que acontece na
 *   partida; uma série de 24 garfos seguidos treina outra coisa.
 */
export type Etapa = "aquecimento" | "serie" | "prova";

export const ETAPAS: readonly Etapa[] = ["aquecimento", "serie", "prova"];

export const METAS: Record<Etapa, number> = {
  aquecimento: 5,
  serie: 24,
  prova: 10,
};

/**
 * Quantos puzzles um tema tem, do aquecimento ao fim da prova.
 *
 * Mora aqui, ao lado de `ETAPAS` e `METAS`, e não em `lib/tatica/progresso.ts`
 * — que o definia até a F2 — por um motivo prático: `progresso.ts` é
 * `server-only`, e o mapa da trilha (`lib/curso/mapa.ts`) precisa deste número
 * numa função pura, com teste que roda no `npm test`. Importá-lo de lá
 * estouraria fora do servidor; copiá-lo seria uma segunda opinião sobre o
 * tamanho de um tema. `progresso.ts` continua reexportando, então nenhum
 * `import` já escrito muda.
 */
export const PUZZLES_POR_TEMA = ETAPAS.reduce((soma, etapa) => soma + METAS[etapa], 0);

export const NOME_DA_ETAPA: Record<Etapa, string> = {
  aquecimento: "Aquecimento",
  serie: "Série",
  prova: "Prova",
};

/**
 * Os modos que viram linha no banco: as três etapas do tema, mais a **revisão
 * do dia**, que não pertence a tema nenhum.
 *
 * `Modo` é mais largo que `Etapa` de propósito, e `ETAPAS`/`METAS`/`etapaAtual`
 * continuam falando só de `Etapa`: são elas que definem o caminho de um tema
 * (aquecimento → série → prova) e o total `PUZZLES_POR_TEMA`. A revisão
 * repete puzzles já vistos, em dias diferentes, e não pode mover a barra de
 * tema nenhum — `progressoPorTema` já descarta modos fora de `ETAPAS`.
 */
export type Modo = Etapa | "revisao";

export const MODOS_GRAVAVEIS: readonly Modo[] = [...ETAPAS, "revisao"];

export const NOME_DO_MODO: Record<Modo, string> = {
  ...NOME_DA_ETAPA,
  revisao: "Revisão do dia",
};

/** Quantos puzzles a revisão do dia serve de uma vez. */
export const REVISAO_POR_DIA = 10;

/** Quantos puzzles o aluno já tentou em cada etapa **deste** tema. */
export type Feitos = Record<Etapa, number>;

/* ------------------------------------------------------------------ *
 * Os errados voltam na prova
 * ------------------------------------------------------------------ */

/** Uma linha de `tentativas_puzzle` deste tema, no que a prova precisa saber. */
export type LinhaDoTema = {
  readonly puzzle_id: string;
  readonly modo: string;
  readonly acertou: boolean;
};

/**
 * Os ids que o aluno errou no aquecimento ou na série **e ainda não tentou na
 * prova**, na ordem em que apareceram. É o que a tela promete desde o começo
 * ("os que você errou voltam misturados na prova deste tema") e que, até a
 * F2, o sorteio não cumpria: `sortear` exclui tudo o que já foi visto.
 *
 * "Ainda não tentou na prova" é o que torna a regra estável a um F5 no meio da
 * prova: o errado que já ganhou linha `prova` sai da lista, e os outros
 * continuam entrando primeiro.
 */
export function idsErradosParaAProva(linhas: readonly LinhaDoTema[]): string[] {
  const naProva = new Set(linhas.filter((l) => l.modo === "prova").map((l) => l.puzzle_id));
  const vistos = new Set<string>();
  const errados: string[] = [];
  for (const l of linhas) {
    if (l.acertou || l.modo === "prova" || l.modo === "revisao") continue;
    if (naProva.has(l.puzzle_id) || vistos.has(l.puzzle_id)) continue;
    vistos.add(l.puzzle_id);
    errados.push(l.puzzle_id);
  }
  return errados;
}

/** Quantas vagas da prova são dos errados: até metade dela. */
export function vagasParaErrados(faltam: number, errados: number): number {
  return Math.max(0, Math.min(errados, Math.ceil(faltam / 2)));
}

/** Sem id repetido, mantendo a primeira ocorrência. */
export function semRepetidos<T extends Puzzle>(puzzles: readonly T[]): T[] {
  const vistos = new Set<string>();
  return puzzles.filter((p) => (vistos.has(p.id) ? false : (vistos.add(p.id), true)));
}

/** A etapa em que o aluno está, ou `null` quando o tema acabou. */
export function etapaAtual(feitos: Feitos): Etapa | null {
  return ETAPAS.find((etapa) => feitos[etapa] < METAS[etapa]) ?? null;
}

export function quantosFaltam(etapa: Etapa, feitos: Feitos): number {
  return Math.max(0, METAS[etapa] - feitos[etapa]);
}

/**
 * Sorteia `quantidade` puzzles para **este** aluno, sem repetir o que ele já viu.
 *
 * A semente é o id do aluno: dois alunos lado a lado no mesmo tema veem séries
 * diferentes, e o mesmo aluno que recarrega a página vê a mesma série de novo
 * — o sorteio é determinístico, não aleatório. Sem isso, um F5 no meio da
 * série trocaria os 24 puzzles e o progresso viraria contagem de nada.
 *
 * Ordenar por `chaveDe(semente + id)` e cortar é uma amostra uniforme sobre um
 * conjunto que já está inteiro na memória — o mesmo truque do recorte do CSV,
 * onde ele existia porque o conjunto **não** cabia.
 *
 * O `fonte` com dois braços é o fim do banco: quando não sobra puzzle novo
 * bastante, o aluno revê os antigos em vez de receber uma série curta. Com
 * 2.000 por faixa e 24 por série, isso é o ano que vem.
 */
export function sortear<T extends Puzzle>(
  candidatos: readonly T[],
  quantidade: number,
  semente: string,
  jaVistos: ReadonlySet<string>,
): T[] {
  const livres = candidatos.filter((p) => !jaVistos.has(p.id));
  const fonte = livres.length >= quantidade ? livres : candidatos;
  return [...fonte]
    .sort((a, b) => chaveDe(semente + a.id) - chaveDe(semente + b.id))
    .slice(0, quantidade);
}

/** Do mais fácil ao mais difícil. O desempate por id é o que torna estável. */
export function emOrdemDeRating<T extends Puzzle>(puzzles: readonly T[]): T[] {
  return [...puzzles].sort((a, b) => a.rating - b.rating || (a.id < b.id ? -1 : 1));
}

/** Fora de ordem, do mesmo jeito para o mesmo aluno. É a ordem da prova. */
export function misturar<T extends Puzzle>(puzzles: readonly T[], semente: string): T[] {
  return [...puzzles].sort(
    (a, b) => chaveDe(`${semente}:${a.id}`) - chaveDe(`${semente}:${b.id}`),
  );
}

/**
 * Os candidatos ao aquecimento: a faixa mais baixa do tema, e dentro dela os
 * de um lance só.
 *
 * O `oneMove`/`short` é etiqueta do próprio Lichess. Quando o tema não tem
 * nenhum — um `mateIn3` nunca é de um lance — a faixa inteira serve, e o
 * aquecimento vira "os mais fáceis que existem aqui".
 */
export function candidatosDeAquecimento<T extends Puzzle>(faixaMaisFacil: readonly T[]): readonly T[] {
  const curtos = faixaMaisFacil.filter(
    (p) => p.temas.includes("oneMove") || p.temas.includes("short"),
  );
  return curtos.length >= METAS.aquecimento ? curtos : faixaMaisFacil;
}
