import { z } from "zod";

/**
 * Schema das duas camadas de dados do curso (plano da F1, §2).
 *
 * - Camada 0, registro de obras: `content/sources.json` — quais obras podem
 *   originar posição, e quais têm teto de citação (§12.7 do currículo).
 * - Camada 1, posição: `content/positions/<nível>/<id>.json` — um fato
 *   registrado uma vez, com proveniência completa.
 * - Camada 2, aula: `content/lessons/<ID-DA-COMPETÊNCIA>.json` — configuração
 *   das etapas, apontando posições por id.
 *
 * Este arquivo é a única fonte de verdade do formato: o motor (F1/B3) deriva
 * os tipos daqui com `z.infer`, e o gate (`scripts/validate-content.ts`) roda
 * exatamente este schema sobre os arquivos.
 *
 * Os objetos são *estritos*: campo desconhecido é erro, não campo ignorado.
 * Isso custa uma divergência mínima em relação ao exemplo da §2.3 do plano,
 * que traz os marcadores `stepsNote` e `nodesNote` para sinalizar as partes
 * abreviadas ali — o arquivo real não é abreviado e não os tem.
 */

/** Lance em UCI: casa de origem + casa de destino (+ peça da promoção). */
export const uciSchema = z
  .string()
  .regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/, "lance UCI inválido (ex.: h1h4, e7e8q)");

/** Casa do tabuleiro, para destaques e setas. */
export const squareSchema = z.string().regex(/^[a-h][1-8]$/, "casa inválida (ex.: h4)");

/**
 * FEN com os 6 campos. É só a forma; a legalidade de verdade (reis não
 * adjacentes, xeque impossível) é conferida pelo gate com a chess.js.
 */
export const fenSchema = z
  .string()
  .regex(
    /^([1-8pnbrqkPNBRQK]+\/){7}[1-8pnbrqkPNBRQK]+ [wb] (-|K?Q?k?q?) (-|[a-h][36]) \d+ \d+$/,
    "FEN malformada (esperados os 6 campos)",
  );

/**
 * Exportado pelo mesmo motivo que o `lessonIdSchema`: no modo autor (B8.4) o id
 * vem da tela e vira nome de arquivo, e é este regex — sem barra e sem ponto —
 * que impede um `../` de sair da pasta de rascunhos.
 */
export const positionIdSchema = z
  .string()
  .regex(/^pos-[a-z0-9-]+$/, "id de posição deve ser minúsculo, no formato pos-...");

const sceneIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "id de cena deve ser minúsculo com hífens (ex.: como-termina)");

const nodeIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*$/, "id de nó deve ser minúsculo e sem espaços (ex.: n1)");

const errorIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "id de erro deve ser minúsculo com hífens (ex.: cheque-inutil)");

const texto = z.string().min(1, "texto não pode ser vazio");

/* ------------------------------------------------------------------ *
 * Camada 1 — posição
 * ------------------------------------------------------------------ */

/**
 * Os 9 campos de proveniência da §12.3 do currículo, nome a nome.
 * `null` significa "não se aplica" e só é aceito em posição `fixture`
 * (o gate confere isso, não o schema).
 */
export const PROVENANCE_FIELDS = [
  "externalHumanSource",
  "bibliographicSource",
  "originalGame",
  "authorComposer",
  "license",
  "editionFile",
  "fenMethod",
  "qaApplied",
  "pendingRisk",
] as const;

export const provenanceSchema = z.strictObject({
  /** Quem, fora do projeto, é a origem humana da posição. */
  externalHumanSource: texto.nullable(),
  /** Obra, edição, página e número do diagrama. */
  bibliographicSource: texto.nullable(),
  /** Partida original, quando a posição vem de uma. */
  originalGame: texto.nullable(),
  /** Autor/compositor, quando é estudo composto. */
  authorComposer: texto.nullable(),
  /** Licença sob a qual a posição pode ser usada. */
  license: texto.nullable(),
  /** Arquivo da biblioteca de onde saiu (nome do PDF em `biblioteca/`). */
  editionFile: texto.nullable(),
  /** Como a FEN foi obtida (transcrição do diagrama, PGN, fixture técnica…). */
  fenMethod: texto.nullable(),
  /** QA aplicado — quem conferiu e quando. */
  qaApplied: texto.nullable(),
  /** Risco pendente conhecido. */
  pendingRisk: texto.nullable(),
});

