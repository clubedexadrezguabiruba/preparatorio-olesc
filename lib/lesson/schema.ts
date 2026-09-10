import { Chess } from "chess.js";
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

/** Data em YYYY-MM-DD — o formato que o repositório escreve por toda parte. */
const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato YYYY-MM-DD");

/**
 * **Regime integral** — a obra deixa de ter teto de citação (§1.1 do
 * SOURCE-CORPUS).
 *
 * Existe porque uma decisão editorial pode ser "esta aula inteira segue este
 * livro": o teto de 2 posições por aula e o teto de rotação de livro-base
 * dizem o contrário, e dizem certo — para o corpus normal. O `integral` é a
 * exceção **nomeada, datada e com prazo**, e não `protected: false`: a obra
 * continua protegida (é fato, e a `license` diz), e é justamente por continuar
 * protegida que o gate sabe o que listar em `content/divida-de-licenca.md` no
 * dia da troca.
 *
 * O `replaceBefore` não é enfeite: o gate reprova `REGIME_INTEGRAL_VENCIDO`
 * quando a data passa. Exceção temporária cuja validade nenhum programa mede é
 * exceção permanente com nota de rodapé.
 */
export const integralSchema = z.strictObject({
  /** Quando a decisão foi tomada. */
  since: dataSchema,
  /** Por que — em prosa, para quem ler o `sources.json` daqui a um ano. */
  reason: texto,
  /** Prazo: depois desta data o gate reprova até alguém renovar ou desfazer. */
  replaceBefore: dataSchema,
});

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
const sourceBaseSchema = z.strictObject({
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
  /**
   * Regime integral: sem teto de citação nem de rotação para esta obra
   * (§1.1 do SOURCE-CORPUS). Ausente = regime normal, que é o caso de todas
   * as outras obras do registro.
   */
  integral: integralSchema.optional(),
});

export const sourceSchema = sourceBaseSchema.superRefine((source, ctx) => {
  if (!source.integral) return;
  // Obra em domínio público não tem teto para desligar: declarar `integral`
  // ali é ruído que o inventário da dívida repetiria para sempre.
  if (!source.protected) {
    ctx.addIssue({
      code: "custom",
      path: ["integral"],
      message:
        "regime integral só faz sentido em obra protegida — sem teto de citação não há o que desligar",
    });
  }
  // O regime desliga as **duas** regras, e uma delas (FONTE_DIDATICA_DOMINA)
  // só existe para livro-base. Obra que não é didática nunca seria contada
  // ali, e o `integral` estaria prometendo mais do que a obra pode usar.
  if (!source.didactic) {
    ctx.addIssue({
      code: "custom",
      path: ["integral"],
      message:
        "regime integral é para livro-base: marque `didactic: true` ou tire o `integral`",
    });
  }
  if (source.integral.replaceBefore <= source.integral.since) {
    ctx.addIssue({
      code: "custom",
      path: ["integral", "replaceBefore"],
      message: `o prazo (${source.integral.replaceBefore}) precisa ser posterior ao início (${source.integral.since})`,
    });
  }
});

export const sourceRegistrySchema = z.strictObject({
  _leia: texto,
  sources: z.array(sourceSchema).min(1),
});

/**
 * Quantas posições de uma mesma obra protegida uma aula pode usar (§12.7).
 *
 * Dormente desde 2026-09-08: uma aula do formato de três etapas usa **uma**
 * posição, então o teto nunca é atingido. O comentário longo, com o que passou
 * a proteger o módulo no lugar dele, está no bloco que o consome em
 * `scripts/validate-content.ts` e na §1.2 de `docs/SOURCE-CORPUS.md`.
 */
export const PROTECTED_SOURCE_CAP = 2;

/* ------------------------------------------------------------------ *
 * Camada 2 — aula
 * ------------------------------------------------------------------ */

/**
 * O objetivo de uma árvore de lances (FN1/B2).
 *
 * Até aqui o motor só sabia uma coisa: ganhar. Isso bastava para os dois mates
 * da N0 e deixava de fora metade dos finais que o curso vai ensinar — Filidor
 * é empate, e o aluno que "não perde" acertou a aula. Como o campo nasce com
 * `.default("win")`, nenhum arquivo já escrito muda um byte: quem não fala do
 * objetivo continua ensinando a ganhar.
 */
export const treeGoalSchema = z.enum(["win", "draw"]);

/**
 * Como a linha acaba, no lance que encerra a árvore.
 *
 * Antes havia uma resposta só, implícita e não escrita: **mate**. O gate cobrava
 * `TERMINAL_SEM_MATE` de todo lance sem resposta do defensor, e por isso Lucena
 * — que termina em promoção, com a partida bem viva — não cabia no formato.
 *
 * | valor | o que o autor está afirmando |
 * |---|---|
 * | `mate` | o lance dá xeque-mate (o padrão, e o que a N0 sempre fez) |
 * | `promotion` | o lance promove, e daí para a frente é técnica já aprendida |
 * | `draw-secured` | a posição resultante é empate pela tablebase: o aluno segurou |
 * | `tablebase-win` | a posição resultante é ganha e o mate cabe em 40 lances |
 *
 * O gate confere cada uma dessas afirmações contra a tablebase — nenhuma delas
 * é palavra do autor (§7.3 do plano).
 */
