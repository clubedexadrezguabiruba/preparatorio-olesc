/*
 * ## Por que este arquivo sobreviveu à limpeza de 2026-09-08
 *
 * O commit `e183cb2` do `main` apagou o módulo antigo e levou este arquivo
 * junto — 17.036 linhas fora —, e estava certo pelo que via: no `main` não
 * havia mais consumidor.
 *
 * Havia num lugar que o `main` não enxergava: `lib/tatica/fala.ts`, que nasceu
 * na branch `repertorio` e chama `semMarcacao` nos dois degraus da dica. Se
 * `content/temas.json` ganhar um `**negrito**` um dia, é esta função que
 * impede o asterisco de aparecer desenhado no balão do professor.
 *
 * `emPedacos` era exportado para a apostila desenhar o negrito no papel.
 * A apostila saiu de cena em 2026-09-09 e ele deixou de ser API: hoje é o
 * miolo privado de `semMarcacao`, que é a única coisa que o site pede daqui.
 */

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
 * não há HTML em canto nenhum: entra uma string, sai uma string, e o React
 * escapa o resultado como texto. A gramática é uma regra só, e o que ela não
 * reconhece fica como está.
 *
 * ## O que não é negrito
 *
 * Um asterisco solto, um par que não fecha, e `****` — todos passam adiante
 * como texto literal, porque uma criança que escreveu `2*3**4` numa conta não
 * pode ver metade da conta sumir. Só vira negrito o par completo com pelo menos
 * um caractere dentro.
 */

/** `**` … `**`, sem cruzar outro `**` e sem aceitar miolo vazio. */
const NEGRITO = /\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g;

/**
 * A mesma frase sem marcação nenhuma — para o balão, `title` e `aria-label`.
 *
 * A promessa é a que o teste cobra: **só o par completo some**. Tudo o que a
 * regra acima não reconhece atravessa caractere a caractere, do asterisco
 * solto ao `****`.
 */
export function semMarcacao(entrada: string): string {
  return entrada.replace(NEGRITO, "$1");
}
