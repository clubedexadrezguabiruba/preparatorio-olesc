/**
 * A trava por aula do curso de abertura — decisão do Doug de 17/9/2026, depois do feedback de um
 * aluno testando a Francesa 3.Bd3.
 *
 * ## O defeito que ela fecha
 *
 * Clicar na Francesa em `/aberturas` abria o move trainer. O aluno caía decorando linhas cujo porquê
 * ainda não tinha ouvido — e o curso existe justamente para que o move trainer seja a **última**
 * etapa (regra do comentário opcional, `AGENTS.md`). A §18.1 dizia "aulas de abertura não se trancam
 * entre si"; a emenda de 17/9 inverte isso para o aluno:
 *
 * - **as aulas vão em ordem** — B abre quando A está concluída, e assim por diante (a D, sem move
 *   trainer, também conta: é a partida-modelo que a E+F revisa);
 * - **as linhas do move trainer da aula X destravam ao concluir X** — a linha é da **primeira** aula
 *   que a lista, então a E+F (que revisa as 19) só é dona das que nenhuma outra traz;
 * - **o professor é sempre livre**, e a chave {@link TRAVA_POR_AULA} desliga tudo numa linha.
 *
 * ## Por que a trava é dura, e mora no servidor
 *
 * Esconder o botão não tranca: o `?linha=` é uma URL, e a gravação é uma server action que qualquer
 * aba chama. Então `gravarTreino` recusa a linha trancada — e aí aparece a circularidade: a aula A só
 * conclui quando o move trainer **dela** gravou as linhas, que estão trancadas até A concluir. A
 * saída é o `deAula`: a gravação que vem de dentro da aula liberada, com rodada aberta, e para uma
 * linha que aquela aula lista, passa. Ver {@link podeGravarLinha}.
 *
 * Módulo puro — sem banco e sem disco —, para as quatro regras terem teste: quem lê o banco e
 * monta os conjuntos é `trava-banco.ts`.
 */

/**
 * A chave. `true` tranca; `false` devolve o curso ao estado de antes de 17/9 (tudo aberto), sem
 * caçar `if` pelas telas — o mesmo desenho de `TRANCA_DURA` em `lib/curso/nivel.ts`.
 */
export const TRAVA_POR_AULA = true;

/** O que a trava precisa saber de uma aula: o id e as linhas dos move trainers. Em ordem A → E+F. */
export type AulaTravada = { readonly id: string; readonly linhaIds: readonly string[] };

export type QuemPede = { readonly professor: boolean };

export type EstadoDaAulaNaTrilha =
  /** Concluída ao menos uma vez. */
  | "concluida"
  /** A primeira não concluída que está aberta: o "estude agora". */
  | "agora"
  /** Aberta, sem ser a da vez — só acontece para o professor, ou com a chave desligada. */
  | "aberta"
  | "trancada";

const livre = (quem: QuemPede, trava: boolean) => !trava || quem.professor;

/** A aula dona da linha: a primeira, em ordem, cujo move trainer a lista. `null` se nenhuma. */
export function donaDaLinha<T extends AulaTravada>(aulas: readonly T[], linhaId: string): T | null {
  return aulas.find((aula) => aula.linhaIds.includes(linhaId)) ?? null;
}

/** A aula pode ser aberta? Todas as anteriores concluídas. Aula fora da lista não é desta regra. */
export function aulaLiberada(
  aulas: readonly AulaTravada[],
  aulaId: string,
  concluidas: ReadonlySet<string>,
  quem: QuemPede,
  trava = TRAVA_POR_AULA,
): boolean {
  if (livre(quem, trava)) return true;
  const indice = aulas.findIndex((aula) => aula.id === aulaId);
  if (indice < 0) return true;
  return aulas.slice(0, indice).every((aula) => concluidas.has(aula.id));
}

/** A linha está aberta para o treino fora da aula? A aula dona concluída — ou nenhuma aula a lista. */
export function linhaLiberada(
  aulas: readonly AulaTravada[],
  linhaId: string,
  concluidas: ReadonlySet<string>,
  quem: QuemPede,
  trava = TRAVA_POR_AULA,
): boolean {
  if (livre(quem, trava)) return true;
  const dona = donaDaLinha(aulas, linhaId);
  return dona === null || concluidas.has(dona.id);
}

/**
 * O servidor aceita gravar esta passada?
 *
 * Sim se a linha está liberada (a aula dona concluída, ou o professor, ou a chave desligada). Senão,
 * só quando a gravação vem **de dentro** de uma aula (`deAula`) que: está liberada, tem rodada aberta
 * e lista a linha no move trainer. Um `deAula` inventado para uma aula trancada, ou para uma linha
 * que ela não traz, cai no "não".
 */
export function podeGravarLinha({
  aulas,
  linhaId,
  concluidas,
  quem,
  deAula,
  rodadasAbertas,
  trava = TRAVA_POR_AULA,
}: {
  aulas: readonly AulaTravada[];
  linhaId: string;
  concluidas: ReadonlySet<string>;
  quem: QuemPede;
  deAula?: string;
  /** As aulas com rodada em andamento (`aula_rodada.concluida_em` nulo). */
  rodadasAbertas: ReadonlySet<string>;
  trava?: boolean;
}): boolean {
  if (linhaLiberada(aulas, linhaId, concluidas, quem, trava)) return true;
  if (!deAula) return false;
  const aula = aulas.find((item) => item.id === deAula);
  return (
    aula !== undefined &&
    aula.linhaIds.includes(linhaId) &&
    rodadasAbertas.has(deAula) &&
    aulaLiberada(aulas, deAula, concluidas, quem, trava)
  );
}

/** Os ids das linhas trancadas deste curso — as que as contagens deixam de fora. */
export function linhasTrancadas(
  aulas: readonly AulaTravada[],
  concluidas: ReadonlySet<string>,
  quem: QuemPede,
  trava = TRAVA_POR_AULA,
): Set<string> {
  if (livre(quem, trava)) return new Set();
  const ids = new Set(aulas.flatMap((aula) => aula.linhaIds));
  return new Set([...ids].filter((id) => !linhaLiberada(aulas, id, concluidas, quem, trava)));
}

/**
 * Para onde mandar quem abriu uma aula trancada pela URL: a página da abertura (`voltar`), onde o
 * cadeado diz o que falta. `null` quando a aula pode abrir.
 */
export function destinoDaAulaTrancada(
  aulas: readonly AulaTravada[],
  aulaId: string,
  concluidas: ReadonlySet<string>,
  quem: QuemPede,
  voltar: string,
  trava = TRAVA_POR_AULA,
): string | null {
  return aulaLiberada(aulas, aulaId, concluidas, quem, trava) ? null : voltar;
}

/** O estado de cada aula na linha do tempo da página da abertura, na ordem de `aulas`. */
export function estadoDasAulas(
  aulas: readonly AulaTravada[],
  concluidas: ReadonlySet<string>,
  quem: QuemPede,
  trava = TRAVA_POR_AULA,
): EstadoDaAulaNaTrilha[] {
  let jaTemAgora = false;
  return aulas.map((aula) => {
    if (concluidas.has(aula.id)) return "concluida";
    if (!aulaLiberada(aulas, aula.id, concluidas, quem, trava)) return "trancada";
    if (jaTemAgora) return "aberta";
    jaTemAgora = true;
    return "agora";
  });
}