export const endsSchema = z.enum(["mate", "promotion", "draw-secured", "tablebase-win"]);

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
    /**
     * Como a linha acaba — **só no lance terminal** (FN1/B2). Ausente quer
     * dizer `"mate"`, que é o que toda aula escrita até aqui afirma sem
     * escrever. Num expect que tem resposta do defensor o campo é proibido: a
     * linha não acaba ali, e dizer como ela acaba seria mentira no arquivo.
     */
    ends: endsSchema.optional(),
    feedback: texto,
    /**
     * Escrito pelo gerador de ramos equivalentes, **nunca à mão**: marca o que
     * o `validate:content --write` derivou e vai regravar na próxima rodada.
     */
    generated: z.literal(true).optional(),
  })
  .superRefine((e, ctx) => {
    // `ends` descreve o fim da linha. Num expect que continua — com `reply` ou
    // com `replies` — não há fim para descrever, e o campo passaria batido pelo
    // gate (que só olha `ends` no terminal) sem nunca ser conferido.
    if (e.ends !== undefined && (e.reply !== undefined || e.replies !== undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["ends"],
        message: "`ends` só existe no lance terminal: um expect com resposta do defensor não acaba a linha",
      });
    }
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
  /**
   * A fala do professor neste nó. Era uma caixa escondida atrás de um botão
   * "Ver a dica"; virou o que o `FeedbackPanel` diz enquanto o aluno pensa,
   * ao lado do retrato. Ver `TreeStage` e `docs/VOZ-DO-CURSO.md` §6.2.
   */
  hint: texto.optional(),
  /**
   * **A flecha do nó. A aula publicada precisa dela ou de uma casa acesa** (a
   * `superRefine` do `lessonSchema` cobra as duas juntas, uma basta).
   *
   * **Nem ela nem o `highlights` se escrevem aqui**: o nó é derivado do
   * roteiro, e o desenho dele mora em `objective.roteiro[…].treino`.
   *
   * Ela aponta o **alvo**, nunca o lance: a casa que importa, a intenção do rei
   * inimigo, a casa de promoção que o peão persegue. Seta que liga a origem ao
   * destino do lance certo é meio lance entregue, e isso é responder pelo
   * aluno em vez de ensiná-lo a olhar.
   *
   * É julgamento editorial por nó, e não sai da tablebase: nenhuma máquina diz
   * o que "o alvo" é. Toda flecha deste módulo passa pela conferência do Doug
   * no tabuleiro, como a §10 da `TRILHA-FINAIS.md` já manda para toda posição
   * vinda de diagrama.
   */
  arrows: z.array(z.tuple([squareSchema, squareSchema])).min(1).optional(),
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
   * Todos os lances legais do nó que preservam o **objetivo da árvore** — a
   * vitória quando `goal` é `"win"`, o empate quando é `"draw"`.
   * **Gerado pelo validador a partir da tablebase — nunca escrito à mão.**
   *
   * O nome não mudou junto com o sentido (FN1/B2, §7.2 do plano): ele é lido
   * por oito lugares e escrito em todo arquivo de aula, e renomear um campo de
   * dado para melhorar uma palavra reescreveria o corpus inteiro sem trocar
   * nenhum lance de lugar.
   */
  winningMoves: z.array(uciSchema),
  /** Nó inteiro derivado pelo gerador de ramos. Nunca escrito à mão. */
  generated: z.literal(true).optional(),
});

const treeBaseSchema = z.strictObject({
  positionId: positionIdSchema,
  root: nodeIdSchema,
  /**
   * O que a árvore pede do aluno (FN1/B2). `win` é o padrão e o que os dois
   * mates da N0 sempre foram; `draw` é a metade do curso que ainda não cabia —
   * Filidor, o peão de torre, os bispos de cores opostas.
   *
   * O default é o que mantém os arquivos já escritos intactos: o campo entra no
   * tipo, não no JSON. E o gate confere a coerência com a posição da raiz
   * (`OBJETIVO_INCOERENTE`): prometer empate onde a tablebase dá vitória é
   * ensinar o aluno a se contentar com menos.
   */
  goal: treeGoalSchema.default("win"),
  nodes: z.record(nodeIdSchema, treeNodeSchema),
});

/**
 * O que se desenha por cima de um tabuleiro parado: setas e casas acesas.
 *
 * Os dois campos já existiam, palavra por palavra, dentro de cada passo da
 * cena do exemplo. Eles subiram a peça própria em 2026-09-08, quando a etapa 1
 * passou a ser **estática**: ela desenha sobre uma posição sua, e não sobre um
 * quadro emprestado de uma animação que deixou de existir.
 */
export const desenhoSchema = z.strictObject({
  arrows: z.array(z.tuple([squareSchema, squareSchema])).min(1).optional(),
  highlights: z.array(squareSchema).min(1).optional(),
});

