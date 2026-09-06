/**
 * A prova de que as aulas de finais contam certo. Roda contra o banco de verdade.
 *
 * Uso:
 *   node --conditions=react-server scripts/verificar-finais.ts
 *   npm run db:finais
 *
 * ## Por que isto não é teste unitário
 *
 * `lib/finais/rejulgar.test.ts` já prova o juiz em memória, lance a lance. O
 * que ele **não** alcança é a corrente inteira: ler a aula do disco pelo
 * caminho que o servidor usa, reproduzir os lances, gravar com a chave de
 * serviço, e o aluno conseguir ler de volta o próprio progresso pela view — e
 * só o próprio.
 *
 * É essa corrente que decide se "o aluno dominou a aula e aparece no relatório".
 * Cada elo tem teste; a emenda, não tinha. É o gêmeo de
 * `scripts/verificar-tatica.ts`, e existe pelo mesmo motivo.
 *
 * O que ele afirma:
 *
 *   1. o servidor acha a aula no disco, com as posições que ela referencia;
 *   2. a linha principal da etapa 4 é gravada como sucesso, e a linha
 *      interrompida no meio como fracasso — as duas viram linha;
 *   3. a prática que termina em mate é sucesso, e a que entrega a torre não é;
 *   4. o que é **forjado não vira linha nenhuma**: lance ilegal, aula
 *      inventada, etapa inventada;
 *   5. o aluno lê as próprias tentativas, e a view `progresso_aula` soma o
 *      mesmo que a tabela;
 *   6. a view diz `solo_ok` e `pratica_ok` verdadeiros — que é o que a trilha
 *      vai ler para dizer "dominada";
 *   7. o vizinho lê **zero**, e não consegue gravar por conta própria.
 *
 * ## O defensor da prática coopera, e está dito
 *
 * Nos itens 3 e 4 quem joga os dois lados é este script — não há Stockfish aqui.
 * A partida de mate é curta porque o rei preto anda para o mate, e a de empate
 * porque ele aceita a torre. Isso não enfraquece a prova: o que está sendo
 * afirmado é que **o servidor lê a partida e a julga**, não que a técnica do
 * aluno seja boa. O limite disso está escrito em `lib/finais/rejulgar.ts` —
 * contra o aluno que escreve os dois lados sobra o `tempo_ms` no relatório.
 *
 * No fim, apaga as duas contas de mentira. `on delete cascade` leva junto as
 * tentativas.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { lerPacote } from "../lib/finais/conteudo.ts";
import { gravarTentativaDeAula } from "../lib/finais/gravar.ts";
import { respostasDe } from "../lib/lesson/tree.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

for (const linha of readFileSync(path.join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const corte = linha.indexOf("=");
  if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
  const nome = linha.slice(0, corte).trim();
  if (!process.env[nome]) process.env[nome] = linha.slice(corte + 1).trim();
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SERVICO = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(URL_, SERVICO, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ------------------------------------------------------------------ *
 * A régua
 * ------------------------------------------------------------------ */

const falhas: string[] = [];

function afirmar(condicao: boolean, oQue: string): void {
  console.log(`  ${condicao ? "ok  " : "FALHOU"} ${oQue}`);
  if (!condicao) falhas.push(oQue);
}

/* ------------------------------------------------------------------ *
 * As contas de mentira
 * ------------------------------------------------------------------ */

const SUFIXO = Date.now().toString(36).slice(-5);
const PIN = "424242";
const AULA = "N0-R-MATE";

/**
 * As duas partidas da etapa 5, jogadas dos dois lados a partir da posição da
 * prática (`4k3/8/8/8/8/8/8/4K2R w - - 0 1`, o KRK de Staunton). Conferidas no
 * tabuleiro: a primeira termina em mate, a segunda em rei contra rei.
 */
const PRATICA_QUE_MATA = [
  "e1e2", "e8d8", "e2e3", "d8e8", "e3e4", "e8d8", "e4e5",
  "d8e8", "e5e6", "e8d8", "h1h7", "d8e8", "h7h8",
];
const PRATICA_QUE_ENTREGA_A_TORRE = ["h1h6", "e8e7", "h6g6", "e7f7", "g6g7", "f7g7"];

