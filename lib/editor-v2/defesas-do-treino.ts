/**
 * As defesas de uma resposta do treino — §16.3 ("uma ou mais respostas do defensor") e
 * §16.4 (rotação e escolha fixa).
 *
 * ## De onde vem a segunda defesa (decisão B do Doug, 12/9/2026)
 *
 * Toda pergunta aponta para uma **posição da análise**, e a conferência exige que a
 * defesa chegue exatamente à posição da próxima pergunta. Por isso a segunda defesa só
 * pode vir de uma **variante que a análise já tem** depois do lance do aluno. A janela
 * do treino não cria a variante: isso mexeria na fonte do treino por dentro dele, e a
 * ligação entre os dois é da parada 6D. Sem variante, a tela diz onde criá-la.
 *
 * ## Contas puras, e a regra de sempre
 *
 * Tudo aqui devolve um treino novo, e **devolve o mesmo objeto quando não há efeito** —
 * o padrão que já mordeu em outras paradas. Os ids chegam prontos de fora.
 */
import type { Position } from "../lesson/schema.ts";
import { analiseDaAula, mapaDaAnalise } from "./arvore.ts";
import { idsDaAulaV2 } from "./ids.ts";
import type { AulaV2, QuestaoTreinoV2, RespostaTreinoV2, TreinoV2 } from "./modelo.ts";
import { MAXIMO_DE_DEFESAS } from "./treino-jogavel.ts";

/** Uma defesa que a análise já tem, pronta para virar resposta do defensor. */
export type FugaDaAnaliseV2 = {
  analiseId: string;
  nodeId: string;
  move: string;
  san: string;
  /** A pergunta do treino que já aponta para essa posição, quando existe. */
  questaoId?: string;
};

type Avanca = Extract<RespostaTreinoV2["efeito"], { tipo: "avanca" }>;

function localizar(treino: TreinoV2, questaoId: string, respostaId: string): { questao: QuestaoTreinoV2; resposta: RespostaTreinoV2 & { efeito: Avanca } } | null {
  const questao = treino.questoes.find((item) => item.id === questaoId);
  const resposta = questao?.respostas.find((item) => item.id === respostaId);
  if (!questao || !resposta || resposta.efeito.tipo !== "avanca") return null;
  return { questao, resposta: resposta as RespostaTreinoV2 & { efeito: Avanca } };
}

/** As duas regras que a conferência impõe à lista de defesas de uma resposta. */
export function problemaDasDefesas(defesas: readonly { move: string }[]): string | null {
  if (defesas.length > MAXIMO_DE_DEFESAS) {
    return `uma resposta aceita até ${MAXIMO_DE_DEFESAS} defesas, e esta tem ${defesas.length}`;
  }
  const vistas = new Set<string>();
  for (const defesa of defesas) {
    if (vistas.has(defesa.move)) return `a defesa ${defesa.move} aparece duas vezes na mesma resposta`;
    vistas.add(defesa.move);
  }
  return null;
}

/** As variantes do defensor que a análise tem depois desta resposta, e que ainda não entraram. */
export function fugasDaAnalise(
  aula: AulaV2,
  treino: TreinoV2,
  questaoId: string,
  respostaId: string,
  positions: Record<string, Position>,
): { fugas: FugaDaAnaliseV2[]; motivo?: string } {
  const achado = localizar(treino, questaoId, respostaId);
  if (!achado) return { fugas: [], motivo: "só uma resposta em que o defensor responde e avança tem defesas" };
  const { questao, resposta } = achado;
  if (resposta.efeito.defesas.length >= MAXIMO_DE_DEFESAS) {
    return { fugas: [], motivo: `esta resposta já tem ${MAXIMO_DE_DEFESAS} defesas, o máximo que o treino joga` };
  }
  const analise = analiseDaAula(aula, questao.posicao.analiseId);
  const lance = resposta.moves[0];
  const depoisDoAluno = analise.nos[questao.posicao.nodeId]?.filhos
    .map((id) => analise.nos[id])
    .find((no) => no?.uci === lance);
  if (!depoisDoAluno) {
    return { fugas: [], motivo: `o lance ${lance} não está na análise: jogue-o no tabuleiro do capítulo e, depois dele, a outra defesa` };
  }
  const usadas = new Set(resposta.efeito.defesas.map((defesa) => defesa.move));
  const sans = mapaDaAnalise(aula, analise.id, positions).sans;
  const fugas = depoisDoAluno.filhos
    .map((id) => analise.nos[id])
    .filter((no) => no?.uci && !usadas.has(no.uci))
    .map((no) => {
      const questaoExistente = treino.questoes.find((item) => item.posicao.analiseId === analise.id && item.posicao.nodeId === no.id);
      return {
        analiseId: analise.id,
        nodeId: no.id,
        move: no.uci!,
        san: sans[no.id] ?? no.uci!,
        ...(questaoExistente ? { questaoId: questaoExistente.id } : {}),
      };
    });
  if (!fugas.length) {
    return { fugas, motivo: "a análise não tem outra defesa depois deste lance: jogue-a no tabuleiro do capítulo, como variante" };
  }
  return { fugas };
}

