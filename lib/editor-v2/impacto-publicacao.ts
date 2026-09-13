/**
 * O que uma publicação muda no curso — especificação §20.1 ("mostra impacto em curso, nível,
 * alunos e avaliações") e plano §10 ("o editor calcula alunos e requisitos afetados antes da
 * publicação; conquistas históricas não são apagadas silenciosamente").
 *
 * Conta pura: compara o pacote ativo com o candidato, avaliação por avaliação, pela revisão.
 * Os **alunos** afetados vêm do banco e são contados na action, por fora — o banco pode não
 * responder, e o impacto do conteúdo não pode depender disso.
 */
import { aulaDaTrilha } from "../finais/trilha.ts";
import type { PacoteV2 } from "./pacote.ts";

export type SituacaoDaAvaliacaoV2 = "nova" | "mudou" | "igual" | "removida";

export type ImpactoDaPublicacaoV2 = {
  aulaId: string;
  publicationIdAnterior: string | null;
  publicationIdNovo: string;
  /** Republicar o mesmo conteúdo: nada muda para ninguém. */
  mesmoConteudo: boolean;
  /** O nível que a aula fecha na trilha (ou o declarado, numa aula extra). */
  nivel: number | null;
  temPratica: boolean;
  temPraticaAntes: boolean | null;
  avaliacoes: Array<{ entidadeId: string; tipo: "treino" | "pratica"; titulo: string; situacao: SituacaoDaAvaliacaoV2; revisao: string | null; revisaoAnterior: string | null }>;
};

function tituloDe(pacote: PacoteV2, entidadeId: string): string {
  return pacote.aula.treinos.find((t) => t.id === entidadeId)?.titulo
    ?? pacote.aula.praticas.find((p) => p.id === entidadeId)?.titulo
    ?? entidadeId;
}

export function impactoDaPublicacaoV2(anterior: PacoteV2 | null, novo: PacoteV2): ImpactoDaPublicacaoV2 {
  const ids = [...new Set([...Object.keys(anterior?.revisoes ?? {}), ...Object.keys(novo.revisoes)])].sort();
  const avaliacoes = ids.map((entidadeId) => {
    const antes = anterior?.revisoes[entidadeId];
    const depois = novo.revisoes[entidadeId];
    const situacao: SituacaoDaAvaliacaoV2 = !antes ? "nova" : !depois ? "removida" : antes.revisao === depois.revisao ? "igual" : "mudou";
    return {
      entidadeId,
      tipo: (depois ?? antes)!.tipo,
      titulo: depois ? tituloDe(novo, entidadeId) : tituloDe(anterior!, entidadeId),
      situacao,
      revisao: depois?.revisao ?? null,
      revisaoAnterior: antes?.revisao ?? null,
    };
  });
  return {
    aulaId: novo.aula.id,
    publicationIdAnterior: anterior?.publicationId ?? null,
    publicationIdNovo: novo.publicationId,
    mesmoConteudo: anterior?.publicationId === novo.publicationId,
    nivel: aulaDaTrilha(novo.aula.id)?.nivel ?? novo.aula.metadados?.nivel ?? null,
    temPratica: novo.aula.praticas.length > 0,
    temPraticaAntes: anterior ? anterior.aula.praticas.length > 0 : null,
    avaliacoes,
  };
}

/** O impacto em frases de professor, na ordem em que importam. */
export function frasesDoImpactoV2(impacto: ImpactoDaPublicacaoV2, alunos: { comProgresso: number | null }): string[] {
  if (impacto.mesmoConteudo) return ["Esta publicação é igual à que está ativa: nada muda para os alunos."];
  const frases: string[] = [];
  frases.push(impacto.publicationIdAnterior
    ? "Substitui a publicação v2 ativa; ela continua guardada e pode ser reativada."
    : "É a primeira publicação v2 desta aula: os alunos deixam de receber a versão antiga.");
  if (impacto.nivel !== null) frases.push(`A aula conta para o fechamento do nível ${impacto.nivel}.`);
  for (const avaliacao of impacto.avaliacoes) {
    const nome = `${avaliacao.tipo === "pratica" ? "Prática" : "Treino"} «${avaliacao.titulo}»`;
    if (avaliacao.situacao === "nova") frases.push(`${nome}: avaliação nova${avaliacao.tipo === "pratica" ? " — o domínio da aula passa a depender dela" : ""}.`);
    if (avaliacao.situacao === "mudou") frases.push(`${nome}: a tarefa mudou. O domínio conquistado na versão anterior fica no histórico e não vale para a nova.`);
    if (avaliacao.situacao === "removida") frases.push(`${nome}: sai da aula. As tentativas antigas continuam guardadas.`);
  }
  if (!impacto.temPratica) frases.push("A aula não tem prática: ninguém consegue dominá-la.");
  if (alunos.comProgresso === null) frases.push("Não foi possível contar os alunos com progresso nesta aula agora (o banco não respondeu).");
  else frases.push(alunos.comProgresso === 0 ? "Nenhum aluno tem progresso registrado nesta aula." : `${alunos.comProgresso} aluno(s) têm progresso registrado nesta aula.`);
  return frases;
}
