/**
 * O que se pode fazer a partir de **um lance selecionado** — §8.3 (as três ações
 * contextuais) e §11.3 (o menu do botão direito e do `•••`).
 *
 * ## As três ações de §8.3 são três coisas diferentes, e a diferença é o ponto
 *
 * O plano final (§4) as separa com cuidado, e a confusão entre elas é o defeito
 * clássico de editor de xadrez:
 *
 * 1. **Mostrar esta variante na aula** cria um capítulo que **aponta** para o
 *    percurso que já existe. Não copia lance nenhum. É por isso que promover
 *    outra variante a principal, depois, não muda o que este capítulo mostra: o
 *    percurso é uma lista explícita de ids, e não "a linha principal de agora".
 * 2. **Começar desta posição** cria uma análise **nova**, cuja raiz referencia a
 *    posição selecionada. As continuações são independentes desde o primeiro
 *    lance — a dependência é da **posição inicial**, não da linha inteira da
 *    origem. É esta ação que produz `inicio: { tipo: "referencia" }`, e é por
 *    causa dela que a cascata de `trocar-posicao.ts` existe.
 * 3. **Duplicar como independente** materializa: guarda a FEN daquela posição,
 *    copia o conteúdo com ids novos e **encerra** a dependência. Conserva
 *    atribuição (o cabeçalho do PGN) e proveniência.
 *
 * A cópia mais cara é a terceira, e é a única que fica imune a qualquer edição
 * futura da origem. As duas primeiras continuam ligadas — a segunda pelo chão,
 * a primeira pelos próprios lances.
 *
 * ## Por que tudo aqui é "preparar" e depois "aplicar"
 *
 * Mesmo par de `novo-capitulo.ts` e `trocar-posicao.ts`: quem calcula não
 * escreve. Os ids nascem **antes** do comando, para o Refazer devolver o mesmo
 * capítulo — e não um parecido, com outro id, para o qual nenhuma narração,
 * treino ou etapa existente apontaria.
 */
import { Chess } from "chess.js";
import { caminhoAte, quadroDoNo } from "./arvore.ts";
import { comoId, idsDaAulaV2 } from "./ids.ts";
import {
  aplicarResolucoes,
  capitulosTocados,
  dependentesDasPerdas,
  narracoesPerdidas,
  perdasDeUmaAnalise,
  reabrirTreinos,
  resolucoesCompletas,
  treinosQuePisamEm,
  type DependenteV2,
  type NarracaoPerdidaV2,
  type ResolucoesV2,
  type TreinoAfetadoV2,
} from "./impacto.ts";
import { problemasDeLimiteV2 } from "./limites.ts";
import type { Position } from "../lesson/schema.ts";
import type { AnaliseV2, AulaV2, CapituloV2, NarracaoV2, NoV2 } from "./modelo.ts";

export type PedidoDoLanceV2 = {
  analiseId: string;
  nodeId: string;
  /** O nome do capítulo novo. Obrigatório, como em §8.3. */
  nome: string;
  orientacao: "white" | "black";
  /** Insere a etapa depois deste capítulo; sem ele, no fim da aula. */
  depoisDoCapituloId?: string;
  /**
   * De qual capítulo copiar as narrações, na duplicação independente. Sem ele,
   * a cópia nasce sem narração — o que é correto, porque narração pertence à
   * apresentação, e uma cópia sem apresentação declarada não tem qual herdar.
   */
  narracoesDoCapituloId?: string;
};

export type PreparoDoLanceV2<T> =
  | { ok: true; novo: T }
  | { ok: false; campo: "nome" | "lance"; mensagem: string };

export type AplicacaoV2 = { ok: true; aula: AulaV2 } | { ok: false; mensagem: string };

/** Os ids que um apelido gera para um capítulo que traz análise nova. */
function idsComAnalise(apelido: string): string[] {
  return [`analise-${apelido}`, `capitulo-${apelido}`, `etapa-capitulo-${apelido}`, `no-${apelido}-0`];
}

/** Escolhe um apelido livre, conferindo **todos** os ids que ele geraria. */
function apelidoLivre(aula: AulaV2, titulo: string, gerados: (apelido: string) => string[]): string {
  const usados = idsDaAulaV2(aula);
  const base = comoId(titulo, `capitulo-${aula.capitulos.length + 1}`);
  let apelido = base;
  for (let n = 2; gerados(apelido).some((id) => usados.has(id)); n += 1) apelido = `${base}-${n}`;
  return apelido;
}

