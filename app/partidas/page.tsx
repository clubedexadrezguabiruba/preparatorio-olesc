import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { NIVEIS, NIVEL } from "@/lib/curso/nivel";
import { listarPartidas, podeVerRascunho } from "@/lib/partidas/carregar";
import { situacoesDoAluno } from "@/lib/partidas/progresso";

export const metadata: Metadata = { title: "Partidas modelo — Preparatório OLESC" };

/**
 * As partidas modelo, por nível: 3 em cada, pela curadoria de 15/9/2026.
 *
 * Deixou de ser o teste das fichas-piloto: cada partida conta no nível dela
 * (`lib/curso/nivel.ts`), e o placar é gravado. O que o aluno vê é só o que o
 * Doug revisou; o professor e o ambiente local veem também o rascunho, com o selo
 * "em revisão" — é por aqui que o Doug aprova sem abrir arquivo.
 */
export default async function Partidas() {
  const perfil = await perfilAtual();
  const verRascunho = podeVerRascunho(perfil.papel);
  const [partidas, situacoes, cabecalho] = await Promise.all([
    listarPartidas(verRascunho),
    situacoesDoAluno(perfil.id, verRascunho),
    dadosDoCabecalho(perfil.id),
  ]);

  return (
    <>
      <Cabecalho atual="partidas" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} largura="leitura" />
      <Moldura largura="leitura" barraInferior className="gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="titulo text-tinta">Partidas modelo</h1>
          <p className="text-sm text-tinta-media">
            Partidas de mestres, escolhidas para o seu nível. Você resolve os momentos de decisão e
            fecha com o Desafio final. As três do nível contam para passar de nível.
          </p>
        </header>

        {partidas.length === 0 ? (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
            As partidas modelo ainda estão em revisão. Volte em breve.
          </p>
        ) : null}

        {NIVEIS.map((nivel) => {
          const doNivel = partidas.filter((p) => p.nivel === nivel);
          if (doNivel.length === 0) return null;
          const aqui = cabecalho.nivel === nivel;
          return (
            <section key={nivel} className="flex flex-col gap-2" aria-labelledby={`nivel-${nivel}`}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h2 id={`nivel-${nivel}`} className="text-base font-semibold text-tinta">
                  Nível {nivel}
                </h2>
                {aqui ? <span className="rotulo text-metodo-tinta">o seu nível</span> : null}
              </div>
              <p className="text-xs text-tinta-fraca">{NIVEL[nivel].resumo}</p>
              <ul className="flex flex-col gap-2">
                {doNivel.map((p) => {
                  const s = situacoes.get(p.slug);
                  return (
                    <li key={p.slug}>
                      <Link
                        href={`/partidas/${p.slug}`}
                        className="foco flex flex-col gap-1 cartao px-4 py-3 transition-colors hover:bg-carta-toque"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-tinta">{p.nome}</span>
                          {p.status === "rascunho" ? (
                            <span className="rounded-full border border-aviso px-2 py-0.5 text-xs font-medium text-aviso-tinta">
                              em revisão
                            </span>
                          ) : null}
                          {s?.concluida ? (
                            <span className="rounded-full bg-metodo-cheio px-2 py-0.5 text-xs font-semibold text-tinta-inversa">
                              ✓ concluída
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-tinta-media">{p.tema}</span>
                        <span className="text-xs text-tinta-fraca tabular-nums">
                          {p.ano} · você joga de {p.cor} · {p.momentos.length} momentos
                          {s && !s.concluida && s.resolvidos > 0
                            ? ` · ${s.resolvidos} de ${p.momentos.length} resolvidos`
                            : ""}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </Moldura>
    </>
  );
}
