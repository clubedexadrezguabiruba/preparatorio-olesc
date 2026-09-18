/**
 * A **assinatura** de um PGN de aula de finais: um retrato pequeno do que aquele arquivo
 * produz, para comparar um agente com o seguinte.
 *
 *   node scripts/assinatura-da-aula.ts <ID> <estudo.pgn> [--json] [--contra assinatura.json]
 *
 * ## Por que ela existe
 *
 * Cinco revisores escrevem no mesmo arquivo, cada um na sua camada: o arquiteto mexe em nome
 * e ordem de capítulo, o de scaffolding cria capítulo novo, o de símbolos mexe em `!` e `?`, o
 * de voz no texto dentro das chaves, o de desenho em `[%cal]` e `[%csl]`. **Direito de escrita
 * disjunto sem trava é conselho, não trava.**
 *
 * O `--so-conferir` sozinho não basta: conferido em 18/9/2026, ele conta só os problemas do
 * julgamento e deixa `PERDA` e `FORA` apenas impressos. Um agente que reordenasse capítulos que
 * não devia, ou apagasse um `[%cal]`, passaria limpo por ele.
 *
 * ## O que a assinatura vê, e o que cada camada pode mudar
 *
 * | Depois de | Só pode ter mudado |
 * |---|---|
 * | arquiteto | `capitulos` (nomes e ordem); `fens` e `lances` iguais |
 * | scaffolding | capítulos novos; os que já existiam, intactos |
 * | símbolos | `simbolos` |
 * | voz | `textos`; nada mais |
 * | desenho | `desenhos` |
 *
 * `--contra` compara com uma assinatura gravada e sai com código 1 quando algo mudou fora do
 * que se declarou. A comparação é por **campo**, e o relatório diz o nome do campo — sem isso,
 * "alguma coisa mudou" não ajuda ninguém a achar o quê.
 */
import { readFileSync, writeFileSync } from "node:fs";

process.env.EDITOR_LOCAL = "1";
(process.env as Record<string, string>).NODE_ENV = "development";

const { executarComando } = await import("../lib/editor-v2/comandos.ts");
const { julgarDocumentoV2, lerPosicoesDoConteudoV2 } = await import("../lib/editor-v2/gate.ts");
const { lerEstudo, planejarEstudo } = await import("../lib/editor-v2/importar-estudo.ts");
const { lerRegua } = await import("../lib/lesson/voz.ts");
const { aulaDaTrilha } = await import("../lib/finais/trilha.ts");
type AulaV2 = import("../lib/editor-v2/modelo.ts").AulaV2;

/** O retrato. Cada chave é uma **camada**, e um agente só pode mexer na sua. */
export type AssinaturaDaAula = {
  /** Os capítulos na ordem do fluxo, por título — a planta do arquiteto. */
  capitulos: string[];
  /** As posições de partida de cada análise, ordenadas: o conjunto de FENs da aula. */
  fens: string[];
  /** Todo lance da aula, em UCI, na ordem da árvore: o que o arquiteto não pode inventar. */
  lances: string[];
  /** Os símbolos por lance (`no → [1, 14]`): a camada do revisor de símbolos. */
  simbolos: Record<string, number[]>;
  /** Todo texto que o aluno lê, por lugar: a camada do revisor de voz. */
  textos: Record<string, string>;
  /** Todo desenho, por nó: a camada do revisor de desenho. */
  desenhos: Record<string, string>;
  /** Quantas questões cada treino tem, na ordem do fluxo. */
  questoesPorTreino: number[];
  /** O julgamento: erros e avisos por código. */
  problemas: Record<string, number>;
  /** O que a importação não conseguiu levar — `PERDA` no `--so-conferir`. */
  perdas: string[];
  /** Capítulo do estudo que não virou etapa nenhuma — `FORA` no `--so-conferir`. */
  fora: string[];
};

