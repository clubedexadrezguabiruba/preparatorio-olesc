/**
 * Frases do editor que dependem de uma contagem. Moram aqui, e não no componente, para a
 * concordância ter teste: "1 aviso, que não impede" e "7 avisos, que não impedem".
 */

const PARTES = [
  { tipo: "introducao", uma: "a introdução", varias: (n: number) => `as ${n} introduções` },
  { tipo: "capitulo", uma: "o capítulo", varias: (n: number) => `os ${n} capítulos` },
  { tipo: "treino", uma: "o treino", varias: (n: number) => `os ${n} treinos` },
  { tipo: "pratica", uma: "a prática", varias: (n: number) => `as ${n} práticas` },
] as const;

/**
 * O que "fazer a aula inteira como aluno" percorre, contado no fluxo: nenhuma, uma ou várias
 * práticas (trava 9), e o mesmo para as outras partes. "A introdução, os 3 capítulos e a prática".
 */
export function oQueAAulaInteiraTem(fluxo: ReadonlyArray<{ tipo: string }>): string {
  const partes = PARTES.flatMap((parte) => {
    const n = fluxo.filter((etapa) => etapa.tipo === parte.tipo).length;
    return n === 0 ? [] : [n === 1 ? parte.uma : parte.varias(n)];
  });
  if (!partes.length) return "A aula inteira";
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}`;
  return lista[0].toUpperCase() + lista.slice(1);
}

/** A linha de cima do resultado da conferência. */
export function resumoDaConferencia(conferencia: {
  impedimento?: string | null;
  vencida?: boolean;
  podePublicar: boolean;
  erros: number;
  avisos: number;
}): string {
  if (conferencia.impedimento) return `Não deu para conferir: ${conferencia.impedimento}.`;
  if (conferencia.vencida) return "A aula mudou — conferindo de novo…";
  if (conferencia.podePublicar) {
    return `Pode publicar.${conferencia.avisos ? ` ${conferencia.avisos} ${conferencia.avisos === 1 ? "aviso, que não impede" : "avisos, que não impedem"}.` : ""}`;
  }
  return `Ainda não dá para publicar: ${conferencia.erros} ${conferencia.erros === 1 ? "problema impede" : "problemas impedem"}.${conferencia.avisos ? ` E ${conferencia.avisos} ${conferencia.avisos === 1 ? "aviso" : "avisos"}.` : ""}`;
}
