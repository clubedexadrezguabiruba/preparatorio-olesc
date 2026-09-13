/**
 * A prova de que a aula v2 grava certo contra o banco de verdade — fatia 7 do Editor v2.
 *
 * Uso:
 *   node --conditions=react-server scripts/verificar-finais-v2.ts
 *   npm run db:finais:v2
 *
 * ## Por que um script próprio, e não mais uma seção de `verificar-finais.ts`
 *
 * Porque aquele script **já falhava antes da fatia 7**, e diz por quê no próprio cabeçalho: as
 * partidas escritas nele são de um KRK que saiu do corpus em 2026-09-08. Uma seção nova lá
 * dentro ficaria afogada num vermelho que não é dela. Este roda até o fim e sai verde ou
 * vermelho pelo que afirma.
 *
 * ## O que ele afirma (§20.2)
 *
 *   1. a prática certa da revisão ativa vira **uma** linha com publicação, entidade, revisão e
 *      número da tentativa, e **um** degrau em `avaliacoes_progresso`;
 *   2. o **retry** com o mesmo `tentativa_id` devolve o mesmo veredito, e continua 1 linha e
 *      1 degrau;
 *   3. a **aba antiga** (publicação anterior, revisão diferente) grava contra o snapshot dela,
 *      sem escada nenhuma para a revisão velha;
 *   4. o **treino** grava com a política do snapshot e a ajuda, e a view `progresso_aula` não o
 *      conta;
 *   5. **sem snapshot** no servidor, a tentativa é guardada à parte e o aluno é mandado reabrir;
 *   6. o que a Ana gravou, o Beto não lê.
 *
 * Os pacotes são montados em memória a partir da N0-LADDER real; nada é escrito em `content/`.
 * No fim, apaga as duas contas de mentira (o `on delete cascade` leva as linhas).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { adaptarLessonV1 } from "../lib/editor-v2/adaptar-v1.ts";
import { lerPosicoesDoConteudoV2 } from "../lib/editor-v2/gate.ts";
import { montarPacoteV2, type PacoteV2 } from "../lib/editor-v2/pacote.ts";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { bancoDasTentativasV2 } from "../lib/finais/gravar-v2-banco.ts";
import { gravarTentativaDeAulaV2 } from "../lib/finais/gravar-v2.ts";
import type { TentativaDeAulaV2 } from "../lib/finais/tentativa-v2.ts";
import { lessonSchema } from "../lib/lesson/schema.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
for (const linha of readFileSync(path.join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const corte = linha.indexOf("=");
  if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
  const nome = linha.slice(0, corte).trim();
  if (!process.env[nome]) process.env[nome] = linha.slice(corte + 1).trim();
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const falhas: string[] = [];
function afirmar(condicao: boolean, oQue: string): void {
  console.log(`  ${condicao ? "ok  " : "FALHOU"} ${oQue}`);
  if (!condicao) falhas.push(oQue);
}

const PIN = "424242";
const SUFIXO = Date.now().toString(36).slice(-5);
const criados: string[] = [];

async function criarConta(usuario: string, nome: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailDoUsuario(usuario), password: PIN, email_confirm: true,
    user_metadata: { usuario, nome, papel: "aluno", equipe: "M" },
  });
  if (error || !data.user) throw new Error(`não deu para criar ${usuario}: ${error?.message}`);
  criados.push(data.user.id);
  return data.user.id;
}

async function entrar(usuario: string): Promise<SupabaseClient> {
  const cliente = createClient(URL_, PUBLICA, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await cliente.auth.signInWithPassword({ email: emailDoUsuario(usuario), password: PIN });
  if (error) throw new Error(`${usuario} não entrou: ${error.message}`);
  return cliente;
}

const positions = lerPosicoesDoConteudoV2(RAIZ);
const lesson = lessonSchema.parse(JSON.parse(readFileSync(path.join(RAIZ, "content", "lessons", "N0-LADDER.json"), "utf8")));
const antigo = montarPacoteV2(adaptarLessonV1(lesson, positions), positions);
const aulaNova = adaptarLessonV1(lesson, positions);
aulaNova.praticas[0].engine = { ...aulaNova.praticas[0].engine, skill: 10 };
const novo = montarPacoteV2(aulaNova, positions);
const conteudo = {
  publicacao: (_aula: string, id: string) => [antigo, novo].find((p) => p.publicationId === id) ?? null,
  ativo: () => novo,
};
const MATE = ["g2g4", "e3d2", "g1g3", "d2c1", "g3g2", "c1b1", "g2e2", "b1a1", "g4g1"];

function tentativaDe(pacote: PacoteV2, tipo: "pratica" | "treino", extra: Partial<TentativaDeAulaV2> = {}): TentativaDeAulaV2 {
  const etapa = pacote.aula.fluxo.find((e) => e.tipo === tipo)!;
  return {
    aula: pacote.aula.id, publicationId: pacote.publicationId, etapaId: etapa.id, entidadeId: etapa.entidadeId, tipo,
    assessmentRevision: pacote.revisoes[etapa.entidadeId].revisao, tentativaId: randomUUID(), tentativaNumero: 1,
    lances: tipo === "pratica" ? MATE : ["g2g4", "g1g3", "g3g2", "g2e2", "g4g1"], tempoMs: 20_000, ...extra,
  };
}

try {
  const ana = await criarConta(`zz.v2.ana.${SUFIXO}`, "Ana V2");
  await criarConta(`zz.v2.beto.${SUFIXO}`, "Beto V2");
  const banco = bancoDasTentativasV2();
  const praticaId = novo.aula.praticas[0].id;

  console.log("\n1. A prática certa da revisão ativa");
  const primeira = tentativaDe(novo, "pratica");
  const r1 = await gravarTentativaDeAulaV2(ana, primeira, conteudo, banco);
  afirmar(JSON.stringify(r1) === JSON.stringify({ sucesso: true, conta: "escada" }), `veredito ${JSON.stringify(r1)}`);
  const { data: linhas1 } = await admin.from("tentativas_aula").select("tentativa_id, publication_id, entidade_id, assessment_revision, tentativa_numero, etapa").eq("aluno", ana);
  afirmar(linhas1?.length === 1, `uma linha (${linhas1?.length})`);
  afirmar(linhas1?.[0]?.publication_id === novo.publicationId && linhas1?.[0]?.assessment_revision === novo.revisoes[praticaId].revisao, "com a publicação e a revisão jogadas");
  const { data: escada1 } = await admin.from("avaliacoes_progresso").select("degrau, tentativas, assessment_revision, origem").eq("aluno", ana);
  afirmar(escada1?.length === 1 && escada1[0].degrau === 1 && escada1[0].tentativas === 1 && escada1[0].origem === "jogada", `um degrau (${JSON.stringify(escada1)})`);

  console.log("\n2. O retry da mesma tentativa");
  const r2 = await gravarTentativaDeAulaV2(ana, primeira, conteudo, banco);
  afirmar(JSON.stringify(r2) === JSON.stringify({ sucesso: true, conta: "escada", repetida: true }), `mesmo veredito, marcado como repetido (${JSON.stringify(r2)})`);
  const { count: linhas2 } = await admin.from("tentativas_aula").select("id", { count: "exact", head: true }).eq("aluno", ana);
  const { data: escada2 } = await admin.from("avaliacoes_progresso").select("tentativas").eq("aluno", ana);
  afirmar(linhas2 === 1, `continua 1 linha (${linhas2})`);
  afirmar(escada2?.length === 1 && escada2[0].tentativas === 1, `continua 1 degrau e 1 tentativa na escada (${JSON.stringify(escada2)})`);

  console.log("\n3. A aba antiga, contra a publicação anterior");
  const r3 = await gravarTentativaDeAulaV2(ana, tentativaDe(antigo, "pratica"), conteudo, banco);
  afirmar(JSON.stringify(r3) === JSON.stringify({ sucesso: true, conta: "historico" }), `grava sem domínio (${JSON.stringify(r3)})`);
  const { data: velha } = await admin.from("avaliacoes_progresso").select("aluno").eq("aluno", ana).eq("assessment_revision", antigo.revisoes[praticaId].revisao);
  afirmar(velha?.length === 0, `nenhuma escada para a revisão antiga (${velha?.length})`);
  const { data: daAntiga } = await admin.from("tentativas_aula").select("publication_id").eq("aluno", ana).eq("publication_id", antigo.publicationId);
  afirmar(daAntiga?.length === 1, "a linha guarda a publicação antiga");

  console.log("\n4. O treino");
  const r4 = await gravarTentativaDeAulaV2(ana, tentativaDe(novo, "treino", { ajuda: true }), conteudo, banco);
  afirmar(JSON.stringify(r4) === JSON.stringify({ sucesso: true, conta: "registro" }), `registra (${JSON.stringify(r4)})`);
  const { data: treino } = await admin.from("tentativas_aula").select("politica_defensor, ajuda").eq("aluno", ana).eq("etapa", "treino");
  afirmar(treino?.length === 1 && treino[0].politica_defensor === "deterministica" && treino[0].ajuda === true, `com política e ajuda (${JSON.stringify(treino)})`);
  const clienteDaAna = await entrar(`zz.v2.ana.${SUFIXO}`);
  const { data: view } = await clienteDaAna.from("progresso_aula").select("tentativas").eq("aula", "N0-LADDER");
  afirmar(view?.[0]?.tentativas === 2, `a view conta 2 práticas e não o treino (${JSON.stringify(view)})`);

  console.log("\n5. Sem o snapshot no servidor");
  const r5 = await gravarTentativaDeAulaV2(ana, tentativaDe(novo, "pratica", { publicationId: "pub-0000000000000000" }), conteudo, banco);
  afirmar("reabrir" in r5, `manda reabrir (${JSON.stringify(r5)})`);
  const { data: guardada } = await admin.from("tentativas_v2_sem_snapshot").select("publication_id").eq("aluno", ana);
  afirmar(guardada?.length === 1, `a tentativa ficou guardada à parte (${guardada?.length})`);
  const { count: linhas5 } = await admin.from("tentativas_aula").select("id", { count: "exact", head: true }).eq("aluno", ana);
  afirmar(linhas5 === 3, `e não virou linha julgada (${linhas5})`);

  console.log("\n6. O que a Ana gravou, o Beto não lê");
  const beto = await entrar(`zz.v2.beto.${SUFIXO}`);
  const { data: escadaPorBeto } = await beto.from("avaliacoes_progresso").select("aluno").eq("aluno", ana);
  const { data: tentativasPorBeto } = await beto.from("tentativas_aula").select("id").eq("aluno", ana);
  afirmar(escadaPorBeto?.length === 0 && tentativasPorBeto?.length === 0, "Beto lê zero linhas da Ana");
  const { data: escadaPelaAna } = await clienteDaAna.from("avaliacoes_progresso").select("aluno");
  afirmar(escadaPelaAna?.length === 1, `a Ana lê a escada dela (${escadaPelaAna?.length})`);
} finally {
  for (const id of criados) await admin.auth.admin.deleteUser(id);
  console.log("\nContas de mentira apagadas.");
}

if (falhas.length) {
  console.error(`\n${falhas.length} afirmação(ões) falharam.`);
  process.exit(1);
}
console.log("\nTudo verde.");
