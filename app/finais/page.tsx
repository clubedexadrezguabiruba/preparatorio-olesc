import type { Metadata } from "next";
import Link from "next/link";
import { indiceDeAulas } from "@/lib/finais/conteudo";

/**
 * A lista de aulas de finais.
 *
 * **É provisória, e a página diz isso.** A trilha de verdade — quatro classes,
 * o formato de cada aula, o estado do aluno, o sábado em que ela abre — é o
 * bloco B4, e mora em `lib/finais/trilha.ts`. Enquanto ela não existe, esta
 * lista é o que o gate produziu: as aulas que estão em `content/lessons/`, na
 * ordem do disco, com o `status` escrito em voz alta.
 *
 * Atrás do login como todo o resto do site: o guarda de `proxy.ts` cobre tudo
 * o que não é estático, e `/finais` não pediu exceção nenhuma. O que ainda não
 * existe aqui é gravação — o banco é o B3 — e o que decide quais aulas o aluno
 * pode abrir é a trilha, no B4.
 */

export const metadata: Metadata = { title: "Finais — Preparatório OLESC" };

export default function Finais() {
  const aulas = indiceDeAulas();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Curso de finais</h1>
        <p className="text-sm text-tinta-media">
          Cada aula explica a técnica, mostra um exemplo animado e devolve o tabuleiro para
          você jogar — primeiro com dica, depois sozinho, depois contra o computador.
        </p>
      </header>

      {aulas.length === 0 ? (
        <p className="text-sm text-tinta-fraca">Nenhuma aula publicada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {aulas.map((aula) => (
            <li key={aula.id}>
              <Link
                href={`/finais/${aula.id}`}
                className="foco flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-medium text-tinta">{aula.titulo}</p>
                  <p className="text-xs text-tinta-fraca tabular-nums">
                    {aula.etapas} {aula.etapas === 1 ? "etapa" : "etapas"}
                    {aula.status === "draft" ? " · rascunho" : null}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
