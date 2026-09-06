/**
 * A prova de que a tática conta certo. Roda contra o banco de verdade.
 *
 * Uso:
 *   node scripts/verificar-tatica.ts
 *
 * ## Por que isto não é teste unitário
 *
 * Os testes de `lib/tatica/` já provam o juiz e o sorteio em memória. O que
 * eles **não** alcançam é a corrente inteira: ler o arquivo do puzzle do disco
 * pelo caminho que o servidor usa, julgar, gravar com a chave de serviço, e o
 * aluno conseguir ler de volta o próprio número — e só o próprio.
 *
 * É essa corrente que decide se "o aluno resolveu 10 puzzles e aparece no
 * relatório". Cada elo tem teste; a emenda, não tinha.
 *
 * O que ele afirma:
 *
 *   1. o servidor acha no disco os puzzles que serviu, pelo id;
 *   2. a solução certa é gravada como acerto, e um lance errado como erro;
 *   3. um "acerto" com lance errado **não** é aceito — é o servidor que julga;
 *   4. o aluno lê o próprio progresso pela view `progresso_tema`;
 *   5. o aluno **não** lê o progresso do outro aluno (a view respeita a RLS);
 *   6. a contagem do progresso bate com o `count(*)` da tabela;
 *   7. **(F2)** toda linha nasce com `origem`, e a fila de revisão derivada do
 *      banco põe os errados de hoje em hoje+2 — nem antes nem depois;
 *   8. **(F2)** a prova serve de volta os puzzles errados, que é a frase que a
 *      tela promete ao aluno desde o primeiro dia;
 *   9. **(F2)** o modo `revisao` grava, e um acerto nele **antes do prazo** não
 *      sobe o puzzle de nível;
 *  10. **(F2)** a view `minutos_por_dia` põe a linha de agora no dia de
 *      Guabiruba — a afirmação que prova que o fuso do SQL
 *      (`at time zone 'America/Sao_Paulo'`) e o do TypeScript (`hojeNoBrasil`)
 *      concordam. Os dois estão escritos à mão, em linguagens diferentes, e
 *      discordariam em silêncio entre 21h e meia-noite.
 *
 * No fim, apaga as duas contas de mentira. `on delete cascade` leva junto as
 * tentativas.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { hojeNoBrasil, somarDias } from "../lib/curso/calendario.ts";
import { puzzlesDoTema } from "../lib/tatica/banco.ts";
import { escolherPuzzles } from "../lib/tatica/escolher.ts";
import { gravarTentativa } from "../lib/tatica/gravar.ts";
import { filaDeRevisao, INTERVALOS_DA_REVISAO, type LinhaDeTentativa } from "../lib/tatica/revisao.ts";
import { emOrdemDeRating, idsErradosParaAProva, sortear } from "../lib/tatica/serie.ts";

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
const TEMA = "mateIn1";
const QUANTOS = 10;
/** Destes dez, dois são errados de propósito. */
const ERRADOS = 2;

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

  const ana = await criarConta(`teste.tatica.a${SUFIXO}`, "Ana de Teste");
  contas.push(ana);
  const bruno = await criarConta(`teste.tatica.b${SUFIXO}`, "Bruno de Teste");
  contas.push(bruno);

  // A mesma escolha que a página faz: o banco do tema, sorteado pelo id do
  // aluno, em rating crescente.
  console.log(`\nEscolhendo ${QUANTOS} puzzles de "${TEMA}" como a página escolhe:`);
  const doTema = await puzzlesDoTema(TEMA);
  afirmar(doTema.length > 100, `o tema tem puzzles no disco (${doTema.length})`);

  const escolhidos = emOrdemDeRating(sortear(doTema, QUANTOS, ana.id, new Set()));
  afirmar(escolhidos.length === QUANTOS, `saíram ${QUANTOS} puzzles`);
  afirmar(
    escolhidos.every((p, i) => i === 0 || p.rating >= escolhidos[i - 1].rating),
    "a série sai em rating crescente",
  );

  /* ---------------------------------------------------------------- *
   * A Ana resolve: oito certos e dois errados
   * ---------------------------------------------------------------- */
  console.log("\nA Ana resolve:");
  let certosEsperados = 0;

  const idsErrados: string[] = [];

  for (const [i, p] of escolhidos.entries()) {
    // A solução do aluno são os lances de índice ímpar: o par é do adversário.
    const solucao = p.lances.filter((_, j) => j % 2 === 1);
    const errar = i < ERRADOS;
    if (errar) idsErrados.push(p.id);
    // Um lance legal e errado, tirado do próprio arquivo: o primeiro lance do
    // adversário jogado ao contrário nunca é a solução.
    const lances = errar ? ["a1a1", ...solucao.slice(1)] : solucao;
    if (!errar) certosEsperados++;

    const r = await gravarTentativa(ana.id, {
      puzzleId: p.id,
      tema: TEMA,
      origem: TEMA,
      modo: i < 5 ? "aquecimento" : "serie",
      lances,
      tempoMs: 4000 + i * 250,
    });

    if ("erro" in r) {
      afirmar(false, `puzzle ${p.id}: ${r.erro}`);
      continue;
    }
    afirmar(r.acertou === !errar, `puzzle ${p.id} gravado como ${r.acertou ? "certo" : "erro"}`);
  }

  /* ---------------------------------------------------------------- *
   * O que o servidor recusa
   * ---------------------------------------------------------------- */
  console.log("\nO que o servidor recusa:");

  const forjado = await gravarTentativa(ana.id, {
    puzzleId: escolhidos[0].id,
    tema: TEMA,
    origem: TEMA,
    modo: "serie",
    lances: ["h1h8", "a8a1"],
    tempoMs: 10,
  });
  afirmar(
    "acertou" in forjado && forjado.acertou === false,
    "lance errado mandado como tentativa não vira acerto",
  );

  const inventado = await gravarTentativa(ana.id, {
    puzzleId: "naoexiste",
    tema: TEMA,
    origem: TEMA,
    modo: "serie",
    lances: ["e2e4"],
    tempoMs: 10,
  });
  afirmar("erro" in inventado, "puzzle inventado não vira linha nenhuma");

  const modoInvalido = await gravarTentativa(ana.id, {
    puzzleId: escolhidos[0].id,
    tema: TEMA,
    origem: TEMA,
    // O tipo proíbe; o navegador, não. É por isso que a função confere.
    modo: "roubo" as "serie",
    lances: [],
    tempoMs: 10,
  });
  afirmar("erro" in modoInvalido, "modo desconhecido é recusado");

  /* ---------------------------------------------------------------- *
   * O que a Ana lê de volta
   * ---------------------------------------------------------------- */
  console.log("\nO que a Ana lê:");
  const comoAna = await entrar(ana.usuario);

  const { count: linhasDaAna } = await comoAna
    .from("tentativas_puzzle")
    .select("*", { count: "exact", head: true });
  // Onze: os dez da série mais o forjado. O inventado e o de modo inválido não
  // chegaram a virar linha. (A revisão, mais abaixo, acrescenta a décima
  // segunda — e é reconferida lá.)
  afirmar(linhasDaAna === QUANTOS + 1, `a Ana tem ${QUANTOS + 1} tentativas (leu ${linhasDaAna})`);

  const { data: progressoDaAna } = await comoAna
    .from("progresso_tema")
    .select("tema, modo, tentativas, acertos");

  const somaTentativas = (progressoDaAna ?? []).reduce((s, l) => s + l.tentativas, 0);
  const somaAcertos = (progressoDaAna ?? []).reduce((s, l) => s + l.acertos, 0);

  afirmar(
    somaTentativas === linhasDaAna,
    `a view soma o mesmo que a tabela (${somaTentativas} = ${linhasDaAna})`,
  );
  afirmar(
    somaAcertos === certosEsperados,
    `os acertos batem com o esperado (${somaAcertos} = ${certosEsperados})`,
  );
  afirmar(
    (progressoDaAna ?? []).every((l) => l.tema === TEMA),
    "o progresso está no tema certo",
  );

  /* ---------------------------------------------------------------- *
   * A F2: origem, fila de revisão, prova e o fuso
   * ---------------------------------------------------------------- */
  console.log("\nA revisão espaçada, derivada das linhas que a Ana acabou de gravar:");

  const { data: cruas } = await comoAna
    .from("tentativas_puzzle")
    .select("puzzle_id, tema, origem, modo, acertou, criada_em")
    .order("criada_em");
  const linhas = (cruas ?? []) as LinhaDeTentativa[];

  // `origem` é a coluna que a 0005 acrescentou, e a fila não reencontra o
  // puzzle no disco sem ela: `puzzlePorId(origem, id)`. Nullable no banco para
  // não quebrar linha antiga — o que se cobra aqui é que o **servidor de hoje**
  // sempre a escreva.
  afirmar(
    linhas.length > 0 && linhas.every((l) => l.origem === TEMA),
    `toda linha nova traz origem = "${TEMA}" (${linhas.filter((l) => l.origem === TEMA).length}/${linhas.length})`,
  );

  const hoje = hojeNoBrasil();
  const daqui = (n: number) => somarDias(hoje, n);

  // Hoje a fila está vazia **por desenho**: quem errou agora volta em dois
  // dias, não na mesma tarde. Se esta afirmação falhar para cima, a tela
  // estaria servindo o mesmo puzzle que o aluno acabou de errar — que é
  // decorar, não reter.
  afirmar(
    filaDeRevisao(linhas, hoje).length === 0,
    `a fila de hoje está vazia (tem ${filaDeRevisao(linhas, hoje).length})`,
  );

  const emDoisDias = filaDeRevisao(linhas, daqui(INTERVALOS_DA_REVISAO[0]));
  afirmar(
    emDoisDias.length === ERRADOS,
    `em ${hoje} + ${INTERVALOS_DA_REVISAO[0]} dias a fila tem os ${ERRADOS} errados (tem ${emDoisDias.length})`,
  );
  afirmar(
    emDoisDias.every((i) => idsErrados.includes(i.puzzleId)),
    "e são exatamente os puzzles que ela errou",
  );
  afirmar(
    emDoisDias.every((i) => i.nivel === 1 && i.origem === TEMA && i.devidoEm === daqui(2)),
    "cada um no nível 1, com a origem certa e vencendo em hoje+2",
  );
  // A borda: um dia antes ainda não vence. Sem esta, um `<=` trocado por `<`
  // passaria despercebido nas duas afirmações de cima.
  afirmar(
    filaDeRevisao(linhas, daqui(1)).length === 0,
    "e um dia antes do prazo ainda não vence",
  );

  console.log("\nA prova serve de volta o que a Ana errou:");

  // O mesmo caminho da página: as linhas do tema decidem quais errados voltam,
  // e `escolherPuzzles` monta a rodada. Aqui as linhas vêm do banco pela RLS da
  // Ana, e não de um objeto de mentira.
  const paraAProva = idsErradosParaAProva(
    linhas.map((l) => ({ puzzle_id: l.puzzle_id, modo: l.modo, acertou: l.acertou })),
  );
  afirmar(
    paraAProva.length === ERRADOS && paraAProva.every((id) => idsErrados.includes(id)),
    `os ${ERRADOS} errados entram na lista da prova (entraram ${paraAProva.length})`,
  );

  const prova = await escolherPuzzles({
    tag: TEMA,
    etapa: "prova",
    faltam: 10,
    semente: ana.id,
    jaVistos: new Set(linhas.map((l) => l.puzzle_id)),
    outrosTemas: [],
    errados: paraAProva,
  });
  const naProva = new Set(prova.map((p) => p.id));
  afirmar(
    idsErrados.every((id) => naProva.has(id)),
    `a prova serve os ${ERRADOS} errados de volta (serviu ${idsErrados.filter((id) => naProva.has(id)).length})`,
  );
  afirmar(
    prova.every((p) => p.origem === TEMA),
    "e toda vaga da prova sabe de que arquivo o puzzle veio",
  );

  console.log("\nO modo `revisao` grava — e o acerto adiantado não vale:");

  const paraRevisar = escolhidos.find((p) => p.id === idsErrados[0])!;
  const revisao = await gravarTentativa(ana.id, {
    puzzleId: paraRevisar.id,
    tema: TEMA,
    origem: TEMA,
    modo: "revisao",
    lances: paraRevisar.lances.filter((_, j) => j % 2 === 1),
    tempoMs: 7000,
  });
  afirmar(
    "acertou" in revisao && revisao.acertou === true,
    `a revisão gravou como acerto (${"erro" in revisao ? revisao.erro : "sem erro"})`,
  );

  const { data: depoisDaRevisao } = await comoAna
    .from("tentativas_puzzle")
    .select("puzzle_id, tema, origem, modo, acertou, criada_em")
    .order("criada_em");
  const linhas2 = (depoisDaRevisao ?? []) as LinhaDeTentativa[];
  afirmar(
    linhas2.length === QUANTOS + 2,
    `a Ana passa a ter ${QUANTOS + 2} tentativas (leu ${linhas2.length})`,
  );
  afirmar(
    linhas2.some((l) => l.modo === "revisao" && l.origem === TEMA),
    "a linha de revisão está lá, com origem",
  );

  // Acertar hoje um puzzle que só vence em hoje+2 é lembrar de meia hora
  // atrás, não reter. A regra está em `lib/tatica/revisao.ts`; aqui ela é
  // cobrada de ponta a ponta, com a linha vinda do banco.
  const aindaEmDoisDias = filaDeRevisao(linhas2, daqui(INTERVALOS_DA_REVISAO[0]));
  afirmar(
    aindaEmDoisDias.length === ERRADOS,
    `o acerto adiantado não tirou ninguém da fila (tem ${aindaEmDoisDias.length}, esperado ${ERRADOS})`,
  );
  afirmar(
    aindaEmDoisDias.every((i) => i.nivel === 1),
    "e nenhum deles subiu de nível",
  );

  console.log("\nO fuso do SQL e o do TypeScript concordam:");

  // Esta é a única afirmação do projeto que cruza as duas contas de "que dia é
  // hoje": a da view (`at time zone 'America/Sao_Paulo'`, em SQL) e a de
  // `hojeNoBrasil` (`Intl`, em TypeScript). Elas estão escritas à mão nas duas
  // linguagens, e discordariam em silêncio nas três horas entre 21h e a
  // meia-noite de Guabiruba — a janela em que a criança de fato treina.
  const { data: minutos } = await comoAna
    .from("minutos_por_dia")
    .select("aluno, dia, bloco, tempo_ms, itens");
  const deHoje = (minutos ?? []).filter((l) => l.dia === hoje && l.bloco === "tatica");
  afirmar(
    deHoje.length === 1,
    `a view tem uma linha de tática em ${hoje} (tem ${deHoje.length}; dias vistos: ${[...new Set((minutos ?? []).map((l) => l.dia))].join(", ") || "nenhum"})`,
  );
  afirmar(
    deHoje[0]?.itens === linhas2.length,
    `e ela conta as ${linhas2.length} tentativas (contou ${deHoje[0]?.itens})`,
  );
  afirmar(
    (minutos ?? []).every((l) => l.aluno === ana.id),
    "e a Ana só lê o que é dela nesta view",
  );

  /* ---------------------------------------------------------------- *
   * O que o Bruno **não** lê
   * ---------------------------------------------------------------- */
  console.log("\nO que o Bruno não lê:");
  const comoBruno = await entrar(bruno.usuario);

  const { data: progressoDoBruno } = await comoBruno
    .from("progresso_tema")
    .select("aluno, tema, tentativas");
  afirmar(
    (progressoDoBruno ?? []).length === 0,
    `o Bruno não enxerga o progresso da Ana (viu ${(progressoDoBruno ?? []).length} linha(s))`,
  );

  const { error: erroDeEscrita } = await comoBruno.from("tentativas_puzzle").insert({
    aluno: bruno.id,
    puzzle_id: "forjado",
    tema: TEMA,
    acertou: true,
    tempo_ms: 1,
    modo: "serie",
  });
  afirmar(erroDeEscrita !== null, "o aluno logado não consegue gravar tentativa por conta própria");
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
  console.log("\nA tática conta certo.");
}
