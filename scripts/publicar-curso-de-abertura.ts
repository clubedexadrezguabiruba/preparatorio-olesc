/**
 * Publica um curso de abertura inteiro a partir do estudo — o mesmo caminho da tela
 * `/editor/v2/curso-de-abertura` (ler → gravar → aplicar o repertório → Conferir → Publicar), sem
 * clicar cinco vezes por aula.
 *
 *   node scripts/publicar-curso-de-abertura.ts <cor> <abertura> "<nome>" [--publicar]
 *
 *   node scripts/publicar-curso-de-abertura.ts brancas escocesa "Escocesa"
 *   node scripts/publicar-curso-de-abertura.ts pretas siciliana "Siciliana: Dragão Acelerado" --publicar
 *
 * Sem `--publicar` ele só planeja e mostra: as etapas de cada aula, os avisos do estudo e o que
 * aplicar o repertório faria (linhas que nascem, que morrem, texto que muda). Com `--publicar`,
 * grava as aulas, aplica o repertório quando ele muda e publica cada aula que a conferência deixar
 * verde. O estudo é `content/repertorio/rascunhos/estudo-<cor>-<abertura>.pgn`.
 *
 * Precisa do editor local ligado: o script liga `EDITOR_LOCAL=1` e `NODE_ENV=development` só no
 * próprio processo, como `publicar-aula-de-finais.ts`.
 */
import { readFileSync } from "node:fs";

process.env.EDITOR_LOCAL = "1";
(process.env as Record<string, string>).NODE_ENV = "development";

const { planejarCursoDeAbertura } = await import("../lib/editor-v2/planejar-curso.ts");
const { aplicarRepertorioDoCurso, gravarAulasDoCurso, prepararRepertorioDoCurso } = await import("../lib/editor-v2/importar-curso.ts");
const { conferirAulaV2 } = await import("../lib/editor-v2/gate.ts");
const { prepararPublicacaoV2, publicarAulaV2 } = await import("../lib/editor-v2/publicar.ts");

async function main() {
  const argumentos = process.argv.slice(2);
  const publicar = argumentos.includes("--publicar");
  const [cor, abertura, nome] = argumentos.filter((a) => !a.startsWith("--"));
  if ((cor !== "brancas" && cor !== "pretas") || !abertura || !nome) {
    console.error('uso: node scripts/publicar-curso-de-abertura.ts <brancas|pretas> <abertura> "<nome>" [--publicar]');
    process.exit(2);
  }
  const arquivo = `content/repertorio/rascunhos/estudo-${cor}-${abertura}.pgn`;
  const texto = readFileSync(arquivo, "utf8");
  const curso = planejarCursoDeAbertura(texto, { cor, abertura, nomeDaAbertura: nome });

  console.log(`\n${nome} (${arquivo})`);
  for (const { aula, paradas, ramos, linhasDoTreinador } of curso.aulas) {
    console.log(`  ${aula.id}: ${aula.fluxo.length} etapas, ${paradas} perguntas, ${ramos} ramos, ${linhasDoTreinador} linhas no treinador`);
  }
  if (curso.avisos.length) console.log(`avisos do estudo (${curso.avisos.length}):\n  - ${curso.avisos.map((a) => `${a.codigo}${a.capitulo ? ` @${a.capitulo}` : ""}: ${a.mensagem}`).join("\n  - ")}`);

  const preparo = prepararRepertorioDoCurso(curso, abertura);
  if (!preparo.ok) throw new Error(`o repertório não compila: ${preparo.motivo} — ${preparo.problemas.join("; ")}`);
  const { impacto } = preparo;
  console.log(impacto.semMudanca
    ? "repertório: sem mudança"
    : `repertório: nascem ${impacto.nascem.length}, morrem ${impacto.morrem.length}, texto muda em ${impacto.textoMudou}, nível muda em ${impacto.mudamDeNivel.length}${impacto.ordemMudou ? ", a ordem muda" : ""}${impacto.retrancaAvancado ? " — RETRANCA O AVANÇADO" : ""}`);
  for (const linha of impacto.nascem) console.log(`  + ${linha.nome}`);
  for (const linha of impacto.morrem) console.log(`  - ${linha.nome}`);

  if (!publicar) return;

  for (const gravada of gravarAulasDoCurso(curso)) {
    console.log(`gravar ${gravada.id}: ${gravada.ok ? gravada.situacao : `FALHOU — ${gravada.erro}`}`);
    if (!gravada.ok) throw new Error(`a aula ${gravada.id} não foi gravada`);
  }
  if (!impacto.semMudanca) {
    const aplicado = aplicarRepertorioDoCurso(curso, texto, abertura, preparo.impactoHash);
    if (!aplicado.ok) throw new Error(`o repertório não foi aplicado: ${JSON.stringify(aplicado)}`);
    console.log("repertório aplicado");
  }

  for (const { aula } of curso.aulas) {
    const conferencia = await conferirAulaV2(aula.id);
    if (conferencia.impedimento) throw new Error(`${aula.id}: ${conferencia.impedimento}`);
    const erros = conferencia.problemas.filter((p) => p.severidade === "erro");
    const avisos = conferencia.problemas.filter((p) => p.severidade !== "erro");
    console.log(`${aula.id}: conferência ${conferencia.verde ? "VERDE" : "VERMELHA"} — ${erros.length} erro(s), ${avisos.length} aviso(s)`);
    for (const p of erros) console.log(`  X ${p.codigo}: ${p.mensagem}`);
    if (!conferencia.verde) throw new Error(`${aula.id}: não publicada — a conferência não está verde`);
    const preparoDaPublicacao = await prepararPublicacaoV2(aula.id);
    if (!preparoDaPublicacao.ok) throw new Error(`${aula.id}: não publicada — ${preparoDaPublicacao.motivo}`);
    const publicado = await publicarAulaV2(aula.id, { impactoHash: preparoDaPublicacao.impactoHash });
    if (!publicado.ok) throw new Error(`${aula.id}: não publicada — ${publicado.motivo}`);
    console.log(`  PUBLICADA: ${publicado.publicationId}${publicado.anterior ? ` (antes: ${publicado.anterior})` : ""}${publicado.mesmoConteudo ? " — mesmo conteúdo" : ""}`);
  }
}

try {
  await main();
} catch (erro) {
  console.error(`\nFALHOU: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
}