/** As camadas, na ordem da corrida. Cada agente declara a sua, e a assinatura cobra. */
export const CAMADAS = {
  arquiteto: ["capitulos", "textos", "questoesPorTreino"],
  scaffolding: ["capitulos", "fens", "lances", "textos", "desenhos", "simbolos", "questoesPorTreino"],
  simbolos: ["simbolos", "capitulos", "questoesPorTreino", "textos"],
  voz: ["textos"],
  desenho: ["desenhos"],
} as const satisfies Record<string, readonly (keyof AssinaturaDaAula)[]>;

/**
 * **O que é leitura, e não camada** — e esta distinção custou uma corrida para aparecer.
 *
 * `problemas`, `perdas` e `fora` não são coisas que um agente *escreve*: são o que a régua
 * **diz sobre** o arquivo depois que ele escreveu. Na primeira versão elas entravam na
 * comparação por campo como qualquer outra, e o resultado foi o contrário do pretendido: o
 * revisor de desenho consertou a camada dele, os avisos caíram de 7 para 2 — e a trava o
 * acusou de mexer em `problemas`, que é justamente a prova de que ele fez o trabalho. Todo
 * agente que de fato consertasse a sua camada reprovaria.
 *
 * Então elas ficam **fora do julgamento de camada** e ganham um julgamento próprio, que é o
 * que interessa: **piorar para a corrida**. Um erro novo, uma perda nova ou um capítulo que
 * passou a ficar de fora param a corrida; diminuir é o trabalho acontecendo.
 */
export const LEITURAS = ["problemas", "perdas", "fora"] as const satisfies readonly (keyof AssinaturaDaAula)[];

