import { z } from "zod";
import { Chess } from "chess.js";
import { problemasDeLimiteV2 } from "./limites.ts";
import { fenSchema, generatedTemplatesSchema, lessonClassSchema, lessonIdSchema, uciSchema, type Position } from "../lesson/schema.ts";
import { dominioDaAulaV2, ID_DE_ABERTURA } from "./dominio.ts";

/** A posição inicial do xadrez padrão, como a `chess.js` a escreve. */
export const FEN_INICIAL_PADRAO = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const idV2Schema = z.string().regex(/^[a-z][a-z0-9-]*$/, "id interno inválido");
export const aulaIdV2Schema = z.union([
  lessonIdSchema,
  z.string().regex(/^EX-[A-Z0-9-]+$/, "id de aula extra fora do padrão (ex.: EX-OPOSICAO)"),
  // Curso de abertura, §13.3.3: uma aula por bloco do estudo.
  z.string().regex(ID_DE_ABERTURA, "id de aula de abertura fora do padrão (ex.: AB-BRANCAS-FRANCESA-B)"),
]);
export const referenciaNoSchema = z.strictObject({
  analiseId: idV2Schema,
  nodeId: idV2Schema,
});

/**
 * As quatro cores de desenho, com os nomes que o Lichess usa: verde, vermelho,
 * amarelo e azul.
 *
 * **Por que quatro, e por que estas.** É a paleta que o professor já conhece de
 * anotar no Lichess, e é a que sai do PGN — `[%cal Ge2e4]` é verde, `R` vermelho,
 * `Y` amarelo, `B` azul. Guardar o nome da cor (e não o código da fonte) é o que
 * deixa o arquivo legível num diff e independente de quem exportou.
 */
export const corDesenhoV2Schema = z.enum(["verde", "vermelho", "amarelo", "azul"]);

/**
 * Setas e casas acesas de um nó — agora com cor.
 *
 * ## Por que cada entrada aceita duas formas
 *
 * A forma curta (`["e2","e4"]`, `"d5"`) é a que as três aulas v1 já usam, e ela
 * continua valendo **exatamente** como valia: sem cor declarada, a tela desenha com
 * os pincéis de sempre e nada no conteúdo publicado muda de aparência. A forma
 * longa (`{ de, para, cor }`) é a que a importação escreve, porque um PGN do Lichess
 * sempre diz a cor.
 *
 * Não há `transform` no meio: o que entra é o que sai. Um schema que normalizasse
 * faria o validador devolver um documento diferente do que recebeu, e o editor
 * gravaria de volta um arquivo reescrito que o professor não pediu.
 */
export const setaV2Schema = z.union([
  z.tuple([z.string(), z.string()]),
  z.strictObject({ de: z.string(), para: z.string(), cor: corDesenhoV2Schema }),
]);

export const casaAcesaV2Schema = z.union([
  z.string(),
  z.strictObject({ casa: z.string(), cor: corDesenhoV2Schema }),
]);

export const desenhoV2Schema = z.strictObject({
  arrows: z.array(setaV2Schema).optional(),
  highlights: z.array(casaAcesaV2Schema).optional(),
});

export const metadadosAulaV2Schema = z.strictObject({
  orientacaoPadrao: z.enum(["white", "black"]),
  criterioDominio: z.enum(["D1", "D2", "D3", "D4"]),
  classe: lessonClassSchema.optional(),
  /**
   * O nível do currículo a que a aula pertence.
   *
   * **Por que ele existe, se as aulas do curso já o trazem no id.** Porque as
   * aulas extras (§22) não o trazem: o id delas é `EX-…`, sem número, e §22
   * exige "nível explícito". Sem este campo, a única forma de declarar o nível
   * de uma extra criada pela tela seria editar a trilha à mão — que é código.
   *
   * Opcional porque as aulas do curso continuam declarando o nível por onde
   * sempre declararam: **a trilha** (`lib/finais/trilha.ts`). O prefixo do id não é o
   * nível — `N1-KPK` é do nível **2** da trilha; o comentário antigo dizia "nível 1", e o
   * formulário tratava o prefixo como nível (D7 da fatia 8). Quando uma aula do curso
   * declara o campo, ele tem de bater com a trilha (`NIVEL_DIVERGE`).
   *
   * De 1 a 5, os níveis de `lib/curso/nivel.ts`: não existe nível 0.
   */
  nivel: z.number().int().min(1).max(5).optional(),
  estadoEditorial: z.enum(["rascunho", "publicado"]),
  estadoDaOrigem: z.enum(["rascunho", "publicado"]).optional(),
  fonteDidatica: z.string().min(1).optional(),
  etapasAusentes: z.strictObject({
    introducao: z.string().min(1).optional(),
    capitulos: z.string().min(1).optional(),
    treinos: z.string().min(1).optional(),
    praticas: z.string().min(1).optional(),
  }).optional(),
  professor: z.strictObject({ adaptouEm: z.string().min(1), nota: z.string().min(1).optional() }).optional(),
  /**
   * De que curso de abertura a aula é (§13.3.3, 16/9/2026). Só nas aulas `AB-`, e tem de bater
   * com o id (`ABERTURA_DIVERGE`). Aula de abertura não tem classe nem nível de finais.
   */
  abertura: z.strictObject({
    cor: z.enum(["brancas", "pretas"]),
    abertura: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug da abertura inválido (ex.: francesa, caro-kann)"),
    bloco: z.string().regex(/^[A-Z0-9]{1,3}$/, "bloco inválido (ex.: A, B, EF)"),
  }).optional(),
});

export const referenciaProvenienciaV2Schema = z.strictObject({
  positionId: z.string().min(1),
  conteudoHash: z.string().min(8),
  estado: z.enum(["fixture", "candidate", "approved"]),
});

export const excecaoEditorialV2Schema = z.strictObject({
  codigo: z.string().min(1),
  alvo: z.string().min(1),
  hash: z.string().min(8),
  motivo: z.string().min(25),
  em: z.string().min(1),
});

export const catalogoEditorialV2Schema = z.strictObject({
  erros: z.array(z.strictObject({
    id: idV2Schema,
    /** Nome curto mostrado ao professor; os catálogos v1 continuam legíveis sem ele. */
    nome: z.string().min(1).optional(),
    julgamento: z.enum(["fora-do-metodo", "perde-resultado"]),
    texto: z.string().min(1),
  })),
  mensagensPadrao: z.strictObject({
    vitoriaForaDoMetodo: z.string().min(1),
    perdeResultado: z.string().min(1),
    alternativaDoMetodo: z.string().min(1),
  }),
  mensagensGeradas: generatedTemplatesSchema.optional(),
});

/**
 * "Isto continua legal, mas talvez não continue querendo dizer o mesmo."
 *
 * ## Por que a marca existe, e por que ela não é um erro
 *
 * §5 do plano final: "Lances ainda legais podem adquirir outro significado.
 * Comentários, narrações e desenhos afetados ficam marcados para revisão;
 * legalidade não comprova validade pedagógica." Quando a posição inicial de um
 * capítulo troca, um comentário como "o rei branco já está na oposição" pode
 * continuar gramaticalmente perfeito e factualmente falso — e nenhuma conta que
 * a máquina saiba fazer distingue os dois casos. O que ela sabe é **avisar**.
 *
 * A marca é um aviso, nunca um erro: o documento continua válido, o autosave
 * continua gravando, e o professor resolve quando chegar ali. §5 também manda
 * que "revisões obrigatórias devem ser resolvidas antes da publicação" — é na
 * publicação v2 que o aviso vira portão, não aqui.
 *
 * `motivo` é uma lista fechada, e não texto livre, porque quem lê a marca é a
 * tela: ela precisa escrever a frase em português do jeito certo, e uma frase
 * guardada dentro do arquivo envelheceria junto com o documento.
 */
export const revisaoPendenteV2Schema = z.strictObject({
  motivo: z.enum(["posicao-inicial-trocada"]),
});

