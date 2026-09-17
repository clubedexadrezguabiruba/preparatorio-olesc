import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar/Avatares";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { GradeDeSelos } from "@/components/selos/ListaDeSelos";
import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { vitrineDoColega } from "@/lib/turma/vitrine";

export const metadata: Metadata = { title: "Colega — Preparatório OLESC" };

/**
 * A vitrine de um colega: avatar, nome, nível com o metal, e os selos que ele ganhou.
 *
 * **Só isso**, e a lista do que fica de fora — com o porquê de cada item — está em
 * `lib/turma/turma.ts`. A leitura é de `lib/turma/vitrine.ts`, a única porta de um aluno para
 * outro: a RLS continua fechada, e o servidor escolhe as colunas.
 *
 * - O próprio aluno vai para "Meu perfil" (a vitrine de si mesmo seria uma versão pior dela).
 * - Conta que não existe, conta de professor e conta de ensaio (vista por aluno) são 404 — a
 *   mesma resposta para as três, para a página não servir de sonda de quem existe.
 * - Os selos saem **sem data** e sem contagem ("12 de 40"): na vitrine, os dois viram comparação.
 *   Em medalhas compactas, família por família (17/9/2026): com todos ganhos, a lista de uma linha
 *   por selo ocupava a tela inteira.
 */
export default async function VitrineDoColega({ params }: PageProps<"/turma/[id]">) {
  const perfil = await perfilAtual();
  const { id } = await params;
  if (id === perfil.id) redirect("/perfil");

  const [cabecalho, vitrine] = await Promise.all([dadosDoCabecalho(perfil.id), vitrineDoColega(perfil, id)]);
  if (!vitrine) notFound();

  const primeiroNome = vitrine.nome.split(/\s+/)[0];

  return (
    <>
      <Cabecalho atual="turma" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} />
      <Moldura largura="painel" barraInferior>
        <nav aria-label="Voltar">
          <Link
            href="/turma"
            className="foco -mx-2 -my-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-metodo-tinta hover:underline"
          >
            ← A turma
          </Link>
        </nav>

        <header className="flex items-center gap-4 sm:gap-6">
          <Avatar id={vitrine.avatar} tamanho={96} className="sm:size-28" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <h1 className="titulo break-words text-tinta">{vitrine.nome}</h1>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COR_DO_NIVEL[vitrine.nivel].pastilha}`}
            >
              Nível {vitrine.nivel} · {vitrine.metal}
            </span>
          </div>
        </header>

        <section aria-labelledby="conquistas" className="flex flex-col gap-4">
          <h2 id="conquistas" className="rotulo text-tinta-fraca">
            Conquistas
          </h2>
          {vitrine.selos.length === 0 ? (
            <p className="cartao-vazio px-4 py-5 text-sm text-tinta-fraca">
              {primeiroNome} ainda não ganhou selos. Eles aparecem aqui conforme o treino anda.
            </p>
          ) : (
            <GradeDeSelos selos={vitrine.selos} rotulo={`Selos de ${vitrine.nome}`} />
          )}
        </section>

        {perfil.papel === "professor" ? (
          <p className="border-t border-borda-fraca pt-4 text-sm">
            <Link href={`/professor/${vitrine.id}`} className="foco font-medium text-metodo-tinta hover:underline">
              Abrir o relatório completo →
            </Link>
          </p>
        ) : null}
      </Moldura>
    </>
  );
}
