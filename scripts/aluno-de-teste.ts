/**
 * A conta de ensaio: um aluno de mentira para o professor testar o site.
 *
 * Uso:
 *   node scripts/aluno-de-teste.ts criar     (ou recria, se já existir)
 *   node scripts/aluno-de-teste.ts contar    (lista as tentativas gravadas)
 *   node scripts/aluno-de-teste.ts apagar
 *
 * Ela existe por causa do ensaio geral do plano: antes de cada sábado, o Doug
 * entra **como aluno**, no celular, e faz a tarefa inteira da semana. Fazer
 * isso pela própria conta de professor não serve — o professor enxerga tudo, e
 * é justamente o que o aluno *não* enxerga que precisa estar certo.
 *
 * O `contar` é a régua do outro lado: depois do ensaio, ele diz quantas
 * tentativas ficaram gravadas e com que tempo. Se a tela disse 10 e aqui
 * aparecem 8, o problema é real e apareceu antes do sábado.
 *
 * Usuário `alunoteste`, PIN `112233`. É conta de mentira num projeto onde as
 * credenciais de verdade saem em papel — não há segredo a proteger aqui, e um
 * PIN sorteado só faria o Doug ter de procurá-lo toda vez.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../lib/auth/usuario.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

for (const linha of readFileSync(path.join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const corte = linha.indexOf("=");
  if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
  const nome = linha.slice(0, corte).trim();
  if (!process.env[nome]) process.env[nome] = linha.slice(corte + 1).trim();
}

const USUARIO = "alunoteste";
const PIN = "112233";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function idDoAluno(): Promise<string | null> {
  const { data } = await admin.from("perfis").select("id").eq("usuario", USUARIO).maybeSingle();
  return data?.id ?? null;
}

async function apagar(): Promise<boolean> {
  const id = await idDoAluno();
  if (!id) return false;
  // `on delete cascade` em `perfis` e em `tentativas_puzzle`: apagar a conta
  // leva junto o perfil e tudo que ela resolveu.
  await admin.auth.admin.deleteUser(id);
  return true;
}

const acao = process.argv[2] ?? "contar";

if (acao === "criar") {
  if (await apagar()) console.log("A conta anterior foi apagada, com as tentativas dela.");
  const { data, error } = await admin.auth.admin.createUser({
    email: emailDoUsuario(USUARIO),
    password: PIN,
    email_confirm: true,
    user_metadata: {
      usuario: USUARIO,
      nome: "Aluno de Teste",
      papel: "aluno",
      equipe: "M",
      rating: "1100",
    },
  });
  if (error) {
    console.error(`O Supabase recusou: ${error.message}`);
    process.exit(1);
  }
  console.log(`Conta criada (${data.user?.id}).`);
  console.log(`  usuário: ${USUARIO}`);
  console.log(`  PIN:     ${PIN}`);
} else if (acao === "apagar") {
  console.log((await apagar()) ? "Conta apagada." : "Não havia conta de teste.");
} else if (acao === "contar") {
  const id = await idDoAluno();
  if (!id) {
    console.log("Não existe conta de teste. Rode `node scripts/aluno-de-teste.ts criar`.");
    process.exit(0);
  }
  const { data: linhas } = await admin
    .from("tentativas_puzzle")
    .select("puzzle_id, tema, modo, acertou, tempo_ms, criada_em")
    .eq("aluno", id)
    .order("criada_em");

  const total = linhas?.length ?? 0;
  const certos = (linhas ?? []).filter((l) => l.acertou).length;
  console.log(`${total} tentativa(s), ${certos} certa(s).\n`);
  for (const l of linhas ?? []) {
    console.log(
      `  ${l.tema.padEnd(14)} ${l.modo.padEnd(12)} ${l.acertou ? "certo" : "erro "} ` +
        `${String(l.tempo_ms).padStart(7)} ms  ${l.puzzle_id}`,
    );
  }
} else {
  console.error(`Ação desconhecida: ${acao}. Use criar, contar ou apagar.`);
  process.exit(1);
}
