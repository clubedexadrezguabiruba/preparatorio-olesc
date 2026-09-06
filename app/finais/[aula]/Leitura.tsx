"use client";

import { useEffect, useState, useTransition } from "react";
import { leituraDaAula, marcarLeitura } from "@/app/finais/acoes";

/**
 * O fim da aula de **leitura**: a caixa em que o aluno declara que leu o
 * objetivo e viu o exemplo até o fim.
 *
 * ## Por que é declaração, e não medida
 *
 * A regra editorial de `0003_tarefas.sql:12-25`, aplicada dentro da mesma
 * feature: *existe verdade no servidor para reconferir?* Nas etapas 4 e 5
 * existe — são os lances jogados, e o servidor os rejulga. Em "li até o fim"
 * não existe nada para reconferir, e um botão que o professor apertasse no
 * sábado para liberar o que o aluno leu na quarta seria teatro. Então quem
 * grava é o próprio aluno, com a RLS de `aula_lida` valendo.
 *
 * ## Por que o estado vem por uma ida de rede, e não do servidor que renderizou
 *
 * A página da aula é estática: o mesmo HTML para a turma inteira, sem consulta
 * nenhuma na abertura. Duas das 49 aulas são de leitura; cobrar das outras 47
 * uma ida ao banco só para que estas duas soubessem o estado seria pagar caro
 * no lugar errado. Enquanto a resposta não chega, o controle aparece
 * desabilitado — e não desmarcado, que seria mentira por um instante.
 *
 * O toque é otimista pelo motivo do `Tarefas.tsx`: o aluno marca no celular, no
 * 4G, e sem resposta imediata ele aperta de novo achando que não pegou — e o
 * segundo toque desmarca o que o primeiro marcou.
 */
export function Leitura({ aula }: { aula: string }) {
  const [lida, setLida] = useState<boolean | null>(null);
  const [, transicao] = useTransition();

  useEffect(() => {
    let vivo = true;
    void leituraDaAula(aula).then((resposta) => {
      if (vivo) setLida(resposta);
    });
    return () => {
      vivo = false;
    };
  }, [aula]);

  function alternar(marcar: boolean) {
    setLida(marcar);
    transicao(async () => {
      await marcarLeitura(aula, marcar);
    });
  }

  return (
    <div
      className={`flex gap-3 rounded-xl border px-4 py-3 ${
        lida ? "border-metodo-cheio bg-carta" : "border-borda-fraca bg-carta"
      }`}
    >
      {/* O `-m-2 p-2` é o dedo de uma criança de oito anos: a caixa desenhada
          tem 20 px e a área que responde ao toque passa a ter 36, sem que nada
          na tela ande de lugar. Mesma conta do `app/painel/Tarefas.tsx`. */}
      <label className="-m-2 flex cursor-pointer self-start p-2 pt-2.5">
        <input
          type="checkbox"
          className="foco size-5 shrink-0 accent-metodo-cheio"
          checked={lida === true}
          disabled={lida === null}
          onChange={(e) => alternar(e.target.checked)}
          aria-label="Marcar esta aula como lida"
        />
      </label>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-tinta">
          {lida ? "Aula lida." : "Li o objetivo e vi o exemplo até o fim."}
        </p>
        <p className="text-xs text-tinta-fraca">
          Esta aula não tem tabuleiro para jogar — ela é de leitura. Marcar aqui é o que a
          conta como dominada na trilha.
        </p>
      </div>
    </div>
  );
}
