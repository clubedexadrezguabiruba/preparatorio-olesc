import { semMarcacao } from "../texto/negrito.ts";

/**
 * O que a tela de tática **diz** — o cartão de comando e a fala do professor.
 *
 * ## Por que isto é uma biblioteca, e não texto solto no componente
 *
 * Até a adoção do palco, todo o feedback da tática cabia numa tira de 44 px sob
 * o tabuleiro (o `Recado` de `Serie.tsx`), e o texto morava dentro do JSX. Com o
 * painel, o que se diz passou a ter **duas vozes** com regras diferentes, e
 * misturá-las no meio do render é como se erra a diferença entre elas.
 *
 * ## As duas vozes, e a divisão entre elas
 *
 * - **O cartão manda.** Duas linhas, sempre no mesmo lugar, no imperativo:
 *   "Olhe a posição", "Não é esse lance". É o que o aluno acha sem ler a tela.
 * - **O professor explica.** Prosa, no balão, ao lado do retrato.
 *
 * Dizer a mesma frase nas duas é o defeito a evitar: o cartão vira legenda do
 * balão e o painel passa a ter uma informação onde parecia ter duas.
 *
 * ## Aqui o professor fala pouco, e isso é a diferença para a aula de abertura
 *
 * Na abertura ele comenta um lance a cada lance — é uma aula, e o painel de
 * 522 px existe para caber a prosa. **Na tática o aluno não vem ler: vem
 * procurar.** O que ele ouve em repouso é uma linha só, a ordem de busca que
 * serve para toda posição; a aula do tema fica atrás do botão de dica, em dois
 * degraus, e só aparece se ele pedir.
 *
 * A escada dos degraus é a mesma que o tabuleiro já faz com as setas (dois
 * erros acendem a casa, três desenham o lance): **ajuda existe, custa um
 * pedido, e vem em pedaços**.
 *
 * ## O `**negrito**` do conteúdo
 *
 * `content/temas.json` pode trazer `**assim**` no conteúdo. O balão do
 * professor pagina **texto puro** (ele mede a frase com `getComputedStyle` e
 * digita caractere a caractere), então um `**obriga**` sairia com os asteriscos
 * na tela. Por isso tudo o que vem do conteúdo passa por `semMarcacao`.
 */

/** Em que ponto do puzzle o aluno está. É o estado da tela, não do jogo. */
export type Fase =
  /** O adversário ainda vai errar: o tabuleiro está parado, mostrando a posição. */
  | "abrindo"
  /** A vez do aluno. */
  | "jogando"
  /** O aluno acertou e o adversário está respondendo. */
  | "respondendo"
  /** Lance errado: a peça volta e o recado aparece. */
  | "errado"
  /** A linha acabou. */
  | "resolvido";

export type Situacao = {
  readonly fase: Fase;
  /** Quantas vezes ele errou **neste** puzzle. Manda nos degraus da dica. */
  readonly erros: number;
  readonly meuLado: "white" | "black";
  readonly rating: number;
  /** O tema a revelar depois de resolver, ou `null` para não revelar. */
  readonly nomeDoPadrao: string | null;
};

export type ConteudoDoCartao = {
  readonly comando: string;
  readonly estado?: string;
  readonly tom: "calma" | "bom" | "aviso" | "ruim";
};

/* ------------------------------------------------------------------ *
 * O cartão de comando
 * ------------------------------------------------------------------ */

/**
 * O cartão de comando de cada fase.
 *
 * É a tradução do `Recado` que vivia sob o tabuleiro, com uma diferença de
 * forma: o `Recado` era uma frase só, e o cartão tem **comando** e **estado**.
 * A separação é o que deixa o aluno achar a instrução sem ler tudo — o comando
 * em negrito responde "o que eu faço agora", e o estado, abaixo e menor,
 * responde "onde eu estou".
 *
 * O `respondendo` ganha o tom `bom`, e não o `calma` que a tira antiga usava:
 * ele já acertou o lance, e o visto verde é o único sinal de acerto que não
 * some sozinho — o disco na casa de destino dura menos de um segundo.
 */
