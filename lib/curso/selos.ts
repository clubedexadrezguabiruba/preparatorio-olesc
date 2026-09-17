import { NIVEIS, type Nivel } from "./nivel.ts";

/**
 * Os selos: o que o aluno **já conquistou**, e o que falta para o próximo.
 *
 * ## Nenhuma tabela, nenhuma migration, nenhuma consulta a mais
 *
 * Tudo o que um selo precisa o painel já lê para desenhar as barras. Este
 * arquivo é uma **função pura** sobre esses números — o mesmo padrão de
 * `fechamentoDoNivel` e `proximaAcao`, e pelo mesmo motivo: uma regra que fala
 * com o banco é uma regra que o `node --test` não cobre.
 *
 * **Desde 17/9/2026 (0018) o selo ganho é também gravado**, com a data — mas a
 * derivação continua aqui, pura. A gravação, o "Selo novo" e o selo que não some
 * moram em `selos-gravados.ts` (a regra) e `selos-banco.ts` (a execução). Os
 * selos V2 leem a view `puzzles_do_aluno`, da mesma migração.
 *
 * ## A armadilha da janela de 30 dias
 *
 * O painel lia os minutos de **apenas 30 dias**, e o comentário explicava por
 * quê: *"o preparatório inteiro tem quatro semanas"*. Certo para o cartão
 * "Hoje"; **errado para um selo**, que é permanente. "Uma hora" ganho no dia 1
 * sumiria no dia 32, e "30 dias seguidos" seria inconquistável dentro de uma
 * janela de 30.
 *
 * O conserto é não passar `desde` a `minutosPorDia` — o parâmetro já era
 * opcional — e recortar os 30 dias em memória para o cartão. E o que entra aqui
 * é a **maior** sequência já atingida (`maiorSequenciaDeDias`), não a atual: um
 * selo que some quando o aluno falta um dia é o site tirando dele uma coisa que
 * ele fez.
 *
 * ## Por que a V1 é pequena
 *
 * Porque ainda não sabemos se os alunos vão olhar para os selos. Seis famílias,
 * e o resto ficou escrito no plano: puzzles resolvidos (100/250/500/1000) e
 * pontaria (80% em 100+) ficaram para a V2 — que entrou em 17/9/2026, junto com
 * a família das aulas de abertura (ver {@link selos}). **Cortado de vez:** "Sem rede" —
 * passar a prova de primeira —, porque `ultimaProvaDeNivel()` devolve
 * `{acertos, total, passou, erros}` e **não** o número da tentativa. Um selo
 * raro não vale uma migration.
 *
 * ## Selo trancado diz o que falta
 *
 * Sempre. Um selo apagado sem condição escrita é decoração — ele mostra que
 * existe uma coisa boa e esconde como chegar lá, que é o oposto de um
 * treinador. É por isso que {@link Selo} tem `falta` e não um booleano.
 */

export type Familia =
  | "tatica"
  | "finais"
  | "repertorio"
  | "nivel"
  | "hora"
  | "constante"
  | "puzzles"
  | "pontaria"
  | "abertura"
  | "rating";

/** Todas as famílias, na ordem da lista. É daqui que `familiaDoId` reconhece um id gravado. */
export const FAMILIAS: readonly Familia[] = [
  "tatica",
  "finais",
  "repertorio",
  "nivel",
  "hora",
  "constante",
  "puzzles",
  "pontaria",
  "abertura",
  "rating",
];

/**
 * As famílias que **não** aparecem na vitrine de um colega (`/turma/[id]`).
 *
 * Só a tática rating: "Rating 1200 na tática" é o rating escrito com outras palavras, e o
 * colega não vê rating de ninguém (Doug, 17/9/2026 — o aluno não tem ranking). As outras
 * famílias dizem o que o aluno **fez**, e não onde ele está numa régua contra os outros.
 */
