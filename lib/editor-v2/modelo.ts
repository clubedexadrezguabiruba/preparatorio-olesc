import { z } from "zod";
import { uciSchema } from "../lesson/schema.ts";

export const idV2Schema = z.string().regex(/^[a-z][a-z0-9-]*$/, "id interno inválido");
export const referenciaNoSchema = z.strictObject({
  analiseId: idV2Schema,
  nodeId: idV2Schema,
});

export const desenhoV2Schema = z.strictObject({
  arrows: z.array(z.tuple([z.string(), z.string()])).optional(),
  highlights: z.array(z.string()).optional(),
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
  explicacaoConclusao: z.string().min(1).optional(),
}).superRefine((treino, ctx) => {
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
  tipo: z.enum(["capitulo", "treino", "pratica"]),
  entidadeId: idV2Schema,
});

export const aulaV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  id: z.string().min(1),
  titulo: z.string().min(1),
  analises: z.array(analiseV2Schema),
  capitulos: z.array(capituloV2Schema),
  treinos: z.array(treinoV2Schema),
  praticas: z.array(praticaV2Schema).default([]),
  fluxo: z.array(etapaV2Schema),
  origem: z.strictObject({ formato: z.literal("lesson-v1"), hash: z.string().min(1) }).optional(),
});

export type ReferenciaNoV2 = z.infer<typeof referenciaNoSchema>;
export type NoV2 = z.infer<typeof noV2Schema>;
export type AnaliseV2 = z.infer<typeof analiseV2Schema>;
export type NarracaoV2 = z.infer<typeof narracaoV2Schema>;
export type CapituloV2 = z.infer<typeof capituloV2Schema>;
export type RespostaTreinoV2 = z.infer<typeof respostaTreinoV2Schema>;
export type QuestaoTreinoV2 = z.infer<typeof questaoTreinoV2Schema>;
export type TreinoV2 = z.infer<typeof treinoV2Schema>;
export type PraticaV2 = z.infer<typeof praticaV2Schema>;
export type AulaV2 = z.infer<typeof aulaV2Schema>;

export type ProblemaV2 = {
  codigo: string;
  mensagem: string;
  analiseId?: string;
  capituloId?: string;
  nodeId?: string;
};

/** Valida referências e a forma de árvore que o schema isolado não consegue enxergar. */
export function problemasDaAulaV2(aula: AulaV2): ProblemaV2[] {
  const problemas: ProblemaV2[] = [];
  const ids = new Set<string>();
  const registrar = (id: string, tipo: string) => {
    if (ids.has(id)) problemas.push({ codigo: "ID_DUPLICADO", mensagem: `${tipo} repete o id ${id}` });
    ids.add(id);
  };
  aula.analises.forEach((a) => registrar(a.id, "análise"));
  aula.capitulos.forEach((c) => registrar(c.id, "capítulo"));
  aula.treinos.forEach((t) => {
    registrar(t.id, "treino");
    t.questoes.forEach((q) => {
      registrar(q.id, "questão de treino");
      q.respostas.forEach((r) => registrar(r.id, "resposta de treino"));
    });
  });
  aula.praticas.forEach((p) => registrar(p.id, "prática"));
  aula.fluxo.forEach((e) => registrar(e.id, "etapa"));

  const analises = new Map(aula.analises.map((a) => [a.id, a]));
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
  for (const analise of aula.analises) {
    for (const [chave, no] of Object.entries(analise.nos)) {
      if (chave !== no.id) {
        problemas.push({ codigo: "NO_CHAVE_DIVERGE", mensagem: `${chave} contém ${no.id}`, analiseId: analise.id, nodeId: no.id });
      }
      registrar(no.id, "nó");
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
  }

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
      if (!analise.nos[narracao.nodeId]) problemas.push({ codigo: "NARRACAO_SEM_NO", mensagem: "a narração aponta para posição inexistente", capituloId: capitulo.id, nodeId: narracao.nodeId });
    }
  }

  for (const treino of aula.treinos) {
    const analise = analises.get(treino.inicio.analiseId);
    if (!analise?.nos[treino.inicio.nodeId]) problemas.push({ codigo: "TREINO_SEM_INICIO", mensagem: "o treino aponta para posição inicial inexistente", nodeId: treino.inicio.nodeId });
    const questoes = new Set(treino.questoes.map((questao) => questao.id));
    for (const questao of treino.questoes) {
      const analiseDaQuestao = analises.get(questao.posicao.analiseId);
      if (!analiseDaQuestao?.nos[questao.posicao.nodeId]) problemas.push({ codigo: "QUESTAO_SEM_POSICAO", mensagem: "a questão do treino aponta para posição inexistente", nodeId: questao.posicao.nodeId });
      for (const resposta of questao.respostas) {
        if (resposta.efeito.tipo !== "avanca") continue;
        for (const defesa of resposta.efeito.defesas) if (!questoes.has(defesa.proximaQuestaoId)) problemas.push({ codigo: "DEFESA_SEM_QUESTAO", mensagem: "a resposta do defensor aponta para questão inexistente" });
      }
    }
    if (treino.origem && !(treino.propriedade === "personalizado" && treino.fonte === "removida")) {
      const origem = analises.get(treino.origem.analiseId);
      for (const nodeId of treino.origem.nodeIds) if (!origem?.nos[nodeId]) problemas.push({ codigo: "FONTE_TREINO_AUSENTE", mensagem: "a receita do treino aponta para nó inexistente", nodeId });
    }
  }

  const capitulos = new Set(aula.capitulos.map((c) => c.id));
  const treinos = new Set(aula.treinos.map((t) => t.id));
  const praticas = new Set(aula.praticas.map((p) => p.id));
  for (const etapa of aula.fluxo) {
    if (etapa.tipo === "capitulo" && !capitulos.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_CAPITULO", mensagem: "o fluxo aponta para capítulo inexistente" });
    if (etapa.tipo === "treino" && !treinos.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_TREINO", mensagem: "o fluxo aponta para treino inexistente" });
    if (etapa.tipo === "pratica" && !praticas.has(etapa.entidadeId)) problemas.push({ codigo: "FLUXO_SEM_PRATICA", mensagem: "o fluxo aponta para prática inexistente" });
  }
  return problemas;
}

export function validarAulaV2(valor: unknown): { ok: true; aula: AulaV2 } | { ok: false; problemas: string[] } {
  const forma = aulaV2Schema.safeParse(valor);
  if (!forma.success) return { ok: false, problemas: forma.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`) };
  const problemas = problemasDaAulaV2(forma.data);
  return problemas.length === 0 ? { ok: true, aula: forma.data } : { ok: false, problemas: problemas.map((p) => `[${p.codigo}] ${p.mensagem}`) };
}
