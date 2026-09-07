"use client";

import { useState, type ReactNode } from "react";
import { Negrito } from "@/components/texto/Negrito";

/**
 * A explicação passo a passo, com o tabuleiro grudado e o realce acompanhando.
 *
 * ## O problema medido
 *
 * A prosa das 30 dicas é escrita em notação algébrica — 29 delas citam casa ou
 * lance, 4,5 referências por dica — e nada na tela ligava "d5" à casa d5. Pior:
 * entre o diagrama e o primeiro parágrafo havia ~17 linhas de proveniência em
 * letra miúda (765 caracteres de média), então num celular de 360 px o aluno
 * lia "o peão de d4 é isolado" com o tabuleiro **fora da tela**, e tinha de
 * rolar para cima para conferir. Ida e volta a cada casa citada.
 *
 * ## O critério de aceite, e por que não é "explicação acima da dobra"
 *
 * Em 360 px, cabeçalho + tabuleiro + legenda + citação já passam de uma tela, e
 * exigir a explicação acima da dobra encolheria o tabuleiro — que é o objeto
 * que a criança precisa ler. O critério é **ausência de ida e volta**: com o
 * tabuleiro grudado, o passo atual é lido com a posição à vista.
 *
 * ## Por que o passo é um botão
 *
 * Porque é ele que manda no realce, e um controle tem de parecer um controle.
 * O aluno toca no passo que está lendo e o tabuleiro acende o que aquele passo
 * cita — não as 136 referências do módulo, as duas ou três daquele passo. Passo
 * sem casa nenhuma apaga o tabuleiro, e isso também é informação: aquele passo
 * fala do plano, não de uma casa.
 *
 * O passo que abre a página é o **primeiro que tem o que acender**, e não o
 * passo 1: a página que nasce com o tabuleiro apagado não ensina que ele
 * acende. Todos os passos ficam visíveis o tempo todo — "um passo por vez" no
 * celular é hipótese do plano a testar com alunos no piloto, não regra decidida
 * aqui.
 */
export function Passos({
  passos,
  camadas,
  legenda,
  citacao,
  children,
}: {
  passos: readonly { texto: string; realce: readonly string[] }[];
  /** Um SVG só de aros por passo, no mesmo `viewBox` do diagrama. */
  camadas: readonly string[];
  legenda: string;
  citacao: string;
  /** O diagrama, montado no servidor. */
  children: ReactNode;
}) {
  const [ativo, setAtivo] = useState(() => {
    const primeiro = passos.findIndex((p) => p.realce.length > 0);
    return primeiro === -1 ? 0 : primeiro;
  });

  // Duas colunas só a partir de `lg`, e não de `sm`. Medido em 1100 px com o
  // `max-w-2xl` de antes: partindo a coluna de 632 px em duas, o tabuleiro saía
  // com 304 px — **menor que os 320 px do celular**. Um tabuleiro que encolhe
  // quando a tela cresce é o contrário do que a tela larga é boa em fazer. De
  // 640 a 1024 px continua uma coluna só, com o tabuleiro grudado no topo: é o
  // mesmo desenho do celular, e ele cabe.
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,384px)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* `-mx-5 px-5` e o fundo opaco: grudado, ele passa por cima do texto que
          rola, e sem o fundo o texto atravessaria as casas claras. A margem
          negativa faz o fundo cobrir a calha da página, não só a coluna.
          `border-b`: sem ela, a linha de texto que passa por baixo é cortada no
          meio dos glifos e o corte lê como defeito de renderização em vez de
          borda de painel. */}
      <figure className="sticky top-0 z-10 -mx-5 flex flex-col gap-2 border-b border-borda-fraca bg-papel px-5 pb-3 pt-2 lg:mx-0 lg:top-4 lg:border-b-0 lg:px-0">
        <div className="relative mx-auto w-full max-w-sm">
          {children}
          {camadas.map((camada, i) => (
            <div
              key={i}
              hidden={i !== ativo}
              aria-hidden
              className="absolute inset-0 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: camada }}
            />
          ))}
        </div>
        <figcaption className="flex flex-col gap-1">
          <p className="text-sm text-tinta-media">{legenda}</p>
          {/* A citação de uma linha. A proveniência inteira não sumiu da
              página: desceu para o `<details>` do pé, onde continua aberta
              para o professor que abrir a dica no sábado. */}
          <p className="text-xs text-tinta-fraca">{citacao}</p>
        </figcaption>
      </figure>

      <ol className="flex flex-col gap-2">
        {passos.map((passo, i) => (
          <li key={passo.texto}>
            <button
              type="button"
              onClick={() => setAtivo(i)}
              aria-pressed={i === ativo}
              // A borda tem a mesma espessura nos dois estados e o que muda é a
              // cor: com espessura variável a lista inteira anda um pixel a cada
              // toque, e o passo que o aluno está lendo se mexe embaixo do dedo.
              //
              // ## Por que a borda é clara, e o que carrega o estado
              //
              // O escolhido é `carta` sobre `papel` (1,14:1 — o degrau do site
              // inteiro) com borda em `borda-forte` (1,56:1). Os dois estão
              // abaixo dos 3:1 que a WCAG 1.4.11 pede de um sinal **gráfico** de
              // estado, e escurecer a borda até cruzar o piso foi tentado e
              // medido: em `tinta-fraca` ela dá 6,14:1 e passa a pesar 2,16× uma
              // linha de rótulo, contra 0,93× da borda clara. Nada mais nesta
              // página passa de 1,35:1 — um contorno fechado escuro sai do
              // sistema de traços e lê como campo de formulário ou anel de foco,
              // que é justamente o que ele **não** é.
              //
              // A saída não é tinta, é **palavra**: o rótulo do escolhido diz
              // "agora no tabuleiro" e o dos outros diz "acende". O estado deixa
              // de depender de cor nenhuma — some no preto e branco, some para
              // quem não distingue tom, e é lido por leitor de tela junto com o
              // `aria-pressed`. A borda e o fundo viram reforço.
              className={`foco flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                i === ativo
                  ? "border-borda-forte bg-carta"
                  : "border-transparent bg-transparent hover:bg-carta"
              }`}
            >
              {/* O rótulo diz o que o botão faz, e não só onde ele está — sem
                  isto quem usa leitor de tela ouve "botão" e um parágrafo. E é
                  ele que carrega o estado, em palavra e em tom: "agora no
                  tabuleiro" contra "acende". */}
              <span className={`rotulo ${i === ativo ? "text-tinta" : "text-tinta-fraca"}`}>
                {/* "aceso ·" contra "· acende" — a palavra do escolhido é um
                    caractere **mais curta** que a do não escolhido, de propósito.
                    Medido: com "agora no tabuleiro" o rótulo de m12 quebrava em
                    duas linhas e o cartão crescia 16 px ao ser tocado, que é o
                    mesmo defeito da borda de espessura variável — o passo se
                    mexe embaixo do dedo de quem acabou de escolhê-lo. */}
                {i === ativo
                  ? `Passo ${i + 1} aceso · ${passo.realce.join(", ") || "nenhuma casa"}`
                  : `Passo ${i + 1} · ${
                      passo.realce.length > 0
                        ? `acende ${passo.realce.join(", ")}`
                        : "sem casa a acender"
                    }`}
              </span>
              <span className="text-sm leading-relaxed text-tinta">
                <Negrito>{passo.texto}</Negrito>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
