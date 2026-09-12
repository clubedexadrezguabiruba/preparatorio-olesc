"use server";

import { exigirEditor } from "@/lib/editor/acesso";
import { documentoV2Existe, gravarDocumentoV2, idsDeDocumentosV2 } from "@/lib/editor-v2/rascunhos";
import { prepararNovaAula, type PedidoDeNovaAulaV2 } from "@/lib/editor-v2/nova-aula";
import { indiceDeAulas } from "@/lib/finais/conteudo";

export async function salvarDocumentoV2(aula: string, texto: string, baseHash: string | null) {
  await exigirEditor();
  let cru: unknown;
  try { cru = JSON.parse(texto); } catch { return { ok: false as const, erro: "o navegador enviou um documento quebrado" }; }
  return gravarDocumentoV2(aula, cru, baseHash);
}

export type CriacaoDeAulaV2 =
  | { ok: true; id: string }
  | { ok: false; campo: "titulo" | "nivel" | "id" | "disco"; mensagem: string };

/**
 * "Nova aula" — §5.2.
 *
 * ## Por que a conferência de id acontece **aqui**, e não só na tela
 *
 * A tela mostra o identificador que o título gera e avisa quando ele colide,
 * mas a lista de ids ocupados mora no disco do servidor: aulas publicadas,
 * rascunhos v1 e documentos v2. Uma Server Action é alcançável por POST direto,
 * sem passar pela tela (a doc do Next diz isso em
 * `01-app/02-guides/server-actions.md`) — então quem decide é esta função, com a
 * lista de verdade na mão, e não o formulário.
 *
 * ## A criação é uma transação, e o arquivo nasce validado
 *
 * `gravarDocumentoV2` valida o documento antes de escrever e escreve
 * atomicamente, sob o mesmo lock do autosave. Ou existe uma aula v2 válida em
 * disco, ou não existe arquivo nenhum — §5.2: "cancelar não cria arquivo".
 */
export async function criarAulaV2(pedidoEmTexto: string): Promise<CriacaoDeAulaV2> {
  await exigirEditor();

  let pedido: PedidoDeNovaAulaV2;
  try {
    pedido = JSON.parse(pedidoEmTexto) as PedidoDeNovaAulaV2;
  } catch {
    return { ok: false, campo: "disco", mensagem: "o navegador enviou um formulário quebrado — recarregue a página" };
  }

  const ocupados = new Set<string>([...indiceDeAulas().map((aula) => aula.id), ...idsDeDocumentosV2()]);
  const preparo = prepararNovaAula(pedido, ocupados);
  if (!preparo.ok) return preparo;

  // Corrida entre duas abas: `prepararNovaAula` leu a lista há um instante, e o
  // que impede a segunda de sobrescrever a primeira é esta conferência colada na
  // escrita — não a leitura de antes.
  if (documentoV2Existe(preparo.aula.id)) {
    return { ok: false, campo: "titulo", mensagem: `já existe uma aula com o identificador «${preparo.aula.id}»; mude o título` };
  }

  const gravacao = gravarDocumentoV2(preparo.aula.id, preparo.aula, null);
  if (!gravacao.ok) return { ok: false, campo: "disco", mensagem: gravacao.erro };
  return { ok: true, id: preparo.aula.id };
}
