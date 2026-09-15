import "server-only";
import { versaoDoMomento } from "./concluir.ts";
import { lerPartidas } from "./ler.ts";
import type { Momento } from "./momentos.ts";
import type { Partida } from "./montar.ts";

/**
 * As partidas modelo para as telas e para o servidor que grava.
 *
 * Deixou de ser o teste de 9/9/2026 em 15/9: o PGN e a ficha são conteúdo
 * conferido (`conferir.ts` roda no `npm test` e no `validate:content`), e a
 * partida vira requisito de nível. Quem monta é `montar.ts`; aqui só se decide
 * **quem vê o quê**.
 *
 * ## Rascunho
 *
 * `[Status "rascunho"]` é partida que o Doug ainda não aprovou. O professor e o
 * ambiente local a veem com o selo "em revisão"; o aluno não a vê, e ela não
 * conta no nível. Aprovar é trocar a tag para `revisado-doug` — ver o bloco 2 de
 * `docs/PARTIDAS-MODELO.md`.
 *
 * ## Cache
 *
 * Em produção, uma leitura por processo: o conteúdo só muda com deploy. Em
 * desenvolvimento, relê a cada pedido — quem edita o PGN quer ver na hora.
 */

export type MomentoComVersao = Momento & { readonly versao: string; readonly simbolo: string | null };

export type PartidaCarregada = Partida & { readonly momentos: readonly MomentoComVersao[] };

let guardadas: Promise<PartidaCarregada[]> | null = null;

async function todas(): Promise<PartidaCarregada[]> {
  const montar = async () => {
    const { partidas } = lerPartidas();
    return Promise.all(
      partidas
        .sort((a, b) => a.nivel - b.nivel || a.ordem - b.ordem)
        .map(async (p) => ({
          ...p,
          momentos: await Promise.all(
            p.ficha.momentos.map(async (m) => ({
              ...m,
              versao: await versaoDoMomento(m),
              // O símbolo que a fonte deu ao lance: a tela o mostra depois do acerto.
              simbolo: p.nags[String(m.ply)]?.find((n) => /^[!?]{1,2}$/.test(n)) ?? null,
            })),
          ),
        })),
    );
  };
  if (process.env.NODE_ENV !== "production") return montar();
  guardadas ??= montar();
  return guardadas;
}

/** Rascunho aparece para o professor e no ambiente local. */
export function podeVerRascunho(papel: "aluno" | "professor"): boolean {
  return papel === "professor" || process.env.NODE_ENV === "development";
}

/** As partidas visíveis, em ordem de nível e de curadoria. */
export async function listarPartidas(verRascunho: boolean): Promise<PartidaCarregada[]> {
  return (await todas()).filter((p) => verRascunho || p.status === "revisado-doug");
}

export async function carregarPartida(slug: string, verRascunho: boolean): Promise<PartidaCarregada | null> {
  // O slug vem da URL: sem esta guarda, `../../.env.local` viraria um caminho.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const achada = (await todas()).find((p) => p.slug === slug);
  if (!achada) return null;
  return verRascunho || achada.status === "revisado-doug" ? achada : null;
}

/** slug → nome das partidas que contam no nível: só as revisadas pelo Doug. */
export async function partidasPublicadas(): Promise<Map<string, string>> {
  return new Map(
    (await todas()).filter((p) => p.status === "revisado-doug").map((p) => [p.slug, p.nome]),
  );
}