/**
 * `fixture` nunca publica (§12.5 do currículo: posição sintética não é
 * promovível a conteúdo); `candidate` aguarda QA; `approved` é o único
 * status que chega ao aluno.
 */
export const positionStatusSchema = z.enum(["fixture", "candidate", "approved"]);

export const positionSchema = z.strictObject({
  id: positionIdSchema,
  fen: fenSchema,
  expectedResult: z.enum(["win-white", "win-black", "draw"]),
  tags: z.array(texto).min(1),
  status: positionStatusSchema,
  provenance: provenanceSchema,
});

/* ------------------------------------------------------------------ *
 * Camada 0 — registro de obras
 * ------------------------------------------------------------------ */

/**
 * `content/sources.json` — a lista das obras que podem originar posição
 * (§12.2 e §12.4 do currículo). O gate usa este registro para duas coisas:
 *
 * - **ancorar a proveniência**: o `editionFile` de toda posição não-fixture
 *   tem de casar com o `file` ou o `slug` de uma obra registrada, o que
 *   elimina proveniência de texto livre;
 * - **cobrar o teto de citação** (§12.7): obra com `protected: true`
 *   contribui no máximo 2 posições para a mesma aula, porque o que a lei
 *   protege é a *coleção* do autor, não a posição isolada.
 *
 * `file: null` é para fonte sem PDF na biblioteca (o Lichess Open Database,
 * por exemplo); nesse caso a posição cita o `slug`.
 */
export const sourceSchema = z.strictObject({
  /** Identificador estável, minúsculo — é o que a proveniência pode citar. */
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug deve ser minúsculo com hífens"),
  title: texto,
  author: texto,
  /** Edição exata; `null` enquanto a folha de rosto não foi conferida. */
  edition: texto.nullable(),
  /** `true` = obra sob direito autoral vigente, sujeita ao teto da §12.7. */
  protected: z.boolean(),
  /**
   * Livro-base didático: obra de onde saem o **objetivo e o exemplo** de uma
   * aula (as etapas 1 e 2), e não só posição de prática. São os manuais
   * escritos para iniciante, com progressão declarada — o gênero que o
   * domínio público não tem (§3.3 do SOURCE-CORPUS). A rotação entre elas é
   * o que impede uma obra de dar a espinha didática de um nível inteiro, e o
   * gate a cobra em `FONTE_DIDATICA_DOMINA`.
   */
  didactic: z.boolean().optional(),
  license: texto,
  /** Nome do PDF em `biblioteca/`, ou `null` para fonte sem arquivo local. */
  file: texto.nullable(),
  role: texto,
});

export const sourceRegistrySchema = z.strictObject({
  _leia: texto,
  sources: z.array(sourceSchema).min(1),
});

/** Quantas posições de uma mesma obra protegida uma aula pode usar (§12.7). */
export const PROTECTED_SOURCE_CAP = 2;

/* ------------------------------------------------------------------ *
 * Camada 2 — aula
 * ------------------------------------------------------------------ */

/**
 * Uma variante do defensor: a resposta, e para onde a linha segue depois dela
 * (B9/E1).
 *
 * Existe porque `reply` é **um** UCI, e um UCI só não cabe "o rei preto pode
 * fugir para dois lados". Ramo do aluno já cabia — são até 8 expects no mesmo
 * nó —, ramo do defensor não cabia em lugar nenhum.
 */
export const replySchema = z.strictObject({
  reply: uciSchema,
  next: nodeIdSchema,
});

/**
 * Um lance esperado do *método*. Só ele avança a aula.
 * `moves` aceita mais de um UCI quando lances diferentes são a mesma ideia.
 *
 * Três formas, e só três (a `superRefine` abaixo as cobra):
 *
 * | forma | campos | o que quer dizer |
 * |---|---|---|
 * | terminal | nenhum dos três | o lance dá mate ali (o gate confere) |
 * | única | `reply` + `next` | o defensor tem uma resposta só |
 * | múltipla | `replies` (2 a 4) | o defensor escolhe entre variantes |
 *
 * **Campo novo e não `reply: uci | uci[]`**: o caso comum — uma resposta, que
 * é 100% do corpus de hoje — continua sendo uma linha no arquivo, e nenhuma
 * aula publicada muda um byte. O `min(2)` do `replies` mata a lista de um item
 * só sem precisar de regra de gate: uma resposta se escreve em `reply`.
 */
