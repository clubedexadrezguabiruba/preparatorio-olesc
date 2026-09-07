import { SEMANAS, semanaAtual, type Semana } from "./calendario.ts";

/**
 * Qual semana a tela desenha — a de hoje, ou a que o professor pediu.
 *
 * ## O problema que ela resolve
 *
 * O site tranca por **data**, e por nada mais: `semanaAtual()` lê o relógio de
 * Guabiruba e decide o que o painel lista, quais aulas de finais estão abertas
 * e o que a trilha mostra como "ainda não chegou". Não há trava por rating, por
 * progresso, nem coluna nenhuma no perfil que libere conteúdo — quem quiser
 * conferir isso encontra a conta inteira em `lib/curso/calendario.ts`.
 *
 * O efeito colateral é que **ninguém consegue ensaiar a semana 3 antes dela**.
 * O plano do preparatório manda o professor fazer a tarefa da semana inteira
 * antes de cada sábado; até aqui ele só conseguia ensaiar a semana em que o
 * calendário já estava. A tarefa de 26 de setembro só ficava visível no dia 26,
 * que é tarde demais para descobrir que ela promete uma aula que não existe —
 * e foi exatamente esse o defeito que o Bloco 1 achou nos quatro `detalhe`.
 *
 * ## Por que professor, e não uma conta de teste marcada
 *
 * A alternativa era uma coluna `teste` em `perfis`, ligada numa conta de aluno.
 * Ela custaria uma migration e criaria um segundo jeito de uma conta ser
 * especial, ao lado do `papel` que já existe — e duas listas de quem pode mais
 * divergem no dia em que alguém lembra de uma e esquece a outra.
 *
 * O `papel` já carrega esse sentido: é ele que abre a bancada de finais
 * (`app/finais/page.tsx`) e a área do professor. Ver as quatro semanas é a
 * mesma espécie de permissão, e mora no mesmo lugar.
 *
 * ## O aluno não passa por aqui, e é o ponto inteiro
 *
 * Um aluno que digitar `?semana=4` recebe a semana de verdade. A conferência é
 * de papel, não de presença do parâmetro: se ela fosse "veio o parâmetro, use",
 * o primeiro aluno que copiasse a URL do professor no grupo do WhatsApp abriria
 * o preparatório inteiro para a turma toda.
 */

export type SemanaDaTela = {
  /** A semana que a tela vai desenhar. */
  readonly semana: Semana;
  /** A de verdade, a do calendário — o professor precisa saber qual é. */
  readonly real: Semana;
  /** As duas são diferentes: a tela está simulando. */
  readonly simulando: boolean;
};

/** O nome do parâmetro na URL. Escrito uma vez e importado, para não divergir. */
export const PARAMETRO_DA_SEMANA = "semana";

/**
 * A semana escolhida, com o pedido do professor obedecido e o do aluno não.
 *
 * `pedida` vem do `searchParams` do Next, que entrega `string | string[] |
 * undefined` — a forma de array aparece quando a URL repete o parâmetro
 * (`?semana=2&semana=3`), e ela cai no mesmo lugar que o lixo: a semana real.
 */
export function semanaDaTela(
  papel: "aluno" | "professor",
  pedida: string | string[] | undefined,
  real: Semana = semanaAtual(),
): SemanaDaTela {
  if (papel !== "professor" || typeof pedida !== "string") {
    return { semana: real, real, simulando: false };
  }
  const numero = Number(pedida);
  const escolhida = SEMANAS.find((s) => s === numero);
  if (escolhida === undefined) return { semana: real, real, simulando: false };
  return { semana: escolhida, real, simulando: escolhida !== real };
}
