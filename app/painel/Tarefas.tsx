"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Barra } from "@/components/Barra";
import type { EstadoDaTarefa } from "@/lib/tarefas/estado";
import { alternarTarefa } from "./acoes";

/**
 * A lista de tarefas da semana.
 *
 * **A caixa tem de responder na hora.** O aluno marca a tarefa no celular, no
 * 4G, e a ida ao servidor demora o que demorar; sem `useOptimistic` ele
 * apertaria de novo achando que não pegou — e o segundo toque desmarcaria o
 * que o primeiro marcou. O estado otimista é o que faz o toque valer antes da
 * resposta, e a contagem do cabeçalho anda junto com ele pelo mesmo motivo.
 *
 * As tarefas medidas — tática e finais — não têm caixa. Elas são contadas de
 * `tentativas_puzzle` e de `tentativas_aula`, e uma caixa ali seria o aluno
 * opinando sobre um número que o servidor já sabe.
 */
export function Tarefas({ estados }: { estados: EstadoDaTarefa[] }) {
  const [marcadas, aplicar] = useOptimistic(
    new Set(estados.filter((e) => e.feita && e.tarefa.tipo === "marcar").map((e) => e.tarefa.id)),
    (atual: Set<string>, mudanca: { id: string; marcar: boolean }) => {
      const novo = new Set(atual);
      if (mudanca.marcar) novo.add(mudanca.id);
      else novo.delete(mudanca.id);
      return novo;
    },
  );
  const [, transicao] = useTransition();

  function estaFeita(estado: EstadoDaTarefa): boolean {
    // Só a tarefa de marcar responde ao toque otimista; as medidas respondem ao
    // que o servidor contou, e por isso não passam pelo conjunto local.
    return estado.tarefa.tipo === "marcar" ? marcadas.has(estado.tarefa.id) : estado.feita;
  }

  const feitas = estados.filter(estaFeita).length;

  function alternar(id: string, marcar: boolean) {
    transicao(async () => {
      aplicar({ id, marcar });
      await alternarTarefa(id, marcar);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-tinta-media tabular-nums">
          {feitas} de {estados.length} feitas
        </span>
        {feitas === estados.length ? (
          <span className="text-sm font-medium text-metodo-tinta">Semana fechada 🎉</span>
        ) : null}
      </div>
      <Barra feitos={feitas} de={estados.length} tom={feitas === estados.length ? "completo" : "metodo"} />

      <ul className="flex flex-col gap-2">
        {estados.map((estado) => (
          <li
            key={estado.tarefa.id}
            className={`flex gap-3 rounded-xl border px-4 py-3 ${
              estaFeita(estado)
                ? "border-borda-fraca bg-carta/60"
                : "border-borda-fraca bg-carta"
            }`}
          >
            {estado.tarefa.tipo === "marcar" ? (
              /*
               * O `-m-2 p-2` é o dedo de uma criança de oito anos.
               *
               * A caixa desenhada tem 20 px, que é o tamanho certo para ela
               * ler; a área que **responde ao toque** passa a ter 36, sem que
               * nada na tela ande de lugar — a margem negativa devolve
               * exatamente o que o padding tomou. Sem isto, errar o alvo por
               * dois pixels no celular é o comportamento normal, e o aluno
               * conclui que o site não funciona.
               */
              <label className="-m-2 flex cursor-pointer self-start p-2 pt-2.5">
                <input
                  type="checkbox"
                  className="foco size-5 shrink-0 accent-metodo-cheio"
                  checked={marcadas.has(estado.tarefa.id)}
                  onChange={(e) => alternar(estado.tarefa.id, e.target.checked)}
                  aria-label={estado.tarefa.titulo}
                />
              </label>
            ) : (
              <div className="pt-0.5">
                <Selo feita={estado.feita} />
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p
                className={`text-sm font-medium ${
                  estaFeita(estado) ? "text-tinta-fraca line-through" : "text-tinta"
                }`}
              >
                {estado.tarefa.titulo}
              </p>

              {estado.tarefa.detalhe ? (
                <p className="text-xs text-tinta-fraca">{estado.tarefa.detalhe}</p>
              ) : null}

              {estado.medida ? (
                <div className="mt-1 flex flex-col gap-1">
                  <Barra
                    feitos={estado.medida.feitos}
                    de={estado.medida.meta}
                    tom={estado.feita ? "completo" : "metodo"}
                  />
                  <p className="text-xs text-tinta-media tabular-nums">
                    {Math.min(estado.medida.feitos, estado.medida.meta)} de {estado.medida.meta}{" "}
                    {estado.medida.tipo === "finais" ? "aulas dominadas" : "puzzles"}
                    {estado.medida.tipo === "tatica" && estado.medida.acerto !== null ? (
                      <>
                        {" · "}
                        <span
                          className={
                            estado.medida.acerto >= estado.medida.acertoEsperado
                              ? "text-metodo-tinta"
                              : "text-aviso-tinta"
                          }
                        >
                          {estado.medida.acerto}% de acerto
                        </span>
                        <span className="text-tinta-muda">
                          {" "}
                          (meta {estado.medida.acertoEsperado}%)
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              ) : null}

              <Onde onde={estado.tarefa.onde} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Selo({ feita }: { feita: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
        feita
          ? "border-metodo-cheio bg-metodo-cheio text-tinta-inversa"
          : "border-borda-forte text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

/**
 * O destino da tarefa — ou o aviso de que ele ainda não existe.
 *
 * `url` nula não é falha: o clube da OLESC no chess.com e o caderno em PDF são
 * combinados com o aluno no sábado e ainda estão sendo feitos. Dizer isso é
 * melhor que um link morto, e melhor que esconder a linha — o aluno lê que a
 * tarefa existe e que o caminho vem.
 */
function Onde({ onde }: { onde: { rotulo: string; url: string | null } | null }) {
  if (!onde) return null;

  if (!onde.url) {
    return (
      <p className="mt-0.5 text-xs text-aviso-tinta">
        {onde.rotulo} — o professor entrega o link no sábado.
      </p>
    );
  }

  const externo = onde.url.startsWith("http");
  const classe = "foco mt-0.5 w-fit text-xs font-medium text-metodo-tinta hover:underline";

  return externo ? (
    <a href={onde.url} target="_blank" rel="noreferrer noopener" className={classe}>
      {onde.rotulo} ↗
    </a>
  ) : (
    <Link href={onde.url} className={classe}>
      {onde.rotulo} →
    </Link>
  );
}