export const expectSchema = z
  .strictObject({
    moves: z.array(uciSchema).min(1).max(4),
    /** Resposta do defensor, determinística, escrita pela autoria. */
    reply: uciSchema.optional(),
    next: nodeIdSchema.optional(),
    /**
     * As variantes do defensor, quando ele tem mais de uma (B9/E1). Qual delas
     * o aluno enfrenta é decidido por `lib/lesson/defensor.ts` — determinístico,
     * sem sorteio: dentro de uma tentativa a defesa é estável, e entre
     * tentativas muda, que é o ponto.
     */
    replies: z.array(replySchema).min(2).max(4).optional(),
    feedback: texto,
    /**
     * Escrito pelo gerador de ramos equivalentes, **nunca à mão**: marca o que
     * o `validate:content --write` derivou e vai regravar na próxima rodada.
     */
    generated: z.literal(true).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.replies !== undefined) {
      // Misturar as duas escritas deixaria duas verdades sobre a mesma linha, e
      // quem lê o arquivo não teria como saber qual delas o motor obedece.
      for (const campo of ["reply", "next"] as const) {
        if (e[campo] !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: [campo],
            message: `\`${campo}\` e \`replies\` não convivem: com mais de uma variante, todas moram em replies`,
          });
        }
      }
      return;
    }
    if ((e.reply === undefined) !== (e.next === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: [e.reply === undefined ? "reply" : "next"],
        message: "`reply` e `next` andam juntos: ou os dois, ou nenhum (nó terminal)",
      });
    }
  });

/** Erro nomeado, vindo da coluna "erros típicos" do currículo. */
export const mistakeSchema = z.strictObject({
  moves: z.array(uciSchema).min(1),
  errorId: errorIdSchema,
});

/**
 * Um lance que a **autoria** declara válido, com o texto dela (B8.2).
 *
 * É o irmão de `mistakes` e o oposto de `methodAlternatives`: aquele é da
 * máquina — o gate o apaga e o regrava a cada `--write`, e o critério dele é
 * geometria pura —, este é do autor, e o gerador nunca o toca.
 *
 * Existe porque não havia porta nenhuma pela qual dizer "aceite este lance,
 * com este meu texto". Tirar o lance da lista de erros não bastava: ele caía no
 * `fallbacks.winningOffMethod`, que é um texto só para a aula inteira e diz
 * "ainda ganha, mas não é o método" — ou seja, continuava soando a recusa.
 *
 * Cada entrada tem o **seu** texto, e a lista aceita mais de uma: é assim que
 * dois caminhos diferentes ganham duas explicações diferentes.
 *
 * Quem manda no quê: **você manda na técnica, a tablebase manda no que ganha**.
 * O gate recusa lance declarado válido que não esteja em `winningMoves`
 * (`ALTERNATIVA_NAO_GANHA`), e recusa o mesmo lance estando em duas listas ao
 * mesmo tempo (`ALTERNATIVA_E_ERRO`, `ALTERNATIVA_E_METODO`).
 */
export const authorAlternativeSchema = z.strictObject({
  moves: z.array(uciSchema).min(1),
  /** O que o aluno lê. Elogio, não recusa — a peça volta, mas sem repreensão. */
  feedback: texto,
});

