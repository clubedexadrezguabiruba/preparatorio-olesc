/**
 * Aplica as migrations pendentes no Supabase, por conexão direta.
 *
 * Uso:
 *   node scripts/aplicar-migration.ts            (todas as pendentes, em ordem)
 *   node scripts/aplicar-migration.ts --listar   (só mostra o que falta)
 *
 * A CLI do Supabase não está instalada nesta máquina, e instalá-la para rodar
 * cinco arquivos SQL seria um pré-requisito a mais entre o Doug e o site no ar.
 *
 * ## O livro-caixa
 *
 * A diferença para o script da Academia 64, que aplicava **um arquivo por
 * chamada**: aqui existe `public.migrations_aplicadas`. Sem ela, saber o que já
 * rodou é memória de quem rodou — e a pergunta "esta migration já foi?" só tem
 * resposta errada quando a máquina é outra ou o mês é outro. Com ela, aplicar
 * duas vezes é operação vazia, e o script pode simplesmente rodar tudo.
 *
 * Cada arquivo entra numa transação: ou o arquivo inteiro vale, ou nada dele
 * vale. Migration aplicada pela metade é o pior estado possível — o banco fica
 * numa forma que nenhum arquivo descreve.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PASTA = path.join(RAIZ, "supabase/migrations");

/* ------------------------------------------------------------------ *
 * A URL do banco
 * ------------------------------------------------------------------ */

function lerEnv(): void {
  for (const arquivo of [".env.local", ".env"]) {
    let texto: string;
    try {
      texto = readFileSync(path.join(RAIZ, arquivo), "utf8");
    } catch {
      continue;
    }
    for (const linha of texto.split("\n")) {
      const corte = linha.indexOf("=");
      if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
      const nome = linha.slice(0, corte).trim();
      const valor = linha.slice(corte + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[nome]) process.env[nome] = valor;
    }
  }
}

lerEnv();

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Falta SUPABASE_DB_URL no .env.local.");
  console.error("Ela está no painel do Supabase em Settings > Database > Connection string > URI.");
  console.error("Use a do **pooler** (porta 6543) e troque [YOUR-PASSWORD] pela senha do banco.");
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Aplicar
 * ------------------------------------------------------------------ */

const arquivos = readdirSync(PASTA)
  .filter((nome) => nome.endsWith(".sql"))
  .sort();

const db = postgres(url, { ssl: "require", max: 1 });

try {
  await db`
    create table if not exists public.migrations_aplicadas (
      arquivo     text primary key,
      aplicada_em timestamptz not null default now()
    )
  `;

  const jaForam = new Set(
    (await db<{ arquivo: string }[]>`select arquivo from public.migrations_aplicadas`).map(
      (l) => l.arquivo,
    ),
  );

  const pendentes = arquivos.filter((nome) => !jaForam.has(nome));

  if (process.argv.includes("--listar")) {
    console.log(`${arquivos.length} migration(s), ${pendentes.length} pendente(s):`);
    for (const nome of arquivos) {
      console.log(`  ${jaForam.has(nome) ? "ok  " : "->  "} ${nome}`);
    }
  } else if (pendentes.length === 0) {
    console.log(`Nada a fazer: as ${arquivos.length} migration(s) já estão aplicadas.`);
  } else {
    console.log(`Banco: ${url.replace(/:[^:@/]+@/, ":****@")}\n`);
    for (const nome of pendentes) {
      const sql = readFileSync(path.join(PASTA, nome), "utf8");
      process.stdout.write(`  ${nome} ... `);
      await db.begin(async (tx) => {
        await tx.unsafe(sql);
        await tx`insert into public.migrations_aplicadas (arquivo) values (${nome})`;
      });
      console.log("ok");
    }
    console.log(`\n${pendentes.length} migration(s) aplicada(s).`);
  }
} catch (erro) {
  console.error("\nA migration falhou e nada dela foi gravado:");
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
} finally {
  await db.end();
}