/**
 * Um passo do roteiro da etapa 1: **uma fala, e o que acontece enquanto ela é
 * dita**.
 *
 * Ele substitui a `objectiveRuleSchema` — a "regra numerada" que os manuais de
 * iniciante escrevem antes de mostrar lance nenhum. A regra desenhava sobre uma
 * posição parada e o aluno clicava de uma para outra; nove blocos de texto
 * chegavam à tela de uma vez e a lista rolava por dentro. Para um aluno de 11
 * anos e 600 pontos aquilo era um manual, não uma aula (ver `ObjectiveStage`).
 *
 * O passo é a mesma informação servida em fatias: a fala é obrigatória, o lance
 * é opcional, e as duas coisas acontecem juntas — o professor diz o que vai
 * fazer no instante em que a peça se move.
 *
 * **Os campos de desenho continuam sendo `arrows` e `highlights`**, e isto é uma
 * divergência declarada em relação ao plano, que os chamava de `setas` e
 * `acende`. O motivo é que `desenhoSchema` já existe com esses nomes, já é lido
 * por `desenhoDaAutoria` e já é o vocabulário de desenho do nó da árvore: dois
 * nomes para a mesma seta seriam duas opiniões sobre o que é uma seta. Os
 * campos **novos** ficam em português, que é a língua de quem escreve as outras
 * 48 aulas.
 */
/**
 * Um passo da **apresentação** — a etapa 1.
 *
 * A apresentação é o professor dizendo o que está em jogo antes de qualquer
 * peça se mexer: se ganha ou se empata, e qual é a técnica. Um diagrama e uma
 * fala curta, sem rolagem, e **quem avança é o aluno** — a etapa não tem
 * relógio, tem seta.
 *
 * **A FEN é livre, e não vira posição de `content/positions/`.** É a única
 * exceção da casa, e ela é deliberada: o passo que diz "estas peças dão mate"
 * precisa mostrar peças que não estão na posição da aula, às vezes mais de
 * sete delas, e ninguém joga ali. O preço é que essas FEN **não têm
 * proveniência** e nenhuma máquina a cobra.
 *
 * A regra que fecha o buraco é escrita, e está na §7 de `docs/VOZ-DO-CURSO.md`:
 * se um diagrama de apresentação vier **de um livro**, ele deixa de ser
 * ilustração e vira posição — arquivo próprio, com os 9 campos de proveniência.
 * O que existe para cobrá-la é o olho.
 */
export const introPassoSchema = desenhoSchema.extend({
  /** O que o professor diz neste passo. */
  fala: texto,
  /**
   * O diagrama deste passo. **Ausente = a posição da aula**, que é o caso
   * comum: a apresentação normalmente fala da posição que o aluno vai jogar.
   */
  fen: fenSchema.optional(),
});

/**
 * Etapa 1 — **a apresentação**: o professor diz o objetivo, e o aluno avança.
 *
 * O piso é 2 porque um passo só é cartão de título, não apresentação — quem não
 * tem o que dizer omite `stages.intro` inteiro, e isso é uma escolha, não um
 * arquivo pela metade.
 *
 * O teto é 6 porque cada passo é um clique que o aluno dá **antes** de ver
 * qualquer peça se mexer. Sete cliques até a primeira peça andar é um manual
 * com botão de "próximo", que é exatamente o que a etapa 2 deixou de ser.
 */
export const introStageSchema = z.strictObject({
  passos: z.array(introPassoSchema).min(2).max(6),
});

/**
 * **O que o autor escreve para a etapa 3, dentro do passo da etapa 2.**
 *
 * A etapa 3 deixou de ser escrita e passou a ser **derivada** do roteiro
 * (`lib/lesson/derivar-treino.ts`). O projeto já exigia, em teste, que a linha
 * da aula e a linha do treino fossem a MESMA — "o que a etapa 1 mostra e o que
 * a etapa 2 pede têm de ser a MESMA linha", `roteiro.test.ts`. Sendo a mesma,
 * escrevê-la duas vezes era copiar à mão o que a máquina sabe derivar, e era o
 * que fazia a etapa custar 6 a 8 horas por aula.
 *
 * O que a máquina **não** sabe é o que este bloco carrega: para onde apontar a
 * flecha antes do lance, o que dizer enquanto o aluno pensa, quais erros têm
 * nome. Ele é lido **só quando aquele passo vira nó do aluno** — passo do
 * defensor, ou passo sem lance, não tem nó, e escrever `treino` ali é erro
 * (`TREINO_SEM_NO`).
 *
 * **O desenho daqui não é o desenho do passo, e isso é a decisão inteira.** O
 * `arrows`/`highlights` do passo acompanha o lance *acontecendo*, na aula
 * assistida; o daqui aponta o **alvo** *antes* de o aluno mexer. Na N1-KPK a
 * seta do nó `n1` é `e7→c8` — a ideia do passo que só aponta —, e não a do
 * passo seguinte, que carrega `c6c7`. Herdar um do outro entregaria o lance.
 */
