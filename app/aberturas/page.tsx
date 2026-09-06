import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import { lerIndice } from "@/lib/repertorio/banco";
import { CORES, type Cor } from "@/lib/repertorio/linhas";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import { aprendidasDaAbertura } from "@/lib/repertorio/treino";

export const metadata: Metadata = { title: "Aberturas — Preparatório OLESC" };

const TITULO: Record<Cor, string> = {
  brancas: "Você de brancas",
  pretas: "Você de pretas",
};

const RESUMO: Record<Cor, string> = {
  brancas: "Você começa com 1.e4. Cada abertura aqui é a resposta a uma defesa.",
  pretas: "Ele começa. Estas são as respostas — quase todas terminam em posição igual.",
};

/**
 * A lista das aberturas do repertório.
 *
 * **A barra conta linhas aprendidas, não linhas tentadas.** É a diferença entre
 * "abri" e "sei": a tática mede tentativas porque um puzzle tentado é um puzzle
 * pensado, e aqui o exercício é decorar — três acertos seguidos, e errar zera.
 *
 * A contagem sai do `index.json` mais o mapa de progresso filtrado pelo
 * prefixo do id, e não da leitura dos doze arquivos: desenhar doze barrinhas
 * não é motivo para abrir doze JSON.
 */
export default async function Aberturas() {
  await perfilAtual();
  const [indice, progresso] = await Promise.all([lerIndice(), progressoDoRepertorio()]);

  const aprendidas = indice.reduce(
    (soma, e) => soma + aprendidasDaAbertura(progresso, e.cor, e.abertura),
    0,
  );
  const total = indice.reduce((soma, e) => soma + e.linhas, 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Repertório do clube</h1>
        <p className="text-sm text-tinta-media">
          {total} linhas curtas, até o lance 8. Uma linha é aprendida quando você a acerta{" "}
          <strong className="font-semibold text-tinta">três vezes seguidas</strong> — errar
          zera a conta.
        </p>
        <p className="text-sm text-tinta-fraca tabular-nums">
          {aprendidas} de {total} aprendidas
        </p>
      </header>

      {CORES.map((cor) => {
        const daCor = indice.filter((e) => e.cor === cor);
        if (daCor.length === 0) return null;

        return (
          <section key={cor} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-tinta">{TITULO[cor]}</h2>
              <p className="text-xs text-tinta-fraca">{RESUMO[cor]}</p>
            </div>

            <ul className="flex flex-col gap-2">
              {daCor.map((abertura) => {
                const feitas = aprendidasDaAbertura(progresso, cor, abertura.abertura);
                const completa = feitas >= abertura.linhas;

                return (
                  <li key={`${cor}/${abertura.abertura}`}>
                    <Link
                      href={`/aberturas/${cor}/${abertura.abertura}`}
                      className="foco flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="truncate text-sm font-medium text-tinta">{abertura.nome}</p>
                        <Barra
                          feitos={feitas}
                          de={abertura.linhas}
                          tom={completa ? "completo" : "metodo"}
                        />
                      </div>
                      <div className="flex w-20 shrink-0 flex-col items-end">
                        <span className="text-sm font-semibold text-tinta tabular-nums">
                          {feitas}
                          <span className="text-tinta-muda">/{abertura.linhas}</span>
                        </span>
                        <span className="text-xs text-tinta-fraca">
                          {completa ? "aprendida" : abertura.linhas === 1 ? "1 linha" : "linhas"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="text-xs text-tinta-muda">
        As linhas vêm dos cursos do clube e do motor, e cada uma diz de onde veio. Se você
        esquecer no meio, o site mostra a linha de novo antes de cobrar.
      </p>
    </main>
  );
}