/**
 * De onde veio uma posição que entrou como FEN crua — especificação §19.1, plano §12.
 *
 * ## Um campo obrigatório só (decisão do Doug, 14/9/2026)
 *
 * "De onde veio" é o único campo que o professor **precisa** responder. Os outros — autor, obra,
 * página, link, licença e nota — são opcionais: exigir a página de um livro de quem montou a posição
 * de cabeça seria um formulário que ensina a inventar.
 *
 * - `autoria-propria`: a posição é do professor; publica, e o crédito é dele.
 * - `desconhecida`: publica, mas deixa o aviso permanente `ORIGEM_DESCONHECIDA`, que não se marca
 *   como resolvido — só some quando a origem é preenchida.
 *
 * ## `fenRevisada`, e não um hash
 *
 * O plano fala em hash da evidência. Aqui a evidência é a própria FEN — uma linha menor que o hash
 * e igualmente exata —, e o comando que registra a revisão roda **no navegador**, onde
 * `node:crypto` não existe. Trocar a posição inicial conserva a revisão com a FEN antiga: a
 * diferença entre as duas é o que a torna caduca e o que mostra o antes e o depois.
 */
export const ORIGENS_DA_POSICAO = ["obra", "estudo-lichess", "partida", "autoria-propria", "desconhecida"] as const;
export const revisaoDaFenV2Schema = z.strictObject({
  origem: z.enum(ORIGENS_DA_POSICAO),
  autor: z.string().min(1).optional(),
  obra: z.string().min(1).optional(),
  pagina: z.string().min(1).optional(),
  link: z.string().min(1).optional(),
  licenca: z.string().min(1).optional(),
  nota: z.string().min(1).optional(),
  /** A FEN que o professor tinha na frente quando registrou. */
  fenRevisada: fenSchema,
  revisadoEm: z.string().min(1),
  professor: z.string().min(1),
  /** Uma linha discreta no fim da aula, para o aluno. Privada por padrão. */
  mostrarCredito: z.boolean(),
  /**
   * §12.3: os comentários e narrações que vieram com a posição são do professor, ou ele tem direito
   * de publicá-los. Só é perguntado quando a origem é de outra pessoa (obra, estudo, partida).
   */
  direitoDosTextos: z.boolean().optional(),
});

export const noV2Schema = z.strictObject({
  id: idV2Schema,
  uci: uciSchema.optional(),
  filhos: z.array(idV2Schema),
  comentario: z.string().optional(),
  nags: z.array(z.number().int().min(1).max(255)).optional(),
  desenhos: desenhoV2Schema.optional(),
  /**
   * As diretivas que vieram dentro do `{comentário}` do PGN, **cruas e opacas**:
   * `[%cal Ge2e4]`, `[%csl Rd5]`, `[%clk 0:05:00]`, `[%anno …]`.
   *
   * ## Por que guardar o texto cru se `desenhos` já tem a seta e a cor
   *
   * Porque nem toda diretiva é desenho. `[%cal]` e `[%csl]` viram seta e casa acesa
   * com a cor do professor, e essas a tela desenha. Mas `[%clk 0:05:00]`, `[%anno …]`
   * e o que o próximo exportador inventar não têm — nem devem ter — significado aqui.
   * Guardá-las cruas é o que o plano (§11) chama de "diretiva desconhecida preservável
   * continua opaca": elas voltam inteiras num round-trip sem que ninguém precise
   * decidir o que elas querem dizer.
   *
   * Nada aqui é executado nem interpretado. É texto guardado, não comando.
   */
  diretivas: z.array(z.string()).optional(),
  /** Ver `revisaoPendenteV2Schema`: cobre o comentário e os desenhos deste nó. */
  revisao: revisaoPendenteV2Schema.optional(),
});

export const analiseV2Schema = z.strictObject({
  id: idV2Schema,
  inicio: z.discriminatedUnion("tipo", [
    z.strictObject({ tipo: z.literal("posicao"), positionId: z.string().min(1) }),
    z.strictObject({ tipo: z.literal("referencia"), origem: referenciaNoSchema }),
    /**
     * Uma FEN crua, sem arquivo de posição por trás — é como um PGN importado chega.
     *
     * **Por que um terceiro tipo, e não inventar um `positionId`.** O plano final (§12)
     * é categórico: "FEN importada não é posição automaticamente aprovada". Fabricar um
     * arquivo de posição na importação faria exatamente isso — daria ao material de
     * fora a mesma aparência do material revisado, e o professor perderia o único sinal
     * que distingue os dois. Aqui a diferença é estrutural: enquanto a análise começa em
     * `fen`, ela **não pode** ser certificada, e o validador diz isso em voz alta.
     */
    z.strictObject({
      tipo: z.literal("fen"),
      fen: fenSchema,
      /** A revisão de proveniência desta FEN (§19.1, fatia 10). Ausente: ainda não revisada. */
      revisao: revisaoDaFenV2Schema.optional(),
    }),
  ]),
  /**
   * O cabeçalho do PGN de onde a análise veio, guardado inteiro e **nunca
   * interpretado** — §11: "diretivas desconhecidas preserváveis continuam opacas; não
   * executá-las nem interpretá-las como comandos".
   *
   * Sem isto, importar perderia `[White]`, `[Event]`, `[ChapterURL]` e o resultado: o
   * professor não teria como voltar à origem do que está editando.
   */
  origemPgn: z.strictObject({
    tags: z.record(z.string(), z.string()),
    resultado: z.string().optional(),
    /** O que a varredura do PGN não soube ler. Diagnóstico, não conteúdo. */
    naoReconhecidos: z.array(z.string()).default([]),
  }).optional(),
  raizId: idV2Schema,
  nos: z.record(idV2Schema, noV2Schema),
});

export const quadroIntroducaoV2Schema = z.strictObject({
  id: idV2Schema,
  /** §7.1 (fatia 10): "título e texto de cada quadro". Opcional; o aluno lê acima do texto. */
  titulo: z.string().min(1).optional(),
  texto: z.string().min(1),
  /**
   * O lance que levou a esta posição a partir do quadro anterior ("inserir lance", §7.1). Só marca
   * de onde a peça saiu no tabuleiro do aluno; a posição continua sendo a de `posicao`.
   */
  lance: uciSchema.optional(),
  posicao: z.discriminatedUnion("tipo", [
    z.strictObject({ tipo: z.literal("referencia"), origem: referenciaNoSchema }),
    z.strictObject({ tipo: z.literal("fen"), fen: fenSchema }),
  ]),
  desenhos: desenhoV2Schema.optional(),
  revisao: revisaoPendenteV2Schema.optional(),
});

export const introducaoV2Schema = z.strictObject({
  id: idV2Schema,
  titulo: z.string().min(1),
  quadros: z.array(quadroIntroducaoV2Schema).min(1),
});

export const narracaoV2Schema = z.strictObject({
  id: idV2Schema,
  nodeId: idV2Schema,
  texto: z.string().min(1),
  pausa: z.enum(["temporizada", "manual"]).default("temporizada"),
  /**
   * O desenho **desta** narração, quando ele não é o da posição (fatia 7, 13/9/2026).
   *
   * O desenho mora no nó (§6 do plano), e isso cobre o caso comum. Não cobre duas falas
   * sobre a mesma posição que apontam coisas diferentes — a N0-LADDER tem duas na posição
   * inicial ("as suas torres" acende g1, g2 e e3; "por e4 ele sobe" acende e4) e três
   * no mate. Sem este campo, converter a aula apagaria esses desenhos em silêncio.
   *
   * Ausente: vale o desenho do nó. `{}`: esta fala não desenha nada, mesmo que o nó
   * desenhe. A tela ainda não o edita; ele é preservado e tocado.
   */
  desenhos: desenhoV2Schema.optional(),
  /**
   * Pausa extra depois da leitura, em ms — o `espera` do roteiro v1, pelo mesmo motivo:
   * a posição que precisa ser olhada com calma. Não é comprimida pela velocidade da prévia,
   * porque é tempo de leitura (§15.2).
   */
  esperaMs: z.number().int().min(0).max(4000).optional(),
  /**
   * O rótulo da fala, quando o texto veio marcado no estudo — `[ARMADILHA]`, `[PLANO]`… (§13.3.5,
   * 16/9/2026). O aluno o lê acima da fala; o marcador cru nunca aparece.
   */
  rotulo: z.string().min(1).max(40).optional(),
  revisao: revisaoPendenteV2Schema.optional(),
});