function montar(id: string, arquivo: string): AulaV2 {
  const leitura = lerEstudo(readFileSync(arquivo, "utf8"));
  const daTrilha = aulaDaTrilha(id);
  const positions = lerPosicoesDoConteudoV2();
  const vazia: AulaV2 = {
    schemaVersion: 2, id, titulo: daTrilha?.nome ?? leitura.estudo.nome ?? id,
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", ...(daTrilha ? { classe: daTrilha.classe as "E" } : {}) },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  };
  const plano = planejarEstudo(vazia, leitura, { destinos: {} }, positions);
  if (!plano.ok) throw new Error(`o estudo não monta: ${plano.mensagem}`);
  const aula = executarComando(vazia, { tipo: "IMPORTAR_ESTUDO", plano: plano.plano, praticas: [], registrosDasPraticas: [] }, positions);
  // As perdas e os capítulos deixados de fora moram na leitura, não na aula montada.
  const comuns = /dicas e os textos de desvio|praticar contra o computador|a prática desta versão não mostra texto/;
  (aula as AulaV2 & { __perdas: string[]; __fora: string[] }).__perdas = leitura.capitulos.flatMap((c) => c.perdas.filter((p) => !comuns.test(p)).map((p) => `${c.titulo}: ${p}`));
  (aula as AulaV2 & { __perdas: string[]; __fora: string[] }).__fora = leitura.capitulos.filter((c) => c.sugerido === "fora").map((c) => `${c.titulo}: ${c.pista}`);
  return aula;
}

export function assinaturaDaAula(id: string, arquivo: string): AssinaturaDaAula {
  const aula = montar(id, arquivo) as AulaV2 & { __perdas: string[]; __fora: string[] };
  const positions = lerPosicoesDoConteudoV2();

  const porId = new Map(aula.capitulos.map((c) => [c.id, c]));
  const capitulos = aula.fluxo.flatMap((etapa) => (etapa.tipo === "capitulo" ? [porId.get(etapa.entidadeId)?.titulo ?? etapa.entidadeId] : []));

  const simbolos: Record<string, number[]> = {};
  const textos: Record<string, string> = {};
  const desenhos: Record<string, string> = {};
  const lances: string[] = [];
  const fens: string[] = [];

  for (const analise of [...aula.analises].sort((a, b) => a.id.localeCompare(b.id))) {
    if (analise.inicio.tipo === "fen") fens.push(analise.inicio.fen);
    for (const id of Object.keys(analise.nos).sort()) {
      const no = analise.nos[id];
      const chave = `${analise.id}/${id}`;
      if (no.uci) lances.push(`${chave}=${no.uci}`);
      if (no.nags?.length) simbolos[chave] = [...no.nags].sort((a, b) => a - b);
      if (no.comentario) textos[`${chave}·comentário`] = no.comentario;
      if (no.desenhos) desenhos[chave] = JSON.stringify(no.desenhos);
    }
  }
  for (const introducao of aula.introducoes) {
    for (const quadro of introducao.quadros) {
      textos[`quadro/${quadro.id}`] = quadro.texto;
      if (quadro.desenhos) desenhos[`quadro/${quadro.id}`] = JSON.stringify(quadro.desenhos);
    }
  }
  for (const capitulo of aula.capitulos) {
    for (const narracao of capitulo.narracoes) textos[`narração/${narracao.id}`] = narracao.texto;
  }
  for (const treino of aula.treinos) {
    textos[`treino/${treino.id}·objetivo`] = treino.objetivo;
    for (const questao of treino.questoes) {
      if (questao.desenhos) desenhos[`questão/${questao.id}`] = JSON.stringify(questao.desenhos);
      for (const resposta of questao.respostas) textos[`resposta/${resposta.id}`] = resposta.feedback;
    }
  }

  const problemas: Record<string, number> = {};
  for (const p of julgarDocumentoV2(aula, positions, lerRegua())) {
    const chave = `${p.severidade === "erro" ? "X" : "!"} ${p.codigo}`;
    problemas[chave] = (problemas[chave] ?? 0) + 1;
  }

  const treinosNoFluxo = aula.fluxo.flatMap((e) => (e.tipo === "treino" ? aula.treinos.filter((t) => t.id === e.entidadeId) : []));
  return {
    capitulos,
    fens: fens.sort(),
    lances: lances.sort(),
    simbolos,
    textos,
    desenhos,
    questoesPorTreino: treinosNoFluxo.map((t) => t.questoes.length),
    problemas,
    perdas: aula.__perdas.sort(),
    fora: aula.__fora.sort(),
  };
}

/** Os campos que mudaram entre duas assinaturas, com um exemplo do que mudou em cada um. */
export function oQueMudou(antes: AssinaturaDaAula, depois: AssinaturaDaAula): Array<{ campo: keyof AssinaturaDaAula; detalhe: string }> {
  const mudancas: Array<{ campo: keyof AssinaturaDaAula; detalhe: string }> = [];
  for (const campo of Object.keys(antes) as (keyof AssinaturaDaAula)[]) {
    const a = antes[campo];
    const b = depois[campo];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (Array.isArray(a) && Array.isArray(b)) {
      const saiu = (a as string[]).filter((x) => !(b as string[]).includes(x as never));
      const entrou = (b as string[]).filter((x) => !(a as string[]).includes(x as never));
      mudancas.push({ campo, detalhe: `${saiu.length} saiu/saíram${saiu.length ? ` (${saiu.slice(0, 3).join(" | ")})` : ""}, ${entrou.length} entrou/entraram${entrou.length ? ` (${entrou.slice(0, 3).join(" | ")})` : ""}` });
      continue;
    }
    const chaves = [...new Set([...Object.keys(a as object), ...Object.keys(b as object)])];
    const diferentes = chaves.filter((k) => JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k]));
    mudancas.push({ campo, detalhe: `${diferentes.length} chave(s): ${diferentes.slice(0, 3).join(", ")}${diferentes.length > 3 ? "…" : ""}` });
  }
  return mudancas;
}

const [id, arquivo, ...resto] = process.argv.slice(2);
if (!id || !arquivo) {
  console.error("uso: node scripts/assinatura-da-aula.ts <ID> <estudo.pgn> [--json] [--contra antes.json] [--camada arquiteto|scaffolding|simbolos|voz|desenho] [--gravar em.json]");
  process.exit(2);
}
const flags = new Map<string, string>();
for (let i = 0; i < resto.length; i += 1) if (resto[i].startsWith("--")) flags.set(resto[i].slice(2), resto[i + 1]?.startsWith("--") === false ? resto[i + 1] : "");

const agora = assinaturaDaAula(id, arquivo);
if (flags.has("gravar") && flags.get("gravar")) writeFileSync(flags.get("gravar")!, JSON.stringify(agora, null, 2), "utf8");

