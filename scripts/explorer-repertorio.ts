/**
 * O que as crianças jogam, em cada posição em que o adversário escolhe.
 *
 * Uso:
 *   node scripts/explorer-repertorio.ts                 tabela em markdown
 *   node scripts/explorer-repertorio.ts --sem-rede      só o que já está no cache
 *   node scripts/explorer-repertorio.ts --recorte=NOME  mede noutra faixa
 *   node scripts/explorer-repertorio.ts --comparar      as faixas, lado a lado
 *
 * Sai com código 1 quando alguma posição ficou sem dados por falha de rede — a
 * tabela que sai daqui vira orçamento de linhas, e uma tabela furada não pode
 * passar por medição só porque o furo estava numa linha de stderr.
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
 * jogadores de **1000 a 1599**, não de 1000 a 1400. E o número é o do Lichess,
 * que corre acima do chess.com para a mesma força — ver `RECORTES` em
 * `lib/repertorio/explorer.ts`, que é onde os nomes das faixas moram. Ritmos:
 * rapid e classical (bullet e blitz têm outra distribuição de aberturas, e o
 * clube não joga bullet).
 *
 * A coluna "entram" é o corte do Base — as respostas mais frequentes até cobrir
 * 80 % da posição, no máximo 4. A coluna "coberto" diz quanto isso é de verdade:
 * abaixo de 80 % ali significa que a posição é espalhada demais e que o aluno
 * vai ver coisa fora do que treinou. "sobram" é o que fica para o Avançado ou
 * para os princípios.
 *
 * O cache é versionado, **numa subpasta por recorte**. Rodar de novo não faz
 * requisição nenhuma, e é isso que torna a tabela reproduzível — um número que
 * muda sozinho não justifica corte de conteúdo. A subpasta existe porque o nome
 * do arquivo de cache é um hash: dois recortes na mesma pasta seriam 46
 * arquivos indistinguíveis, e a lista de órfãos aqui embaixo perderia o sentido.
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
  RECORTE_PADRAO,
  RECORTES,
  RECORTES_NOMES,
  type Cache,
  type Posicao,
  type Recorte,
} from "../lib/repertorio/explorer.ts";

carregarEnv();

const SEM_REDE = process.argv.includes("--sem-rede");
const COMPARAR = process.argv.includes("--comparar");

const pedido = process.argv.find((a) => a.startsWith("--recorte="))?.slice("--recorte=".length);
if (pedido !== undefined && !RECORTES_NOMES.includes(pedido as Recorte)) {
  console.error(`--recorte=${pedido} não existe. Os que existem: ${RECORTES_NOMES.join(", ")}`);
  process.exit(1);
}
const RECORTE: Recorte = (pedido as Recorte | undefined) ?? RECORTE_PADRAO;
const FAIXAS = RECORTES[RECORTE];

const CACHE = path.join(RAIZ, "content", "repertorio", "cache", "explorer");
const PASTA = path.join(CACHE, RECORTE);
const LISTA = path.join(RAIZ, "content", "repertorio", "posicoes-chave.json");

type Entrada = { rotulo: string; cor: "brancas" | "pretas"; play: string[]; porque: string };
const { posicoes } = JSON.parse(readFileSync(LISTA, "utf8")) as { posicoes: Entrada[] };

const cacheEm = (pasta: string): Cache => {
  mkdirSync(pasta, { recursive: true });
  return {
    ler(chave) {
      const arquivo = path.join(pasta, `${chave}.json`);
      if (!existsSync(arquivo)) return undefined;
      try {
        return JSON.parse(readFileSync(arquivo, "utf8"));
      } catch {
        return undefined;
      }
    },
    gravar(chave, valor) {
      writeFileSync(path.join(pasta, `${chave}.json`), `${JSON.stringify(valor, null, 2)}\n`, "utf8");
    },
  };
};

const cache = cacheEm(PASTA);

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

/**
 * A leitura de uma posição — e o que fazer quando ela falha.
 *
 * **Um "sem dados" com a rede liberada não é resultado: é buraco.** A tabela
 * daqui vira orçamento de linhas no `docs/REPERTORIO.md`, e uma posição furada
 * por 429 é indistinguível, ali dentro, de uma posição que o explorer não
 * conhece — o corte sairia por limite de requisição em vez de por frequência.
 * Antes, isso saía com código 0 e uma linha no stderr.
 *
 * Depois da primeira falha o script para de ir à rede. A `consultar` já recuou
 * e insistiu; se ainda assim não passou, insistir nas 22 posições seguintes
 * custaria minutos em cada uma para devolver a mesma tabela furada. O cache do
 * que deu certo fica gravado, então rodar de novo retoma de onde parou.
 */
