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
 * ## O recorte, e por que o terno tem de caber nele
 *
 * A arte de 9/9/2026 (`Untitled design.png`) é uma ilustração vetorial já
 * pensada como busto — terno cinza, camisa, gravata e o broche teal do clube na
 * lapela —, diferente da foto de corpo inteiro da primeira versão.
 *
 * **A primeira tentativa continha o terno e não o mostrava.** O corte parava em
 * y=1150 e a rampa de alfa dos últimos 12% começava em y≈1027, que é exatamente
 * onde o paletó começa: medido no arquivo que ela gerava, o alfa máximo era 0,85
 * em y≈1052 e 0,36 em y≈1106. A 112 px o avatar lia como uma cabeça flutuando
 * sobre um véu claro.
 *
 * O corte de agora é `(140, 112)–(900, 1450)`, 760×1338 — retrato de razão
 * 0,57, e não o quase-quadrado de antes. A 112 px de largura ele dá **197 px de
 * altura**.
 *
 * **A largura é 760 e não os 983 da figura inteira**, e essa diferença é a peça
 * que faz a coisa funcionar: com a largura cheia o paletó incha até 957 px em
 * y=1150 e volta a estreitar dentro do quadro, e a 112 px isso vira uma mancha
 * triangular tipo capa. Estreitando, o ombro **sai pelas laterais** e o corpo lê
 * como "continua fora do quadro" — que é o mesmo motivo de o alfa encostar no
 * painel sem borda. De quebra, quadro estreito é figura ampliada: a cabeça sai
 * com 88 px contra os 73 de um recorte largo.
 *
 * **E não há rampa de alfa no pé — isso é uma correção, não um esquecimento.**
 * A versão anterior parava em y=1385 e dissolvia os últimos 22% da altura para o
 * corte não virar linha reta. Sobre o papel claro, baixar o alfa de uma
 * superfície escura **clareia** a superfície: numa faixa larga de tecido aquilo
 * não leu como dissolver, leu como véu branco por cima do terno, e foi assim que
 * o Doug descreveu na tela. O corte de agora desce até y=1450, **abaixo da ponta
 * em que a figura acaba sozinha** (y≈1446) — não há corte no desenho, então não
 * há linha para disfarçar. Medido no arquivo: o alfa é 1,000 até a penúltima
 * linha de exibição e a figura afunila de 97 px para 6 px por conta própria.
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
      src="/professor-v3.webp"
      alt="O professor Douglas"
      width={360}
      height={634}
      sizes="180px"
      className="block h-auto shrink-0"
      style={{ width: largura }}
    />
  );
}
