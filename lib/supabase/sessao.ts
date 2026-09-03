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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Este é o **primeiro** erro que uma máquina nova produz, e ele acontece em
  // toda rota ao mesmo tempo: o guarda roda antes de qualquer página. Sem esta
  // conferência, o que aparece é a mensagem do próprio Supabase, que manda
  // conferir as configurações do painel — verdade pela metade, porque o que
  // falta aqui é o arquivo local onde elas são coladas.
  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copie .env.example para .env.local, preencha com as chaves do projeto " +
        "Supabase (Settings > API) e reinicie o `npm run dev` — o Next só lê " +
        ".env.local ao subir.",
    );
  }

  const supabase = createServerClient(url, chave, {
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
  });

  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const caminho = request.nextUrl.pathname;
  const publica = PUBLICAS.includes(caminho);

  if (!logado && !publica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("proxima", caminho);
    return NextResponse.redirect(destino);
  }

  if (logado && caminho === "/entrar") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/painel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}
