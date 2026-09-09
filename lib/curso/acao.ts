import { aprendeu, AULA_ZERADA } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import {
  aulasDoNivel,
  fechamentoDoNivel,
  temaFechado,
  temasDoNivel,
  type Nivel,
  type ProgressoParaONivel,
} from "./nivel.ts";

/**
 * **A única resposta do site para "o que eu faço agora?".**
 *
 * ## O defeito que este arquivo existe para matar
 *
 * Até 2026-09-09 o painel dava **três** respostas para essa pergunta, todas
 * corretas segundo funções diferentes, e as três na mesma tela:
 *
 * ```
 * Próximo passo    →  "Garfo"                (proximoPasso, lib/curso/nivel.ts)
 * Hoje · 1 Tática  →  "Revisão: 5 puzzles"   (o cartão Hoje, a partir de 1)
 * Hoje · 2 Finais  →  "Revisar: K+P contra K"
 * ```
 *
 * Eram três divergências, não uma:
 *
 * 1. **O limiar.** `proximoPasso` só oferecia a revisão de tática acima de
 *    `REVISAO_ANTES_DO_AVANCO = 20` vencidos; o cartão Hoje a oferecia a partir
 *    de 1. Entre 1 e 20, as duas telas apontavam para lugares diferentes.
 * 2. **A revisão de finais não existia** para `proximoPasso`: ele recebia só a
 *    contagem de tática.
 * 3. **A partida do dia** também não.
 *
 * Aqui o limiar morre. A fila de revisão vem antes de conteúdo novo **a partir
 * do primeiro item vencido**, porque é isso que a repetição espaçada quer
 * dizer: um item vencido é um item que está sendo esquecido agora, e adiar a
 * revisão para juntar vinte é escolher esquecer dezenove.
 *
 * ## O que ficou de fora, e por quê
 *
 * **A partida não entra na fila.** Ela é a última coisa do dia, acontece no
 * chess.com e o site não a mede — ela continua sendo a caixa que o aluno marca.
 * Pôr "jogue uma partida" como *a* ação do site seria mandar o aluno embora do
 * site. Ela conta minutos (`lib/curso/hoje.ts`), e é lá que ela aparece.
 *
 * ## Por que a frase mora aqui, e não na tela
 *
 * Porque a tela que escreve a própria frase é a tela que discorda da outra —
 * que é o defeito acima. O texto é dado, como `NIVEL[n].resumo` e
 * `CLASSE[c].nome` já são. Uma ação, um motivo, um lugar.
 *
 * ## Puro
 *
 * Sem Supabase, sem relógio, sem `server-only`: entra o que a página já leu,
 * sai a ação. Mesmo padrão de `fechamentoDoNivel`, e pelo mesmo motivo — é o
 * que permite ao `node --test` cobrir a ordem inteira sem banco nenhum.
 */

export type TipoDeAcao =
  | "revisao-tatica"
  | "revisao-finais"
  | "tema"
  | "aula"
  | "linha"
  | "prova"
  | "nada";

export type Acao = {
  readonly tipo: TipoDeAcao;
  /** O que fazer. É o que o cartão mostra grande. */
  readonly titulo: string;
  /** Por que **isto**, e não outra coisa. Uma linha, e ela é a metade que ensina. */
  readonly motivo: string;
  /** O texto do botão. Verbo, sempre. Vazio só quando não há para onde ir. */
  readonly botao: string;
  /** Para onde o botão leva. `null` só quando não há nada a fazer. */
  readonly href: string | null;
};

/**
 * Tudo o que a decisão precisa — e nada que ela não use.
 *
 * A página já tem todos estes valores em memória quando chama: são as mesmas
 * leituras que `fechamentoDoNivel` e o cartão Hoje consomem. **Nenhuma consulta
 * a mais.**
 */
export type ParaDecidir = {
  /** Em que degrau o aluno está, de `nivelDoAluno(conquistado)`. */
  readonly nivel: Nivel;
  /** O maior nível cuja prova ele já passou. */
  readonly conquistado: 0 | Nivel;
  readonly progresso: ProgressoParaONivel;
  /** Quantos puzzles a fila de revisão deve hoje. */
  readonly vencidosDeTatica: number;
  /** As aulas de finais vencidas hoje, em ordem de vencimento. */
  readonly vencidasDeFinais: readonly { readonly id: string; readonly nome: string }[];
};

