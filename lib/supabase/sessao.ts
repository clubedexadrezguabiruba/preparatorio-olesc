import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** As rotas que existem sem login. Todo o resto exige entrar. */
const PUBLICAS = ["/", "/entrar"];

/**
 * Renova a sessão e barra a rota fechada, antes de qualquer página renderizar.
 *
 * Isto é o **primeiro** guarda, não o único. A RLS do Postgres é quem de fato
 * impede um aluno de ler os dados de outro; este aqui só evita a tela vazia e o
 * redirecionamento tardio. Um guarda de rota que fosse a única defesa cairia
 * com uma chamada direta à API do Supabase, sem passar pelo site.
 */
export async function renovarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(paraGravar) {
          for (const { name, value } of paraGravar) request.cookies.set(name, value);
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of paraGravar) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const caminho = request.nextUrl.pathname;
  const publica = PUBLICAS.includes(caminho);

  if (!logado && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("proxima", caminho);
    return NextResponse.redirect(url);
  }

  if (logado && caminho === "/entrar") {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
}
