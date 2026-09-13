/**
 * Copia o progresso da aula v1 para a revisão da prática v2 — só quando a avaliação é a mesma.
 *
 * Uso:
 *   node scripts/migrar-progresso-v1.ts N0-LADDER            (só mostra o que faria)
 *   node scripts/migrar-progresso-v1.ts N0-LADDER --aplicar
 *
 * ## A regra (plano §10, especificação §20.3)
 *
 * "Associar progresso à revisão compatível inicial apenas quando o contrato de avaliação
 * permaneceu equivalente. Não fabricar histórico por capítulo ou questão que nunca foi
 * registrado."
 *
 * O domínio v1 mora em `finais_progresso`, por (aluno, aula), e é a escada da **prática**. A
 * prática v1 adaptada tem uma `assessmentRevision` (`avaliacao.ts`); se ela é **igual** à da
 * prática na publicação v2 ativa, a tarefa é a mesma e o degrau vale. Se não, nada é copiado —
 * o aluno recomeça a revisão nova, e a linha v1 fica onde está, como história.
 *
 * Só a prática. Treino não tinha escada no v1, e inventar uma seria fabricar histórico.
 * `on conflict do nothing`: rodar de novo não rebaixa ninguém que já jogou a revisão nova.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { adaptarLessonV1 } from "../lib/editor-v2/adaptar-v1.ts";
import { revisaoDaPraticaV2 } from "../lib/editor-v2/avaliacao.ts";
import { lerPosicoesDoConteudoV2 } from "../lib/editor-v2/gate.ts";
import { pacoteAtivoDoAluno } from "../lib/finais/conteudo-v2.ts";
import { lessonSchema } from "../lib/lesson/schema.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
for (const linha of readFileSync(path.join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const corte = linha.indexOf("=");
  if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
  const nome = linha.slice(0, corte).trim();
  if (!process.env[nome]) process.env[nome] = linha.slice(corte + 1).trim();
}

const aula = process.argv[2];
const aplicar = process.argv.includes("--aplicar");
if (!aula || aula.startsWith("--")) {
  console.error("Uso: node scripts/migrar-progresso-v1.ts <AULA> [--aplicar]");
  process.exit(1);
}

const pacote = pacoteAtivoDoAluno(aula, path.join(RAIZ, "content"));
if (!pacote) {
  console.error(`A aula ${aula} não tem publicação v2 ativa — publique antes de migrar o progresso.`);
  process.exit(1);
}
const positions = lerPosicoesDoConteudoV2(RAIZ);
const lesson = lessonSchema.parse(JSON.parse(readFileSync(path.join(RAIZ, "content", "lessons", `${aula}.json`), "utf8")));
const adaptada = adaptarLessonV1(lesson, positions);
const praticaV1 = adaptada.praticas[0];
const praticaV2 = pacote.aula.praticas[0];

console.log(`\nAula ${aula} — publicação v2 ativa ${pacote.publicationId}`);
if (!praticaV1 || !praticaV2) {
  console.log("Uma das duas não tem prática: não há escada para migrar.");
  process.exit(0);
}
const revisaoV1 = revisaoDaPraticaV2(adaptada, praticaV1.id, positions);
const revisaoV2 = pacote.revisoes[praticaV2.id]?.revisao;
const equivalente = praticaV1.id === praticaV2.id && revisaoV1 === revisaoV2;
console.log(`  prática v1: ${praticaV1.id} ${revisaoV1.slice(0, 15)}…`);
console.log(`  prática v2: ${praticaV2.id} ${revisaoV2?.slice(0, 15)}…`);
if (!equivalente) {
  console.log("\nA avaliação mudou: nada é copiado. O domínio v1 fica como história, e a revisão nova começa do zero.");
  process.exit(0);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: linhas, error } = await admin
  .from("finais_progresso")
  .select("aluno, degrau, revisar_em, tentativas, erros, aprendida_em, ultima_em")
  .eq("aula", aula);
if (error) {
  console.error(`Não foi possível ler finais_progresso: ${error.message}`);
  process.exit(1);
}
const { data: existentes } = await admin
  .from("avaliacoes_progresso")
  .select("aluno")
  .eq("aula", aula).eq("entidade_id", praticaV2.id).eq("assessment_revision", revisaoV2!);
const jaTem = new Set((existentes ?? []).map((l) => l.aluno as string));
const novas = (linhas ?? []).filter((l) => !jaTem.has(l.aluno as string));

console.log(`\n  ${linhas?.length ?? 0} linha(s) em finais_progresso; ${jaTem.size} aluno(s) já com a revisão v2; ${novas.length} a copiar.`);
if (!aplicar) {
  console.log("  (sem --aplicar: nada foi escrito)");
  process.exit(0);
}
if (novas.length) {
  const { error: erroAoCopiar } = await admin.from("avaliacoes_progresso").upsert(
    novas.map((l) => ({ ...l, aula, entidade_id: praticaV2.id, assessment_revision: revisaoV2!, origem: "migrada-v1" })),
    { onConflict: "aluno,aula,entidade_id,assessment_revision", ignoreDuplicates: true },
  );
  if (erroAoCopiar) {
    console.error(`A cópia falhou: ${erroAoCopiar.message}`);
    process.exit(1);
  }
}
console.log(`  ${novas.length} linha(s) copiada(s) com origem migrada-v1.`);
