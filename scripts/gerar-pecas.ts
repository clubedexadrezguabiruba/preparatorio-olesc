import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CHAVES, extrairPecas, lerCssChessground } from "../lib/diagrama/extrair.ts";

/**
 * Gera `lib/diagrama/pecas.ts` a partir do CSS do chessground.
 *
 * Roda à mão, quando o chessground sobe de versão:
 *
 *     node scripts/gerar-pecas.ts
 *
 * Quem avisa que é hora de rodar é `lib/diagrama/pecas.test.ts`, que reextrai e
 * compara com o arquivo gerado.
 */

const DESTINO = fileURLToPath(new URL("../lib/diagrama/pecas.ts", import.meta.url));

const pecas = extrairPecas(lerCssChessground());

const corpo = CHAVES.map((chave) => `  ${chave}: ${JSON.stringify(pecas[chave])},`).join("\n");

const arquivo = `import type { ChavePeca } from "./extrair.ts";

/**
 * As doze peças cburnett, em SVG, prontas para entrar num tabuleiro impresso.
 *
 * **Arquivo gerado — não edite à mão.** Ele sai de
 * \`node scripts/gerar-pecas.ts\`, que decodifica os desenhos embutidos no
 * \`chessground.cburnett.css\`. O porquê está em \`extrair.ts\`; a conferência,
 * em \`pecas.test.ts\`.
 *
 * Cada valor é o **miolo** do \`<svg>\` original, desenhado numa caixa de
 * ${"`LADO_PECA`"}×${"`LADO_PECA`"}.
 *
 * Peças cburnett: CC BY-SA 3.0, Colin M.L. Burnett. O crédito sai impresso no
 * rodapé de todo caderno que usa diagrama.
 */
export const PECAS: Record<ChavePeca, string> = {
${corpo}
};
`;

writeFileSync(DESTINO, arquivo, "utf8");
console.log(`${DESTINO}: ${CHAVES.length} peças, ${arquivo.length} bytes.`);
