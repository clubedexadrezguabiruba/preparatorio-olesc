import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { cadernoEmHtml, nomeDoArquivo, type Caderno } from "../lib/apostila/caderno.ts";
import { analisar } from "../lib/apostila/markdown.ts";
import { contarExercicios, montarCaderno } from "../lib/apostila/montar.ts";

/**
 * Monta um caderno da apostila em PDF.
 *
 *     node --conditions=react-server apostila/build.ts 1
 *
 * A condição `react-server` é a mesma de `npm run db:tatica`, e pelo mesmo
 * motivo: o caderno lê os puzzles por `lib/tatica/banco.ts`, que é
 * `server-only`. Ler o banco por um segundo caminho seria abrir a porta para o
 * papel e a tela mostrarem problemas diferentes.
 *
 * ## Por que Chromium, e não uma biblioteca de PDF
 *
 * Porque o CSS de impressão do navegador é o único motor de paginação que já
 * sabe o que ninguém quer reimplementar: viúvas e órfãs, `break-inside:
 * avoid` num diagrama, título que não fica sozinho no pé da folha. Uma
 * biblioteca de PDF desenharia caixas em coordenadas, e cada caderno novo
 * viraria um problema de diagramação à mão.
 *
 * O navegador é o mesmo que a Vercel usaria, mas isto **não** roda na build do
 * site: o PDF é um arquivo entregue em papel, refeito quando o conteúdo muda,
 * não a cada deploy. Ele sai versionado em `public/apostila/`, e é de lá que a
 * tarefa do painel o serve.
 */

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, "..");
/**
 * O PDF mora em `public/` **porque o aluno o abre pelo painel**: a tarefa
 * "ler o caderno 1" leva a um link, e o link tem de existir no site. São 150
 * KB por caderno, versionados como o recorte de puzzles é — gerados, sim, mas
 * a Vercel não tem Chromium para refazê-los na build.
 */
const SAIDA_PDF = path.join(RAIZ, "public", "apostila");

/**
 * O HTML não vai junto. Ele é ferramenta de quem diagrama, não material do
 * aluno, e em `public/` ele viraria uma segunda versão do caderno servida numa
 * URL — a que ninguém lembraria de atualizar.
 */
const SAIDA_HTML = path.join(RAIZ, "apostila", "saida");

/**
 * Quantas páginas o PDF tem — o número que o Doug confere no fim do bloco.
 *
 * Contado de duas maneiras independentes, porque uma contagem sozinha aqui é
 * um número que ninguém tem como conferir: o objeto `/Type /Page` de cada
 * folha, e o `/Count` da árvore de páginas. Se as duas discordarem, o PDF saiu
 * de um jeito que este leitor não entende, e é melhor gritar do que imprimir
 * "12 páginas" para um caderno de 24.
 */
