/**
 * As duas contas do ensaio: um professor e o aluno de teste.
 *
 * - **Aluno:** `alunoteste`, a mesma conta de `scripts/aluno-de-teste.ts` (PIN conhecido, conta de
 *   mentira — ver o cabeçalho daquele script).
 * - **Professor:** `professore2e`, com PIN **sorteado a cada rodada** e guardado só na memória do
 *   preparo. O ensaio não precisa do PIN depois de entrar: a sessão fica no arquivo de estado do
 *   navegador, em `.editor/e2e/` (fora do Git). Assim nenhum PIN de professor vive no repositório nem
 *   no `.env.local`.
 *
 * Apagar a conta leva junto o perfil e as tentativas (`on delete cascade`).
 */
import { randomInt } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../../lib/auth/usuario.ts";
import { carregarEnvLocal } from "./protecao.ts";

export const PROFESSOR = "professore2e";
export const ALUNO = "alunoteste";
export const PIN_DO_ALUNO = "112233";

function admin(): SupabaseClient {
  carregarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  return createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function idDaConta(usuario: string): Promise<string | null> {
  const { data } = await admin().from("perfis").select("id").eq("usuario", usuario).maybeSingle();
  return data?.id ?? null;
}

export async function apagarConta(usuario: string): Promise<boolean> {
  const id = await idDaConta(usuario);
  if (!id) return false;
  const { error } = await admin().auth.admin.deleteUser(id);
  if (error) throw new Error(`o Supabase recusou apagar ${usuario}: ${error.message}`);
  return true;
}

async function criar(usuario: string, pin: string, metadados: Record<string, string>): Promise<string> {
  await apagarConta(usuario);
  const { data, error } = await admin().auth.admin.createUser({
    email: emailDoUsuario(usuario),
    password: pin,
    email_confirm: true,
    user_metadata: { usuario, ...metadados },
  });
  if (error || !data.user) throw new Error(`o Supabase recusou criar ${usuario}: ${error?.message}`);
  return data.user.id;
}

export async function criarContasDoEnsaio(): Promise<{ pinDoProfessor: string }> {
  const pinDoProfessor = String(randomInt(100000, 1000000));
  await criar(PROFESSOR, pinDoProfessor, { nome: "Professor de Ensaio", papel: "professor" });
  await criar(ALUNO, PIN_DO_ALUNO, { nome: "Aluno de Teste", papel: "aluno", equipe: "M", rating: "1100" });
  return { pinDoProfessor };
}

export async function apagarContasDoEnsaio(): Promise<string[]> {
  const apagadas: string[] = [];
  for (const usuario of [PROFESSOR, ALUNO]) if (await apagarConta(usuario)) apagadas.push(usuario);
  return apagadas;
}

/** As linhas de tentativa de aula v2 do aluno de ensaio — a prova "no banco" da parada 10G. */
export async function tentativasDoAluno(aulaId: string): Promise<Array<{ etapa: string; publication_id: string | null; sucesso: boolean | null }>> {
  const id = await idDaConta(ALUNO);
  if (!id) return [];
  const { data, error } = await admin().from("tentativas_aula").select("*").eq("aluno", id).eq("aula", aulaId);
  if (error) throw new Error(`leitura de tentativas_aula falhou: ${error.message}`);
  return (data ?? []) as Array<{ etapa: string; publication_id: string | null; sucesso: boolean | null }>;
}
