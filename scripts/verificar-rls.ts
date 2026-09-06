/**
 * A prova de que a RLS segura. Roda contra o banco de verdade.
 *
 * Uso:
 *   node scripts/verificar-rls.ts
 *
 * ## Por que isto não é teste unitário
 *
 * A RLS não é código nosso: é política de Postgres escrita em SQL e aplicada
 * por migration. Um teste que a simulasse em JavaScript estaria afirmando o que
 * *achamos* que a política diz — e a única falha que importa é justamente a
 * distância entre o que ela diz e o que achamos.
 *
 * Então este script cria duas contas de aluno de mentira, entra como cada uma
 * **com a chave pública**, e pergunta ao banco de produção o que elas conseguem
 * ler. No fim, apaga as duas.
 *
 * O que ele afirma:
 *
 *   1. o aluno lê o próprio perfil;
 *   2. o aluno **não** lê o perfil do outro aluno;
 *   3. o professor lê os dois;
 *   4. nem o aluno nem o professor conseguem **gravar** uma tentativa de
 *      puzzle — a tabela não tem política de `insert` para ninguém, e quem
 *      grava é a server action com a chave de serviço, depois de reconferir o
 *      lance;
 *   5. na tarefa de casa, ao contrário, o aluno **grava a dele** — e não
 *      consegue gravar no nome do outro, nem ler o que o outro marcou, nem
 *      desmarcar o que o outro fez;
 *   6. o professor lê os dois alunos (pulado sem o PIN — ver o fim deste
 *      comentário);
 *   7. nas aulas de finais a mesma fronteira aparece **dentro da mesma
 *      feature**: `tentativas_aula` não aceita `insert` de ninguém, porque há
 *      lances para o servidor reconferir, e `aula_lida` é do aluno, porque
 *      "li o exemplo até o fim" não tem o que reconferir;
 *   8. as duas declarações que a F2 acrescentou — `partida_do_dia` e
 *      `dica_lida` — seguem o mesmo molde, e a view `minutos_por_dia` mostra
 *      a cada um só o que é dele.
 *
 * O `with check` é a linha inteira da defesa nas tabelas em que o aluno
 * escreve — sem ele, um `insert` com o `aluno` trocado passaria, a política de
 * `select` esconderia a linha de quem a escreveu, e ela apareceria no painel da
 * vítima. O item 5 provou isso em `tarefa_conclusao`, a primeira tabela do
 * projeto em que o aluno escreveu; o item 7 (FN1/B3) prova o mesmo em
 * `aula_lida` — e prova, ao lado, que a porta de `tentativas_aula` continua
 * fechada para ele. O item 8 (F2) repete a prova nas duas tabelas novas, e
 * acrescenta a que faltava: **uma view não tem RLS própria**. A
 * `minutos_por_dia` só não vaza o dia do vizinho porque foi criada com
 * `security_invoker = on` — sem isso ela rodaria com os privilégios de quem a
 * criou, a RLS das tabelas de baixo não seria consultada, e o painel de cada
 * aluno mostraria a soma da turma inteira. É a espécie de furo que nenhum
 * teste de TypeScript alcança, porque não há TypeScript envolvido.
 *
 * O PIN do professor entra como argumento (`node scripts/verificar-rls.ts
 * 123456`). Sem ele, as afirmações que dependem do professor são **puladas**,
 * com aviso — o que se perde é a leitura de cima, e o que se ganha é o script
 * rodar de graça no meio de uma tarefa.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../lib/auth/usuario.ts";

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

/** Entra com usuário e PIN pela chave pública, como o site faz. */
async function entrar(usuario: string, pin: string): Promise<SupabaseClient> {
  const cliente = createClient(URL_, PUBLICA, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await cliente.auth.signInWithPassword({
    email: emailDoUsuario(usuario),
    password: pin,
  });
  if (error) throw new Error(`${usuario} não entrou: ${error.message}`);
  return cliente;
}

/* ------------------------------------------------------------------ *
 * As contas de mentira
 * ------------------------------------------------------------------ */

const PIN = "424242";
const COBAIAS = [
  { usuario: "zz.teste.a", nome: "Cobaia A", equipe: "M" },
  { usuario: "zz.teste.b", nome: "Cobaia B", equipe: "F" },
];

const criados: string[] = [];

async function limpar(): Promise<void> {
  for (const id of criados) await admin.auth.admin.deleteUser(id);
}

try {
  console.log("\nCriando duas contas de aluno de mentira...\n");
  for (const cobaia of COBAIAS) {
    // Se uma execução anterior morreu no meio, a conta ficou. Apaga antes.
    const { data: antigos } = await admin
      .from("perfis")
      .select("id")
      .eq("usuario", cobaia.usuario);
    for (const antigo of antigos ?? []) await admin.auth.admin.deleteUser(antigo.id);

    const { data, error } = await admin.auth.admin.createUser({
      email: emailDoUsuario(cobaia.usuario),
      password: PIN,
      email_confirm: true,
      user_metadata: { ...cobaia, papel: "aluno" },
    });
    if (error) throw new Error(`não criou ${cobaia.usuario}: ${error.message}`);
    criados.push(data.user.id);
  }

  console.log("1. O gatilho criou o perfil junto com a conta");
  const { data: perfis } = await admin
    .from("perfis")
    .select("id, usuario, nome, papel, equipe")
    .in("usuario", COBAIAS.map((c) => c.usuario));
  afirmar(perfis?.length === 2, "as duas contas têm perfil");
  afirmar(
    perfis?.every((p) => p.papel === "aluno") ?? false,
    "as duas nasceram com papel `aluno`",
  );
  afirmar(
    perfis?.find((p) => p.usuario === "zz.teste.a")?.equipe === "M",
    "a equipe veio dos metadados da conta",
  );

  console.log("\n2. O aluno A entra e lê só o que é dele");
  const alunoA = await entrar("zz.teste.a", PIN);
  const { data: vistosPorA } = await alunoA.from("perfis").select("usuario");
  afirmar(vistosPorA?.length === 1, `A vê 1 perfil (viu ${vistosPorA?.length})`);
  afirmar(vistosPorA?.[0]?.usuario === "zz.teste.a", "e o perfil que A vê é o de A");

  console.log("\n3. O aluno A não alcança o aluno B nem perguntando por ele");
  const { data: bPorA } = await alunoA.from("perfis").select("usuario").eq("usuario", "zz.teste.b");
  afirmar(bPorA?.length === 0, "consulta direta ao usuário de B volta vazia, não com erro");

  console.log("\n4. Gravar tentativa é recusado até para o dono da tentativa");
  const { error: erroInsert } = await alunoA
    .from("tentativas_puzzle")
    .insert({ aluno: criados[0], puzzle_id: "00008", tema: "fork", acertou: true, tempo_ms: 1 });
  afirmar(Boolean(erroInsert), `o insert do aluno é recusado (${erroInsert?.code ?? "sem erro!"})`);

  console.log("\n5. Na tarefa de casa, o aluno grava — a sua, e só a sua");
  const alunoB = await entrar("zz.teste.b", PIN);

  const { error: erroMarcarA } = await alunoA
    .from("tarefa_conclusao")
    .insert({ aluno: criados[0], tarefa: "s1-coordenadas" });
  afirmar(!erroMarcarA, `A marca a tarefa dele (${erroMarcarA?.message ?? "sem erro"})`);

  await alunoB.from("tarefa_conclusao").insert({ aluno: criados[1], tarefa: "s1-caderno" });

  // A linha que a política `with check` recusa. Sem ela, A escreveria no
  // painel de B — e B nunca saberia de onde veio.
  const { error: erroMarcarNoNomeDeB } = await alunoA
    .from("tarefa_conclusao")
    .insert({ aluno: criados[1], tarefa: "s1-partidas" });
  afirmar(
    Boolean(erroMarcarNoNomeDeB),
    `A não marca no nome de B (${erroMarcarNoNomeDeB?.code ?? "PASSOU!"})`,
  );

  const { data: marcadasPorA } = await alunoA.from("tarefa_conclusao").select("aluno, tarefa");
  afirmar(marcadasPorA?.length === 1, `A vê 1 marcação (viu ${marcadasPorA?.length})`);
  afirmar(marcadasPorA?.[0]?.tarefa === "s1-coordenadas", "e a marcação que A vê é a de A");

  // `delete` que não alcança nada não é erro no Postgres: some, calado. Por
  // isso a prova é contar do outro lado, e não olhar o `error`.
  await alunoA.from("tarefa_conclusao").delete().eq("tarefa", "s1-caderno");
  const { count: sobrouDeB } = await admin
    .from("tarefa_conclusao")
    .select("*", { count: "exact", head: true })
    .eq("aluno", criados[1]);
  afirmar(sobrouDeB === 1, `A não apagou a marcação de B (sobrou ${sobrouDeB})`);

  await alunoA.from("tarefa_conclusao").delete().eq("tarefa", "s1-coordenadas");
  const { count: sobrouDeA } = await admin
    .from("tarefa_conclusao")
    .select("*", { count: "exact", head: true })
    .eq("aluno", criados[0]);
  afirmar(sobrouDeA === 0, "A desmarca a própria tarefa");

  const pinDoProfessor = process.argv[2];
  if (!pinDoProfessor) {
    console.log("\n6. O professor — PULADO: rode `node scripts/verificar-rls.ts <PIN do doug>`");
  } else {
    console.log("\n6. O professor lê os dois alunos");
    const professor = await entrar("doug", pinDoProfessor);
    const { data: vistosPeloProfessor } = await professor
      .from("perfis")
      .select("usuario")
      .in("usuario", COBAIAS.map((c) => c.usuario));
    afirmar(
      vistosPeloProfessor?.length === 2,
      `o professor vê os 2 (viu ${vistosPeloProfessor?.length})`,
    );

    const { error: erroInsertProfessor } = await professor
      .from("tentativas_puzzle")
      .insert({ aluno: criados[0], puzzle_id: "00008", tema: "fork", acertou: true, tempo_ms: 1 });
    afirmar(Boolean(erroInsertProfessor), "nem o professor grava tentativa direto");

    const { data: tarefasPeloProfessor } = await professor
      .from("tarefa_conclusao")
      .select("aluno")
      .in("aluno", criados);
    afirmar(
      tarefasPeloProfessor?.length === 1,
      `o professor vê a marcação que sobrou (viu ${tarefasPeloProfessor?.length})`,
    );
  }

  console.log("\n7. Nas aulas de finais: a tentativa é do servidor, a leitura é do aluno");

  // A metade fechada: os lances existem para serem reconferidos, então o aluno
  // não escreve aqui nem no nome dele. É o desenho de `tentativas_puzzle`.
  const { error: erroTentativaDeAula } = await alunoA.from("tentativas_aula").insert({
    aluno: criados[0],
    aula: "N0-R-MATE",
    etapa: "solo",
    sucesso: true,
    lances: ["h1h8"],
    tempo_ms: 1,
  });
  afirmar(
    Boolean(erroTentativaDeAula),
    `o aluno não grava tentativa de aula (${erroTentativaDeAula?.code ?? "PASSOU!"})`,
  );

  // A metade aberta: "li o exemplo" é declaração, e o aluno declara a dele.
  const { error: erroLeituraDeA } = await alunoA
    .from("aula_lida")
    .insert({ aluno: criados[0], aula: "N0-R-MATE" });
  afirmar(!erroLeituraDeA, `A declara a leitura dele (${erroLeituraDeA?.message ?? "sem erro"})`);

  await alunoB.from("aula_lida").insert({ aluno: criados[1], aula: "N0-Q-MATE" });

  const { error: erroLeituraNoNomeDeB } = await alunoA
    .from("aula_lida")
    .insert({ aluno: criados[1], aula: "N0-R-MATE" });
  afirmar(
    Boolean(erroLeituraNoNomeDeB),
    `A não declara leitura no nome de B (${erroLeituraNoNomeDeB?.code ?? "PASSOU!"})`,
  );

  const { data: lidasPorA } = await alunoA.from("aula_lida").select("aluno, aula");
  afirmar(lidasPorA?.length === 1, `A vê 1 leitura (viu ${lidasPorA?.length})`);
  afirmar(lidasPorA?.[0]?.aula === "N0-R-MATE", "e a leitura que A vê é a de A");

  // Como no item 5: `delete` que não alcança nada some calado, então a prova é
  // contar do outro lado.
  await alunoA.from("aula_lida").delete().eq("aula", "N0-Q-MATE");
  const { count: leituraDeBSobrou } = await admin
    .from("aula_lida")
    .select("*", { count: "exact", head: true })
    .eq("aluno", criados[1]);
  afirmar(leituraDeBSobrou === 1, `A não apagou a leitura de B (sobrou ${leituraDeBSobrou})`);

  console.log("\n8. As duas declarações novas da F2, pelo mesmo molde");

  // `partida_do_dia`: o dia vem do servidor, mas a RLS é sobre o `aluno`. Um
  // dia fixo e absurdo (2000-01-01) para que a linha nunca se confunda com
  // dado real de ninguém, mesmo se a limpeza falhar.
  const DIA = "2000-01-01";
  const { error: erroPartidaDeA } = await alunoA
    .from("partida_do_dia")
    .insert({ aluno: criados[0], dia: DIA });
  afirmar(!erroPartidaDeA, `A marca a partida dele (${erroPartidaDeA?.message ?? "sem erro"})`);

  await alunoB.from("partida_do_dia").insert({ aluno: criados[1], dia: DIA });

  const { error: erroPartidaNoNomeDeB } = await alunoA
    .from("partida_do_dia")
    .insert({ aluno: criados[1], dia: "2000-01-02" });
  afirmar(
    Boolean(erroPartidaNoNomeDeB),
    `A não marca partida no nome de B (${erroPartidaNoNomeDeB?.code ?? "PASSOU!"})`,
  );

  const { data: partidasPorA } = await alunoA.from("partida_do_dia").select("aluno, dia");
  afirmar(partidasPorA?.length === 1, `A vê 1 partida (viu ${partidasPorA?.length})`);
  afirmar(partidasPorA?.[0]?.aluno === criados[0], "e a partida que A vê é a de A");

  // `dica_lida`: o gêmeo de `aula_lida`, e a tabela que a `/trilha` e o cartão
  // "Hoje" leem para contar meio-jogo.
  const { error: erroDicaDeA } = await alunoA
    .from("dica_lida")
    .insert({ aluno: criados[0], dica: "m1" });
  afirmar(!erroDicaDeA, `A declara a dica dele (${erroDicaDeA?.message ?? "sem erro"})`);

  await alunoB.from("dica_lida").insert({ aluno: criados[1], dica: "m2" });

  const { error: erroDicaNoNomeDeB } = await alunoA
    .from("dica_lida")
    .insert({ aluno: criados[1], dica: "m3" });
  afirmar(
    Boolean(erroDicaNoNomeDeB),
    `A não declara dica no nome de B (${erroDicaNoNomeDeB?.code ?? "PASSOU!"})`,
  );

  const { data: dicasPorA } = await alunoA.from("dica_lida").select("aluno, dica");
  afirmar(dicasPorA?.length === 1, `A vê 1 dica lida (viu ${dicasPorA?.length})`);
  afirmar(dicasPorA?.[0]?.dica === "m1", "e a dica que A vê é a de A");

  await alunoA.from("dica_lida").delete().eq("dica", "m2");
  const { count: dicaDeBSobrou } = await admin
    .from("dica_lida")
    .select("*", { count: "exact", head: true })
    .eq("aluno", criados[1]);
  afirmar(dicaDeBSobrou === 1, `A não apagou a dica de B (sobrou ${dicaDeBSobrou})`);

  console.log("\n9. A view `minutos_por_dia` mostra a cada um só o dia dele");

  // A prova precisa de linha nos dois alunos, e `tentativas_puzzle` não aceita
  // `insert` de aluno nenhum (item 4) — quem grava é a server action com a
  // chave de serviço. Então é o admin que semeia, que é exatamente o caminho
  // do site.
  for (const [i, id] of criados.entries()) {
    const { error } = await admin.from("tentativas_puzzle").insert({
      aluno: id,
      puzzle_id: `zz0000${i}`,
      tema: "fork",
      origem: "fork",
      modo: "serie",
      acertou: true,
      tempo_ms: 60_000 * (i + 1),
    });
    if (error) throw new Error(`não semeou tentativa de ${id}: ${error.message}`);
  }

  const { data: viewPorA, error: erroView } = await alunoA
    .from("minutos_por_dia")
    .select("aluno, dia, bloco, tempo_ms, itens");
  afirmar(!erroView, `A consegue ler a view (${erroView?.message ?? "sem erro"})`);
  afirmar(
    (viewPorA?.length ?? 0) > 0 && (viewPorA ?? []).every((l) => l.aluno === criados[0]),
    `toda linha que A lê da view é de A (leu ${viewPorA?.length} linha(s))`,
  );

  // O que a `security_invoker = on` compra, dito em número: o admin vê as duas
  // linhas, o aluno vê uma. Se a view rodasse com os privilégios do criador, os
  // dois números seriam iguais e o painel do aluno mostraria a soma da turma.
  const { data: viewPeloAdmin } = await admin
    .from("minutos_por_dia")
    .select("aluno, tempo_ms")
    .in("aluno", criados);
  afirmar(
    viewPeloAdmin?.length === 2,
    `o admin vê as duas linhas semeadas (viu ${viewPeloAdmin?.length})`,
  );
  afirmar(
    (viewPorA ?? []).reduce((soma, l) => soma + l.tempo_ms, 0) === 60_000,
    "e o total de A é o dele, não o da dupla",
  );
} finally {
  await limpar();
  console.log("\nContas de mentira apagadas.");
}

if (falhas.length) {
  console.error(`\n${falhas.length} afirmação(ões) falharam.`);
  process.exit(1);
}
console.log("\nA RLS segura.");
