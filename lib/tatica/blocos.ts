import type { Nivel } from "../curso/nivel.ts";

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
 * A faixa de rating é do **bloco**. O piso é dele — mate em 1 começa mais
 * embaixo que lance quieto —, mas **o teto é 2100 em todos os oito**, decisão
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
   * são operações **sobre** uma cravada.
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
      { tag: "mateIn2", nome: "Mate em 2", resumo: "O lance que obriga, e depois o mate." },
      { tag: "hangingPiece", nome: "Peça de graça", resumo: "A peça que ninguém defende — o erro nº 1 em 1000–1400." },
    ],
  },
  {
    id: 2,
    nome: "Padrões de mate I",
    faixa: [800, 2100],
    nivel: 3,
    temas: [
      { tag: "backRankMate", nome: "Mate do corredor", resumo: "O rei preso atrás dos próprios peões." },
      { tag: "smotheredMate", nome: "Mate sufocado", resumo: "O cavalo mata o rei cercado pelas próprias peças." },
      { tag: "arabianMate", nome: "Mate árabe", resumo: "Torre e cavalo prendem o rei no canto." },
      { tag: "anastasiaMate", nome: "Mate de Anastasia", resumo: "O cavalo tapa as fugas e a torre entra pela coluna." },
      { tag: "hookMate", nome: "Mate do gancho", resumo: "Torre, cavalo e peão fechando a saída." },
    ],
  },
  {
    id: 3,
    nome: "Padrões de mate II",
    faixa: [1000, 2100],
    nivel: 4,
    temas: [
      { tag: "bodenMate", nome: "Mate de Boden", resumo: "Os dois bispos em diagonais que se cruzam." },
      { tag: "doubleBishopMate", nome: "Mate dos dois bispos", resumo: "Dois bispos em diagonais vizinhas, e o rei no canto." },
      { tag: "dovetailMate", nome: "Mate da cauda de andorinha", resumo: "A dama ao lado do rei, com as fugas tapadas." },
      { tag: "mateIn3", nome: "Mate em 3", resumo: "Três lances forçados: onde o cálculo começa a doer." },
    ],
  },
  {
    id: 4,
    nome: "Táticas fundamentais",
    faixa: [800, 2100],
    nivel: 2,
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
    faixa: [1000, 2100],
    nivel: 4,
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
    faixa: [1000, 2100],
    nivel: 5,
    temas: [
      { tag: "exposedKing", nome: "Rei exposto", resumo: "Rei sem casas e sem defensores: procure o xeque." },
      { tag: "attackingF2F7", nome: "Ataque em f2/f7", resumo: "A casa mais fraca do começo de partida." },
      { tag: "kingsideAttack", nome: "Ataque na ala do rei", resumo: "Onde ele roca, é para lá que as peças vão." },
      { tag: "sacrifice", nome: "Sacrifício", resumo: "Dar uma peça porque o que vem depois vale mais." },
    ],
  },
  {
    id: 7,
    nome: "Lances finos",
    faixa: [1100, 2100],
    nivel: 5,
    temas: [
      { tag: "intermezzo", nome: "Lance intermediário", resumo: "Antes de recapturar, um xeque que muda tudo." },
      { tag: "quietMove", nome: "Lance quieto", resumo: "Sem xeque e sem captura — e a ameaça é imparável." },
      { tag: "clearance", nome: "Liberação", resumo: "Tirar a própria peça da frente." },
      { tag: "interference", nome: "Interferência", resumo: "Pôr uma peça no meio do caminho de quem defende." },
      { tag: "zugzwang", nome: "Zugzwang", resumo: "Jogar é obrigatório, e todo lance piora." },
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