export const capituloV2Schema = z.strictObject({
  id: idV2Schema,
  titulo: z.string().min(1),
  /** A linha que resume a técnica (o `summary` do v1); o aluno a lê debaixo do título. */
  resumo: z.string().min(1).optional(),
  analiseId: idV2Schema,
  inicioNodeId: idV2Schema,
  caminho: z.array(idV2Schema),
  orientacao: z.enum(["white", "black"]),
  narracoes: z.array(narracaoV2Schema),
});

const origemTreinoV2Schema = z.strictObject({
  analiseId: idV2Schema,
  nodeIds: z.array(idV2Schema).min(1),
  hash: z.string().min(1),
  derivadorVersao: z.number().int().positive(),
  /** Receita suficiente para localizar novamente o mesmo trecho. Opcional nos rascunhos anteriores à 6D. */
  capituloId: idV2Schema.optional(),
  inicioNodeId: idV2Schema.optional(),
  objetivo: z.string().min(1).optional(),
});

const posicaoMaterializadaTreinoV2Schema = z.strictObject({
  fen: z.string().min(1),
  /** Caminho desde a raiz. Conserva o histórico quando uma regra não cabe só nos seis campos da FEN. */
  historicoUci: z.array(uciSchema),
  origem: referenciaNoSchema,
});

const copiaTreinoV2Schema = z.strictObject({
  inicio: posicaoMaterializadaTreinoV2Schema,
  questoes: z.record(idV2Schema, posicaoMaterializadaTreinoV2Schema),
});

export const respostaTreinoV2Schema = z.strictObject({
  id: idV2Schema,
  moves: z.array(uciSchema).min(1),
  /** `alternativa` é aceita, mas fica explicitamente fora do método ensinado. */
  julgamento: z.enum(["correta", "alternativa", "erro"]),
  feedback: z.string().min(1),
  erroId: idV2Schema.optional(),
  efeito: z.discriminatedUnion("tipo", [
    z.strictObject({
      tipo: z.literal("avanca"),
      defesas: z.array(z.strictObject({
        move: uciSchema,
        proximaQuestaoId: idV2Schema,
        /**
         * O que o aluno lê, logo depois do feedback, quando o defensor joga **este** lance
         * (decisão do Doug, 13/9/2026). O feedback é da resposta do aluno; com duas
         * defesas, só um texto por defesa diz a verdade nas duas tentativas.
         */
        texto: z.string().min(1).optional(),
      })).min(1),
    }),
    z.strictObject({ tipo: z.literal("repete") }),
    z.strictObject({
      tipo: z.literal("encerra"),
      condicao: z.enum(["mate", "promotion", "draw-secured", "tablebase-win", "objetivo-autoral"]),
      /**
       * A última resposta do defensor, quando a linha termina na vez dele.
       * Sem este campo, treinar o outro lado de um percurso de tamanho ímpar
       * obrigaria a cortar o último lance ou inventar uma pergunta sem lance do aluno.
       */
      defesaFinal: uciSchema.optional(),
      /** O que o aluno lê com a conclusão, quando o defensor fecha com `defesaFinal`. */
      textoDaDefesaFinal: z.string().min(1).optional(),
    }),
  ]),
});

export const questaoTreinoV2Schema = z.strictObject({
  id: idV2Schema,
  posicao: referenciaNoSchema,
  dica: z.string().min(1).optional(),
  desenhos: desenhoV2Schema.optional(),
  respostas: z.array(respostaTreinoV2Schema).min(1),
});

export const treinoV2Schema = z.strictObject({
  id: idV2Schema,
  titulo: z.string().min(1),
  introducao: z.string().min(1).optional(),
  perfil: z.enum(["final-certificado", "linha-autoral"]),
  inicio: referenciaNoSchema,
  ladoAluno: z.enum(["white", "black"]),
  objetivo: z.string().min(1),
  questoes: z.array(questaoTreinoV2Schema).min(1),
  defensor: z.strictObject({
    /**
     * §16.4. `deterministica` gira as defesas entre tentativas pela conta de
     * `lib/lesson/defensor.ts`; `fixa` joga sempre a primeira defesa de cada resposta,
     * na ordem que o professor deu. Sorteio não existe, e não entra por acidente.
     */
    politica: z.enum(["deterministica", "fixa"]),
  }),
  /** Se o trecho começa na vez do defensor, ele joga antes da primeira pergunta. */
  defesaInicial: z.strictObject({
    move: uciSchema,
    primeiraQuestaoId: idV2Schema,
    /** O que o aluno lê quando o defensor abre a linha com este lance. */
    texto: z.string().min(1).optional(),
  }).optional(),
  termino: z.strictObject({
    tipo: z.enum(["objetivo", "mate", "limite"]),
    maxPlies: z.number().int().positive().optional(),
  }),
  propriedade: z.enum(["derivado", "personalizado", "independente"]),
  fonte: z.enum(["atual", "alterada", "removida"]),
  origem: origemTreinoV2Schema.optional(),
  /** Conteúdo operacional próprio. Em personalizado/independente, a análise deixa de ser necessária para jogar. */
  copia: copiaTreinoV2Schema.optional(),
  obrigatorio: z.boolean().default(true),
  revisaoAvaliacao: z.enum(["pendente", "confirmada"]).default("pendente"),
  /**
   * O que o treino cobra: ganhar ou segurar o empate — **declarado pelo professor** (trava 2 de
   * `docs/TRILHA-FINAIS.md`, 15/9/2026). O juiz do aluno escreve "joga a vitória fora" ou "joga o
   * empate fora" por ele. Ausente: vale o `resultado` da certificação antiga, se houver, e por fim
   * vitória (`resultadoDoTreinoV2`). A revisão da avaliação lê o mesmo valor, venha de onde vier.
   */
  resultado: z.enum(["win", "draw"]).optional(),
  /**
   * **Só compatibilidade de leitura desde 15/9/2026.** A tablebase deixou de ser consultada: nada
   * renova, confirma ou cobra este campo. As aulas antigas o trazem, e a evidência gravada nele (os
   * `winningMoves` do v1) continua valendo como dado congelado no juiz do aluno.
   */
  certificacao: z.strictObject({
    tipo: z.literal("tablebase"),
    estado: z.enum(["pendente", "herdada-v1", "confirmada", "indisponivel"]),
    positionId: z.string().min(1),
    alvoHash: z.string().min(8),
    /**
     * O resultado que a tablebase certifica: ganhar ou segurar o empate. O juiz do aluno
     * escreve "joga a vitória fora" ou "joga o empate fora" por ele; sem o campo, a aula
     * de empate diria vitória.
     */
    resultado: z.enum(["win", "draw"]).optional(),
    /**
     * A evidência calculada, por pergunta: os lances que ainda preservam o resultado
     * naquela posição (o `winningMoves` do v1). É **certificação, não autoria** (§8 do
     * plano): o gate a renova, o professor não a edita. A FEN vai junto porque evidência
     * de outra posição não vale — se a pergunta mudou de lugar, ela é ignorada.
     */
    evidencias: z.record(idV2Schema, z.strictObject({
      fen: z.string().min(1),
      winningMoves: z.array(uciSchema),
    })).optional(),
  }).optional(),
  explicacaoConclusao: z.string().min(1).optional(),
  /**
   * `parada`: o treino de uma questão que uma `[PERGUNTA]` do estudo produz no curso de abertura
   * (§13.3.4, §18.1). O aluno joga o lance e a aula continua da resposta — sem confete.
   */
  papel: z.enum(["parada"]).optional(),
}).superRefine((treino, ctx) => {
  if (treino.propriedade === "derivado" && !treino.origem) ctx.addIssue({ code: "custom", path: ["origem"], message: "treino derivado precisa declarar sua receita de origem" });
  if (treino.propriedade === "derivado" && treino.copia) ctx.addIssue({ code: "custom", path: ["copia"], message: "treino derivado usa a aula diretamente e não guarda cópia operacional" });
  if (treino.termino.tipo === "limite" && !treino.termino.maxPlies) ctx.addIssue({ code: "custom", path: ["termino", "maxPlies"], message: "término por limite precisa de maxPlies" });
});

