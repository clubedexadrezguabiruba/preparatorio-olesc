"use server";

import { exigirEditor } from "@/lib/editor/acesso";
import { gravarDocumentoV2 } from "@/lib/editor-v2/rascunhos";

export async function salvarDocumentoV2(aula: string, texto: string, baseHash: string | null) {
  await exigirEditor();
  let cru: unknown;
  try { cru = JSON.parse(texto); } catch { return { ok: false as const, erro: "o navegador enviou um documento quebrado" }; }
  return gravarDocumentoV2(aula, cru, baseHash);
}
