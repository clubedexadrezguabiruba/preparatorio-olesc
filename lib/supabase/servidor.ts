import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * O cliente do servidor, ainda com a chave anônima e ainda sujeito à RLS.
 *
 * Ele carrega o cookie de sessão do aluno, então tudo que ele lê é o que
 * **aquele aluno** pode ler. É o cliente certo para página e server action que
 * agem em nome de quem está logado.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(paraGravar) {
          try {
            for (const { name, value, options } of paraGravar) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado de dentro de um Server Component, onde gravar cookie é
            // proibido. Pode ignorar: quem renova a sessão é o `proxy.ts`, que
            // roda antes e tem permissão.
          }
        },
      },
    },
  );
}
