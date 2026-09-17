/**
 * A progressão da aula de abertura por vez — regras 16 e 17 do curso de abertura (especificação
 * §18.1, decisões do Doug de 16/9/2026).
 *
 * - **1ª vez:** todas as etapas, na ordem. O aluno volta e fica à vontade; avançar exige a etapa
 *   atual feita.
 * - **2ª vez:** a mesma ordem, e **Pular** na explicação (introdução e capítulo). Parada, treino
 *   guiado e move trainer não se pulam.
 * - **3ª vez em diante:** a aula abre numa tela que oferece o move trainer direto; nada trava.
 *
 * Uma **rodada** é uma passada pela aula, do começo até a conclusão. A vez é o número de rodadas
 * concluídas mais um. Módulo puro: o player e o servidor usam as mesmas funções.
 */

export type TipoDaEtapa = "introducao" | "capitulo" | "treino" | "pratica" | "treinador";
export type EtapaDaRodada = { id: string; tipo: TipoDaEtapa };

export type RodadaDaAula = {
  /** 1, 2, 3… — a vez que o aluno faz esta aula. */
  vez: number;
  /** Os ids das etapas feitas nesta rodada. */
  feitas: string[];
};

/** A primeira etapa ainda não feita, ou o fim da aula. É onde a aula reabre (regra 13). */
export function primeiraPendente(etapas: readonly EtapaDaRodada[], feitas: readonly string[]): number {
  const indice = etapas.findIndex((etapa) => !feitas.includes(etapa.id));
  return indice < 0 ? etapas.length : indice;
}

/** A aba `indice` pode ser aberta? Até a 2ª vez, só as feitas e a primeira pendente. */
export function podeAbrir(rodada: RodadaDaAula, etapas: readonly EtapaDaRodada[], indice: number): boolean {
  if (rodada.vez >= 3) return true;
  return indice <= primeiraPendente(etapas, rodada.feitas);
}

/** A etapa pode ser pulada? Só a explicação, e só da 2ª vez em diante. */
export function podePular(rodada: RodadaDaAula, etapa: EtapaDaRodada): boolean {
  return rodada.vez >= 2 && (etapa.tipo === "introducao" || etapa.tipo === "capitulo");
}

/** A tela de entrada da 3ª vez: só quando a aula tem move trainer. */
export function temAtalhoDoTreinador(rodada: RodadaDaAula, etapas: readonly EtapaDaRodada[]): boolean {
  return rodada.vez >= 3 && etapas.some((etapa) => etapa.tipo === "treinador");
}

/**
 * A rodada está concluída? Até a 2ª vez, com todas as etapas feitas (pular conta como feita). Da 3ª
 * em diante, basta o move trainer — é o atalho que a regra 16 dá; aula sem move trainer (a partida
 * modelo) continua pedindo tudo.
 */
export function rodadaConcluida(rodada: RodadaDaAula, etapas: readonly EtapaDaRodada[]): boolean {
  const feitas = new Set(rodada.feitas);
  const treinadores = etapas.filter((etapa) => etapa.tipo === "treinador");
  if (rodada.vez >= 3 && treinadores.length) return treinadores.every((etapa) => feitas.has(etapa.id));
  return etapas.length > 0 && etapas.every((etapa) => feitas.has(etapa.id));
}
