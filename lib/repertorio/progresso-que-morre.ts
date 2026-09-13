import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import type { ProgressoQueMorre } from "./editor/impacto.ts";

/**
 * Quantos registros de `repertorio_progresso` apontam para linhas que vão deixar de
 * existir — a parte do impacto do repertório que mora no banco.
 *
 * A chave de serviço é a certa aqui pelo mesmo motivo do impacto de aula
 * (`app/editor/v2/acoes.ts`): o professor precisa contar **todos** os alunos, e quem
 * chama é uma action que já passou por `exigirEditor()`.
 *
 * `null` quando o banco não responde: o impacto do conteúdo continua valendo, e a tela
 * diz que a contagem faltou em vez de dizer "nenhum aluno".
 */
export async function contarProgressoQueMorre(ids: readonly string[]): Promise<ProgressoQueMorre> {
  if (ids.length === 0) return { registros: 0, alunos: 0 };
  try {
    const { data, error } = await criarClienteAdmin().from("repertorio_progresso").select("aluno").in("linha", [...ids]);
    if (error) return null;
    const linhas = (data ?? []) as Array<{ aluno: string }>;
    return { registros: linhas.length, alunos: new Set(linhas.map((l) => l.aluno)).size };
  } catch {
    return null;
  }
}
