/**
 * Renomear, duplicar e excluir capítulo, com impacto — §8.4 da especificação
 * funcional e §5 do plano final.
 *
 * ## O que já existia, e por que não está aqui
 *
 * **Renomear** já é o comando `RENOMEAR_CAPITULO`, e a regra de §8.4 que importa
 * — "vazio não apaga o nome anterior" — mora nele, numa linha: o título novo só
 * substitui o antigo quando sobra alguma coisa depois do `trim()`. Não há o que
 * calcular antes: renomear não perde nada, e por isso não passa por aqui.
 *
 * ## Duplicar é remapear, não copiar
 *
 * §8.4: "duplicar como independente remapeia **todos** os ids internos e as
 * referências copiadas". A parte cara não é copiar a árvore — é lembrar que o
 * capítulo aponta para nós por id em três lugares (`inicioNodeId`, cada passo do
 * `caminho`, o `nodeId` de cada narração) e que uma cópia que conservasse os ids
 * antigos produziria dois nós com o mesmo nome na mesma aula. O validador
 * acusaria `ID_DUPLICADO`, mas só depois de o professor já ter editado a cópia
 * achando que editava a original.
 *
 * Por isso a duplicação decide **um mapa de ids** antes de escrever qualquer
 * coisa, e tudo o que for copiado passa por esse mapa. E, como em
 * `novo-capitulo.ts`, o mapa é decidido **fora** do comando: é o que faz o
 * Refazer devolver a mesma cópia, com os mesmos ids, e não uma terceira.
 *
 * ### O que "independente" quer dizer no início da análise
 *
 * Se a análise original começava numa **referência** a outra análise, a cópia
 * **não** copia a referência: ela guarda a FEN daquela posição. É a definição de
 * §4 do plano — "duplicar como independente materializa posição e conteúdo…
 * encerra a dependência operacional, conservando atribuição/proveniência". Uma
 * cópia que continuasse referenciando não seria independente de nada; ela
 * mudaria de tabuleiro junto com a original no dia seguinte.
 *
 * Se começava numa **posição revisada** (`positionId`), a cópia mantém o mesmo
 * `positionId`. Isso não é dependência operacional: é a mesma posição aprovada,
 * com a mesma proveniência, apontada por dois capítulos — e fabricar uma segunda
 * entrada de proveniência para o mesmo arquivo seria inventar uma revisão que
 * ninguém fez.
 *
 * ## Excluir: o capítulo e a análise são duas decisões
 *
 * §8.4: "excluir capítulo **não** exclui automaticamente a análise
 * compartilhada". Aqui isso é literal — são dois campos no pedido, e o segundo
 * só é oferecido quando nenhum outro capítulo usa aquela análise. Excluir só o
 * capítulo não perde lance nenhum: perde a apresentação (as narrações e o lugar
 * no fluxo). Excluir a análise junto é a operação cara, e é ela que passa pelo
 * cálculo de dependentes de `impacto.ts`.
 *
 * Tudo é desfazível porque o histórico guarda documentos inteiros: quem desfaz
 * uma exclusão recebe de volta a análise, o capítulo, as narrações, a etapa e os
 * dependentes que tiverem sido removidos junto — na mesma ação.
 */
import { comoId, idsDaAulaV2 } from "./ids.ts";
import {
  aplicarResolucoes,
  dependentesDasPerdas,
  perdasDeUmaAnalise,
  resolucoesCompletas,
  type DependenteV2,
  type ResolucoesV2,
} from "./impacto.ts";
import { fenInicialDaAnalise } from "./arvore.ts";
import { problemasDeLimiteV2 } from "./limites.ts";
import type { Position } from "../lesson/schema.ts";
import type { AnaliseV2, AulaV2, CapituloV2, NarracaoV2, NoV2 } from "./modelo.ts";

/* ------------------------------------------------------------------ *
 * Duplicar
 * ------------------------------------------------------------------ */

export type PedidoDeDuplicacaoV2 = {
  capituloId: string;
  /** Vazio usa «Nome (cópia)». O professor pode dar outro na hora. */
  nome?: string;
};

/**
 * A duplicação já decidida: os ids novos e o mapa de quem vira quem. É isto que
 * entra no comando e, portanto, é isto que o Refazer repete igual.
 */
