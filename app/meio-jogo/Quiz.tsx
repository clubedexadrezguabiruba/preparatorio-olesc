"use client";

import { useState } from "react";
import { Negrito } from "@/components/texto/Negrito";

/**
 * A pergunta da dica, com a resposta na própria tela.
 *
 * ## Quem é o juiz, e por que a tela diz isso
 *
 * Numa série de tática o juiz é a solução do puzzle; numa aula de finais é a
 * tablebase. Aqui o juiz é **o autor** — não existe máquina que decida qual é o
 * plano certo numa posição de 24 peças. Esconder isso seria vender julgamento
 * como fato, então a tela escreve de quem é a opinião, em letra miúda, embaixo
 * da explicação.
 *
 * ## Nada é gravado
 *
 * O acerto não vai para o banco, e não é esquecimento: o que a `dica_lida`
 * guarda é a declaração de leitura, e um percentual de acerto sobre uma
 * pergunta cujo gabarito é opinião entraria no relatório do professor com a
 * mesma cara dos números que a tablebase certificou. Um número que não se pode
 * defender ao lado do aluno não entra.
 *
 * ## O erro não some
 *
 * Errar não bloqueia nem reinicia: as três opções continuam clicáveis depois da
 * resposta, e a explicação fica na tela. Quem errou precisa ler o porquê com a
 * opção errada ainda à vista — é ali que a dica ensina, não no acerto.
 *
 * ## A letra não sai do lugar do ✓
 *
 * O disco de cada opção mostrava "a", "b", "c" **até** o aluno responder, e aí
 * trocava a letra da certa por um ✓. Quem sai da tela levando "a resposta é a
 * b" perdia justamente a etiqueta da alternativa que precisava lembrar, e as
 * três deixavam de ser referenciáveis em voz alta no sábado ("olhem a c"). A
 * letra fica sempre; o ✓ e o ✗ entram **ao lado** dela, num segundo símbolo.
 */
export function Quiz({
  pergunta,
  opcoes,
  certa,
  porque,
}: {
  pergunta: string;
  opcoes: readonly string[];
  certa: number;
  porque: string;
}) {
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const respondeu = escolhida !== null;
  const acertou = escolhida === certa;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-4">
      <h2 className="rotulo text-tinta-fraca">Pergunta</h2>
      <p className="text-sm font-medium text-tinta">{pergunta}</p>

      <ul className="flex flex-col gap-2">
        {opcoes.map((opcao, i) => {
          // Depois de responder, as três dizem o que são: a certa fica verde
          // mesmo que o aluno não a tenha escolhido — é ela que ele precisa
          // reconhecer da próxima vez.
          const estilo = !respondeu
            ? "border-borda bg-carta text-tinta hover:bg-carta-toque"
            : i === certa
              ? "border-metodo-cheio bg-metodo-superficie/12 text-metodo-tinta-alta"
              : i === escolhida
                ? "border-erro bg-erro-superficie/12 text-erro-tinta"
                : "border-borda-fraca bg-carta text-tinta-fraca";

          return (
            <li key={opcao}>
              <button
                type="button"
                onClick={() => setEscolhida(i)}
                aria-pressed={escolhida === i}
                className={`foco flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${estilo}`}
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold"
                >
                  {String.fromCharCode(97 + i)}
                </span>
                <span className="flex-1">{opcao}</span>
                {/* O veredito da opção, depois de respondida. Vai à direita
                    para não disputar espaço com a letra, e é `aria-hidden`
                    porque o texto do parágrafo abaixo já diz a mesma coisa —
                    um leitor de tela ouviria "certa" duas vezes. */}
                {respondeu && (i === certa || i === escolhida) ? (
                  <span aria-hidden className="mt-0.5 shrink-0 text-sm font-bold">
                    {i === certa ? "✓" : "✗"}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {respondeu ? (
        <div
          className={`flex flex-col gap-1 rounded-lg px-3 py-2.5 ${
            acertou ? "bg-metodo-superficie/12" : "bg-aviso-superficie/14"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              acertou ? "text-metodo-tinta-alta" : "text-aviso-tinta"
            }`}
          >
            {acertou ? "É essa." : "Não é essa — leia por quê."}
          </p>
          <p className="text-sm text-tinta-media">
            <Negrito>{porque}</Negrito>
          </p>
          <p className="text-xs text-tinta-fraca">
            Quem responde aqui é o autor da dica, não o computador: em meio-jogo não há lance
            para reconferir. Sua resposta não é gravada.
          </p>
        </div>
      ) : null}
    </section>
  );
}
