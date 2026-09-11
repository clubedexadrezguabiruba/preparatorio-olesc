import type { AulaV2, ProblemaV2 } from "./modelo.ts";

/**
 * A ponte entre o diagnóstico e a tela.
 *
 * ## Por que isto não mora dentro do validador
 *
 * O validador fala em identificadores — `analise-n1-kpk`, `node-7`, `questao-n1-kpk-n2`.
 * Ele tem de falar assim: identificador é estável, não muda quando o professor
 * renomeia um capítulo, e é o que uma localização precisa ser para continuar
 * apontando para o mesmo lugar amanhã.
 *
 * Só que **`node-7` não quer dizer nada para quem escreve a aula.** O professor
 * conhece "o 3º lance do capítulo «Peão na sexta»". Traduzir uma coisa na outra
 * exige olhar a aula inteira — achar qual capítulo usa aquela análise, contar em que
 * passo do percurso aquele nó está —, e isso é trabalho de apresentação, não de
 * julgamento. Misturar os dois faria o validador depender de títulos que ele não
 * deveria conhecer.
 *
 * ## O que ela entrega
 *
 * Duas coisas, e as duas para o mesmo problema: **onde ele está**, em português, e
 * **para onde levar a tela** quando o professor clicar em "Ir para o problema".
 * Quando não há destino navegável — um erro que é da aula inteira, não de um lugar —
 * o destino é `null` e a tela simplesmente não oferece o botão, em vez de oferecer um
 * botão que não leva a lugar nenhum.
 */

/** Para onde a tela deve ir. `null` quando o problema não tem lugar navegável. */
export type DestinoV2 = { capituloId?: string; analiseId?: string; nodeId?: string };

export type ProblemaVisivelV2 = {
  problema: ProblemaV2;
  /** Onde ele está, em português e com os nomes que o professor escreveu. */
  onde: string;
  destino: DestinoV2 | null;
};

/**
 * O enésimo, concordando com o substantivo que vem depois.
 *
 * "o 3º lance" e "a 3ª etapa" — em português o ordinal tem gênero, e um editor que
 * escreve "a 3º pergunta" na tela do professor de português está errado do mesmo
 * jeito que estaria com o nome do capítulo trocado.
 */
function ordinal(n: number, genero: "m" | "f"): string {
  return `${n}${genero === "f" ? "ª" : "º"}`;
}

function entreAspas(texto: string): string {
  return `«${texto}»`;
}

/**
 * Em que passo do percurso este nó está — contando a partir de 1 no primeiro lance.
 *
 * `0` quer dizer "é a posição de partida do capítulo", e `null`, "não está neste
 * percurso" — que é o caso normal de um nó de variante, já que o percurso do capítulo
 * é uma linha só.
 */
function passoNoPercurso(caminho: string[], inicioNodeId: string, nodeId: string): number | null {
  if (nodeId === inicioNodeId) return 0;
  const indice = caminho.indexOf(nodeId);
  return indice === -1 ? null : indice + 1;
}

/**
 * Descreve um problema no vocabulário do professor e diz para onde a tela vai.
 *
 * A ordem das perguntas é da coisa mais específica para a mais geral: um problema
 * que aponta um lance é descrito como lance, mesmo que também traga o capítulo.
 * Assim o professor lê a informação que mais reduz a procura dele.
 */
