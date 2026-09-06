import type { Linha } from "@/lib/repertorio/linhas";
import type { Selo } from "@/lib/repertorio/passada";

/**
 * As duas fitas do treinador: a dos lances jogados, e a do boletim.
 *
 * Elas moram no mesmo arquivo porque são o mesmo objeto visto de dois ângulos —
 * a linha, lance a lance. Uma diz **o que** foi jogado; a outra, **como** foi.
 */

/* ------------------------------------------------------------------ *
 * A faixa de lances
 * ------------------------------------------------------------------ */

/**
 * Os lances em SAN, com os nossos em negrito e o último em destaque.
 *
 * Medido: são 110 comentários em 42 linhas, e 42 deles são o do lance final;
 * uma tela construída em volta do comentário mostraria caixa vazia quase
 * sempre. A faixa é o que sempre tem o que dizer.
 *
 * **Só os lances já jogados.** A faixa inteira daria a resposta de graça — e é
 * justamente ela que serve para o aluno ver *onde* errou depois.
 *
 * Os SAN ficam em inglês aqui, e é deliberado: a faixa é registro, não
 * comando. O cartão, que dá a ordem, traduz (`sanEmPortugues`); traduzir os
 * dois deixaria o aluno sem nenhuma âncora quando ele abrisse o mesmo lance
 * num site de xadrez.
 */
export function FaixaDeSans({ linha, ate, atual }: { linha: Linha; ate: number; atual: number }) {
  if (ate <= 0) {
    return <p className="min-h-8 text-sm text-tinta-muda">A posição inicial.</p>;
  }

  return (
    <p className="flex min-h-8 flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm text-tinta-media tabular-nums">
      {linha.sans.slice(0, ate).map((san, i) => (
        <span key={`${i}-${san}`} className="flex items-baseline gap-1">
          {i % 2 === 0 ? <span className="text-tinta-muda">{i / 2 + 1}.</span> : null}
          <span
            className={`${linha.meus.includes(i) ? "font-semibold text-tinta" : ""} ${
              i === atual ? "rounded bg-metodo-superficie/20 px-1 text-metodo-tinta-alta" : ""
            }`}
          >
            {san}
          </span>
        </span>
      ))}
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * O boletim
 * ------------------------------------------------------------------ */

/**
 * Um selo por lance nosso, e a acurácia ao lado.
 *
 * **Ele mostra *onde* a linha quebrou, e não só quantas vezes.** As `Bolinhas`
 * do cabeçalho contam passadas limpas ao longo de dias; esta fita conta lances
 * dentro de **uma** passada. São perguntas diferentes, e por isso as duas ficam
 * na tela.
 *
 * A falha é **vermelha**, e não o cinza do chess.com. Lá o cinza funciona
 * porque o aluno acabou de ver o erro revelado com o comentário do autor; aqui,
 * numa fita de oito quadradinhos, cinza lê como "não tentado" — que é
 * exatamente o oposto do que aconteceu.
 *
 * A `alternativa` sai verde: o autor a marcou como igualmente boa, e o servidor
 * a conta como acerto. Pintá-la de âmbar aqui faria a fita discordar do número
 * ao lado dela, na mesma linha da tela.
 */
export function FitaDoBoletim({
  boletim,
  acertos,
}: {
  boletim: readonly (Selo | null)[];
  acertos: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <ul className="flex items-center gap-3" aria-hidden>
        {boletim.map((selo, i) => (
          <li
            key={i}
            className={`flex size-5 items-center justify-center rounded text-[11px] font-bold leading-none ${
              selo === "falha"
                ? "bg-erro-superficie text-tinta-inversa"
                : selo === null
                  ? "bg-carta-alta text-tinta-muda"
                  : "bg-metodo-cheio text-tinta-inversa"
            }`}
          >
            {selo === "falha" ? "✗" : selo === null ? "" : "✓"}
          </li>
        ))}
      </ul>
      {/*
       * O número diz em palavra o que os quadradinhos dizem em forma — é a
       * mesma regra da `Bolinhas` e da `components/Barra`: os selos são
       * `aria-hidden`, e quem lê a tela ouve a frase uma vez só.
       */}
      <p className="text-sm text-tinta-media tabular-nums">
        <strong className="font-semibold text-tinta">
          {acertos} de {boletim.length}
        </strong>{" "}
        {boletim.length === 1 ? "lance certo" : "lances certos"}
      </p>
    </div>
  );
}
