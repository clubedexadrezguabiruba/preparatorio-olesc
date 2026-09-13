import type { Position } from "../lesson/schema.ts";
import { caminhoAte, quadroDoNo } from "./arvore.ts";
import type { AulaV2, QuestaoTreinoV2, TreinoV2 } from "./modelo.ts";
import { prepararTreinosDaqui } from "./treinos.ts";

export type PosicaoMaterializadaTreinoV2 = NonNullable<TreinoV2["copia"]>["inicio"];

export type DiferencaTreinoV2 = {
  campo: string;
  antes: string;
  depois: string;
};

export type PlanoDeRefazerTreinoV2 = {
  treinoId: string;
  antes: TreinoV2;
  depois: TreinoV2;
  diferencas: DiferencaTreinoV2[];
  fonteHash: string;
};

export type ResultadoDeRefazerTreinoV2 =
  | { ok: true; plano: PlanoDeRefazerTreinoV2 }
  | { ok: false; mensagem: string };

function hashPortatil(valor: unknown): string {
  const texto = JSON.stringify(valor);
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `v2-${hash.toString(16).padStart(8, "0")}`;
}

function capituloDaOrigem(aula: AulaV2, treino: TreinoV2) {
  if (treino.origem?.capituloId) {
    return aula.capitulos.find((capitulo) => capitulo.id === treino.origem?.capituloId);
  }
  const inicio = treino.origem?.inicioNodeId ?? treino.inicio.nodeId;
  return aula.capitulos.find((capitulo) =>
    capitulo.analiseId === treino.origem?.analiseId
    && [capitulo.inicioNodeId, ...capitulo.caminho].includes(inicio));
}

export function comOrigemHistoricaCompleta(aula: AulaV2, treino: TreinoV2): TreinoV2 {
  if (!treino.origem) return treino;
  const capitulo = capituloDaOrigem(aula, treino);
  const origem = {
    ...treino.origem,
    ...(treino.origem.capituloId || !capitulo ? {} : { capituloId: capitulo.id }),
    ...(treino.origem.inicioNodeId ? {} : { inicioNodeId: treino.inicio.nodeId }),
    ...(treino.origem.objetivo ? {} : { objetivo: treino.objetivo }),
  };
  return JSON.stringify(origem) === JSON.stringify(treino.origem) ? treino : { ...treino, origem };
}

/** Campos da aula que a receita lê. Título do treino e ordem do fluxo ficam fora. */
export function retratoDaFonteDoTreino(aula: AulaV2, treino: TreinoV2): unknown | null {
  const origem = treino.origem;
  if (!origem) return null;
  const analise = aula.analises.find((item) => item.id === origem.analiseId);
  const capitulo = capituloDaOrigem(aula, treino);
  if (!analise || !capitulo || origem.nodeIds.some((id) => !analise.nos[id])) return null;
  return {
    derivadorVersao: origem.derivadorVersao,
    analiseInicio: analise.inicio,
    nodes: origem.nodeIds.map((id) => ({
      id,
      uci: analise.nos[id]?.uci ?? null,
      comentario: analise.nos[id]?.comentario ?? null,
    })),
    narracoes: capitulo.narracoes
      .filter((item) => origem.nodeIds.includes(item.nodeId))
      .map((item) => ({ nodeId: item.nodeId, texto: item.texto })),
    lado: treino.ladoAluno,
    objetivo: origem.objetivo ?? treino.objetivo,
    inicioNodeId: origem.inicioNodeId ?? treino.inicio.nodeId,
  };
}

export function hashAtualDaFonte(aula: AulaV2, treino: TreinoV2): string | null {
  const retrato = retratoDaFonteDoTreino(aula, treino);
  return retrato === null ? null : hashPortatil(retrato);
}