export const passoTreinoSchema = desenhoSchema.extend({
  /**
   * O que o professor diz enquanto o aluno pensa (vira `hint` do nó).
   *
   * **Não é a fala do passo.** A fala entrega o lance — "o rei branco vai a
   * c7" —, e no treino isso é responder pelo aluno.
   */
  dica: texto.optional(),
  /**
   * O que o aluno lê ao acertar (vira o `feedback` do expect).
   *
   * Ausente, o gerador costura a fala deste passo com a do passo do defensor —
   * que é literalmente o que a N1-KPK fez à mão, um passo de cada vez.
   */
  feedback: texto.optional(),
  /** Os erros nomeados deste nó (vira `mistakes`). */
  erros: z.array(mistakeSchema).min(1).optional(),
  /** Os lances que a autoria declara válidos (vira `authorAlternatives`). */
  alternativas: z.array(authorAlternativeSchema).min(1).optional(),
});

export const roteiroPassoSchema = desenhoSchema.extend({
  /** O que o professor diz neste passo. Uma ideia, uma fala (VOZ-DO-CURSO §3.3). */
  fala: texto,
  /**
   * O lance que a peça faz enquanto a fala é dita, em UCI. Opcional: o passo
   * que só aponta — "o rei preto quer entrar aqui" — não move nada.
   *
   * A `lessonSchema.superRefine` encadeia todos eles a partir da posição da
   * aula e recusa o arquivo em que um não for legal.
   */
  lance: uciSchema.optional(),
  /**
   * Pausa extra depois da fala, em ms, para o passo que precisa de mais tempo
   * na tela. O relógio normal já é proporcional ao tamanho da fala; isto é o
   * ajuste fino que o autor pede quando a posição precisa ser olhada.
   */
  espera: z.int().min(0).max(4000).optional(),
  /**
   * O que a etapa 3 precisa e a máquina não deriva — flecha do alvo, dica,
   * texto do acerto, erros nomeados. Ver `passoTreinoSchema`.
   *
   * Só faz sentido no passo cujo `lance` é do lado do aluno: é ele que vira nó.
   * O gate recusa o bloco em qualquer outro passo (`TREINO_SEM_NO`).
   */
  treino: passoTreinoSchema.optional(),
});

/**
 * Etapa 1 — **a aula assistida**: as peças se movem, as flechas aparecem, e um
 * comentário por vez muda junto com a posição.
 *
 * ## O que ela era, e por que mudou
 *
 * Ela era um documento: nome da técnica, resumo, um "por quê", três regras
 * numeradas com título e parágrafo, três perigos e o "o que conta como
 * aprendida" — nove blocos de texto na mesma tela, ~400 palavras simultâneas, e
 * uma lista que rolava por dentro para caber. O tabuleiro ficava parado o tempo
 * todo.
 *
 * Isto **reverte por escrito** a decisão de 2026-09-08 que tirou a animação do
 * formato. A perda estava declarada ali mesmo — "o aluno deixa de ver a técnica
 * demonstrada em animação... para um aluno de 600 é o degrau mais íngreme do
 * plano" —, e é essa perda que o roteiro devolve. A demonstração volta, não como
 * etapa separada, mas **dentro da etapa 1**.
 *
 * ## Os quatro campos que saíram, e para onde cada um foi
 *
 * - `why` e as `rules` **viraram falas do roteiro**, ditas no momento em que a
 *   peça se move, que é quando fazem sentido;
 * - os `dangers` já existem em `errors` e chegam ao aluno **na hora em que ele
 *   comete o erro**, na etapa 2. Aviso lido antes de jogar não vira
 *   comportamento (VOZ-DO-CURSO §5.4);
 * - o `mastery` era texto de sistema, não de aula. Quem o diz é o `MasterySeal`
 *   da etapa 3, onde ele importa.
 *
 * O que sobra é o que a etapa precisa: de onde a posição veio, qual é ela, o
 * nome da técnica, e o roteiro.
 */
