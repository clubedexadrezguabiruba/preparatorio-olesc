/**
 * Dos PGN revisados para o JSON que o celular baixa.
 *
 * Uso:
 *   node scripts/compilar-repertorio.ts            escreve public/repertorio/
 *   node scripts/compilar-repertorio.ts --check    só confere; sai com erro se algo falha
 *                                                  OU se o compilado em disco diverge
 *   --origem <pasta>  --destino <pasta>            (padrão: content/repertorio e public/repertorio)
 *
 * **Um script, não dois.** O plano previa `compilar` e `validar` separados;
 * são o mesmo caminho com uma escrita no fim, e duas cópias divergiriam no dia
 * em que alguém corrigisse só uma.
 *
 * Desde a fatia 8 do Editor v2 a compilação mora em `lib/repertorio/compilar.ts`
 * e este arquivo é só a linha de comando. O motivo é o defeito que o mapeamento
 * achou: o `--check` compilava e saía verde **sem comparar com o disco**, e o JSON
 * publicado passou meses com 1.099 quebras `\r\n` que a fonte não tem mais.
 *
 * ## O que ele lê
 *
 * `content/repertorio/<cor>-<abertura>.pgn` — os arquivos **revisados à mão**.
 * A pasta `rascunhos/` fica de fora de propósito: rascunho é fonte importada
 * sem revisão, com prosa cortada e sem comentário nosso, e publicar isso seria
 * publicar o curso do outro.
 *
 * ## Por que JSON em `public/`
 *
 * O mesmo motivo dos puzzles: o celular baixa o arquivo e o servidor lê os
 * mesmos bytes. Nada de o treinador reexpandir árvore de PGN a cada aluno.
 */

import path from "node:path";
import { RAIZ } from "./env-local.ts";
import { compilarRepertorio, diferencasDoCompilado } from "../lib/repertorio/compilar.ts";
import { escreverCompilado, lerCompilado, lerFontesDoRepertorio } from "../lib/repertorio/compilar-em-disco.ts";
import { notas } from "../lib/repertorio/conteudo.ts";

function argumento(nome: string, padrao: string): string {
  const i = process.argv.indexOf(nome);
  return i >= 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : padrao;
}

const SO_CONFERIR = process.argv.includes("--check");
const ORIGEM = argumento("--origem", path.join(RAIZ, "content", "repertorio"));
const DESTINO = argumento("--destino", path.join(RAIZ, "public", "repertorio"));

const fontes = lerFontesDoRepertorio(ORIGEM);

if (fontes.length === 0) {
  console.log(`Nenhum PGN revisado em ${path.relative(RAIZ, ORIGEM) || ORIGEM}.`);
  process.exit(0);
}

const compilacao = compilarRepertorio(fontes, notas());

for (const aviso of compilacao.avisos) console.log(`  aviso: ${aviso}`);

// O placar sai SEMPRE, inclusive quando a compilação reprova. É o número que
// mede o avanço da §24, e ele é mais útil justamente nas rodadas em que alguma
// coisa quebrou.
console.log(`\n${compilacao.placar}`);

if (compilacao.problemas.length > 0) {
  console.error(`\n${compilacao.problemas.length} problema(s):\n`);
  for (const p of compilacao.problemas) console.error(`  ${p}`);
  process.exit(1);
}

const resumo = compilacao.porArquivo.map(
  (a) => `  ${a.nome}: ${a.linhas} linhas (${a.base} base, ${a.avancado} avançado)`,
);
console.log(`\n${compilacao.linhas.length} linhas em ${fontes.length} arquivos:\n${resumo.join("\n")}`);

if (SO_CONFERIR) {
  const diferencas = diferencasDoCompilado(compilacao.saida, lerCompilado(DESTINO));
  if (diferencas.length > 0) {
    console.error(
      `\ncompilado desatualizado — ${diferencas.length} arquivo(s) não batem com a fonte:\n` +
        diferencas.map((d) => `  ${d}`).join("\n") +
        "\n\nRode `npm run repertorio:compilar` e versione o resultado.",
    );
    process.exit(1);
  }
  console.log("\n(--check: nada foi escrito; o compilado em disco bate com a fonte.)");
  process.exit(0);
}

escreverCompilado(DESTINO, compilacao.saida);
console.log(`\nEscrito em ${path.relative(RAIZ, DESTINO) || DESTINO}: ${compilacao.saida.size - 1} aberturas + index.json`);
