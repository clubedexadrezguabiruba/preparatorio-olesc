import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import { caminhoAte, quadroDoNo } from "./arvore.ts";
import { idsDaAulaV2 } from "./ids.ts";
import { LIMITES_V2 } from "./limites.ts";
import type { AulaV2, CapituloV2, QuestaoTreinoV2, TreinoV2 } from "./modelo.ts";

export const VERSAO_DERIVADOR_TREINO_V2 = 1;

export type LadoDoTreinoV2 = "white" | "black" | "ambos";
export type ColocacaoDoTreinoV2 = "depois-do-capitulo" | "fim-da-aula";

export type PedidoDeTreinoV2 = {
  capituloId: string;
  nodeId: string;
  titulo: string;
  objetivo: string;
  lado: LadoDoTreinoV2;
  colocacao: ColocacaoDoTreinoV2;
  obrigatorio: boolean;
};

export type TreinosPreparadosV2 = {
  treinos: TreinoV2[];
  etapas: AulaV2["fluxo"];
  colocacao: ColocacaoDoTreinoV2;
  capituloId: string;
};

export type ResultadoDoPreparoV2 =
  | { ok: true; preparo: TreinosPreparadosV2 }
  | { ok: false; campo: "titulo" | "objetivo" | "trecho"; mensagem: string };

function idLivre(usados: Set<string>, base: string): string {
  let candidato = base;
  let sufixo = 2;
  while (usados.has(candidato)) candidato = `${base}-${sufixo++}`;
  usados.add(candidato);
  return candidato;
}

/**
 * Impressão digital pequena e portátil da receita.
 *
 * Não é uma assinatura de segurança: ela só responde "a fonte mudou?". FNV-1a
 * roda igual no navegador e no Node, ao contrário de `node:crypto`, e o texto
 * que entra é formado apenas pelos campos que de fato mudam a derivação.
 */
function hashDaReceita(valor: unknown): string {
  const texto = JSON.stringify(valor);
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function aplicar(game: Chess, uci: string): void {
  game.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.slice(4) || undefined,
  });
}

function condicaoFinal(game: Chess, ultimoUci: string): Extract<QuestaoTreinoV2["respostas"][number]["efeito"], { tipo: "encerra" }>["condicao"] {
  if (game.isCheckmate()) return "mate";
  if (ultimoUci.length === 5) return "promotion";
  if (game.isDraw()) return "draw-secured";
  return "objetivo-autoral";
}

function percursoDoCapitulo(capitulo: CapituloV2): string[] {
  return [capitulo.inicioNodeId, ...capitulo.caminho];
}

function tituloDoLado(titulo: string, lado: "white" | "black", ambos: boolean): string {
  if (!ambos) return titulo;
  return `${titulo} — ${lado === "white" ? "brancas" : "pretas"}`;
}

