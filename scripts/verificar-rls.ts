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
 *      lance.
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

  console.log("\n5. O professor lê os dois alunos");
  const professor = await entrar("doug", process.argv[2] ?? "");
  const { data: vistosPeloProfessor } = await professor
    .from("perfis")
    .select("usuario")
    .in("usuario", COBAIAS.map((c) => c.usuario));
  afirmar(vistosPeloProfessor?.length === 2, `o professor vê os 2 (viu ${vistosPeloProfessor?.length})`);

  const { error: erroInsertProfessor } = await professor
    .from("tentativas_puzzle")
    .insert({ aluno: criados[0], puzzle_id: "00008", tema: "fork", acertou: true, tempo_ms: 1 });
  afirmar(Boolean(erroInsertProfessor), "nem o professor grava tentativa direto");
} finally {
  await limpar();
  console.log("\nContas de mentira apagadas.");
}

if (falhas.length) {
  console.error(`\n${falhas.length} afirmação(ões) falharam.`);
  process.exit(1);
}
console.log("\nA RLS segura.");