export const FAMILIAS_FORA_DA_VITRINE: ReadonlySet<Familia> = new Set<Familia>(["rating"]);

/**
 * A família de um id de selo, lida do próprio id — `tatica-14` é de `tatica`,
 * `abertura-curso-brancas-francesa` é de `abertura`. Todo id nasce `familia-…`, e o teste
 * confere isso selo a selo. `null` para o que não é selo.
 */
export function familiaDoId(id: string): Familia | null {
  const prefixo = id.split("-", 1)[0];
  return FAMILIAS.find((f) => f === prefixo && id.length > f.length + 1) ?? null;
}

/**
 * A cor de um selo de repertório por abertura (`repertorio-brancas-francesa` é de brancas).
 * `null` para os outros — inclusive `repertorio-brancas` e `repertorio-pretas`, os dois selos de
 * cor que existiram até 17/9 e continuam gravados para quem os ganhou.
 */
export function corDoSelo(id: string): "brancas" | "pretas" | null {
  const achado = /^repertorio-(brancas|pretas)-[a-z0-9-]+$/.exec(id);
  return achado ? (achado[1] as "brancas" | "pretas") : null;
}

export type Selo = {
  /** Único, e estável: ele vira `key` de lista e um dia vira linha de banco. */
  readonly id: string;
  readonly familia: Familia;
  /** O que o selo diz quando ganho. Curto — cabe numa pastilha de celular. */
  readonly nome: string;
  /** Uma linha: o que ele significa. Aparece no ganho e no trancado. */
  readonly conta: string;
  readonly ganho: boolean;
  /** O que falta, escrito. `null` quando o selo já é dele. */
  readonly falta: string | null;
};

/**
 * Os degraus de cada família numérica. Números, e não fórmula: são decisão.
 *
 * `readonly number[]` e não `as const` na leitura: com os literais o TypeScript
 * sabe que `degrau` nunca é 1 na tática e reprova a comparação que escreve
 * "1 tema" — o que está certo hoje e vira um erro de compilação na primeira vez
 * que alguém acrescentar um degrau 1. O tipo declarado deixa a lista ser dado.
 */
export const DEGRAUS: Record<
  "tatica" | "ratingAcimaDoInicio" | "rating" | "ratingSeguidos" | "finais" | "constante" | "puzzles",
  readonly number[]
> = {
  /**
   * **14 no lugar de 10**, e o motivo é o currículo: 14 é a meta da OLESC (os
   * temas dos níveis 1 a 3), o número que a `/trilha` já celebra. Um selo em 14
   * é *"cheguei ao torneio pronto"*; um selo em 10 é um número redondo. Era 13
   * até 16/9/2026, quando o xeque descoberto entrou no nível 2. O 29 é o fim do
   * nível 4, e o 63 o currículo inteiro.
   */
  tatica: [3, 7, 14, 29, 63],
  /**
   * Quanto o **recorde** subiu acima do rating com que o aluno começou o modo — o
   * "+100". Conta a partir de `rating_inicial` guardado na linha do aluno (600
   * para todos), e não de um número escrito aqui: quem jogou pela regra do
   * primeiro dia começou em 400.
   */
  ratingAcimaDoInicio: [100],
  /**
   * O **máximo** já atingido na tática rating, e não o rating de agora: selo
   * ganho não se perde num dia ruim (a mesma regra da `maiorSequencia`). Números
   * propostos pelo Doug em 15/9. Exigem ao menos um problema resolvido: quem
   * começa em 1300 não ganha o de 1000 só por abrir a página.
   */
  rating: [1000, 1200, 1400],
  /** Acertos seguidos na tática rating — a **melhor** sequência, não a atual. */
  ratingSeguidos: [10],
  /**
   * **O degrau 1 existe para ser alcançável hoje.** São 49 aulas na taxonomia e
   * 2 publicadas. Os degraus 5, 10, 25 e 49 já ficam escritos e acendem sozinhos
   * conforme as aulas forem publicadas — nenhum código muda quando isso
   * acontecer.
   */
  finais: [1, 5, 10, 25, 49],
  /** Dias seguidos de treino **medido**. A partida declarada não os sustenta. */
  constante: [3, 7, 14, 30],
  /**
   * Puzzles **diferentes** resolvidos, em qualquer modo (V2, 17/9/2026). "Resolvido" é o
   * puzzle com ao menos uma tentativa certa, contado uma vez só — e não cada tentativa certa:
   * a revisão e a prova servem de novo o mesmo puzzle, e acertar três vezes o mesmo problema
   * não é ter resolvido três. A conta é da view `puzzles_do_aluno` (0018).
   */
  puzzles: [100, 250, 500, 1000],
};

