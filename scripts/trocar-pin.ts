/**
 * Dá um PIN novo a uma conta que já existe. **Professor ou aluno.**
 *
 * Uso:
 *   node scripts/trocar-pin.ts doug 481526
 *   node scripts/trocar-pin.ts joao          (PIN sorteado)
 *
 * Por que existe: até aqui não havia caminho nenhum. `criar-professor.ts` só
 * cria, e a tela do professor só cadastra — se alguém esquecesse o PIN, o único
 * jeito era abrir o painel do Supabase e mexer na tabela de autenticação à mão,
 * ou apagar a conta e refazê-la (levando junto o progresso ligado ao id dela).
 * Isso ia acontecer com uma criança de 11 anos numa terça-feira à noite.
 *
 * O que ele **não** faz, de propósito: não cria conta que não existe (é o
 * trabalho do outro script, e criar sem querer uma conta por causa de um nome
 * digitado errado seria pior do que a recusa), e não muda papel, nome nem nada
 * além da senha.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { normalizarUsuario, problemaDoPin, problemaDoUsuario, sortearPin } from "../lib/auth/usuario.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

for (const arquivo of [".env.local", ".env"]) {
  try {
    for (const linha of readFileSync(path.join(RAIZ, arquivo), "utf8").split("\n")) {
      const corte = linha.indexOf("=");
      if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
      const nome = linha.slice(0, corte).trim();
      if (!process.env[nome]) {
        process.env[nome] = linha
          .slice(corte + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // O arquivo pode não existir; as variáveis podem vir do ambiente.
  }
}

const [usuarioBruto, pinBruto] = process.argv.slice(2);
if (!usuarioBruto) {
  console.error("Uso: node scripts/trocar-pin.ts <usuario> [pin]");
  process.exit(1);
}

const usuario = normalizarUsuario(usuarioBruto);
const problemaUsuario = problemaDoUsuario(usuario);
if (problemaUsuario) {
  console.error(`Nome de usuário: ${problemaUsuario}.`);
  process.exit(1);
}

const pin = pinBruto ?? sortearPin();
const problemaPin = problemaDoPin(pin);
if (problemaPin) {
  console.error(`PIN: ${problemaPin}.`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}

const admin = createClient(url, chave, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * O id vem de `perfis`, e não da lista de contas do Supabase.
 *
 * `listUsers` é paginado e devolve a tabela de autenticação inteira para achar
 * uma linha; `perfis` já é indexada pelo nome de usuário, que é o que se digita
 * aqui, e é a mesma tabela que o site consulta para saber quem entrou. A chave
 * de serviço passa por cima da RLS, então a consulta enxerga todo mundo.
 */
const { data: perfil, error: erroDoPerfil } = await admin
  .from("perfis")
  .select("id, nome, papel")
  .eq("usuario", usuario)
  .maybeSingle();

if (erroDoPerfil) {
  console.error(`O Supabase recusou a consulta: ${erroDoPerfil.message}`);
  process.exitCode = 1;
} else if (!perfil) {
  console.error(`Não existe conta com o usuário "${usuario}".`);
  console.error("Para criar a do professor: node scripts/criar-professor.ts <usuario> \"<nome>\"");
  process.exitCode = 1;
} else {
  const { error } = await admin.auth.admin.updateUserById(perfil.id, { password: pin });
  if (error) {
    console.error(`O Supabase recusou: ${error.message}`);
    // Ver a nota em `criar-professor.ts`: `process.exit` aqui derruba o
    // processo com uma "Assertion failed" do libuv no Windows, porque o cliente
    // do Supabase ainda tem conexão aberta.
    process.exitCode = 1;
  } else {
    console.log("\nPIN trocado.\n");
    console.log(`  Usuário: ${usuario}  (${perfil.nome}, ${perfil.papel})`);
    console.log(`  PIN:     ${pin}\n`);
    console.log("Anote o PIN: daqui para a frente ele é um hash no servidor.");
  }
}