export type CapituloDuplicadoV2 = {
  origemCapituloId: string;
  analiseId: string;
  capituloId: string;
  etapaId: string;
  titulo: string;
  /** nó da análise original → nó da cópia. */
  nos: Record<string, string>;
  /** narração do capítulo original → narração da cópia. */
  narracoes: Record<string, string>;
  /**
   * A FEN que a cópia guarda quando a original começava numa **referência**.
   * `null` quando a original já tinha chão próprio e a cópia o herda igual.
   */
  fenMaterializada: string | null;
};

export type PreparoDeDuplicacaoV2 =
  | { ok: true; novo: CapituloDuplicadoV2 }
  | { ok: false; campo: "nome" | "capitulo"; mensagem: string };

/**
 * Confere o pedido e decide os ids. **Não** toca na aula.
 *
 * A ordem dos nós no mapa é a da descida em profundidade desde a raiz, e não a
 * ordem de `Object.keys`: assim `no-copia-1` é sempre o primeiro lance da linha
 * principal, e um diff da cópia se lê de cima para baixo como a partida se lê.
 */
export function prepararDuplicacaoDeCapitulo(
  aula: AulaV2,
  pedido: PedidoDeDuplicacaoV2,
  positions: Record<string, Position>,
): PreparoDeDuplicacaoV2 {
  const capitulo = aula.capitulos.find((item) => item.id === pedido.capituloId);
  if (!capitulo) return { ok: false, campo: "capitulo", mensagem: "este capítulo não existe mais" };
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
  if (!analise) return { ok: false, campo: "capitulo", mensagem: "este capítulo não tem análise para duplicar" };

  const titulo = (pedido.nome ?? "").trim() || `${capitulo.titulo} (cópia)`;

  let fenMaterializada: string | null = null;
  if (analise.inicio.tipo === "referencia") {
    try {
      fenMaterializada = fenInicialDaAnalise(aula, analise, positions);
    } catch {
      return {
        ok: false,
        campo: "capitulo",
        mensagem: "este capítulo começa numa posição de outro capítulo que não pôde ser reconstruída, então a cópia não teria como ficar independente",
      };
    }
  }

  const usados = idsDaAulaV2(aula);
  const base = comoId(titulo, `capitulo-${aula.capitulos.length + 1}`);
  const livre = (apelido: string) =>
    ![`analise-${apelido}`, `capitulo-${apelido}`, `etapa-capitulo-${apelido}`, `no-${apelido}-0`]
      .some((id) => usados.has(id));
  let apelido = base;
  for (let n = 2; !livre(apelido); n += 1) apelido = `${base}-${n}`;

  const nos: Record<string, string> = {};
  let contador = 0;
  const andar = (id: string) => {
    if (nos[id]) return;
    nos[id] = `no-${apelido}-${contador}`;
    contador += 1;
    for (const filho of analise.nos[id]?.filhos ?? []) andar(filho);
  };
  andar(analise.raizId);
  // Nó inalcançável desde a raiz é um documento quebrado, e o validador já o
  // acusa. Copiá-lo assim mesmo evita que a duplicação "conserte" em silêncio um
  // defeito que o professor ainda não viu.
  for (const id of Object.keys(analise.nos)) andar(id);

  const narracoes: Record<string, string> = {};
  capitulo.narracoes.forEach((narracao, indice) => {
    narracoes[narracao.id] = `narracao-${apelido}-${indice + 1}`;
  });

  return {
    ok: true,
    novo: {
      origemCapituloId: capitulo.id,
      analiseId: `analise-${apelido}`,
      capituloId: `capitulo-${apelido}`,
      etapaId: `etapa-capitulo-${apelido}`,
      titulo,
      nos,
      narracoes,
      fenMaterializada,
    },
  };
}

export type AplicacaoV2 = { ok: true; aula: AulaV2 } | { ok: false; mensagem: string };