function conferirNome(nome: string): string | null {
  return nome.trim() === ""
    ? "dê um nome ao capítulo — é por ele que você vai reconhecê-lo na coluna da esquerda"
    : null;
}

/** Insere a etapa depois do capítulo escolhido, ou no fim. */
function comEtapa(aula: AulaV2, etapaId: string, capituloId: string, depoisDoCapituloId?: string): AulaV2["fluxo"] {
  const fluxo = [...aula.fluxo];
  const depois = depoisDoCapituloId
    ? fluxo.findIndex((item) => item.tipo === "capitulo" && item.entidadeId === depoisDoCapituloId)
    : -1;
  fluxo.splice(depois < 0 ? fluxo.length : depois + 1, 0, { id: etapaId, tipo: "capitulo", entidadeId: capituloId });
  return fluxo;
}

/* ------------------------------------------------------------------ *
 * 1. Mostrar esta variante na aula
 * ------------------------------------------------------------------ */

export type VarianteMostradaV2 = {
  analiseId: string;
  capituloId: string;
  etapaId: string;
  titulo: string;
  inicioNodeId: string;
  caminho: string[];
  orientacao: "white" | "black";
  depoisDoCapituloId?: string;
};

/**
 * Um capítulo que mostra o percurso que já existe. **Não cria análise.**
 *
 * O percurso vai da raiz da análise até o lance selecionado, com os ids
 * escritos um por um. É essa lista explícita que faz §4 valer: "promoção de
 * outra variante a principal não muda o percurso escolhido".
 */
export function prepararMostrarVariante(aula: AulaV2, pedido: PedidoDoLanceV2): PreparoDoLanceV2<VarianteMostradaV2> {
  const erroDeNome = conferirNome(pedido.nome);
  if (erroDeNome) return { ok: false, campo: "nome", mensagem: erroDeNome };

  const analise = aula.analises.find((item) => item.id === pedido.analiseId);
  if (!analise) return { ok: false, campo: "lance", mensagem: "esta partida não existe mais" };
  if (!analise.nos[pedido.nodeId]) return { ok: false, campo: "lance", mensagem: "este lance não existe mais" };
  if (pedido.nodeId === analise.raizId) {
    return { ok: false, campo: "lance", mensagem: "a posição inicial não é uma variante: escolha um lance para mostrar na aula" };
  }

  let caminho: string[];
  try {
    caminho = caminhoAte(analise, pedido.nodeId).slice(1).map((no) => no.id);
  } catch {
    return { ok: false, campo: "lance", mensagem: "este lance não está ligado à posição inicial desta partida" };
  }

  const apelido = apelidoLivre(aula, pedido.nome, (a) => [`capitulo-${a}`, `etapa-capitulo-${a}`]);
  return {
    ok: true,
    novo: {
      analiseId: analise.id,
      capituloId: `capitulo-${apelido}`,
      etapaId: `etapa-capitulo-${apelido}`,
      titulo: pedido.nome.trim(),
      inicioNodeId: analise.raizId,
      caminho,
      orientacao: pedido.orientacao,
      ...(pedido.depoisDoCapituloId ? { depoisDoCapituloId: pedido.depoisDoCapituloId } : {}),
    },
  };
}

export function aplicarMostrarVariante(aula: AulaV2, novo: VarianteMostradaV2): AplicacaoV2 {
  const usados = idsDaAulaV2(aula);
  for (const id of [novo.capituloId, novo.etapaId]) {
    if (usados.has(id)) return { ok: false, mensagem: `a aula já tem uma parte chamada "${id}"; escolha outro nome para o capítulo` };
  }
  const analise = aula.analises.find((item) => item.id === novo.analiseId);
  if (!analise) return { ok: false, mensagem: "a partida deste percurso não existe mais" };
  if (novo.caminho.some((id) => !analise.nos[id])) return { ok: false, mensagem: "um dos lances deste percurso não existe mais" };

  const capitulo: CapituloV2 = {
    id: novo.capituloId,
    titulo: novo.titulo,
    analiseId: novo.analiseId,
    inicioNodeId: novo.inicioNodeId,
    caminho: novo.caminho,
    orientacao: novo.orientacao,
    narracoes: [],
  };
  return {
    ok: true,
    aula: {
      ...aula,
      capitulos: [...aula.capitulos, capitulo],
      fluxo: comEtapa(aula, novo.etapaId, novo.capituloId, novo.depoisDoCapituloId),
    },
  };
}

