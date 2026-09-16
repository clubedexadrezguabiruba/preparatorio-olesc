import type { Nivel } from "../curso/nivel.ts";

/**
 * O currículo de tática, em onze blocos (eram oito até 16/9/2026).
 *
 * **Este arquivo é a única fonte da taxonomia.** O script que recorta o CSV do
 * Lichess (`scripts/filtrar-puzzles.ts`) e as telas de `/tatica` leem daqui.
 * Duplicar a lista seria duas opiniões sobre o que é o "bloco 4" — e a
 * divergência apareceria como um tema que existe no menu e não tem arquivo.
 *
 * As `tag` são os temas do próprio Lichess (`lichess.org/training/themes`), do
 * jeito que aparecem na coluna `Themes` do CSV. Um erro de digitação aqui não
 * quebra nada: produz um tema com zero puzzles. Por isso o script **conta** o
 * que achou por tag e reprova a tag que veio vazia — é o que transforma o
 * silêncio em vermelho.
 *
 * A faixa de rating é do **bloco**. O piso é dele — mate em 1 começa mais
 * embaixo que lance quieto —, mas **o teto é 2100 em todos os onze**, decisão
 * do Doug.
 *
 * Houve aqui o argumento contrário, e ele está registrado para não voltar:
 * dizia que `mateIn1` existe até 2000 no banco do Lichess e que, num bloco de
 * mates curtos, um mate em 1 de 1900 seria ruído. A decisão o inverte, e por
 * um motivo que o argumento não via: **a série de cada tema é servida em
 * rating crescente**. Ninguém encontra o puzzle de 1900 antes de passar pelos
 * de 900; quem chega ao topo da série é exatamente quem aguenta o topo. Cortar
 * em 1300 não protege o aluno fraco — ele nunca chegaria lá —, só tira o teto
 * do aluno forte, que é quem termina o tema e fica sem nada para fazer.
 *
 * O piso do bloco 1 é 700 e não 600 pelo mesmo tipo de razão, do outro lado: a
 * turma joga de 700 a 1700 de rápidas, e abaixo de 700 o puzzle é ruído.
 */

export type Tema = {
  /**
   * A tag, como vem na coluna `Themes` do Lichess — ou, para `origem: "nosso"`,
   * como `scripts/etiquetar-puzzles.ts` a grava em `dados/etiquetas-nossas.tsv`.
   */
  readonly tag: string;
  /** O nome em português que o aluno lê. */
  readonly nome: string;
  /** Uma linha explicando o motivo — vira o subtítulo do cartão do tema. */
  readonly resumo: string;
  /**
   * Quem classificou os puzzles do tema. `"lichess"` quando a tag vem do banco
   * do Lichess; `"nosso"` quando o Lichess não etiqueta o padrão e quem o
   * reconhece são os detectores de `lib/tatica/padroes/detectores.ts`, com a
   * precisão medida em `docs/TATICA-PADROES.md`. Sem o campo, vale `"lichess"`.
   */
  readonly origem?: "lichess" | "nosso";
};

export type Bloco = {
  readonly id: number;
  readonly nome: string;
  readonly faixa: readonly [number, number];
  /**
   * Em que degrau da escada o bloco mora — 1 a 5, de `lib/curso/nivel.ts`.
   *
   * **Declarado, e não derivado do rating.** O `sabado` que morava aqui era
   * calendário, e a escada anterior tentava adivinhar o nível pelo piso da
   * `faixa` — os oito blocos começam entre 700 e 1100, então os 36 temas caíam
   * todos no nível 1. O currículo tem uma ordem pedagógica que nenhuma fórmula
   * sobre rating de puzzle reconstrói; ela cabe neste campo.
   *
   * **A inversão B4 → nível 2, na frente de B2.** Os dois blocos têm o mesmo
   * piso (800), então a ordem antiga (`B2` no Sábado 1, `B4` no 2) vinha do
   * livro-texto, não da dificuldade. Numa partida entre alunos de 1000, garfo e
   * peça pendurada decidem dez vezes mais partidas que o mate do corredor — e o
   * resumo de `hangingPiece` aqui embaixo já chama a peça pendurada de *"o erro
   * nº 1 em 1000–1400"*. Garfo, cravada, espeto e descoberto são o vocabulário
   * de que os outros blocos são feitos: `capturingDefender` e `deflection` (B5)
   * existem para abrir caminho a um deles — tirar a defesa e colher com garfo
   * ou cravada.
   */
  readonly nivel: Nivel;
  readonly temas: readonly Tema[];
};