export const praticaV2Schema = z.strictObject({
  id: idV2Schema,
  titulo: z.string().min(1),
  positionId: z.string().min(1),
  ladoAluno: z.enum(["white", "black"]),
  objetivo: z.enum(["win", "draw"]),
  engine: z.strictObject({ skill: z.number().int().min(0).max(20), moveTimeMs: z.number().int().min(50).max(5000) }),
});

/** O id de uma linha do repertório compilado (`idDaLinha` em `lib/repertorio/linhas.ts`). */
export const ID_DE_LINHA_DO_REPERTORIO = /^(brancas|pretas)-[a-z0-9-]+-[0-9a-f]{8}$/;

/**
 * O move trainer dentro da aula de abertura — §18.1 (decisões do Doug, 16/9/2026).
 *
 * Não guarda lance nenhum: aponta para as linhas do repertório compilado, na ordem em que o aluno
 * as recebe. O juiz e a gravação são os de `/aberturas`; a publicação recusa linha que não existe
 * no compilado (`TREINADOR_LINHA_AUSENTE`).
 */
export const treinadorV2Schema = z.strictObject({
  id: idV2Schema,
  titulo: z.string().min(1),
  cor: z.enum(["brancas", "pretas"]),
  abertura: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  linhaIds: z.array(z.string().regex(ID_DE_LINHA_DO_REPERTORIO, "id de linha do repertório inválido")).min(1),
});

export const etapaV2Schema = z.strictObject({
  id: idV2Schema,
  tipo: z.enum(["introducao", "capitulo", "treino", "pratica", "treinador"]),
  entidadeId: idV2Schema,
});

export const aulaV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  id: aulaIdV2Schema,
  titulo: z.string().min(1),
  metadados: metadadosAulaV2Schema.optional(),
  proveniencia: z.array(referenciaProvenienciaV2Schema).default([]),
  excecoes: z.array(excecaoEditorialV2Schema).default([]),
  catalogo: catalogoEditorialV2Schema.optional(),
  analises: z.array(analiseV2Schema),
  introducoes: z.array(introducaoV2Schema).default([]),
  capitulos: z.array(capituloV2Schema),
  treinos: z.array(treinoV2Schema),
  praticas: z.array(praticaV2Schema).default([]),
  /**
   * Opcional, e não `default([])`: um valor padrão acrescentaria o campo a toda aula relida, e o
   * hash das publicações de finais mudaria sem que nada nelas tivesse mudado.
   */
  treinadores: z.array(treinadorV2Schema).optional(),
  fluxo: z.array(etapaV2Schema),
  origem: z.strictObject({
    formato: z.literal("lesson-v1"),
    hash: z.string().min(1),
    /**
     * A conversão explícita (plano §14, especificação §20.3; fatia 7): o professor viu o diff,
     * o snapshot anterior foi guardado, e a partir daqui os ids deste documento são os
     * permanentes. Ausente: o documento ainda é a adaptação em leitura da aula v1.
     */
    convertidaEm: z.string().min(1).optional(),
  }).optional(),
});

/**
 * O resultado que o treino cobra: o declarado pelo professor; numa aula antiga, o da certificação
 * congelada; `null` quando nenhum dos dois existe. Uma função só, para o juiz do aluno e a revisão
 * da avaliação lerem o mesmo valor.
 */
export function resultadoDoTreinoV2(treino: { resultado?: "win" | "draw"; certificacao?: { resultado?: "win" | "draw" } }): "win" | "draw" | null {
  return treino.resultado ?? treino.certificacao?.resultado ?? null;
}

export type RevisaoPendenteV2 = z.infer<typeof revisaoPendenteV2Schema>;
export type RevisaoDaFenV2 = z.infer<typeof revisaoDaFenV2Schema>;
export type OrigemDaPosicaoV2 = RevisaoDaFenV2["origem"];
export type CorDesenhoV2 = z.infer<typeof corDesenhoV2Schema>;
export type SetaV2 = z.infer<typeof setaV2Schema>;
export type CasaAcesaV2 = z.infer<typeof casaAcesaV2Schema>;
export type DesenhoV2 = z.infer<typeof desenhoV2Schema>;
export type ReferenciaNoV2 = z.infer<typeof referenciaNoSchema>;
export type MetadadosAulaV2 = z.infer<typeof metadadosAulaV2Schema>;
export type NoV2 = z.infer<typeof noV2Schema>;
export type AnaliseV2 = z.infer<typeof analiseV2Schema>;
export type QuadroIntroducaoV2 = z.infer<typeof quadroIntroducaoV2Schema>;
export type IntroducaoV2 = z.infer<typeof introducaoV2Schema>;
export type NarracaoV2 = z.infer<typeof narracaoV2Schema>;
export type CapituloV2 = z.infer<typeof capituloV2Schema>;
export type RespostaTreinoV2 = z.infer<typeof respostaTreinoV2Schema>;
export type QuestaoTreinoV2 = z.infer<typeof questaoTreinoV2Schema>;
export type TreinoV2 = z.infer<typeof treinoV2Schema>;
export type PraticaV2 = z.infer<typeof praticaV2Schema>;
export type TreinadorV2 = z.infer<typeof treinadorV2Schema>;
export type AulaV2 = z.infer<typeof aulaV2Schema>;

export type LocalizacaoProblemaV2 = {
  aulaId: string;
  analiseId?: string;
  introducaoId?: string;
  quadroId?: string;
  capituloId?: string;
  narracaoId?: string;
  nodeId?: string;
  treinoId?: string;
  questaoId?: string;
  respostaId?: string;
  praticaId?: string;
  treinadorId?: string;
  etapaId?: string;
  campo?: string;
};

export type ProblemaV2 = {
  codigo: string;
  severidade: "erro" | "aviso";
  mensagem: string;
  localizacao: LocalizacaoProblemaV2;
};

type ProblemaBrutoV2 = {
  codigo: string;
  severidade?: ProblemaV2["severidade"];
  mensagem: string;
  analiseId?: string;
  introducaoId?: string;
  quadroId?: string;
  capituloId?: string;
  narracaoId?: string;
  nodeId?: string;
  treinoId?: string;
  questaoId?: string;
  respostaId?: string;
  praticaId?: string;
  treinadorId?: string;
  etapaId?: string;
  campo?: string;
};

/**
 * Os lances da aula são jogáveis, um atrás do outro, a partir da posição de cada
 * análise?
 *
 * ## O que este portão conserta
 *
 * Antes dele a legalidade era conferida só na hora de desenhar o painel, e o jeito
 * de reprovar era **estourar uma exceção** (`arvore.ts`, "lance ilegal no nó X").
 * Uma exceção não tem localização que a tela saiba usar: ela apaga o painel inteiro,
 * e o professor fica com a tela vazia sem saber qual lance consertar — justamente
 * quando ele mais precisa de um dedo apontando.
 *
 * ## Poda por ramo, e não por árvore
 *
 * Encontrado um lance ilegal, tudo o que vem depois dele naquele ramo é
 * consequência: as posições seguintes nunca existiram, e julgá-las produziria uma
 * cascata de erros que escondem o único que importa. Então o ramo é podado ali e os
 * **irmãos continuam sendo julgados** — é a regra do plano final (§5), e é o que
 * deixa uma variante errada conviver com as variantes certas ao lado.
 *
 * ## Um tabuleiro só, com `undo`
 *
 * O percurso é em profundidade num único `Chess`, desfazendo o lance ao voltar. A
 * alternativa óbvia — recalcular a posição de cada nó desde a raiz — é o que
 * `arvore.ts` faz hoje, e custa o quadrado do tamanho da árvore: numa partida de 60
 * lances são milhares de jogadas repetidas, e no alvo de 1.000 nós do plano (§17),
 * centenas de milhares. Aqui cada lance é jogado **uma vez**.
 *
 * ## E o percurso fica guardado enquanto os lances não mudam (fatia 10, parada 10G)
 *
 * Mesmo jogando cada lance uma vez, a árvore de 1.000 nós custava 114 ms em Node **a cada
 * edição** — e a edição mais comum (comentário, narração, desenho) não muda lance nenhum. O
 * resultado deste percurso depende só da posição inicial e de `uci`/`filhos` de cada nó; ele fica
 * guardado por essa assinatura. A chave é o **conteúdo**, e não a identidade do objeto: um nó
 * mudado no lugar muda a assinatura, e o percurso é refeito.
 */