export function contarPaginas(pdf: Buffer): number {
  const cru = pdf.toString("latin1");

  // `[^s]` é o que separa `/Type /Page` de `/Type /Pages` — o segundo é o nó da
  // árvore, não uma folha.
  const folhas = cru.match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;

  // A árvore tem um `/Count` por nó; o da raiz é o maior, e é o total.
  const contagens = [...cru.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  const raiz = contagens.length > 0 ? Math.max(...contagens) : 0;

  if (folhas === 0) throw new Error("não achei nenhuma página no PDF — ele saiu vazio?");
  if (folhas !== raiz) {
    throw new Error(`o PDF conta ${folhas} folhas e ${raiz} no índice — não sei ler este arquivo`);
  }
  return folhas;
}

/**
 * O caderno vem de um `.md` que o professor edita, não de um módulo.
 *
 * O porquê está em `lib/apostila/markdown.ts`. O que importa aqui: erro de
 * sintaxe no arquivo estoura **com o número da linha**, e é essa mensagem que
 * quem estava editando vai ler.
 */
async function montar(numero: number): Promise<Caderno> {
  const fonte = await readFile(path.join(AQUI, `caderno-${numero}.md`), "utf8");
  const analisado = analisar(fonte);
  if (analisado.cabecalho.numero !== numero) {
    throw new Error(
      `caderno-${numero}.md diz "numero: ${analisado.cabecalho.numero}" no cabeçalho`,
    );
  }
  return montarCaderno(analisado);
}

/**
 * Abre o PDF no visualizador padrão do sistema.
 *
 * Existe porque quem edita o caderno não quer procurar o arquivo na pasta a cada
 * frase mudada: ele salva o `.md`, roda o comando, e o PDF abre. É a diferença
 * entre iterar e desistir de iterar.
 */
function abrir(arquivo: string): void {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", arquivo]]
      : process.platform === "darwin"
        ? ["open", [arquivo]]
        : ["xdg-open", [arquivo]];
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
}

async function principal(): Promise<void> {
  const argumentos = process.argv.slice(2).filter((a) => a !== "--abrir");
  const querAbrir = process.argv.includes("--abrir");
  const numero = Number(argumentos[0] ?? 1);
  if (!Number.isInteger(numero)) throw new Error(`caderno "${argumentos[0]}" não é um número`);

  const caderno = await montar(numero);
  const css = await readFile(path.join(AQUI, "impressao.css"), "utf8");
  const html = cadernoEmHtml(caderno, css);

  await mkdir(SAIDA_HTML, { recursive: true });
  await mkdir(SAIDA_PDF, { recursive: true });
  // O HTML fica ao lado do PDF de propósito: quando a paginação sair torta,
  // abri-lo no navegador e apertar Ctrl+P mostra o mesmo defeito em segundos,
  // sem precisar reconstruir nada.
  const arquivoHtml = path.join(SAIDA_HTML, `caderno-${numero}.html`);
  await writeFile(arquivoHtml, html, "utf8");

  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    // `setContent` e não `goto(file://)`: o HTML não referencia arquivo nenhum,
    // então não há o que resolver a partir de um caminho.
    await pagina.setContent(html, { waitUntil: "load" });
    const pdf = await pagina.pdf({
      // O tamanho e as margens vêm do `@page` do CSS, que é onde eles estão
      // escritos e explicados. Duas fontes dariam duas paginações.
      preferCSSPageSize: true,
      /*
        Ligado por causa da pauta tracejada: ela é desenhada com um gradiente de
        fundo, e não com `border: dashed`, para poder escolher o tamanho do vão.
        Com `printBackground: false` o Chromium a apagaria do PDF **sem erro
        nenhum** — a linha de escrever o lance simplesmente não existiria na
        folha, e ninguém descobriria antes de imprimir.

        Não traz junto nenhum fundo indesejado: o caderno inteiro é tinta sobre
        o branco do papel, e `impressao.css` não pinta um único fundo.
      */
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate:
        `<div style="width:100%;font:8pt Georgia,serif;color:#000;` +
        `padding:0 17mm;display:flex;justify-content:space-between">` +
        `<span>Preparatório OLESC 2026 · Caderno ${numero}</span>` +
        `<span class="pageNumber"></span></div>`,
    });

    const arquivoPdf = path.join(SAIDA_PDF, nomeDoArquivo(caderno));
    await writeFile(arquivoPdf, pdf);

    const diagramas = html.match(/<svg /g)?.length ?? 0;
    const exercicios = contarExercicios(caderno);
    console.log(`${path.relative(RAIZ, arquivoPdf)}`);
    console.log(
      `  ${contarPaginas(pdf)} páginas, ${diagramas} diagramas ` +
        `(${exercicios} numerados, com resposta no gabarito), ${(pdf.length / 1024).toFixed(0)} KB`,
    );
    console.log(`  HTML para conferir a paginação: ${path.relative(RAIZ, arquivoHtml)}`);
    if (querAbrir) abrir(arquivoPdf);
  } finally {
    await navegador.close();
  }
}

await principal();
