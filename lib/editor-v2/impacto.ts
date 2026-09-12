/**
 * Quem mais na aula depende destes lances — o calculador de impacto que todas as
 * edições destrutivas do Editor v2 dividem.
 *
 * ## Por que ele mora sozinho num arquivo
 *
 * Quatro edições diferentes perdem nós: trocar a posição inicial de um capítulo
 * (§9), excluir um capítulo com a análise dele (§8.4), excluir a partir de um
 * lance e substituir a continuação de um lance (§11.3). As quatro precisam
 * responder **a mesma pergunta** — "quem aponta para o que vai sumir, e com que
 * nome o professor o conhece?" — e uma resposta diferente em cada uma seria
 * quatro opiniões sobre o que é uma dependência. A primeira delas nasceu dentro
 * de `trocar-posicao.ts`; esta é a mesma conta, tirada de lá para poder servir
 * às outras três sem cópia.
 *
 * ## As três saídas de §5, e a que não cabe em todo mundo
 *
 * O plano final (§5) é explícito sobre o que fazer quando há dependente:
 * "cancelar, remover explicitamente os dependentes ou materializar os
 * dependentes como independentes". Nenhuma das três é escolha de máquina, então
 * o cálculo **só diz quem são**; quem escolhe é o professor, item por item.
 *
 * A terceira saída não serve a todos, e dizer isso em voz alta é parte do
 * trabalho:
 *
 * - uma **análise** que começa num nó desta materializa-se guardando a FEN
 *   daquele nó — ela passa a ter chão próprio e larga a dependência;
 * - um **quadro de introdução** faz o mesmo, trocando a referência pela FEN;
 * - um **treino** não faz. Toda questão dele nomeia um `{analiseId, nodeId}`, e
 *   o schema não sabe representar uma questão sem esse endereço. Materializar um
 *   treino exigiria copiar a árvore inteira que ele percorre, e isso é o editor
 *   de treinos (§16), que ainda não existe. Então a tela mostra a opção
 *   desabilitada **com o motivo escrito**, como §11.3 manda, em vez de oferecer
 *   um botão que mente.
 *
 * ## A FEN é resolvida antes, e guardada no plano
 *
 * Materializar depende de saber qual posição o nó representa — e o nó vai
 * sumir. Por isso a FEN é calculada no momento do cálculo, entra no plano, e a
 * aplicação só a copia. Recalcular na hora de aplicar seria perguntar a posição
 * de um nó que já não existe.
 */
import { quadroDoNo } from "./arvore.ts";
import type { Position } from "../lesson/schema.ts";
import type { AulaV2, IntroducaoV2, TreinoV2 } from "./modelo.ts";

/**
 * Os nós que somem, por análise.
 *
 * É um mapa, e não um conjunto, porque uma edição pode perder nós em mais de
 * uma árvore ao mesmo tempo: a cascata de §9 poda a análise-mãe e as filhas na
 * mesma transação, e um nó chamado `no-3` pode existir nas duas.
 */
export type PerdasPorAnaliseV2 = Map<string, Set<string>>;

/** Um conjunto de perdas de uma análise só — o caso mais comum. */
export function perdasDeUmaAnalise(analiseId: string, nos: Iterable<string>): PerdasPorAnaliseV2 {
  return new Map([[analiseId, new Set(nos)]]);
}

export function perdeu(perdas: PerdasPorAnaliseV2, analiseId: string, nodeId: string): boolean {
  return perdas.get(analiseId)?.has(nodeId) ?? false;
}

/** O que a aplicação precisa saber para materializar um dependente. */
export type MaterializacaoV2 =
  | { tipo: "analise"; analiseId: string; fen: string }
  | { tipo: "introducao"; introducaoId: string; quadros: Array<{ quadroId: string; fen: string }> };

/**
 * Alguém de fora que aponta para um nó perdido, e por isso não deixa a edição
 * acontecer sozinha.
 */
export type DependenteV2 = {
  tipo: "treino" | "introducao" | "analise";
  /** O id da entidade — é ele que a escolha do professor endereça. */
  id: string;
  /** O nome que o professor escreveu: título do treino, da introdução, do capítulo. */
  nome: string;
  /** Já em português, para entrar na frase «Nome» + motivo. */
  motivo: string;
  /** `null` quando materializar não é representável — a tela escreve o porquê. */
  materializacao: MaterializacaoV2 | null;
  /** Por que materializar não dá, quando não dá. */
  motivoSemMaterializar?: string;
};

