/**
 * Mudar o modo de uma parte da aula depois de criada — pedido do Doug de 15/9/2026.
 *
 * Na importação do estudo o professor escolhe o que cada capítulo vira (introdução, capítulo, treino,
 * prática). Antes daqui, a escolha era para sempre: um capítulo marcado como introdução por engano só
 * voltava apagando e importando de novo. Agora o `•••` de cada parte oferece **Mudar para…**.
 *
 * ## As decisões do Doug
 *
 * - **No `•••` da própria parte**, e não reabrindo a janela do estudo: o que foi editado depois da
 *   importação nas outras partes não é tocado.
 * - **Guardar o possível**: lances, variantes, comentários e desenhos continuam na aula; o que não tem
 *   lugar na parte nova sai, e a janela diz exatamente o quê **antes** de confirmar. Um Desfazer devolve.
 *
 * ## O capítulo é a ponte
 *
 * Toda mudança passa por um capítulo: primeiro a parte vira capítulo, depois o capítulo vira o destino.
 * Treino → introdução é treino → capítulo → introdução. Assim cada tipo só sabe ir e voltar do
 * capítulo, e não existem seis conversões com seis opiniões sobre o que se perde.
 *
 * ## Onde ficam os lances
 *
 * Nenhuma mudança apaga análise. Um capítulo que vira introdução deixa a análise na aula, sem capítulo,
 * e o quadro aponta para a posição inicial dela — é o mesmo arranjo do treino importado. Por isso
 * "Mudar para capítulo" num quadro traz os lances de volta **quando nenhum outro capítulo mostra
 * aquela análise**; se outro capítulo a mostra, o quadro só emprestou a posição, e o capítulo novo
 * começa parado nela, sem roubar os lances do vizinho.
 *
 * Prática fica fora desta parada: ela depende do acervo (servidor). A regra de uma prática por aula, que
 * também a prendia, caiu em 15/9/2026 (trava 9).
 */
import type { Position } from "../lesson/schema.ts";
import { comErrosNoCatalogo, completarTreino } from "./importar-estudo.ts";
import { comoId, idsDaAulaV2 } from "./ids.ts";
import { fluxoSemCapitulos, soltarVariantes } from "./fluxo.ts";
import type { AnaliseV2, AulaV2, CapituloV2, IntroducaoV2, NarracaoV2, QuadroIntroducaoV2, TreinoV2 } from "./modelo.ts";
import { tornarTreinoIndependente } from "./propriedade-treino.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";

export type ModoDaParteV2 = "introducao" | "capitulo" | "treino";

export type ParteDaAulaV2 =
  | { tipo: "capitulo"; capituloId: string }
  | { tipo: "treino"; treinoId: string }
  | { tipo: "quadro"; introducaoId: string; quadroId: string };

export type MudancaDeModoV2 = {
  aula: AulaV2;
  /** A parte nova, para a tela selecioná-la. */
  nova: ParteDaAulaV2;
  /** O que o aluno deixa de ver ou o que sai do documento — a janela mostra antes de confirmar. */
  saem: string[];
  /** O que atravessa para a parte nova. */
  ficam: string[];
  /** Pontos para o professor revisar depois (variante sem símbolo que virou erro, por exemplo). */
  avisos: string[];
};

export type ResultadoDaMudancaV2 = { ok: true; mudanca: MudancaDeModoV2 } | { ok: false; mensagem: string };

export const NOME_DO_MODO: Record<ModoDaParteV2, string> = { introducao: "introdução", capitulo: "capítulo", treino: "treino" };

/** O texto padrão da derivação, que não é autoria de ninguém e não vira narração. */
const FEEDBACK_PADRAO = "Boa. Continue pela linha ensinada.";

type Passo = { aula: AulaV2; capituloId: string; saem: string[]; ficam: string[]; avisos: string[] };
type Falha = { ok: false; mensagem: string };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const trecho = (texto: string) => {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return `«${limpo.length > 50 ? `${limpo.slice(0, 47).trim()}…` : limpo}»`;
};