/** Escreve a cópia — análise, capítulo, narrações e etapa, tudo ou nada. */
export function aplicarDuplicacaoDeCapitulo(aula: AulaV2, novo: CapituloDuplicadoV2): AplicacaoV2 {
  const capitulo = aula.capitulos.find((item) => item.id === novo.origemCapituloId);
  if (!capitulo) return { ok: false, mensagem: "o capítulo de origem não existe mais" };
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
  if (!analise) return { ok: false, mensagem: "a análise de origem não existe mais" };

  const usados = idsDaAulaV2(aula);
  for (const id of [novo.analiseId, novo.capituloId, novo.etapaId, ...Object.values(novo.nos), ...Object.values(novo.narracoes)]) {
    if (usados.has(id)) return { ok: false, mensagem: `a aula já tem uma parte chamada "${id}"; escolha outro nome para a cópia` };
  }

  const nos: Record<string, NoV2> = {};
  for (const [antigo, no] of Object.entries(analise.nos)) {
    const id = novo.nos[antigo];
    if (!id) continue;
    nos[id] = { ...no, id, filhos: no.filhos.map((filho) => novo.nos[filho]).filter((filho): filho is string => Boolean(filho)) };
  }

  const copia: AnaliseV2 = {
    ...analise,
    id: novo.analiseId,
    // Atribuição preservada: o cabeçalho do PGN de onde a partida veio segue
    // junto com a cópia (§4 do plano, "conservando atribuição/proveniência").
    inicio: novo.fenMaterializada ? { tipo: "fen", fen: novo.fenMaterializada } : analise.inicio,
    raizId: novo.nos[analise.raizId],
    nos,
  };

  const narracoes: NarracaoV2[] = capitulo.narracoes.flatMap((narracao) => {
    const id = novo.narracoes[narracao.id];
    const nodeId = novo.nos[narracao.nodeId];
    return id && nodeId ? [{ ...narracao, id, nodeId }] : [];
  });

  const novoCapitulo: CapituloV2 = {
    ...capitulo,
    id: novo.capituloId,
    titulo: novo.titulo,
    analiseId: novo.analiseId,
    inicioNodeId: novo.nos[capitulo.inicioNodeId] ?? copia.raizId,
    caminho: capitulo.caminho.map((id) => novo.nos[id]).filter((id): id is string => Boolean(id)),
    narracoes,
  };

  const fluxo = [...aula.fluxo];
  const depois = fluxo.findIndex((etapa) => etapa.tipo === "capitulo" && etapa.entidadeId === capitulo.id);
  fluxo.splice(depois < 0 ? fluxo.length : depois + 1, 0, { id: novo.etapaId, tipo: "capitulo", entidadeId: novo.capituloId });

  const nova: AulaV2 = {
    ...aula,
    analises: [...aula.analises, copia],
    capitulos: [...aula.capitulos, novoCapitulo],
    fluxo,
  };

  const excedidos = problemasDeLimiteV2(nova);
  if (excedidos.length > 0) {
    return { ok: false, mensagem: `com mais esta cópia a aula passa do que o editor aguenta: ${excedidos.map((p) => p.mensagem).join("; ")}. Nada foi criado.` };
  }
  return { ok: true, aula: nova };
}

/* ------------------------------------------------------------------ *
 * Excluir
 * ------------------------------------------------------------------ */

export type PedidoDeExclusaoV2 = {
  capituloId: string;
  /**
   * Levar a análise junto. §8.4 manda que isto **não** aconteça sozinho: o
   * professor pede, e só pode pedir quando nenhum outro capítulo a usa.
   */
  excluirAnalise: boolean;
};

export type ImpactoDaExclusaoV2 = {
  capituloId: string;
  titulo: string;
  analiseId: string;
  /** Os outros capítulos que mostram a mesma análise, pelo nome. */
  compartilhamComOutros: string[];
  /** A análise fica na aula sem nenhum capítulo que a mostre. */
  analiseFicaOrfa: boolean;
  excluirAnalise: boolean;
  narracoesRemovidas: number;
  nosRemovidos: number;
  comentariosRemovidos: number;
  desenhosRemovidos: number;
  /** Os treinos, introduções e análises que apontam para o que seria apagado. */
  dependentes: DependenteV2[];
  /**
   * A aula de onde este capítulo saiu já foi publicada ao aluno.
   *
   * A frase que a tela escreve é deliberadamente modesta: a publicação v2 ainda
   * não existe, então o que se pode afirmar é que o aluno continua vendo a
   * versão publicada — não que "a publicação foi alterada".
   */
  publicada: boolean;
};

export type PlanoDeExclusaoV2 = {
  capituloId: string;
  excluirAnalise: boolean;
  impacto: ImpactoDaExclusaoV2;
};

export type CalculoDeExclusaoV2 =
  | { ok: true; plano: PlanoDeExclusaoV2 }
  | { ok: false; mensagem: string };