/** O que o professor escolheu para cada dependente. Sem escolha, a edição não sai. */
export type ResolucaoV2 = "remover" | "materializar";
export type ResolucoesV2 = Record<string, ResolucaoV2>;

const MOTIVO_TREINO_NAO_MATERIALIZA =
  "um treino não vira independente enquanto o editor de treinos não existir: todas as perguntas dele apontam para lances desta análise, e copiá-las é trabalho de §16";

/** Quantos nós **distintos** deste treino a edição leva. Ver a nota sobre repetidos. */
function nosPerdidosDoTreino(treino: TreinoV2, perdas: PerdasPorAnaliseV2): Set<string> {
  const apontados: Array<readonly [string, string]> = [
    [treino.inicio.analiseId, treino.inicio.nodeId] as const,
    ...treino.questoes.map((q) => [q.posicao.analiseId, q.posicao.nodeId] as const),
    ...(treino.origem ? treino.origem.nodeIds.map((id) => [treino.origem!.analiseId, id] as const) : []),
  ];
  // **Sem repetidos.** As três listas se sobrepõem de propósito — a receita de um
  // treino derivado costuma conter o nó de início e os das questões —, e somá-las
  // cruas faria a tela dizer "usa 12 lances" de uma árvore que só tem 8 para
  // perder. Contagem que não bate com o painel ensina a desconfiar do resto.
  const perdidos = new Set<string>();
  for (const [analiseId, nodeId] of apontados) {
    if (perdeu(perdas, analiseId, nodeId)) perdidos.add(`${analiseId}/${nodeId}`);
  }
  return perdidos;
}

function nomeDaAnalise(aula: AulaV2, analiseId: string): string {
  return aula.capitulos.find((c) => c.analiseId === analiseId)?.titulo ?? analiseId;
}

function materializacaoDaIntroducao(
  aula: AulaV2,
  introducao: IntroducaoV2,
  quadroIds: Set<string>,
  positions: Record<string, Position>,
): MaterializacaoV2 | null {
  const quadros: Array<{ quadroId: string; fen: string }> = [];
  for (const quadro of introducao.quadros) {
    if (!quadroIds.has(quadro.id) || quadro.posicao.tipo !== "referencia") continue;
    try {
      quadros.push({
        quadroId: quadro.id,
        fen: quadroDoNo(aula, quadro.posicao.origem.analiseId, quadro.posicao.origem.nodeId, positions).fen,
      });
    } catch {
      return null;
    }
  }
  return { tipo: "introducao", introducaoId: introducao.id, quadros };
}

/**
 * Todos os dependentes externos dos nós perdidos, com nome e com a saída que
 * cada um aceita.
 *
 * **Uma análise filha só entra aqui quando o nó em que ela começa é um dos
 * perdidos.** Uma filha cujo nó de origem sobrevive não é dependente de uma
 * exclusão — ela continua começando onde começava. No caso da troca de posição
 * inicial, em que o chão dela muda junto, quem cuida disso é a cascata de
 * `trocar-posicao.ts`, e não um bloqueio.
 */
export function dependentesDasPerdas(
  aula: AulaV2,
  perdas: PerdasPorAnaliseV2,
  positions: Record<string, Position>,
  /**
   * Como esta edição destrói, em português, para fechar a frase do motivo.
   *
   * Existe porque a mesma dependência é dita de dois jeitos: "usa 2 lances que
   * **a posição nova torna ilegal**" quando o professor está trocando a posição
   * inicial, e "usa 2 lances que **esta exclusão apaga**" quando ele está
   * excluindo. A conta é a mesma; a frase, não — e uma frase genérica nas duas
   * telas faria o professor ler "edição" onde ele fez uma coisa com nome.
   */
  verbo = "esta edição apaga",
): DependenteV2[] {
  const dependentes: DependenteV2[] = [];

  for (const treino of aula.treinos) {
    const perdidos = nosPerdidosDoTreino(treino, perdas);
    if (perdidos.size === 0) continue;
    dependentes.push({
      tipo: "treino",
      id: treino.id,
      nome: treino.titulo,
      motivo: `usa ${perdidos.size === 1 ? "um lance que" : `${perdidos.size} lances que`} ${verbo}`,
      materializacao: null,
      motivoSemMaterializar: MOTIVO_TREINO_NAO_MATERIALIZA,
    });
  }

  for (const introducao of aula.introducoes) {
    const atingidos = introducao.quadros.filter((quadro) =>
      quadro.posicao.tipo === "referencia" &&
      perdeu(perdas, quadro.posicao.origem.analiseId, quadro.posicao.origem.nodeId));
    if (atingidos.length === 0) continue;
    const materializacao = materializacaoDaIntroducao(aula, introducao, new Set(atingidos.map((q) => q.id)), positions);
    dependentes.push({
      tipo: "introducao",
      id: introducao.id,
      nome: introducao.titulo,
      motivo: atingidos.length === 1
        ? `tem um quadro que mostra um lance que ${verbo}`
        : `tem ${atingidos.length} quadros que mostram lances que ${verbo}`,
      materializacao,
      ...(materializacao ? {} : { motivoSemMaterializar: "a posição de um desses quadros não pôde ser reconstruída para virar FEN própria" }),
    });
  }

  for (const outra of aula.analises) {
    if (outra.inicio.tipo !== "referencia") continue;
    const origem = outra.inicio.origem;
    if (!perdeu(perdas, origem.analiseId, origem.nodeId)) continue;
    let fen: string | null = null;
    try {
      fen = quadroDoNo(aula, origem.analiseId, origem.nodeId, positions).fen;
    } catch {
      fen = null;
    }
    dependentes.push({
      tipo: "analise",
      id: outra.id,
      nome: nomeDaAnalise(aula, outra.id),
      motivo: `começa num lance que ${verbo}`,
      materializacao: fen ? { tipo: "analise", analiseId: outra.id, fen } : null,
      ...(fen ? {} : { motivoSemMaterializar: "a posição em que ela começa não pôde ser reconstruída" }),
    });
  }

  return dependentes;
}

