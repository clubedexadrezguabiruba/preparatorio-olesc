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
 *      lance. O mesmo vale para `repertorio_progresso`, pelo mesmo motivo: o
 *      lance certo da linha está no JSON, e o servidor sabe conferi-lo — e,
 *      gravado pela chave de serviço, o progresso de um aluno **só é lido por
 *      ele**, senão o site diria a cada um quantas linhas a turma inteira sabe.
 *      Desde a 0005 há uma segunda coisa a proteger ali: a **data de revisão**.
 *      Uma escada de repetição espaçada que o próprio aluno remarca não agenda
 *      nada, e um `update` numa linha que já existe é o caso que o teste do
 *      `insert` não alcançava;
 *   5. na tarefa de casa, ao contrário, o aluno **grava a dele** — e não
 *      consegue gravar no nome do outro, nem ler o que o outro marcou, nem
 *      desmarcar o que o outro fez.
 *
 * O item 5 é o que esta rodada acrescentou, e é o que precisava de prova:
 * `tarefa_conclusao` é a primeira tabela do projeto em que o aluno escreve.
 * O `with check` da política é a linha inteira da defesa — sem ele, um
 * `insert` com o `aluno` trocado passaria, a política de `select` esconderia a
 * linha de quem a escreveu, e ela apareceria no painel da vítima.
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

  console.log("\n4b. No repertório o aluno não grava, não adia a revisão, e só lê o dele");
  // A mesma decisão de `tentativas_puzzle`, e pelo mesmo motivo: o lance certo
  // da linha está no JSON, e o servidor sabe conferi-lo. Se o `upsert` fosse do
  // aluno, "aprendi as 42 linhas" seria uma chamada de rede a escrever.
  const { error: erroRepertorio } = await alunoA
    .from("repertorio_progresso")
    .insert({ aluno: criados[0], linha: "brancas-petroff-934fd6a6", acertos_seguidos: 3 });
  afirmar(
    Boolean(erroRepertorio),
    `o insert do aluno é recusado (${erroRepertorio?.code ?? "sem erro!"})`,
  );

  // `update` não tem política nenhuma, e sem linha para alcançar ele some
  // calado. A prova é a de sempre: contar do outro lado.
  const { count: linhasDeRepertorio } = await admin
    .from("repertorio_progresso")
    .select("*", { count: "exact", head: true })
    .eq("aluno", criados[0]);
  afirmar(linhasDeRepertorio === 0, `nada foi gravado (achou ${linhasDeRepertorio})`);

  // Agora a chave de serviço grava — que é o único caminho que existe — e a
  // pergunta passa a ser a da **leitura**: o progresso de um aluno é dele.
  // Sem isto, o site diria a cada aluno quantas linhas a turma inteira sabe.
  const { error: erroAoSemear } = await admin.from("repertorio_progresso").insert([
    {
      aluno: criados[0],
      linha: "brancas-petroff-934fd6a6",
      acertos_seguidos: 3,
      tentativas: 3,
      degrau: 3,
      revisar_em: "2026-09-13T03:00:00.000Z",
    },
    // As duas linhas nomeiam **as mesmas** colunas de propósito: num `insert`
    // de várias linhas o PostgREST monta um conjunto único de colunas e manda
    // `null` no que faltar numa delas — e `degrau` é `not null`. Omitir aqui
    // não cai no `default`, cai no erro.
    {
      aluno: criados[1],
      linha: "pretas-colle-f0590dc0",
      acertos_seguidos: 1,
      tentativas: 1,
      degrau: 1,
      revisar_em: "2026-09-07T03:00:00.000Z",
    },
  ]);
  // Sem isto, uma coluna que o PostgREST ainda não conhece derruba as três
  // afirmações abaixo sem dizer por quê — foi o que aconteceu na primeira
  // execução depois da 0005, com o cache de schema ainda velho.
  afirmar(!erroAoSemear, `a chave de serviço semeou as duas linhas (${erroAoSemear?.message ?? "sem erro"})`);

  const { data: repertorioDeA } = await alunoA
    .from("repertorio_progresso")
    .select("aluno, linha");
  afirmar(repertorioDeA?.length === 1, `A vê 1 linha de repertório (viu ${repertorioDeA?.length})`);
  afirmar(
    repertorioDeA?.[0]?.linha === "brancas-petroff-934fd6a6",
    "e a linha que A vê é a de A",
  );

  // A escada da revisão é agenda, e agenda que o próprio aluno remarca não
  // agenda nada. Com a linha **já existindo** — o caso que o `insert` acima não
  // cobria —, um `update` do aluno teria alvo para alcançar: sem política de
  // `update`, a RLS o faz sumir calado. A prova é contar do outro lado.
  await alunoA
    .from("repertorio_progresso")
    .update({ revisar_em: "2030-01-01T00:00:00.000Z", degrau: 5 })
    .eq("aluno", criados[0])
    .eq("linha", "brancas-petroff-934fd6a6");

  const { data: aindaDeA } = await admin
    .from("repertorio_progresso")
    .select("degrau, revisar_em")
    .eq("aluno", criados[0])
    .eq("linha", "brancas-petroff-934fd6a6")
    .maybeSingle();
  afirmar(
    aindaDeA?.degrau === 3 && Date.parse(aindaDeA?.revisar_em ?? "") === Date.parse("2026-09-13T03:00:00.000Z"),
    `A não adiou a própria revisão (degrau ${aindaDeA?.degrau}, revisar_em ${aindaDeA?.revisar_em})`,
  );

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
} finally {
  await limpar();
  console.log("\nContas de mentira apagadas.");
}

if (falhas.length) {
  console.error(`\n${falhas.length} afirmação(ões) falharam.`);
  process.exit(1);
}
console.log("\nA RLS segura.");
