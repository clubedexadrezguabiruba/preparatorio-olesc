import type { Metadata } from "next";
import Link from "next/link";
import { perfilAtual } from "@/lib/auth/perfil";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { BLOCOS } from "@/lib/tatica/blocos";
import { sair } from "@/app/entrar/acoes";

export const metadata: Metadata = { title: "Painel — Preparatório OLESC" };

const EQUIPE = { M: "Equipe masculina", F: "Equipe feminina" } as const;

export default async function Painel() {
  const perfil = await perfilAtual();
  const supabase = await criarClienteServidor();

  // A RLS já limita ao próprio aluno: não há `where aluno = eu` aqui, e não é
  // esquecimento. Escrevê-lo daria a impressão de que ele é a proteção — e no
  // dia em que alguém o apagasse, nada mudaria na tela e tudo mudaria na
  // segurança. A política do Postgres é o filtro; esta consulta só pergunta.
  const { count: resolvidos } = await supabase
    .from("tentativas_puzzle")
    .select("*", { count: "exact", head: true });

  const { count: acertos } = await supabase
    .from("tentativas_puzzle")
    .select("*", { count: "exact", head: true })
    .eq("acertou", true);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="rotulo text-metodo-tinta">Preparatório OLESC 2026</p>
          <h1 className="titulo text-tinta">{perfil.nome}</h1>
          <p className="text-sm text-tinta-fraca">
            {perfil.equipe ? EQUIPE[perfil.equipe] : "Professor"}
            {perfil.tabuleiro ? ` · tabuleiro ${perfil.tabuleiro}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {perfil.papel === "professor" ? (
            <Link
              href="/professor"
              className="foco rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
            >
              Área do professor
            </Link>
          ) : null}
          <form action={sair}>
            <button
              type="submit"
              className="foco rounded-lg px-2 py-1.5 text-sm text-tinta-fraca hover:text-tinta"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <section className="flex gap-3">
        <Numero rotulo="Puzzles resolvidos" valor={resolvidos ?? 0} />
        <Numero
          rotulo="Acerto"
          valor={resolvidos ? `${Math.round((100 * (acertos ?? 0)) / resolvidos)}%` : "—"}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">Curso de tática</h2>
        <ol className="flex flex-col gap-2">
          {BLOCOS.map((bloco) => (
            <li
              key={bloco.id}
              className="flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-metodo-superficie/15 text-sm font-semibold text-metodo-tinta-alta">
                {bloco.id}
              </span>
              <span className="flex-1 text-sm font-medium text-tinta">{bloco.nome}</span>
              <span className="text-xs text-tinta-fraca tabular-nums">
                {bloco.faixa[0]}–{bloco.faixa[1]}
              </span>
            </li>
          ))}
        </ol>
        <Link
          href="/tatica"
          className="foco self-start rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
        >
          Resolver puzzles
        </Link>
        <p className="rounded-lg bg-dica-superficie/12 px-3 py-2 text-sm text-dica-tinta">
          Os blocos 1 e 2 estão abertos. Dentro de cada tema os puzzles vêm em ordem de
          dificuldade: começam fáceis e vão subindo.
        </p>
      </section>
    </main>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
      <span className="text-2xl font-semibold text-tinta tabular-nums">{valor}</span>
      <span className="text-xs text-tinta-fraca">{rotulo}</span>
    </div>
  );
}