function idLivre(usados: Set<string>, base: string): string {
  let id = base;
  for (let n = 2; usados.has(id); n += 1) id = `${base}-${n}`;
  usados.add(id);
  return id;
}

/** A linha principal a partir de um nó: o primeiro filho, de novo e de novo. Não inclui o nó. */
function linhaPrincipal(analise: AnaliseV2, nodeId: string): string[] {
  const ids: string[] = [];
  let atual = analise.nos[nodeId];
  while (atual?.filhos[0] && !ids.includes(atual.filhos[0])) {
    ids.push(atual.filhos[0]);
    atual = analise.nos[atual.filhos[0]];
  }
  return ids;
}

export function modoDaParte(parte: ParteDaAulaV2): ModoDaParteV2 {
  return parte.tipo === "quadro" ? "introducao" : parte.tipo;
}

export function nomeDaParte(aula: AulaV2, parte: ParteDaAulaV2): string | null {
  if (parte.tipo === "capitulo") return aula.capitulos.find((c) => c.id === parte.capituloId)?.titulo ?? null;
  if (parte.tipo === "treino") return aula.treinos.find((t) => t.id === parte.treinoId)?.titulo ?? null;
  const quadro = aula.introducoes.find((i) => i.id === parte.introducaoId)?.quadros.find((q) => q.id === parte.quadroId);
  return quadro ? quadro.titulo ?? trecho(quadro.texto).slice(1, -1) : null;
}

/** Troca a etapa `antiga` do fluxo pela `nova`, no mesmo lugar. Sem etapa antiga, entra antes da prática. */
function fluxoComTroca(fluxo: AulaV2["fluxo"], antiga: (etapa: AulaV2["fluxo"][number]) => boolean, nova: AulaV2["fluxo"][number] | null): AulaV2["fluxo"] {
  const indice = fluxo.findIndex(antiga);
  const semAntiga = fluxo.filter((etapa, i) => i !== indice);
  if (!nova) return semAntiga;
  const pratica = semAntiga.findIndex((etapa) => etapa.tipo === "pratica");
  const lugar = indice >= 0 ? indice : pratica >= 0 ? pratica : semAntiga.length;
  return [...semAntiga.slice(0, lugar), nova, ...semAntiga.slice(lugar)];
}

/**
 * Treinos derivados que acompanham este capítulo. Quando o capítulo sai, eles ficariam com a fonte
 * removida — e treino derivado sem fonte não publica (plano §5). Por isso viram independentes antes.
 */
function soltarTreinosDoCapitulo(aula: AulaV2, capituloId: string, positions: Record<string, Position>, saem: string[]): AulaV2 {
  let atual = aula;
  for (const treino of aula.treinos) {
    if (treino.propriedade !== "derivado" || treino.origem?.capituloId !== capituloId) continue;
    atual = tornarTreinoIndependente(atual, treino.id, positions);
    saem.push(`o treino «${treino.titulo}» deixa de acompanhar as mudanças deste capítulo (fica com a cópia que tem hoje)`);
  }
  return atual;
}

/* ------------------------------------------------------------------ *
 * Primeiro passo: a parte vira capítulo
 * ------------------------------------------------------------------ */

