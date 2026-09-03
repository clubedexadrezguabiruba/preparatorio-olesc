import type { Metadata } from "next";
import Link from "next/link";
import { professorAtual } from "@/lib/auth/perfil";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { CadastroDeAluno } from "./CadastroDeAluno";

export const metadata: Metadata = { title: "Professor — Preparatório OLESC" };

const EQUIPE = { M: "Masculina", F: "Feminina" } as const;

export default async function Professor() {
  await professorAtual();
  const supabase = await criarClienteServidor();

  // Ler todos os perfis só funciona porque `eh_professor()` abriu a política
  // de `select` — a mesma consulta feita por um aluno devolve uma linha só.
  const { data: alunos } = await supabase
    .from("perfis")
    .select("id, usuario, nome, equipe, tabuleiro, rating")
    .eq("papel", "aluno")
    .order("equipe", { nullsFirst: false })
    .order("nome");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="rotulo text-metodo-tinta">Área do professor</p>
          <h1 className="titulo text-tinta">Alunos</h1>
        </div>
        <Link
          href="/painel"
          className="foco rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
        >
          Voltar ao painel
        </Link>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">Criar conta</h2>
        <CadastroDeAluno />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">
          {alunos?.length ?? 0} {alunos?.length === 1 ? "aluno" : "alunos"}
        </h2>
        {alunos?.length ? (
          <div className="overflow-x-auto rounded-xl border border-borda-fraca bg-carta">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borda-fraca text-left text-tinta-fraca">
                  <Th>Nome</Th>
                  <Th>Usuário</Th>
                  <Th>Equipe</Th>
                  <Th>Tab.</Th>
                  <Th>Rating</Th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr key={aluno.id} className="border-b border-borda-fraca last:border-0">
                    <Td>{aluno.nome}</Td>
                    <Td mono>{aluno.usuario}</Td>
                    <Td>{aluno.equipe ? EQUIPE[aluno.equipe as "M" | "F"] : "—"}</Td>
                    <Td>{aluno.tabuleiro ?? "—"}</Td>
                    <Td>{aluno.rating ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center text-sm text-tinta-fraca">
            Nenhum aluno ainda. Crie a primeira conta acima.
          </p>
        )}
      </section>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 text-tinta ${mono ? "font-mono text-xs" : ""}`}>{children}</td>
  );
}
