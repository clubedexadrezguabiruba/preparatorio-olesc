import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * O cliente da chave de serviço. **Ele passa por cima de toda a RLS.**
 *
 * O `import "server-only"` no topo não é decoração: ele faz a build **falhar**
 * se algum dia um componente de cliente importar este arquivo por engano. Sem
 * ele, a chave que ignora todas as políticas do banco viajaria dentro do
 * pacote JavaScript entregue ao celular do aluno, e nada avisaria.
 *
 * Só três coisas têm motivo para usá-lo, e todas rodam no servidor:
 *
 * 1. criar a conta do aluno (o Auth não deixa ninguém se cadastrar sozinho);
 * 2. gravar a tentativa de puzzle depois de reconferir o lance;
 * 3. os scripts de manutenção do professor.
 *
 * Em toda função que o usa, a primeira linha do corpo é conferir **quem está
 * pedindo** — a chave não sabe, e não vai perguntar.
 */
export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente. " +
        "Copie .env.example para .env.local e preencha com as chaves do projeto Supabase.",
    );
  }
  return createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
