/**
 * O currículo de tática, em oito blocos.
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
 * A faixa de rating é do **bloco**, não da tag: ela diz em que altura aquele
 * assunto é ensinável para um aluno de 1000–1400. `mateIn1` existe até 2000 de
 * rating no banco do Lichess; num bloco de mates curtos, um mate em 1 de 1900
 * é ruído.
 */

export type Tema = {
  /** A tag do Lichess, como vem na coluna `Themes`. */
  readonly tag: string;
  /** O nome em português que o aluno lê. */
  readonly nome: string;
  /** Uma linha explicando o motivo — vira o subtítulo do cartão do tema. */
  readonly resumo: string;
};

export type Bloco = {
  readonly id: number;
  readonly nome: string;
  readonly faixa: readonly [number, number];
  /**
   * Em que sábado o bloco abre — 1, 2 ou 3, do cronograma do preparatório.
   *
   * Mora aqui porque é o mesmo dado em três lugares: o cartão trancado diz
   * "abre no Sábado 2", o painel diz o que é para fazer esta semana, e a
   * apostila imprime o caderno daquele sábado. Uma tabela separada de
   * bloco → sábado seria a quarta opinião sobre a mesma coisa.
   */
  readonly sabado: 1 | 2 | 3;
  readonly temas: readonly Tema[];
};

export const BLOCOS: readonly Bloco[] = [
  {
    id: 1,
    nome: "Mates curtos e peça de graça",
    faixa: [600, 1300],
    sabado: 1,
    temas: [
      { tag: "mateIn1", nome: "Mate em 1", resumo: "Um lance e acabou. O olho treina aqui." },
      { tag: "mateIn2", nome: "Mate em 2", resumo: "O lance que obriga, e depois o mate." },
      { tag: "hangingPiece", nome: "Peça de graça", resumo: "A peça que ninguém defende — o erro nº 1 em 1000–1400." },
    ],
  },
  {
    id: 2,
    nome: "Padrões de mate I",
    faixa: [800, 1400],
    sabado: 1,
    temas: [
      { tag: "backRankMate", nome: "Mate do corredor", resumo: "O rei preso atrás dos próprios peões." },
      { tag: "smotheredMate", nome: "Mate sufocado", resumo: "O cavalo mata o rei cercado pelas próprias peças." },
      { tag: "arabianMate", nome: "Mate árabe", resumo: "Torre e cavalo no canto." },
      { tag: "anastasiaMate", nome: "Mate de Anastasia", resumo: "Cavalo e torre pela coluna aberta." },
      { tag: "hookMate", nome: "Mate do gancho", resumo: "Torre, cavalo e peão fechando a saída." },
    ],
  },
  {
    id: 3,
    nome: "Padrões de mate II",
    faixa: [1000, 1600],
    sabado: 2,
    temas: [
      { tag: "bodenMate", nome: "Mate de Boden", resumo: "Os dois bispos em diagonais que se cruzam." },
      { tag: "doubleBishopMate", nome: "Mate dos dois bispos", resumo: "Bispos paralelos sobre o rei no canto." },
      { tag: "dovetailMate", nome: "Mate da cauda de andorinha", resumo: "A dama ao lado do rei, com as fugas tapadas." },
      { tag: "mateIn3", nome: "Mate em 3", resumo: "Três lances forçados: onde o cálculo começa a doer." },
    ],
  },
  {
    id: 4,
    nome: "Motivos fundamentais",
    faixa: [800, 1400],
    sabado: 2,
    temas: [
      { tag: "fork", nome: "Garfo", resumo: "Uma peça ataca duas ao mesmo tempo." },
      { tag: "pin", nome: "Cravada", resumo: "A peça que não pode sair porque atrás dela há coisa melhor." },
      { tag: "skewer", nome: "Espeto", resumo: "A cravada ao contrário: a peça grande na frente." },
      { tag: "discoveredAttack", nome: "Ataque descoberto", resumo: "Sai uma peça e quem ataca é a de trás." },
      { tag: "doubleCheck", nome: "Xeque duplo", resumo: "Duas peças dão xeque: só o rei pode se mexer." },
    ],
  },
  {
    id: 5,
    nome: "Remover a defesa",
    faixa: [1000, 1500],
    sabado: 2,
    temas: [
      { tag: "capturingDefender", nome: "Capturar o defensor", resumo: "Tire quem segura, e o resto cai." },
      { tag: "deflection", nome: "Desvio", resumo: "Obrigue a peça a sair do posto que ela guarda." },
      { tag: "attraction", nome: "Atração", resumo: "Puxe a peça para a casa onde ela vira alvo." },
      { tag: "trappedPiece", nome: "Peça presa", resumo: "A peça sem casa para onde ir." },
      { tag: "xRayAttack", nome: "Raio X", resumo: "O ataque que atravessa a peça do meio." },
    ],
  },
  {
    id: 6,
    nome: "Ataque ao rei",
    faixa: [1000, 1600],
    sabado: 3,
    temas: [
      { tag: "exposedKing", nome: "Rei exposto", resumo: "Rei sem casas e sem defensores: procure o xeque." },
      { tag: "attackingF2F7", nome: "Ataque em f2/f7", resumo: "A casa mais fraca do começo de partida." },
      { tag: "kingsideAttack", nome: "Ataque na ala do rei", resumo: "Onde ele roca, é para lá que as peças vão." },
      { tag: "sacrifice", nome: "Sacrifício", resumo: "Dar material porque o que vem depois vale mais." },
    ],
  },
  {
    id: 7,
    nome: "Lances finos",
    faixa: [1100, 1700],
    sabado: 3,
    temas: [
      { tag: "intermezzo", nome: "Lance intermediário", resumo: "Antes de recapturar, um xeque que muda tudo." },
      { tag: "quietMove", nome: "Lance quieto", resumo: "Sem xeque e sem captura — e a ameaça é imparável." },
      { tag: "clearance", nome: "Liberação", resumo: "Tirar a própria peça da frente." },
      { tag: "interference", nome: "Interferência", resumo: "Pôr algo no meio da linha que defende." },
      { tag: "zugzwang", nome: "Zugzwang", resumo: "Jogar é obrigatório, e todo lance piora." },
    ],
  },
  {
    id: 8,
    nome: "Defesa e conversão",
    faixa: [1000, 1600],
    sabado: 3,
    temas: [
      { tag: "defensiveMove", nome: "Lance defensivo", resumo: "O único lance que segura — treinar não desistir." },
      { tag: "advancedPawn", nome: "Peão avançado", resumo: "O peão que vai virar dama e decide a partida." },
      { tag: "promotion", nome: "Promoção", resumo: "Chegar na oitava, e escolher a peça certa." },
      { tag: "underPromotion", nome: "Subpromoção", resumo: "Quando a dama não serve e o cavalo ganha." },
      { tag: "enPassant", nome: "En passant", resumo: "A regra que ninguém lembra na hora." },
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