export const treeNodeSchema = z.strictObject({
  fen: fenSchema,
  hint: texto.optional(),
  highlights: z.array(squareSchema).min(1).optional(),
  /**
   * O teto de 8 é o do arquivo inteiro, autorais + gerados. O teto da autoria
   * é 4, e quem cobra isso é o gate (`EXPECTS_AUTORAIS_DEMAIS`): schema não
   * sabe distinguir quem escreveu o quê antes de olhar o campo `generated`.
   */
  expects: z.array(expectSchema).min(1).max(8),
  mistakes: z.array(mistakeSchema).optional(),
  /**
   * Lances que aplicam a **mesma técnica** do roteiro sem serem o lance do
   * roteiro. Só a etapa 3 os tem: lá o aluno é elogiado e a peça volta. Na
   * etapa 4 o mesmo lance vira ramo de verdade, e o campo é proibido.
   * **Gerado pelo validador — nunca escrito à mão.**
   */
  methodAlternatives: z.array(uciSchema).min(1).optional(),
  /**
   * Lances que a **autoria** declara válidos, cada um com o seu texto (B8.2).
   * Ao contrário de `methodAlternatives`, valem nas etapas 3 **e** 4, e o
   * gerador nunca os escreve nem os apaga. Ver `authorAlternativeSchema`.
   */
  authorAlternatives: z.array(authorAlternativeSchema).min(1).optional(),
  /**
   * Todos os lances legais do nó que preservam a vitória.
   * **Gerado pelo validador a partir da tablebase — nunca escrito à mão.**
   */
  winningMoves: z.array(uciSchema),
  /** Nó inteiro derivado pelo gerador de ramos. Nunca escrito à mão. */
  generated: z.literal(true).optional(),
});

const treeBaseSchema = z.strictObject({
  positionId: positionIdSchema,
  root: nodeIdSchema,
  nodes: z.record(nodeIdSchema, treeNodeSchema),
});

/**
 * Um quadro do exemplo: a cena, e quantos meios-lances dela já foram jogados.
 * `step: 0` é a posição de partida da cena. É a mesma contagem que a etapa 2
 * mostra ao aluno ("Lance N de M") e que a store guarda.
 *
 * Serve para a etapa 1 mostrar **diagramas sem gastar posição**: o objetivo
 * ilustra suas regras com quadros do exemplo, e não com posições novas — o que
 * também poupa o teto de citação da §12.7.
 */
export const frameRefSchema = z.strictObject({
  scene: sceneIdSchema,
  step: z.number().int().min(0),
});

/**
 * Uma regra numerada do objetivo — a "fase" que os manuais de iniciante
 * escrevem antes de mostrar lance nenhum (Müller e Silman fazem exatamente
 * isso; ver §6.1 do SOURCE-CORPUS).
 */
export const objectiveRuleSchema = z.strictObject({
  title: texto,
  text: texto,
  /** Quadro que ilustra a regra. Sem ele, a regra não troca o diagrama. */
  frame: frameRefSchema.optional(),
  /** Desenhar a caixa do rei neste quadro. */
  box: z.boolean().optional(),
});

/**
 * Etapa 1 — objetivo: o andaime da aula.
 *
 * Deixou de ser "diagrama parado + dois textos" em 2026-08-19: o aluno-alvo é
 * iniciante absoluto, e os manuais que funcionam para ele têm sempre a mesma
 * forma — **técnica com nome, motivo, regras numeradas, e o fim mostrado
 * antes do caminho**. O `frame` padrão é o último quadro da primeira cena,
 * isto é, o mate: Silman ensina assim, de trás para frente.
 */
export const objectiveStageSchema = z.strictObject({
  /** Slug da obra-base didática (`didactic: true` no registro de obras). */
  source: z.string().regex(/^[a-z0-9-]+$/, "source deve ser o slug de uma obra"),
  technique: z.strictObject({
    /** O nome da técnica, na voz do curso ("a caixa que encolhe"). */
    name: texto,
    /** Uma linha que resume a ideia — o "slogan" do manual. */
    summary: texto,
  }),
  /** Por que esta técnica importa. O plano mestre pede, e não havia campo. */
  why: texto,
  rules: z.array(objectiveRuleSchema).min(2).max(5),
  /** O quadro do diagrama grande. Padrão: último quadro da primeira cena. */
  frame: frameRefSchema.optional(),
  mastery: texto,
});

/** Etapa 2 — exemplo: lances dos dois lados roteirizados. */
export const exampleStepSchema = z.strictObject({
  move: uciSchema,
  text: texto,
  arrows: z.array(z.tuple([squareSchema, squareSchema])).min(1).optional(),
  highlights: z.array(squareSchema).min(1).optional(),
});