function posicaoMaterializada(
  aula: AulaV2,
  referencia: { analiseId: string; nodeId: string },
  positions: Record<string, Position>,
): PosicaoMaterializadaTreinoV2 {
  const analise = aula.analises.find((item) => item.id === referencia.analiseId);
  if (!analise?.nos[referencia.nodeId]) throw new Error("a posição que o treino usa não existe mais");
  return {
    fen: quadroDoNo(aula, referencia.analiseId, referencia.nodeId, positions).fen,
    historicoUci: caminhoAte(analise, referencia.nodeId).flatMap((no) => no.uci ? [no.uci] : []),
    origem: referencia,
  };
}

/** Materializa toda posição operacional antes de a autoria deixar de depender da análise. */
export function comCopiaMaterializada(aula: AulaV2, treino: TreinoV2, positions: Record<string, Position>): TreinoV2 {
  const mesmaOrigem = (
    copia: PosicaoMaterializadaTreinoV2 | undefined,
    referencia: { analiseId: string; nodeId: string },
  ) => copia?.origem.analiseId === referencia.analiseId && copia.origem.nodeId === referencia.nodeId;
  const inicio = mesmaOrigem(treino.copia?.inicio, treino.inicio)
    ? treino.copia!.inicio
    : posicaoMaterializada(aula, treino.inicio, positions);
  return {
    ...treino,
    copia: {
      inicio,
      questoes: Object.fromEntries(treino.questoes.map((questao) => [
        questao.id,
        mesmaOrigem(treino.copia?.questoes[questao.id], questao.posicao)
          ? treino.copia!.questoes[questao.id]
          : posicaoMaterializada(aula, questao.posicao, positions),
      ])),
    },
  };
}

export function fenInicialDoTreino(aula: AulaV2, treino: TreinoV2, positions: Record<string, Position>): string {
  if (treino.propriedade !== "derivado" && treino.copia) return treino.copia.inicio.fen;
  return quadroDoNo(aula, treino.inicio.analiseId, treino.inicio.nodeId, positions).fen;
}

export function fenDaQuestaoDoTreino(
  aula: AulaV2,
  treino: TreinoV2,
  questao: QuestaoTreinoV2,
  positions: Record<string, Position>,
): string {
  const copiada = treino.propriedade !== "derivado" ? treino.copia?.questoes[questao.id] : undefined;
  if (copiada
    && copiada.origem.analiseId === questao.posicao.analiseId
    && copiada.origem.nodeId === questao.posicao.nodeId) return copiada.fen;
  return quadroDoNo(aula, questao.posicao.analiseId, questao.posicao.nodeId, positions).fen;
}

/** Recalcula apenas quando a própria fonte mudou; uma edição sem relação não acende aviso. */
export function comEstadosDasFontes(antes: AulaV2, depois: AulaV2): AulaV2 {
  let mudou = false;
  const anteriores = new Map(antes.treinos.map((treino) => [treino.id, treino]));
  const treinos = depois.treinos.map((treino) => {
    const anterior = anteriores.get(treino.id);
    if (!anterior?.origem || !treino.origem) return treino;
    const havia = retratoDaFonteDoTreino(antes, anterior);
    const agora = retratoDaFonteDoTreino(depois, treino);
    const fonte = agora === null ? "removida" as const
      : treino.origem.hash.startsWith("v2-") && hashPortatil(agora) === treino.origem.hash ? "atual" as const
      : treino.fonte !== anterior.fonte ? treino.fonte
      : havia !== null && JSON.stringify(havia) !== JSON.stringify(agora) ? "alterada" as const
      : treino.fonte;
    if (fonte === treino.fonte) return treino;
    mudou = true;
    return { ...treino, fonte };
  });
  return mudou ? { ...depois, treinos } : depois;
}

export function tornarTreinoIndependente(
  aula: AulaV2,
  treinoId: string,
  positions: Record<string, Position>,
): AulaV2 {
  const treino = aula.treinos.find((item) => item.id === treinoId);
  if (!treino) throw new Error("este treino não existe mais");
  if (treino.propriedade === "independente") return aula;
  const independente = { ...comCopiaMaterializada(aula, comOrigemHistoricaCompleta(aula, treino), positions), propriedade: "independente" as const };
  return { ...aula, treinos: aula.treinos.map((item) => item.id === treinoId ? independente : item) };
}

