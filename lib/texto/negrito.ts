/**
 * O único pedaço de markdown que o conteúdo do site usa: `**assim**`.
 *
 * ## Por que existe, em vez de os asteriscos saírem do JSON
 *
 * Porque a ênfase é conteúdo, e não decoração. As doze ocorrências de
 * `content/meio-jogo.json` estão em lugares como *"o peão **dele**, não o
 * **seu**"* e *"conte **antes** de trocar"* — tirar o negrito ali é tirar a
 * palavra que a frase inteira existe para destacar, numa dica escrita para uma
 * criança de doze anos que lê rápido. O que estava errado não era o asterisco
 * no arquivo: era a tela imprimindo o asterisco.
 *
 * ## Por que não é uma biblioteca de markdown
 *
 * Porque markdown inteiro num campo de conteúdo abre a porta para link, imagem
 * e HTML embutido dentro de um JSON que o gate lê mas não sanitiza — e o
 * componente que desenha isto teria de virar `dangerouslySetInnerHTML`. Aqui
 * não há HTML em canto nenhum: entra uma string, sai uma lista de pedaços, e o
 * React escapa cada pedaço como texto. A gramática é uma regra só, e o que ela
 * não reconhece fica como está.
 *
 * ## O que não é negrito
 *
 * Um asterisco solto, um par que não fecha, e `****` — todos passam adiante
 * como texto literal, porque uma criança que escreveu `2*3**4` numa conta não
 * pode ver metade da conta sumir. Só vira negrito o par completo com pelo menos
 * um caractere dentro.
 */

export type Pedaco = {
  readonly texto: string;
  readonly forte: boolean;
};

/** `**` … `**`, sem cruzar outro `**` e sem aceitar miolo vazio. */
const NEGRITO = /\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g;

/**
 * A frase repartida em pedaços normais e pedaços em negrito.
 *
 * Devolve sempre pelo menos um pedaço — a string inteira, se não houver
 * marcação —, e a concatenação dos `texto` com os `**` de volta reconstrói a
 * entrada. É essa propriedade que o teste cobra: nada se perde no caminho.
 */
export function emPedacos(entrada: string): Pedaco[] {
  const pedacos: Pedaco[] = [];
  let cursor = 0;

  for (const achado of entrada.matchAll(NEGRITO)) {
    const inicio = achado.index;
    if (inicio > cursor) {
      pedacos.push({ texto: entrada.slice(cursor, inicio), forte: false });
    }
    pedacos.push({ texto: achado[1], forte: true });
    cursor = inicio + achado[0].length;
  }

  if (cursor < entrada.length || pedacos.length === 0) {
    pedacos.push({ texto: entrada.slice(cursor), forte: false });
  }

  return pedacos;
}

/** A mesma frase sem marcação nenhuma — para `title`, `aria-label` e teste. */
export function semMarcacao(entrada: string): string {
  return emPedacos(entrada)
    .map((p) => p.texto)
    .join("");
}
