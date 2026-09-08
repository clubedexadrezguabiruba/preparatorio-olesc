import { idsDeAula, lerAula } from "../finais/conteudo.ts";
import { NIVEIS } from "../curso/trilha.ts";
import { capituloDaAula, moduloDaAula, volumeDaAula, type Lesson } from "../lesson/schema.ts";

/**
 * O índice das aulas de meio-jogo — o que as telas e o mapa precisam saber
 * sobre elas sem abrir o arquivo inteiro.
 *
 * Substituiu, em 2026-09-08, o arquivo que exportava `DICAS` a partir de
 * `content/meio-jogo.json`. O módulo deixou de ter formato próprio: uma aula de
 * meio-jogo é uma aula do mesmo motor de finais, mora em `content/lessons/` com
 * as outras, e por isso **o leitor é o de finais** (`lerAula`, `idsDeAula`).
 * O que sobra aqui é só o que é específico do módulo: separar os ids `M` dos
 * `N`, e dizer em que nível da trilha cada volume da série cai.
 */

/** O cabeçalho de uma aula de meio-jogo, para lista e mapa. */
export type AulaDeMeioJogo = {
  id: string;
  titulo: string;
  /** O volume da série (1 a 6) e o capítulo dentro dele. */
  volume: number;
  capitulo: number;
  /** Quantos exercícios chegam ao aluno nesta aula. */
  exercicios: number;
  /** A régua do livro: quantos pontos passam, de quantos. */
  aprovacao: { minimo: number; maximo: number } | null;
  status: Lesson["status"];
  /** O nível da trilha em que ela cai — ver `nivelDoVolume`. */
  nivel: string;
};

/**
 * Em que nível da trilha cai um volume da série.
 *
 * A derivação, para não parecer número escolhido a esmo: a própria série tem
 * **dois** níveis declarados pelo autor — laranja ("Tigersprung auf DWZ 1500",
 * volumes 1 a 3) e azul ("DWZ 1800", volumes 4 a 6) —, e dentro de cada um a
 * ordem dos volumes é a graduação dele. Os três laranja entram nos três
 * primeiros degraus da trilha, na ordem; os três azuis, todos no último, que é
 * o que a faixa 1400–1800 cobre aqui.
 *
 * Não é o rating do aluno: é onde a aula aparece na `/trilha`. Um aluno de 900
 * pode abrir uma aula do volume 3 se quiser — o meio-jogo não tem sábado.
 */
export function nivelDoVolume(volume: number): string {
  const indice = Math.min(Math.max(volume, 1), NIVEIS.length) - 1;
  return NIVEIS[indice].id;
}

/** Os ids das aulas de meio-jogo, em ordem — que é a ordem da série. */
export function idsDeMeioJogo(): string[] {
  return idsDeAula().filter((id) => moduloDaAula(id) === "meio-jogo").sort();
}

/**
 * O índice de todas as aulas de meio-jogo, na ordem da série.
 *
 * **Devolve rascunho junto**, como `indiceDeAulas` de finais: quem decide o que
 * o aluno enxerga é a tela, e o rascunho precisa aparecer como "em escrita"
 * para o aluno saber que a aula existe e ainda não foi escrita — é o padrão de
 * `/finais`.
 */
export function indiceDeMeioJogo(): AulaDeMeioJogo[] {
  return idsDeMeioJogo().flatMap((id) => {
    const aula = lerAula(id);
    if (!aula) return [];
    const exercicios = aula.stages.exercises;
    return [
      {
        id: aula.id,
        titulo: aula.title,
        volume: volumeDaAula(id) ?? 1,
        capitulo: capituloDaAula(id) ?? 0,
        exercicios: exercicios?.items.length ?? 0,
        aprovacao: exercicios
          ? { minimo: exercicios.aprovacao.minimo, maximo: exercicios.aprovacao.maximo }
          : null,
        status: aula.status,
        nivel: nivelDoVolume(volumeDaAula(id) ?? 1),
      },
    ];
  });
}

/** Os ids das aulas de meio-jogo com `status: "published"`. */
export function meioJogoPublicado(): Set<string> {
  return new Set(indiceDeMeioJogo().filter((a) => a.status === "published").map((a) => a.id));
}