/** Um id de pergunta livre na aula e no treino em edição. */
export function proximoIdDeQuestao(aula: AulaV2, treino: TreinoV2, nodeId: string): string {
  const usados = idsDaAulaV2(aula);
  treino.questoes.forEach((questao) => usados.add(questao.id));
  const base = `questao-${nodeId}-defesa`;
  let id = base;
  let numero = 2;
  while (usados.has(id)) id = `${base}-${numero++}`;
  return id;
}

/**
 * Acrescenta a defesa escolhida. A pergunta seguinte é a que já aponta para aquela
 * posição, ou uma nova **sem resposta**: o que o aluno joga ali é o professor quem
 * escreve, e a conferência não deixa salvar antes disso.
 */
export function acrescentarDefesa(treino: TreinoV2, questaoId: string, respostaId: string, fuga: FugaDaAnaliseV2, novaQuestaoId: string): TreinoV2 {
  const achado = localizar(treino, questaoId, respostaId);
  if (!achado || achado.resposta.efeito.defesas.some((defesa) => defesa.move === fuga.move)) return treino;
  const copia = structuredClone(treino);
  const { resposta } = localizar(copia, questaoId, respostaId)!;
  const destino = fuga.questaoId ?? novaQuestaoId;
  if (!fuga.questaoId) copia.questoes.push({ id: novaQuestaoId, posicao: { analiseId: fuga.analiseId, nodeId: fuga.nodeId }, respostas: [] });
  resposta.efeito.defesas.push({ move: fuga.move, proximaQuestaoId: destino });
  return copia;
}

/**
 * Tira uma defesa. A última não sai: resposta que avança precisa de quem responda.
 *
 * A pergunta que ela abria só sai junto quando está **vazia** — é a que "acrescentar"
 * acabou de criar. Uma pergunta com resposta escrita fica, porque apagá-la sem aviso
 * seria perder autoria por um clique em outro lugar.
 */
export function removerDefesa(treino: TreinoV2, questaoId: string, respostaId: string, indice: number): TreinoV2 {
  const achado = localizar(treino, questaoId, respostaId);
  if (!achado || achado.resposta.efeito.defesas.length <= 1 || !achado.resposta.efeito.defesas[indice]) return treino;
  const copia = structuredClone(treino);
  const { resposta } = localizar(copia, questaoId, respostaId)!;
  const [removida] = resposta.efeito.defesas.splice(indice, 1);
  const alvo = copia.questoes.find((questao) => questao.id === removida.proximaQuestaoId);
  const aindaApontada = copia.defesaInicial?.primeiraQuestaoId === removida.proximaQuestaoId
    || copia.questoes.some((questao) => questao.respostas.some((item) => item.efeito.tipo === "avanca" && item.efeito.defesas.some((defesa) => defesa.proximaQuestaoId === removida.proximaQuestaoId)));
  if (alvo && alvo.respostas.length === 0 && !aindaApontada && copia.questoes[0].id !== alvo.id) {
    copia.questoes = copia.questoes.filter((questao) => questao.id !== alvo.id);
  }
  return copia;
}

/** "Usar sempre esta": a defesa vai para o topo e o defensor passa a jogar a escolha fixa. */
export function tornarDefesaFixa(treino: TreinoV2, questaoId: string, respostaId: string, indice: number): TreinoV2 {
  const achado = localizar(treino, questaoId, respostaId);
  if (!achado || !achado.resposta.efeito.defesas[indice]) return treino;
  if (indice === 0 && treino.defensor.politica === "fixa") return treino;
  const copia = structuredClone(treino);
  const { resposta } = localizar(copia, questaoId, respostaId)!;
  const [escolhida] = resposta.efeito.defesas.splice(indice, 1);
  resposta.efeito.defesas.unshift(escolhida);
  copia.defensor = { politica: "fixa" };
  return copia;
}