/* ------------------------------------------------------------------ *
 * 2. Começar desta posição
 * ------------------------------------------------------------------ */

export type ComecoDaquiV2 = {
  origem: { analiseId: string; nodeId: string };
  analiseId: string;
  capituloId: string;
  etapaId: string;
  raizId: string;
  titulo: string;
  orientacao: "white" | "black";
  depoisDoCapituloId?: string;
};

/**
 * Uma análise nova cuja raiz **referencia** a posição selecionada.
 *
 * A árvore nasce vazia de propósito: §4 diz que "suas continuações são
 * independentes", e copiar a continuação da origem seria criar uma cópia que o
 * professor não pediu e teria de apagar antes de escrever a dele.
 */
export function prepararComecarDaqui(aula: AulaV2, pedido: PedidoDoLanceV2): PreparoDoLanceV2<ComecoDaquiV2> {
  const erroDeNome = conferirNome(pedido.nome);
  if (erroDeNome) return { ok: false, campo: "nome", mensagem: erroDeNome };

  const analise = aula.analises.find((item) => item.id === pedido.analiseId);
  if (!analise) return { ok: false, campo: "lance", mensagem: "esta partida não existe mais" };
  if (!analise.nos[pedido.nodeId]) return { ok: false, campo: "lance", mensagem: "este lance não existe mais" };

  const apelido = apelidoLivre(aula, pedido.nome, idsComAnalise);
  return {
    ok: true,
    novo: {
      origem: { analiseId: analise.id, nodeId: pedido.nodeId },
      analiseId: `analise-${apelido}`,
      capituloId: `capitulo-${apelido}`,
      etapaId: `etapa-capitulo-${apelido}`,
      raizId: `no-${apelido}-0`,
      titulo: pedido.nome.trim(),
      orientacao: pedido.orientacao,
      ...(pedido.depoisDoCapituloId ? { depoisDoCapituloId: pedido.depoisDoCapituloId } : {}),
    },
  };
}

export function aplicarComecarDaqui(aula: AulaV2, novo: ComecoDaquiV2): AplicacaoV2 {
  const usados = idsDaAulaV2(aula);
  for (const id of [novo.analiseId, novo.capituloId, novo.etapaId, novo.raizId]) {
    if (usados.has(id)) return { ok: false, mensagem: `a aula já tem uma parte chamada "${id}"; escolha outro nome para o capítulo` };
  }
  const origem = aula.analises.find((item) => item.id === novo.origem.analiseId);
  if (!origem?.nos[novo.origem.nodeId]) return { ok: false, mensagem: "a posição de origem não existe mais" };

  const analise: AnaliseV2 = {
    id: novo.analiseId,
    inicio: { tipo: "referencia", origem: novo.origem },
    raizId: novo.raizId,
    nos: { [novo.raizId]: { id: novo.raizId, filhos: [] } },
  };
  const capitulo: CapituloV2 = {
    id: novo.capituloId,
    titulo: novo.titulo,
    analiseId: novo.analiseId,
    inicioNodeId: novo.raizId,
    caminho: [],
    orientacao: novo.orientacao,
    narracoes: [],
  };
  return {
    ok: true,
    aula: {
      ...aula,
      analises: [...aula.analises, analise],
      capitulos: [...aula.capitulos, capitulo],
      fluxo: comEtapa(aula, novo.etapaId, novo.capituloId, novo.depoisDoCapituloId),
    },
  };
}

/* ------------------------------------------------------------------ *
 * 3. Duplicar como independente
 * ------------------------------------------------------------------ */

export type DuplicataIndependenteV2 = {
  origem: { analiseId: string; nodeId: string };
  analiseId: string;
  capituloId: string;
  etapaId: string;
  titulo: string;
  fen: string;
  orientacao: "white" | "black";
  /** nó da origem → nó da cópia. O primeiro é a raiz nova. */
  nos: Record<string, string>;
  /** narração da origem → narração da cópia, para as que caem na subárvore. */
  narracoes: Record<string, string>;
  narracoesDoCapituloId?: string;
  depoisDoCapituloId?: string;
};