let desistiu = false;
let buracos = 0;

async function ler(
  play: readonly string[],
  cacheDaFaixa: Cache,
  faixas: readonly number[],
): Promise<Posicao | null> {
  const semRede = SEM_REDE || desistiu;
  const lido = await consultar(play, { cache: cacheDaFaixa, faixas, semRede, avisar });
  if (lido === null && !semRede) {
    buracos += 1;
    desistiu = true;
  }
  return lido;
}

/** O que dizer no fim, e com que código sair, quando houve buraco. */
function denunciarBuracos(semDados: number): void {
  if (buracos === 0) return;
  console.error(
    `\nA medição não fechou: ${semDados} de ${posicoes.length} posições sem dados por ` +
      "falha de rede, e o resto veio só do cache. A tabela acima está furada — não " +
      "use para cortar conteúdo. O que deu certo ficou no cache; rode de novo.",
  );
  process.exit(1);
}

/**
 * A comparação entre recortes — o que o ⚠13 pede.
 *
 * **A pergunta não é se 60,3 % virou 58,1 %.** É se muda o *conjunto de lances
 * que entra*: um percentual que anda não custa linha nenhuma, e uma resposta
 * que entra ou sai custa uma linha de repertório — e, como o id de uma linha é
 * o hash dos lances, custa junto o progresso de quem já treinou. Por isso a
 * coluna do veredito compara conjuntos, e os percentuais ficam de apoio.
 */
async function medir(recorte: Recorte): Promise<(Posicao | null)[]> {
  const daFaixa = cacheEm(path.join(CACHE, recorte));
  const saida: (Posicao | null)[] = [];
  for (const p of posicoes) {
    saida.push(await ler(p.play, daFaixa, RECORTES[recorte]));
  }
  return saida;
}