function prepararUmLado(
  aula: AulaV2,
  capitulo: CapituloV2,
  nodeIds: string[],
  lado: "white" | "black",
  titulo: string,
  objetivo: string,
  obrigatorio: boolean,
  usados: Set<string>,
  positions: Record<string, Position>,
  ambos: boolean,
): TreinoV2 | null {
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
  if (!analise) throw new Error("a análise deste capítulo não existe");
  const treinoId = idLivre(usados, `treino-${capitulo.id}-${nodeIds[0]}-${lado}`);
  const turnoDoAluno = lado === "white" ? "w" : "b";
  const game = new Chess(quadroDoNo(aula, analise.id, nodeIds[0], positions).fen);
  const perguntas: Array<{ questao: QuestaoTreinoV2; indiceDoLance: number }> = [];

  for (let indice = 1; indice < nodeIds.length; indice += 1) {
    const nodeIdDoLance = nodeIds[indice];
    const no = analise.nos[nodeIdDoLance];
    if (!no?.uci) throw new Error("o percurso contém um lance sem origem");
    const posicaoNodeId = nodeIds[indice - 1];
    const doAluno = game.turn() === turnoDoAluno;
    aplicar(game, no.uci);
    if (!doAluno) continue;

    const questaoId = idLivre(usados, `questao-${nodeIds[indice - 1]}-${lado}`);
    const respostaId = idLivre(usados, `resposta-${nodeIdDoLance}-${lado}`);
    const narracao = capitulo.narracoes.find((item) => item.nodeId === nodeIdDoLance)?.texto;
    const feedback = narracao ?? no.comentario ?? "Boa. Continue pela linha ensinada.";
    perguntas.push({
      indiceDoLance: indice,
      questao: {
        id: questaoId,
        posicao: { analiseId: analise.id, nodeId: posicaoNodeId },
        respostas: [{
          id: respostaId,
          moves: [no.uci],
          julgamento: "correta",
          feedback,
          efeito: { tipo: "encerra", condicao: condicaoFinal(game, no.uci) },
        }],
      },
    });
  }

  if (perguntas.length === 0) return null;

  for (let indice = 0; indice < perguntas.length - 1; indice += 1) {
    const atual = perguntas[indice];
    const proxima = perguntas[indice + 1];
    const entre = nodeIds.slice(atual.indiceDoLance + 1, proxima.indiceDoLance);
    if (entre.length !== 1) throw new Error("o percurso não alterna um lance do aluno e um do defensor");
    const defesa = analise.nos[entre[0]].uci;
    if (!defesa) throw new Error("a resposta do defensor não tem lance");
    atual.questao.respostas[0].efeito = {
      tipo: "avanca",
      defesas: [{ move: defesa, proximaQuestaoId: proxima.questao.id }],
    };
  }

  const primeira = perguntas[0];
  const antesDaPrimeira = nodeIds.slice(1, primeira.indiceDoLance);
  if (antesDaPrimeira.length > 1) throw new Error("há mais de um lance do defensor antes da primeira pergunta");
  const defesaInicial = antesDaPrimeira[0] ? analise.nos[antesDaPrimeira[0]].uci : undefined;

  const ultima = perguntas.at(-1)!;
  const depoisDaUltima = nodeIds.slice(ultima.indiceDoLance + 1);
  if (depoisDaUltima.length > 1) throw new Error("há mais de um lance do defensor depois da última pergunta");
  if (depoisDaUltima[0]) {
    const defesaFinal = analise.nos[depoisDaUltima[0]].uci;
    if (!defesaFinal) throw new Error("a última resposta do defensor não tem lance");
    const fim = new Chess(quadroDoNo(aula, analise.id, nodeIds[ultima.indiceDoLance], positions).fen);
    aplicar(fim, defesaFinal);
    ultima.questao.respostas[0].efeito = {
      tipo: "encerra",
      condicao: condicaoFinal(fim, defesaFinal),
      defesaFinal,
    };
  }

  const ancestrais = caminhoAte(analise, nodeIds[0]).map((no) => no.id);
  const origemIds = [...new Set([...ancestrais, ...nodeIds])];
  const receita = {
    derivadorVersao: VERSAO_DERIVADOR_TREINO_V2,
    analiseInicio: analise.inicio,
    nodes: origemIds.map((id) => ({ id, uci: analise.nos[id]?.uci ?? null })),
    lado,
    objetivo,
  };

  return {
    id: treinoId,
    titulo: tituloDoLado(titulo, lado, ambos),
    perfil: "linha-autoral",
    inicio: { analiseId: analise.id, nodeId: nodeIds[0] },
    ladoAluno: lado,
    objetivo,
    questoes: perguntas.map((item) => item.questao),
    defensor: { politica: "deterministica" },
    ...(defesaInicial ? { defesaInicial: { move: defesaInicial, primeiraQuestaoId: primeira.questao.id } } : {}),
    termino: { tipo: "objetivo" },
    propriedade: "derivado",
    fonte: "atual",
    origem: {
      analiseId: analise.id,
      nodeIds: origemIds,
      hash: hashDaReceita(receita),
      derivadorVersao: VERSAO_DERIVADOR_TREINO_V2,
    },
    obrigatorio,
    revisaoAvaliacao: "pendente",
  };
}

