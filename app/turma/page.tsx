import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar/Avatares";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { turmaVisivel } from "@/lib/turma/vitrine";

export const metadata: Metadata = { title: "A turma — Preparatório OLESC" };

/**
 * A turma: os colegas, cada um com o avatar que escolheu (Doug, 17/9/2026).
 *
 * ## Uma grade de rostos, e nada que se compare
 *
 * **Ordem alfabética, sem número nenhum**: nem nível, nem selo, nem "12 conquistas". A página
 * responde "quem está comigo?", e não "quem está na frente?" — o aluno não tem ranking
 * (`docs/TATICA-RATING.md`), e uma grade ordenada por qualquer coisa que não o nome viraria um.
 * O que cada um conquistou está a um toque, na vitrine (`/turma/[id]`), um colega por vez.
 *
 * O próprio aluno aparece no lugar dele da ordem, marcado "você", e o cartão dele leva a "Meu
 * perfil" — a vitrine de si mesmo seria uma versão pior da página que ele já tem.
 *
 * A conta de ensaio (`alunoteste`) não aparece para os alunos e aparece para o professor; a
 * regra e o porquê estão em `lib/turma/turma.ts`.
 */
export default async function Turma() {
  const perfil = await perfilAtual();
  const [cabecalho, turma] = await Promise.all([dadosDoCabecalho(perfil.id), turmaVisivel(perfil)]);
  const professor = perfil.papel === "professor";

  return (
    <>
      <Cabecalho atual="turma" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} largura="larga" />
      <Moldura largura="larga" barraInferior className="gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="titulo text-tinta">A turma</h1>
          <p className="max-w-prose text-sm text-tinta-media">
            {professor
              ? "Os alunos em ordem alfabética, como eles se veem. A conta de ensaio só aparece para você."
              : "Quem treina com você, em ordem alfabética. Toque num colega para ver as conquistas de cada um."}
          </p>
        </header>

        {turma.length === 0 ? (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">Nenhum aluno cadastrado ainda.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
            {turma.map((colega) => (
              <li key={colega.id}>
                <Link
                  href={colega.ehVoce ? "/perfil" : `/turma/${colega.id}`}
                  aria-label={colega.ehVoce ? `${colega.nome} (você): Meu perfil` : colega.nome}
                  className={`foco cartao-alvo flex h-full flex-col items-center gap-2 px-2 pt-4 pb-3 text-center ${
                    colega.ehVoce ? "ring-2 ring-metodo-cheio" : ""
                  }`}
                >
                  <Avatar id={colega.avatar} tamanho={64} decorativo className="sm:size-18" />
                  <span className="line-clamp-2 text-sm leading-snug font-medium break-words text-tinta">{colega.nome}</span>
                  {colega.ehVoce ? <span className="text-xs font-semibold text-metodo-tinta">você</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Moldura>
    </>
  );
}
