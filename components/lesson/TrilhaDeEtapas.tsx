/**
 * As etapas de uma sessão, em barras com nome: `seta · treino · valendo` na
 * abertura, `aquecimento · série · prova` na tática.
 *
 * Círculo é progresso de memória (as `Bolinhas` da revisão espaçada); **barra é
 * onde estou agora**. Manter as duas linguagens separadas é o que impede o
 * aluno de confundir "terminei esta sessão" com "aprendi isto".
 *
 * O molde é o chess.com, que põe uma barra "Desafio 1/3" de 56 px no topo do
 * painel (medida em 8/9/2026). A nossa é mais baixa porque a altura aqui é
 * disputada: cada pixel desta faixa sai do espaço do comentário, que é o que o
 * palco de altura fechada tem de mais escasso.
 *
 * **Quem sabe as etapas é quem chama.** A lista vem por prop porque cada módulo
 * tem as suas, e porque o nome delas é conteúdo — o `diz` de cada uma é a frase
 * que o leitor de tela ouve, e ela precisa dizer o que aquela etapa é naquele
 * módulo, não um rótulo genérico.
 */

export type EtapaDaTrilha = {
  /** O rótulo curto, sob a barra. Uma palavra, minúscula. */
  readonly nome: string;
  /** O que aquela etapa é, para o leitor de tela. */
  readonly diz: string;
};

export function TrilhaDeEtapas({
  etapas,
  atual,
}: {
  etapas: readonly EtapaDaTrilha[];
  /** O índice da etapa corrente. Fora da lista, nenhuma acende. */
  atual: number;
}) {
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
      aria-label={`Etapa ${atual + 1} de ${etapas.length}: ${etapas[atual]?.diz ?? ""}`}
    >
      {etapas.map((etapa, i) => (
        <div key={etapa.nome} aria-hidden className="flex flex-1 flex-col gap-1">
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