/**
 * Materializa a posição e o conteúdo a partir deste lance, com ids novos.
 *
 * **O lance selecionado vira a raiz da cópia**, e a raiz não carrega lance: o
 * `uci` dele fica para trás porque a posição que ele produzia agora é o próprio
 * chão da análise nova. O comentário, os desenhos, os símbolos e as diretivas
 * opacas dele, esses vão junto — são da posição, e a posição é a mesma.
 */
export function prepararDuplicarIndependente(
  aula: AulaV2,
  pedido: PedidoDoLanceV2,
  positions: Record<string, Position>,
): PreparoDoLanceV2<DuplicataIndependenteV2> {
  const erroDeNome = conferirNome(pedido.nome);
  if (erroDeNome) return { ok: false, campo: "nome", mensagem: erroDeNome };

  const analise = aula.analises.find((item) => item.id === pedido.analiseId);
  if (!analise) return { ok: false, campo: "lance", mensagem: "esta partida não existe mais" };
  if (!analise.nos[pedido.nodeId]) return { ok: false, campo: "lance", mensagem: "este lance não existe mais" };

  let fen: string;
  try {
    fen = quadroDoNo(aula, analise.id, pedido.nodeId, positions).fen;
  } catch {
    return { ok: false, campo: "lance", mensagem: "a posição deste lance não pôde ser reconstruída, então não há o que materializar" };
  }

  const apelido = apelidoLivre(aula, pedido.nome, idsComAnalise);

  const nos: Record<string, string> = {};
  let contador = 0;
  const andar = (id: string) => {
    if (nos[id]) return;
    nos[id] = `no-${apelido}-${contador}`;
    contador += 1;
    for (const filho of analise.nos[id]?.filhos ?? []) andar(filho);
  };
  andar(pedido.nodeId);

  const capitulo = pedido.narracoesDoCapituloId
    ? aula.capitulos.find((item) => item.id === pedido.narracoesDoCapituloId)
    : undefined;
  const narracoes: Record<string, string> = {};
  (capitulo?.narracoes ?? [])
    .filter((narracao) => nos[narracao.nodeId] !== undefined)
    .forEach((narracao, indice) => { narracoes[narracao.id] = `narracao-${apelido}-${indice + 1}`; });

  return {
    ok: true,
    novo: {
      origem: { analiseId: analise.id, nodeId: pedido.nodeId },
      analiseId: `analise-${apelido}`,
      capituloId: `capitulo-${apelido}`,
      etapaId: `etapa-capitulo-${apelido}`,
      titulo: pedido.nome.trim(),
      fen,
      orientacao: pedido.orientacao,
      nos,
      narracoes,
      ...(pedido.narracoesDoCapituloId ? { narracoesDoCapituloId: pedido.narracoesDoCapituloId } : {}),
      ...(pedido.depoisDoCapituloId ? { depoisDoCapituloId: pedido.depoisDoCapituloId } : {}),
    },
  };
}