export const objectiveStageSchema = z.strictObject({
  /** Slug da obra-base didática (`didactic: true` no registro de obras). */
  source: z.string().regex(/^[a-z0-9-]+$/, "source deve ser o slug de uma obra"),
  /**
   * A posição de onde o roteiro parte — e ela é **a mesma** das etapas 2 e 3.
   *
   * Não gasta teto de citação novo justamente por ser a mesma: uma aula, uma
   * posição, três etapas. O roteiro anda a partir dela e volta a ela quando o
   * aluno pede "ver de novo".
   */
  positionId: positionIdSchema,
  technique: z.strictObject({
    /** O nome da técnica, na voz do curso ("o rei escolta, o peão anda atrás"). */
    name: texto,
    /** Uma linha que resume a ideia — o "slogan" do manual. */
    summary: texto,
  }),
  /**
   * A aula, passo a passo — **um passo, um lance, uma fala**.
   *
   * O meio-lance do defensor tem passo próprio em vez de vir de carona no do
   * atacante: "o preto corre atrás e chega tarde" é uma ideia, e ideia é o que
   * define uma fala (`docs/VOZ-DO-CURSO.md` §3.3). A KPK do piloto gasta 13
   * passos assim — 11 meios-lances e dois passos de abertura, que só apontam.
   *
   * **Os dois números deixaram de ser régua.** O teto de 14 era o do relógio —
   * a faixa de 40 a 70 segundos que a `/revisar-aula` cobrava —, e essa faixa
   * saiu da régua a pedido do Doug em 2026-09-09: a aula dura o que precisar. O
   * 24 que ficou no lugar não mede nada; é freio contra arquivo descontrolado,
   * e o piso de 2 é o mínimo para haver um lance e uma fala sobre ele.
   *
   * A conta de `lib/lesson/roteiro.ts` continua valendo e continua sendo
   * impressa: ela é o relógio da TELA — quanto tempo cada fala fica lá. O que
   * saiu foi o julgamento sobre o total.
   */
  roteiro: z.array(roteiroPassoSchema).min(2).max(24),
  /**
   * O que é da etapa 3 **inteira**, e não de um passo dela.
   *
   * A etapa é derivada do roteiro, então ela não tem arquivo próprio onde
   * escrever a fala de abertura nem pedir a caixa. Estes dois campos são a
   * porta — e são só estes dois: tudo o mais que a etapa 3 tem sai do roteiro
   * ou do bloco `treino` de um passo.
   */
  treino: z
    .strictObject({
      /** A fala de abertura da etapa 3 (vira `guided.intro`). */
      intro: texto.optional(),
      /** Desenhar a caixa do rei enquanto o aluno joga (vira `guided.showBox`). */
      showBox: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Etapa 3 — com ajuda: destaques, dica e retentativa ilimitada.
 *
 * ## **Esta etapa é SAÍDA, não entrada.**
 *
 * O contrato, em uma frase: apague `stages.guided` do arquivo, rode
 * `npm run validate:content -- --refresh-cache --write`, e ele volta byte por
 * byte. Quem a escreve é `lib/lesson/derivar-treino.ts`, a partir do roteiro da
 * etapa 2 e dos blocos `treino` dos passos dela.
 *
 * Nunca há merge entre campo de autor e campo de gerador dentro do mesmo
 * objeto — a armadilha que `stripGeneratedFrom` já documenta em
 * `scripts/validate-content.ts`: o campo do autor apagado em silêncio, e o
 * autor descobrindo pelo aluno. Aqui a divisão é por **arquivo inteiro**: tudo
 * dentro de `guided` é derivado, e o que o autor tem a dizer sobre a etapa 3
 * ele diz em `objective.roteiro[i].treino` e em `objective.treino`.
 *
 * Os campos continuam declarados aqui porque o schema também roda na build
 * (`lib/finais/conteudo.ts`) e no navegador: o que chega ao aluno é o arquivo
 * gravado, e ele é conferido como qualquer outro.
 */
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



/**
 * A classe de força a que a aula pertence (`docs/TRILHA-FINAIS.md` §1). São as
 * classes da USCF — E até 1199, D 1200–1399, C 1400–1599, B 1600–1799 —, e não
 * invenção de autor nenhum.
 *
 * Fica **separada do id** porque o id é o do currículo (`N0-`…`N5-`) e as duas
 * aulas prontas já o usam: renomeá-las para `E-…` invalidaria as posições e os
 * 106 arquivos de cache da tablebase.
 */
export const lessonClassSchema = z.enum(["E", "D", "C", "B"]);

const lessonBaseSchema = z.strictObject({
  id: lessonIdSchema,
  title: texto,
  /**
   * Opcional no schema, **obrigatória para publicar** (a `superRefine` abaixo).
   * Não é frouxidão: a regra de rotação de livros da §4 da trilha conta aulas
   * *publicadas* por classe, e uma aula em rascunho ainda não escolheu a sua.
   * Publicar sem classe deixaria a aula fora da conta e a rotação cega.
   */
  class: lessonClassSchema.optional(),
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
  /**
   * **Quatro etapas, numa posição só** (decisão do Doug em 2026-09-09).
   *
   * `intro` é a apresentação: o professor diz o que está em jogo — se ganha, se
   * empata, qual é a técnica —, num diagrama e uma fala curta por vez, e **quem
   * avança é o aluno**. É a única etapa que pode trocar de posição entre um
   * passo e outro, em FEN livre, porque o que ela mostra é ilustração e
   * ninguém joga nela.
   *
   * `objective` é a aula: o roteiro toca sozinho sobre a posição, um comentário
   * por vez, e o aluno assiste.
   * `guided` é a mesma posição jogada, com flecha sempre na tela e a dica dita
   * pelo professor.
   * `practice` é a mesma posição contra a máquina, nua, e vencer é o que conta.
   *
   * Saíram três: `example` (a animação, que virou o roteiro da etapa 1),
   * `solo` (a árvore sem ajuda — a partida contra a máquina faz o papel) e
   * `review` (a fila de posições novas — quem revisa agora é a escada de
   * `lib/finais/`, em dias espaçados, na MESMA posição).
   *
   * **A perda declarada em 2026-09-08 foi revertida em 2026-09-08.** Ela dizia:
   * "o aluno deixa de ver a técnica demonstrada em animação... para um aluno de
   * 600 é o degrau mais íngreme do plano". O degrau era real, e a demonstração
   * voltou — dentro da etapa 1, e não como etapa própria. O que **não** voltou é
   * assistir no lugar de jogar: as etapas 2 e 3 continuam sendo jogadas com a
   * mão (ver `docs/VOZ-DO-CURSO.md` §6.1).
   *
   * **A etapa 3 deixou de ser escrita e passou a ser derivada da etapa 2**
   * (ver `guidedStageSchema`). É essa mudança que torna as quatro etapas
   * possíveis nas 49 aulas: a etapa cara de escrever era a árvore, e ela agora
   * sai do roteiro mais os blocos `treino` dos passos dele.
   *
   * Cada bloco continua opcional, e a ausência de um é **exceção declarada por
   * escrito no arquivo da aula** — não um formato à parte. Os formatos
   * `completa`/`curta`/`leitura` da trilha saíram em 2026-09-09: um formato só.
   */
  /**
   * **Por que esta aula não tem uma das quatro etapas.**
   *
   * Substitui os formatos `completa`/`curta`/`leitura` da trilha, que saíram em
   * 9/9/2026. Eles eram três desenhos de aula concorrendo, e o segundo — 39 das
   * 49 — existia por um motivo que deixou de valer: *"a etapa cara de escrever
   * é a árvore… quarenta e nove aulas completas não cabem no prazo"*. A árvore
   * deixou de ser escrita (ver `guidedStageSchema`), e com ela o motivo.
   *
   * O que fica no lugar é **um formato só, e a exceção por escrito**: a aula
   * publicada tem as quatro etapas, ou diz aqui, com o nome da etapa e uma
   * frase, qual falta e por quê. A diferença não é de rigor, é de quem
   * responde: um formato é uma gaveta em que a aula cai; uma frase é alguém
   * afirmando alguma coisa sobre aquela aula.
   *
   * A chave é o nome da etapa; o valor é o motivo, lido por gente.
   *
   * **Objeto de quatro campos opcionais, e não `z.record` com chave de enum**:
   * no Zod 4 o record de enum é *exaustivo* — declarar uma ausência obrigaria a
   * declarar as quatro, e a aula a que só falta a apresentação teria de mentir
   * sobre as outras três.
   */
  etapasAusentes: z
    .strictObject({
      intro: texto.optional(),
      objective: texto.optional(),
      guided: texto.optional(),
      practice: texto.optional(),
    })
    .optional(),
  /**
   * O carimbo do modo editor: esta aula foi adaptada pelo professor na tela.
   *
   * **Só o professor vê isto**, e ele o vê na bancada, nunca dentro da aula. A
   * voz da casa (`docs/VOZ-DO-CURSO.md`) é a de um professor que não fala do
   * sistema: um aviso de "aula adaptada" no palco seria o curso comentando a
   * si mesmo na frente da criança de 11 anos. O aluno abre a aula editada
   * exatamente como abre qualquer outra.
   *
   * Mora no arquivo, e não num banco, porque é do conteúdo: quem lê o JSON
   * daqui a um ano precisa saber que aquela fala saiu da tela e não do livro.
   * `nota` é livre e opcional — o Doug escreve nela quando quer lembrar por
   * que mexeu.
   */
  professor: z
    .strictObject({
      /** Data ISO da última adaptação pela tela. */
      adaptouEm: z.string(),
      nota: texto.optional(),
    })
    .optional(),
  stages: z.strictObject({
    intro: introStageSchema.optional(),
    objective: objectiveStageSchema.optional(),
    guided: guidedStageSchema.optional(),
    practice: practiceStageSchema.optional(),
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
  // A rotação de livros-base (§4 da trilha) é contada por classe, sobre as
  // aulas publicadas. Publicar sem declarar a classe é sair da conta.
  if (lesson.status === "published" && lesson.class === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["class"],
      message:
        'aula publicada precisa declarar a classe ("E", "D", "C" ou "B") — ' +
        "é por ela que a rotação de livros-base é contada",
    });
  }

  // **A trava que exigia a etapa 2 saiu com ela.** O objetivo apontava quadros
  // da animação, então uma aula com objetivo e sem exemplo era incoerente. No
  // formato de três etapas o objetivo tem posição própria e desenha nela, e
  // nada mais precisa existir para ele fazer sentido.
  //
  // Sobra uma coerência nova, e é a que dá nome ao formato: **da aula em diante,
  // todas as etapas jogam a MESMA posição**. Sem isto, "uma posição só" seria
  // promessa de prosa; aqui é recusa do arquivo.
  //
  // **A apresentação é a exceção, e ela nem chega neste laço.** Ela não tem
  // `positionId`: os diagramas dela são FEN livre, escrita no próprio arquivo
  // da aula. É de propósito — o passo que diz "estas peças dão mate" precisa
  // mostrar peças que não estão na posição da aula, e às vezes mais de sete
  // delas. O preço é que a proveniência daqueles diagramas não tem defesa
  // mecânica; a regra escrita está na §7 de `docs/VOZ-DO-CURSO.md`, e quem a
  // cobra é o olho.
  const { objective, guided, practice } = lesson.stages;
  const posicoes: Array<[string, string]> = [];
  if (objective) posicoes.push(["objective", objective.positionId]);
  if (guided) posicoes.push(["guided", guided.positionId]);
  if (practice) posicoes.push(["practice", practice.positionId]);
  const primeira = posicoes[0];
  if (primeira) {
    for (const [etapa, id] of posicoes.slice(1)) {
      if (id === primeira[1]) continue;
      ctx.addIssue({
        code: "custom",
        path: ["stages", etapa, "positionId"],
        message:
          `a etapa "${etapa}" joga "${id}" e a etapa "${primeira[0]}" joga "${primeira[1]}" — ` +
          "da aula em diante, as etapas de uma aula de finais são a MESMA posição " +
          "(a apresentação é a exceção: ela desenha em FEN livre)",
      });
    }
  }

  /*
   * **A aula publicada tem as quatro etapas, ou declara qual falta.**
   *
   * É o que substituiu os três formatos da trilha (ver `etapasAusentes`). A
   * trava é sobre a aula **publicada** porque rascunho é aula em construção: a
   * etapa que ainda não foi escrita não é uma etapa que falta, é uma etapa que
   * está sendo escrita.
   *
   * A segunda metade da trava é a que impede a declaração de virar formalidade:
   * declarar ausente uma etapa **que existe** é uma frase que o arquivo
   * desmente, e ninguém a leria de novo para conferir.
   */
  {
    const ETAPAS = ["intro", "objective", "guided", "practice"] as const;
    const ausentes = lesson.etapasAusentes ?? {};
    for (const etapa of ETAPAS) {
      const existe = lesson.stages[etapa] !== undefined;
      const declarada = ausentes[etapa] !== undefined;
      // Declarar ausente o que está no arquivo é uma frase que o arquivo
      // desmente, e vale para as quatro — inclusive para a derivada.
      if (existe && declarada) {
        ctx.addIssue({
          code: "custom",
          path: ["etapasAusentes", etapa],
          message:
            `a aula declara que não tem a etapa "${etapa}" e ela está em stages — ` +
            "apague a declaração ou apague a etapa, nunca as duas",
        });
      }
      /*
       * **`guided` é SAÍDA, e por isso não se cobra dele o mesmo.**
       *
       * Onde há `objective` há roteiro, e onde há roteiro a etapa 3 é derivada
       * dele (`lib/lesson/derivar-treino.ts`): um arquivo sem `guided` ali não
       * é uma aula a que falta o treino, é um arquivo que ainda não passou pelo
       * `--write`. Cobrá-lo aqui trancava a porta pela qual ele se conserta — a
       * aula era recusada no schema, sumia da carga do gate, e a derivação, que
       * é a única coisa capaz de escrevê-la, nunca chegava a rodar. Era o
       * contrato de `guidedStageSchema` — *apague, rode `--write`, e ele volta
       * byte por byte* — virando mentira.
       *
       * Quem cobra a etapa 3 ausente é o gate, e com o código certo:
       * `TREINO_DESATUALIZADO`, "o roteiro da aula produz uma etapa 3 e o
       * arquivo não tem nenhuma". Aula publicada **sem** `objective` continua
       * tendo de declarar a ausência do treino, porque aí não há de onde
       * derivá-lo.
       */
      if (
        lesson.status === "published" &&
        !existe &&
        !declarada &&
        !(etapa === "guided" && lesson.stages.objective !== undefined)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["stages", etapa],
          message:
            `a aula publicada não tem a etapa "${etapa}" e não diz por quê — ` +
            "um formato só, quatro etapas, e a ausência se escreve em `etapasAusentes`",
        });
      }
    }
  }

  /*
   * **A flecha da etapa 2 é obrigatória na aula publicada.**
   *
   * O aquecimento em que a criança trava não aquece nada. Até 2026-09-08 a
   * ajuda desta etapa vivia atrás de um botão "Ver a dica" — era a §A4 do
   * `REFERENCIA-MOVE-TRAINER.md`, "a dica é pedida, não concedida", medida no
   * chess.com. O que o chess.com faz é dar a dica sob demanda a um **adulto que
   * escolheu treinar**; a nossa etapa 2 é aquecimento declarado, e quem afere é
   * a etapa 3, que continua nua. O precedente revogado está reescrito na §6.2
   * de `docs/VOZ-DO-CURSO.md`.
   *
   * Só na aula **publicada**: o rascunho é aula em construção, e exigir a
   * flecha antes de a linha existir mandaria o autor desenhar sobre nada.
   */
  if (lesson.status === "published" && guided) {
    for (const [nodeId, node] of Object.entries(guided.nodes)) {
      if (node.arrows?.length || node.highlights?.length) continue;
      ctx.addIssue({
        code: "custom",
        path: ["stages", "guided", "nodes", nodeId, "arrows"],
        message:
          `o nó "${nodeId}" do treino não tem flecha nem casa acesa — a aula publicada ` +
          "precisa de uma das duas, e ela aponta o ALVO do lance, nunca o lance. " +
          `Conserta-se em \`stages.objective.roteiro[…].treino.arrows\` (ou \`.highlights\`) — ` +
          "o nó é derivado do roteiro, e não se edita aqui",
      });
    }
  }

  /*
   * **A trava que dá sentido ao roteiro: ele tem de fechar no tabuleiro.**
   *
   * A etapa 1 deixou de ser texto sobre um diagrama parado e virou uma linha
   * que TOCA — as peças andam de verdade. Um `lance` que não é legal na posição
   * em que chega não é erro de redação: é a demonstração travando no meio, na
   * tela do aluno. Roteiro que não fecha é arquivo recusado, não bug em
   * produção.
   *
   * **De onde vem a posição de partida, e o que esta trava passou a valer.** O
   * schema não lê `content/positions/` — ele recebe uma aula, não o
   * repositório —, então o ponto de partida é a FEN do nó raiz do treino.
   *
   * Com o treino **derivado** do roteiro, essa FEN saiu do próprio roteiro: a
   * trava deixou de ser conferência de duas fontes e virou **conferência de
   * coerência interna do arquivo** — o roteiro fecha a partir da raiz que ele
   * mesmo produziu. Ela continua valendo a pena por dois motivos: ela roda na
   * build e no navegador, onde o gate não roda, e ela pega o arquivo editado à
   * mão depois de gravado. Quem confere de verdade, contra a posição de
   * verdade, passou a ser o gate — `ROTEIRO_ILEGAL` em
   * `scripts/validate-content.ts`, o buraco que este comentário prometia e que
   * até 2026-09-09 não existia.
   *
   * A chess.js entra neste arquivo só para isto, e só aplica o que está escrito.
   * Quem julga se um lance é BOM continua sendo a tablebase, na autoria.
   */
  const roteiro = objective?.roteiro;
  const partida = guided ? guided.nodes[guided.root]?.fen : undefined;
  if (roteiro && partida) {
    const game = new Chess();
    try {
      game.load(partida);
    } catch {
      // FEN da raiz malformada já é reprovada pelo `fenSchema` do nó; não vale
      // acusar duas vezes a mesma coisa em nome de campos diferentes.
      return;
    }
    for (const [i, passo] of roteiro.entries()) {
      if (!passo.lance) continue;
      try {
        game.move({
          from: passo.lance.slice(0, 2),
          to: passo.lance.slice(2, 4),
          promotion: passo.lance.length > 4 ? passo.lance.slice(4) : undefined,
        });
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["stages", "objective", "roteiro", i, "lance"],
          message:
            `"${passo.lance}" não é legal em "${game.fen()}" — o roteiro da etapa 1 ` +
            "é encadeado a partir da posição da aula, e ele parou aqui",
        });
        return;
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 * Tipos do motor — derivados do schema, nunca escritos duas vezes
 * ------------------------------------------------------------------ */

export type Provenance = z.infer<typeof provenanceSchema>;
export type PositionStatus = z.infer<typeof positionStatusSchema>;
export type Position = z.infer<typeof positionSchema>;

export type TreeGoal = z.infer<typeof treeGoalSchema>;
export type TerminalEnd = z.infer<typeof endsSchema>;
export type LessonClass = z.infer<typeof lessonClassSchema>;
export type Reply = z.infer<typeof replySchema>;
export type Expect = z.infer<typeof expectSchema>;
export type Mistake = z.infer<typeof mistakeSchema>;
export type AuthorAlternative = z.infer<typeof authorAlternativeSchema>;
export type TreeNode = z.infer<typeof treeNodeSchema>;
export type Desenho = z.infer<typeof desenhoSchema>;
export type IntroPasso = z.infer<typeof introPassoSchema>;
export type IntroStage = z.infer<typeof introStageSchema>;
export type PassoTreino = z.infer<typeof passoTreinoSchema>;
export type RoteiroPasso = z.infer<typeof roteiroPassoSchema>;
export type ObjectiveStage = z.infer<typeof objectiveStageSchema>;
export type GuidedStage = z.infer<typeof guidedStageSchema>;
export type PracticeStage = z.infer<typeof practiceStageSchema>;
export type LessonError = z.infer<typeof lessonErrorSchema>;
export type GeneratedTemplates = z.infer<typeof generatedTemplatesSchema>;
export type Lesson = z.infer<typeof lessonSchema>;

/** Uma árvore de lances, na forma comum à etapa 3 e à etapa 4. */
export type MoveTree = z.infer<typeof treeBaseSchema>;

export type Source = z.infer<typeof sourceSchema>;
export type Integral = z.infer<typeof integralSchema>;
export type SourceRegistry = z.infer<typeof sourceRegistrySchema>;
