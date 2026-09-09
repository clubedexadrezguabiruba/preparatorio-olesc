"use client";

import { useOptimistic, useTransition } from "react";
import { Barra } from "@/components/Barra";
import { META_DO_DIA_MIN, MINIMO_DA_SEQUENCIA_MIN, type MinutosDeHoje } from "@/lib/curso/hoje";
import { marcarPartidaDoDia } from "./acoes";

/**
 * O cartão do dia: **quanto do dia já foi** — e não o que fazer.
 *
 * ## Ele deixou de competir, e essa é a mudança inteira
 *
 * Até 2026-09-09 este cartão listava a rotina em três passos numerados, cada um
 * com o seu link: 1 Tática, 2 Finais, 3 Partida. Era a segunda e a terceira
 * resposta do painel para *"o que eu faço agora?"* — e ele discordava do
 * "Próximo passo" logo abaixo em três situações diferentes. Com 5 puzzles
 * vencidos, o painel apontava para dois lugares ao mesmo tempo.
 *
 * Quem responde "agora" passou a ser `Agora.tsx`, servido por `proximaAcao()`.
 * Este cartão ficou com o que só ele sabe: **o tempo**. É contexto de rotina,
 * não instrução — e por isso ele vem depois, e é baixo.
 *
 * ## A barra tem dois pedaços
 *
 * A meta de {@link META_DO_DIA_MIN} inclui os 30 minutos da partida, que
 * acontece no chess.com e o site **não mede** (`MINUTOS_DA_PARTIDA`). Então a barra pinta
 * o medido cheio e a partida hachurada: uma barra que pintasse os dois iguais
 * estaria afirmando ter cronometrado uma caixa de seleção.
 *
 * A sequência 🔥 saiu daqui para o cabeçalho, onde ela aparece em toda tela. O
 * que ficou é a linha que diz **o que ela cobra**: {@link
 * MINIMO_DA_SEQUENCIA_MIN} minutos de treino no site, sem a partida.
 *
 * ## O toque otimista
 *
 * Mesma regra de `Tarefas.tsx`: o aluno marca no celular, no 4G, e sem resposta
 * imediata ele aperta de novo achando que não pegou — e o segundo toque
 * desmarca o que o primeiro marcou.
 */
export function Hoje({
  minutos,
  sequencia,
  partidaFeita,
}: {
  minutos: MinutosDeHoje;
  sequencia: number;
  partidaFeita: boolean;
}) {
  const [jogou, aplicar] = useOptimistic(partidaFeita, (_atual, novo: boolean) => novo);
  const [, transicao] = useTransition();

  function alternar(marcar: boolean) {
    transicao(async () => {
      aplicar(marcar);
      await marcarPartidaDoDia(marcar);
    });
  }

  const bateu = minutos.total >= META_DO_DIA_MIN;

  return (
    <section aria-labelledby="hoje" className="cartao flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="hoje" className="rotulo text-tinta-fraca">
          Hoje
        </h2>
        <span
          className={`text-sm tabular-nums ${bateu ? "font-semibold text-metodo-tinta" : "text-tinta-media"}`}
        >
          {minutos.total} de {META_DO_DIA_MIN} min
        </span>
      </div>

      {/* O medido cheio, a partida hachurada. A hachura é a honestidade da
          barra: os 30 da partida são declaração, não cronômetro. */}
      <Barra
        feitos={minutos.medido}
        declarado={minutos.partida}
        de={META_DO_DIA_MIN}
        tom={bateu ? "completo" : "metodo"}
      />

      <p className="text-xs text-tinta-fraca tabular-nums">
        Tática {minutos.tatica} min · Finais {minutos.finais} min
        {minutos.partida > 0 ? ` · Partida ${minutos.partida} min declarados` : ""}
        {sequencia > 0
          ? ` · a sequência pede ${MINIMO_DA_SEQUENCIA_MIN} min de treino no site`
          : ""}
      </p>

      {/* A partida é o último bloco do dia, e é a decisão do Doug: treina-se
          primeiro, joga-se para aplicar. Ela nunca entra na fila do "Agora" —
          mandar o aluno embora do site não pode ser a resposta a "o que faço
          agora" —, então este é o único lugar dela no painel. */}
      <label className="-mx-2 flex cursor-pointer items-start gap-3 border-t border-borda-fraca px-2 pt-3">
        <input
          type="checkbox"
          className="foco mt-0.5 size-5 shrink-0"
          checked={jogou}
          onChange={(e) => alternar(e.target.checked)}
          aria-label="Joguei a partida de hoje"
        />
        <span
          className={`text-xs ${jogou ? "text-tinta-fraca line-through" : "text-tinta-media"}`}
        >
          Joguei uma partida de 15+10, anotada, e procurei o lance que a decidiu.
        </span>
      </label>
    </section>
  );
}