export function cartaoDaFase({
  fase,
  erros,
  meuLado,
  rating,
  nomeDoPadrao,
}: Situacao): ConteudoDoCartao {
  if (fase === "abrindo") {
    return { comando: "Olhe a posição", estado: "O adversário vai jogar.", tom: "calma" };
  }

  if (fase === "errado") {
    return {
      comando: "Não é esse lance",
      /*
       * Os três degraus, na ordem em que as dicas do tabuleiro acendem (ver
       * `dicas` em `Serie.tsx`): dois erros acendem a casa da peça, três
       * desenham a seta. O texto **descreve o que está desenhado**; separá-los
       * faria o aluno procurar uma seta que não existe.
       *
       * A frase do primeiro erro diz que o puzzle já contou. Isso é honestidade
       * e não punição: só a primeira tentativa vira linha no banco, e ele tem
       * de saber disso na hora em que acontece, não no relatório de sábado.
       */
      estado:
        erros >= 3
          ? "A seta mostra o lance. Jogue para ver por quê."
          : erros >= 2
            ? "A casa acesa é a peça que resolve."
            : "Olhe de novo — este puzzle já contou como erro.",
      tom: "ruim",
    };
  }

  if (fase === "respondendo") {
    return { comando: "Certo", estado: "Veja a resposta dele.", tom: "bom" };
  }

  if (fase === "resolvido") {
    return {
      comando: "Resolvido",
      estado: nomeDoPadrao ? `Era: ${nomeDoPadrao}.` : undefined,
      tom: "bom",
    };
  }

  return {
    comando: "Ache o melhor lance",
    /*
     * O rating vem junto porque ele é a única medida de dificuldade que o aluno
     * vê, e sem ela um puzzle duro parece fracasso dele em vez de puzzle duro.
     */
    estado: `Você joga de ${meuLado === "white" ? "brancas" : "pretas"} · ${rating}`,
    tom: "calma",
  };
}

/* ------------------------------------------------------------------ *
 * A fala do professor
 * ------------------------------------------------------------------ */

/**
 * O que o professor diz quando não há nada acontecendo — e é **uma linha**.
 *
 * ## Por que uma linha, e por que esta
 *
 * O repouso é o texto que fica na tela a maior parte do tempo: o aluno o vê em
 * todo puzzle de toda rodada de todo tema. Um parágrafo nessa posição é lido
 * uma vez e vira paisagem na segunda — e ainda cobra a altura do tabuleiro em
 * todas as outras.
 *
 * Então ele carrega a única coisa que vale repetir trezentas vezes: **a ordem
 * de busca**. Xeques, capturas, ameaças — nessa ordem, em qualquer posição. É o
 * método que o aluno tem de levar para a partida, onde não há tema escrito no
 * alto da tela dizendo o que procurar. O tema é desta tela; a ordem de busca é
 * do xadrez.
 *
 * Serve à revisão do dia pela mesma razão: lá os temas vêm misturados e não há
 * um "o que procurar" possível, mas a ordem de busca continua sendo a mesma.
 */
export const REPOUSO_DA_TATICA =
  "Em toda posição, procure nesta ordem: xeques, capturas e ameaças. " +
  "É esse hábito que acha o lance tático.";

/**
 * O primeiro degrau da dica: o que procurar **neste** tema.
 *
 * Sai do `procure` de `content/temas.json`, que já era escrito para isto — o
 * esquema em `lib/tatica/temas.ts` o descreve como "o que olhar no tabuleiro".
 * Ele só mudou de lugar: era o texto de repouso, e virou a ajuda pedida.
 *
 * `null` na revisão do dia, que mistura temas e por isso não tem um "procure"
 * a dar. Lá o botão de dica não aparece.
 */
export function dicaDoTema(procure: readonly string[]): string | null {
  if (procure.length === 0) return null;
  return semMarcacao(procure.join(" "));
}

/**
 * O segundo degrau: por que o tema funciona.
 *
 * São os parágrafos de `explicacao`. Eles não aparecem sozinhos em lugar
 * nenhum — quem os quer, pede duas vezes. É a diferença entre uma aula, que o
 * aluno abre quando decide estudar, e um anúncio, que aparece na frente de
 * quem só queria resolver o próximo puzzle.
 */
export function aulaDoTema(explicacao: readonly string[]): string | null {
  if (explicacao.length === 0) return null;
  return semMarcacao(explicacao.join(" "));
}

/**
 * A fala do professor naquele instante, ou `null` para deixar o repouso.
 *
 * **Ela não repete o cartão.** Onde o cartão diz "Não é esse lance", aqui se
 * diz o que fazer diferente na próxima tentativa.
 *
 * Nas fases em que não há nada a acrescentar — ele está calculando, ou o
 * adversário está respondendo — devolve `null`, e quem chama mantém o repouso
 * na tela. Trocar o balão a cada 480 ms daria ao aluno um texto que ele não tem
 * tempo de ler.
 *
 * **As frases são curtas de propósito.** O balão da tática tem 88 px de piso no
 * celular — quatro linhas. Uma reação de seis linhas pagina, e paginar um
 * recado de erro que dura 850 ms é servi-lo pela metade.
 */
export function falaDaFase({ fase, erros, nomeDoPadrao }: Situacao): string | null {
  if (fase === "errado") {
    if (erros >= 3) {
      return "A seta é o lance. Jogue e veja o que acontece — é esse desenho que você vai reconhecer na partida.";
    }
    if (erros >= 2) {
      return "A casa acesa é a peça que resolve. Veja tudo o que ela alcança daí.";
    }
    return "Antes de tentar outro: por que este não serve? O que ele deixa o adversário fazer?";
  }

  if (fase === "resolvido") {
    return nomeDoPadrao
      ? `Era ${nomeDoPadrao}. Guarde o desenho das peças, não o nome.`
      : "Certo. Você viu o desenho antes de mover — é esse hábito que a série treina.";
  }

  return null;
}