/**
 * A pontaria (V2, 17/9/2026): **80 certos em 100 tentativas seguidas**, em qualquer modo.
 *
 * ## A janela, e por que ela
 *
 * - **Seguidas, e não o total da vida.** Pelo total, os erros do primeiro dia — quando o
 *   aluno ainda nem sabia mexer no tabuleiro — pesariam para sempre. Na janela, o que conta é
 *   ele ter jogado bem por 100 puzzles em algum momento.
 * - **A melhor janela, e não as últimas 100.** É a regra de `maiorSequencia` e do máximo do
 *   rating: selo ganho não some num dia ruim. (Desde a 0018 o selo gravado não some de jeito
 *   nenhum; a derivação pela melhor janela só garante que ela concorde com o gravado.)
 * - **Tentativas, e não puzzles distintos.** Pontaria é acertar o que aparece na frente,
 *   inclusive o puzzle que ele já errou e voltou na revisão.
 * - **Todos os modos, na ordem de data.** O aquecimento é mais fácil e o rating é mais
 *   difícil (ele serve problemas no limite do aluno); misturados, é a pontaria de quem usa o
 *   site inteiro. Empate de instante desempata pelo id da tentativa, que é a ordem de gravação.
 *
 * Menos de 100 tentativas: não há janela, e o selo diz quantas faltam para a primeira.
 */
export const PONTARIA = { janela: 100, certos: 80 } as const;

/**
 * A melhor janela de `janela` tentativas seguidas: quantos certos ela teve. `null` se não há
 * tentativas suficientes. Recebe os acertos **em ordem de data**.
 *
 * O banco faz a mesma conta na view `puzzles_do_aluno` (0018), com uma função de janela; esta
 * versão existe para o teste alcançar a regra, e `npm run selos:ciclo` confere que as duas
 * dão o mesmo número sobre as tentativas de verdade da conta de ensaio.
 */
export function melhorJanelaDeAcertos(acertos: readonly boolean[], janela: number = PONTARIA.janela): number | null {
  if (acertos.length < janela) return null;
  let naJanela = 0;
  for (let i = 0; i < janela; i += 1) if (acertos[i]) naJanela += 1;
  let melhor = naJanela;
  for (let i = janela; i < acertos.length; i += 1) {
    if (acertos[i]) naJanela += 1;
    if (acertos[i - janela]) naJanela -= 1;
    if (naJanela > melhor) melhor = naJanela;
  }
  return melhor;
}

/** Uma abertura do repertório, como o selo dela a vê — montada por `aberturasDoRepertorio`. */
export type AberturaParaOSelo = {
  readonly cor: "brancas" | "pretas";
  /** O id da abertura no índice (`francesa`): é o fim do id do selo. */
  readonly abertura: string;
  /** O nome no índice ("Francesa 3.Bd3"). É o nome do selo, curto: a cor vai no desenho. */
  readonly nome: string;
  /** Linhas do Base da abertura (o Avançado não conta). */
  readonly base: number;
  /** Delas, quantas aprendidas. */
  readonly aprendidas: number;
  /** Delas, quantas a trava por aula ainda tranca. */
  readonly trancadas: number;
};