/**
 * Aplica as escolhas do professor **antes** de a edição destrutiva acontecer.
 *
 * A ordem importa e não é arbitrária: materializar depende de posições que só
 * existem enquanto os nós existem — e a FEN já vem resolvida no plano justamente
 * por isso —, e remover tira do caminho quem ia quebrar. Depois disto a aula não
 * tem mais ninguém apontando para o que vai sumir.
 */
export function aplicarResolucoes(aula: AulaV2, dependentes: DependenteV2[], resolucoes: ResolucoesV2): AulaV2 {
  let atual = aula;
  for (const dependente of dependentes) {
    const escolha = resolucoes[dependente.id];
    if (escolha === "materializar" && dependente.materializacao) {
      atual = materializar(atual, dependente.materializacao);
    } else if (escolha === "remover") {
      atual = remover(atual, dependente);
    }
  }
  return atual;
}

/** Todo dependente tem escolha, e escolha possível? É o que destrava o botão. */
export function resolucoesCompletas(dependentes: DependenteV2[], resolucoes: ResolucoesV2): boolean {
  return dependentes.every((dependente) => {
    const escolha = resolucoes[dependente.id];
    if (escolha === "remover") return true;
    return escolha === "materializar" && dependente.materializacao !== null;
  });
}

function materializar(aula: AulaV2, materializacao: MaterializacaoV2): AulaV2 {
  if (materializacao.tipo === "analise") {
    return {
      ...aula,
      analises: aula.analises.map((item) =>
        item.id === materializacao.analiseId
          ? { ...item, inicio: { tipo: "fen" as const, fen: materializacao.fen } }
          : item),
    };
  }
  const porQuadro = new Map(materializacao.quadros.map((q) => [q.quadroId, q.fen]));
  return {
    ...aula,
    introducoes: aula.introducoes.map((introducao) =>
      introducao.id !== materializacao.introducaoId ? introducao : {
        ...introducao,
        quadros: introducao.quadros.map((quadro) => {
          const fen = porQuadro.get(quadro.id);
          return fen ? { ...quadro, posicao: { tipo: "fen" as const, fen } } : quadro;
        }),
      }),
  };
}

/**
 * Tira o dependente da aula — e tira junto tudo o que só existia por causa dele.
 *
 * Um treino sem a etapa dele no fluxo deixaria o validador acusar
 * `FLUXO_SEM_TREINO`: remover é remover inteiro, e não deixar o rastro para o
 * professor descobrir depois. O mesmo vale para a análise, que leva os capítulos
 * dela e as etapas desses capítulos.
 */
function remover(aula: AulaV2, dependente: DependenteV2): AulaV2 {
  if (dependente.tipo === "treino") {
    return {
      ...aula,
      treinos: aula.treinos.filter((item) => item.id !== dependente.id),
      fluxo: aula.fluxo.filter((etapa) => !(etapa.tipo === "treino" && etapa.entidadeId === dependente.id)),
    };
  }
  if (dependente.tipo === "introducao") {
    return {
      ...aula,
      introducoes: aula.introducoes.filter((item) => item.id !== dependente.id),
      fluxo: aula.fluxo.filter((etapa) => !(etapa.tipo === "introducao" && etapa.entidadeId === dependente.id)),
    };
  }
  const capitulos = aula.capitulos.filter((c) => c.analiseId === dependente.id).map((c) => c.id);
  return {
    ...aula,
    analises: aula.analises.filter((item) => item.id !== dependente.id),
    capitulos: aula.capitulos.filter((c) => c.analiseId !== dependente.id),
    fluxo: aula.fluxo.filter((etapa) => !(etapa.tipo === "capitulo" && capitulos.includes(etapa.entidadeId))),
  };
}

