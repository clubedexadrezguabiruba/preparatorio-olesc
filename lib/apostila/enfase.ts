/**
 * O `**negrito**` e o `*itálico*` que já estão escritos no conteúdo.
 *
 * `content/temas.json` foi escrito com ênfase em markdown — "o primeiro lance
 * **obriga**". No papel isso tem de virar `<strong>`, ou o aluno lê os
 * asteriscos.
 *
 * Escapar vem **antes** de converter, e não depois: se a conversão viesse
 * primeiro, o `<strong>` recém-criado viraria `&lt;strong&gt;`. E escapar é
 * obrigatório mesmo com conteúdo nosso — o dia em que um tema citar `1.e4 <=>
 * 1...c5` o caderno não pode sair com metade da linha comida.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/**
 * Texto do conteúdo → HTML de um parágrafo (sem a tag `<p>`).
 *
 * O par duplo é tentado primeiro; senão `**a**` sairia como `<em>*a*</em>`.
 */
export function enfase(texto: string): string {
  return escaparHtml(texto)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<![*\w])\*([^*\n]+)\*(?!\w)/g, "<em>$1</em>");
}
