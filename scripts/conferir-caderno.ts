import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

/**
 * Os recortes que provam que o caderno é legível **em papel**.
 *
 *     node scripts/conferir-caderno.ts 1
 *
 * A promessa "diagrama legível em P&B" tem duas metades, e esta é a segunda.
 * A primeira é aritmética e roda em `npm test`: `lib/diagrama/tabuleiro.test.ts`
 * mede peça contra casa pela mesma régua de contraste do site. Mas contraste
 * não responde tamanho — um cavalo pode ter 12:1 de contraste e ainda assim
 * sair com 4 mm de altura, ilegível para um aluno de 8 anos.
 *
 * Tamanho quem responde é o olho, e é por isso que existe este script: ele
 * recorta em **coordenada medida** (a caixa que o navegador calculou para a
 * figura, não um retângulo escolhido a olho) e grava PNGs para um subagente
 * descrever. Os PNGs vão para fora do repositório: são prova de um bloco, não
 * material do curso.
 *
 * ## Por que a régua é o HTML, e não o PDF
 *
 * É o mesmo documento, com `emulateMedia("print")` ligado: o Chromium aplica o
 * `@page` e o CSS de impressão exatamente como aplica ao gerar o PDF. E o HTML
 * ainda tem o DOM, que é de onde sai a coordenada medida — o PDF é papel, não
 * responde onde está a figura.
 *
 * A escala é 3: 96 dpi × 3 = 288 dpi, quase o 300 dpi do laser da escola. O
 * recorte, então, tem o tamanho que a tinta vai ter.
 */

const ESCALA = 3;

/**
 * A largura da **mancha**, não a da folha: 210 mm de A4 menos as duas margens
 * de 17 mm do `@page`. É a diferença entre medir certo e medir 20% grande — na
 * tela o `@page` não recua nada, e um `viewport` de folha inteira faria o
 * diagrama nascer com a largura que ele nunca terá no papel.
 */
const MANCHA_MM = 210 - 17 * 2;
const MANCHA_PX = Math.round((MANCHA_MM / 25.4) * 96);
const emMm = (px: number): string => ((px / 96) * 25.4).toFixed(1);

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, "..");

async function principal(): Promise<void> {
  const numero = Number(process.argv[2] ?? 1);
  const destino = process.argv[3] ?? path.join(RAIZ, ".conferencia");
  await mkdir(destino, { recursive: true });

  const html = path.join(RAIZ, "apostila", "saida", `caderno-${numero}.html`);

  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({
      viewport: { width: MANCHA_PX, height: 1123 },
      deviceScaleFactor: ESCALA,
    });
    await pagina.emulateMedia({ media: "print" });
    await pagina.goto(pathToFileURL(html).href, { waitUntil: "load" });

    const figuras = pagina.locator("figure");
    const quantas = await figuras.count();
    if (quantas === 0) throw new Error("o caderno não tem nenhuma figura para conferir");

    const salvos: string[] = [];
    // A primeira figura e a última: se o CSS quebrar em alguma, quebra nas duas
    // pontas do documento, não só na que estava por cima.
    for (const [rotulo, indice] of [["primeiro", 0], ["ultimo", quantas - 1]] as const) {
      const alvo = figuras.nth(indice);
      const caixa = await alvo.boundingBox();
      if (caixa === null) throw new Error(`a figura ${indice} não tem caixa — está oculta?`);

      const arquivo = path.join(destino, `diagrama-${rotulo}.png`);
      await alvo.screenshot({ path: arquivo });
      salvos.push(arquivo);
      console.log(
        `${path.basename(arquivo)}: ${emMm(caixa.width)} × ${emMm(caixa.height)} mm no papel, ` +
          `recortado a ${96 * ESCALA} dpi`,
      );
    }

    // Uma seção inteira, para conferir corpo de letra, entrelinha e a relação
    // entre o texto e o diagrama. Também por caixa medida, não por retângulo.
    const secao = pagina.locator("section").first();
    const caixaSecao = await secao.boundingBox();
    if (caixaSecao === null) throw new Error("a primeira seção não tem caixa");
    const texto = path.join(destino, "texto.png");
    await secao.screenshot({ path: texto });
    salvos.push(texto);
    console.log(
      `texto.png: a primeira seção inteira, ${emMm(caixaSecao.width)} mm de mancha, ` +
        `corpo de ${MANCHA_MM} mm`,
    );

    // Um tabuleiro **virado**, se houver. A primeira amostra saiu com quatro
    // diagramas na visão das brancas por acaso, e o aviso de "as pretas
    // embaixo" ficou sem conferência — a metade da folha que ninguém olhou é
    // exatamente onde o defeito mora.
    const virado = figuras.filter({ hasText: "Pretas jogam" }).first();
    if ((await virado.count()) > 0) {
      const arquivo = path.join(destino, "diagrama-virado.png");
      await virado.screenshot({ path: arquivo });
      salvos.push(arquivo);
      const caixa = await virado.boundingBox();
      console.log(
        `diagrama-virado.png: ${emMm(caixa?.width ?? 0)} × ${emMm(caixa?.height ?? 0)} mm, ` +
          `visto pelas pretas`,
      );
    } else {
      // Apagado, e não só omitido: um recorte velho de uma versão anterior
      // continuaria na pasta e seria lido como se fosse desta.
      await rm(path.join(destino, "diagrama-virado.png"), { force: true });
      console.log("diagrama-virado.png: nenhum tabuleiro virado neste caderno.");
    }

    // E uma seção que tem as duas coisas: prosa na medida estreita e a grade de
    // diagramas na largura cheia. É onde a decisão de manchas diferentes ou se
    // sustenta ou salta aos olhos.
    const mista = pagina.locator("section:has(.diagramas:not(.sozinho))").last();
    if ((await mista.count()) > 0) {
      const arquivo = path.join(destino, "mista.png");
      await mista.screenshot({ path: arquivo });
      salvos.push(arquivo);
      const caixa = await mista.boundingBox();
      console.log(
        `mista.png: prosa e diagramas na mesma seção, ${emMm(caixa?.width ?? 0)} mm`,
      );
    }

    console.log(`\nEm: ${destino}`);
  } finally {
    await navegador.close();
  }
}

await principal();