export function aplicarDuplicarIndependente(aula: AulaV2, novo: DuplicataIndependenteV2): AplicacaoV2 {
  const usados = idsDaAulaV2(aula);
  for (const id of [novo.analiseId, novo.capituloId, novo.etapaId, ...Object.values(novo.nos), ...Object.values(novo.narracoes)]) {
    if (usados.has(id)) return { ok: false, mensagem: `a aula já tem uma parte chamada "${id}"; escolha outro nome para o capítulo` };
  }
  const origem = aula.analises.find((item) => item.id === novo.origem.analiseId);
  if (!origem?.nos[novo.origem.nodeId]) return { ok: false, mensagem: "a posição de origem não existe mais" };

  const nos: Record<string, NoV2> = {};
  for (const [antigo, id] of Object.entries(novo.nos)) {
    const no = origem.nos[antigo];
    if (!no) return { ok: false, mensagem: "um dos lances copiados não existe mais" };
    const copia: NoV2 = { ...no, id, filhos: no.filhos.map((filho) => novo.nos[filho]).filter((filho): filho is string => Boolean(filho)) };
    // A raiz não tem lance de entrada: a posição que este lance produzia virou o
    // chão desta análise. Ver `noV2Schema` e o portão `RAIZ_COM_LANCE`.
    if (antigo === novo.origem.nodeId) delete copia.uci;
    nos[id] = copia;
  }

  const analise: AnaliseV2 = {
    id: novo.analiseId,
    inicio: { tipo: "fen", fen: novo.fen },
    // Atribuição conservada: o cabeçalho do PGN de onde estes lances vieram
    // acompanha a cópia (§4 do plano final).
    ...(origem.origemPgn ? { origemPgn: origem.origemPgn } : {}),
    raizId: novo.nos[novo.origem.nodeId],
    nos,
  };

  const capituloDeOrigem = novo.narracoesDoCapituloId
    ? aula.capitulos.find((item) => item.id === novo.narracoesDoCapituloId)
    : undefined;
  const narracoes: NarracaoV2[] = (capituloDeOrigem?.narracoes ?? []).flatMap((narracao) => {
    const id = novo.narracoes[narracao.id];
    const nodeId = novo.nos[narracao.nodeId];
    return id && nodeId ? [{ ...narracao, id, nodeId }] : [];
  });

  const capitulo: CapituloV2 = {
    id: novo.capituloId,
    titulo: novo.titulo,
    analiseId: novo.analiseId,
    inicioNodeId: analise.raizId,
    caminho: caminhoPrincipal(nos, analise.raizId),
    orientacao: novo.orientacao,
    narracoes,
  };

  const nova: AulaV2 = {
    ...aula,
    analises: [...aula.analises, analise],
    capitulos: [...aula.capitulos, capitulo],
    fluxo: comEtapa(aula, novo.etapaId, novo.capituloId, novo.depoisDoCapituloId),
  };

  const excedidos = problemasDeLimiteV2(nova);
  if (excedidos.length > 0) {
    return { ok: false, mensagem: `com mais esta cópia a aula passa do que o editor aguenta: ${excedidos.map((p) => p.mensagem).join("; ")}. Nada foi criado.` };
  }
  return { ok: true, aula: nova };
}

/** A linha principal a partir da raiz: o primeiro filho de cada nó. */
function caminhoPrincipal(nos: Record<string, NoV2>, raizId: string): string[] {
  const caminho: string[] = [];
  const vistos = new Set<string>([raizId]);
  let atual = nos[raizId]?.filhos[0];
  while (atual && nos[atual] && !vistos.has(atual)) {
    caminho.push(atual);
    vistos.add(atual);
    atual = nos[atual].filhos[0];
  }
  return caminho;
}

/* ------------------------------------------------------------------ *
 * Excluir a partir daqui, e substituir continuação — §11.3
 * ------------------------------------------------------------------ */

export type TipoDeCorteV2 = "excluir-daqui" | "substituir-continuacao";

export type ImpactoDoCorteV2 = {
  tipo: TipoDeCorteV2;
  /** O lance com a numeração do painel — `12… Rd6` —, para a frase da tela. */
  lance: string;
  /** Todos os nós que somem, o de partida incluído quando for exclusão. */
  nosRemovidos: string[];
  comentariosRemovidos: number;
  desenhosRemovidos: number;
  narracoesRemovidas: NarracaoPerdidaV2[];
  capitulosAfetados: ReturnType<typeof capitulosTocados>;
  treinosAfetados: TreinoAfetadoV2[];
  dependentes: DependenteV2[];
};

export type PlanoDoCorteV2 = {
  analiseId: string;
  nodeId: string;
  tipo: TipoDeCorteV2;
  impacto: ImpactoDoCorteV2;
};

export type CalculoDoCorteV2 = { ok: true; plano: PlanoDoCorteV2 } | { ok: false; mensagem: string };

/**
 * O que se perde ao excluir a partir deste lance, ou ao substituir a
 * continuação dele. **Não** toca na aula.
 *
 * A diferença entre os dois é uma linha: excluir leva o lance junto;
 * substituir deixa o lance e leva tudo o que vinha depois dele, para o
 * professor jogar outra coisa em cima. §5 do plano manda que a segunda seja
 * "ação explícita, com impacto e recuperação" — e é por isso que ela não é o que
 * acontece quando se joga um lance diferente no tabuleiro: ali nasce uma
 * variante, e a continuação anterior fica.
 */
