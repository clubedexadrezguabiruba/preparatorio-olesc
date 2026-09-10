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
 * **Neste bloco a lista é só leitura.** Arrastar para reordenar, o "+" entre
 * dois selos e a lixeira com desfazer são do Bloco 2; entrariam aqui como
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
}: {
  diagramas: Diagrama[];
  atual: number;
  orientation: "white" | "black";
  aoEscolher: (indice: number) => void;
}) {
  return (
    <nav aria-label="Diagramas desta etapa" className="flex flex-col gap-1.5">
      {diagramas.map((d, i) => {
        const selecionado = i === atual;
        const temProblema = d.problemas.length > 0;
        return (
          <button
            key={i}
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
        );
      })}
    </nav>
  );
}