export function prepararTreinosDaqui(
  aula: AulaV2,
  pedido: PedidoDeTreinoV2,
  positions: Record<string, Position>,
): ResultadoDoPreparoV2 {
  const titulo = pedido.titulo.trim();
  if (!titulo) return { ok: false, campo: "titulo", mensagem: "escreva um título para o treino" };
  const objetivo = pedido.objetivo.trim();
  if (!objetivo) return { ok: false, campo: "objetivo", mensagem: "explique o objetivo que o aluno deve alcançar" };
  const capitulo = aula.capitulos.find((item) => item.id === pedido.capituloId);
  if (!capitulo) return { ok: false, campo: "trecho", mensagem: "este capítulo não existe mais" };
  const percurso = percursoDoCapitulo(capitulo);
  const inicio = percurso.indexOf(pedido.nodeId);
  if (inicio < 0) return { ok: false, campo: "trecho", mensagem: "este lance está numa variante fora do percurso do capítulo" };
  const nodeIds = percurso.slice(inicio);
  if (nodeIds.length < 2) return { ok: false, campo: "trecho", mensagem: "não há nenhum lance depois desta posição para virar treino" };
  const meiosLances = nodeIds.length - 1;
  if (meiosLances > LIMITES_V2.meiosLancesPorDerivacaoDeTreino) {
    return {
      ok: false,
      campo: "trecho",
      mensagem: `este trecho tem ${meiosLances} meios-lances e uma criação de treino aceita até ${LIMITES_V2.meiosLancesPorDerivacaoDeTreino}; comece de uma posição mais adiante`,
    };
  }

  const usados = idsDaAulaV2(aula);
  const lados = pedido.lado === "ambos" ? ["white", "black"] as const : [pedido.lado] as const;
  try {
    const treinos = lados.flatMap((lado) => {
      const treino = prepararUmLado(aula, capitulo, nodeIds, lado, titulo, objetivo, pedido.obrigatorio, usados, positions, pedido.lado === "ambos");
      return treino ? [treino] : [];
    });
    if (treinos.length !== lados.length) {
      return { ok: false, campo: "trecho", mensagem: "o trecho não contém lance do lado escolhido" };
    }
    const etapas = treinos.map((treino) => ({
      id: idLivre(usados, `etapa-${treino.id}`),
      tipo: "treino" as const,
      entidadeId: treino.id,
    }));
    return { ok: true, preparo: { treinos, etapas, colocacao: pedido.colocacao, capituloId: capitulo.id } };
  } catch (erro) {
    return { ok: false, campo: "trecho", mensagem: erro instanceof Error ? erro.message : "não foi possível montar o treino" };
  }
}

export function aplicarTreinosPreparados(aula: AulaV2, preparo: TreinosPreparadosV2): AulaV2 {
  const usados = idsDaAulaV2(aula);
  const novosIds = [
    ...preparo.treinos.flatMap((treino) => [treino.id, ...treino.questoes.flatMap((questao) => [questao.id, ...questao.respostas.map((resposta) => resposta.id)])]),
    ...preparo.etapas.map((etapa) => etapa.id),
  ];
  if (novosIds.some((id) => usados.has(id))) throw new Error("este treino já existe na aula");

  const fluxo = [...aula.fluxo];
  let indice: number;
  if (preparo.colocacao === "depois-do-capitulo") {
    indice = fluxo.findIndex((etapa) => etapa.tipo === "capitulo" && etapa.entidadeId === preparo.capituloId);
    if (indice < 0) throw new Error("o capítulo não tem lugar no fluxo da aula");
    indice += 1;
  } else {
    const primeiraPratica = fluxo.findIndex((etapa) => etapa.tipo === "pratica");
    indice = primeiraPratica < 0 ? fluxo.length : primeiraPratica;
  }
  fluxo.splice(indice, 0, ...preparo.etapas);
  return { ...aula, treinos: [...aula.treinos, ...preparo.treinos], fluxo };
}
