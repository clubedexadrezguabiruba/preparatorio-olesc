import { createBrowserClient } from "@supabase/ssr";

/**
 * O cliente do navegador. Carrega a chave **anônima**, que é pública por
 * desenho: tudo que ela pode fazer é o que as políticas de RLS deixarem.
 *
 * A chave de serviço nunca chega aqui — ela mora em `admin.ts`, que é
 * `server-only`.
 */
export function criarCliente() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
