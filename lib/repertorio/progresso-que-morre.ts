import "server-only";
import { contarSoAlunos, contasDasLinhas } from "../curso/so-alunos.ts";
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
 * **Só contas de aluno** (decisão do Doug, 13/9/2026): a conta de professor que jogou a linha
 * para testar não é aluno que perde progresso. No roteiro da fatia 8 a `professorteste` entrava
 * na conta. Ver `lib/curso/so-alunos.ts`.
 *
 * `null` quando o banco não responde: o impacto do conteúdo continua valendo, e a tela
 * diz que a contagem faltou em vez de dizer "nenhum aluno".
 */
export async function contarProgressoQueMorre(ids: readonly string[]): Promise<ProgressoQueMorre> {
  if (ids.length === 0) return { registros: 0, alunos: 0 };
  try {
    const admin = criarClienteAdmin();
    const { data, error } = await admin.from("repertorio_progresso").select("aluno").in("linha", [...ids]);
    if (error) return null;
    const linhas = (data ?? []) as Array<{ aluno: string }>;
    if (linhas.length === 0) return { registros: 0, alunos: 0 };
    const perfis = await admin.from("perfis").select("id, papel").in("id", contasDasLinhas(linhas));
    if (perfis.error) return null;
    const papeis = new Map((perfis.data ?? []).map((p) => [p.id as string, p.papel as string]));
    return contarSoAlunos(linhas, papeis);
  } catch {
    return null;
  }
}