if (flags.has("contra") && flags.get("contra")) {
  const antes: AssinaturaDaAula = JSON.parse(readFileSync(flags.get("contra")!, "utf8"));
  const camada = flags.get("camada") as keyof typeof CAMADAS | undefined;
  const permitidos = camada ? new Set<string>(CAMADAS[camada]) : null;
  const leituras = new Set<string>(LEITURAS);
  const mudancas = oQueMudou(antes, agora);
  if (!mudancas.length) { console.log("assinatura: nada mudou."); process.exit(0); }
  const foraDaCamada = permitidos ? mudancas.filter((m) => !permitidos.has(m.campo) && !leituras.has(m.campo)) : [];
  console.log(`assinatura: ${mudancas.length} campo(s) mudaram${camada ? ` (camada «${camada}»)` : ""}`);
  for (const m of mudancas) {
    const marca = leituras.has(m.campo) ? "·" : permitidos && !permitidos.has(m.campo) ? "X FORA DA CAMADA" : "·";
    console.log(`  ${marca} ${m.campo}: ${m.detalhe}`);
  }

  // A régua das leituras: diminuir é o trabalho acontecendo; **piorar** para a corrida.
  const errosAntes = Object.entries(antes.problemas).filter(([k]) => k.startsWith("X")).reduce((n, [, q]) => n + q, 0);
  const errosAgora = Object.entries(agora.problemas).filter(([k]) => k.startsWith("X")).reduce((n, [, q]) => n + q, 0);
  const piorou: string[] = [];
  if (errosAgora > errosAntes) piorou.push(`erros de ${errosAntes} para ${errosAgora}`);
  if (agora.perdas.length > antes.perdas.length) piorou.push(`PERDA de ${antes.perdas.length} para ${agora.perdas.length}`);
  if (agora.fora.length > antes.fora.length) piorou.push(`FORA de ${antes.fora.length} para ${agora.fora.length}`);
  const avisosAntes = Object.entries(antes.problemas).filter(([k]) => k.startsWith("!")).reduce((n, [, q]) => n + q, 0);
  const avisosAgora = Object.entries(agora.problemas).filter(([k]) => k.startsWith("!")).reduce((n, [, q]) => n + q, 0);
  if (avisosAgora !== avisosAntes) console.log(`  · avisos: ${avisosAntes} → ${avisosAgora}${avisosAgora < avisosAntes ? " (o trabalho acontecendo)" : ""}`);

  if (foraDaCamada.length) {
    console.error(`\nPARE: o agente «${camada}» mexeu em ${foraDaCamada.map((m) => m.campo).join(", ")}, que não é dele. Desfaça com \`git diff\` e refaça só a camada dele.`);
    process.exit(1);
  }
  if (piorou.length) {
    console.error(`\nPARE: a aula piorou — ${piorou.join("; ")}. Isso não é camada: é estrago, e nenhum agente o desfaz sozinho.`);
    process.exit(1);
  }
  process.exit(0);
}

if (flags.has("json")) console.log(JSON.stringify(agora, null, 2));
else {
  console.log(`\n${id} — assinatura de ${arquivo}`);
  console.log(`  capítulos (${agora.capitulos.length}): ${agora.capitulos.join(" → ")}`);
  console.log(`  ${agora.fens.length} FEN(s), ${agora.lances.length} lance(s), ${Object.keys(agora.simbolos).length} lance(s) com símbolo`);
  console.log(`  ${Object.keys(agora.textos).length} texto(s), ${Object.keys(agora.desenhos).length} desenho(s)`);
  console.log(`  questões por treino: ${agora.questoesPorTreino.join(", ") || "nenhum treino"}`);
  console.log(`  problemas: ${Object.entries(agora.problemas).map(([k, n]) => `${k}×${n}`).join(", ") || "nenhum"}`);
  if (agora.perdas.length) console.log(`  PERDA (${agora.perdas.length}):\n    - ${agora.perdas.join("\n    - ")}`);
  if (agora.fora.length) console.log(`  FORA (${agora.fora.length}):\n    - ${agora.fora.join("\n    - ")}`);
}
