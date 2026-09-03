import "server-only";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Perfil = {
  id: string;
  usuario: string;
  nome: string;
  papel: "aluno" | "professor";
  equipe: "M" | "F" | null;
  tabuleiro: number | null;
  rating: number | null;
};

/**
 * O perfil de quem está logado, ou o redirecionamento para `/entrar`.
 *
 * O `proxy.ts` já barra a rota fechada, mas ele responde uma pergunta mais
 * fraca: "tem cookie de sessão?". Esta função responde "existe perfil?" — e as
 * duas se separam num caso real: a conta criada e o gatilho de perfil falhando.
 * O aluno entraria, e a página quebraria lendo `undefined`.
 */
export async function perfilAtual(): Promise<Perfil> {
  const supabase = await criarClienteServidor();
  const { data: sessao } = await supabase.auth.getUser();
  if (!sessao.user) redirect("/entrar");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, usuario, nome, papel, equipe, tabuleiro, rating")
    .eq("id", sessao.user.id)
    .single();

  if (!perfil) redirect("/entrar");
  return perfil as Perfil;
}

/**
 * O mesmo, mas recusando quem não é professor.
 *
 * Isto é a **segunda** tranca de `/professor`, não a primeira nem a última: a
 * primeira é o `proxy.ts`, e a última é a RLS. Ela existe porque as ações
 * daquela tela usam a chave de serviço, que ignora a RLS — ali a conferência
 * de quem pediu tem de ser explícita, porque não sobra mais ninguém para
 * fazê-la.
 */
export async function professorAtual(): Promise<Perfil> {
  const perfil = await perfilAtual();
  if (perfil.papel !== "professor") redirect("/painel");
  return perfil;
}