function treinoParaCapitulo(aula: AulaV2, treino: TreinoV2): Passo | Falha {
  const analise = aula.analises.find((item) => item.id === treino.inicio.analiseId);
  if (!analise?.nos[treino.inicio.nodeId]) {
    return { ok: false, mensagem: "os lances de onde este treino nasceu não estão mais na aula — não há linha para mostrar num capítulo" };
  }
  const usados = idsDaAulaV2(aula);
  const origem = treino.origem?.capituloId;
  const capituloId = origem && !usados.has(origem) && !usados.has(`etapa-${origem}`)
    ? (usados.add(origem), origem)
    : idLivre(usados, `capitulo-${comoId(treino.titulo, "treino")}`);
  const inicio = treino.inicio.nodeId;
  const caminho = linhaPrincipal(analise, inicio);
  const naLinha = new Set([inicio, ...caminho]);
  const filhoCom = (paiId: string, uci: string) => analise.nos[paiId]?.filhos.find((id) => analise.nos[id]?.uci === uci);

  // Os textos do treino, cada um no lance a que pertence.
  const textos = new Map<string, string[]>();
  const guardar = (nodeId: string | undefined, texto: string | undefined) => {
    if (!nodeId || !texto || texto === FEEDBACK_PADRAO || !naLinha.has(nodeId)) return false;
    const lista = textos.get(nodeId) ?? [];
    if (!lista.includes(texto)) textos.set(nodeId, [...lista, texto]);
    return true;
  };
  guardar(inicio, treino.introducao ?? treino.objetivo);
  if (treino.defesaInicial) guardar(filhoCom(inicio, treino.defesaInicial.move), treino.defesaInicial.texto);
  let respostasFora = 0;
  let dicas = 0;
  let desenhosDasPerguntas = 0;
  let ultimoDaLinha = inicio;
  for (const questao of treino.questoes) {
    if (questao.dica) dicas += 1;
    if (questao.desenhos) desenhosDasPerguntas += 1;
    for (const resposta of questao.respostas) {
      const lance = filhoCom(questao.posicao.nodeId, resposta.moves[0]);
      if (resposta.julgamento === "erro" || !lance || !naLinha.has(lance)) { respostasFora += 1; continue; }
      if (!guardar(lance, resposta.feedback)) guardar(lance, analise.nos[lance]?.comentario);
      ultimoDaLinha = lance;
      if (resposta.efeito.tipo === "avanca") for (const defesa of resposta.efeito.defesas) guardar(filhoCom(lance, defesa.move), defesa.texto);
      if (resposta.efeito.tipo === "encerra" && resposta.efeito.defesaFinal) {
        const fim = filhoCom(lance, resposta.efeito.defesaFinal);
        guardar(fim, resposta.efeito.textoDaDefesaFinal);
        if (fim && naLinha.has(fim)) ultimoDaLinha = fim;
      }
    }
  }
  if (treino.explicacaoConclusao) guardar(ultimoDaLinha, treino.explicacaoConclusao);
  // O lance da linha que o treino não comentou fica com o comentário da análise, como na importação.
  for (const nodeId of caminho) if (!textos.has(nodeId)) guardar(nodeId, analise.nos[nodeId]?.comentario);

  const narracoes: NarracaoV2[] = [...naLinha].flatMap((nodeId) => (textos.get(nodeId) ?? []).map((texto, i) => ({
    id: idLivre(usados, i === 0 ? `narracao-${nodeId}` : `narracao-${nodeId}-${i + 1}`),
    nodeId,
    texto,
    pausa: "temporizada" as const,
  })));
  const capitulo: CapituloV2 = { id: capituloId, titulo: treino.titulo, analiseId: analise.id, inicioNodeId: inicio, caminho, orientacao: treino.ladoAluno, narracoes };
  const etapaId = idLivre(usados, `etapa-${capituloId}`);

  // Erros nomeados que só este treino usava saem do catálogo junto com ele.
  const usadosPorOutros = new Set(aula.treinos.filter((t) => t.id !== treino.id).flatMap((t) => t.questoes.flatMap((q) => q.respostas.flatMap((r) => r.erroId ? [r.erroId] : []))));
  const doTreino = new Set(treino.questoes.flatMap((q) => q.respostas.flatMap((r) => r.erroId ? [r.erroId] : [])));
  const errosQueSaem = (aula.catalogo?.erros ?? []).filter((erro) => doTreino.has(erro.id) && !usadosPorOutros.has(erro.id));
  const catalogo = aula.catalogo && errosQueSaem.length
    ? { ...aula.catalogo, erros: aula.catalogo.erros.filter((erro) => !errosQueSaem.includes(erro)) }
    : aula.catalogo;

  const saem: string[] = [];
  if (respostasFora) saem.push(`${plural(respostasFora, "resposta fora da linha principal", "respostas fora da linha principal")} (erros nomeados e alternativas) — os lances continuam na análise, mas o aluno só assiste à linha principal`);
  if (errosQueSaem.length) saem.push(`${plural(errosQueSaem.length, "erro nomeado", "erros nomeados")} do catálogo que só este treino usava`);
  if (dicas) saem.push(plural(dicas, "dica", "dicas"));
  if (desenhosDasPerguntas) saem.push(`os desenhos de ${plural(desenhosDasPerguntas, "pergunta", "perguntas")}`);
  if (treino.obrigatorio) saem.push("a tarefa obrigatória: assistir a um capítulo não conta como treino feito");

  const ficam = [
    `${plural(caminho.length, "lance", "lances")} da linha principal, para assistir`,
    `${plural(narracoes.length, "texto do treino vira narração", "textos do treino viram narração")}`,
  ];

  return {
    aula: {
      ...aula,
      ...(catalogo ? { catalogo } : {}),
      capitulos: [...aula.capitulos, capitulo],
      treinos: aula.treinos.filter((item) => item.id !== treino.id),
      fluxo: fluxoComTroca(aula.fluxo, (etapa) => etapa.tipo === "treino" && etapa.entidadeId === treino.id, { id: etapaId, tipo: "capitulo", entidadeId: capituloId }),
    },
    capituloId,
    saem,
    ficam,
    avisos: [],
  };
}