const PERCURSOS_GUARDADOS = new Map<string, { fens: Map<string, string>; problemas: ProblemaBrutoV2[] }>();
const MAXIMO_DE_PERCURSOS_GUARDADOS = 16;

/** Os lances de uma análise como texto: muda com `uci` e `filhos`, e não com texto ou desenho. */
export function assinaturaDosLancesV2(analise: AnaliseV2): string {
  let assinatura = `${analise.raizId};`;
  for (const [id, no] of Object.entries(analise.nos)) assinatura += `${id}:${no.uci ?? ""}:${no.filhos.join(",")};`;
  return assinatura;
}

function problemasDeLegalidade(
  aula: AulaV2,
  positions: Record<string, Position>,
  analises: Map<string, AnaliseV2>,
  saudaveis: Set<string>,
): ProblemaBrutoV2[] {
  const problemas: ProblemaBrutoV2[] = [];
  /** `analiseId` → (`nodeId` → FEN). Ausente quando a análise não pôde ser percorrida. */
  const fensPorAnalise = new Map<string, Map<string, string> | null>();
  const resolvendo = new Set<string>();

  function fenInicialDe(analise: AnaliseV2): string | null {
    if (analise.inicio.tipo === "posicao") {
      const position = positions[analise.inicio.positionId];
      if (!position) {
        problemas.push({
          codigo: "POSICAO_INEXISTENTE",
          mensagem: `a análise começa na posição "${analise.inicio.positionId}", que não está no pacote desta aula`,
          analiseId: analise.id,
          campo: "inicio.positionId",
        });
        return null;
      }
      return position.fen;
    }
    if (analise.inicio.tipo === "fen") return analise.inicio.fen;
    // Começar de um nó de outra análise: aquela precisa ser percorrida primeiro.
    return caminhar(analise.inicio.origem.analiseId)?.get(analise.inicio.origem.nodeId) ?? null;
  }

  function caminhar(analiseId: string): Map<string, string> | null {
    const jaFeita = fensPorAnalise.get(analiseId);
    if (jaFeita !== undefined) return jaFeita;
    // Ciclo entre inícios de análise: `CICLO_ENTRE_ANALISES` já o acusou.
    if (resolvendo.has(analiseId)) return null;
    const analise = analises.get(analiseId);
    if (!analise || !saudaveis.has(analiseId)) {
      fensPorAnalise.set(analiseId, null);
      return null;
    }

    resolvendo.add(analiseId);
    const inicial = fenInicialDe(analise);
    resolvendo.delete(analiseId);
    if (inicial === null) {
      fensPorAnalise.set(analiseId, null);
      return null;
    }

    const chave = `${analiseId}\n${inicial}\n${assinaturaDosLancesV2(analise)}`;
    const guardado = PERCURSOS_GUARDADOS.get(chave);
    if (guardado) {
      problemas.push(...guardado.problemas.map((problema) => ({ ...problema })));
      fensPorAnalise.set(analiseId, guardado.fens);
      return guardado.fens;
    }
    const problemasAntes = problemas.length;

    const jogo = new Chess();
    try {
      jogo.load(inicial);
    } catch {
      // FEN malformada tem juiz próprio (`fenProblem`, no gate); não acusar duas
      // vezes a mesma coisa em nome de campos diferentes.
      fensPorAnalise.set(analiseId, null);
      return null;
    }

    const fens = new Map<string, string>();
    const andar = (id: string) => {
      fens.set(id, jogo.fen());
      for (const filhoId of analise.nos[id].filhos) {
        const filho = analise.nos[filhoId];
        if (!filho.uci) {
          problemas.push({
            codigo: "LANCE_AUSENTE",
            mensagem: "só a raiz de uma análise pode existir sem lance",
            analiseId,
            nodeId: filhoId,
            campo: "uci",
          });
          continue;
        }
        let jogado: { san: string } | null = null;
        try {
          jogado = jogo.move({
            from: filho.uci.slice(0, 2),
            to: filho.uci.slice(2, 4),
            promotion: filho.uci.length > 4 ? filho.uci.slice(4) : undefined,
          });
        } catch {
          jogado = null;
        }
        if (!jogado) {
          problemas.push({
            codigo: "LANCE_ILEGAL",
            mensagem: `"${filho.uci}" não é um lance possível nesta posição`,
            analiseId,
            nodeId: filhoId,
            campo: "uci",
          });
          continue;
        }
        andar(filhoId);
        jogo.undo();
      }
    };
    andar(analise.raizId);

    fensPorAnalise.set(analiseId, fens);
    if (PERCURSOS_GUARDADOS.size >= MAXIMO_DE_PERCURSOS_GUARDADOS) {
      PERCURSOS_GUARDADOS.delete(PERCURSOS_GUARDADOS.keys().next().value!);
    }
    PERCURSOS_GUARDADOS.set(chave, { fens, problemas: problemas.slice(problemasAntes).map((problema) => ({ ...problema })) });
    return fens;
  }

  for (const analise of aula.analises) caminhar(analise.id);
  return problemas;
}

/**
 * A revisão registrada ainda descreve a posição que está no arquivo? E a
 * certificação está dizendo a verdade?
 *
 * ## O buraco que isto fecha
 *
 * Até aqui o validador conferia se a proveniência **existe** — nunca se ela **bate**.
 * Uma aula podia registrar "posição aprovada, conteúdo tal" e a posição ter mudado
 * depois: a frase continuava no arquivo, agora descrevendo outra coisa. É a falha que
 * o plano final nomeia em §12 ("troca de FEN de posição aprovada reabre a revisão") e
 * em §9 ("sem evidência adequada, não emitir selo de resultado certificado").
 *
 * ## As três regras, e por que as severidades são diferentes
 *
 * **`PROVENIENCIA_CADUCA` e `PROVENIENCIA_DIVERGE` são AVISOS.** As duas descrevem
 * uma divergência com o mundo de fora — alguém mexeu no arquivo da posição depois de
 * a revisão ter sido registrada. Travar o salvamento por causa disso prenderia o
 * professor num rascunho que ele não consegue nem guardar, por um estrago que não foi
 * ele que fez. O plano (§7) é explícito: o rascunho aceita pendência editorial
 * identificada. A publicação v2 as promovia a erro até 15/9/2026; desde a trava 7 de
 * `docs/TRILHA-FINAIS.md` elas são aviso também ao publicar.
 *
 * **`CERTIFICACAO_SEM_APROVACAO` saiu em 15/9/2026**, com a tablebase (travas 2 e 3).
 *
 * ## Por que o hash entra por fora
 *
 * `hashDaPosicao` é injetado em vez de importado porque este módulo roda **também no
 * navegador**, onde `node:crypto` não existe. Quem tem o hash (o servidor, o gate)
 * passa e recebe a conferência de conteúdo; a tela chama sem, e continua recebendo
 * as conferências que não dependem de hash. Nada some em silêncio: o que não pode ser
 * conferido simplesmente não é afirmado.
 */
function problemasDeProveniencia(
  aula: AulaV2,
  positions: Record<string, Position>,
  hashDaPosicao?: (posicao: Position) => string,
): ProblemaBrutoV2[] {
  const problemas: ProblemaBrutoV2[] = [];

  for (const item of aula.proveniencia) {
    const posicao = positions[item.positionId];
    // Posição ausente já é acusada por POSICAO_INEXISTENTE, no portão de legalidade.
    if (!posicao) continue;

    if (item.estado !== posicao.status) {
      problemas.push({
        codigo: "PROVENIENCIA_DIVERGE",
        severidade: "aviso",
        mensagem: `esta aula registra a posição "${item.positionId}" como "${item.estado}", e o arquivo dela hoje diz "${posicao.status}"`,
        campo: "proveniencia.estado",
      });
    }

    if (hashDaPosicao && hashDaPosicao(posicao) !== item.conteudoHash) {
      problemas.push({
        codigo: "PROVENIENCIA_CADUCA",
        severidade: "aviso",
        mensagem: `a posição "${item.positionId}" mudou depois de a revisão ser registrada — o que foi conferido não é mais o que está no arquivo`,
        campo: "proveniencia.conteudoHash",
      });
    }
  }

  // `CERTIFICACAO_SEM_APROVACAO` saiu em 15/9/2026: a certificação é dado congelado de aula
  // antiga e não afirma mais nada que precise de aprovação (travas 2 e 3).

  return problemas;
}

