/**
 * Importar PGN para o Editor v2 — a leitura, o relatório de perdas e o lote
 * transacional do plano final (§11).
 *
 * ## A regra que organiza este arquivo: ler nunca aplica
 *
 * `lerImportacaoPgn` **não toca em aula nenhuma**. Ela lê o arquivo, monta o que
 * entraria, mede, e devolve um relatório dizendo jogo por jogo o que entra, o que é
 * recusado e o que se perde. Só `aplicarImportacaoPgn` muda o documento, e só com a
 * lista do que o professor escolheu.
 *
 * Isso é o que o plano exige — "exibir perdas ou elementos não suportados **antes** de
 * aplicar" — e é o que separa importar de apostar. Um importador que aplica primeiro e
 * explica depois transforma cada arquivo estranho num Desfazer.
 *
 * ## O lote é uma transação
 *
 * "Aplicar o lote selecionado é uma transação. Se houver item inválido, não aplicar
 * parcialmente sem escolha explícita." Aqui: se qualquer jogo escolhido for recusado,
 * ou se o resultado estourar os tetos de §17, **nada** entra e o motivo volta nomeado.
 * Meia importação é pior que nenhuma — ela deixa a aula num estado que o professor não
 * pediu e não sabe descrever.
 *
 * ## O que é recusado, e por que na porta
 *
 * - **Variante que não é xadrez padrão** (Chess960 e companhia). O plano põe isso fora
 *   desta versão "com recusa explícita": aceitar e depois descobrir que os roques não
 *   fazem sentido seria pior do que dizer não na entrada.
 * - **Jogo sem lance nenhum.** Não há o que importar, e um capítulo vazio é ruído.
 * - **FEN inicial que a `chess.js` não carrega.** Sem posição de partida não existe
 *   árvore; o resto seria consequência.
 *
 * ## O que é perda, e por que ela não recusa
 *
 * Perda é o que entra incompleto: um lance impossível (o ramo para ali, os irmãos
 * seguem — a mesma poda por ramo do portão de legalidade), um token que a varredura
 * não soube ler, a cor de uma seta que a tela não sabe desenhar. Recusar o jogo inteiro
 * por causa de uma variante torta jogaria fora as vinte que estão certas.
 */
import { Chess } from "chess.js";
import { lerPgns, type LancePgn, type PartidaPgn } from "../repertorio/pgn.ts";
import { LIMITES_V2, medidasDaAulaV2, problemasDeLimiteV2 } from "./limites.ts";
import type { AnaliseV2, AulaV2, CapituloV2, NoV2 } from "./modelo.ts";

/* ------------------------------------------------------------------ *
 * O vocabulário do relatório
 * ------------------------------------------------------------------ */

export type PerdaImportacao = {
  codigo: "LANCE_IMPOSSIVEL" | "TOKEN_NAO_RECONHECIDO" | "COR_DO_DESENHO" | "NAG_DESCONHECIDO";
  /** Já em português de professor: é isto que aparece na tela. */
  mensagem: string;
};

export type RecusaImportacao = {
  codigo: "VARIANTE_NAO_SUPORTADA" | "JOGO_SEM_LANCES" | "POSICAO_INICIAL_INVALIDA" | "GRANDE_DEMAIS";
  mensagem: string;
};

export type JogoImportado = {
  /** A posição do jogo no arquivo, de 1 em diante — é como o professor o chama. */
  numero: number;
  /** `ChapterName` do Lichess, senão `Event`, senão "Jogo N". */
  titulo: string;
  /** Preenchido quando o jogo **não** pode entrar. Com recusa, `analise` é `null`. */
  recusa: RecusaImportacao | null;
  analise: AnaliseV2 | null;
  capitulo: CapituloV2 | null;
  /** Quantos lances entraram de fato, já descontado o que a legalidade podou. */
  lances: number;
  comentarios: number;
  variantes: number;
  perdas: PerdaImportacao[];
};

export type RelatorioImportacao = {
  jogos: JogoImportado[];
  /** Quantos jogos podem entrar — o número que o botão de aplicar precisa. */
  aproveitaveis: number;
};