function quadroParaCapitulo(aula: AulaV2, introducao: IntroducaoV2, quadro: QuadroIntroducaoV2): Passo {
  const usados = idsDaAulaV2(aula);
  const titulo = quadro.titulo ?? trecho(quadro.texto).slice(1, -1);
  const apelido = comoId(titulo, "quadro");
  const capituloId = idLivre(usados, `capitulo-${apelido}`);
  const saem: string[] = [];
  const ficam: string[] = [];

  const origem = quadro.posicao.tipo === "referencia" ? quadro.posicao.origem : null;
  const analiseDaOrigem = origem ? aula.analises.find((item) => item.id === origem.analiseId) : undefined;
  // Os lances voltam se nenhum capítulo já mostra **esta linha**. Um capítulo de comparação (18/9/2026) usa a
  // mesma análise por outra variante, e não impede; o vizinho que mostra a linha principal, sim.
  const principal = origem && analiseDaOrigem ? linhaPrincipal(analiseDaOrigem, origem.nodeId) : [];
  const lancesGuardados = Boolean(origem && analiseDaOrigem?.nos[origem.nodeId]?.filhos.length)
    && !aula.capitulos.some((capitulo) => capitulo.analiseId === analiseDaOrigem!.id
      && ` ${[capitulo.inicioNodeId, ...capitulo.caminho].join(" ")} `.includes(` ${[origem!.nodeId, ...principal].join(" ")} `));

  let analises = aula.analises;
  let analiseId: string;
  let inicioNodeId: string;
  let caminho: string[] = [];
  if (lancesGuardados && origem && analiseDaOrigem) {
    analiseId = analiseDaOrigem.id;
    inicioNodeId = origem.nodeId;
    caminho = linhaPrincipal(analiseDaOrigem, inicioNodeId);
    ficam.push(`${plural(caminho.length, "lance guardado volta", "lances guardados voltam")} a aparecer para o aluno`);
  } else {
    // Posição parada: uma análise nova que só tem a posição do quadro.
    analiseId = idLivre(usados, `analise-${apelido}`);
    inicioNodeId = idLivre(usados, `no-${apelido}-0`);
    const inicio: AnaliseV2["inicio"] = origem ? { tipo: "referencia", origem } : { tipo: "fen", fen: (quadro.posicao as { fen: string }).fen };
    analises = [...analises, { id: analiseId, inicio, raizId: inicioNodeId, nos: { [inicioNodeId]: { id: inicioNodeId, filhos: [] } } }];
    ficam.push("a posição do quadro, parada — jogue os lances no tabuleiro para o capítulo ganhar percurso");
  }

  const narracao: NarracaoV2 = {
    id: idLivre(usados, `narracao-${inicioNodeId}-quadro`),
    nodeId: inicioNodeId,
    texto: quadro.texto,
    // Na introdução o aluno avança quando quiser; a narração conserva essa espera.
    pausa: "manual",
    ...(quadro.desenhos ? { desenhos: quadro.desenhos } : {}),
  };
  ficam.push(quadro.desenhos ? "o texto e os desenhos do quadro, como narração da posição inicial" : "o texto do quadro, como narração da posição inicial");
  if (quadro.lance) saem.push("a marca do lance que levava a este quadro a partir do anterior");

  const capitulo: CapituloV2 = { id: capituloId, titulo, analiseId, inicioNodeId, caminho, orientacao: aula.metadados?.orientacaoPadrao ?? "white", narracoes: [narracao] };
  const etapa = { id: idLivre(usados, `etapa-${capituloId}`), tipo: "capitulo" as const, entidadeId: capituloId };
  const ultimo = introducao.quadros.length === 1;
  if (ultimo) saem.push(`a introdução «${introducao.titulo}», que só tinha este quadro`);

  const introducoes = ultimo
    ? aula.introducoes.filter((item) => item.id !== introducao.id)
    : aula.introducoes.map((item) => (item.id === introducao.id ? { ...item, quadros: item.quadros.filter((q) => q.id !== quadro.id) } : item));
  const daIntroducao = (e: AulaV2["fluxo"][number]) => e.tipo === "introducao" && e.entidadeId === introducao.id;
  let fluxo: AulaV2["fluxo"];
  if (ultimo) fluxo = fluxoComTroca(aula.fluxo, daIntroducao, etapa);
  else {
    const indice = aula.fluxo.findIndex(daIntroducao);
    fluxo = [...aula.fluxo.slice(0, indice + 1), etapa, ...aula.fluxo.slice(indice + 1)];
  }

  return { aula: { ...aula, analises, introducoes, capitulos: [...aula.capitulos, capitulo], fluxo }, capituloId, saem, ficam, avisos: [] };
}