/** Um curso de abertura, como os selos o veem — lido dos dados publicados (`aulasDoCurso`). */
export type CursoParaOSelo = {
  /** `cor/abertura`, a chave de `cursosDeAbertura`. */
  readonly chave: string;
  /** O nome da abertura no índice do repertório ("Francesa"). */
  readonly nome: string;
  /** Aulas publicadas do curso. */
  readonly aulas: number;
  /** Delas, quantas o aluno já concluiu ao menos uma vez. */
  readonly concluidas: number;
};

/**
 * O que a decisão precisa. Tudo já está na memória do painel quando ele chama.
 */
export type ParaOsSelos = {
  /** Temas de tática fechados (as três etapas), no curso inteiro. */
  readonly temasFechados: number;
  /** Aulas de finais aprendidas, entre as publicadas. */
  readonly aulasAprendidas: number;
  readonly repertorio: {
    /** Uma entrada por abertura do índice — cada uma é um selo (`selos-repertorio.ts`). */
    readonly aberturas: readonly AberturaParaOSelo[];
    readonly baseCompleto: boolean;
    readonly avancadoCompleto: boolean;
  };
  /** O maior nível cuja prova ele passou. 0 se nenhuma. */
  readonly conquistado: 0 | Nivel;
  /** Em quantos dias distintos ele já treinou 60 minutos medidos. */
  readonly diasComUmaHora: number;
  /** A **maior** sequência de dias seguidos já atingida — não a atual. */
  readonly maiorSequencia: number;
  /**
   * A tática rating, lida de `rating_tatica` — ou `null` se ele nunca jogou.
   * `maximo` e `melhorSequencia` são os recordes, que só sobem.
   */
  readonly ratingTatica: {
    readonly maximo: number;
    readonly melhorSequencia: number;
    /** O rating com que ele começou o modo. */
    readonly inicio: number;
    readonly resolvidos: number;
  } | null;
  /** Os puzzles, lidos da view `puzzles_do_aluno` (0018). */
  readonly puzzles: {
    /** Puzzles distintos com ao menos uma tentativa certa, em qualquer modo. */
    readonly resolvidos: number;
    /** Tentativas, em qualquer modo — só para dizer quanto falta para a primeira janela. */
    readonly tentativas: number;
    /** Os certos da melhor janela de 100 tentativas seguidas; `null` com menos de 100. */
    readonly melhorJanela: number | null;
  };
  /** As aulas de abertura (curso de abertura, 17/9/2026), por dados. */
  readonly aberturas: {
    /** Aulas de abertura publicadas concluídas ao menos uma vez, somando todos os cursos. */
    readonly concluidas: number;
    readonly cursos: readonly CursoParaOSelo[];
  };
};

/**
 * A entrada de um aluno que não fez nada — com os cursos publicados de hoje.
 *
 * É o **catálogo**: `selos(entradaZerada(cursos))` devolve todos os selos que existem, com
 * nome e explicação. A vitrine e o relatório do professor o usam para dar nome aos selos
 * gravados sem ler o progresso inteiro do aluno.
 */
export function entradaZerada(
  cursos: readonly CursoParaOSelo[] = [],
  aberturasDoRepertorio: readonly AberturaParaOSelo[] = [],
): ParaOsSelos {
  return {
    temasFechados: 0,
    aulasAprendidas: 0,
    repertorio: {
      aberturas: aberturasDoRepertorio.map((a) => ({ ...a, aprendidas: 0, trancadas: 0 })),
      baseCompleto: false,
      avancadoCompleto: false,
    },
    conquistado: 0,
    diasComUmaHora: 0,
    maiorSequencia: 0,
    ratingTatica: null,
    puzzles: { resolvidos: 0, tentativas: 0, melhorJanela: null },
    aberturas: { concluidas: 0, cursos: cursos.map((c) => ({ ...c, concluidas: 0 })) },
  };
}

