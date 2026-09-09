"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import type { ItemDaAgenda } from "@/lib/tarefas/agenda";
import { alternarTarefa } from "./acoes";

/**
 * A agenda: o que tem data marcada, agrupado por dia.
 *
 * ## Por que ela é uma lista à parte, e não mais tarefas do nível
 *
 * Porque o que a define é o relógio, e não a força do aluno. A véspera do
 * torneio não pertence a degrau nenhum — ela acontece em 10 de outubro, para
 * quem estiver no nível 1 e para quem estiver no 5. Misturada na rotina
 * permanente, ela apareceria três semanas cedo para uns e nunca para outros.
 *
 * ## Ela não tem barra de progresso, e a rotina tem
 *
 * A barra da rotina responde "quanto do meu degrau eu fiz". A agenda não tem
 * essa pergunta: um item passado não é uma pendência, é um dia que já aconteceu
 * — e uma barra em "2 de 4" na manhã de 11 de outubro leria como cobrança por
 * uma partida que não existe mais.
 *
 * O toque é otimista pelo mesmo motivo do `Tarefas`: o aluno marca no celular,
 * no 4G, e sem resposta imediata ele aperta de novo — desmarcando o que o
 * primeiro toque marcou.
 */
export function Agenda({
  grupos,
  marcadas: doServidor,
}: {
  /**
   * Os itens já agrupados por dia e **já rotulados** — "Sábado 2, 19 de
   * setembro". O agrupamento e a data são feitos no servidor de propósito:
   * quem sabe converter `"sabado-2"` em data é `SABADOS`, e uma função não
   * atravessa a fronteira para o cliente.
   */
  grupos: readonly { rotulo: string; itens: readonly ItemDaAgenda[] }[];
  marcadas: readonly string[];
}) {
  const [marcadas, aplicar] = useOptimistic(
    new Set(doServidor),
    (atual: Set<string>, mudanca: { id: string; marcar: boolean }) => {
      const novo = new Set(atual);
      if (mudanca.marcar) novo.add(mudanca.id);
      else novo.delete(mudanca.id);
      return novo;
    },
  );
  const [, transicao] = useTransition();

  function alternar(id: string, marcar: boolean) {
    transicao(async () => {
      aplicar({ id, marcar });
      await alternarTarefa(id, marcar);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {grupos.map((dia) => (
        <div key={dia.rotulo} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-tinta">{dia.rotulo}</h3>
          <ul className="flex flex-col gap-2">
            {dia.itens.map((item) => {
              const feita = marcadas.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`flex gap-3 rounded-xl border border-borda-fraca px-4 py-3 ${
                    feita ? "bg-carta/60" : "bg-carta"
                  }`}
                >
                  {/* O `-m-2 p-2` é o dedo de uma criança de oito anos: a caixa
                      desenhada tem 20 px e a área que responde ao toque passa a
                      ter 36, sem nada andar de lugar. É a mesma medida do
                      `Tarefas`, e mudar uma sem a outra faria a mesma tela ter
                      dois alvos de tamanhos diferentes. */}
                  <label className="-m-2 flex cursor-pointer self-start p-2 pt-2.5">
                    <input
                      type="checkbox"
                      className="foco size-5 shrink-0 accent-metodo-cheio"
                      checked={feita}
                      onChange={(e) => alternar(item.id, e.target.checked)}
                      aria-label={item.titulo}
                    />
                  </label>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p
                      className={`text-sm font-medium ${
                        feita ? "text-tinta-fraca line-through" : "text-tinta"
                      }`}
                    >
                      {item.titulo}
                    </p>
                    {item.detalhe ? (
                      <p className="text-xs text-tinta-fraca">{item.detalhe}</p>
                    ) : null}
                    <Onde onde={item.onde} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** O gêmeo do `Onde` de `Tarefas.tsx`: `url` nula é estado previsto, não falha. */
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