function resumo(valor: unknown): string {
  if (valor === undefined || valor === null || valor === "") return "—";
  if (Array.isArray(valor)) return `${valor.length} item${valor.length === 1 ? "" : "s"}`;
  return typeof valor === "string" ? valor : JSON.stringify(valor);
}

function textosDasDefesas(treino: TreinoV2): string[] {
  return [
    treino.defesaInicial?.texto,
    ...treino.questoes.flatMap((questao) => questao.respostas.flatMap((resposta) =>
      resposta.efeito.tipo === "avanca"
        ? resposta.efeito.defesas.map((defesa) => defesa.texto)
        : resposta.efeito.tipo === "encerra" ? [resposta.efeito.textoDaDefesaFinal] : [])),
  ].filter((texto): texto is string => Boolean(texto));
}

function diferencas(antes: TreinoV2, depois: TreinoV2): DiferencaTreinoV2[] {
  const respostas = (treino: TreinoV2) => treino.questoes.flatMap((questao, qi) => questao.respostas.map((resposta) =>
    `P${qi + 1} ${resposta.moves.join("/")} (${resposta.julgamento}): ${resposta.feedback}`)).join(" · ") || "—";
  const dicas = (treino: TreinoV2) => treino.questoes.map((questao, qi) =>
    `P${qi + 1}: ${questao.dica ?? "sem dica"}${questao.desenhos ? "; com desenho" : ""}`).join(" · ");
  const perguntas = (treino: TreinoV2) => treino.questoes.map((questao, qi) =>
    `P${qi + 1} em ${questao.posicao.nodeId}`).join(" · ");
  const defesas = (treino: TreinoV2) => textosDasDefesas(treino).join(" · ") || "—";
  const pares: Array<[string, unknown, unknown, string, string]> = [
    ["Posição inicial", antes.inicio, depois.inicio, resumo(antes.inicio), resumo(depois.inicio)],
    ["Objetivo", antes.objetivo, depois.objetivo, resumo(antes.objetivo), resumo(depois.objetivo)],
    ["Perguntas", antes.questoes.map((q) => q.posicao), depois.questoes.map((q) => q.posicao), perguntas(antes), perguntas(depois)],
    ["Respostas e feedbacks", antes.questoes.flatMap((q) => q.respostas), depois.questoes.flatMap((q) => q.respostas), respostas(antes), respostas(depois)],
    ["Dicas e desenhos", antes.questoes.map((q) => ({ dica: q.dica, desenhos: q.desenhos })), depois.questoes.map((q) => ({ dica: q.dica, desenhos: q.desenhos })), dicas(antes), dicas(depois)],
    ["Textos próprios das defesas", textosDasDefesas(antes), textosDasDefesas(depois), defesas(antes), defesas(depois)],
    ["Explicação ao concluir", antes.explicacaoConclusao, depois.explicacaoConclusao, resumo(antes.explicacaoConclusao), resumo(depois.explicacaoConclusao)],
    ["Término", antes.termino, depois.termino, resumo(antes.termino), resumo(depois.termino)],
  ];
  return pares.filter(([, a, b]) => JSON.stringify(a) !== JSON.stringify(b))
    .map(([campo, , , textoAntes, textoDepois]) => ({ campo, antes: textoAntes, depois: textoDepois }));
}

