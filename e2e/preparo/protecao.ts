/**
 * O que os ensaios do navegador podem e não podem tocar — fatia 10, parada 10A.
 *
 * ## A regra, numa frase
 *
 * Todo ensaio escreve **só** em aulas com id `EX-E2E-…`, e a limpeza prova, por SHA-256,
 * que o resto do disco ficou byte a byte como estava.
 *
 * Por que isso é código, e não um cuidado: numa rodada anterior o ensaio foi feito por engano
 * na `N1-KPK`, que é trabalho autoral do Doug e não está versionado. Um cuidado se esquece; uma
 * impressão digital antes e depois, não.
 *
 * Este módulo é usado pelo preparo, pela limpeza e pelo `npm run e2e:limpar`, que roda a limpeza
 * sozinha quando uma rodada morreu no meio.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
export const PASTA_E2E = path.join(RAIZ, ".editor", "e2e");
export const PREFIXO = "EX-E2E-";

/** As pastas cujos arquivos inteiros entram na impressão digital. */
const PASTAS_PROTEGIDAS = ["content", ".editor/repertorio", "public/repertorio"];
/** Os arquivos soltos — os dois rascunhos v2 que já existem e não são do ensaio. */
const ARQUIVOS_PROTEGIDOS = [".editor/v2/N0-LADDER.json", ".editor/v2/N1-KPK.json"];

/**
 * O que o `next dev` cria sozinho, sem ninguém pedir, e por isso fica fora da comparação.
 *
 * Abrir `/editor` faz o Next pré-carregar o link "Abrir v2" da N0-LADDER, e esse GET cria o
 * rascunho v1 da aula (diário, fatia 8: "efeito colateral de um GET, anterior à fatia"). O arquivo
 * é byte a byte igual ao publicado. Os ensaios bloqueiam a rota das aulas do curso (ver
 * `fixtures.ts`); a exceção fica aqui para uma aba aberta à mão não reprovar a rodada.
 */
const IGNORADOS = new Set(["content/rascunhos/lessons/N0-LADDER.json"]);

/** Os lugares em que um ensaio pode criar arquivo — todos com o prefixo no nome. */
const LUGARES_DO_ENSAIO = [
  ".editor/v2",
  ".editor/v2/snapshots",
  ".editor/v2/publicacao",
  ".editor/gate/v2",
  "content/aulas-v2",
  "content/positions/N0",
  "content/positions/N1",
  "content/positions/EX",
];

function listar(pasta: string): string[] {
  const absoluta = path.join(RAIZ, pasta);
  if (!existsSync(absoluta)) return [];
  const saida: string[] = [];
  const andar = (relativa: string) => {
    for (const nome of readdirSync(path.join(RAIZ, relativa))) {
      const filho = `${relativa}/${nome}`;
      if (statSync(path.join(RAIZ, filho)).isDirectory()) andar(filho);
      else saida.push(filho);
    }
  };
  andar(pasta);
  return saida;
}

const sha = (arquivo: string) => createHash("sha256").update(readFileSync(path.join(RAIZ, arquivo))).digest("hex");

export type Impressao = Record<string, string>;

/** SHA-256 de cada arquivo protegido, com o caminho relativo à raiz e barras normais. */
export function impressaoDigital(): Impressao {
  const arquivos = [...PASTAS_PROTEGIDAS.flatMap(listar), ...ARQUIVOS_PROTEGIDOS.filter((a) => existsSync(path.join(RAIZ, a)))]
    .filter((arquivo) => !IGNORADOS.has(arquivo))
    .sort();
  return Object.fromEntries(arquivos.map((arquivo) => [arquivo, sha(arquivo)]));
}

export type DiferencaDaImpressao = { mudaram: string[]; surgiram: string[]; sumiram: string[] };

export function compararImpressoes(antes: Impressao, depois: Impressao): DiferencaDaImpressao {
  const mudaram = Object.keys(antes).filter((a) => a in depois && depois[a] !== antes[a]);
  const sumiram = Object.keys(antes).filter((a) => !(a in depois));
  const surgiram = Object.keys(depois).filter((a) => !(a in antes));
  return { mudaram, surgiram, sumiram };
}

/** Tudo o que tem o prefixo do ensaio, nos lugares em que um ensaio escreve. */
export function restosDoEnsaio(): string[] {
  const achados: string[] = [];
  for (const lugar of LUGARES_DO_ENSAIO) {
    const absoluto = path.join(RAIZ, lugar);
    if (!existsSync(absoluto)) continue;
    for (const nome of readdirSync(absoluto)) if (nome.startsWith(PREFIXO)) achados.push(`${lugar}/${nome}`);
  }
  return achados;
}

/** Apaga **só** o que tem o prefixo, e devolve o que apagou. */
export function apagarRestosDoEnsaio(): string[] {
  const restos = restosDoEnsaio();
  for (const resto of restos) rmSync(path.join(RAIZ, resto), { recursive: true, force: true });
  return restos;
}

export function guardarJson(nome: string, valor: unknown): string {
  mkdirSync(PASTA_E2E, { recursive: true });
  const destino = path.join(PASTA_E2E, nome);
  writeFileSync(destino, JSON.stringify(valor, null, 2) + "\n");
  return destino;
}

export function lerJson<T>(nome: string): T | null {
  const origem = path.join(PASTA_E2E, nome);
  return existsSync(origem) ? (JSON.parse(readFileSync(origem, "utf8")) as T) : null;
}

/** As variáveis do `.env.local`, sem sobrescrever as do ambiente — o molde dos scripts. */
export function carregarEnvLocal(): void {
  const arquivo = path.join(RAIZ, ".env.local");
  if (!existsSync(arquivo)) return;
  for (const linha of readFileSync(arquivo, "utf8").split("\n")) {
    const corte = linha.indexOf("=");
    if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
    const nome = linha.slice(0, corte).trim();
    if (!process.env[nome]) process.env[nome] = linha.slice(corte + 1).trim().replace(/^["']|["']$/g, "");
  }
}