/**
 * Valida referências e a forma de árvore que o schema isolado não consegue enxergar.
 *
 * ## Por que `positions` é opcional
 *
 * A legalidade dos lances só pode ser conferida com as posições do pacote em mãos —
 * a árvore guarda UCI, e um UCI só é legal ou ilegal *em relação a uma posição*.
 * Quem tem o pacote (o servidor, o gate, a tela com a aula aberta) passa `positions`
 * e recebe também os problemas de legalidade; quem só quer julgar a forma do
 * documento (a recuperação local, um rascunho recém-colado) chama sem, e continua
 * recebendo exatamente o que recebia antes.
 *
 * Sem isso, a legalidade ficaria onde estava: numa exceção dentro de `arvore.ts`,
 * que derruba o painel inteiro em vez de dizer qual lance está errado.
 */
/**
 * A frase de cada motivo de revisão, em português de professor.
 *
 * Ela mora aqui, e não dentro do arquivo, porque a marca guardada é um código:
 * o texto que o professor lê pode melhorar amanhã sem reescrever documento
 * nenhum, e um documento de 2026 continua explicando o que aconteceu.
 */
const MOTIVO_DA_REVISAO: Record<RevisaoPendenteV2["motivo"], string> = {
  "posicao-inicial-trocada":
    "a posição inicial do capítulo mudou depois que isto foi escrito — o texto continua legal, mas pode não dizer mais a verdade sobre o tabuleiro",
};