export const BLOCOS: readonly Bloco[] = [
  {
    id: 1,
    nome: "Mates curtos e peça de graça",
    faixa: [700, 2100],
    nivel: 1,
    temas: [
      { tag: "mateIn1", nome: "Mate em 1", resumo: "Um lance e acabou. O olho treina aqui." },
      { tag: "mateIn2", nome: "Mate em 2", resumo: "Dois lances seus até o mate — e o primeiro nem sempre é xeque." },
      { tag: "hangingPiece", nome: "Peça de graça", resumo: "A peça sem defesa, ou com defesa de menos — o erro nº 1 em 1000–1400." },
    ],
  },
  {
    id: 2,
    nome: "Padrões de mate I",
    faixa: [800, 2100],
    nivel: 3,
    temas: [
      { tag: "backRankMate", nome: "Mate do corredor", resumo: "O rei preso na última fileira pelas próprias peças, e a torre ou a dama dá o mate." },
      { tag: "smotheredMate", nome: "Mate sufocado", resumo: "O cavalo mata o rei cercado pelas próprias peças." },
      { tag: "arabianMate", nome: "Mate árabe", resumo: "Torre e cavalo prendem o rei no canto." },
      { tag: "anastasiaMate", nome: "Mate de Anastasia", resumo: "O cavalo tapa as fugas, uma peça dele prende o rei na borda, e torre ou dama dá o mate." },
      { tag: "hookMate", nome: "Mate do gancho", resumo: "A torre dá o mate, o cavalo a defende, o peão defende o cavalo — e um peão dele tapa a fuga." },
    ],
  },
  {
    id: 3,
    nome: "Padrões de mate II",
    faixa: [1000, 2100],
    nivel: 4,
    temas: [
      { tag: "bodenMate", nome: "Mate de Boden", resumo: "Dois bispos em diagonais que se cruzam; as próprias peças do rei tapam a fuga." },
      { tag: "doubleBishopMate", nome: "Mate dos dois bispos", resumo: "Dois bispos em diagonais vizinhas; as próprias peças do rei tapam a fuga." },
      { tag: "dovetailMate", nome: "Mate da cauda de andorinha", resumo: "A dama colada no rei, e as duas fugas tapadas pelas peças dele." },
      { tag: "mateIn3", nome: "Mate em 3", resumo: "Três lances seus até o mate: aqui o cálculo faz diferença." },
    ],
  },
  {
    id: 4,
    nome: "Táticas fundamentais",
    faixa: [800, 2100],
    nivel: 2,
    temas: [
      { tag: "fork", nome: "Garfo", resumo: "Uma peça ataca duas ao mesmo tempo." },
      { tag: "pin", nome: "Cravada", resumo: "A peça que não pode sair sem expor o rei ou uma peça mais valiosa atrás dela." },
      { tag: "skewer", nome: "Espeto", resumo: "A peça valiosa da frente é atacada, sai, e a de trás cai." },
      { tag: "discoveredAttack", nome: "Ataque descoberto", resumo: "Sai uma peça e quem ataca é a de trás." },
      { tag: "doubleCheck", nome: "Xeque duplo", resumo: "Duas peças dão xeque: só o rei pode se mexer." },
      { tag: "discoveredCheck", nome: "Xeque descoberto", resumo: "Sai uma peça e a de trás dá xeque — a que saiu fica livre para ganhar o que quiser." },
    ],
  },
  {
    id: 5,
    nome: "Remover a defesa",
    faixa: [1000, 2100],
    nivel: 4,
    temas: [
      { tag: "capturingDefender", nome: "Capturar o defensor", resumo: "Capture a peça que defende outra: a defendida fica solta e cai no lance seguinte." },
      { tag: "deflection", nome: "Desvio", resumo: "Distraia a peça do que ela defende e ganhe o que ficou sem guarda." },
      { tag: "attraction", nome: "Atração", resumo: "Um sacrifício força a peça a ir a uma casa — e ali entra a tática seguinte: garfo, cravada ou mate." },
      { tag: "trappedPiece", nome: "Peça presa", resumo: "A peça sem casa segura para fugir: ataque e ela cai." },
      { tag: "xRayAttack", nome: "Raio X", resumo: "A peça ataca ou defende uma casa através de uma peça inimiga no meio." },
    ],
  },
  {
    id: 6,
    nome: "Ataque ao rei",
    faixa: [1000, 2100],
    nivel: 5,
    temas: [
      { tag: "exposedKing", nome: "Rei exposto", resumo: "Rei com poucos defensores por perto: os xeques chegam, e muitas vezes o mate." },
      { tag: "attackingF2F7", nome: "Ataque em f2/f7", resumo: "No começo, esse peão só tem o rei de defensor — o ataque entra por ali." },
      { tag: "kingsideAttack", nome: "Ataque na ala do rei", resumo: "Ele rocou pequeno: é para lá que suas peças e peões vão." },
      { tag: "sacrifice", nome: "Sacrifício", resumo: "Dar material agora porque o que vem depois vale mais." },
      { tag: "queensideAttack", nome: "Ataque na ala da dama", resumo: "Ele rocou grande: é para o lado da dama que suas peças e peões vão." },
      { tag: "greekGift", nome: "Sacrifício grego", resumo: "O bispo toma em h7 com xeque, o cavalo salta para g5 e a dama chega a h5.", origem: "nosso" },
    ],
  },
  {
    id: 7,
    nome: "Lances finos",
    faixa: [1100, 2100],
    nivel: 5,
    temas: [
      { tag: "intermezzo", nome: "Lance intermediário", resumo: "Em vez do lance esperado, primeiro uma ameaça que ele é obrigado a responder." },
      { tag: "quietMove", nome: "Lance quieto", resumo: "Sem xeque e sem captura — e a ameaça é imparável." },
      { tag: "clearance", nome: "Liberação", resumo: "Tire a própria peça do caminho, de preferência com ameaça, e libere a casa ou a linha para outra." },
      { tag: "interference", nome: "Interferência", resumo: "Pôr uma peça no meio do caminho de quem defende." },
      { tag: "zugzwang", nome: "Zugzwang", resumo: "Jogar é obrigatório, e todo lance piora." },
      { tag: "counterCheck", nome: "Contra-xeque", resumo: "Em xeque, em vez de fugir com o rei, tape ou capture dando xeque de volta.", origem: "nosso" },
    ],
  },
  {
    id: 8,
    /*
     * "Conversão" é da lista de jargão vigiada — a mesma que derrubou "Motivos
     * fundamentais" do bloco 4. **Fica, por decisão do Doug em 2026-09-08**, e
     * está escrito aqui para ninguém propor a troca uma terceira vez.
     *
     * A varredura de jargão acusa esta linha e mais nada no bloco de tática.
     * Isso é esperado: a regra de "nenhum termo sem tradução na mesma frase"
     * foi escrita para os textos, onde há espaço para explicar ao lado. Um
     * nome de bloco não tem esse espaço, e os candidatos que evitavam a
     * palavra — "Segurar e virar dama", "Defesa e peões", "Defender e
     * terminar" — ou prometiam o que o bloco não cumpre (en passant não vira
     * dama), ou descreviam as peças em vez do que se aprende.
     */
    nome: "Defesa e conversão",
    faixa: [1000, 2100],
    nivel: 5,
    temas: [
      { tag: "defensiveMove", nome: "Lance defensivo", resumo: "O único lance que segura — treinar não desistir." },
      { tag: "advancedPawn", nome: "Peão avançado", resumo: "O peão já fundo no campo dele, muitas vezes ameaçando virar dama." },
      { tag: "promotion", nome: "Promoção", resumo: "Chegar na última fileira, e escolher a peça certa." },
      { tag: "underPromotion", nome: "Subpromoção", resumo: "Quando a dama não serve: cavalo pelo xeque, torre ou bispo para não afogar." },
      { tag: "enPassant", nome: "En passant", resumo: "O peão que avançou duas casas e parou ao lado do seu: capture como se ele tivesse andado uma." },
    ],
  },
  /*
   * Os blocos 9 a 11 (16/9/2026) entram **no fim** da lista, e não ao lado dos
   * blocos 2 e 3, de propósito. O índice do modo rating dá a cada puzzle repetido
   * a origem do primeiro tema na ordem desta lista (`scripts/indice-rating.ts`);
   * acrescentar no fim não muda a origem de puzzle nenhum que já existia.
   *
   * Os padrões com `origem: "nosso"` não têm tag no Lichess: quem os reconhece é
   * `lib/tatica/padroes/detectores.ts`. Cozio não é tema — o detector dele
   * acrescenta `dovetailMate`, que é a mesma figura.
   */
  {
    id: 9,
    nome: "Padrões de mate III",
    faixa: [1000, 2100],
    nivel: 4,
    temas: [
      { tag: "operaMate", nome: "Mate da ópera", resumo: "A torre dá o mate na fileira do rei, e o bispo, de longe, defende a torre." },
      { tag: "pillsburysMate", nome: "Mate de Pillsbury", resumo: "A torre dá o mate pela coluna, e o bispo, na diagonal, tira a fuga do rei." },
      { tag: "epauletteMate", nome: "Mate das dragonas", resumo: "A dama dá xeque de frente, e as peças dele, dos dois lados do rei, tapam a fuga." },
      { tag: "swallowstailMate", nome: "Mate de Guéridon", resumo: "A dama colada de frente dá o mate; as duas casas atrás do rei, na diagonal, estão tapadas pelas peças dele." },
      { tag: "damianoMate", nome: "Mate de Damiano", resumo: "A dama encosta no rei pela diagonal, apoiada por peão ou bispo; a peça dele à frente do rei tapa a fuga.", origem: "nosso" },
      { tag: "lolliMate", nome: "Mate de Lolli", resumo: "O peão chega à porta do rei, e a dama entra logo à frente dele, apoiada pelo peão.", origem: "nosso" },
    ],
  },
  {
    id: 10,
    nome: "Padrões de mate IV",
    faixa: [1000, 2100],
    nivel: 5,
    temas: [
      { tag: "morphysMate", nome: "Mate de Morphy", resumo: "O bispo dá o mate ao rei no canto, e a torre o prende na borda." },
      { tag: "cornerMate", nome: "Mate do canto", resumo: "Torre ou dama prende o rei no canto, e o cavalo dá o mate." },
      { tag: "triangleMate", nome: "Mate do triângulo", resumo: "Dama e torre, lado a lado com o rei no meio, fecham um triângulo; a dama dá o mate." },
      { tag: "blindSwineMate", nome: "Mate dos porcos cegos", resumo: "Duas torres na sétima fileira varrem tudo pelo caminho até o mate." },
      { tag: "killBoxMate", nome: "Mate da caixa", resumo: "Torre colada ao rei e dama na diagonal dela fecham o rei num quadrado de 3 por 3." },
      { tag: "anderssenMate", nome: "Mate de Anderssen", resumo: "Torre ou dama dá o mate ao lado do rei, apoiada pelo peão que chegou à frente dele.", origem: "nosso" },
      { tag: "pawnMate", nome: "Mate de peão", resumo: "O peão, a menor peça, dá o mate — e as peças dele mesmo tapam a fuga.", origem: "nosso" },
      { tag: "grecoMate", nome: "Mate de Greco", resumo: "Rei no canto, peça dele na diagonal: a torre ou a dama dá o mate pela borda, e o bispo tira a última casa.", origem: "nosso" },
      { tag: "suffocationMate", nome: "Mate da asfixia", resumo: "O cavalo dá o mate, e os bispos tiram as poucas casas que as peças dele deixaram livres.", origem: "nosso" },
      { tag: "mateIn4", nome: "Mate em 4", resumo: "Quatro lances seus até o mate: a linha inteira calculada antes do primeiro." },
    ],
  },
  {
    id: 11,
    nome: "Mates raros e armadilhas",
    faixa: [1000, 2100],
    nivel: 5,
    temas: [
      { tag: "vukovicMate", nome: "Mate de Vuković", resumo: "Torre e cavalo juntos: a torre dá o mate colada ao rei, e o cavalo tira as fugas." },
      { tag: "balestraMate", nome: "Mate da balestra", resumo: "O bispo dá o mate de longe, e a dama fecha as casas que sobraram." },
      { tag: "blackburneMate", nome: "Mate de Blackburne", resumo: "Dois bispos e um cavalo: um bispo dá o mate, e as peças menores fecham o resto.", origem: "nosso" },
      { tag: "retiMate", nome: "Mate de Réti", resumo: "O bispo colado dá o mate, apoiado pela torre de longe, com o rei cercado pelas próprias peças.", origem: "nosso" },
      { tag: "maxLangeMate", nome: "Mate de Max Lange", resumo: "A dama encosta no rei na borda, pela diagonal, apoiada pelo bispo colado nela.", origem: "nosso" },
      { tag: "legalMate", nome: "Mate de Légal", resumo: "O fim da armadilha de Légal: o cavalo dá o mate, com o bispo colado no rei e o outro cavalo.", origem: "nosso" },
      { tag: "mateIn5", nome: "Mate em 5", resumo: "Cinco lances seus até o mate: cálculo longo, e cada resposta dele conferida." },
    ],
  },
] as const;

/** Todos os temas, achatados, na ordem do currículo. */
export const TEMAS: readonly (Tema & { bloco: number; faixa: readonly [number, number] })[] =
  BLOCOS.flatMap((bloco) =>
    bloco.temas.map((tema) => ({ ...tema, bloco: bloco.id, faixa: bloco.faixa })),
  );

export function temaPorTag(tag: string): (Tema & { bloco: number }) | undefined {
  return TEMAS.find((t) => t.tag === tag);
}
