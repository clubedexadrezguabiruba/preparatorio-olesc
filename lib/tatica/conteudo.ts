import temasJson from "../../content/temas.json";
import { validarTemas, type TemaEscrito } from "./temas.ts";

/**
 * O conteúdo dos temas, já conferido, na forma em que as telas o usam.
 *
 * A conferência roda **na importação**: se `content/temas.json` estiver
 * quebrado, a build falha em vez de o aluno abrir o tema e ver uma página sem
 * texto.
 *
 * **Ter texto escrito é o que abre o tema.** Não existe uma segunda lista de
 * "temas liberados" — ela divergiria. O currículo inteiro está em
 * `blocos.ts`; o que já foi escrito está aqui; e a página de tática mostra o
 * resto como "abre no Sábado N".
 */
const POR_TAG = new Map<string, TemaEscrito>(
  validarTemas(temasJson).map((tema) => [tema.tag, tema]),
);

export function temaEscrito(tag: string): TemaEscrito | null {
  return POR_TAG.get(tag) ?? null;
}

export function temaAberto(tag: string): boolean {
  return POR_TAG.has(tag);
}
