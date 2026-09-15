/**
 * A revisão de proveniência de uma posição que entrou como FEN — especificação §19.1, plano §12.
 *
 * O schema e as regras de aviso moram em `modelo.ts` (`revisaoDaFenV2Schema`,
 * `FEN_IMPORTADA_SEM_REVISAO`, `ORIGEM_DESCONHECIDA`); aqui ficam as três coisas que a tela usa:
 *
 * 1. `prepararRevisaoDaFen` — do formulário para a revisão, recusando o que não pode ser gravado
 *    com o campo e a frase (§8.3: "erro mantém o diálogo e os dados digitados");
 * 2. `aplicarRevisaoDaFen` — o executor do comando `REGISTRAR_PROVENIENCIA`, com Undo pelo
 *    histórico;
 * 3. `creditosDaAula` — as linhas que o aluno lê no fim da aula quando o professor pediu.
 */
import type { AnaliseV2, AulaV2, OrigemDaPosicaoV2, RevisaoDaFenV2 } from "./modelo.ts";

export const ROTULO_DA_ORIGEM: Record<OrigemDaPosicaoV2, { rotulo: string; ajuda: string }> = {
  obra: { rotulo: "Obra ou livro", ajuda: "Um diagrama de livro, revista ou curso." },
  "estudo-lichess": { rotulo: "Estudo do Lichess", ajuda: "Um capítulo de estudo, seu ou de outra pessoa." },
  partida: { rotulo: "Partida", ajuda: "Uma posição de partida jogada." },
  "autoria-propria": { rotulo: "Autoria própria", ajuda: "Você montou a posição. O crédito é seu." },
  desconhecida: { rotulo: "Origem desconhecida", ajuda: "Publica, mas fica um aviso até alguém dizer de onde veio." },
};

/** A origem é de outra pessoa: aí os textos que vieram junto precisam de declaração (§12.3). */
export const origemDeTerceiro = (origem: OrigemDaPosicaoV2) => origem === "obra" || origem === "estudo-lichess" || origem === "partida";

export type PedidoDeRevisaoDaFen = {
  origem: OrigemDaPosicaoV2 | "";
  autor?: string;
  obra?: string;
  pagina?: string;
  link?: string;
  licenca?: string;
  nota?: string;
  mostrarCredito: boolean;
  direitoDosTextos?: boolean;
};

export type PreparoDaRevisao =
  | { ok: true; revisao: RevisaoDaFenV2 }
  | { ok: false; campo: "origem" | "link"; mensagem: string };

const aparado = (valor: string | undefined) => {
  const texto = valor?.trim();
  return texto ? texto : undefined;
};

export function prepararRevisaoDaFen(pedido: PedidoDeRevisaoDaFen, fen: string, professor: string, agora: Date): PreparoDaRevisao {
  // "De onde veio" é opcional desde 15/9/2026 (trava 7): sem resposta, a origem fica desconhecida e a conferência avisa.
  const origem = pedido.origem || "desconhecida";
  const link = aparado(pedido.link);
  if (link && !/^https?:\/\/\S+$/i.test(link)) return { ok: false, campo: "link", mensagem: "o link precisa começar com http:// ou https:// — copie da barra do navegador" };
  const opcionais = { autor: aparado(pedido.autor), obra: aparado(pedido.obra), pagina: aparado(pedido.pagina), link, licenca: aparado(pedido.licenca), nota: aparado(pedido.nota) };
  return {
    ok: true,
    revisao: {
      origem,
      ...Object.fromEntries(Object.entries(opcionais).filter(([, valor]) => valor !== undefined)),
      fenRevisada: fen,
      revisadoEm: agora.toISOString(),
      professor: professor.trim() || "professor",
      mostrarCredito: pedido.mostrarCredito,
      ...(origemDeTerceiro(origem) ? { direitoDosTextos: pedido.direitoDosTextos === true } : {}),
    },
  };
}

export type ResultadoDaRevisao = { ok: true; aula: AulaV2 } | { ok: false; mensagem: string };

