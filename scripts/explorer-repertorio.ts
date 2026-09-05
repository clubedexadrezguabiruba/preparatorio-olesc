/**
 * O que as crianças jogam, em cada posição em que o adversário escolhe.
 *
 * Uso:
 *   node scripts/explorer-repertorio.ts               tabela em markdown
 *   node scripts/explorer-repertorio.ts --sem-rede    só o que já está no cache
 *
 * ## Por que este script existe antes do documento
 *
 * O plano punha a medição no B6, **depois** de as linhas estarem escritas. Isso
 * garantiria retrabalho: as fontes somam 399 linhas e a meta do Base é ~40, e
 * sem número o corte de 359 seria por gosto. A tabela que sai daqui é o que o
 * `docs/REPERTORIO.md` usa para dar orçamento de linhas a cada abertura.
 *
 * ## O que a tabela quer dizer
 *
 * Faixa `1000,1200,1400` no explorer são os **baldes** de 200 em 200 pelo piso:
 * jogadores de **1000 a 1599**, não de 1000 a 1400. Ritmos: rapid e classical
 * (bullet e blitz têm outra distribuição de aberturas, e o clube não joga
 * bullet).
 *
 * A coluna "entram" é o corte do Base — as respostas mais frequentes até cobrir
 * 80 % da posição, no máximo 4. A coluna "coberto" diz quanto isso é de verdade:
 * abaixo de 80 % ali significa que a posição é espalhada demais e que o aluno
 * vai ver coisa fora do que treinou. "sobram" é o que fica para o Avançado ou
 * para os princípios.
 *
 * O cache é versionado. Rodar de novo não faz requisição nenhuma, e é isso que
 * torna a tabela reproduzível — um número que muda sozinho não justifica corte
 * de conteúdo.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { carregarEnv, RAIZ } from "./env-local.ts";
import {
  aCobrir,
  chaveDoCache,
  consultar,
  JOGOS_MINIMOS,
  type Cache,
  type Posicao,
} from "../lib/repertorio/explorer.ts";

carregarEnv();

const SEM_REDE = process.argv.includes("--sem-rede");
const PASTA = path.join(RAIZ, "content", "repertorio", "cache", "explorer");
const LISTA = path.join(RAIZ, "content", "repertorio", "posicoes-chave.json");

type Entrada = { rotulo: string; cor: "brancas" | "pretas"; play: string[]; porque: string };
const { posicoes } = JSON.parse(readFileSync(LISTA, "utf8")) as { posicoes: Entrada[] };

mkdirSync(PASTA, { recursive: true });

const cache: Cache = {
  ler(chave) {
    const arquivo = path.join(PASTA, `${chave}.json`);
    if (!existsSync(arquivo)) return undefined;
    try {
      return JSON.parse(readFileSync(arquivo, "utf8"));
    } catch {
      return undefined;
    }
  },
  gravar(chave, valor) {
    writeFileSync(path.join(PASTA, `${chave}.json`), `${JSON.stringify(valor, null, 2)}\n`, "utf8");
  },
};

/**
 * Confere que cada posição é mesmo um nó em que O ADVERSÁRIO escolhe.
 *
 * **Um erro que já passou:** a entrada da Londres tinha `play` até `2.Bf4`, e
 * ali quem joga é o aluno. A tabela saiu com os lances que outras pessoas fazem
 * de pretas — número verdadeiro respondendo à pergunta errada, que é o tipo de
 * erro que ninguém pega relendo. A guarda também joga os lances no tabuleiro,
 * então um UCI trocado vira erro nomeado em vez de posição silenciosamente
 * diferente da que se queria medir.
 */
function conferir(entrada: Entrada): string | null {
  const jogo = new Chess();
  for (const uci of entrada.play) {
    try {
      jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    } catch {
      return `"${uci}" não é lance legal neste caminho`;
    }
  }
  const deQuem = jogo.turn() === "w" ? "brancas" : "pretas";
  return deQuem === entrada.cor
    ? `no fim do caminho quem joga são as ${deQuem}, que é a cor do aluno — ` +
        "esta posição não é um nó de escolha do adversário"
    : null;
}

const tortas = posicoes
  .map((p) => ({ p, erro: conferir(p) }))
  .filter((x): x is { p: Entrada; erro: string } => x.erro !== null);

if (tortas.length > 0) {
  console.error("posicoes-chave.json:");
  for (const { p, erro } of tortas) console.error(`  ${p.rotulo}: ${erro}`);
  process.exit(1);
}

const antes = existsSync(PASTA) ? readdirSync(PASTA).length : 0;
const avisos: string[] = [];
const avisar = (m: string) => {
  if (!avisos.includes(m)) avisos.push(m);
};

const mil = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1_000 ? `${Math.round(n / 1000)} k` : String(n);

const linhas: string[] = [];
let semDados = 0;

for (const posicao of posicoes) {
  const lido: Posicao | null = await consultar(posicao.play, {
    cache,
    ...(SEM_REDE ? { token: undefined } : {}),
    avisar,
  });

  if (!lido) {
    semDados += 1;
    linhas.push(`| ${posicao.rotulo} | — | sem dados | — | — |`);
    continue;
  }

  const { entram, sobram, coberto } = aCobrir(lido);
  const mostrar = (r: { san: string; pct: number }) => `${r.san} ${r.pct}%`;
  const poucos = lido.jogos < JOGOS_MINIMOS ? " ⚠ poucos jogos" : "";
  linhas.push(
    `| ${posicao.rotulo} | ${mil(lido.jogos)}${poucos} | ${entram.map(mostrar).join(", ")} | ` +
      `${coberto}% | ${sobram.slice(0, 4).map(mostrar).join(", ") || "—"} |`,
  );
}

const hoje = new Date().toISOString().slice(0, 10);
console.log(`
<!-- Gerado por \`npm run repertorio:explorer\` em ${hoje}.
     Explorer do Lichess, rapid + classical, faixas 1000/1200/1400 (= jogadores
     de 1000 a 1599). "entram" = corte do Base: as mais frequentes até cobrir
     80 % da posição, no máximo 4. -->

| posição (o adversário escolhe) | jogos | entram no Base | coberto | sobram |
|---|---|---|---|---|
${linhas.join("\n")}
`);

for (const aviso of avisos) console.error(`  aviso: ${aviso}`);

const depois = readdirSync(PASTA).length;
console.error(
  `\n${posicoes.length} posições · ${depois - antes} consultas novas · ` +
    `${depois} no cache · ${semDados} sem dados`,
);

// Cache que não pertence a nenhuma posição da lista: sobra de quando uma
// entrada foi corrigida ou removida. Apontado, não apagado — apagar sozinho
// custaria uma ida à rede a quem só estava mexendo na lista para experimentar.
const usados = new Set(posicoes.map((p) => `${chaveDoCache(p.play)}.json`));
const orfaos = readdirSync(PASTA).filter((n) => !usados.has(n));
if (orfaos.length > 0) {
  console.error(
    `\n${orfaos.length} arquivo(s) de cache sem posição correspondente ` +
      `(pode apagar): ${orfaos.join(", ")}`,
  );
}