/* ------------------------------------------------------------------ *
 * O que muda dentro da aula, e o professor precisa ver pelo nome
 * ------------------------------------------------------------------ */

export type NarracaoPerdidaV2 = { capituloId: string; capitulo: string; narracaoId: string; texto: string };

/** As narrações que somem junto com o lance que elas explicavam. */
export function narracoesPerdidas(aula: AulaV2, perdas: PerdasPorAnaliseV2): NarracaoPerdidaV2[] {
  const saida: NarracaoPerdidaV2[] = [];
  for (const capitulo of aula.capitulos) {
    if (!perdas.has(capitulo.analiseId)) continue;
    for (const narracao of capitulo.narracoes) {
      if (!perdeu(perdas, capitulo.analiseId, narracao.nodeId)) continue;
      saida.push({ capituloId: capitulo.id, capitulo: capitulo.titulo, narracaoId: narracao.id, texto: narracao.texto });
    }
  }
  return saida;
}

export type CapituloTocadoV2 = {
  id: string;
  titulo: string;
  /** O percurso perdeu o fim porque passava por um lance apagado. */
  percursoCortado: boolean;
  /** O capítulo começava num lance apagado e volta a começar na raiz. */
  inicioReiniciado: boolean;
};

export function capitulosTocados(aula: AulaV2, perdas: PerdasPorAnaliseV2): CapituloTocadoV2[] {
  return aula.capitulos
    .filter((capitulo) => perdas.has(capitulo.analiseId))
    .map((capitulo) => ({
      id: capitulo.id,
      titulo: capitulo.titulo,
      inicioReiniciado: perdeu(perdas, capitulo.analiseId, capitulo.inicioNodeId),
      percursoCortado: capitulo.caminho.some((id) => perdeu(perdas, capitulo.analiseId, id)),
    }));
}

export type TreinoAfetadoV2 = {
  id: string;
  titulo: string;
  certificacaoReaberta: boolean;
  fonteAlterada: boolean;
};

/**
 * Os treinos que pisam nestas análises — afetados mesmo quando nenhum lance
 * deles cai.
 *
 * É a diferença entre "quebrou" e "precisa ser reconferido": um treino cujas
 * questões continuam todas de pé ainda foi julgado contra outro tabuleiro, e
 * §10 do plano manda a revisão da avaliação voltar a pendente quando a avaliação
 * muda de posição.
 */
export function treinosQuePisamEm(aula: AulaV2, analiseIds: Set<string>): TreinoAfetadoV2[] {
  return aula.treinos
    .filter((treino) =>
      analiseIds.has(treino.inicio.analiseId) ||
      treino.questoes.some((q) => analiseIds.has(q.posicao.analiseId)) ||
      (treino.origem !== undefined && analiseIds.has(treino.origem.analiseId)))
    .map((treino) => ({
      id: treino.id,
      titulo: treino.titulo,
      certificacaoReaberta: treino.certificacao !== undefined && treino.certificacao.estado !== "pendente",
      fonteAlterada: treino.origem !== undefined && treino.fonte === "atual",
    }));
}

/**
 * Reabre avaliação, fonte e certificação dos treinos atingidos.
 *
 * §8 do plano: "um treino pode ser personalizado e ter fonte alterada
 * simultaneamente" — por isso `fonte` muda e `propriedade` **não**. Só um ajuste
 * autoral personaliza um treino; uma edição na aula não o faz por ele.
 */
export function reabrirTreinos(aula: AulaV2, afetados: Set<string>): AulaV2 {
  if (afetados.size === 0) return aula;
  return {
    ...aula,
    treinos: aula.treinos.map((treino) => {
      if (!afetados.has(treino.id)) return treino;
      return {
        ...treino,
        revisaoAvaliacao: "pendente" as const,
        ...(treino.origem && treino.fonte === "atual" ? { fonte: "alterada" as const } : {}),
        ...(treino.certificacao ? { certificacao: { ...treino.certificacao, estado: "pendente" as const } } : {}),
      };
    }),
  };
}