function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/** Um selo de degrau numérico, com o "faltam N" já escrito. */
function porDegrau(
  familia: Familia,
  degrau: number,
  tem: number,
  nome: string,
  conta: string,
  unidade: [string, string],
): Selo {
  const ganho = tem >= degrau;
  const quantos = degrau - tem;
  return {
    id: `${familia}-${degrau}`,
    familia,
    nome,
    conta,
    ganho,
    // O verbo concorda junto com o substantivo: "faltam 1 tema" é o tipo de
    // detalhe que uma criança de 11 anos lê como descuido, e ela não está errada.
    falta: ganho
      ? null
      : `${quantos === 1 ? "falta" : "faltam"} ${plural(quantos, unidade[0], unidade[1])}`,
  };
}

/** Um selo que não conta: ou aconteceu, ou não. */
function porCondicao(
  familia: Familia,
  id: string,
  ganho: boolean,
  nome: string,
  conta: string,
  falta: string,
): Selo {
  return { id, familia, nome, conta, ganho, falta: ganho ? null : falta };
}

/**
 * Todos os selos, na ordem em que eles aparecem na tela.
 *
 * A lista sai **inteira**, ganhos e trancados juntos: quem recorta é a tela, e é
 * ela que decide mostrar os ganhos e os dois próximos. Uma função que já
 * devolvesse só o recorte esconderia dos testes exatamente a parte que interessa
 * — o que acontece com o selo que ainda falta.
 */
