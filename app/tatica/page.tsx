import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import { NIVEL, nivelDoAluno, situacaoDoItem } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { BLOCOS } from "@/lib/tatica/blocos";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema, PUZZLES_POR_TEMA, temaZerado } from "@/lib/tatica/progresso";

export const metadata: Metadata = { title: "Tática — Preparatório OLESC" };

/**
 * ## A pastilha trancada era código morto, e agora diz outra coisa
 *
 * Até 2026-09-09 ela dizia *"Abre no Sábado 2"*, e nunca aparecia: os 36 temas
 * já estavam todos escritos, então `temaAberto()` devolvia `true` para todos e
 * este ramo nunca rodava. Era um portão desenhado numa parede sem porta.
 *
 * Hoje ela diz **"Nível 4 — você está no 2"**, e o tema **continua clicável**.
 * A trava é mole de propósito (`TRANCA_DURA` em `lib/curso/nivel.ts`): o nível
 * governa o que o site recomenda, não o que ele permite. O tracejado é o que
 * diz "isto é adiantar", e adiantar é do aluno.
 */
export default async function Tatica() {
  const perfil = await perfilAtual();
  const [progresso, conquistado] = await Promise.all([
    progressoPorTema(),
    nivelConquistado(perfil.id),
  ]);
  const nivel = nivelDoAluno(conquistado);

  const feitos = [...progresso.values()].reduce((s, p) => s + p.tentativas, 0);
  const certos = [...progresso.values()].reduce((s, p) => s + p.certos, 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Curso de tática</h1>
        <p className="text-sm text-tinta-media">
          Cada tema tem aquecimento, série e prova — {PUZZLES_POR_TEMA} puzzles ao todo. A
          dificuldade sobe sozinha: você não escolhe o nível.
        </p>
        {feitos > 0 ? (
          <p className="text-sm text-tinta-fraca tabular-nums">
            {feitos} {feitos === 1 ? "puzzle resolvido" : "puzzles resolvidos"} ·{" "}
            {Math.round((100 * certos) / feitos)}% de acerto
          </p>
        ) : null}
      </header>

      {BLOCOS.map((bloco) => (
        <section key={bloco.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-base font-semibold text-tinta">
              <span className="text-tinta-fraca tabular-nums">{bloco.id}.</span> {bloco.nome}
            </h2>
            <span className="text-xs text-tinta-fraca tabular-nums">
              Nível {bloco.nivel} · FIDE {faixaFide(bloco.nivel)}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {bloco.temas.map((tema) => {
              const p = progresso.get(tema.tag) ?? temaZerado();
              const situacao = situacaoDoItem(bloco.nivel, nivel, temaAberto(tema.tag));

              // Sem texto escrito não há o que abrir, e nenhuma trava conserta
              // isso. É o único dos três estados que de fato fecha a porta.
              if (situacao === "em-escrita") {
                return (
                  <li
                    key={tema.tag}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-borda bg-carta/50 px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-tinta-fraca">{tema.nome}</p>
                      <p className="text-xs text-tinta-fraca">Este tema ainda não foi escrito.</p>
                    </div>
                  </li>
                );
              }

              const adiante = situacao === "adiante";

              return (
                <li key={tema.tag}>
                  <Link
                    href={`/tatica/${tema.tag}`}
                    className={`foco flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-carta-toque ${
                      adiante
                        ? "border-dashed border-borda bg-carta/50"
                        : "border-borda-fraca bg-carta"
                    }`}
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <p
                        className={`text-sm font-medium ${adiante ? "text-tinta-fraca" : "text-tinta"}`}
                      >
                        {tema.nome}
                      </p>
                      <p className="text-xs text-tinta-fraca">
                        {adiante
                          ? `Nível ${bloco.nivel} — você está no ${nivel}. Pode adiantar.`
                          : tema.resumo}
                      </p>
                      <div className="mt-0.5">
                        <Barra feitos={p.tentativas} de={PUZZLES_POR_TEMA} />
                      </div>
                    </div>
                    <div className="flex w-16 shrink-0 flex-col items-end">
                      <span className="text-sm font-semibold text-tinta tabular-nums">
                        {Math.min(p.tentativas, PUZZLES_POR_TEMA)}
                        <span className="text-tinta-fraca">/{PUZZLES_POR_TEMA}</span>
                      </span>
                      {p.tentativas > 0 ? (
                        <span className="text-xs text-tinta-fraca tabular-nums">
                          {Math.round((100 * p.certos) / p.tentativas)}%
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="text-xs text-tinta-fraca">
        Os puzzles vêm do banco público do Lichess (CC0), recortados por tema e por faixa de
        rating. As faixas FIDE são aproximadas — <strong>nada aqui é trancado por
        elas</strong>, e um tema de nível acima continua clicável.
      </p>
    </main>
  );
}

/** "800 a 1000", "1400+" — o rótulo do degrau, sem o `null` do teto na tela. */
function faixaFide(nivel: 1 | 2 | 3 | 4 | 5): string {
  const [piso, teto] = NIVEL[nivel].fide;
  if (teto === null) return `${piso}+`;
  return piso === 0 ? `até ${teto}` : `${piso} a ${teto}`;
}

