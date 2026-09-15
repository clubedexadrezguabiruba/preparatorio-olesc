/**
 * `assessmentRevision` — a identidade semântica de uma avaliação (plano final §10).
 *
 * ## As duas identidades, e por que não são uma só
 *
 * - `publicationId` (`pacote.ts`) é o **snapshot exato**: qualquer vírgula muda.
 * - `assessmentRevision` (aqui) é **o que foi avaliado**: posição, objetivo, respostas,
 *   defesa, condição de sucesso e ajuda. Título, feedback, desenho, narração e ordem do
 *   fluxo ficam de fora (§10: "título, layout, reordenação e narração não invalidam
 *   domínio").
 *
 * O domínio do aluno é guardado pela segunda. Se fosse pela primeira, corrigir um erro de
 * digitação num feedback apagaria o domínio de todos os alunos daquela aula.
 *
 * ## O que cada avaliação põe na conta
 *
 * **Prática:** a FEN resolvida (não o id da posição — trocar a FEN de um arquivo de posição
 * é mudar a tarefa), o lado, o objetivo, o motor e a versão do juiz.
 *
 * **Treino:** perfil, lado, FEN inicial, defesa inicial, política do defensor, término,
 * resultado certificado, e as perguntas **pela FEN** — cada uma com as respostas (lances,
 * julgamento, efeito, defesas na ordem, condição) e se há dica. A ordem das defesas
 * entra porque a rotação entre tentativas depende dela: a tentativa 1 enfrenta a primeira.
 * A ordem das respostas e das perguntas não entra: o juiz procura o lance, não o índice.
 * Ids de pergunta também não entram — eles são materializados na migração, e a tarefa não
 * mudou por isso; a próxima pergunta é referida pela posição dela.
 *
 * O texto da dica fica fora; a **presença** dela entra, porque ajuda permitida é avaliação
 * (§10: "incluindo ... ajuda permitida").
 *
 * ## Onde roda
 *
 * No servidor: usa `node:crypto`. O navegador recebe as revisões prontas no pacote.
 */
import type { Position } from "../lesson/schema.ts";
import { hashCanonico, jsonCanonico } from "./hash.ts";
import { resultadoDoTreinoV2, type AulaV2, type TreinoV2 } from "./modelo.ts";
import { fenDaQuestaoDoTreino, fenInicialDoTreino } from "./propriedade-treino.ts";

/** Sobe quando o juiz da prática muda de regra, e toda revisão de prática muda junto. */
export const VERSAO_JUIZ_PRATICA_V2 = 1;
/** Sobe quando o juiz do treino (`judgeMove` + defensor) muda de regra. */
export const VERSAO_JUIZ_TREINO_V2 = 1;

export type RevisoesDaAulaV2 = Record<string, { tipo: "treino" | "pratica"; revisao: string }>;

const revisao = (conteudo: unknown) => `ar_${hashCanonico(conteudo)}`;

/** O que a prática avalia — exportado para o teste e para o relatório de impacto. */
export function conteudoDaPraticaV2(aula: AulaV2, praticaId: string, positions: Record<string, Position>) {
  const pratica = aula.praticas.find((item) => item.id === praticaId);
  if (!pratica) throw new Error(`prática inexistente: ${praticaId}`);
  const posicao = positions[pratica.positionId];
  if (!posicao) throw new Error(`a prática usa a posição ${pratica.positionId}, que não foi carregada`);
  return {
    tipo: "pratica",
    juiz: VERSAO_JUIZ_PRATICA_V2,
    fen: posicao.fen,
    lado: pratica.ladoAluno,
    objetivo: pratica.objetivo,
    engine: { skill: pratica.engine.skill, moveTimeMs: pratica.engine.moveTimeMs },
  };
}

/** O que o treino avalia. */
export function conteudoDoTreinoV2(aula: AulaV2, treinoId: string, positions: Record<string, Position>) {
  const treino: TreinoV2 | undefined = aula.treinos.find((item) => item.id === treinoId);
  if (!treino) throw new Error(`treino inexistente: ${treinoId}`);
  const catalogo = new Map(aula.catalogo?.erros.map((erro) => [erro.id, erro.julgamento]) ?? []);
  const fens = new Map(treino.questoes.map((questao) => [questao.id, fenDaQuestaoDoTreino(aula, treino, questao, positions)]));
  const fenDe = (questaoId: string) => fens.get(questaoId) ?? `(pergunta ${questaoId} ausente)`;

  const questoes = treino.questoes.map((questao) => ({
    fen: fenDe(questao.id),
    temDica: Boolean(questao.dica),
    respostas: questao.respostas.map((resposta) => ({
      moves: [...resposta.moves].sort(),
      julgamento: resposta.julgamento,
      // O julgamento do erro do catálogo decide o veredito ("fora do método" ou "perde").
      ...(resposta.julgamento === "erro" ? { erro: resposta.erroId ? catalogo.get(resposta.erroId) ?? null : null } : {}),
      efeito: resposta.efeito.tipo === "avanca"
        ? { tipo: "avanca", defesas: resposta.efeito.defesas.map((defesa) => ({ move: defesa.move, proxima: fenDe(defesa.proximaQuestaoId) })) }
        : resposta.efeito.tipo === "encerra"
          ? { tipo: "encerra", condicao: resposta.efeito.condicao, defesaFinal: resposta.efeito.defesaFinal ?? null }
          : { tipo: "repete" },
    })).sort((a, b) => jsonCanonico(a).localeCompare(jsonCanonico(b))),
  })).sort((a, b) => jsonCanonico(a).localeCompare(jsonCanonico(b)));

  return {
    tipo: "treino",
    juiz: VERSAO_JUIZ_TREINO_V2,
    perfil: treino.perfil,
    lado: treino.ladoAluno,
    fenInicial: fenInicialDoTreino(aula, treino, positions),
    defesaInicial: treino.defesaInicial ? { move: treino.defesaInicial.move, primeira: fenDe(treino.defesaInicial.primeiraQuestaoId) } : null,
    politica: treino.defensor.politica,
    termino: { tipo: treino.termino.tipo, maxPlies: treino.termino.maxPlies ?? null },
    // Declarado pelo professor desde 15/9/2026; numa aula antiga, o da certificação congelada. O
    // valor é o mesmo nos dois lugares, e por isso a revisão das aulas publicadas não muda.
    resultado: resultadoDoTreinoV2(treino),
    questoes,
  };
}

export function revisaoDaPraticaV2(aula: AulaV2, praticaId: string, positions: Record<string, Position>): string {
  return revisao(conteudoDaPraticaV2(aula, praticaId, positions));
}

export function revisaoDoTreinoV2(aula: AulaV2, treinoId: string, positions: Record<string, Position>): string {
  return revisao(conteudoDoTreinoV2(aula, treinoId, positions));
}

/** A revisão de cada treino e prática da aula, pelo id da entidade. */
export function revisoesDaAulaV2(aula: AulaV2, positions: Record<string, Position>): RevisoesDaAulaV2 {
  const revisoes: RevisoesDaAulaV2 = {};
  for (const treino of aula.treinos) revisoes[treino.id] = { tipo: "treino", revisao: revisaoDoTreinoV2(aula, treino.id, positions) };
  for (const pratica of aula.praticas) revisoes[pratica.id] = { tipo: "pratica", revisao: revisaoDaPraticaV2(aula, pratica.id, positions) };
  return revisoes;
}
