import { diagrama, PALETA_DA_TELA, type Orientacao } from "@/lib/diagrama/tabuleiro";

/**
 * Um diagrama parado, desenhado no servidor.
 *
 * ## Por que não é o `ChessBoard`
 *
 * O chessground é um tabuleiro **interativo**: ele monta uma árvore de `<div>`s
 * no navegador, lê `getComputedStyle`, escuta ponteiro e arraste. Tudo isso
 * existe para o aluno **jogar** — e numa dica de meio-jogo não há o que jogar,
 * porque não há juiz. Carregar o motor de arraste para mostrar uma posição
 * parada seria pagar JavaScript por interação que a página não oferece.
 *
 * Este componente devolve um `<svg>` inteiro, montado no servidor a partir da
 * FEN, com zero JavaScript no cliente. A geometria é a mesma do diagrama
 * impresso da apostila (`lib/diagrama/tabuleiro.ts`) — as duas telas mostram o
 * mesmo cavalo na mesma casa — e o que muda é só a paleta, que aqui vem dos
 * tokens do site em vez das cores de tinta.
 *
 * ## `dangerouslySetInnerHTML` sem susto
 *
 * A marcação não vem de dado do usuário: vem de `diagrama()`, que a monta a
 * partir de uma FEN já recusada pelo gate se for ilegal, e que escapa o único
 * texto livre que entra (o `<title>`). Não há caminho por onde uma dica escrita
 * em `content/` injete marcação — e o gate a lê antes da build.
 */
export function Diagrama({
  fen,
  titulo,
  orientacao,
}: {
  fen: string;
  /** O que um leitor de tela lê no lugar do desenho. */
  titulo: string;
  orientacao?: Orientacao;
}) {
  const svg = diagrama(fen, { paleta: PALETA_DA_TELA, titulo, orientacao });

  return (
    <div
      // O SVG nasce com `viewBox` e sem largura: quem manda no tamanho é a
      // coluna. `max-w` porque num monitor largo um tabuleiro de 700 px ao lado
      // de um texto de 14 px vira pôster.
      className="mx-auto w-full max-w-sm [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