/**
 * Uma fase da cena: o rótulo que aparece enquanto ela dura, e o meio-lance em
 * que começa (1-based; a primeira fase começa sempre em 1). O autoplay **para**
 * antes do primeiro lance de cada fase — é o respiro que separa "cortar" de
 * "aproximar" em vez de derramar trinta lances seguidos no aluno.
 */
export const examplePhaseSchema = z.strictObject({
  title: texto,
  fromStep: z.number().int().min(1),
});

/**
 * Uma cena do exemplo. Uma aula tem de uma a quatro; o desenho que os manuais
 * de iniciante usam é **duas**: "como termina" (posição curta, mate em 3 ou 4)
 * e depois "o caminho inteiro" (a posição de meio de tabuleiro).
 */
export const exampleSceneSchema = z.strictObject({
  id: sceneIdSchema,
  title: texto,
  positionId: positionIdSchema,
  /** O texto que abre a cena, antes do primeiro lance. */
  intro: texto,
  /** Desenhar a caixa do rei durante a cena inteira. */
  showBox: z.boolean().optional(),
  phases: z.array(examplePhaseSchema).min(1).optional(),
  steps: z.array(exampleStepSchema).min(1),
});

export const exampleStageSchema = z.strictObject({
  scenes: z.array(exampleSceneSchema).min(1).max(4),
});

/** Etapa 3 — com ajuda: destaques, dica e retentativa ilimitada. */
export const guidedStageSchema = treeBaseSchema.extend({
  intro: texto.optional(),
  /**
   * Desenhar a caixa do rei enquanto o aluno joga. É a "prática com zona" que
   * o currículo pede para N0 ("caixa/limitação visual -> prática com zona ->
   * mate limpo sem zona"): a etapa 3 mostra a zona, a 4 a retira. A etapa 4
   * **não tem este campo** — o schema é estrito, então pedi-la lá é erro.
   */
  showBox: z.boolean().optional(),
});

/** Etapa 4 — sem ajuda: outra posição, sem dica nem destaque, com teto. */
export const soloStageSchema = treeBaseSchema.extend({
  /** Teto de lances *do aluno*. O gate exige DTM ≤ teto ≤ 50. */
  moveLimit: z.int().min(1).max(50),
});

/** Etapa 5 — prática real contra o Stockfish (F1/B4). */
export const practiceStageSchema = z.strictObject({
  positionId: positionIdSchema,
  goal: z.enum(["win", "draw"]),
  engine: z.strictObject({
    /**
     * Skill Level do Stockfish: 0 (fraquíssimo) a 20 (força total).
     *
     * **Em final de mate forçado, use 20.** Medido em 2026-08-17 na posição de
     * prática desta aula (KRK, defesa perfeita da tablebase = 23 meios-lances),
     * três partidas por nível contra o mesmo atacante:
     *
     * | skill | meios-lances até o mate | % da defesa perfeita |
     * |---|---|---|
     * | 0  | 9, 15, 17  | 59% |
     * | 3  | 7, 11, 11  | 42% |
     * | 6  | 7, 7, 15   | 42% |
     * | 10 | 17, 11, 9  | 54% |
     * | 20 | 21, 23, 21 | **94%** |
     *
     * A lição não é "3 é pouco": é que **abaixo de 20 o Skill Level não dá um
     * defensor mais fraco, dá um defensor aleatório** — 0, 3, 6 e 10 são
     * indistinguíveis dentro do ruído. O mecanismo do Stockfish é escolher às
     * vezes um lance que não é o melhor, e num mate forçado o defensor não tem
     * plano a executar: a única tarefa dele é adiar o mate. Aleatorizar essa
     * única tarefa apaga a resistência inteira e a gradação some junto.
     *
     * O critério é o mesmo que a §3.4 do plano já impõe ao defensor escrito na
     * autoria das etapas 3 e 4 — "não encurtar o mate em mais de 2 lances em
     * relação à defesa perfeita, para o aluno não treinar contra um defensor
     * bobo". Skill 20 cabe nele; skill 3 deixava a etapa 5, que deveria ser o
     * teste mais duro, com o defensor mais fraco da aula.
     *
     * Enfraquecer continua fazendo sentido onde o computador tem plano próprio
     * — uma aula em que o aluno precise *empatar*, por exemplo. Por isso o
     * campo é por aula.
     */
    skill: z.int().min(0).max(20),
    /**
     * Teto de busca por lance. É ele, e não a força, que governa o tempo na
     * tela: a 300 ms o skill 20 responde em 300 ms como o skill 3 respondia.
     */
    moveTimeMs: z.int().min(50).max(5000),
  }),
});

