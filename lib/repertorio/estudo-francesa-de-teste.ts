/**
 * O estudo v1.5 da Francesa como fica depois que o Doug escreve no Lichess os 4 comentários que
 * faltam (1.e4, 11.Nf3, 12.Qxf3 e 11.a3) — para os testes e o ensaio de navegador provarem o
 * caminho inteiro antes da correção de verdade. Cada troca mexe na primeira ocorrência do lance,
 * que é a do capítulo didático. Não é conteúdo: nada daqui vai para `content/`.
 */
export function estudoComOsMudosComentados(texto: string): string {
  const trocas: Array<[string, string]> = [
    ["1. e4 e6 { A Defesa", "1. e4 { Abrimos com o peão do rei no centro. } e6 { A Defesa"],
    ["11. Nf3 O-O-O", "11. Nf3 { O último cavalo entra no ataque. } O-O-O"],
    ["12. Qxf3 Qa5", "12. Qxf3 { A dama recaptura e olha para o rei preto. } Qa5"],
    ["(10... a6 11. a3)", "(10... a6 11. a3 { Tiramos b4 do bispo. })"],
  ];
  return trocas.reduce((acc, [de, para]) => {
    if (!acc.includes(de)) throw new Error(`o estudo de teste mudou: «${de}» não está mais no texto`);
    return acc.replace(de, para);
  }, texto);
}
