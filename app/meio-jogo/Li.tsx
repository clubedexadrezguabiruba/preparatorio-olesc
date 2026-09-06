"use client";

import { useState, useTransition } from "react";
import { marcarDica } from "@/app/meio-jogo/acoes";

/**
 * A caixa em que o aluno declara que leu a dica.
 *
 * É o gêmeo de `app/finais/[aula]/Leitura.tsx`, com uma diferença: lá o estado
 * chega por uma ida de rede, porque a página da aula é **estática** e não pode
 * carregar dentro do HTML o que só vale para um aluno. Aqui a página já é
 * dinâmica — ela lê `dica_lida` para desenhar a lista —, então o estado vem
 * pronto do servidor, em `inicial`, e a tela nunca aparece desabilitada.
 *
 * O toque é otimista pelo motivo de sempre: o aluno marca no celular, no 4G, e
 * sem retorno imediato ele aperta de novo achando que não pegou — e o segundo
 * toque desmarca o que o primeiro marcou.
 */
export function Li({ dica, inicial }: { dica: string; inicial: boolean }) {
  const [lida, setLida] = useState(inicial);
  const [, transicao] = useTransition();

  function alternar(marcar: boolean) {
    setLida(marcar);
    transicao(async () => {
      await marcarDica(dica, marcar);
    });
  }

  return (
    <div
      className={`flex gap-3 rounded-xl border px-4 py-3 ${
        lida ? "border-metodo-cheio bg-carta" : "border-borda-fraca bg-carta"
      }`}
    >
      {/* O `-m-2 p-2` é o dedo de uma criança de onze anos: a caixa desenhada
          tem 20 px e a área que responde ao toque passa a ter 36, sem que nada
          na tela ande de lugar. Mesma conta do `app/painel/Tarefas.tsx`. */}
      <label className="-m-2 flex cursor-pointer self-start p-2 pt-2.5">
        <input
          type="checkbox"
          className="foco size-5 shrink-0 accent-metodo-cheio"
          checked={lida}
          onChange={(e) => alternar(e.target.checked)}
          aria-label="Marcar esta dica como lida"
        />
      </label>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-tinta">
          {lida ? "Dica lida." : "Li a dica e respondi a pergunta."}
        </p>
        <p className="text-xs text-tinta-fraca">
          Marcar aqui é o que conta esta dica na sua trilha. Nada em meio-jogo é medido pelo
          computador — quem sabe se você leu é você.
        </p>
      </div>
    </div>
  );
}