/** Etapa 6 — revisão v0 (§0.2): posições distintas das de ensino. */
export const reviewStageSchema = z.strictObject({
  reviewPositionIds: z.array(positionIdSchema).min(1),
});

export const lessonErrorSchema = z.strictObject({
  /**
   * `off-method` — o lance ganha, mas não é o método da aula.
   * `loses-win` — o lance joga a vitória fora.
   * O gate confere o veredito contra a tablebase.
   */
  verdict: z.enum(["off-method", "loses-win"]),
  text: texto,
});

/**
 * Os textos que o gerador de ramos copia para cada nó derivado, um por classe
 * de lance da técnica (`lib/chess/technique.ts`). São **escritos pelo autor**:
 * o gerador escolhe o lance, nunca a redação.
 *
 * Divergência declarada em relação ao plano da Parte D, que listava a chave
 * `shrink`: a classe que existe de verdade é `other`, e ela cobre o lance de
 * rei que **não** encurta a distância — tomar a oposição, que é metade da
 * técnica. Sem essa chave, o `c6c7` do mate ficaria sem texto.
 */
export const generatedTemplatesSchema = z.strictObject({
  /** Peça maior que encolhe a caixa. */
  cut: texto,
  /** Rei que se aproxima do rei inimigo. */
  approach: texto,
  /** Peça maior que mantém a caixa e o corte — o lance de espera. */
  tempo: texto,
  /** O lance que dá mate. */
  mate: texto,
  /** O resto: tipicamente o rei tomando a oposição. */
  other: texto,
});

/**
 * ID editorial oficial do currículo (ex.: N0-R-MATE). Nunca renumerar.
 *
 * Exportado porque o modo autor (B8) o usa como **trava de travessia de
 * caminho**: o id vem da URL e vira nome de arquivo, e é este regex — o mesmo
 * que o schema já cobra — que impede um `../` de sair da pasta de rascunhos.
 * Duas cópias do regex seriam duas opiniões sobre o que é um id.
 */
export const lessonIdSchema = z
  .string()
  .regex(/^N[0-9]+-[A-Z0-9-]+$/, "id de aula fora do padrão (ex.: N0-R-MATE)");

const lessonBaseSchema = z.strictObject({
  id: lessonIdSchema,
  title: texto,
  orientation: z.enum(["white", "black"]),
  domainCriterion: z.enum(["D1", "D2", "D3", "D4"]),
  /**
   * `draft` é o padrão: aula em construção, pode referenciar `fixture`.
   * `published` é a aula que chega ao aluno — o gate recusa qualquer
   * referência a posição não `approved`.
   */
  status: z.enum(["draft", "published"]).default("draft"),
  errors: z.record(errorIdSchema, lessonErrorSchema),
  fallbacks: z.strictObject({
    winningOffMethod: texto,
    losesWin: texto,
    /** O elogio da etapa 3 quando o lance é a mesma técnica por outro caminho. */
    methodAlternative: texto,
  }),
  /**
   * Textos dos ramos gerados. Opcional aqui porque nem toda aula gera ramo;
   * o gate exige (`TEMPLATE_FALTANDO`) assim que algum ramo é gerado.
   */
  generatedTemplates: generatedTemplatesSchema.optional(),
  /** Nem toda aula tem todas as etapas — cada bloco é opcional. */
  stages: z.strictObject({
    objective: objectiveStageSchema.optional(),
    example: exampleStageSchema.optional(),
    guided: guidedStageSchema.optional(),
    solo: soloStageSchema.optional(),
    practice: practiceStageSchema.optional(),
    review: reviewStageSchema.optional(),
  }),
});

/**
 * O que só se confere olhando a aula inteira. Fica aqui, e não no gate, porque
 * o schema também roda na build (`lib/finais/conteudo.ts`): aula incoerente não
 * chega a virar página.
 *
 * O comprimento de cada cena — se o `step` de um quadro existe mesmo, se a
 * fase começa dentro da linha — é do gate, que já monta os quadros.
 */
