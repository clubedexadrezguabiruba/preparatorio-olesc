/**
 * Cria a conta do professor. **É o único jeito de a primeira conta nascer.**
 *
 * Uso:
 *   node scripts/criar-professor.ts doug "Douglas Vieira" 481526
 *   node scripts/criar-professor.ts doug "Douglas Vieira"     (PIN sorteado)
 *
 * O site não tem tela de cadastro, e a tela que cria aluno exige um professor
 * já logado — o que deixa o primeiro de fora por construção. Esse ovo-e-galinha
 * se resolve aqui, num script que roda na máquina do Doug com a chave de
 * serviço, e não numa rota do site que ficaria aberta para sempre.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  emailDoUsuario,
  normalizarUsuario,
  problemaDoPin,
  problemaDoUsuario,
  sortearPin,
} from "../lib/auth/usuario.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

for (const arquivo of [".env.local", ".env"]) {
  try {
    for (const linha of readFileSync(path.join(RAIZ, arquivo), "utf8").split("\n")) {
      const corte = linha.indexOf("=");
      if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
      const nome = linha.slice(0, corte).trim();
      if (!process.env[nome]) {
        process.env[nome] = linha.slice(corte + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // O arquivo pode não existir; as variáveis podem vir do ambiente.
  }
}

const [usuarioBruto, nome, pinBruto] = process.argv.slice(2);
if (!usuarioBruto || !nome) {
  console.error('Uso: node scripts/criar-professor.ts <usuario> "<nome>" [pin]');
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

const { error } = await admin.auth.admin.createUser({
  email: emailDoUsuario(usuario),
  password: pin,
  email_confirm: true,
  user_metadata: { usuario, nome, papel: "professor" },
});

if (error) {
  console.error(`O Supabase recusou: ${error.message}`);
  process.exit(1);
}

console.log("\nConta de professor criada.\n");
console.log(`  Usuário: ${usuario}`);
console.log(`  PIN:     ${pin}\n`);
console.log("Anote o PIN: daqui para a frente ele é um hash no servidor.");