function paraCapitulo(aula: AulaV2, parte: ParteDaAulaV2): Passo | Falha {
  if (parte.tipo === "capitulo") {
    if (!aula.capitulos.some((c) => c.id === parte.capituloId)) return { ok: false, mensagem: "este capítulo não existe mais" };
    return { aula, capituloId: parte.capituloId, saem: [], ficam: [], avisos: [] };
  }
  if (parte.tipo === "treino") {
    const treino = aula.treinos.find((t) => t.id === parte.treinoId);
    return treino ? treinoParaCapitulo(aula, treino) : { ok: false, mensagem: "este treino não existe mais" };
  }
  const introducao = aula.introducoes.find((i) => i.id === parte.introducaoId);
  const quadro = introducao?.quadros.find((q) => q.id === parte.quadroId);
  return introducao && quadro ? quadroParaCapitulo(aula, introducao, quadro) : { ok: false, mensagem: "este quadro não existe mais" };
}

/* ------------------------------------------------------------------ *
 * Segundo passo: o capítulo vira o destino
 * ------------------------------------------------------------------ */

function capituloParaTreino(aula: AulaV2, capitulo: CapituloV2, positions: Record<string, Position>): Omit<Passo, "capituloId"> & { treinoId: string } | Falha {
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
  if (!analise) return { ok: false, mensagem: "a análise deste capítulo não existe mais" };
  if (!capitulo.caminho.length) return { ok: false, mensagem: "não há lances para o aluno jogar — um treino precisa de lances. Jogue a linha no tabuleiro antes" };
  const narracaoDe = (nodeId: string) => capitulo.narracoes.find((n) => n.nodeId === nodeId)?.texto;
  const titulo = capitulo.titulo;
  const objetivo = narracaoDe(capitulo.inicioNodeId) ?? analise.nos[capitulo.inicioNodeId]?.comentario ?? `Jogue a linha de «${titulo}».`;
  const lado = capitulo.orientacao;
  const preparo = prepararTreinosDaqui(aula, { capituloId: capitulo.id, nodeId: capitulo.inicioNodeId, titulo, objetivo, lado, colocacao: "depois-do-capitulo", obrigatorio: true }, positions);
  if (!preparo.ok) {
    const outro = lado === "white" ? "pretas" : "brancas";
    return { ok: false, mensagem: /lado escolhido/.test(preparo.mensagem)
      ? `a linha não tem lance das ${lado === "white" ? "brancas" : "pretas"}, o lado do aluno neste capítulo — troque para as ${outro} no ••• do capítulo antes`
      : preparo.mensagem };
  }
  const saem: string[] = [];
  let rascunho = soltarTreinosDoCapitulo(aula, capitulo.id, positions, saem);
  // As variantes que o capítulo tocava ganham etapa própria; o treino entra antes delas, no lugar dele.
  rascunho = { ...rascunho, fluxo: soltarVariantes(rascunho.fluxo, capitulo.id) };
  rascunho = aplicarTreinosPreparados(rascunho, preparo.preparo);
  const treinoId = preparo.preparo.treinos[0].id;
  rascunho = tornarTreinoIndependente(rascunho, treinoId, positions);

  const erros: NonNullable<AulaV2["catalogo"]>["erros"] = [];
  const avisos: string[] = [];
  const perdas: string[] = [];
  const idsDoCatalogo = (rascunho.catalogo?.erros ?? []).map((erro) => erro.id);
  const completado = completarTreino(rascunho.treinos.find((t) => t.id === treinoId)!, analise, { titulo, perdas }, erros, avisos, new Set([...idsDaAulaV2(rascunho), ...idsDoCatalogo]));

  // A narração do lance do defensor vira o texto da defesa quando o comentário não disse nada.
  const questoes = completado.questoes.map((questao) => ({
    ...questao,
    respostas: questao.respostas.map((resposta) => {
      if (resposta.efeito.tipo !== "avanca") return resposta;
      const doAluno = analise.nos[questao.posicao.nodeId]?.filhos.find((id) => analise.nos[id]?.uci === resposta.moves[0]);
      return {
        ...resposta,
        efeito: {
          ...resposta.efeito,
          defesas: resposta.efeito.defesas.map((defesa) => {
            if (defesa.texto) return defesa;
            const noDaDefesa = doAluno ? analise.nos[doAluno]?.filhos.find((id) => analise.nos[id]?.uci === defesa.move) : undefined;
            const texto = noDaDefesa ? narracaoDe(noDaDefesa) : undefined;
            return texto ? { ...defesa, texto } : defesa;
          }),
        },
      };
    }),
  }));
  const treino: TreinoV2 = { ...completado, questoes, introducao: objetivo };

  // Quais narrações o treino aproveitou: a da posição inicial (objetivo), as dos lances do aluno
  // (feedback) e as dos lances do defensor (texto da defesa).
  const aproveitados = new Set<string>();
  for (const q of treino.questoes) for (const r of q.respostas) if (r.julgamento !== "erro") aproveitados.add(r.feedback);
  for (const q of treino.questoes) for (const r of q.respostas) if (r.efeito.tipo === "avanca") for (const d of r.efeito.defesas) if (d.texto) aproveitados.add(d.texto);
  aproveitados.add(objetivo);
  const sobram = capitulo.narracoes.filter((n) => !aproveitados.has(n.texto));
  if (sobram.length) saem.push(`${plural(sobram.length, "narração", "narrações")} sem lugar no treino: ${sobram.slice(0, 3).map((n) => trecho(n.texto)).join(", ")}${sobram.length > 3 ? "…" : ""}`);
  if (capitulo.resumo) saem.push(`o resumo do capítulo, ${trecho(capitulo.resumo)}`);
  saem.push(...perdas);

  const extras = treino.questoes.reduce((n, q) => n + q.respostas.length - 1, 0);
  const ficam = [
    `${plural(treino.questoes.length, "pergunta", "perguntas")} para o aluno jogar com as ${lado === "white" ? "brancas" : "pretas"}`,
    ...(extras ? [`${plural(extras, "resposta vinda das variantes", "respostas vindas das variantes")} (certas com !, !! ou mate; erros com ?, ?? ou ?!)`] : []),
    "os lances e comentários continuam guardados na aula",
  ];

  const catalogo = comErrosNoCatalogo(rascunho, erros);
  return {
    aula: {
      ...rascunho,
      ...(catalogo ? { catalogo } : {}),
      treinos: rascunho.treinos.map((item) => (item.id === treinoId ? treino : item)),
      capitulos: rascunho.capitulos.filter((item) => item.id !== capitulo.id),
      // O treino entrou logo depois do capítulo; tirar a etapa do capítulo o deixa no mesmo lugar.
      fluxo: fluxoSemCapitulos(rascunho.fluxo, [capitulo.id]),
    },
    treinoId,
    saem,
    ficam,
    avisos,
  };
}