export function descreverProblemaV2(aula: AulaV2, problema: ProblemaV2): ProblemaVisivelV2 {
  const local = problema.localizacao;

  if (local.nodeId) {
    const analiseId = local.analiseId;
    const capitulo =
      (local.capituloId ? aula.capitulos.find((c) => c.id === local.capituloId) : undefined) ??
      aula.capitulos.find((c) => c.analiseId === analiseId);

    if (capitulo) {
      const passo = passoNoPercurso(capitulo.caminho, capitulo.inicioNodeId, local.nodeId);
      const destino: DestinoV2 = { capituloId: capitulo.id, analiseId: capitulo.analiseId, nodeId: local.nodeId };
      if (passo === 0) {
        return { problema, onde: `a posição de partida do capítulo ${entreAspas(capitulo.titulo)}`, destino };
      }
      if (passo !== null) {
        return { problema, onde: `o ${ordinal(passo, "m")} lance do capítulo ${entreAspas(capitulo.titulo)}`, destino };
      }
      // Fora do percurso: é um lance de variante. O capítulo ainda é o melhor
      // endereço que existe, porque é por ele que a tela chega à análise.
      return { problema, onde: `um lance de variante, no capítulo ${entreAspas(capitulo.titulo)}`, destino };
    }

    return {
      problema,
      onde: "um lance de uma análise que ainda não tem capítulo",
      destino: analiseId ? { analiseId, nodeId: local.nodeId } : null,
    };
  }

  if (local.capituloId) {
    const capitulo = aula.capitulos.find((c) => c.id === local.capituloId);
    return {
      problema,
      onde: capitulo ? `o capítulo ${entreAspas(capitulo.titulo)}` : "um capítulo que não existe mais",
      destino: capitulo ? { capituloId: capitulo.id, analiseId: capitulo.analiseId } : null,
    };
  }

  if (local.introducaoId) {
    const introducao = aula.introducoes.find((i) => i.id === local.introducaoId);
    const nome = introducao ? entreAspas(introducao.titulo) : "que não existe mais";
    if (local.quadroId && introducao) {
      const indice = introducao.quadros.findIndex((q) => q.id === local.quadroId);
      if (indice !== -1) return { problema, onde: `o ${ordinal(indice + 1, "m")} quadro da introdução ${nome}`, destino: null };
    }
    return { problema, onde: `a introdução ${nome}`, destino: null };
  }

  if (local.treinoId) {
    const treino = aula.treinos.find((t) => t.id === local.treinoId);
    const nome = treino ? entreAspas(treino.titulo) : "que não existe mais";
    if (treino && local.questaoId) {
      const indice = treino.questoes.findIndex((q) => q.id === local.questaoId);
      if (indice !== -1) {
        const pergunta = `${ordinal(indice + 1, "f")} pergunta do treino ${nome}`;
        if (!local.respostaId) return { problema, onde: `a ${pergunta}`, destino: null };
        const resposta = treino.questoes[indice].respostas.findIndex((r) => r.id === local.respostaId);
        const qual = resposta === -1 ? "uma resposta" : `a ${ordinal(resposta + 1, "f")} resposta`;
        return { problema, onde: `${qual} da ${pergunta}`, destino: null };
      }
    }
    return { problema, onde: `o treino ${nome}`, destino: null };
  }

  if (local.praticaId) {
    const pratica = aula.praticas.find((p) => p.id === local.praticaId);
    return { problema, onde: pratica ? `a prática ${entreAspas(pratica.titulo)}` : "uma prática que não existe mais", destino: null };
  }

  if (local.etapaId) {
    const posicao = aula.fluxo.findIndex((e) => e.id === local.etapaId);
    return { problema, onde: posicao === -1 ? "uma etapa do roteiro da aula" : `a ${ordinal(posicao + 1, "f")} etapa do roteiro da aula`, destino: null };
  }

  if (local.analiseId) {
    const capitulo = aula.capitulos.find((c) => c.analiseId === local.analiseId);
    return {
      problema,
      onde: capitulo ? `a partida do capítulo ${entreAspas(capitulo.titulo)}` : "uma análise desta aula",
      destino: capitulo ? { capituloId: capitulo.id, analiseId: capitulo.analiseId } : { analiseId: local.analiseId },
    };
  }

  return { problema, onde: "a aula", destino: null };
}

/**
 * Os problemas prontos para a tela, com os bloqueantes na frente.
 *
 * Erro antes de aviso porque a lista é lida de cima para baixo e o que impede a
 * publicação é o que precisa ser resolvido. Dentro de cada grupo a ordem do
 * validador é preservada, que é a ordem em que as coisas aparecem na aula.
 */
export function problemasVisiveisV2(aula: AulaV2, problemas: ProblemaV2[]): ProblemaVisivelV2[] {
  const erros = problemas.filter((p) => p.severidade === "erro");
  const avisos = problemas.filter((p) => p.severidade !== "erro");
  return [...erros, ...avisos].map((problema) => descreverProblemaV2(aula, problema));
}

/**
 * A frase do cabeçalho da lista: quantos impedem e quantos apenas avisam.
 *
 * Ela existe porque "3 problemas" não diz ao professor se ele pode publicar. A
 * diferença entre o que trava e o que só avisa é a informação que ele procura
 * primeiro, e ela precisa caber numa linha.
 */
export function resumoDosProblemasV2(problemas: ProblemaV2[]): string | null {
  const erros = problemas.filter((p) => p.severidade === "erro").length;
  const avisos = problemas.length - erros;
  if (!erros && !avisos) return null;
  const partes: string[] = [];
  if (erros) partes.push(erros === 1 ? "1 problema impede a publicação" : `${erros} problemas impedem a publicação`);
  if (avisos) partes.push(avisos === 1 ? "1 aviso" : `${avisos} avisos`);
  return partes.join(" · ");
}
