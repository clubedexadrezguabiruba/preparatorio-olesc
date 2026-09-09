/**
 * Quem tem progresso gravado no repertório — a condição de parada da §24.
 *
 * Uso:
 *   node scripts/orfaos-repertorio.ts
 *
 * ## Por que este script existe, e por que ele NÃO é o `db:f2`
 *
 * O id de uma linha é o hash dos lances dela (`lib/repertorio/linhas.ts`), então
 * **esticar uma linha mata o id dela** e o registro de quem já a treinou passa a
 * apontar para uma linha que ninguém mais alcança. Enquanto o único rastro em
 * `repertorio_progresso` for de conta de teste, isso não custa nada — e é essa
 * a licença que a §23 e a §24 usaram para reescrever 27 e 42 ids.
 *
 * A licença tem prazo, e o prazo é medido aqui. O `npm run db:f2` **não cobre
 * esta tabela**: ele mede tática, finais, aula e meio-jogo, e ainda recria a
 * conta `alunoteste` do zero — o que apaga justamente o rastro que se queria
 * conferir. Rodar o `db:f2` para responder "há aluno de verdade no repertório?"
 * dá a resposta errada por construção.
 *
 * Sai com código 1 quando acha progresso de conta com papel `aluno` que não seja
 * a `alunoteste`. A partir daí a régua do término tem de ser aplicada **sem
 * trocar id** — o que, na prática, quer dizer linha nova ao lado da velha.
 */
import postgres from "postgres";
import { carregarEnv } from "./env-local.ts";

carregarEnv();

if (!process.env.SUPABASE_DB_URL) {
  console.log("Falta SUPABASE_DB_URL no .env.local — sem ele não há como medir.");
  process.exit(0);
}

const sql = postgres(process.env.SUPABASE_DB_URL, { prepare: false });

const linhas = await sql<
  { usuario: string | null; papel: string | null; linha: string; tentativas: number }[]
>`
  select pf.usuario, pf.papel, p.linha, p.tentativas
  from repertorio_progresso p
  left join perfis pf on pf.id = p.aluno
  order by pf.usuario, p.linha
`;

await sql.end();

console.log(`${linhas.length} registro(s) em repertorio_progresso\n`);
for (const l of linhas) {
  console.log(`  ${String(l.usuario).padEnd(16)} ${String(l.papel).padEnd(11)} ${l.linha}  (${l.tentativas} tentativas)`);
}

const reais = [
  ...new Set(
    linhas.filter((l) => l.papel === "aluno" && l.usuario !== "alunoteste").map((l) => l.usuario),
  ),
];

console.log(
  `\nContas de ALUNO de verdade com progresso no repertório: ${reais.length}` +
    (reais.length > 0 ? ` — ${reais.join(", ")}` : " (a janela de ids continua aberta)"),
);

if (reais.length > 0) process.exit(1);