function remapearIdsDasQuestoes(antes: TreinoV2, depois: TreinoV2): TreinoV2 {
  const porOrigem = new Map(antes.questoes.map((questao) => [
    `${questao.posicao.analiseId}/${questao.posicao.nodeId}`,
    questao.id,
  ]));
  const mapa = new Map<string, string>();
  const questoes = depois.questoes.map((questao) => {
    const preservado = porOrigem.get(`${questao.posicao.analiseId}/${questao.posicao.nodeId}`);
    const id = preservado ?? questao.id;
    mapa.set(questao.id, id);
    return { ...questao, id };
  }).map((questao) => ({
    ...questao,
    respostas: questao.respostas.map((resposta) => resposta.efeito.tipo !== "avanca" ? resposta : {
      ...resposta,
      efeito: {
        ...resposta.efeito,
        defesas: resposta.efeito.defesas.map((defesa) => ({
          ...defesa,
          proximaQuestaoId: mapa.get(defesa.proximaQuestaoId) ?? defesa.proximaQuestaoId,
        })),
      },
    }),
  }));
  const defesaInicial = depois.defesaInicial ? {
    ...depois.defesaInicial,
    primeiraQuestaoId: mapa.get(depois.defesaInicial.primeiraQuestaoId) ?? depois.defesaInicial.primeiraQuestaoId,
  } : undefined;
  return { ...depois, questoes, ...(defesaInicial ? { defesaInicial } : {}) };
}

export function prepararRefazerTreino(
  aula: AulaV2,
  treinoId: string,
  positions: Record<string, Position>,
  novaFonte?: { capituloId: string; nodeId: string },
): ResultadoDeRefazerTreinoV2 {
  const antes = aula.treinos.find((item) => item.id === treinoId);
  if (!antes) return { ok: false, mensagem: "este treino não existe mais" };
  const capitulo = novaFonte
    ? aula.capitulos.find((item) => item.id === novaFonte.capituloId)
    : capituloDaOrigem(aula, antes);
  const nodeId = novaFonte?.nodeId ?? antes.origem?.inicioNodeId ?? antes.inicio.nodeId;
  if (!capitulo || !aula.analises.find((item) => item.id === capitulo.analiseId)?.nos[nodeId]) {
    return { ok: false, mensagem: "a fonte foi removida; escolha um capítulo novo antes de refazer" };
  }
  const objetivo = antes.origem?.objetivo ?? antes.objetivo;
  const preparo = prepararTreinosDaqui(aula, {
    capituloId: capitulo.id,
    nodeId,
    titulo: antes.titulo,
    objetivo,
    lado: antes.ladoAluno,
    colocacao: "depois-do-capitulo",
    obrigatorio: antes.obrigatorio,
  }, positions);
  if (!preparo.ok) return { ok: false, mensagem: preparo.mensagem };
  const gerado = preparo.preparo.treinos[0];
  const comIds = remapearIdsDasQuestoes(antes, gerado);
  const depois: TreinoV2 = {
    ...comIds,
    id: antes.id,
    titulo: antes.titulo,
    perfil: antes.perfil,
    ...(antes.certificacao ? { certificacao: { ...antes.certificacao, estado: "pendente" } } : {}),
    origem: {
      ...comIds.origem!,
      capituloId: capitulo.id,
      inicioNodeId: nodeId,
      objetivo,
      hash: hashAtualDaFonte(aula, { ...comIds, origem: { ...comIds.origem!, capituloId: capitulo.id, inicioNodeId: nodeId, objetivo } })!,
    },
    propriedade: "derivado",
    fonte: "atual",
  };
  delete depois.copia;
  return { ok: true, plano: { treinoId, antes: structuredClone(antes), depois, diferencas: diferencas(antes, depois), fonteHash: hashAtualDaFonte(aula, depois)! } };
}

export function aplicarRefazerTreino(aula: AulaV2, plano: PlanoDeRefazerTreinoV2): AulaV2 {
  const atual = aula.treinos.find((item) => item.id === plano.treinoId);
  if (!atual) throw new Error("este treino não existe mais");
  if (JSON.stringify(atual) !== JSON.stringify(plano.antes)) {
    throw new Error("o treino mudou depois da comparação; abra a comparação novamente");
  }
  if (hashAtualDaFonte(aula, plano.depois) !== plano.fonteHash) {
    throw new Error("a aula mudou depois da comparação; abra a comparação novamente");
  }
  return { ...aula, treinos: aula.treinos.map((item) => item.id === plano.treinoId ? plano.depois : item) };
}
