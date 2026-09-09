/**
 * Os selos, conferidos **contra o banco de verdade** — semeia e limpa.
 *
 *     npm run dev
 *     node scripts/aluno-de-teste.ts criar
 *     npm run selos:ciclo
 *
 * ## O que ele prova, e por que `npm test` não prova
 *
 * `lib/curso/selos.test.ts` cobre a regra inteira, e cobre bem — com números
 * escritos à mão. O que ele **não** alcança é a fiação: se o que o banco guarda
 * chega à regra na forma que ela espera, e principalmente se a **janela de 30
 * dias** foi de fato removida do caminho.
 *
 * Essa é a falha que este script existe para pegar, e ela é silenciosa: com a
 * janela de volta, um selo ganho há 40 dias some da tela sem erro nenhum, sem
 * log, sem teste vermelho. Só um dia de calendário depois é que alguém percebe.
 *
 * ## Ele semeia e limpa
 *
 * Escreve com a chave de serviço, como o servidor faz, e apaga o que escreveu
 * num `finally` — uma execução interrompida no meio não deixa a conta de ensaio
 * com um selo que ela não ganhou. Mesmo padrão de `conferir-ciclo-do-nivel.ts`.
 *
 * ## O que ele semeia
 *
 * Sete dias seguidos de 70 minutos, **40 dias atrás**, e dois níveis
 * conquistados. Isso acende exatamente cinco selos e nenhum outro:
 * `hora-1`, `constante-3`, `constante-7`, `nivel-1` e `nivel-2`. Os 40 dias são
 * a parte que importa: dentro da janela antiga, nenhum deles apareceria.
 */

import { createClient } from "@supabase/supabase-js";
import { carregarEnv } from "./env-local.ts";
import { diasComOMinimo, maiorSequenciaDeDias, type MinutosDoDia } from "../lib/curso/hoje.ts";
import { selos, type ParaOsSelos } from "../lib/curso/selos.ts";

carregarEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICO = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICO) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}

const admin = createClient(URL_, SERVICO, { auth: { persistSession: false } });

const falhas: string[] = [];
function afirmar(condicao: boolean, oQue: string): void {
  console.log(`  ${condicao ? "ok  " : "FALHOU"} ${oQue}`);
  if (!condicao) falhas.push(oQue);
}

const { data: perfil } = await admin
  .from("perfis")
  .select("id, nome")
  .eq("usuario", "alunoteste")
  .maybeSingle();

if (!perfil) {
  console.error("A conta de ensaio não existe. Rode: node scripts/aluno-de-teste.ts criar");
  process.exit(1);
}
const aluno = perfil.id as string;

/** A marca que identifica o que este script escreveu, para apagar só isso. */
const MARCA = "selo-de-ensaio";
const DIAS_ATRAS = 40;
const SEGUIDOS = 7;
const MINUTOS = 70;

function diaAtras(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  // Meio-dia UTC cai no mesmo dia em Guabiruba (UTC−3), então o `dia` da view
  // é o que esperamos sem depender da hora em que o script roda.
  d.setUTCHours(15, 0, 0, 0);
  return d;
}

try {
  console.log(`\nConta de ensaio: ${perfil.nome} (${aluno})\n`);
  console.log(`Semeando ${SEGUIDOS} dias de ${MINUTOS} min, começando ${DIAS_ATRAS} dias atrás…`);

  const linhas = Array.from({ length: SEGUIDOS }, (_, i) => ({
    aluno,
    puzzle_id: `${MARCA}-${i}`,
    tema: MARCA,
    acertou: true,
    tempo_ms: MINUTOS * 60_000,
    modo: "serie",
    criada_em: diaAtras(DIAS_ATRAS - i).toISOString(),
  }));
  const { error: erroPuzzle } = await admin.from("tentativas_puzzle").insert(linhas);
  if (erroPuzzle) throw new Error(`não consegui semear as tentativas: ${erroPuzzle.message}`);

  const { error: erroNivel } = await admin
    .from("nivel_conquistado")
    .upsert([
      { aluno, nivel: 1 },
      { aluno, nivel: 2 },
    ]);
  if (erroNivel) throw new Error(`não consegui semear os níveis: ${erroNivel.message}`);

  /* ---------------------------------------------------------------- *
   * A leitura, pela mesma porta que o painel usa
   * ---------------------------------------------------------------- */

  const { data: minutos } = await admin
    .from("minutos_por_dia")
    .select("dia, bloco, tempo_ms")
    .eq("aluno", aluno)
    .order("dia");
  const historico = (minutos ?? []) as MinutosDoDia[];

  const { data: niveis } = await admin
    .from("nivel_conquistado")
    .select("nivel")
    .eq("aluno", aluno);
  const conquistado = (niveis ?? []).reduce((m, l) => Math.max(m, l.nivel as number), 0);

  console.log(`\nO banco devolveu ${historico.length} dia(s) com tempo medido.`);

  const entrada: ParaOsSelos = {
    temasFechados: 0,
    aulasAprendidas: 0,
    repertorio: {
      brancasCompletas: false,
      pretasCompletas: false,
      baseCompleto: false,
      avancadoCompleto: false,
    },
    conquistado: conquistado as ParaOsSelos["conquistado"],
    diasComUmaHora: diasComOMinimo(historico),
    maiorSequencia: maiorSequenciaDeDias(historico),
  };

  console.log("\nOs números que saíram do banco:");
  console.log(`  dias com 60 min medidos : ${entrada.diasComUmaHora}`);
  console.log(`  maior sequência         : ${entrada.maiorSequencia}`);
  console.log(`  níveis conquistados     : ${entrada.conquistado}`);

  const lista = selos(entrada);
  const ganhos = lista.filter((s) => s.ganho).map((s) => s.id);

  console.log("\nOs selos, um a um:\n");
  const ESPERADOS = ["hora-1", "constante-3", "constante-7", "nivel-1", "nivel-2"];

  for (const id of ESPERADOS) {
    afirmar(ganhos.includes(id), `"${id}" acendeu`);
  }
  afirmar(
    ganhos.length === ESPERADOS.length,
    `nenhum selo a mais acendeu (${ganhos.length} de ${ESPERADOS.length}: ${ganhos.join(", ")})`,
  );

  // O ponto do script, dito em uma linha: o dia mais recente que semeamos tem
  // 34 dias, e todos os cinco selos continuam de pé.
  afirmar(
    entrada.diasComUmaHora >= SEGUIDOS,
    `os ${SEGUIDOS} dias de ${DIAS_ATRAS} dias atrás continuam contando (a janela de 30 dias saiu do caminho)`,
  );
  afirmar(
    entrada.maiorSequencia === SEGUIDOS,
    `a maior sequência é ${SEGUIDOS} e não a corrente, que é 0`,
  );

  const trancados = lista.filter((s) => !s.ganho);
  afirmar(
    trancados.every((s) => s.falta !== null && s.falta.length > 8),
    `os ${trancados.length} selos trancados dizem o que falta`,
  );
} finally {
  console.log("\nLimpando o que este script escreveu…");
  await admin.from("tentativas_puzzle").delete().eq("aluno", aluno).eq("tema", MARCA);
  await admin.from("nivel_conquistado").delete().eq("aluno", aluno);
  console.log("Limpo.");
}

console.log("");
if (falhas.length > 0) {
  console.error(`${falhas.length} falha(s):`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("Todos os selos conferem com o banco.");
