import { readFileSync } from "node:fs";
import path from "node:path";
import type { Lesson } from "./schema.ts";
import { DOC_DA_VOZ, type Fala, type Regua } from "./regua.ts";

/**
 * A régua editorial, lida do documento em vez de copiada dele.
 *
 * `docs/VOZ-DO-CURSO.md` §3 traz um bloco ```json voz``` com os três números
 * que a casa cobra: teto de caracteres por fala, teto de palavras por frase e a
 * lista de palavras que não chegam ao aluno. **Este arquivo não tem cópia
 * própria de nenhum deles** — quem muda a régua muda o documento, e o teste e a
 * skill `/revisar-aula` passam a cobrar o número novo no mesmo instante.
 *
 * Duas cópias de um teto seriam duas opiniões sobre a régua, e a experiência
 * deste repositório com isso está medida: a §5 do `REPERTORIO.md` pedia "frase
 * curta" desde sempre, sem número, e a §8.1 encontrou 20 de 98 comentários com
 * uma frase de 32 palavras ou mais.
 *
 * Nada aqui julga xadrez, e nada aqui lê tela. São contas sobre texto: quantos
 * caracteres, quantas palavras por frase, que palavras aparecem. O que precisa
 * de olho — "uma ideia por fala", elogio vazio, repreensão — está declarado
 * como dívida na §7 do documento.
 *
 * As contas moram em `regua.ts`, sem disco, para a janela de autoria do Editor v2
 * poder usá-las no navegador. Aqui ficam a leitura do documento e a colheita da aula v1.
 */

export type { Fala, Regua, Reprovacao } from "./regua.ts";
export { DOC_DA_VOZ, emFrases, emPalavras, reprovacoes, usaProibida } from "./regua.ts";

/**
 * O bloco de números do documento.
 *
 * A cerca é ```` ```json voz ```` — `json` para o editor pintar, `voz` para
 * este leitor achar o bloco certo caso o documento ganhe outros exemplos de
 * JSON. Se o bloco sumir, isto **explode** em vez de assumir um padrão: uma
 * régua ausente que vira número embutido é o defeito que este arquivo existe
 * para não ter.
 */
export function lerRegua(raiz = process.cwd()): Regua {
  const doc = readFileSync(path.join(raiz, DOC_DA_VOZ), "utf8");
  const bloco = doc.match(/```json voz\n([\s\S]*?)```/);
  if (!bloco) {
    throw new Error(
      `${DOC_DA_VOZ} não traz o bloco \`\`\`json voz — a régua não existe, ` +
        "e nenhum número aqui a substitui",
    );
  }
  return JSON.parse(bloco[1]) as Regua;
}

/**
 * Tudo o que o aluno lê num arquivo de aula, com o caminho de cada pedaço.
 *
 * A lista é **explícita**, e não uma varredura de todas as strings do JSON: o
 * arquivo tem FEN, UCI, id de posição e slug de obra, e um coletor que
 * adivinha o que é prosa erraria nos dois sentidos. O preço é que um campo de
 * texto novo no schema precisa entrar aqui à mão — e é por isso que o teste
 * confere a contagem contra o roteiro e os nós, em vez de confiar nesta lista.
 */
export function falasDaAula(lesson: Lesson): Fala[] {
  const falas: Fala[] = [];
  const id = lesson.id;

  falas.push({ onde: `${id} / title`, texto: lesson.title, tipo: "rotulo" });

  for (const [erroId, erro] of Object.entries(lesson.errors)) {
    falas.push({ onde: `${id} / errors.${erroId}`, texto: erro.text, tipo: "fala" });
  }
  for (const [chave, texto] of Object.entries(lesson.fallbacks)) {
    falas.push({ onde: `${id} / fallbacks.${chave}`, texto, tipo: "fala" });
  }
  if (lesson.generatedTemplates) {
    for (const [chave, texto] of Object.entries(lesson.generatedTemplates)) {
      falas.push({ onde: `${id} / generatedTemplates.${chave}`, texto, tipo: "fala" });
    }
  }

  // A apresentação é a primeira coisa que o aluno lê na aula, e ficaria fora da
  // régua se não fosse colhida aqui — a lista é explícita de propósito (ver o
  // cabeçalho desta função), e campo novo no schema entra nela à mão.
  const intro = lesson.stages.intro;
  if (intro) {
    for (const [i, passo] of intro.passos.entries()) {
      falas.push({ onde: `${id} / intro.passos[${i}].fala`, texto: passo.fala, tipo: "fala" });
    }
  }

  const objective = lesson.stages.objective;
  if (objective) {
    falas.push({
      onde: `${id} / objective.technique.name`,
      texto: objective.technique.name,
      tipo: "rotulo",
    });
    falas.push({
      onde: `${id} / objective.technique.summary`,
      texto: objective.technique.summary,
      tipo: "fala",
    });
    for (const [i, passo] of objective.roteiro.entries()) {
      falas.push({
        onde: `${id} / objective.roteiro[${i}].fala`,
        texto: passo.fala,
        tipo: "fala",
      });
    }
  }

  const guided = lesson.stages.guided;
  if (guided) {
    if (guided.intro) {
      falas.push({ onde: `${id} / guided.intro`, texto: guided.intro, tipo: "fala" });
    }
    for (const [nodeId, node] of Object.entries(guided.nodes)) {
      if (node.hint) {
        falas.push({ onde: `${id} / guided.${nodeId}.hint`, texto: node.hint, tipo: "fala" });
      }
      for (const [i, expect] of node.expects.entries()) {
        falas.push({
          onde: `${id} / guided.${nodeId}.expects[${i}].feedback`,
          texto: expect.feedback,
          tipo: "fala",
        });
      }
      for (const [i, alt] of (node.authorAlternatives ?? []).entries()) {
        falas.push({
          onde: `${id} / guided.${nodeId}.authorAlternatives[${i}].feedback`,
          texto: alt.feedback,
          tipo: "fala",
        });
      }
    }
  }

  return falas;
}