/* ------------------------------------------------------------------ *
 * Leitura
 * ------------------------------------------------------------------ */

/**
 * As variantes que este importador aceita.
 *
 * O Lichess escreve `Standard` no estudo comum e `From Position` quando o capítulo
 * começa numa FEN — as duas são xadrez padrão. Arquivo **sem** a tag `Variant` também
 * passa: é o caso da maioria dos exportadores, e recusar por ausência de tag recusaria
 * quase todo PGN que existe.
 */
const VARIANTES_ACEITAS = new Set(["standard", "chess", "from position"]);

/** `!`, `?`, `!!`… viram o número que o PGN usa para eles. São os seis da interface. */
const NAGS_POR_SIMBOLO: Record<string, number> = { "!": 1, "?": 2, "!!": 3, "??": 4, "!?": 5, "?!": 6 };

/** `[%cal Ge2e4,Rd1d5]` e `[%csl Rd5]` — o que o Lichess escreve dentro do comentário. */
const DIRETIVA = /\[%[^\]]*\]/g;

type Desenhos = { arrows?: [string, string][]; highlights?: string[] };

/**
 * Separa um comentário do PGN em prosa, desenhos e diretivas cruas.
 *
 * A cor é lida e **anunciada como perda**, não descartada em silêncio: a seta entra em
 * `desenhos` (que é o que a tela sabe desenhar, numa cor só) e o texto original inteiro
 * fica em `diretivas`, de onde a cor volta se um dia houver para onde.
 */
function separarComentario(bruto: string): { prosa: string; desenhos: Desenhos | undefined; diretivas: string[]; cores: string[] } {
  const diretivas = bruto.match(DIRETIVA) ?? [];
  const prosa = bruto.replace(DIRETIVA, " ").replace(/\s+/g, " ").trim();
  const arrows: [string, string][] = [];
  const highlights: string[] = [];
  const cores: string[] = [];

  for (const diretiva of diretivas) {
    const cal = /^\[%cal\s+(.*)\]$/.exec(diretiva);
    const csl = /^\[%csl\s+(.*)\]$/.exec(diretiva);
    for (const item of (cal?.[1] ?? "").split(",")) {
      const achado = /^\s*([GRYB])([a-h][1-8])([a-h][1-8])\s*$/.exec(item);
      if (!achado) continue;
      arrows.push([achado[2], achado[3]]);
      if (achado[1] !== "G") cores.push(achado[1]);
    }
    for (const item of (csl?.[1] ?? "").split(",")) {
      const achado = /^\s*([GRYB])([a-h][1-8])\s*$/.exec(item);
      if (!achado) continue;
      highlights.push(achado[2]);
      if (achado[1] !== "G") cores.push(achado[1]);
    }
  }

  const desenhos: Desenhos = {};
  if (arrows.length > 0) desenhos.arrows = arrows;
  if (highlights.length > 0) desenhos.highlights = highlights;
  return { prosa, desenhos: arrows.length + highlights.length > 0 ? desenhos : undefined, diretivas, cores };
}

/** O título do capítulo, na ordem em que o professor reconheceria o jogo. */
function tituloDoJogo(partida: PartidaPgn, numero: number): string {
  const candidatos = [partida.tags.ChapterName, partida.tags.Event, [partida.tags.White, partida.tags.Black].filter(Boolean).join(" × ")];
  return candidatos.find((c) => c && c.trim() !== "") ?? `Jogo ${numero}`;
}

/** `P1.07 - Peão de cavalo` vira `p1-07-peao-de-cavalo`, que é o que o id v2 aceita. */
function comoId(texto: string, reserva: string): string {
  const limpo = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return /^[a-z]/.test(limpo) ? limpo : reserva;
}

/**
 * Converte a árvore de SAN da partida na árvore de UCI da análise.
 *
 * **A poda é por ramo**, igual à do portão de legalidade: achado um SAN que a `chess.js`
 * recusa, aquele ramo para ali — os lances seguintes dele nunca existiram — e os irmãos
 * continuam entrando. Um PGN com uma variante torta não pode perder as vinte certas.
 */
