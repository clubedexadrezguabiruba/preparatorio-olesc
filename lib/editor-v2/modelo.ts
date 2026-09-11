import { z } from "zod";
import { Chess } from "chess.js";
import { problemasDeLimiteV2 } from "./limites.ts";
import { fenSchema, generatedTemplatesSchema, lessonClassSchema, lessonIdSchema, uciSchema, type Position } from "../lesson/schema.ts";

export const idV2Schema = z.string().regex(/^[a-z][a-z0-9-]*$/, "id interno inválido");
export const aulaIdV2Schema = z.union([
  lessonIdSchema,
  z.string().regex(/^EX-[A-Z0-9-]+$/, "id de aula extra fora do padrão (ex.: EX-OPOSICAO)"),
]);
export const referenciaNoSchema = z.strictObject({
  analiseId: idV2Schema,
  nodeId: idV2Schema,
});

export const desenhoV2Schema = z.strictObject({
  arrows: z.array(z.tuple([z.string(), z.string()])).optional(),
  highlights: z.array(z.string()).optional(),
});

export const metadadosAulaV2Schema = z.strictObject({
  orientacaoPadrao: z.enum(["white", "black"]),
  criterioDominio: z.enum(["D1", "D2", "D3", "D4"]),
  classe: lessonClassSchema.optional(),
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

export const noV2Schema = z.strictObject({
  id: idV2Schema,
  uci: uciSchema.optional(),
  filhos: z.array(idV2Schema),
  comentario: z.string().optional(),
  nags: z.array(z.number().int().min(1).max(255)).optional(),
  desenhos: desenhoV2Schema.optional(),
});

export const analiseV2Schema = z.strictObject({
  id: idV2Schema,
  inicio: z.discriminatedUnion("tipo", [
    z.strictObject({ tipo: z.literal("posicao"), positionId: z.string().min(1) }),
    z.strictObject({ tipo: z.literal("referencia"), origem: referenciaNoSchema }),
  ]),
  raizId: idV2Schema,
  nos: z.record(idV2Schema, noV2Schema),
});

export const quadroIntroducaoV2Schema = z.strictObject({
  id: idV2Schema,
  texto: z.string().min(1),
  posicao: z.discriminatedUnion("tipo", [
    z.strictObject({ tipo: z.literal("referencia"), origem: referenciaNoSchema }),
    z.strictObject({ tipo: z.literal("fen"), fen: fenSchema }),
  ]),
  desenhos: desenhoV2Schema.optional(),
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
});

export const capituloV2Schema = z.strictObject({
  id: idV2Schema,
  titulo: z.string().min(1),
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
});

export const respostaTreinoV2Schema = z.strictObject({
  id: idV2Schema,
  moves: z.array(uciSchema).min(1),
  julgamento: z.enum(["correta", "erro"]),
  feedback: z.string().min(1),
  erroId: idV2Schema.optional(),
  efeito: z.discriminatedUnion("tipo", [
    z.strictObject({
      tipo: z.literal("avanca"),
      defesas: z.array(z.strictObject({ move: uciSchema, proximaQuestaoId: idV2Schema })).min(1),
    }),
    z.strictObject({ tipo: z.literal("repete") }),
    z.strictObject({ tipo: z.literal("encerra"), condicao: z.enum(["mate", "promotion", "draw-secured", "tablebase-win"]) }),
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
    politica: z.enum(["deterministica", "autoral"]),
  }),
  termino: z.strictObject({
    tipo: z.enum(["objetivo", "mate", "limite"]),
    maxPlies: z.number().int().positive().optional(),
  }),
  propriedade: z.enum(["derivado", "personalizado", "independente"]),
  fonte: z.enum(["atual", "alterada", "removida"]),
  origem: origemTreinoV2Schema.optional(),
  obrigatorio: z.boolean().default(true),
  revisaoAvaliacao: z.enum(["pendente", "confirmada"]).default("pendente"),
  certificacao: z.strictObject({
    tipo: z.literal("tablebase"),
    estado: z.enum(["pendente", "herdada-v1", "confirmada", "indisponivel"]),
    positionId: z.string().min(1),
    alvoHash: z.string().min(8),
  }).optional(),
  explicacaoConclusao: z.string().min(1).optional(),
}).superRefine((treino, ctx) => {
  if (treino.perfil === "final-certificado" && !treino.certificacao) ctx.addIssue({ code: "custom", path: ["certificacao"], message: "final certificado precisa declarar o estado da certificação" });
  if (treino.propriedade === "derivado" && !treino.origem) ctx.addIssue({ code: "custom", path: ["origem"], message: "treino derivado precisa declarar sua receita de origem" });
  if (treino.propriedade === "independente" && treino.origem) ctx.addIssue({ code: "custom", path: ["origem"], message: "treino independente não mantém origem operacional" });
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

export const etapaV2Schema = z.strictObject({
  id: idV2Schema,
  tipo: z.enum(["introducao", "capitulo", "treino", "pratica"]),
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
  fluxo: z.array(etapaV2Schema),
  origem: z.strictObject({ formato: z.literal("lesson-v1"), hash: z.string().min(1) }).optional(),
});

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
 */
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
 * identificada; quem exige tudo em ordem é a publicação. **Quando a publicação v2
 * existir, estas duas passam a impedir** — está escrito aqui para não se perder.
 *
 * **`CERTIFICACAO_SEM_APROVACAO` é ERRO.** Ela não descreve o mundo de fora: descreve
 * o documento contradizendo a si mesmo. Um treino que diz "conferido" sobre uma
 * posição que a própria aula não registra como aprovada é uma afirmação falsa escrita
 * pelo autor, e o autor pode desfazê-la na hora. O adaptador nunca a produz — ele
 * carimba `herdada-v1` justamente para não inventar confirmação que ninguém fez.
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
  const registro = new Map(aula.proveniencia.map((item) => [item.positionId, item]));

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

  for (const treino of aula.treinos) {
    const certificacao = treino.certificacao;
    if (certificacao?.estado !== "confirmada") continue;
    const daPosicao = registro.get(certificacao.positionId);
    if (daPosicao?.estado === "approved") continue;
    problemas.push({
      codigo: "CERTIFICACAO_SEM_APROVACAO",
      mensagem:
        `este treino afirma que a posição "${certificacao.positionId}" foi conferida, ` +
        `mas a aula ${daPosicao ? `a registra como "${daPosicao.estado}"` : "não registra a revisão dela"}`,
      treinoId: treino.id,
      campo: "certificacao.estado",
    });
  }

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
    }
    for (const pratica of aula.praticas) {
      if (!proveniencia.has(pratica.positionId)) problemas.push({ codigo: "PRATICA_SEM_PROVENIENCIA", mensagem: `a prática usa ${pratica.positionId} sem registrar sua revisão`, praticaId: pratica.id, campo: "positionId" });
    }
    for (const treino of aula.treinos) {
      if (treino.certificacao && !proveniencia.has(treino.certificacao.positionId)) problemas.push({ codigo: "CERTIFICACAO_SEM_PROVENIENCIA", mensagem: `a certificação usa ${treino.certificacao.positionId} sem registrar sua revisão`, treinoId: treino.id, campo: "certificacao.positionId" });
    }
  }

  for (const introducao of aula.introducoes) {
    for (const quadro of introducao.quadros) {
      if (quadro.posicao.tipo !== "referencia") continue;
      const analise = analises.get(quadro.posicao.origem.analiseId);
      if (!analise?.nos[quadro.posicao.origem.nodeId]) problemas.push({ codigo: "QUADRO_SEM_POSICAO", mensagem: "o quadro da introdução aponta para posição inexistente", introducaoId: introducao.id, quadroId: quadro.id, analiseId: quadro.posicao.origem.analiseId, nodeId: quadro.posicao.origem.nodeId });
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
    if (problemas.length === problemasAntes) analisesSaudaveis.add(analise.id);
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
    }
  }

  for (const treino of aula.treinos) {
    const analise = analises.get(treino.inicio.analiseId);
    if (!analise?.nos[treino.inicio.nodeId]) problemas.push({ codigo: "TREINO_SEM_INICIO", mensagem: "o treino aponta para posição inicial inexistente", treinoId: treino.id, analiseId: treino.inicio.analiseId, nodeId: treino.inicio.nodeId, campo: "inicio" });
    const questoes = new Set(treino.questoes.map((questao) => questao.id));
    for (const questao of treino.questoes) {
      const analiseDaQuestao = analises.get(questao.posicao.analiseId);
      if (!analiseDaQuestao?.nos[questao.posicao.nodeId]) problemas.push({ codigo: "QUESTAO_SEM_POSICAO", mensagem: "a questão do treino aponta para posição inexistente", treinoId: treino.id, questaoId: questao.id, analiseId: questao.posicao.analiseId, nodeId: questao.posicao.nodeId, campo: "posicao" });
      for (const resposta of questao.respostas) {
        if (resposta.erroId && !errosCatalogados.has(resposta.erroId)) problemas.push({ codigo: "ERRO_NAO_CATALOGADO", mensagem: `a resposta usa o erro ${resposta.erroId}, que não existe no catálogo`, treinoId: treino.id, questaoId: questao.id, respostaId: resposta.id, campo: "erroId" });
        if (resposta.efeito.tipo !== "avanca") continue;
        for (const defesa of resposta.efeito.defesas) if (!questoes.has(defesa.proximaQuestaoId)) problemas.push({ codigo: "DEFESA_SEM_QUESTAO", mensagem: "a resposta do defensor aponta para questão inexistente", treinoId: treino.id, questaoId: questao.id, respostaId: resposta.id, campo: "efeito.defesas.proximaQuestaoId" });
      }
    }
    if (treino.origem && !(treino.propriedade === "personalizado" && treino.fonte === "removida")) {
      const origem = analises.get(treino.origem.analiseId);
      for (const nodeId of treino.origem.nodeIds) if (!origem?.nos[nodeId]) problemas.push({ codigo: "FONTE_TREINO_AUSENTE", mensagem: "a receita do treino aponta para nó inexistente", treinoId: treino.id, analiseId: treino.origem.analiseId, nodeId, campo: "origem.nodeIds" });
    }
  }

  const introducoes = new Set(aula.introducoes.map((i) => i.id));
  const capitulos = new Set(aula.capitulos.map((c) => c.id));
  const treinos = new Set(aula.treinos.map((t) => t.id));
  const praticas = new Set(aula.praticas.map((p) => p.id));
  const aparicoesNoFluxo = new Map<string, number>();
  for (const etapa of aula.fluxo) {
    aparicoesNoFluxo.set(etapa.entidadeId, (aparicoesNoFluxo.get(etapa.entidadeId) ?? 0) + 1);
    if ((aparicoesNoFluxo.get(etapa.entidadeId) ?? 0) > 1) problemas.push({ codigo: "FLUXO_REPETE_ENTIDADE", mensagem: `o fluxo repete a entidade ${etapa.entidadeId}`, etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "introducao" && !introducoes.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_INTRODUCAO", mensagem: "o fluxo aponta para introdução inexistente", etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "capitulo" && !capitulos.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_CAPITULO", mensagem: "o fluxo aponta para capítulo inexistente", etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "treino" && !treinos.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_TREINO", mensagem: "o fluxo aponta para treino inexistente", etapaId: etapa.id, campo: "entidadeId" });
    if (etapa.tipo === "pratica" && !praticas.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_PRATICA", mensagem: "o fluxo aponta para prática inexistente", etapaId: etapa.id, campo: "entidadeId" });
  }
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