export const lessonSchema = lessonBaseSchema.superRefine((lesson, ctx) => {
  const { objective, example } = lesson.stages;

  // A etapa 1 ilustra as regras com quadros da etapa 2: sem exemplo, não há
  // diagrama nenhum para mostrar.
  if (objective && !example) {
    ctx.addIssue({
      code: "custom",
      path: ["stages", "objective"],
      message: "o objetivo aponta quadros do exemplo, então a aula precisa ter a etapa 2",
    });
    return;
  }
  if (!example) return;

  const cenas = new Set<string>();
  for (const [i, cena] of example.scenes.entries()) {
    if (cenas.has(cena.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["stages", "example", "scenes", i, "id"],
        message: `duas cenas com o id "${cena.id}"`,
      });
    }
    cenas.add(cena.id);

    // As fases são a espinha do respiro do autoplay: têm de começar no lance 1
    // e andar para a frente, senão o aluno para no meio de uma ideia.
    for (const [j, fase] of (cena.phases ?? []).entries()) {
      const esperado = j === 0 ? fase.fromStep === 1 : fase.fromStep > (cena.phases as { fromStep: number }[])[j - 1].fromStep;
      if (!esperado) {
        ctx.addIssue({
          code: "custom",
          path: ["stages", "example", "scenes", i, "phases", j, "fromStep"],
          message:
            j === 0
              ? "a primeira fase da cena tem de começar no lance 1"
              : "as fases têm de começar em lances crescentes",
        });
      }
    }
  }

  if (!objective) return;
  const quadros: Array<{ ref: { scene: string }; path: (string | number)[] }> = [];
  if (objective.frame) quadros.push({ ref: objective.frame, path: ["stages", "objective", "frame"] });
  for (const [i, regra] of objective.rules.entries()) {
    if (regra.frame) quadros.push({ ref: regra.frame, path: ["stages", "objective", "rules", i, "frame"] });
  }
  for (const { ref, path } of quadros) {
    if (!cenas.has(ref.scene)) {
      ctx.addIssue({
        code: "custom",
        path: [...path, "scene"],
        message: `o quadro aponta a cena "${ref.scene}", que não existe na etapa 2`,
      });
    }
  }
});

/* ------------------------------------------------------------------ *
 * Tipos do motor — derivados do schema, nunca escritos duas vezes
 * ------------------------------------------------------------------ */

export type Provenance = z.infer<typeof provenanceSchema>;
export type PositionStatus = z.infer<typeof positionStatusSchema>;
export type Position = z.infer<typeof positionSchema>;

export type Reply = z.infer<typeof replySchema>;
export type Expect = z.infer<typeof expectSchema>;
export type Mistake = z.infer<typeof mistakeSchema>;
export type AuthorAlternative = z.infer<typeof authorAlternativeSchema>;
export type TreeNode = z.infer<typeof treeNodeSchema>;
export type FrameRef = z.infer<typeof frameRefSchema>;
export type ObjectiveRule = z.infer<typeof objectiveRuleSchema>;
export type ObjectiveStage = z.infer<typeof objectiveStageSchema>;
export type ExampleStep = z.infer<typeof exampleStepSchema>;
export type ExamplePhase = z.infer<typeof examplePhaseSchema>;
export type ExampleScene = z.infer<typeof exampleSceneSchema>;
export type ExampleStage = z.infer<typeof exampleStageSchema>;
export type GuidedStage = z.infer<typeof guidedStageSchema>;
export type SoloStage = z.infer<typeof soloStageSchema>;
export type PracticeStage = z.infer<typeof practiceStageSchema>;
export type ReviewStage = z.infer<typeof reviewStageSchema>;
export type LessonError = z.infer<typeof lessonErrorSchema>;
export type GeneratedTemplates = z.infer<typeof generatedTemplatesSchema>;
export type Lesson = z.infer<typeof lessonSchema>;

/** Uma árvore de lances, na forma comum à etapa 3 e à etapa 4. */
export type MoveTree = z.infer<typeof treeBaseSchema>;

export type Source = z.infer<typeof sourceSchema>;
export type SourceRegistry = z.infer<typeof sourceRegistrySchema>;