function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * A ação de agora, e o porquê dela.
 *
 * A ordem é a rotina do curso, com a fila de revisão passando na frente:
 *
 * 1. revisão de **tática** vencida — a partir de 1;
 * 2. revisão de **finais** vencida;
 * 3. o **tema** de tática do nível;
 * 4. a **aula** de finais do nível;
 * 5. a **linha** do repertório;
 * 6. a **prova** do nível;
 * 7. nada a fazer.
 *
 * Tática antes de finais porque é o bloco maior da rotina (45 min contra 30) e
 * porque a fila de tática cresce mais depressa: 36 temas de 39 puzzles contra
 * 49 aulas. Empatar as duas por "quem venceu primeiro" faria o aluno alternar
 * de assunto a cada carregamento de página, que é o oposto de uma rotina.
 */
export function proximaAcao(d: ParaDecidir): Acao {
  if (d.vencidosDeTatica > 0) {
    return {
      tipo: "revisao-tatica",
      titulo: `Revisar ${plural(d.vencidosDeTatica, "puzzle", "puzzles")}`,
      motivo:
        "São puzzles que você já acertou e que estão vencendo agora. " +
        "A revisão vem antes de assunto novo — é ela que impede o aprendi-e-esqueci.",
      botao: "Começar a revisão",
      href: "/tatica/revisao",
    };
  }

  const vencida = d.vencidasDeFinais[0];
  if (vencida) {
    const outras = d.vencidasDeFinais.length - 1;
    return {
      tipo: "revisao-finais",
      titulo: `Revisar: ${vencida.nome}`,
      motivo:
        outras > 0
          ? `Esta aula venceu na escada de revisão, e há mais ${outras} atrás dela.`
          : "Esta aula venceu na escada de revisão. Uma passada e ela sobe de degrau.",
      botao: "Abrir a aula",
      href: `/finais/${vencida.id}?revisao=1`,
    };
  }

  const fecho = fechamentoDoNivel(d.nivel, d.progresso);

  const tag = temasDoNivel(d.nivel).find((t) => !temaFechado(d.progresso.temas.get(t)));
  if (tag !== undefined) {
    const nome = BLOCOS.flatMap((b) => b.temas).find((t) => t.tag === tag)?.nome ?? tag;
    return {
      tipo: "tema",
      titulo: nome,
      motivo:
        `O próximo tema de tática do nível ${d.nivel}. ` +
        "Dentro dele os puzzles vão do fácil ao difícil.",
      botao: "Treinar este tema",
      href: `/tatica/${tag}`,
    };
  }

  if (fecho.finais.feitos < fecho.finais.exigidas) {
    // A primeira publicada que ele ainda não aprendeu, na ordem da trilha — que
    // é ordem de pré-requisito, e não a ordem em que ele abriu as abas.
    const proxima = aulasDoNivel(d.nivel).find(
      (a) =>
        d.progresso.publicadas.has(a.id) &&
        !aprendeu(a.formato, d.progresso.finais.get(a.id) ?? AULA_ZERADA),
    );
    if (proxima) {
      return {
        tipo: "aula",
        titulo: proxima.nome,
        motivo:
          `A próxima aula de finais do nível ${d.nivel}, ` +
          "na ordem em que uma prepara a seguinte.",
        botao: "Abrir a aula",
        href: `/finais/${proxima.id}`,
      };
    }
  }

  const faltamLinhas =
    d.nivel === 5
      ? d.progresso.baseCompleto
        ? 0
        : 1
      : Math.max(0, fecho.repertorio.exigidas - fecho.repertorio.feitas);
  if (faltamLinhas > 0) {
    return {
      tipo: "linha",
      titulo:
        d.nivel === 5
          ? "Terminar o repertório Base"
          : `Aprender ${plural(faltamLinhas, "linha", "linhas")} do repertório`,
      motivo:
        "Quaisquer linhas — você escolhe. Elas treinam em paralelo, na mesma " +
        "sessão, então quatro custam quase o mesmo tempo que uma.",
      botao: "Treinar o repertório",
      href: "/aberturas",
    };
  }

  if (fecho.fechado && d.conquistado < d.nivel) {
    return {
      tipo: "prova",
      titulo: `A prova do nível ${d.nivel}`,
      motivo:
        "As três trilhas do degrau fecharam. São 12 puzzles, e a prova não diz o " +
        "tema — é a única medida do site que não entrega metade da resposta.",
      botao: "Fazer a prova",
      href: `/nivel/${d.nivel}/prova`,
    };
  }

  return {
    tipo: "nada",
    titulo: "Você percorreu a escada inteira",
    motivo:
      "Os cinco níveis estão conquistados e nada venceu na revisão hoje. " +
      "Jogue a partida do dia e volte amanhã.",
    botao: "",
    href: null,
  };
}
