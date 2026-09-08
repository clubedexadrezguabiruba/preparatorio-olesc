import type { Modo } from "@/lib/repertorio/passada";

/**
 * As três etapas de uma passada: `seta · treino · valendo`.
 *
 * ## Por que ela existe, e é uma questão de não mentir
 *
 * Com as três etapas passaram a existir **dois números 3 na mesma tela, com
 * significados diferentes**: "etapa 3 de 3", que é esta sessão, e as bolinhas
 * "3 de 3", que é a linha **aprendida** — três passadas em três dias espaçados
 * (`DEGRAUS_EM_DIAS` em `lib/repertorio/treino.ts`). Sem separar os dois, o
 * aluno chega ao fim de uma tarde achando que terminou a linha, e volta no dia
 * seguinte para encontrá-la de novo na fila.
 *
 * A separação é de **linguagem visual**, e nenhuma das duas é nova aqui: a
 * escada continua nas `Bolinhas` — círculos, no cabeçalho, ao lado de "próxima
 * prática" —, e as etapas são estas barras com nome, logo abaixo do cartão de
 * comando. Círculo é progresso de memória; barra é onde estou agora.
 *
 * O molde é o chess.com, que põe uma barra "Desafio 1/3" de 56 px no topo do
 * painel (medida em 8/9/2026). A nossa é mais baixa porque a altura aqui é
 * disputada: cada pixel desta faixa sai do espaço do comentário, que é o que o
 * palco de altura fechada tem de mais escasso.
 *
 * ## Ela só aparece na primeira passada
 *
 * Da segunda em diante o aluno entra direto no "valendo" (`page.tsx` escolhe o
 * modo inicial por `tentativas === 0`), e uma trilha de três com duas etapas
 * apagadas para sempre prometeria um caminho que não existe mais. Quem decide
 * é quem monta — ver `Passada.tsx`.
 */

const ETAPAS = [
  { modo: "assistido", nome: "seta", diz: "com a seta" },
  { modo: "treino", nome: "treino", diz: "sem a seta, sem valer" },
  { modo: "quiz", nome: "valendo", diz: "valendo" },
] as const satisfies readonly { modo: Modo; nome: string; diz: string }[];

export function TrilhaDeEtapas({ modo }: { modo: Modo }) {
  const atual = ETAPAS.findIndex((e) => e.modo === modo);

  return (
    <div
      className="flex items-center gap-1.5"
      /*
       * Uma frase só para o leitor de tela, e o desenho inteiro escondido dele.
       * Três barras e três palavras soltas seriam lidas como seis coisas; o que
       * a informação é, de verdade, cabe numa linha. Mesma regra das
       * `Bolinhas`.
       */
      role="group"
      aria-label={`Etapa ${atual + 1} de 3: ${ETAPAS[atual]?.diz ?? ""}`}
    >
      {ETAPAS.map((etapa, i) => (
        <div key={etapa.modo} aria-hidden className="flex flex-1 flex-col gap-1">
          <span
            className={`h-1 rounded-full transition-colors ${
              i <= atual ? "bg-metodo-cheio" : "bg-carta-alta"
            }`}
          />
          <span
            className={`text-xs leading-none transition-colors ${
              i === atual ? "font-semibold text-metodo-tinta" : "text-tinta-muda"
            }`}
          >
            {etapa.nome}
          </span>
        </div>
      ))}
    </div>
  );
}
