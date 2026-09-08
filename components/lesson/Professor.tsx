import Image from "next/image";

/**
 * O professor, ao lado do que ele está dizendo.
 *
 * ## O que ele NÃO é
 *
 * A primeira versão era uma cabeça recortada dentro de um círculo, com aro e
 * fundo próprio. Foi recusada na tela e a recusa está certa: o disco tem outra
 * cor que a do painel, o aro desenha um contorno, e o conjunto lê como **uma
 * foto colada** — não como alguém que está ali.
 *
 * O molde é o treinador do chess.com (visto na aula "Espetos"): ele aparece
 * **inteiro dentro do quadro** — cabeça, pescoço e o começo do tronco —, sem
 * moldura, sem disco, sem aro, e a fala dele sai num balão com bico apontando
 * para ele. O que faz o desenho pertencer à cena é exatamente não ter borda
 * nenhuma: o alfa do WebP encosta direto no papel do painel.
 *
 * Portanto, e isto é contrato: **nada de `rounded-full`, `ring-*`, `border-*`
 * ou `bg-*` neste componente.** Qualquer um dos quatro devolve o balãozinho.
 *
 * ## O recorte, e por que ele para no alargamento do paletó
 *
 * A arte de 9/9/2026 (`Untitled design.png`) é uma ilustração vetorial já
 * pensada como busto — terno, gravata com peças de xadrez, broche do clube —,
 * diferente da foto de corpo inteiro da primeira versão. O busto é
 * `(31, 124)–(1014, 1150)` do original, 983×1026 — escolhido entre três
 * candidatos numa folha de contato, e não a olho: o paletó se abre num
 * alargamento que vira quase uma capa mais abaixo na arte, e incluí-lo faria a
 * miniatura de 112 px virar uma mancha cinza sem forma.
 *
 * **Duas voltas atrás, no mesmo dia.** Descer o corte para caber o broche da
 * lapela deixou o avatar largo demais, e descer até a arte inteira (o fecho
 * decorativo em ponta) deixou muito vazio ao redor da figura. As duas foram
 * revertidas para este recorte, que é o que ficou. O corte reto que sobra é o
 * de baixo, e ele dissolve: os últimos 12% da altura têm rampa de alfa (ver
 * `scripts/professor.py`, que gera o arquivo e registra os três candidatos).
 *
 * ## Uma imagem só, sem estado
 *
 * O chess.com anima o bot dele com Rive e troca de expressão conforme o acerto.
 * Aqui é um desenho fixo, e este componente **não tem estado**: não há
 * expressão de erro, de acerto nem de espera. Um rosto que reage envelhece mal
 * ao lado de um tabuleiro, e cada expressão a mais é um arquivo a mais para
 * manter em sincronia com a arte.
 *
 * ## O resto
 *
 * `next/image`, e não `<img>`: o `eslint-config-next/core-web-vitals` está
 * ativo e a regra `no-img-element` reprovaria. Sem `priority`, de propósito —
 * o retrato não é o que o aluno espera para começar a jogar, e disputar a fila
 * com o tabuleiro seria trocar a coisa certa pela coisa bonita.
 *
 * **Nota de contraste, para não cair nela depois:** o paletó (`#716f75`,
 * cinza médio) contra o verde do método (`#15552e`) dá 1,78:1 — sobre
 * superfície verde ele quase some. Sobre o papel a razão é 4,30:1, e é onde
 * ele fica.
 */
export function Professor({ largura = 112 }: { largura?: number }) {
  return (
    <Image
      src="/professor-v1.webp"
      alt="O professor Douglas"
      width={360}
      height={376}
      sizes="180px"
      className="block h-auto shrink-0"
      style={{ width: largura }}
    />
  );
}
