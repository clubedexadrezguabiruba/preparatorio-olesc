import { NIVEIS, temaFechado } from "../curso/nivel.ts";
import { BLOCOS, contaNoCurso } from "./blocos.ts";
import { temaAberto } from "./conteudo.ts";
import type { Feitos } from "./serie.ts";

/**
 * A tática em ordem (Doug, 18/9/2026): os temas abrem um depois do outro, como as aulas de
 * abertura. Fechar um tema — aquecimento, série e prova, `temaFechado` — abre o seguinte.
 *
 * - A tática fica **fora** da trava de nível: a corrente vai até o último tema.
 * - A ordem é a da página `/tatica`: nível por nível, e dentro dele a ordem dos blocos.
 * - Tema em teste e tema sem texto ficam fora da corrente: não seguram nem são segurados.
 * - O professor é sempre livre.
 *
 * Puro, para ter teste: quem lê o banco é a página.
 */

export type EstadoDoTema =
  | "concluido"
  /** O primeiro não concluído que está aberto: o "estude agora". */
  | "agora"
  /** Aberto sem ser o da vez — só para o professor. */
  | "aberto"
  | "trancado";

export function ordemDosTemas(escrito: (tag: string) => boolean = temaAberto): string[] {
  return NIVEIS.flatMap((n) =>
    BLOCOS.filter((b) => b.nivel === n).flatMap((b) =>
      b.temas.filter((t) => contaNoCurso(t) && escrito(t.tag)).map((t) => t.tag),
    ),
  );
}

export function temaLiberado(
  tag: string,
  feitos: ReadonlyMap<string, Feitos>,
  professor: boolean,
  ordem: readonly string[] = ordemDosTemas(),
): boolean {
  if (professor) return true;
  const i = ordem.indexOf(tag);
  if (i <= 0) return true;
  return ordem.slice(0, i).every((anterior) => temaFechado(feitos.get(anterior)));
}

/** O estado de cada tema da corrente. Tema fora dela não entra no mapa. */
export function estadoDosTemas(
  feitos: ReadonlyMap<string, Feitos>,
  professor: boolean,
  ordem: readonly string[] = ordemDosTemas(),
): Map<string, EstadoDoTema> {
  const estados = new Map<string, EstadoDoTema>();
  let jaTemAgora = false;
  for (const tag of ordem) {
    if (temaFechado(feitos.get(tag))) estados.set(tag, "concluido");
    else if (!temaLiberado(tag, feitos, professor, ordem)) estados.set(tag, "trancado");
    else if (jaTemAgora) estados.set(tag, "aberto");
    else {
      jaTemAgora = true;
      estados.set(tag, "agora");
    }
  }
  return estados;
}