export function calcularCorte(
  aula: AulaV2,
  pedido: { analiseId: string; nodeId: string; tipo: TipoDeCorteV2; lance?: string },
  positions: Record<string, Position>,
): CalculoDoCorteV2 {
  const analise = aula.analises.find((item) => item.id === pedido.analiseId);
  if (!analise) return { ok: false, mensagem: "esta partida não existe mais" };
  const no = analise.nos[pedido.nodeId];
  if (!no) return { ok: false, mensagem: "este lance não existe mais" };
  if (pedido.tipo === "excluir-daqui" && pedido.nodeId === analise.raizId) {
    return { ok: false, mensagem: "a posição inicial não pode ser excluída: ela é o chão do capítulo. Para trocá-la, use «Trocar a posição inicial»" };
  }
  if (pedido.tipo === "substituir-continuacao" && no.filhos.length === 0) {
    return { ok: false, mensagem: "este lance ainda não tem continuação para substituir — jogue no tabuleiro para criar a primeira" };
  }

  const removidos = new Set<string>();
  const colher = (id: string) => {
    if (removidos.has(id)) return;
    removidos.add(id);
    analise.nos[id]?.filhos.forEach(colher);
  };
  if (pedido.tipo === "excluir-daqui") colher(pedido.nodeId);
  else no.filhos.forEach(colher);

  const perdas = perdasDeUmaAnalise(analise.id, removidos);
  const nos = [...removidos].map((id) => analise.nos[id]).filter(Boolean);

  return {
    ok: true,
    plano: {
      analiseId: analise.id,
      nodeId: pedido.nodeId,
      tipo: pedido.tipo,
      impacto: {
        tipo: pedido.tipo,
        lance: pedido.lance ?? no.uci ?? "a posição inicial",
        nosRemovidos: [...removidos],
        comentariosRemovidos: nos.filter((item) => item.comentario !== undefined).length,
        desenhosRemovidos: nos.filter((item) => item.desenhos !== undefined).length,
        narracoesRemovidas: narracoesPerdidas(aula, perdas),
        capitulosAfetados: capitulosTocados(aula, perdas),
        treinosAfetados: treinosQuePisamEm(aula, new Set([analise.id])),
        dependentes: dependentesDasPerdas(aula, perdas, positions, pedido.tipo === "excluir-daqui" ? "esta exclusão apaga" : "esta substituição apaga"),
      },
    },
  };
}

/**
 * Escreve o corte — resoluções primeiro, depois a poda, numa transação só.
 *
 * Os capítulos que passavam pelo que sumiu têm o percurso truncado e o início
 * devolvido à raiz, exatamente como na troca de posição: um percurso que
 * apontasse para um nó apagado deixaria o painel olhando para o vazio.
 */
export function aplicarCorte(aula: AulaV2, plano: PlanoDoCorteV2, resolucoes: ResolucoesV2 = {}): AplicacaoV2 {
  const dependentes = plano.impacto.dependentes;
  if (!resolucoesCompletas(dependentes, resolucoes)) {
    const nomes = dependentes
      .filter((d) => resolucoes[d.id] === undefined)
      .map((d) => `«${d.nome}» ${d.motivo}`)
      .join("; ");
    return {
      ok: false,
      mensagem: `não dá para fazer isto enquanto houver quem dependa do que seria apagado: ${nomes}. Escolha remover ou tornar independente cada um, ou cancele. Nada foi mudado.`,
    };
  }

  const base = aplicarResolucoes(aula, dependentes, resolucoes);
  const analise = base.analises.find((item) => item.id === plano.analiseId);
  if (!analise) return { ok: true, aula: base };

  const removidos = new Set(plano.impacto.nosRemovidos);
  const nos: Record<string, NoV2> = {};
  for (const no of Object.values(analise.nos)) {
    if (removidos.has(no.id)) continue;
    nos[no.id] = { ...no, filhos: no.filhos.filter((id) => !removidos.has(id)) };
  }

  const capitulos = base.capitulos.map((capitulo) => {
    if (capitulo.analiseId !== analise.id) return capitulo;
    const inicioNodeId = removidos.has(capitulo.inicioNodeId) ? analise.raizId : capitulo.inicioNodeId;
    const corte = capitulo.caminho.findIndex((id) => removidos.has(id));
    const caminho = removidos.has(capitulo.inicioNodeId)
      ? []
      : corte < 0 ? capitulo.caminho : capitulo.caminho.slice(0, corte);
    return {
      ...capitulo,
      inicioNodeId,
      caminho,
      narracoes: capitulo.narracoes.filter((narracao) => !removidos.has(narracao.nodeId)),
    };
  });

  const comTreinos = reabrirTreinos(
    {
      ...base,
      analises: base.analises.map((item) => (item.id === analise.id ? { ...item, nos } : item)),
      capitulos,
    },
    new Set(plano.impacto.treinosAfetados.map((item) => item.id)),
  );
  return { ok: true, aula: comTreinos };
}

