/**
 * O que o botão do fim do move trainer da aula faz — e o que ele diz.
 *
 * **O defeito que isto conserta (18/9/2026).** Na aula A da Francesa o move trainer é a última
 * etapa, e o botão dizia "Terminar o move trainer": o clique marcava a etapa e não levava a lugar
 * nenhum. Medido no navegador: dois cliques, mesma URL, mesmo botão. A única saída era o link
 * "← Francesa 3.Bd3", cinza, 16 px de altura, no canto de cima — na última tela que todo aluno vê.
 *
 * **Por que dois cliques, e não um.** O primeiro clique é o que conclui a aula: é nele que o
 * servidor responde "concluída" e a comemoração acontece (faixa "Aula concluída!" e confete). Sair
 * da página no mesmo clique cortaria a comemoração e arriscaria cortar a gravação no meio. Então o
 * primeiro clique conclui, e o botão muda de nome na hora — que é também a resposta que faltava:
 * o aluno vê que o clique fez alguma coisa. O segundo leva de volta às aulas.
 *
 * Puro, sem React: o `LessonPlayer` só executa a ação que sai daqui.
 */

export type FimDoTreinador =
  /** Há etapa depois: o botão leva a ela, com o rótulo dela. */
  | { readonly acao: "etapa"; readonly rotulo: string }
  /** Última etapa, ainda não marcada: o clique conclui a aula. */
  | { readonly acao: "concluir"; readonly rotulo: string }
  /** Última etapa, já marcada: o clique sai da aula. */
  | { readonly acao: "sair"; readonly rotulo: string };

export function fimDoTreinador({ proxima, feita }: {
  /** O rótulo do botão da etapa seguinte, ou `null` quando o move trainer é a última. */
  proxima: string | null;
  /** Esta etapa já foi marcada como feita nesta rodada. */
  feita: boolean;
}): FimDoTreinador {
  if (proxima !== null) return { acao: "etapa", rotulo: proxima };
  return feita ? { acao: "sair", rotulo: "Voltar às aulas" } : { acao: "concluir", rotulo: "Terminar a aula" };
}
