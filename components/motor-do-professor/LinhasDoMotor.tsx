"use client";

import { useState } from "react";
import type { EstadoDoMotorDoProfessor } from "@/lib/engine/useMotorDoProfessor";

/**
 * Os melhores lances, logo abaixo da faixa (§23.1).
 *
 * **Uma linha de texto cada, sem quebrar.** A coluna é estreita e a lista de lances precisa
 * da altura; a linha é cortada com `…`, e o texto inteiro fica no `title`. Enquanto o motor
 * ainda não tem número, as linhas aparecem reservadas com "…" — se nascessem só com o
 * primeiro retrato, a lista de lances embaixo pularia de lugar.
 *
 * **Recolhidas em uma, com "+N" para abrir** (regra de aceite da parada 9D). Medido em
 * 1366×768 na N0-LADDER: com as duas linhas abertas a lista de lances mostrava 4 lances
 * inteiros, abaixo dos 5 exigidos, mesmo com o bloco de edição já a 40%. O motor continua
 * calculando quantas linhas o menu `⋯` pediu; a tela mostra a melhor e abre as outras a um
 * clique. A escolha de abrir é da sessão, como tudo do motor.
 *
 * Não são clicáveis nesta fatia: virar variante é posterior (§23.1).
 */
export function LinhasDoMotor({ estado, quantas }: { estado: EstadoDoMotorDoProfessor; quantas: number }) {
  const [abertas, setAbertas] = useState(false);
  if (estado.status === "desligado" || estado.status === "terminal") return null;
  const visiveis = abertas ? quantas : 1;
  const linhas = Array.from({ length: visiveis }, (_, i) => estado.linhas[i] ?? null);
  const escondidas = quantas - 1;
  return (
    <div data-motor="linhas" className="flex shrink-0 flex-col gap-0.5">
      <ol aria-label="Melhores lances do motor" className="flex flex-col gap-0.5">
        {linhas.map((linha, i) => (
          <li
            key={i}
            title={linha ? `${linha.curto}  ${linha.san}` : undefined}
            className="flex h-5 min-w-0 items-center gap-2 text-xs"
          >
            <span className="w-11 shrink-0 text-right font-semibold tabular-nums text-tinta">{linha?.curto ?? "…"}</span>
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-tinta-media">
              {linha ? linha.san : ""}
              {linha ? <span className="sr-only"> ({linha.extenso})</span> : null}
            </span>
            {i === 0 && escondidas > 0 ? (
              <button
                type="button"
                aria-expanded={abertas}
                aria-label={abertas ? "Recolher as linhas do motor" : `Mostrar mais ${escondidas} ${escondidas === 1 ? "linha" : "linhas"} do motor`}
                title={abertas ? "Recolher" : `Mostrar mais ${escondidas}`}
                onClick={() => setAbertas((a) => !a)}
                className="foco shrink-0 rounded border border-borda-forte px-1.5 text-[11px] leading-4 text-tinta-media hover:bg-carta-toque hover:text-tinta"
              >
                {abertas ? "−" : `+${escondidas}`}
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {estado.poucasPecas ? (
        <p className="truncate pl-[3.25rem] text-[11px] text-tinta-fraca" title="Com até 7 peças, o resultado certificado é o da tablebase; o motor é só apoio.">
          até 7 peças: o resultado certo vem da base de finais
        </p>
      ) : null}
    </div>
  );
}
