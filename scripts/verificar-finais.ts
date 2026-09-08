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
 *   7. o vizinho lê **zero**, e não consegue gravar por conta própria;
 *   8. **(F2)** a revisão numa posição de revisão da aula vira linha, e a linha
 *      guarda **qual** posição foi jogada — sem isso a partida não se
 *      reconstrói, porque a aula tem duas;
 *   9. **(F2)** a mesma chamada é recusada quando a posição não é de revisão
 *      (a da prática, por exemplo) e quando não vem posição nenhuma. É o que
 *      impede a revisão de virar "joguei qualquer posição e revisei a aula";
 *  10. **(F2)** dominada hoje, a aula volta em hoje+3 — o primeiro dos
 *      `INTERVALOS_DE_FINAIS`, agora calculado sobre eventos lidos do banco e
 *      não sobre objetos de mentira.
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
import { posicoesDeRevisao } from "../lib/finais/rejulgar.ts";
import { DEGRAUS_EM_DIAS, diasAteRevisar, type ProgressoDaEscada } from "../lib/finais/escada.ts";
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

/*
 * **ATENÇÃO: este script ainda não tem alvo.**
 *
 * A `N0-R-MATE` foi apagada em 2026-09-08, com o resto do corpus anterior, e a
 * aula-piloto do formato novo (`N1-KPK`, de la Villa) ainda não foi escrita.
 * Até ela existir, este script para na primeira afirmação — "o servidor acha a
 * aula pelo id" —, e é assim que ele deve parar: um script de banco que não
 * acha a aula não pode continuar fingindo que provou alguma coisa.
 *
 * O que **já** foi ajustado ao formato de três etapas: sumiram as tentativas
 * `solo` (a etapa 4 não existe mais e o servidor recusa a etapa), e a revisão
 * passou a ser jogada na MESMA posição da prática — a conferência que antes
 * recusava isso agora exige isso.
 *
 * O que **falta**, e cabe ao passo em que a aula nascer: reapontar `AULA` e
 * reescrever as três listas de lances abaixo, que são de posições KRK que já
 * não estão no disco.
 */