type Conta = { id: string; usuario: string };

async function criarConta(usuario: string, nome: string): Promise<Conta> {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailDoUsuario(usuario),
    password: PIN,
    email_confirm: true,
    user_metadata: { usuario, nome, papel: "aluno", equipe: "M" },
  });
  if (error || !data.user) throw new Error(`não deu para criar ${usuario}: ${error?.message}`);
  return { id: data.user.id, usuario };
}

async function entrar(usuario: string): Promise<SupabaseClient> {
  const cliente = createClient(URL_, PUBLICA, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await cliente.auth.signInWithPassword({
    email: emailDoUsuario(usuario),
    password: PIN,
  });
  if (error) throw new Error(`${usuario} não entrou: ${error.message}`);
  return cliente;
}

/* ------------------------------------------------------------------ *
 * A corrida
 * ------------------------------------------------------------------ */

const contas: Conta[] = [];

try {
  console.log(`Banco: ${URL_}\n`);

  const ana = await criarConta(`teste.finais.a${SUFIXO}`, "Ana de Teste");
  contas.push(ana);
  const bruno = await criarConta(`teste.finais.b${SUFIXO}`, "Bruno de Teste");
  contas.push(bruno);

  /* ---------------------------------------------------------------- *
   * 1. A aula sai do disco
   * ---------------------------------------------------------------- */
  console.log(`\nA aula "${AULA}" no disco:`);
  const pacote = lerPacote(AULA);
  afirmar(pacote !== null, "o servidor acha a aula pelo id");
  if (!pacote) throw new Error("sem a aula não há o que provar");

  const solo = pacote.lesson.stages.solo!;
  afirmar(Boolean(solo), "a aula tem etapa sem ajuda");
  afirmar(
    Boolean(pacote.positions[pacote.lesson.stages.practice!.positionId]),
    "a posição da prática veio junto",
  );

  // A linha principal, caminhada do arquivo — nunca escrita à mão aqui. Se a
  // posição de ensino mudar, esta prova continua valendo sozinha.
  const linha: string[] = [];
  let nodeId = solo.root;
  for (let i = 0; i < 60 && nodeId; i += 1) {
    const expect = solo.nodes[nodeId].expects[0];
    linha.push(expect.moves[0]);
    const respostas = respostasDe(expect);
    if (respostas.length === 0) break;
    nodeId = respostas[0].next;
  }
  afirmar(linha.length > 1, `a linha principal tem ${linha.length} lances`);

  /* ---------------------------------------------------------------- *
   * 2 e 3. O que a Ana joga
   * ---------------------------------------------------------------- */
  console.log("\nA Ana joga:");

  const soloCerto = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "solo",
    lances: linha,
    tempoMs: 92_000,
  });
  afirmar(
    "sucesso" in soloCerto && soloCerto.sucesso,
    `a linha inteira da etapa 4 é sucesso (${JSON.stringify(soloCerto)})`,
  );

  const soloErrado = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "solo",
    lances: linha.slice(0, -1),
    tempoMs: 45_000,
  });
  afirmar(
    "sucesso" in soloErrado && soloErrado.sucesso === false,
    "a linha interrompida no meio vira linha, e vira como fracasso",
  );

  const praticaGanha = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "pratica",
    lances: PRATICA_QUE_MATA,
    tempoMs: 320_000,
  });
  afirmar(
    "sucesso" in praticaGanha && praticaGanha.sucesso,
    `a prática que termina em mate é sucesso (${JSON.stringify(praticaGanha)})`,
  );

  const praticaEmpatada = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "pratica",
    lances: PRATICA_QUE_ENTREGA_A_TORRE,
    tempoMs: 60_000,
  });
  afirmar(
    "sucesso" in praticaEmpatada && praticaEmpatada.sucesso === false,
    "entregar a torre é empate, e empate não passa numa aula de vitória",
  );

  /* ---------------------------------------------------------------- *
   * 4. O que o servidor recusa
   * ---------------------------------------------------------------- */
  console.log("\nO que o servidor recusa:");

  // O forjado clássico: a lista curta que "chegou ao mate". O lance é ilegal na
  // posição, e a linha não chega a existir.
  const forjado = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "solo",
    lances: ["h1h8"],
    tempoMs: 900,
  });
  afirmar("erro" in forjado, `lance ilegal não vira linha (${JSON.stringify(forjado)})`);

  const aulaInventada = await gravarTentativaDeAula(ana.id, {
    aula: "N9-NAO-EXISTE",
    etapa: "solo",
    lances: linha,
    tempoMs: 1000,
  });
  afirmar("erro" in aulaInventada, "aula inventada não vira linha nenhuma");

  const etapaInventada = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    // O tipo proíbe; o navegador, não. É por isso que a função confere.
    etapa: "leitura" as "solo",
    lances: linha,
    tempoMs: 1000,
  });
  afirmar("erro" in etapaInventada, "etapa desconhecida é recusada");

  /* ---------------------------------------------------------------- *
   * 5 e 6. O que a Ana lê de volta
   * ---------------------------------------------------------------- */
  console.log("\nO que a Ana lê:");
  const comoAna = await entrar(ana.usuario);

  const { count: linhasDaAna } = await comoAna
    .from("tentativas_aula")
    .select("*", { count: "exact", head: true });
  afirmar(linhasDaAna === 4, `a Ana tem 4 tentativas (leu ${linhasDaAna})`);

  const { data: progressoDaAna } = await comoAna
    .from("progresso_aula")
    .select("aula, solo_ok, pratica_ok, tentativas");

  afirmar(progressoDaAna?.length === 1, `a view devolve 1 aula (devolveu ${progressoDaAna?.length})`);
  const daAula = (progressoDaAna ?? []).find((l) => l.aula === AULA);
  afirmar(Boolean(daAula), `a linha da view é a da aula ${AULA}`);
  afirmar(
    daAula?.tentativas === linhasDaAna,
    `a view soma o mesmo que a tabela (${daAula?.tentativas} = ${linhasDaAna})`,
  );
  // É isto que a trilha vai ler para dizer "dominada" na aula completa: as duas
  // metades, em qualquer momento — e o fracasso ao lado não desfaz nenhuma.
  afirmar(daAula?.solo_ok === true, "a view diz que a etapa sem ajuda saiu");
  afirmar(daAula?.pratica_ok === true, "a view diz que a prática saiu");

  /* ---------------------------------------------------------------- *
   * 7. O que o Bruno **não** lê
   * ---------------------------------------------------------------- */
  console.log("\nO que o Bruno não lê:");
  const comoBruno = await entrar(bruno.usuario);

  const { data: progressoDoBruno } = await comoBruno
    .from("progresso_aula")
    .select("aluno, aula, tentativas");
  afirmar(
    (progressoDoBruno ?? []).length === 0,
    `o Bruno não enxerga o progresso da Ana (viu ${(progressoDoBruno ?? []).length} linha(s))`,
  );

  const { count: tentativasVistasPeloBruno } = await comoBruno
    .from("tentativas_aula")
    .select("*", { count: "exact", head: true });
  afirmar(
    tentativasVistasPeloBruno === 0,
    `o Bruno lê 0 tentativas (leu ${tentativasVistasPeloBruno})`,
  );

  const { error: erroDeEscrita } = await comoBruno.from("tentativas_aula").insert({
    aluno: bruno.id,
    aula: AULA,
    etapa: "solo",
    sucesso: true,
    lances: ["a1a8"],
    tempo_ms: 1,
  });
  afirmar(erroDeEscrita !== null, "o aluno logado não grava tentativa de aula por conta própria");
} catch (erro) {
  falhas.push(erro instanceof Error ? erro.message : String(erro));
  console.error(`\n${erro instanceof Error ? erro.message : erro}`);
} finally {
  for (const conta of contas) {
    await admin.auth.admin.deleteUser(conta.id);
  }
  if (contas.length) console.log(`\n${contas.length} conta(s) de teste apagada(s).`);
}

if (falhas.length) {
  console.error(`\n${falhas.length} afirmação(ões) falharam:`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("\nOs finais contam certo.");
}
