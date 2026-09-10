"use client";

import { Miniatura } from "@/components/editor/Miniatura";

export type Diagrama = {
  fen: string;
  fala: string;
  /** Os códigos que a conferência acusou neste diagrama. Vazio é diagrama limpo. */
  problemas: string[];
};

/**
 * A coluna de diagramas, no modelo dos capítulos de um estudo do Lichess.
 *
 * Cada passo da etapa é um selo numerado com a posição dele. Clicar leva o
 * tabuleiro àquele diagrama — que é como o professor escreve a fala do passo 7
 * olhando para a posição do passo 7, em vez de contar os cliques a partir do
 * começo.
 *
 * ## O "+" mora no vão, e não numa barra
 *
 * O gesto que o Doug pediu é "acrescentar um diagrama **aqui**", e "aqui" é um
 * lugar entre dois selos. Um botão único no alto da coluna não teria esse
 * "aqui": ele acrescentaria sempre no fim, e mover o passo até o meio seria um
 * segundo gesto — o de arrastar, que ainda não existe. Então cada vão da coluna
 * é um alvo, inclusive o de cima e o de baixo.
 *
 * Eles ficam quase invisíveis até o ponteiro passar por cima, senão treze
 * sinais de mais competiriam com os treze diagramas pela atenção de quem só
 * quer escolher um. Mas ficam no DOM e recebem foco: um "+" que só existe no
 * `:hover` é um botão que não existe para quem anda de Tab.
 *
 * Arrastar para reordenar e a lixeira com desfazer entram aqui depois, como
 * gestos sobre a mesma lista.
 *
 * ## O erro aparece no diagrama, não numa lista de códigos
 *
 * Quando a conferência acusa alguma coisa, o selo do passo ganha borda
 * vermelha e o código vira frase ao lado. Uma lista de erros embaixo da tela
 * obrigaria o professor a traduzir `roteiro[3]` para "o terceiro diagrama" com
 * o dedo — e `TREINO_SEM_NO` não quer dizer nada para quem não escreveu o gate.
 */
export function ListaDeDiagramas({
  diagramas,
  atual,
  orientation,
  aoEscolher,
  aoAcrescentar,
  cabeMais,
}: {
  diagramas: Diagrama[];
  atual: number;
  orientation: "white" | "black";
  aoEscolher: (indice: number) => void;
  /** Acrescenta um diagrama **antes** do índice pedido. */
  aoAcrescentar: (indice: number) => void;
  /** Falso quando a etapa chegou ao teto do schema — o vão vira frase. */
  cabeMais: boolean;
}) {
  return (
    <nav aria-label="Diagramas desta etapa" className="flex flex-col">
      <Vao
        indice={0}
        total={diagramas.length}
        cabeMais={cabeMais}
        aoAcrescentar={aoAcrescentar}
      />
      {diagramas.map((d, i) => {
        const selecionado = i === atual;
        const temProblema = d.problemas.length > 0;
        return (
          <div key={i}>
          <button
            type="button"
            onClick={() => aoEscolher(i)}
            aria-current={selecionado ? "true" : undefined}
            className={`foco flex items-start gap-2.5 rounded-lg border p-1.5 text-left transition-colors ${
              selecionado
                ? "border-foco bg-carta-alta"
                : "border-transparent hover:border-borda-fraca hover:bg-carta-alta"
            }`}
          >
            <Miniatura fen={d.fen} orientation={orientation} tamanho={64} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <span className="rotulo text-tinta-fraca">{i + 1}</span>
              {/* Duas linhas da fala, cortadas: o selo é para reconhecer o
                  diagrama, e a fala inteira está do outro lado da tela. */}
              <span className="line-clamp-2 text-xs leading-snug text-tinta-media">
                {d.fala || <em className="text-tinta-muda">sem fala</em>}
              </span>
              {temProblema && (
                <span className="text-xs font-medium text-erro-tinta">
                  {d.problemas.length === 1 ? d.problemas[0] : `${d.problemas.length} problemas`}
                </span>
              )}
            </span>
            {temProblema && (
              <span
                aria-label={`${d.problemas.length} problema(s) neste diagrama`}
                className="mt-1 size-2 shrink-0 rounded-full bg-erro"
              />
            )}
          </button>
          <Vao
            indice={i + 1}
            total={diagramas.length}
            cabeMais={cabeMais}
            aoAcrescentar={aoAcrescentar}
          />
          </div>
        );
      })}
    </nav>
  );
}

/**
 * O vão entre dois selos: seis pixels de nada que viram um "+" ao serem
 * apontados.
 *
 * ## O rótulo diz o lugar, não o gesto
 *
 * "Acrescentar diagrama" sozinho seria a mesma frase nos catorze vãos, e quem
 * ouve a tela ouviria catorze botões idênticos. O rótulo nomeia a posição —
 * "acrescentar diagrama antes do 3", "acrescentar diagrama no fim" —, que é a
 * única coisa que distingue um vão do outro.
 *
 * ## Cheio, ele some
 *
 * No teto do schema o vão não vira um "+" desabilitado: um botão apagado que
 * não diz por quê é pior que botão nenhum. Ele deixa de existir, e quem explica
 * é a frase no pé da coluna, que o `Editor` desenha uma vez só.
 */
function Vao({
  indice,
  total,
  cabeMais,
  aoAcrescentar,
}: {
  indice: number;
  total: number;
  cabeMais: boolean;
  aoAcrescentar: (indice: number) => void;
}) {
  if (!cabeMais) return <span className="block h-1.5" />;
  const onde =
    indice === 0
      ? "no começo"
      : indice >= total
        ? "no fim"
        : `entre o ${indice} e o ${indice + 1}`;
  return (
    <button
      type="button"
      onClick={() => aoAcrescentar(indice)}
      title={`acrescentar diagrama ${onde}`}
      aria-label={`acrescentar diagrama ${onde}`}
      className="foco group flex h-3 w-full items-center justify-center opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
    >
      <span className="h-px flex-1 bg-borda-fraca" />
      <span className="rotulo px-1.5 leading-none text-tinta-fraca">+</span>
      <span className="h-px flex-1 bg-borda-fraca" />
    </button>
  );
}