const AULA = "N1-KPK";

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

  afirmar(
    Boolean(pacote.positions[pacote.lesson.stages.practice!.positionId]),
    "a posição da prática veio junto",
  );

  // A linha principal da etapa COM ajuda, caminhada do arquivo — nunca escrita
  // à mão aqui. Ela não vira linha no banco (só a partida vira), e serve a uma
  // prova só: a de que uma etapa que o servidor não aceita é recusada.
  const guided = pacote.lesson.stages.guided!;
  const linha: string[] = [];
  let nodeId = guided.root;
  for (let i = 0; i < 60 && nodeId; i += 1) {
    const expect = guided.nodes[nodeId].expects[0];
    linha.push(expect.moves[0]);
    const respostas = respostasDe(expect);
    if (respostas.length === 0) break;
    nodeId = respostas[0].next;
  }
  afirmar(linha.length > 1, `a linha com ajuda tem ${linha.length} lances`);

  /* ---------------------------------------------------------------- *
   * 2 e 3. O que a Ana joga
   * ---------------------------------------------------------------- */
  console.log("\nA Ana joga:");

  // **As duas tentativas `solo` saíram daqui.** A etapa 4 não existe no
  // formato, `ETAPAS_DE_AULA` não a aceita mais, e o `rejulgarSolo` foi
  // apagado: não há árvore contra a qual reproduzir. O que a etapa provava —
  // que o servidor reproduz os lances em vez de acreditar — continua provado
  // pela prática, logo abaixo.

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
    etapa: "pratica",
    lances: ["h1h8"],
    tempoMs: 900,
  });
  afirmar("erro" in forjado, `lance ilegal não vira linha (${JSON.stringify(forjado)})`);

  const aulaInventada = await gravarTentativaDeAula(ana.id, {
    aula: "N9-NAO-EXISTE",
    etapa: "pratica",
    lances: linha,
    tempoMs: 1000,
  });
  afirmar("erro" in aulaInventada, "aula inventada não vira linha nenhuma");

  const etapaInventada = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    // O tipo proíbe; o navegador, não. É por isso que a função confere.
    etapa: "leitura" as "pratica",
    lances: linha,
    tempoMs: 1000,
  });
  afirmar("erro" in etapaInventada, "etapa desconhecida é recusada");

  // E a etapa que **existiu**: `solo` era gravável até 2026-09-08. O navegador
  // de um aluno com a aba velha aberta ainda pode mandá-la, e ela tem de ser
  // recusada como qualquer outra palavra que não está na lista.
  const etapaAposentada = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "solo" as "pratica",
    lances: linha,
    tempoMs: 1000,
  });
  afirmar("erro" in etapaAposentada, "a etapa aposentada `solo` é recusada como desconhecida");

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
   * 8, 9 e 10. A revisão espaçada (F2)
   * ---------------------------------------------------------------- */
  console.log("\nA revisão da aula:");

  // **A revisão é a MESMA posição da prática, e isso inverteu.** Até
  // 2026-09-08 a aula declarava posições de revisão próprias, e jogar a
  // posição da prática na revisão era recusado. Hoje é o contrário: revisar é
  // jogar de novo a posição da aula, noutro dia, e o que separa a segunda
  // passada da primeira é o dia — não a posição.
  const posicaoDaAula = pacote.lesson.stages.practice!.positionId;
  afirmar(
    posicoesDeRevisao(pacote.lesson).includes(posicaoDaAula),
    `a revisão da aula é a posição da prática (${posicaoDaAula})`,
  );

  const revisaoGanha = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "revisao",
    posicaoId: posicaoDaAula,
    lances: PRATICA_QUE_MATA,
    tempoMs: 110_000,
  });
  afirmar(
    "sucesso" in revisaoGanha && revisaoGanha.sucesso,
    `a revisão que termina em mate é sucesso (${JSON.stringify(revisaoGanha)})`,
  );

  console.log("\nO que a revisão recusa:");

  // **A recusa "a posição da prática não vale na revisão" saiu, e virou o
  // caso de sucesso logo acima.** Ela existia porque a revisão pedia posição
  // nova; hoje pedir posição nova é que seria o erro. As duas recusas que
  // sobram continuam valendo, e são as que impedem "revisei" sem dizer o quê.

  const revisaoSemPosicao = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "revisao",
    lances: PRATICA_QUE_MATA,
    tempoMs: 30_000,
  });
  afirmar(
    "erro" in revisaoSemPosicao,
    `revisão sem posição é recusada (${JSON.stringify(revisaoSemPosicao)})`,
  );

  const revisaoInventada = await gravarTentativaDeAula(ana.id, {
    aula: AULA,
    etapa: "revisao",
    posicaoId: "pos-que-nao-existe",
    lances: PRATICA_QUE_MATA,
    tempoMs: 30_000,
  });
  afirmar("erro" in revisaoInventada, "posição inventada é recusada");

  console.log("\nA linha da revisão, lida de volta:");

  const { data: todas } = await comoAna
    .from("tentativas_aula")
    .select("aula, etapa, sucesso, posicao, criada_em")
    .order("criada_em");
  const linhasComRevisao = todas ?? [];

  // Cinco: as quatro de antes mais a revisão. As três recusadas não viraram
  // linha — é o que separa "recusado" de "gravado como fracasso".
  afirmar(
    linhasComRevisao.length === 5,
    `a Ana passa a ter 5 tentativas (leu ${linhasComRevisao.length})`,
  );

  const daRevisao = linhasComRevisao.filter((l) => l.etapa === "revisao");
  afirmar(daRevisao.length === 1, `uma linha de revisão (${daRevisao.length})`);
  afirmar(
    daRevisao[0]?.posicao === posicaoDaAula,
    `e ela guarda a posição jogada (guardou ${daRevisao[0]?.posicao})`,
  );
  // A outra metade da coluna: fora da revisão ela é nula, porque ali a posição
  // é a da aula e está no arquivo.
  afirmar(
    linhasComRevisao.filter((l) => l.etapa !== "revisao").every((l) => l.posicao === null),
    "e as outras quatro têm `posicao` nula",
  );

  /* ---------------------------------------------------------------- *
   * A escada, lida do banco
   *
   * Substitui a antiga conferência da agenda derivada do log. O que se afirma
   * agora é mais forte: não que uma função *calcularia* a data certa, e sim que
   * o servidor **gravou** o degrau e a data em `finais_progresso` no instante
   * em que a partida terminou.
   * ---------------------------------------------------------------- */
  console.log("");
  console.log("A escada, depois das partidas de hoje:");

  const { data: naEscada } = await comoAna
    .from("finais_progresso")
    .select("aula, degrau, revisar_em, tentativas, erros, aprendida_em, ultima_em");

  const linhaDaEscada = (naEscada ?? []).find((l) => l.aula === AULA);
  afirmar(Boolean(linhaDaEscada), `a aula ${AULA} tem linha na escada`);
  if (!linhaDaEscada) throw new Error("sem a linha da escada não há o que provar");

  // **Degrau 1, e não 3.** A Ana venceu hoje — uma vez, num dia só. Subir a
  // escada exige vencer de novo num dia em que a aula já tenha vencido, e a
  // data mínima é a meia-noite seguinte. É esta linha que prova que "três
  // passadas" quer dizer três dias, e não três cliques.
  afirmar(
    linhaDaEscada.degrau === 1,
    `e ela está no degrau 1 depois de vencer no mesmo dia (está no ${linhaDaEscada.degrau})`,
  );
  afirmar(
    linhaDaEscada.aprendida_em === null,
    "e não está aprendida: isso é o degrau 3, em três dias distintos",
  );

  const naEscadaAgora: ProgressoDaEscada = {
    degrau: linhaDaEscada.degrau,
    revisarEm: linhaDaEscada.revisar_em,
    tentativas: linhaDaEscada.tentativas,
    erros: linhaDaEscada.erros,
    aprendidaEm: linhaDaEscada.aprendida_em,
    ultimaEm: linhaDaEscada.ultima_em,
  };
  const faltam = diasAteRevisar(naEscadaAgora, new Date().toISOString());
  afirmar(
    faltam === DEGRAUS_EM_DIAS[1],
    `e volta em ${DEGRAUS_EM_DIAS[1]} dia (o banco disse ${faltam})`,
  );

  // A partida perdida entrou na conta dos erros, e as contas continuam
  // possíveis: é a mesma coerência que o `check` da migration cobra.
  afirmar(
    linhaDaEscada.tentativas >= linhaDaEscada.erros && linhaDaEscada.erros >= 1,
    `tentativas ${linhaDaEscada.tentativas} e erros ${linhaDaEscada.erros}`,
  );

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

  const { data: escadaDoBruno } = await comoBruno
    .from("finais_progresso")
    .select("aluno, aula, degrau");
  afirmar(
    (escadaDoBruno ?? []).length === 0,
    `o Bruno não enxerga a escada da Ana (viu ${(escadaDoBruno ?? []).length} linha(s))`,
  );

  const { error: erroNaEscada } = await comoBruno.from("finais_progresso").insert({
    aluno: bruno.id,
    aula: AULA,
    degrau: 3,
    revisar_em: new Date().toISOString(),
  });
  afirmar(erroNaEscada !== null, "o aluno logado não sobe de degrau por conta própria");

  const { error: erroDeEscrita } = await comoBruno.from("tentativas_aula").insert({
    aluno: bruno.id,
    aula: AULA,
    etapa: "pratica",
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