function converter(
  lances: LancePgn[],
  jogo: Chess,
  paiId: string,
  nos: Record<string, NoV2>,
  contador: { valor: number; prefixo: string },
  perdas: PerdaImportacao[],
  contas: { comentarios: number; variantes: number },
): void {
  let atual = paiId;
  let jogados = 0;

  for (const lance of lances) {
    let jogado: { from: string; to: string; promotion?: string; san: string } | null = null;
    try {
      jogado = jogo.move(lance.san);
    } catch {
      jogado = null;
    }
    if (!jogado) {
      perdas.push({ codigo: "LANCE_IMPOSSIVEL", mensagem: `"${lance.san}" não é um lance possível nesta posição — esta linha foi cortada aqui` });
      // **As variantes deste lance sobrevivem a ele.** Elas são alternativas *a ele*,
      // partindo da mesma posição — o `( … )` do PGN quer dizer "em vez deste". Podar o
      // ramo é cortar o que vem **depois** do lance impossível, não o que estava ao lado.
      // A `chess.js` recusou o lance sem tocar no tabuleiro, então a posição corrente
      // ainda é a do pai, que é exatamente de onde a variante sai.
      for (const variacao of lance.variacoes) {
        contas.variantes += 1;
        converter(variacao, jogo, atual, nos, contador, perdas, contas);
      }
      break;
    }

    contador.valor += 1;
    const id = `${contador.prefixo}-${contador.valor}`;
    const no: NoV2 = { id, uci: `${jogado.from}${jogado.to}${jogado.promotion ?? ""}`, filhos: [] };

    if (lance.comentario) {
      const { prosa, desenhos, diretivas, cores } = separarComentario(lance.comentario);
      if (prosa !== "") {
        no.comentario = prosa;
        contas.comentarios += 1;
      }
      if (desenhos) no.desenhos = desenhos;
      if (diretivas.length > 0) no.diretivas = diretivas;
      if (cores.length > 0) perdas.push({ codigo: "COR_DO_DESENHO", mensagem: `a cor de ${cores.length} desenho(s) não é desenhada pelo editor; o texto original foi guardado inteiro` });
    }

    const nags = lance.nags.map((simbolo) => NAGS_POR_SIMBOLO[simbolo] ?? (/^\$\d+$/.test(simbolo) ? Number(simbolo.slice(1)) : 0)).filter((n) => n >= 1 && n <= 255);
    if (nags.length > 0) no.nags = nags;
    if (nags.length < lance.nags.length) perdas.push({ codigo: "NAG_DESCONHECIDO", mensagem: `o símbolo ${lance.nags.filter((s) => !NAGS_POR_SIMBOLO[s] && !/^\$\d+$/.test(s)).join(" ")} depois de ${jogado.san} não é um símbolo de PGN conhecido` });

    nos[id] = no;
    nos[atual].filhos.push(id);

    // As variações penduram no **pai** deste lance, porque substituem este lance.
    for (const variacao of lance.variacoes) {
      contas.variantes += 1;
      jogo.undo();
      converter(variacao, jogo, atual, nos, contador, perdas, contas);
      jogo.move(lance.san);
    }

    atual = id;
    jogados += 1;
  }

  for (let i = 0; i < jogados; i += 1) jogo.undo();
}

