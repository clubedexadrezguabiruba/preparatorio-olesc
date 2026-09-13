"use server";

import { exigirEditor } from "@/lib/editor/acesso";
import { lerFontesDoRepertorio } from "@/lib/repertorio/compilar-em-disco";
import { aplicarRepertorio, prepararAplicacao, recuperarTransacaoRepertorio } from "@/lib/repertorio/editor/aplicar";
import { frasesDoImpactoDoRepertorio } from "@/lib/repertorio/editor/impacto";
import {
  apagarRascunhoDoRepertorio,
  arquivosComRascunho,
  caminhoDoRascunhoDoRepertorio,
  ehArquivoDoRepertorio,
  gravarRascunhoDoRepertorio,
} from "@/lib/repertorio/editor/rascunho";
import { pgnDaAberturaNova, type PedidoDeAberturaNova } from "@/lib/repertorio/editor/sessao";
import { lerConteudo } from "@/lib/editor/rascunhos";
import { contarProgressoQueMorre } from "@/lib/repertorio/progresso-que-morre";
import path from "node:path";

/**
 * As ações do editor do repertório. **Todas** começam por `exigirEditor()`: a tela só
 * existir para o professor não é fronteira de segurança — uma action pode ser chamada sem
 * passar pela tela (guia de Server Actions do Next 16, "Authenticate and authorize").
 *
 * O arquivo é conferido por `ehArquivoDoRepertorio` antes de virar caminho, e as funções de
 * `rascunho.ts` conferem de novo: um `..` aqui escreveria fora da pasta.
 */

/** O maior `.pgn` de hoje tem 40 KB; 1 MB é folga de 25 vezes e ainda barra um engano. */
const TAMANHO_MAXIMO = 1024 * 1024;

export async function salvarRascunhoDoRepertorioAcao(arquivo: string, texto: string, baseHash: string | null) {
  await exigirEditor();
  if (!ehArquivoDoRepertorio(arquivo)) return { ok: false as const, erro: "arquivo do repertório inválido" };
  if (typeof texto !== "string" || texto.length > TAMANHO_MAXIMO) return { ok: false as const, erro: "o rascunho passou do tamanho que o editor aceita" };
  return gravarRascunhoDoRepertorio(arquivo, texto, baseHash);
}

export async function descartarRascunhoDoRepertorioAcao(arquivo: string) {
  await exigirEditor();
  if (!ehArquivoDoRepertorio(arquivo)) return { ok: false as const };
  apagarRascunhoDoRepertorio(arquivo);
  return { ok: true as const };
}

export type PreparoDaAplicacaoNaTela =
  | { ok: false; motivo: string; problemas: string[] }
  | { ok: true; frases: string[]; impactoHash: string; semMudanca: boolean };

/**
 * O impacto de aplicar **o rascunho em disco** — a tela só habilita o botão com o rascunho
 * salvo, e julgar outra coisa seria um impacto sobre o que o professor não está vendo.
 */
export async function prepararAplicacaoDoRepertorioAcao(arquivo: string): Promise<PreparoDaAplicacaoNaTela> {
  await exigirEditor();
  if (!ehArquivoDoRepertorio(arquivo)) return { ok: false, motivo: "arquivo do repertório inválido", problemas: [] };
  const rascunho = lerConteudo(caminhoDoRascunhoDoRepertorio(arquivo));
  if (!rascunho) return { ok: false, motivo: "não há rascunho salvo para aplicar", problemas: [] };
  const preparo = prepararAplicacao(arquivo, rascunho.texto);
  if (!preparo.ok) return preparo;
  const progresso = await contarProgressoQueMorre(preparo.idsQueMorrem);
  return {
    ok: true,
    frases: frasesDoImpactoDoRepertorio(preparo.impacto, progresso),
    impactoHash: preparo.impactoHash,
    semMudanca: preparo.impacto.semMudanca,
  };
}

export async function aplicarRepertorioAcao(arquivo: string, impactoHash: string) {
  await exigirEditor();
  if (!ehArquivoDoRepertorio(arquivo) || typeof impactoHash !== "string") return { ok: false as const, motivo: "pedido inválido" };
  const rascunho = lerConteudo(caminhoDoRascunhoDoRepertorio(arquivo));
  if (!rascunho) return { ok: false as const, motivo: "não há rascunho salvo para aplicar" };
  const resultado = aplicarRepertorio(arquivo, rascunho.texto, { impactoHash });
  // Aplicado, o rascunho é a própria fonte: guardá-lo faria a próxima abertura partir de
  // uma cópia que nada distingue do publicado.
  if (resultado.ok) apagarRascunhoDoRepertorio(arquivo);
  return resultado;
}

/**
 * "Nova abertura": o rascunho só com as tags. Cancelar o formulário não chama esta ação,
 * e por isso não cria arquivo nenhum.
 */
export async function criarAberturaNovaAcao(pedido: PedidoDeAberturaNova) {
  await exigirEditor();
  recuperarTransacaoRepertorio();
  const existentes = [
    ...lerFontesDoRepertorio(path.join(process.cwd(), "content", "repertorio")).map((f) => f.nome.slice(0, -4)),
    ...arquivosComRascunho(),
  ];
  const nova = pgnDaAberturaNova(pedido, existentes);
  if (!nova.ok) return nova;
  const gravado = gravarRascunhoDoRepertorio(nova.arquivo, nova.texto, null);
  if (!gravado.ok) return { ok: false as const, problemas: ["já existe um rascunho com esse nome"] };
  return { ok: true as const, arquivo: nova.arquivo };
}