/* ------------------------------------------------------------------ *
 * O menu: as mesmas ações no botão direito e no `•••`
 * ------------------------------------------------------------------ */

export type AcaoDoLanceV2 = {
  id:
    | "principal"
    | "comentar"
    | "simbolo"
    | "variante"
    | "mostrar-variante"
    | "comecar-daqui"
    | "duplicar-independente"
    | "treino"
    | "copiar-pgn"
    | "substituir-continuacao"
    | "excluir-daqui";
  rotulo: string;
  disponivel: boolean;
  /** Por que não dá, quando não dá. §11.3: "desabilitadas **com motivo**". */
  motivo?: string;
};

/**
 * O conjunto aplicável de ações deste lance — a mesma lista para o botão direito
 * e para o `•••` (§11.3, e §25: "ação de botão direito tem equivalente em
 * botão/teclado").
 *
 * A função é pura de propósito: a lista é o contrato que a tela desenha e que o
 * teste confere. Uma tela que decidisse sozinha o que mostrar teria uma segunda
 * opinião sobre o que é possível — e as duas divergiriam no dia em que só uma
 * delas fosse corrigida.
 */
export function acoesDoLance(analise: AnaliseV2, nodeId: string): AcaoDoLanceV2[] {
  const no = analise.nos[nodeId];
  const ehRaiz = nodeId === analise.raizId;
  const pai = Object.values(analise.nos).find((item) => item.filhos.includes(nodeId));
  const jaPrincipal = pai ? pai.filhos[0] === nodeId : true;
  const temFilhos = (no?.filhos.length ?? 0) > 0;

  return [
    {
      id: "principal",
      rotulo: "Tornar linha principal",
      disponivel: Boolean(pai) && !jaPrincipal,
      ...(ehRaiz
        ? { motivo: "a posição inicial não é uma variante" }
        : jaPrincipal
          ? { motivo: "este lance já é a linha principal da posição anterior" }
          : {}),
    },
    { id: "comentar", rotulo: "Comentar este lance", disponivel: true },
    {
      id: "simbolo",
      rotulo: "Anotar com símbolo",
      disponivel: !ehRaiz,
      ...(ehRaiz ? { motivo: "a posição inicial não é um lance, e por isso não recebe símbolo" } : {}),
    },
    { id: "variante", rotulo: "Criar variante daqui", disponivel: true },
    {
      id: "mostrar-variante",
      rotulo: "Mostrar esta variante como capítulo",
      disponivel: !ehRaiz,
      ...(ehRaiz ? { motivo: "o percurso até a posição inicial é vazio: não há variante para mostrar" } : {}),
    },
    { id: "comecar-daqui", rotulo: "Começar novo capítulo desta posição", disponivel: true },
    { id: "duplicar-independente", rotulo: "Duplicar como independente", disponivel: true },
    {
      id: "treino",
      rotulo: "Criar treino daqui",
      disponivel: false,
      motivo: "o editor de treinos ainda não existe; esta ação nasce com ele",
    },
    { id: "copiar-pgn", rotulo: "Copiar PGN desta variante", disponivel: true },
    {
      id: "substituir-continuacao",
      rotulo: "Substituir continuação",
      disponivel: temFilhos,
      ...(temFilhos ? {} : { motivo: "este lance ainda não tem continuação: jogue no tabuleiro para criar a primeira" }),
    },
    {
      id: "excluir-daqui",
      rotulo: "Excluir a partir daqui",
      disponivel: !ehRaiz,
      ...(ehRaiz ? { motivo: "a posição inicial é o chão do capítulo; para trocá-la, use «Trocar a posição inicial»" } : {}),
    },
  ];
}

/** De quem é a vez nesta FEN — o lado que o capítulo novo mostra de frente. */
export function orientacaoDaFen(fen: string): "white" | "black" {
  try {
    return new Chess(fen).turn() === "w" ? "white" : "black";
  } catch {
    return "white";
  }
}