export function aplicarRevisaoDaFen(aula: AulaV2, analiseId: string, revisao: RevisaoDaFenV2): ResultadoDaRevisao {
  const analise = aula.analises.find((item) => item.id === analiseId);
  if (!analise) return { ok: false, mensagem: "a análise desta posição não existe mais" };
  if (analise.inicio.tipo !== "fen") return { ok: false, mensagem: "esta análise não começa numa FEN crua — a proveniência dela é a da posição do acervo" };
  if (revisao.fenRevisada !== analise.inicio.fen) return { ok: false, mensagem: "a posição mudou enquanto a janela estava aberta; feche e abra de novo para revisar a posição de agora" };
  if (JSON.stringify(analise.inicio.revisao) === JSON.stringify(revisao)) return { ok: true, aula };
  const inicio = { ...analise.inicio, revisao };
  return { ok: true, aula: { ...aula, analises: aula.analises.map((item) => (item.id === analiseId ? { ...item, inicio } : item)) } };
}

/**
 * As outras posições que vieram da **mesma origem** que esta — mesma origem de terceiro, mesma obra e mesmo
 * link —, na ordem da aula. É o estudo importado inteiro: achado do Doug no teste humano de 14/9/2026, que
 * teve de abrir a janela da origem capítulo por capítulo para declarar a mesma coisa.
 */
export function posicoesDaMesmaOrigem(aula: AulaV2, analiseId: string): string[] {
  const esta = aula.analises.find((item) => item.id === analiseId);
  const referencia = esta?.inicio.tipo === "fen" ? esta.inicio.revisao : undefined;
  if (!referencia || !origemDeTerceiro(referencia.origem) || !(referencia.obra || referencia.link)) return [];
  return aula.analises
    .filter((item) => item.id !== analiseId && item.inicio.tipo === "fen" && item.inicio.revisao
      && item.inicio.revisao.origem === referencia.origem
      && (item.inicio.revisao.obra ?? "") === (referencia.obra ?? "")
      && (item.inicio.revisao.link ?? "") === (referencia.link ?? ""))
    .map((item) => item.id);
}

/** O estado que a tela escreve ao lado do capítulo. */
export function estadoDaProveniencia(analise: AnaliseV2): "nao-se-aplica" | "sem-revisao" | "caduca" | "desconhecida" | "revisada" {
  if (analise.inicio.tipo !== "fen") return "nao-se-aplica";
  const revisao = analise.inicio.revisao;
  if (!revisao) return "sem-revisao";
  if (revisao.fenRevisada !== analise.inicio.fen) return "caduca";
  return revisao.origem === "desconhecida" ? "desconhecida" : "revisada";
}

/** "Posição: Dvoretsky, Manual de Finais, p. 12" — ou `null` quando não há o que creditar. */
export function linhaDeCredito(revisao: RevisaoDaFenV2): string | null {
  if (revisao.origem === "desconhecida") return null;
  const partes = [revisao.autor, revisao.obra].filter(Boolean) as string[];
  if (revisao.pagina) partes.push(/^\d/.test(revisao.pagina) ? `p. ${revisao.pagina}` : revisao.pagina);
  if (!partes.length) {
    if (revisao.origem === "autoria-propria") partes.push(revisao.professor);
    else return null;
  }
  return `Posição: ${partes.join(", ")}`;
}

/** As linhas de crédito que o aluno lê, sem repetir, na ordem das análises. */
export function creditosDaAula(aula: AulaV2): string[] {
  const linhas: string[] = [];
  for (const analise of aula.analises) {
    if (analise.inicio.tipo !== "fen" || !analise.inicio.revisao?.mostrarCredito) continue;
    if (analise.inicio.revisao.fenRevisada !== analise.inicio.fen) continue;
    const linha = linhaDeCredito(analise.inicio.revisao);
    if (linha && !linhas.includes(linha)) linhas.push(linha);
  }
  return linhas;
}

/**
 * A análise leva texto ao aluno? Conta a **narração** dos capítulos dela: o comentário da árvore é
 * privado e não atravessa para o pacote do aluno (§12), então não precisa de declaração.
 */
export function analiseTemTexto(aula: AulaV2, analise: AnaliseV2): boolean {
  return aula.capitulos.some((capitulo) => capitulo.analiseId === analise.id && capitulo.narracoes.length > 0);
}
