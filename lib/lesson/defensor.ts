/**
 * Qual variante do defensor o aluno enfrenta (B9/E6).
 *
 * **Sem `Math.random()`, e isso não é preciosismo.** Sorteio quebra três coisas
 * de uma vez: o mesmo lance recusado duas vezes daria respostas diferentes
 * dentro da *mesma* tentativa, a aula deixaria de ser reproduzível para quem a
 * está escrevendo, e um teste que a jogasse até o fim passaria ou falharia por
 * sorte. Aqui a escolha é uma conta, e a mesma entrada dá sempre a mesma saída.
 *
 * Duas propriedades, e são elas que fazem a defesa variável valer a pena:
 *
 * - **dentro de uma tentativa, a defesa é estável.** O aluno que erra e volta
 *   encontra a mesma posição; senão ele estaria treinando contra um tabuleiro
 *   que muda embaixo dele;
 * - **entre tentativas, ela muda** — e muda *sempre*, não com sorte de hash.
 *   É por isso que a tentativa **roda** o índice em vez de entrar na conta:
 *   `(base + tentativa) % n` garante que duas tentativas seguidas nunca caiam
 *   na mesma variante, o que uma chave hasheada com o número da tentativa
 *   dentro só faria por acaso.
 *
 * Zero xadrez calculado: a lista de variantes vem escrita da autoria e
 * certificada pelo gate. Isto aqui só escolhe um índice.
 */

/**
 * FNV-1a de 32 bits.
 *
 * Escolhido por ser curto o bastante para caber num comentário e não ter
 * dependência: `Math.imul` é a multiplicação de 32 bits que o JavaScript não
 * tem nos operadores, e o `>>> 0` mantém o número sem sinal. Não é hash
 * criptográfico e não precisa ser — o que se pede dele é espalhar chaves
 * parecidas (`n1`, `n2`, `n3`) em índices diferentes.
 */
export function fnv1a(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * A variante que este nó joga nesta tentativa.
 *
 * `chave` identifica o lugar — `"guided:n7"`, `"solo:s3"` — e `tentativa` é o
 * contador que a store já mantém (`treeRestart` o incrementa). Lista de um
 * item devolve o item, que é o caso de 100% do corpus de hoje.
 */
export function escolherResposta<T>(opcoes: readonly T[], chave: string, tentativa: number): T {
  if (opcoes.length === 0) {
    throw new Error("escolherResposta: não há variante nenhuma para escolher");
  }
  const base = fnv1a(chave);
  // `% n` duas vezes porque `base + tentativa` pode passar de 2^32; a segunda
  // conta é sobre um número já pequeno.
  const indice = ((base % opcoes.length) + (tentativa % opcoes.length)) % opcoes.length;
  return opcoes[indice];
}

/** A chave do lugar: a árvore e o nó. A tentativa entra separada, por fora. */
export function chaveDoDefensor(treeKey: string, nodeId: string): string {
  return `${treeKey}:${nodeId}`;
}