export function selos(p: ParaOsSelos): Selo[] {
  const lista: Selo[] = [];

  for (const degrau of DEGRAUS.tatica) {
    lista.push(
      porDegrau(
        "tatica",
        degrau,
        p.temasFechados,
        `${degrau} temas de tática`,
        degrau === 14
          ? "Os 14 temas dos níveis 1 a 3 — a meta da OLESC."
          : "Um tema fecha com aquecimento, série e prova.",
        ["tema", "temas"],
      ),
    );
  }

  for (const degrau of DEGRAUS.finais) {
    lista.push(
      porDegrau(
        "finais",
        degrau,
        p.aulasAprendidas,
        `${degrau} ${degrau === 1 ? "aula" : "aulas"} de finais`,
        "Conta quando você vence a prática em três dias diferentes — ou assiste até o fim à aula sem prática.",
        ["aula", "aulas"],
      ),
    );
  }

  /*
   * O repertório, **uma abertura por selo** (Doug, 17/9/2026: "o selo repertório de brancas é
   * muito longo — dividir por defesa; pretas também"). Saíram `repertorio-brancas` e
   * `repertorio-pretas`; ficam o Base e o Avançado como os dois grandes. A regra de cada um —
   * todo o Base da abertura aprendido e nenhuma linha trancada pela aula — está em
   * `selos-repertorio.ts`. Abertura sem linha no Base não tem selo: ninguém poderia ganhá-lo.
   */
  for (const a of p.repertorio.aberturas) {
    if (a.base === 0) continue;
    const faltam = Math.max(0, a.base - a.aprendidas);
    const ganho = a.trancadas === 0 && faltam === 0;
    lista.push({
      id: `repertorio-${a.cor}-${a.abertura}`,
      familia: "repertorio",
      nome: a.nome,
      conta:
        a.base === 1
          ? `A linha do Base de ${a.cor} na ${a.nome}, aprendida.`
          : `As ${a.base} linhas do Base de ${a.cor} na ${a.nome}, aprendidas.`,
      ganho,
      falta: ganho
        ? null
        : a.trancadas > 0
          ? `${a.trancadas === 1 ? "1 linha ainda trancada" : `${a.trancadas} linhas ainda trancadas`} — conclua as aulas do curso`
          : `${faltam === 1 ? "falta 1 linha" : `faltam ${faltam} linhas`}`,
    });
  }

  lista.push(
    porCondicao(
      "repertorio",
      "repertorio-base",
      p.repertorio.baseCompleto,
      "O Base inteiro",
      "O repertório do clube, de ponta a ponta. É ele que abre o Avançado.",
      "termine as duas cores do Base",
    ),
    porCondicao(
      "repertorio",
      "repertorio-avancado",
      p.repertorio.avancadoCompleto,
      "O Avançado inteiro",
      "As linhas que só abrem depois do Base.",
      "termine o Base e depois o Avançado",
    ),
  );

  for (const n of NIVEIS) {
    lista.push(
      porCondicao(
        "nivel",
        `nivel-${n}`,
        p.conquistado >= n,
        `Nível ${n}`,
        "A prova do degrau: 12 puzzles misturados, sem dizer o tema.",
        n === (p.conquistado as number) + 1
          ? "feche as três frentes e faça a prova"
          : `conquiste antes o nível ${n - 1}`,
      ),
    );
  }

  lista.push(
    porCondicao(
      "hora",
      "hora-1",
      p.diasComUmaHora > 0,
      "Uma hora",
      "Um dia inteiro de treino medido pelo site: 60 minutos.",
      "treine 60 minutos medidos num mesmo dia",
    ),
  );

  for (const degrau of DEGRAUS.constante) {
    lista.push(
      porDegrau(
        "constante",
        degrau,
        p.maiorSequencia,
        `${degrau} dias seguidos`,
        "Dias seguidos com 60 minutos de treino no site. A partida declarada não conta.",
        ["dia", "dias"],
      ),
    );
  }

  /*
   * Os selos V2 e a família das aulas de abertura (17/9/2026) entram **antes** do rating e
   * depois de tudo o que já existia: `proximos` escolhe as famílias na ordem desta lista, e o
   * painel continua mostrando os mesmos dois próximos (tática e finais) de antes.
   */
  for (const degrau of DEGRAUS.puzzles) {
    lista.push(
      porDegrau(
        "puzzles",
        degrau,
        p.puzzles.resolvidos,
        `${degrau} puzzles resolvidos`,
        "Puzzles diferentes que você acertou, em qualquer parte do site. Acertar de novo o mesmo não conta duas vezes.",
        ["puzzle", "puzzles"],
      ),
    );
  }

  const faltamParaAJanela = Math.max(1, PONTARIA.janela - p.puzzles.tentativas);
  lista.push(
    porCondicao(
      "pontaria",
      `pontaria-${PONTARIA.certos}`,
      p.puzzles.melhorJanela !== null && p.puzzles.melhorJanela >= PONTARIA.certos,
      "Pontaria",
      `${PONTARIA.certos} acertos em ${PONTARIA.janela} puzzles seguidos, em qualquer parte do site.`,
      p.puzzles.melhorJanela === null
        ? `${faltamParaAJanela === 1 ? "falta 1 puzzle" : `faltam ${faltamParaAJanela} puzzles`} para a primeira janela de ${PONTARIA.janela}`
        : `acerte ${PONTARIA.certos} de ${PONTARIA.janela} seguidos (seu melhor: ${p.puzzles.melhorJanela})`,
    ),
  );

  /*
   * As aulas de abertura, **por dados**: um curso publicado amanhã ganha o selo dele sem mudar
   * esta função. Sem curso publicado não há selo nenhum — um selo que ninguém pode ganhar é a
   * armadilha que o degrau 1 de finais existe para evitar.
   */
  if (p.aberturas.cursos.length > 0) {
    lista.push(
      porCondicao(
        "abertura",
        "abertura-aula-1",
        p.aberturas.concluidas >= 1,
        "Primeira aula de abertura",
        "Uma aula do curso de abertura, do começo ao fim.",
        "conclua uma aula de abertura",
      ),
    );
    for (const curso of p.aberturas.cursos) {
      const faltam = Math.max(0, curso.aulas - curso.concluidas);
      lista.push(
        porCondicao(
          "abertura",
          `abertura-curso-${curso.chave.replace("/", "-")}`,
          curso.aulas > 0 && faltam === 0,
          `Curso da ${curso.nome}`,
          `Todas as aulas do curso da ${curso.nome}, concluídas.`,
          `${faltam === 1 ? "falta 1 aula" : `faltam ${faltam} aulas`} da ${curso.nome}`,
        ),
      );
    }
  }

  /*
   * A tática rating vem **por último** de propósito. `proximos` mostra um selo
   * por família, na ordem desta lista; no segundo lugar, o convite do rating
   * tiraria do painel o próximo selo de finais, que o aluno via até 15/9. O
   * convite para o modo já está no cartão do painel; os selos ganhos aparecem
   * como os outros.
   */
  const maximo = Math.round(p.ratingTatica?.maximo ?? 0);
  const jogou = (p.ratingTatica?.resolvidos ?? 0) > 0;
  const faltaNoRecorde = (alvo: number) =>
    p.ratingTatica === null || !jogou
      ? "jogue a tática rating"
      : `${alvo - maximo === 1 ? "falta 1 ponto" : `faltam ${alvo - maximo} pontos`} no seu recorde`;

  for (const acima of DEGRAUS.ratingAcimaDoInicio) {
    const alvo = Math.round(p.ratingTatica?.inicio ?? 0) + acima;
    const ganho = jogou && maximo >= alvo;
    lista.push({
      id: `rating-mais-${acima}`,
      familia: "rating",
      nome: `+${acima} na tática rating`,
      conta: `O recorde subiu ${acima} pontos acima do rating com que você começou o modo.`,
      ganho,
      falta: ganho ? null : faltaNoRecorde(alvo),
    });
  }

  for (const degrau of DEGRAUS.rating) {
    const ganho = jogou && maximo >= degrau;
    lista.push({
      id: `rating-${degrau}`,
      familia: "rating",
      nome: `Rating ${degrau} na tática`,
      conta: `O recorde da tática rating chegou a ${degrau}. Um dia ruim não tira este selo.`,
      ganho,
      falta: ganho ? null : faltaNoRecorde(degrau),
    });
  }

  for (const degrau of DEGRAUS.ratingSeguidos) {
    const melhor = p.ratingTatica?.melhorSequencia ?? 0;
    lista.push(
      porCondicao(
        "rating",
        `rating-seguidos-${degrau}`,
        melhor >= degrau,
        `${degrau} seguidos na tática rating`,
        `${degrau} problemas certos em sequência, sem nenhum erro no meio.`,
        p.ratingTatica === null
          ? "jogue a tática rating"
          : `acerte ${degrau} em sequência (seu melhor: ${melhor})`,
      ),
    );
  }

  return lista;
}

/** Os que ele já tem. */
export function ganhos<T extends Selo>(lista: readonly T[]): T[] {
  return lista.filter((s) => s.ganho);
}

/**
 * Os `quantos` mais próximos, um por família.
 *
 * **Um por família**, e não os primeiros da lista: sem isso os dois próximos
 * seriam sempre os dois degraus seguintes de tática, e o aluno nunca ficaria
 * sabendo que existe um selo de constância. O ponto de mostrar o que falta é
 * mostrar o **leque**, não o próximo passo — quem responde "o próximo passo" é o
 * cartão AGORA, e ele não divide esse trabalho com ninguém.
 */
export function proximos<T extends Selo>(lista: readonly T[], quantos = 2): T[] {
  const vistas = new Set<Familia>();
  const escolhidos: T[] = [];
  for (const selo of lista) {
    if (selo.ganho || vistas.has(selo.familia)) continue;
    vistas.add(selo.familia);
    escolhidos.push(selo);
    if (escolhidos.length === quantos) break;
  }
  return escolhidos;
}