/** Um jogo do arquivo vira análise mais capítulo — ou uma recusa com motivo. */
function importarJogo(partida: PartidaPgn, numero: number, idsUsados: Set<string>): JogoImportado {
  const titulo = tituloDoJogo(partida, numero);
  const base: Omit<JogoImportado, "recusa" | "analise" | "capitulo"> = { numero, titulo, lances: 0, comentarios: 0, variantes: 0, perdas: [] };
  const recusar = (codigo: RecusaImportacao["codigo"], mensagem: string): JogoImportado => ({ ...base, recusa: { codigo, mensagem }, analise: null, capitulo: null });

  const variante = partida.tags.Variant?.trim().toLowerCase();
  if (variante && !VARIANTES_ACEITAS.has(variante)) return recusar("VARIANTE_NAO_SUPORTADA", `este jogo é de ${partida.tags.Variant}, e o editor só trabalha com xadrez padrão`);
  if (partida.lances.length === 0) return recusar("JOGO_SEM_LANCES", "este jogo não traz lance nenhum");

  const fenInicial = partida.tags.FEN?.trim();
  const jogo = new Chess();
  if (fenInicial) {
    try {
      jogo.load(fenInicial);
    } catch {
      return recusar("POSICAO_INICIAL_INVALIDA", `a posição de partida declarada no cabeçalho não é uma posição possível: "${fenInicial}"`);
    }
  }

  const perdas: PerdaImportacao[] = partida.naoReconhecidos.map((texto) => ({
    codigo: "TOKEN_NAO_RECONHECIDO" as const,
    mensagem: `o arquivo traz «${texto.slice(0, 40)}», que o leitor de PGN não soube ler`,
  }));

  // O apelido do capítulo é decidido **antes** de montar a árvore porque ele entra no
  // id de cada lance. No v2 os ids de nó são únicos na **aula inteira**, não dentro da
  // análise: importar 12 capítulos numerados `no-1`, `no-2`… produziu 153 colisões no
  // primeiro ensaio com o estudo real do Doug, e nenhuma delas era visível lendo o
  // código de um capítulo só.
  let sufixo = comoId(titulo, `jogo-${numero}`);
  while (idsUsados.has(sufixo)) sufixo = `${sufixo}-${numero}`;
  idsUsados.add(sufixo);
  const raizId = `no-${sufixo}-0`;

  const nos: Record<string, NoV2> = { [raizId]: { id: raizId, filhos: [] } };
  const contas = { comentarios: 0, variantes: 0 };
  const contador = { valor: 0, prefixo: `no-${sufixo}` };
  converter(partida.lances, jogo, raizId, nos, contador, perdas, contas);

  if (contador.valor === 0) return { ...base, perdas, recusa: { codigo: "JOGO_SEM_LANCES", mensagem: "nenhum lance deste jogo pôde ser jogado a partir da posição inicial" }, analise: null, capitulo: null };

  // O comentário antes do primeiro lance é do jogo inteiro: fica na raiz da árvore.
  if (partida.intro) {
    const { prosa, desenhos, diretivas } = separarComentario(partida.intro);
    if (prosa !== "") {
      nos[raizId].comentario = prosa;
      contas.comentarios += 1;
    }
    if (desenhos) nos[raizId].desenhos = desenhos;
    if (diretivas.length > 0) nos[raizId].diretivas = diretivas;
  }

  const fenDaRaiz = fenInicial ?? new Chess().fen();
  const analise: AnaliseV2 = {
    id: `analise-${sufixo}`,
    inicio: { tipo: "fen", fen: fenDaRaiz },
    origemPgn: { tags: partida.tags, ...(partida.resultado ? { resultado: partida.resultado } : {}), naoReconhecidos: partida.naoReconhecidos },
    raizId,
    nos,
  };

  // O percurso do capítulo é a linha principal: o primeiro filho de cada nó, que é
  // por onde o PGN andou antes de abrir parêntese.
  const caminho: string[] = [];
  let andando = raizId;
  while (nos[andando].filhos.length > 0) {
    andando = nos[andando].filhos[0];
    caminho.push(andando);
  }

  const capitulo: CapituloV2 = {
    id: `capitulo-${sufixo}`,
    titulo,
    analiseId: analise.id,
    inicioNodeId: raizId,
    caminho,
    // De quem é a vez na posição inicial: é o lado que o professor quer ver de frente.
    orientacao: new Chess(fenDaRaiz).turn() === "w" ? "white" : "black",
    narracoes: [],
  };

  return { ...base, recusa: null, analise, capitulo, lances: contador.valor, comentarios: contas.comentarios, variantes: contas.variantes, perdas };
}

/**
 * Lê um arquivo PGN inteiro e diz, jogo por jogo, o que entraria.
 *
 * Não muda nada. É a metade "mostre antes" do plano (§11).
 */
export function lerImportacaoPgn(texto: string): RelatorioImportacao {
  const idsUsados = new Set<string>();
  const jogos = lerPgns(texto).map((partida, indice) => importarJogo(partida, indice + 1, idsUsados));
  return { jogos, aproveitaveis: jogos.filter((jogo) => jogo.recusa === null).length };
}