if (COMPARAR) {
  const medidos: Array<{ recorte: Recorte; lidas: (Posicao | null)[] }> = [];
  for (const recorte of RECORTES_NOMES) medidos.push({ recorte, lidas: await medir(recorte) });

  const corpo: string[] = [];
  const detalhe: string[] = [];
  let mudamDeConjunto = 0;
  let trocamDeOrdem = 0;
  let semDadosNaComparacao = 0;

  for (const [i, posicao] of posicoes.entries()) {
    const cortes = medidos.map(({ recorte, lidas }) => {
      const lido = lidas[i];
      return { recorte, corte: lido === null ? null : aCobrir(lido) };
    });

    const faltando = cortes.filter((c) => c.corte === null).map((c) => c.recorte);
    if (faltando.length > 0) {
      semDadosNaComparacao += 1;
      corpo.push(`| ${posicao.rotulo} | ? | ${cortes.map(() => "sem dados").join(" | ")} |`);
      continue;
    }

    const sans = cortes.map((c) => (c.corte?.entram ?? []).map((e) => e.san));
    const emOrdem = sans.map((l) => l.join(" "));
    const comoConjunto = sans.map((l) => [...l].sort().join(" "));

    const mesmaOrdem = emOrdem.every((x) => x === emOrdem[0]);
    const mesmoConjunto = comoConjunto.every((x) => x === comoConjunto[0]);

    let marca = "=";
    if (!mesmoConjunto) {
      marca = "≠";
      mudamDeConjunto += 1;
    } else if (!mesmaOrdem) {
      marca = "~";
      trocamDeOrdem += 1;
    }

    const celulas = cortes.map((c, k) => {
      const coberto = c.corte?.coberto ?? 0;
      const curto = coberto < 80 ? " ⚠" : "";
      return `${sans[k].join(" ")} · ${coberto}%${curto}`;
    });
    corpo.push(`| ${posicao.rotulo} | ${marca} | ${celulas.join(" | ")} |`);

    // Só o que diverge ganha explicação: numa tabela de 23, o que interessa é
    // achar as poucas linhas que custam repertório.
    if (marca === "≠") {
      // O percentual **na faixa nova** vai junto de propósito: sem ele, "entra
      // c3, sai Qh5" parece decisão, e quase sempre é empate técnico na quarta
      // vaga — o teto de 4 tendo de cortar entre dois lances a meio ponto um do
      // outro. Com ele, dá para separar o que custa linha do que é ruído.
      const base = new Set(sans[0]);
      for (let k = 1; k < sans.length; k++) {
        const entrou = sans[k].filter((x) => !base.has(x));
        const saiu = sans[0].filter((x) => !sans[k].includes(x));
        if (entrou.length === 0 && saiu.length === 0) continue;
        const naFaixa = medidos[k].lidas[i]?.respostas ?? [];
        const com = (x: string) => `${x} ${naFaixa.find((r) => r.san === x)?.pct ?? 0}%`;
        const tamanho =
          sans[k].length === sans[0].length
            ? ""
            : ` — de ${sans[0].length} para ${sans[k].length} respostas`;
        detalhe.push(
          `- **${posicao.rotulo}** — em \`${medidos[k].recorte}\`` +
            `${entrou.length > 0 ? `, **entra** ${entrou.map(com).join(", ")}` : ""}` +
            `${saiu.length > 0 ? `, **sai** ${saiu.map(com).join(", ")}` : ""}` +
            `${tamanho}`,
        );
      }
    }
  }

  const cabecalho = medidos.map((m) => `${m.recorte} (${RECORTES[m.recorte].join("/")})`);
  console.log(`
<!-- Gerado por \`npm run repertorio:explorer -- --comparar\`.
     "=" mesmo conjunto e mesma ordem · "~" mesmo conjunto, outra ordem ·
     "≠" o conjunto muda, e aí muda o repertório. O "⚠" marca cobertura abaixo
     dos 80 % da §4. Os números são da escala do Lichess. -->

| posição (o adversário escolhe) | ? | ${cabecalho.join(" | ")} |
|---|---|${cabecalho.map(() => "---").join("|")}|
${corpo.join("\n")}

**${posicoes.length} posições · ${mudamDeConjunto} mudam de conjunto · ${trocamDeOrdem} trocam de ordem${semDadosNaComparacao > 0 ? ` · ${semDadosNaComparacao} sem dados` : ""}.**
${detalhe.length > 0 ? `\n${detalhe.join("\n")}\n` : ""}`);

  for (const aviso of avisos) console.error(`  aviso: ${aviso}`);
  console.error(
    `\n${mudamDeConjunto} de ${posicoes.length} posições mudam o conjunto que entra no Base.`,
  );
  denunciarBuracos(semDadosNaComparacao);
  process.exit(0);
}

const mil = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1_000 ? `${Math.round(n / 1000)} k` : String(n);

const linhas: string[] = [];
let semDados = 0;

for (const posicao of posicoes) {
  const lido: Posicao | null = await ler(posicao.play, cache, FAIXAS);

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
<!-- Gerado por \`npm run repertorio:explorer -- --recorte=${RECORTE}\` em ${hoje}.
     Explorer do Lichess, rapid + classical, faixas ${FAIXAS.join("/")} — baldes de
     200 pelo piso, ou seja jogadores de ${FAIXAS[0]} a ${FAIXAS[FAIXAS.length - 1] + 199}
     **na escala do Lichess**, que corre acima do chess.com para a mesma força.
     "entram" = corte do Base: as mais frequentes até cobrir 80 % da posição, no
     máximo 4. -->

| posição (o adversário escolhe) | jogos | entram no Base | coberto | sobram |
|---|---|---|---|---|
${linhas.join("\n")}
`);

for (const aviso of avisos) console.error(`  aviso: ${aviso}`);

const depois = readdirSync(PASTA).length;
console.error(
  `\n${RECORTE} · ${posicoes.length} posições · ${depois - antes} consultas novas · ` +
    `${depois} no cache · ${semDados} sem dados`,
);

// Cache que não pertence a nenhuma posição da lista: sobra de quando uma
// entrada foi corrigida ou removida. Apontado, não apagado — apagar sozinho
// custaria uma ida à rede a quem só estava mexendo na lista para experimentar.
const usados = new Set(posicoes.map((p) => `${chaveDoCache(p.play, FAIXAS)}.json`));
const orfaos = readdirSync(PASTA).filter((n) => !usados.has(n));
if (orfaos.length > 0) {
  console.error(
    `\n${orfaos.length} arquivo(s) de cache sem posição correspondente ` +
      `(pode apagar): ${orfaos.join(", ")}`,
  );
}

denunciarBuracos(semDados);
