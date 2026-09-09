/** Uma sessão da conta de ensaio, na forma de cookies que o @supabase/ssr lê. */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";

export function lerEnv(caminho = ".env.local") {
  return Object.fromEntries(
    readFileSync(caminho, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

export async function cookiesDeEnsaio(env, usuario) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: `${usuario}@alunos.olesc.local`,
  });
  if (error) throw new Error(`generateLink: ${error.message}`);

  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const verificado = await anon.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });
  if (verificado.error) throw new Error(`verifyOtp: ${verificado.error.message}`);

  // Deixa o próprio @supabase/ssr dizer que cookies ele escreveria.
  let escritos = [];
  const ssr = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies: { getAll: () => [], setAll: (c) => (escritos = c) } },
  );
  await ssr.auth.setSession({
    access_token: verificado.data.session.access_token,
    refresh_token: verificado.data.session.refresh_token,
  });
  return escritos.map(({ name, value }) => ({
    name,
    value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }));
}