function capituloParaQuadro(aula: AulaV2, capitulo: CapituloV2, positions: Record<string, Position>): Omit<Passo, "capituloId"> & { introducaoId: string; quadroId: string } | Falha {
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
  if (!analise?.nos[capitulo.inicioNodeId]) return { ok: false, mensagem: "a posição inicial deste capítulo não existe mais" };
  const usados = idsDaAulaV2(aula);
  const apelido = capitulo.id.replace(/^capitulo-/, "");
  const doInicio = capitulo.narracoes.filter((n) => n.nodeId === capitulo.inicioNodeId);
  const texto = doInicio.map((n) => n.texto).join("\n\n") || analise.nos[capitulo.inicioNodeId].comentario || capitulo.resumo || capitulo.titulo;
  const desenhos = doInicio.find((n) => n.desenhos)?.desenhos ?? analise.nos[capitulo.inicioNodeId].desenhos;
  const quadro: QuadroIntroducaoV2 = {
    id: idLivre(usados, `quadro-${apelido}`),
    titulo: capitulo.titulo,
    texto,
    posicao: { tipo: "referencia", origem: { analiseId: analise.id, nodeId: capitulo.inicioNodeId } },
    ...(desenhos && (desenhos.arrows?.length || desenhos.highlights?.length) ? { desenhos } : {}),
  };

  const saem: string[] = [];
  let atual = soltarTreinosDoCapitulo(aula, capitulo.id, positions, saem);
  // As variantes que o capítulo tocava ganham etapa própria antes de ele sair do fluxo.
  atual = { ...atual, fluxo: soltarVariantes(atual.fluxo, capitulo.id) };
  if (capitulo.caminho.length) saem.push(`o aluno deixa de ver ${plural(capitulo.caminho.length, "lance", "lances")} — continuam guardados na aula, e "Mudar para capítulo" os traz de volta`);
  const outras = capitulo.narracoes.filter((n) => n.nodeId !== capitulo.inicioNodeId);
  if (outras.length) saem.push(`${plural(outras.length, "texto dos lances", "textos dos lances")}: ${outras.slice(0, 3).map((n) => trecho(n.texto)).join(", ")}${outras.length > 3 ? "…" : ""}`);
  if (capitulo.resumo && texto !== capitulo.resumo) saem.push(`o resumo do capítulo, ${trecho(capitulo.resumo)}`);

  const semCapitulo = (e: AulaV2["fluxo"][number]) => e.tipo === "capitulo" && e.entidadeId === capitulo.id;
  const existente = atual.introducoes[0];
  let introducaoId: string;
  if (existente) {
    introducaoId = existente.id;
    atual = {
      ...atual,
      introducoes: atual.introducoes.map((item) => (item.id === existente.id ? { ...item, quadros: [...item.quadros, quadro] } : item)),
      fluxo: atual.fluxo.filter((e) => !semCapitulo(e)),
    };
  } else {
    introducaoId = idLivre(usados, `introducao-${apelido}`);
    const etapa = { id: idLivre(usados, `etapa-${introducaoId}`), tipo: "introducao" as const, entidadeId: introducaoId };
    atual = { ...atual, introducoes: [{ id: introducaoId, titulo: "Introdução", quadros: [quadro] }], fluxo: fluxoComTroca(atual.fluxo, semCapitulo, etapa) };
  }
  const ficam = [
    existente ? `um quadro novo no fim da introdução «${existente.titulo}»` : "uma introdução nova, no lugar do capítulo",
    doInicio.length ? "a narração da posição inicial vira o texto do quadro" : "o comentário da posição inicial vira o texto do quadro",
  ];
  return { aula: { ...atual, capitulos: atual.capitulos.filter((item) => item.id !== capitulo.id) }, introducaoId, quadroId: quadro.id, saem, ficam, avisos: [] };
}

