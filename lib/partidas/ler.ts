import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { montarPartida, type Partida } from "./montar.ts";

/**
 * O disco das partidas modelo: cada `content/partidas/<slug>.pgn` com o seu
 * `<slug>.json`.
 *
 * **Sem `server-only`**, de propósito: o `npm test`, a régua de voz e o
 * `validate:content` leem por aqui. O servidor lê por `carregar.ts`, que é
 * `server-only` e chama esta função.
 */

export const PASTA_DAS_PARTIDAS = "content/partidas";

export type Leitura = { partidas: Partida[]; problemas: string[] };

export function lerPartidas(raiz = process.cwd()): Leitura {
  const pasta = path.join(raiz, PASTA_DAS_PARTIDAS);
  const problemas: string[] = [];
  const partidas: Partida[] = [];
  let nomes: string[];
  try {
    nomes = readdirSync(pasta);
  } catch {
    return { partidas, problemas: [`${PASTA_DAS_PARTIDAS} não existe`] };
  }

  for (const nome of nomes.sort()) {
    if (nome.endsWith(".json") && !nomes.includes(nome.replace(/\.json$/, ".pgn"))) {
      problemas.push(`${PASTA_DAS_PARTIDAS}/${nome}: JSON sem o PGN da partida ao lado`);
    }
  }

  for (const nome of nomes.filter((n) => n.endsWith(".pgn")).sort()) {
    const slug = nome.replace(/\.pgn$/, "");
    if (!/^[a-z0-9-]+$/.test(slug)) {
      problemas.push(`${PASTA_DAS_PARTIDAS}/${nome}: nome de arquivo fora do padrão (minúsculas e hífen)`);
      continue;
    }
    const arquivoFicha = path.join(pasta, `${slug}.json`);
    if (!existsSync(arquivoFicha)) {
      problemas.push(`${PASTA_DAS_PARTIDAS}/${slug}.pgn: falta a ficha ${slug}.json`);
      continue;
    }
    let ficha: unknown;
    try {
      ficha = JSON.parse(readFileSync(arquivoFicha, "utf8"));
    } catch (erro) {
      problemas.push(`${PASTA_DAS_PARTIDAS}/${slug}.json: JSON ilegível — ${String(erro)}`);
      continue;
    }
    const montagem = montarPartida(slug, readFileSync(path.join(pasta, nome), "utf8"), ficha);
    problemas.push(...montagem.problemas);
    if (montagem.partida) partidas.push(montagem.partida);
  }

  return { partidas, problemas };
}