export function problemasDaAulaV2(
  aula: AulaV2,
  positions?: Record<string, Position>,
  hashDaPosicao?: (posicao: Position) => string,
): ProblemaV2[] {
  const problemas: ProblemaBrutoV2[] = [];
  if (!aula.metadados) problemas.push(aula.origem?.formato === "lesson-v1"
    ? { codigo: "METADADOS_LEGADOS", severidade: "aviso", mensagem: "o rascunho foi criado antes dos metadados v2; eles serão completados ao abrir a aula", campo: "metadados" }
    : { codigo: "METADADOS_AUSENTES", mensagem: "uma aula v2 nova precisa declarar seus metadados", campo: "metadados" });
  const ids = new Set<string>();
  const registrar = (id: string, tipo: string, localizacao: Omit<ProblemaBrutoV2, "codigo" | "severidade" | "mensagem"> = {}) => {
    if (ids.has(id)) problemas.push({ codigo: "ID_DUPLICADO", mensagem: `${tipo} repete o id ${id}`, ...localizacao, campo: "id" });
    ids.add(id);
  };
  aula.analises.forEach((a) => registrar(a.id, "análise", { analiseId: a.id }));
  aula.introducoes.forEach((introducao) => {
    registrar(introducao.id, "introdução", { introducaoId: introducao.id });
    introducao.quadros.forEach((quadro) => registrar(quadro.id, "quadro da introdução", { introducaoId: introducao.id, quadroId: quadro.id }));
  });
  aula.capitulos.forEach((c) => {
    registrar(c.id, "capítulo", { capituloId: c.id });
    c.narracoes.forEach((n) => registrar(n.id, "narração", { capituloId: c.id, narracaoId: n.id }));
  });
  aula.treinos.forEach((t) => {
    registrar(t.id, "treino", { treinoId: t.id });
    t.questoes.forEach((q) => {
      registrar(q.id, "questão de treino", { treinoId: t.id, questaoId: q.id });
      q.respostas.forEach((r) => registrar(r.id, "resposta de treino", { treinoId: t.id, questaoId: q.id, respostaId: r.id }));
    });
  });
  aula.praticas.forEach((p) => registrar(p.id, "prática", { praticaId: p.id }));
  (aula.treinadores ?? []).forEach((t) => registrar(t.id, "move trainer", { treinadorId: t.id }));
  aula.fluxo.forEach((e) => registrar(e.id, "etapa", { etapaId: e.id }));

  const analises = new Map(aula.analises.map((a) => [a.id, a]));
  const errosCatalogados = new Set(aula.catalogo?.erros.map((erro) => erro.id) ?? []);
  const proveniencia = new Map<string, AulaV2["proveniencia"][number]>();
  for (const referencia of aula.proveniencia) {
    if (proveniencia.has(referencia.positionId)) problemas.push({ codigo: "PROVENIENCIA_DUPLICADA", mensagem: `a posição ${referencia.positionId} aparece duas vezes no manifesto de proveniência`, campo: "proveniencia" });
    proveniencia.set(referencia.positionId, referencia);
  }

  if (aula.metadados) {
    for (const analise of aula.analises) {
      if (analise.inicio.tipo === "posicao" && !proveniencia.has(analise.inicio.positionId)) problemas.push({ codigo: "POSICAO_SEM_PROVENIENCIA", mensagem: `a análise usa ${analise.inicio.positionId} sem registrar sua revisão`, analiseId: analise.id, campo: "inicio.positionId" });
      // §12: "FEN importada não é posição automaticamente aprovada". É **aviso**, e não
      // erro, porque descreve um trabalho que ainda não foi feito e que o professor
      // pode fazer depois — o plano (§7) diz que o rascunho aceita pendência
      // identificada. **Quando a publicação v2 existir, esta passa a impedir**: aula
      // publicada com posição não revisada é exatamente o que o currículo proíbe.
      // A posição inicial do xadrez é a exceção, e não é firula: ela não é material de
      // ninguém, não afirma nada e não tem o que revisar. Importar vinte partidas
      // completas produziria vinte avisos que não pedem trabalho nenhum — e alarme que
      // não pede trabalho ensina o professor a ignorar os que pedem.
      if (analise.inicio.tipo === "fen" && analise.inicio.fen !== FEN_INICIAL_PADRAO) {
        const revisao = analise.inicio.revisao;
        if (!revisao) problemas.push({ codigo: "FEN_IMPORTADA_SEM_REVISAO", severidade: "aviso", mensagem: "falta dizer de onde veio esta posição — use «Resolver»", analiseId: analise.id, campo: "inicio.revisao" });
        else if (revisao.fenRevisada !== analise.inicio.fen) problemas.push({ codigo: "FEN_IMPORTADA_SEM_REVISAO", severidade: "aviso", mensagem: `a posição mudou depois que você disse de onde ela veio — confirme a origem de novo`, analiseId: analise.id, campo: "inicio.revisao" });
        // Nunca promovido nem resolvível: some só quando a origem é dita (decisão do Doug, 14/9).
        else if (revisao.origem === "desconhecida") problemas.push({ codigo: "ORIGEM_DESCONHECIDA", severidade: "aviso", mensagem: "a origem desta posição está registrada como desconhecida — a aula publica, mas o aviso fica até alguém dizer de onde ela veio", analiseId: analise.id, campo: "inicio.revisao" });
      }
    }
    for (const pratica of aula.praticas) {
      if (!proveniencia.has(pratica.positionId)) problemas.push({ codigo: "PRATICA_SEM_PROVENIENCIA", mensagem: `a prática usa ${pratica.positionId} sem registrar sua revisão`, praticaId: pratica.id, campo: "positionId" });
    }
  }

  for (const introducao of aula.introducoes) {
    for (const quadro of introducao.quadros) {
      if (quadro.posicao.tipo !== "referencia") continue;
      const analise = analises.get(quadro.posicao.origem.analiseId);
      if (!analise?.nos[quadro.posicao.origem.nodeId]) problemas.push({ codigo: "QUADRO_SEM_POSICAO", mensagem: "o quadro da introdução aponta para posição inexistente", introducaoId: introducao.id, quadroId: quadro.id, analiseId: quadro.posicao.origem.analiseId, nodeId: quadro.posicao.origem.nodeId });
      if (quadro.revisao) problemas.push({ codigo: "REVISAO_PENDENTE", severidade: "aviso", mensagem: MOTIVO_DA_REVISAO[quadro.revisao.motivo], introducaoId: introducao.id, quadroId: quadro.id, campo: "revisao" });
    }
  }
  const visitandoAnalises = new Set<string>();
  const analisesVisitadas = new Set<string>();
  const visitarDependencia = (id: string) => {
    if (visitandoAnalises.has(id)) {
      problemas.push({ codigo: "CICLO_ENTRE_ANALISES", mensagem: "as posições iniciais das análises formam um ciclo", analiseId: id });
      return;
    }
    if (analisesVisitadas.has(id)) return;
    const analise = analises.get(id);
    if (!analise) return;
    visitandoAnalises.add(id);
    if (analise.inicio.tipo === "referencia") visitarDependencia(analise.inicio.origem.analiseId);
    visitandoAnalises.delete(id);
    analisesVisitadas.add(id);
  };
  aula.analises.forEach((analise) => visitarDependencia(analise.id));
  /*
   * As análises cuja forma fechou — raiz presente, sem ciclo, sem filho ausente,
   * sem nó órfão nem com dois pais. Só elas podem ser percorridas com um tabuleiro:
   * num grafo quebrado o percurso não termina, e o segundo erro seria consequência
   * do primeiro. Reportar os dois faria o professor consertar o lance errado.
   */
  const analisesSaudaveis = new Set<string>();
  for (const analise of aula.analises) {
    const problemasAntes = problemas.length;
    for (const [chave, no] of Object.entries(analise.nos)) {
      if (chave !== no.id) {
        problemas.push({ codigo: "NO_CHAVE_DIVERGE", mensagem: `${chave} contém ${no.id}`, analiseId: analise.id, nodeId: no.id });
      }
      if (no.revisao) {
        problemas.push({ codigo: "REVISAO_PENDENTE", severidade: "aviso", mensagem: MOTIVO_DA_REVISAO[no.revisao.motivo], analiseId: analise.id, nodeId: no.id, campo: "revisao" });
      }
      registrar(no.id, "nó", { analiseId: analise.id, nodeId: no.id });
    }
    const raiz = analise.nos[analise.raizId];
    if (!raiz) {
      problemas.push({ codigo: "RAIZ_AUSENTE", mensagem: "a raiz da análise não existe", analiseId: analise.id });
      continue;
    }
    if (raiz.uci) problemas.push({ codigo: "RAIZ_COM_LANCE", mensagem: "a raiz não pode ter lance", analiseId: analise.id, nodeId: raiz.id });
    const pais = new Map<string, number>();
    const visitando = new Set<string>();
    const visitados = new Set<string>();
    const andar = (id: string) => {
      if (visitando.has(id)) {
        problemas.push({ codigo: "CICLO_NA_ARVORE", mensagem: "a árvore contém um ciclo", analiseId: analise.id, nodeId: id });
        return;
      }
      if (visitados.has(id)) return;
      const no = analise.nos[id];
      if (!no) return;
      visitando.add(id);
      for (const filho of no.filhos) {
        if (!analise.nos[filho]) {
          problemas.push({ codigo: "FILHO_AUSENTE", mensagem: `o nó aponta para ${filho}, que não existe`, analiseId: analise.id, nodeId: id });
          continue;
        }
        pais.set(filho, (pais.get(filho) ?? 0) + 1);
        andar(filho);
      }
      visitando.delete(id);
      visitados.add(id);
    };
    andar(analise.raizId);
    for (const id of Object.keys(analise.nos)) {
      if (!visitados.has(id)) problemas.push({ codigo: "NO_ORFAO", mensagem: "o nó não é alcançável desde a raiz", analiseId: analise.id, nodeId: id });
      if ((pais.get(id) ?? 0) > 1) problemas.push({ codigo: "DOIS_PAIS", mensagem: "o nó pertence a duas continuações", analiseId: analise.id, nodeId: id });
    }
    if (analise.inicio.tipo === "referencia") {
      const dona = analises.get(analise.inicio.origem.analiseId);
      if (!dona?.nos[analise.inicio.origem.nodeId]) problemas.push({ codigo: "ORIGEM_AUSENTE", mensagem: "a posição de origem não existe", analiseId: analise.id });
    }
    // Só **erro** derruba a saúde da análise. Um aviso — a marca de revisão de §5,
    // por exemplo — diz que um texto precisa ser relido, não que a árvore está
    // quebrada; deixá-lo tirar a análise daqui calaria o portão de legalidade
    // exatamente na análise que acabou de mudar de posição inicial.
    if (problemas.slice(problemasAntes).every((problema) => problema.severidade === "aviso")) {
      analisesSaudaveis.add(analise.id);
    }
  }

  if (positions) problemas.push(...problemasDeLegalidade(aula, positions, analises, analisesSaudaveis));
  if (positions) problemas.push(...problemasDeProveniencia(aula, positions, hashDaPosicao));
  // Os tetos de tamanho (§17) não dependem do pacote de posições: são do documento.
  // Por isso rodam sempre, inclusive na recuperação local e num rascunho recém-colado
  // — que é justamente quando um arquivo grande demais precisa ser recusado antes de
  // ser aberto na tela.
  problemas.push(...problemasDeLimiteV2(aula));

  for (const capitulo of aula.capitulos) {
    const analise = analises.get(capitulo.analiseId);
    if (!analise) {
      problemas.push({ codigo: "ANALISE_AUSENTE", mensagem: "o capítulo aponta para análise inexistente", capituloId: capitulo.id });
      continue;
    }
    let atual = capitulo.inicioNodeId;
    if (!analise.nos[atual]) problemas.push({ codigo: "INICIO_AUSENTE", mensagem: "o início do capítulo não existe", capituloId: capitulo.id, nodeId: atual });
    for (const proximo of capitulo.caminho) {
      if (!analise.nos[atual]?.filhos.includes(proximo)) problemas.push({ codigo: "PERCURSO_QUEBRADO", mensagem: "o percurso do capítulo não é uma linha contínua", capituloId: capitulo.id, nodeId: proximo });
      atual = proximo;
    }
    for (const narracao of capitulo.narracoes) {
      if (!analise.nos[narracao.nodeId]) problemas.push({ codigo: "NARRACAO_SEM_NO", mensagem: "a narração aponta para posição inexistente", capituloId: capitulo.id, narracaoId: narracao.id, nodeId: narracao.nodeId, campo: "nodeId" });
      if (narracao.revisao) problemas.push({ codigo: "REVISAO_PENDENTE", severidade: "aviso", mensagem: MOTIVO_DA_REVISAO[narracao.revisao.motivo], capituloId: capitulo.id, narracaoId: narracao.id, nodeId: narracao.nodeId, campo: "revisao" });
    }
  }

  for (const treino of aula.treinos) {
    // Rascunhos anteriores à 6D podem ter sido marcados como personalizados sem a
    // cópia nova. Eles continuam legíveis e dependentes até a primeira materialização.
    const dependeDaAula = treino.propriedade === "derivado" || !treino.copia;
    const analise = analises.get(treino.inicio.analiseId);
    if (dependeDaAula && !analise?.nos[treino.inicio.nodeId]) problemas.push({ codigo: "TREINO_SEM_INICIO", mensagem: "o treino aponta para posição inicial inexistente", treinoId: treino.id, analiseId: treino.inicio.analiseId, nodeId: treino.inicio.nodeId, campo: "inicio" });
    const questoes = new Set(treino.questoes.map((questao) => questao.id));
    if (treino.defesaInicial && !questoes.has(treino.defesaInicial.primeiraQuestaoId)) problemas.push({ codigo: "DEFESA_INICIAL_SEM_QUESTAO", mensagem: "a defesa inicial aponta para questão inexistente", treinoId: treino.id, campo: "defesaInicial.primeiraQuestaoId" });
    for (const questao of treino.questoes) {
      const analiseDaQuestao = analises.get(questao.posicao.analiseId);
      if (dependeDaAula && !analiseDaQuestao?.nos[questao.posicao.nodeId]) problemas.push({ codigo: "QUESTAO_SEM_POSICAO", mensagem: "a questão do treino aponta para posição inexistente", treinoId: treino.id, questaoId: questao.id, analiseId: questao.posicao.analiseId, nodeId: questao.posicao.nodeId, campo: "posicao" });
      for (const resposta of questao.respostas) {
        if (resposta.erroId && !errosCatalogados.has(resposta.erroId)) problemas.push({ codigo: "ERRO_NAO_CATALOGADO", mensagem: `a resposta usa o erro ${resposta.erroId}, que não existe no catálogo`, treinoId: treino.id, questaoId: questao.id, respostaId: resposta.id, campo: "erroId" });
        if (resposta.efeito.tipo !== "avanca") continue;
        for (const defesa of resposta.efeito.defesas) if (!questoes.has(defesa.proximaQuestaoId)) problemas.push({ codigo: "DEFESA_SEM_QUESTAO", mensagem: "a resposta do defensor aponta para questão inexistente", treinoId: treino.id, questaoId: questao.id, respostaId: resposta.id, campo: "efeito.defesas.proximaQuestaoId" });
      }
    }
    if (treino.origem && treino.propriedade === "derivado") {
      const origem = analises.get(treino.origem.analiseId);
      for (const nodeId of treino.origem.nodeIds) if (!origem?.nos[nodeId]) problemas.push({ codigo: "FONTE_TREINO_AUSENTE", mensagem: "a receita do treino aponta para nó inexistente", treinoId: treino.id, analiseId: treino.origem.analiseId, nodeId, campo: "origem.nodeIds" });
    }
  }

  const introducoes = new Set(aula.introducoes.map((i) => i.id));
  const capitulos = new Set(aula.capitulos.map((c) => c.id));
  const treinos = new Set(aula.treinos.map((t) => t.id));
  const praticas = new Set(aula.praticas.map((p) => p.id));
  const treinadores = new Set((aula.treinadores ?? []).map((t) => t.id));
  const aparicoesNoFluxo = new Map<string, number>();
  // §18.1: o move trainer só existe no curso de abertura — numa aula de finais ele não teria
  // repertório a que pertencer.
  if (aula.treinadores?.length && dominioDaAulaV2(aula.id) !== "abertura") problemas.push({ codigo: "TREINADOR_FORA_DE_ABERTURA", mensagem: "o move trainer só existe em aula de curso de abertura (AB-…)", campo: "treinadores" });
  for (const etapa of aula.fluxo) {
    aparicoesNoFluxo.set(etapa.entidadeId, (aparicoesNoFluxo.get(etapa.entidadeId) ?? 0) + 1);
    if ((aparicoesNoFluxo.get(etapa.entidadeId) ?? 0) > 1) problemas.push({ codigo: "FLUXO_REPETE_ENTIDADE", mensagem: `o fluxo repete a entidade ${etapa.entidadeId}`, etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "introducao" && !introducoes.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_INTRODUCAO", mensagem: "o fluxo aponta para introdução inexistente", etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "capitulo" && !capitulos.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_CAPITULO", mensagem: "o fluxo aponta para capítulo inexistente", etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "treino" && !treinos.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_TREINO", mensagem: "o fluxo aponta para treino inexistente", etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "pratica" && !praticas.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_PRATICA", mensagem: "o fluxo aponta para prática inexistente", etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "treinador" && !treinadores.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_TREINADOR", mensagem: "o fluxo aponta para move trainer inexistente", etapaId: etapa.id, campo: "entidadeId" });
  }
  for (const treinador of aula.treinadores ?? []) if (!aparicoesNoFluxo.has(treinador.id)) problemas.push({ codigo: "TREINADOR_FORA_DO_FLUXO", mensagem: "o move trainer não tem lugar no fluxo da aula", treinadorId: treinador.id });
  for (const introducao of aula.introducoes) if (!aparicoesNoFluxo.has(introducao.id)) problemas.push({ codigo: "INTRODUCAO_FORA_DO_FLUXO", mensagem: "a introdução não tem lugar no fluxo da aula", introducaoId: introducao.id });
  for (const capitulo of aula.capitulos) if (!aparicoesNoFluxo.has(capitulo.id)) problemas.push({ codigo: "CAPITULO_FORA_DO_FLUXO", mensagem: "o capítulo não tem lugar no fluxo da aula", capituloId: capitulo.id });
  for (const treino of aula.treinos) if (!aparicoesNoFluxo.has(treino.id)) problemas.push({ codigo: "TREINO_FORA_DO_FLUXO", mensagem: "o treino não tem lugar no fluxo da aula", treinoId: treino.id });
  for (const pratica of aula.praticas) if (!aparicoesNoFluxo.has(pratica.id)) problemas.push({ codigo: "PRATICA_FORA_DO_FLUXO", mensagem: "a prática não tem lugar no fluxo da aula", praticaId: pratica.id });
  return problemas.map(({ codigo, severidade = "erro", mensagem, ...localizacao }) => ({
    codigo,
    severidade,
    mensagem,
    localizacao: { aulaId: aula.id, ...localizacao },
  }));
}

export type ResultadoValidacaoAulaV2 =
  | { ok: true; aula: AulaV2; avisos?: ProblemaV2[] }
  | { ok: false; problemas: string[]; diagnosticos: ProblemaV2[] };

/**
 * `positions` é opcional pelo mesmo motivo de `problemasDaAulaV2`: quem tem o pacote
 * da aula em mãos ganha também o julgamento de legalidade; quem só precisa saber se
 * o documento tem forma de aula v2 (recuperação local, rascunho colado) continua
 * chamando sem, e recebe o mesmo veredicto de antes.
 */
export function validarAulaV2(
  valor: unknown,
  positions?: Record<string, Position>,
  hashDaPosicao?: (posicao: Position) => string,
): ResultadoValidacaoAulaV2 {
  const forma = aulaV2Schema.safeParse(valor);
  if (!forma.success) {
    const aulaId = typeof valor === "object" && valor !== null && "id" in valor && typeof valor.id === "string" ? valor.id : "aula-desconhecida";
    const diagnosticos = forma.error.issues.map((issue): ProblemaV2 => ({
      codigo: "SCHEMA_V2",
      severidade: "erro",
      mensagem: issue.message,
      localizacao: { aulaId, campo: issue.path.join(".") || "(raiz)" },
    }));
    return { ok: false, problemas: diagnosticos.map(formatarProblemaV2), diagnosticos };
  }
  const diagnosticos = problemasDaAulaV2(forma.data, positions, hashDaPosicao);
  const erros = diagnosticos.filter((problema) => problema.severidade === "erro");
  const avisos = diagnosticos.filter((problema) => problema.severidade === "aviso");
  if (erros.length) return { ok: false, problemas: erros.map(formatarProblemaV2), diagnosticos };
  return { ok: true, aula: forma.data, ...(avisos.length ? { avisos } : {}) };
}

export function formatarProblemaV2(problema: ProblemaV2): string {
  const campo = problema.localizacao.campo ? ` em ${problema.localizacao.campo}` : "";
  return `[${problema.codigo}]${campo} ${problema.mensagem}`;
}

/**
 * Completa somente documentos do piloto anterior, sem tocar na árvore nem nos
 * textos já editados. O hash da origem impede misturar metadados de outra
 * revisão da aula v1.
 */
export function completarAulaV2Legada(aula: AulaV2, referencia: AulaV2): AulaV2 {
  if (aula.metadados || aula.origem?.hash !== referencia.origem?.hash) return aula;
  const treinos = aula.treinos.length ? aula.treinos : referencia.treinos;
  const praticas = aula.praticas.length ? aula.praticas : referencia.praticas;
  const introducoes = aula.introducoes.length ? aula.introducoes : referencia.introducoes;
  const idsDoFluxo = new Set(referencia.fluxo.map((etapa) => etapa.id));
  return {
    ...aula,
    metadados: referencia.metadados,
    proveniencia: referencia.proveniencia,
    excecoes: aula.excecoes.length ? aula.excecoes : referencia.excecoes,
    catalogo: aula.catalogo ?? referencia.catalogo,
    introducoes,
    treinos,
    praticas,
    fluxo: [...referencia.fluxo, ...aula.fluxo.filter((etapa) => !idsDoFluxo.has(etapa.id))],
  };
}