/**
 * Calcula a mudança inteira sem tocar na aula de entrada. A tela usa o resultado para mostrar o que sai
 * e o que fica; o comando `MUDAR_MODO` roda a mesma conta — é determinística, então os ids e as perdas
 * que a janela mostrou são os que entram.
 */
export function mudarModo(aula: AulaV2, parte: ParteDaAulaV2, destino: ModoDaParteV2, positions: Record<string, Position>): ResultadoDaMudancaV2 {
  const atual = modoDaParte(parte);
  if (atual === destino) return { ok: false, mensagem: `já é ${NOME_DO_MODO[destino]}` };
  const primeiro = paraCapitulo(aula, parte);
  if ("ok" in primeiro) return primeiro;
  const capitulo = primeiro.aula.capitulos.find((c) => c.id === primeiro.capituloId)!;
  if (parte.tipo === "quadro" && destino === "treino" && !capitulo.caminho.length) {
    return { ok: false, mensagem: "este quadro não tem lances guardados — um treino precisa de lances. Mude para capítulo, jogue a linha no tabuleiro e depois mude para treino" };
  }

  if (destino === "capitulo") {
    return { ok: true, mudanca: { aula: primeiro.aula, nova: { tipo: "capitulo", capituloId: capitulo.id }, saem: primeiro.saem, ficam: primeiro.ficam, avisos: primeiro.avisos } };
  }
  try {
    const segundo = destino === "treino" ? capituloParaTreino(primeiro.aula, capitulo, positions) : capituloParaQuadro(primeiro.aula, capitulo, positions);
    if ("ok" in segundo) return segundo;
    const nova: ParteDaAulaV2 = "treinoId" in segundo
      ? { tipo: "treino", treinoId: segundo.treinoId }
      : { tipo: "quadro", introducaoId: segundo.introducaoId, quadroId: segundo.quadroId };
    return { ok: true, mudanca: { aula: segundo.aula, nova, saem: [...primeiro.saem, ...segundo.saem], ficam: segundo.ficam, avisos: [...primeiro.avisos, ...segundo.avisos] } };
  } catch (erro) {
    return { ok: false, mensagem: erro instanceof Error ? erro.message : "não foi possível mudar o modo" };
  }
}

/** Os destinos que a janela oferece, cada um com a recusa quando não dá. */
export function modosPossiveis(aula: AulaV2, parte: ParteDaAulaV2, positions: Record<string, Position>): Array<{ destino: ModoDaParteV2; resultado: ResultadoDaMudancaV2 }> {
  return (["introducao", "capitulo", "treino"] as const)
    .filter((destino) => destino !== modoDaParte(parte))
    .map((destino) => ({ destino, resultado: mudarModo(aula, parte, destino, positions) }));
}
