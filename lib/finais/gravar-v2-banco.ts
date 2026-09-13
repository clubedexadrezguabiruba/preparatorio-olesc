import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { pacoteAtivoDoAluno, pacoteDaPublicacao } from "./conteudo-v2.ts";
import { gravarTentativaDeAulaV2, type BancoDasTentativasV2, type ConteudoDasTentativasV2 } from "./gravar-v2.ts";
import type { ResultadoDeAulaV2, TentativaDeAulaV2 } from "./tentativa-v2.ts";

/**
 * As pontas de `gravar-v2.ts` no mundo: o disco do servidor e o Supabase com a chave de serviço.
 *
 * Quem escreve é a chave de serviço, como no v1 (`gravar.ts`): `tentativas_aula`,
 * `avaliacoes_progresso` e `tentativas_v2_sem_snapshot` não têm política de escrita para
 * ninguém (migration 0010). O `aluno` chega **já conferido** pela server action, tirado do
 * cookie de sessão.
 */
export function bancoDasTentativasV2(): BancoDasTentativasV2 {
  const admin = criarClienteAdmin();
  return {
    inserirTentativa: async (linha) => {
      // `ignoreDuplicates` + `select`: a linha nova volta; o retry não volta nada.
      const { data, error } = await admin
        .from("tentativas_aula")
        .upsert(linha, { onConflict: "tentativa_id", ignoreDuplicates: true })
        .select("id");
      if (error) return { erro: error.message };
      return { inserida: (data ?? []).length > 0 };
    },
    guardarSemSnapshot: async (linha) => {
      await admin.from("tentativas_v2_sem_snapshot").upsert(linha, { onConflict: "tentativa_id", ignoreDuplicates: true });
    },
    lerEscada: async ({ aluno, aula, entidadeId, assessmentRevision }) => {
      const { data, error } = await admin
        .from("avaliacoes_progresso")
        .select("tentativas, erros, aprendida_em, ultima_em, degrau, revisar_em")
        .eq("aluno", aluno).eq("aula", aula).eq("entidade_id", entidadeId).eq("assessment_revision", assessmentRevision)
        .maybeSingle();
      if (error) return { erro: error.message };
      return data
        ? { tentativas: data.tentativas, erros: data.erros, aprendidaEm: data.aprendida_em, ultimaEm: data.ultima_em, degrau: data.degrau, revisarEm: data.revisar_em }
        : null;
    },
    gravarEscada: async ({ aluno, aula, entidadeId, assessmentRevision }, p) => {
      const { error } = await admin.from("avaliacoes_progresso").upsert(
        {
          aluno, aula, entidade_id: entidadeId, assessment_revision: assessmentRevision,
          tentativas: p.tentativas, erros: p.erros, aprendida_em: p.aprendidaEm, ultima_em: p.ultimaEm, degrau: p.degrau, revisar_em: p.revisarEm,
        },
        { onConflict: "aluno,aula,entidade_id,assessment_revision" },
      );
      return !error;
    },
  };
}

export const conteudoDasTentativasV2: ConteudoDasTentativasV2 = {
  publicacao: (aula, publicationId) => pacoteDaPublicacao(aula, publicationId),
  ativo: (aula) => pacoteAtivoDoAluno(aula),
};

export function gravarTentativaV2NoBanco(aluno: string, tentativa: TentativaDeAulaV2): Promise<ResultadoDeAulaV2> {
  return gravarTentativaDeAulaV2(aluno, tentativa, conteudoDasTentativasV2, bancoDasTentativasV2());
}