/* ------------------------------------------------------------------ *
 * Aplicação
 * ------------------------------------------------------------------ */

export type ResultadoAplicacao =
  | { ok: true; aula: AulaV2 }
  | { ok: false; codigo: "NADA_SELECIONADO" | "JOGO_RECUSADO" | "GRANDE_DEMAIS" | "ID_EM_USO"; mensagem: string };

/**
 * Junta os jogos escolhidos à aula — tudo, ou nada.
 *
 * O que faz esta função ser uma transação de verdade: ela monta a aula nova **inteira**
 * numa cópia, confere tudo nela, e só devolve `ok` se a cópia inteira passou. A aula
 * que entrou nunca é tocada. Não existe caminho em que metade dos jogos entra.
 *
 * Os tetos de §17 são conferidos **no resultado**, não em cada jogo: dez capítulos de
 * 300 lances passam um a um e estouram juntos, e é o conjunto que o professor vai abrir.
 */
export function aplicarImportacaoPgn(aula: AulaV2, relatorio: RelatorioImportacao, escolhidos: number[]): ResultadoAplicacao {
  const numeros = new Set(escolhidos);
  const jogos = relatorio.jogos.filter((jogo) => numeros.has(jogo.numero));
  if (jogos.length === 0) return { ok: false, codigo: "NADA_SELECIONADO", mensagem: "nenhum jogo foi escolhido para importar" };

  const recusado = jogos.find((jogo) => jogo.recusa !== null);
  if (recusado) return { ok: false, codigo: "JOGO_RECUSADO", mensagem: `o jogo ${recusado.numero} («${recusado.titulo}») não pode ser importado: ${recusado.recusa!.mensagem}. Nada foi aplicado.` };

  const idsDaAula = new Set([...aula.analises.map((a) => a.id), ...aula.capitulos.map((c) => c.id), ...aula.fluxo.map((e) => e.id)]);
  for (const jogo of jogos) {
    for (const id of [jogo.analise!.id, jogo.capitulo!.id, `etapa-${jogo.capitulo!.id}`]) {
      if (idsDaAula.has(id)) return { ok: false, codigo: "ID_EM_USO", mensagem: `a aula já tem uma parte chamada "${id}"; renomeie antes de importar. Nada foi aplicado.` };
    }
  }

  const nova: AulaV2 = {
    ...aula,
    analises: [...aula.analises, ...jogos.map((jogo) => jogo.analise!)],
    capitulos: [...aula.capitulos, ...jogos.map((jogo) => jogo.capitulo!)],
    fluxo: [...aula.fluxo, ...jogos.map((jogo) => ({ id: `etapa-${jogo.capitulo!.id}`, tipo: "capitulo" as const, entidadeId: jogo.capitulo!.id }))],
  };

  const excedidos = problemasDeLimiteV2(nova);
  if (excedidos.length > 0) {
    return {
      ok: false,
      codigo: "GRANDE_DEMAIS",
      mensagem: `com estes ${jogos.length} jogo(s) a aula passa do que o editor aguenta: ${excedidos.map((p) => p.mensagem).join("; ")}. Nada foi aplicado.`,
    };
  }

  return { ok: true, aula: nova };
}

/**
 * O tamanho que a aula teria com os jogos escolhidos, para o relatório mostrar **antes**.
 *
 * É a razão de `medidasDaAulaV2` existir separada do validador: o professor precisa ver
 * "isto vai dar 1.240 lances, e o limite é 2.000" enquanto ainda pode escolher menos.
 */
export function medirImportacao(aula: AulaV2, relatorio: RelatorioImportacao, escolhidos: number[]): { lances: number; teto: number; cabe: boolean } {
  const numeros = new Set(escolhidos);
  const entrando = relatorio.jogos.filter((jogo) => numeros.has(jogo.numero) && jogo.recusa === null);
  const lances = medidasDaAulaV2(aula).nos + entrando.reduce((total, jogo) => total + jogo.lances, 0);
  return { lances, teto: LIMITES_V2.nosPorAula, cabe: lances <= LIMITES_V2.nosPorAula };
}