/** Confere o pedido e mede o estrago. **Não** toca na aula. */
export function calcularExclusaoDeCapitulo(
  aula: AulaV2,
  pedido: PedidoDeExclusaoV2,
  positions: Record<string, Position>,
): CalculoDeExclusaoV2 {
  const capitulo = aula.capitulos.find((item) => item.id === pedido.capituloId);
  if (!capitulo) return { ok: false, mensagem: "este capítulo não existe mais" };
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId);

  const compartilhamComOutros = aula.capitulos
    .filter((item) => item.id !== capitulo.id && item.analiseId === capitulo.analiseId)
    .map((item) => item.titulo);

  if (pedido.excluirAnalise && compartilhamComOutros.length > 0) {
    return {
      ok: false,
      mensagem: `a partida deste capítulo também é mostrada por ${compartilhamComOutros.map((n) => `«${n}»`).join(", ")}; excluir o capítulo não pode levar junto o que outro capítulo usa`,
    };
  }

  const excluirAnalise = pedido.excluirAnalise && analise !== undefined;
  const nosDaAnalise = analise ? Object.values(analise.nos) : [];

  const dependentes = excluirAnalise && analise
    ? dependentesDasPerdas(aula, perdasDeUmaAnalise(analise.id, Object.keys(analise.nos)), positions, "esta exclusão apaga")
    : [];

  return {
    ok: true,
    plano: {
      capituloId: capitulo.id,
      excluirAnalise,
      impacto: {
        capituloId: capitulo.id,
        titulo: capitulo.titulo,
        analiseId: capitulo.analiseId,
        compartilhamComOutros,
        analiseFicaOrfa: !excluirAnalise && compartilhamComOutros.length === 0,
        excluirAnalise,
        narracoesRemovidas: capitulo.narracoes.length,
        // A raiz não é lance: contá-la faria a tela prometer um lance a mais do
        // que o painel mostra, e é o painel que o professor está olhando.
        nosRemovidos: excluirAnalise ? Math.max(nosDaAnalise.length - 1, 0) : 0,
        comentariosRemovidos: excluirAnalise ? nosDaAnalise.filter((no) => no.comentario !== undefined).length : 0,
        desenhosRemovidos: excluirAnalise ? nosDaAnalise.filter((no) => no.desenhos !== undefined).length : 0,
        dependentes,
        publicada: aula.metadados?.estadoDaOrigem === "publicado",
      },
    },
  };
}

/**
 * Escreve a exclusão — as resoluções dos dependentes primeiro, depois o corte.
 *
 * A ordem não é arbitrária: materializar um dependente lê a posição de um nó que
 * está prestes a sumir (por isso a FEN já vem resolvida dentro do plano), e
 * remover um dependente tira do caminho quem quebraria. Só depois disso o
 * capítulo — e, se for o caso, a análise — saem da aula.
 */
export function aplicarExclusaoDeCapitulo(aula: AulaV2, plano: PlanoDeExclusaoV2, resolucoes: ResolucoesV2 = {}): AplicacaoV2 {
  const capitulo = aula.capitulos.find((item) => item.id === plano.capituloId);
  if (!capitulo) return { ok: false, mensagem: "este capítulo não existe mais" };

  const dependentes = plano.impacto.dependentes;
  if (!resolucoesCompletas(dependentes, resolucoes)) {
    const nomes = dependentes
      .filter((d) => resolucoes[d.id] === undefined)
      .map((d) => `«${d.nome}» ${d.motivo}`)
      .join("; ");
    return {
      ok: false,
      mensagem: `não dá para excluir enquanto houver quem dependa do que seria apagado: ${nomes}. Escolha remover ou tornar independente cada um, ou cancele. Nada foi mudado.`,
    };
  }

  const comDependentesResolvidos = aplicarResolucoes(aula, dependentes, resolucoes);

  // O dependente removido pode ter sido justamente este capítulo (uma análise
  // dependente leva os capítulos dela). Reler a lista evita excluir duas vezes.
  const aindaExiste = comDependentesResolvidos.capitulos.some((item) => item.id === plano.capituloId);
  if (!aindaExiste) return { ok: true, aula: comDependentesResolvidos };

  const semCapitulo: AulaV2 = {
    ...comDependentesResolvidos,
    capitulos: comDependentesResolvidos.capitulos.filter((item) => item.id !== plano.capituloId),
    fluxo: comDependentesResolvidos.fluxo.filter((etapa) => !(etapa.tipo === "capitulo" && etapa.entidadeId === plano.capituloId)),
  };

  if (!plano.excluirAnalise) return { ok: true, aula: semCapitulo };

  return {
    ok: true,
    aula: {
      ...semCapitulo,
      analises: semCapitulo.analises.filter((item) => item.id !== capitulo.analiseId),
    },
  };
}
