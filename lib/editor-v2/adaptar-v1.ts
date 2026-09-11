import { Chess } from "chess.js";
import type { Lesson, Position } from "../lesson/schema.ts";
import { hashDoConteudo as hash } from "./hash.ts";
import { validarAulaV2, type AulaV2, type NoV2 } from "./modelo.ts";

const id = (parte: string) => parte.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Adaptador de leitura. Não modifica nem reserializa o arquivo v1.
 * Os IDs posicionais são temporários e determinísticos; a migração explícita os materializa.
 */
export function adaptarLessonV1(lesson: Lesson, positions: Record<string, Position>): AulaV2 {
  const objective = lesson.stages.objective;
  const etapasAusentes = lesson.etapasAusentes ? {
    ...(lesson.etapasAusentes.intro ? { introducao: lesson.etapasAusentes.intro } : {}),
    ...(lesson.etapasAusentes.objective ? { capitulos: lesson.etapasAusentes.objective } : {}),
    ...(lesson.etapasAusentes.guided ? { treinos: lesson.etapasAusentes.guided } : {}),
    ...(lesson.etapasAusentes.practice ? { praticas: lesson.etapasAusentes.practice } : {}),
  } : undefined;
  const metadados: NonNullable<AulaV2["metadados"]> = {
    orientacaoPadrao: lesson.orientation,
    criterioDominio: lesson.domainCriterion,
    ...(lesson.class ? { classe: lesson.class } : {}),
    estadoEditorial: "rascunho",
    estadoDaOrigem: lesson.status === "published" ? "publicado" : "rascunho",
    ...(objective?.source ? { fonteDidatica: objective.source } : {}),
    ...(etapasAusentes && Object.keys(etapasAusentes).length ? { etapasAusentes } : {}),
    ...(lesson.professor ? { professor: lesson.professor } : {}),
  };
  const catalogo: NonNullable<AulaV2["catalogo"]> = {
    erros: Object.entries(lesson.errors).map(([erroId, erro]) => ({ id: erroId, julgamento: erro.verdict === "off-method" ? "fora-do-metodo" : "perde-resultado", texto: erro.text })),
    mensagensPadrao: {
      vitoriaForaDoMetodo: lesson.fallbacks.winningOffMethod,
      perdeResultado: lesson.fallbacks.losesWin,
      alternativaDoMetodo: lesson.fallbacks.methodAlternative,
    },
    ...(lesson.generatedTemplates ? { mensagensGeradas: lesson.generatedTemplates } : {}),
  };
  const positionIds = [...new Set([objective?.positionId, lesson.stages.guided?.positionId, lesson.stages.practice?.positionId].filter((positionId): positionId is string => Boolean(positionId)))];
  const proveniencia: AulaV2["proveniencia"] = positionIds.map((positionId) => {
    const posicao = positions[positionId];
    if (!posicao) throw new Error(`posição ${positionId} não foi carregada`);
    return { positionId, conteudoHash: hash(posicao), estado: posicao.status };
  });
  if (!objective) {
    return { schemaVersion: 2, id: lesson.id, titulo: lesson.title, metadados, proveniencia, excecoes: lesson.excecoes ?? [], catalogo, analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [], origem: { formato: "lesson-v1", hash: hash(lesson) } };
  }
  const position = positions[objective.positionId];
  if (!position) throw new Error(`posição ${objective.positionId} não foi carregada`);

  const analiseId = id(`analise-${lesson.id}-objetivo`);
  const raizId = id(`node-${lesson.id}-objetivo-raiz`);
  const capituloId = id(`capitulo-${lesson.id}-objetivo`);
  const nos: Record<string, NoV2> = { [raizId]: { id: raizId, filhos: [] } };
  const caminho: string[] = [];
  const narracoes: AulaV2["capitulos"][number]["narracoes"] = [];
  const game = new Chess(position.fen);
  const fenParaNo = new Map([[game.fen(), raizId]]);
  let atual = raizId;

  for (const [indice, passo] of objective.roteiro.entries()) {
    if (passo.lance) {
      try {
        game.move({ from: passo.lance.slice(0, 2), to: passo.lance.slice(2, 4), promotion: passo.lance.slice(4) || undefined });
      } catch {
        throw new Error(`aula ${lesson.id}: lance ${passo.lance} é ilegal no passo ${indice + 1}`);
      }
      const nodeId = id(`node-${lesson.id}-objetivo-passo-${indice + 1}`);
      nos[nodeId] = { id: nodeId, uci: passo.lance, filhos: [] };
      nos[atual] = { ...nos[atual], filhos: [...nos[atual].filhos, nodeId] };
      atual = nodeId;
      fenParaNo.set(game.fen(), nodeId);
      caminho.push(nodeId);
    }
    narracoes.push({ id: id(`narracao-${lesson.id}-${indice + 1}`), nodeId: atual, texto: passo.fala, pausa: "temporizada" });
  }

  const pratica = lesson.stages.practice ? {
    id: id(`pratica-${lesson.id}-stockfish`),
    titulo: "Prática contra o computador",
    positionId: lesson.stages.practice.positionId,
    ladoAluno: lesson.orientation,
    objetivo: lesson.stages.practice.goal,
    engine: lesson.stages.practice.engine,
  } satisfies AulaV2["praticas"][number] : null;

  const introducao = lesson.stages.intro ? {
    id: id(`introducao-${lesson.id}`),
    titulo: "Apresentação",
    quadros: lesson.stages.intro.passos.map((passo, indice) => ({
      id: id(`quadro-${lesson.id}-introducao-${indice + 1}`),
      texto: passo.fala,
      posicao: passo.fen
        ? { tipo: "fen" as const, fen: passo.fen }
        : { tipo: "referencia" as const, origem: { analiseId, nodeId: raizId } },
      ...(passo.arrows || passo.highlights ? { desenhos: { arrows: passo.arrows, highlights: passo.highlights } } : {}),
    })),
  } satisfies AulaV2["introducoes"][number] : null;

  const guided = lesson.stages.guided;
  const treinoId = id(`treino-${lesson.id}-guiado`);
  const questaoIds = new Map(Object.keys(guided?.nodes ?? {}).map((nodeId) => [nodeId, id(`questao-${lesson.id}-${nodeId}`)]));
  const questaoIdDoLegado = (nodeId: string) => {
    const questaoId = questaoIds.get(nodeId);
    if (!questaoId) throw new Error(`aula ${lesson.id}: o treino aponta para o nó guiado inexistente ${nodeId}`);
    return questaoId;
  };
  const treino = guided ? {
    id: treinoId,
    titulo: "Treino guiado",
    perfil: "final-certificado" as const,
    inicio: { analiseId, nodeId: raizId },
    ladoAluno: lesson.orientation,
    objetivo: guided.goal === "win" ? "Converter a posição em vitória." : "Defender a posição e assegurar o empate.",
    questoes: Object.entries(guided.nodes).map(([nodeId, node]) => {
      const posicaoNodeId = fenParaNo.get(node.fen);
      if (!posicaoNodeId) throw new Error(`aula ${lesson.id}: o nó guiado ${nodeId} não corresponde ao percurso da análise`);
      const respostas: AulaV2["treinos"][number]["questoes"][number]["respostas"] = [];
      node.expects.forEach((expect, indice) => {
        const efeito = expect.replies
          ? { tipo: "avanca" as const, defesas: expect.replies.map((defesa) => ({ move: defesa.reply, proximaQuestaoId: questaoIdDoLegado(defesa.next) })) }
          : expect.reply && expect.next
            ? { tipo: "avanca" as const, defesas: [{ move: expect.reply, proximaQuestaoId: questaoIdDoLegado(expect.next) }] }
            : { tipo: "encerra" as const, condicao: expect.ends ?? "mate" as const };
        respostas.push({ id: id(`resposta-${lesson.id}-${nodeId}-esperada-${indice + 1}`), moves: expect.moves, julgamento: "correta", feedback: expect.feedback, efeito });
      });
      node.mistakes?.forEach((mistake, indice) => respostas.push({
        id: id(`resposta-${lesson.id}-${nodeId}-erro-${indice + 1}`),
        moves: mistake.moves,
        julgamento: "erro",
        feedback: lesson.errors[mistake.errorId]?.text ?? lesson.fallbacks.losesWin,
        erroId: mistake.errorId,
        efeito: { tipo: "repete" },
      }));
      node.methodAlternatives?.forEach((move, indice) => respostas.push({
        id: id(`resposta-${lesson.id}-${nodeId}-metodo-${indice + 1}`),
        moves: [move],
        julgamento: "correta",
        feedback: lesson.fallbacks.methodAlternative,
        efeito: { tipo: "repete" },
      }));
      node.authorAlternatives?.forEach((alternative, indice) => respostas.push({
        id: id(`resposta-${lesson.id}-${nodeId}-autoral-${indice + 1}`),
        moves: alternative.moves,
        julgamento: "correta",
        feedback: alternative.feedback,
        efeito: { tipo: "repete" },
      }));
      return {
        id: questaoIdDoLegado(nodeId),
        posicao: { analiseId, nodeId: posicaoNodeId },
        ...(node.hint ? { dica: node.hint } : {}),
        ...(node.arrows || node.highlights ? { desenhos: { arrows: node.arrows, highlights: node.highlights } } : {}),
        respostas,
      };
    }),
    defensor: { politica: "deterministica" as const },
    termino: { tipo: "objetivo" as const },
    propriedade: "derivado" as const,
    fonte: "atual" as const,
    origem: { analiseId, nodeIds: [...new Set([raizId, ...[...fenParaNo.values()]])], hash: hash(guided), derivadorVersao: 1 },
    obrigatorio: true,
    revisaoAvaliacao: "confirmada" as const,
    certificacao: { tipo: "tablebase" as const, estado: "herdada-v1" as const, positionId: guided.positionId, alvoHash: hash(guided) },
    ...(guided.intro ? { introducao: guided.intro } : {}),
  } satisfies AulaV2["treinos"][number] : null;

  const aula: AulaV2 = {
    schemaVersion: 2,
    id: lesson.id,
    titulo: lesson.title,
    metadados,
    proveniencia,
    excecoes: lesson.excecoes ?? [],
    catalogo,
    analises: [{ id: analiseId, inicio: { tipo: "posicao", positionId: objective.positionId }, raizId, nos }],
    introducoes: introducao ? [introducao] : [],
    capitulos: [{ id: capituloId, titulo: objective.technique.name, analiseId, inicioNodeId: raizId, caminho, orientacao: lesson.orientation, narracoes }],
    treinos: treino ? [treino] : [],
    praticas: pratica ? [pratica] : [],
    fluxo: [
      ...(introducao ? [{ id: id(`etapa-${lesson.id}-introducao`), tipo: "introducao" as const, entidadeId: introducao.id }] : []),
      { id: id(`etapa-${lesson.id}-objetivo`), tipo: "capitulo", entidadeId: capituloId },
      ...(treino ? [{ id: id(`etapa-${lesson.id}-treino`), tipo: "treino" as const, entidadeId: treino.id }] : []),
      ...(pratica ? [{ id: id(`etapa-${lesson.id}-pratica`), tipo: "pratica" as const, entidadeId: pratica.id }] : []),
    ],
    origem: { formato: "lesson-v1", hash: hash(lesson) },
  };
  const valida = validarAulaV2(aula);
  if (!valida.ok) throw new Error(`adaptação v1 inválida: ${valida.problemas.join("; ")}`);
  return aula;
}
