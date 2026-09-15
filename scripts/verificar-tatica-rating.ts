/**
 * A prova de que o modo "tática com rating" conta certo. Roda contra o banco.
 *
 * Uso:
 *   npm run db:tatica:rating
 *
 * Os testes de `lib/tatica/` provam a fórmula e a escolha em memória. O que eles
 * não alcançam é a corrente: servir o problema e gravá-lo como pendente, julgar
 * a resposta, mover o rating na tabela, gravar a tentativa — e a trava que faz
 * duas respostas iguais valerem uma. Isso só se prova no Postgres de verdade,
 * porque a trava **é** o Postgres (`update … where puzzle_pendente = P`).
 *
 * O que ele afirma:
 *
 *   1. o servidor cria a linha em 400/350 e serve um pendente, e chamar de novo
 *      devolve o mesmo (recarregar a página traz o mesmo problema);
 *   2. o pendente é exigido: resposta a outro id é recusada e não grava nada;
 *   3. lances forjados são recusados: o servidor julga, e lance errado não é
 *      acerto; resposta malformada nem chega a julgar;
 *   4. o rating muda — sobe no acerto, desce no erro — e a tentativa guarda o
 *      antes e o depois, com `tema = origem` e `modo = 'rating'`;
 *   5. `Promise.all` de duas respostas iguais grava **exatamente uma** linha e
 *      move o rating uma vez;
 *   6. um pendente que sumiu do disco é substituído por um que existe;
 *   7. o tempo é medido no servidor, de `pendente_desde` até a resposta;
 *   8. o próximo nunca é um problema já visto;
 *   9. o erro vai para a revisão do dia (hoje+2) e não para a prova do tema;
 *  10. `gravarTentativa` recusa o modo rating — ele só entra pela porta própria.
 *
 * No fim, apaga a conta de mentira. `on delete cascade` leva a linha do rating e
 * as tentativas.
 */

import { createClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { hojeNoBrasil, somarDias } from "../lib/curso/calendario.ts";
import { garantirPendente, responderRating } from "../lib/tatica/gravar-rating.ts";
import { gravarTentativa } from "../lib/tatica/gravar.ts";
import type { PuzzleServido } from "../lib/tatica/puzzles.ts";
import { filaDeRevisao, INTERVALOS_DA_REVISAO, type LinhaDeTentativa } from "../lib/tatica/revisao.ts";
import { idsErradosParaAProva } from "../lib/tatica/serie.ts";
import { carregarEnv } from "./env-local.ts";

carregarEnv();

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const falhas: string[] = [];
let afirmacoes = 0;

function afirmar(condicao: boolean, oQue: string): void {
  afirmacoes++;
  console.log(`  ${condicao ? "ok  " : "FALHOU"} ${oQue}`);
  if (!condicao) falhas.push(oQue);
}

/** A solução do aluno: os lances de índice ímpar (o par é do adversário). */
const solucao = (p: PuzzleServido) => p.lances.filter((_, j) => j % 2 === 1);

type Linha = {
  rating: number;
  rd: number;
  sequencia: number;
  melhor_sequencia: number;
  resolvidos: number;
  puzzle_pendente: string | null;
  tema_pendente: string | null;
};

async function linhaDoRating(aluno: string): Promise<Linha> {
  const { data, error } = await admin
    .from("rating_tatica")
    .select("rating, rd, sequencia, melhor_sequencia, resolvidos, puzzle_pendente, tema_pendente")
    .eq("aluno", aluno)
    .single();
  if (error) throw new Error(`não leu rating_tatica: ${error.message}`);
  return data as Linha;
}

async function tentativas(aluno: string) {
  const { data, error } = await admin
    .from("tentativas_puzzle")
    .select("puzzle_id, tema, origem, modo, acertou, tempo_ms, rating_antes, rating_depois, rd_depois, criada_em")
    .eq("aluno", aluno)
    .order("criada_em");
  if (error) throw new Error(`não leu tentativas: ${error.message}`);
  return data as (LinhaDeTentativa & {
    tempo_ms: number;
    rating_antes: number | null;
    rating_depois: number | null;
    rd_depois: number | null;
  })[];
}

async function pendente(aluno: string): Promise<PuzzleServido> {
  const servido = await garantirPendente(aluno);
  if ("erro" in servido) throw new Error(`garantirPendente: ${servido.erro}`);
  return servido.puzzle;
}

let alunoId: string | null = null;

try {
  console.log(`Banco: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);
  const usuario = `teste.rating.${Date.now().toString(36).slice(-5)}`;
  const { data: criado, error: erroConta } = await admin.auth.admin.createUser({
    email: emailDoUsuario(usuario),
    password: "424242",
    email_confirm: true,
    user_metadata: { usuario, nome: "Aluno do Rating", papel: "aluno", equipe: "M" },
  });
  if (erroConta || !criado.user) throw new Error(`não criou a conta: ${erroConta?.message}`);
  const aluno = criado.user.id;
  alunoId = aluno;

  /* -------------------------------------------------------------- */
  console.log("1. O servidor serve um pendente, e recarregar traz o mesmo");
  const primeiro = await garantirPendente(aluno);
  if ("erro" in primeiro) throw new Error(primeiro.erro);
  afirmar(primeiro.estado.rating === 400, `a linha nasce em 400 (nasceu em ${primeiro.estado.rating})`);
  const inicial = await linhaDoRating(aluno);
  afirmar(inicial.rd === 350 && inicial.resolvidos === 0, `RD 350 e zero resolvidos (${inicial.rd}, ${inicial.resolvidos})`);
  afirmar(
    inicial.puzzle_pendente === primeiro.puzzle.id && inicial.tema_pendente === primeiro.puzzle.origem,
    `o pendente ficou gravado (${primeiro.puzzle.id}, de ${primeiro.puzzle.origem}, rating ${primeiro.puzzle.rating})`,
  );
  afirmar(
    Math.abs(primeiro.puzzle.rating - 400) <= 400,
    `o problema está na janela do aluno de 400 (${primeiro.puzzle.rating})`,
  );
  const deNovo = await pendente(aluno);
  const eMaisUma = await pendente(aluno);
  afirmar(
    deNovo.id === primeiro.puzzle.id && eMaisUma.id === primeiro.puzzle.id,
    "chamar de novo devolve o mesmo problema, duas vezes",
  );
  const { count: linhasDoAluno } = await admin
    .from("rating_tatica")
    .select("*", { count: "exact", head: true })
    .eq("aluno", aluno);
  afirmar(linhasDoAluno === 1, `e há uma linha de rating só (${linhasDoAluno})`);

  /* -------------------------------------------------------------- */
  console.log("\n2. O pendente é exigido");
  const outroId = primeiro.puzzle.id === "00008" ? "0000D" : "00008";
  const aOutro = await responderRating(aluno, outroId, ["e2e4"]);
  afirmar("erro" in aOutro, `resposta a um problema que não é o pendente é recusada (${"erro" in aOutro ? aOutro.erro : "ACEITA!"})`);
  const inventado = await responderRating(aluno, "naoexiste", []);
  afirmar("erro" in inventado, "resposta a um id inventado é recusada");
  afirmar((await tentativas(aluno)).length === 0, "e nenhuma das duas virou linha");
  afirmar((await linhaDoRating(aluno)).rating === 400, "e o rating não se mexeu");

  /* -------------------------------------------------------------- */
  console.log("\n3. Lances forjados são recusados");
  const malformada = await responderRating(aluno, primeiro.puzzle.id, [1, 2] as unknown as string[]);
  afirmar("erro" in malformada, "lances que não são texto: recusado antes de julgar");
  const comprida = await responderRating(aluno, primeiro.puzzle.id, Array(41).fill("e2e4"));
  afirmar("erro" in comprida, "41 lances: recusado antes de julgar");
  afirmar((await tentativas(aluno)).length === 0, "e nada foi gravado");

  // Um "acertei" não existe no contrato: o que se pode forjar são lances. O
  // primeiro lance do adversário jogado de novo nunca é a solução.
  const forjada = await responderRating(aluno, primeiro.puzzle.id, [primeiro.puzzle.lances[0], ...solucao(primeiro.puzzle).slice(1)]);
  if ("erro" in forjada) throw new Error(`a forjada deu erro: ${forjada.erro}`);
  afirmar(forjada.acertou === false, "lances errados mandados como resposta viram erro, não acerto");

  /* -------------------------------------------------------------- */
  console.log("\n4. O rating muda, e a tentativa guarda o antes e o depois");
  const depoisDoErro = await linhaDoRating(aluno);
  afirmar(depoisDoErro.rating < 400, `o erro desceu o rating (400 → ${depoisDoErro.rating.toFixed(2)}, delta ${forjada.delta})`);
  afirmar(depoisDoErro.sequencia === 0 && depoisDoErro.resolvidos === 1, "sequência 0, um resolvido");
  afirmar(forjada.delta === Math.round(depoisDoErro.rating) - 400, "o delta devolvido é o da tabela");
  afirmar(forjada.solucao.join(" ") === primeiro.puzzle.lances.join(" "), "a resposta traz a solução para a tela mostrar");
  const [t1] = await tentativas(aluno);
  afirmar(
    t1?.modo === "rating" && t1.tema === primeiro.puzzle.origem && t1.origem === primeiro.puzzle.origem && t1.acertou === false,
    `a tentativa: modo rating, tema = origem = ${t1?.origem}, errada`,
  );
  afirmar(
    t1?.rating_antes === 400 && t1.rating_depois === depoisDoErro.rating && t1.rd_depois === depoisDoErro.rd,
    `e guarda rating_antes 400, rating_depois ${t1?.rating_depois?.toFixed(2)} e rd_depois ${t1?.rd_depois?.toFixed(2)}`,
  );
  afirmar(
    forjada.proximo !== null && depoisDoErro.puzzle_pendente === forjada.proximo.id,
    `o próximo já está pendente (${forjada.proximo?.id}, rating ${forjada.proximo?.rating})`,
  );

  const segundo = forjada.proximo!;
  const acerto = await responderRating(aluno, segundo.id, solucao(segundo));
  if ("erro" in acerto) throw new Error(`o acerto deu erro: ${acerto.erro}`);
  const depoisDoAcerto = await linhaDoRating(aluno);
  afirmar(acerto.acertou, "a solução certa é acerto");
  afirmar(
    depoisDoAcerto.rating > depoisDoErro.rating && acerto.delta > 0,
    `o acerto subiu o rating (${depoisDoErro.rating.toFixed(2)} → ${depoisDoAcerto.rating.toFixed(2)}, +${acerto.delta})`,
  );
  afirmar(depoisDoAcerto.sequencia === 1 && depoisDoAcerto.melhor_sequencia === 1, "sequência 1, melhor 1");

  /* -------------------------------------------------------------- */
  console.log("\n5. Duas respostas iguais ao mesmo tempo gravam uma");
  const terceiro = acerto.proximo!;
  const antesDaCorrida = await linhaDoRating(aluno);
  const [r1, r2] = await Promise.all([
    responderRating(aluno, terceiro.id, solucao(terceiro)),
    responderRating(aluno, terceiro.id, solucao(terceiro)),
  ]);
  const doTerceiro = (await tentativas(aluno)).filter((t) => t.puzzle_id === terceiro.id);
  afirmar(doTerceiro.length === 1, `exatamente uma linha para ${terceiro.id} (há ${doTerceiro.length})`);
  const depoisDaCorrida = await linhaDoRating(aluno);
  afirmar(
    depoisDaCorrida.resolvidos === antesDaCorrida.resolvidos + 1 && depoisDaCorrida.sequencia === antesDaCorrida.sequencia + 1,
    `o rating andou uma vez só (resolvidos ${antesDaCorrida.resolvidos} → ${depoisDaCorrida.resolvidos})`,
  );
  const aceitas = [r1, r2].filter((r) => !("erro" in r));
  afirmar(aceitas.length >= 1, `ao menos uma das duas respondeu o resultado (${aceitas.length})`);
  afirmar(
    aceitas.every((r) => "delta" in r && r.delta === Math.round(depoisDaCorrida.rating) - Math.round(antesDaCorrida.rating)),
    "e quem respondeu, respondeu o mesmo delta que ficou na tabela",
  );
  const reenvio = await responderRating(aluno, terceiro.id, solucao(terceiro));
  afirmar(
    !("erro" in reenvio) && reenvio.acertou && (await tentativas(aluno)).filter((t) => t.puzzle_id === terceiro.id).length === 1,
    "o reenvio depois devolve o mesmo resultado e não grava de novo",
  );

  /* -------------------------------------------------------------- */
  console.log("\n6. Um pendente que sumiu do disco é substituído");
  await admin
    .from("rating_tatica")
    .update({ puzzle_pendente: "sumiu0", tema_pendente: "fork", pendente_desde: new Date().toISOString() })
    .eq("aluno", aluno);
  const substituto = await pendente(aluno);
  afirmar(substituto.id !== "sumiu0", `o servidor serviu outro (${substituto.id}, de ${substituto.origem})`);
  const aposSubstituir = await linhaDoRating(aluno);
  afirmar(aposSubstituir.puzzle_pendente === substituto.id, "e o gravou como pendente");
  const aoSumido = await responderRating(aluno, "sumiu0", ["e2e4"]);
  afirmar("erro" in aoSumido, "e a resposta ao que sumiu é recusada");

  /* -------------------------------------------------------------- */
  console.log("\n7. O tempo é medido no servidor");
  await admin
    .from("rating_tatica")
    .update({ pendente_desde: new Date(Date.now() - 42_000).toISOString() })
    .eq("aluno", aluno);
  const cronometrado = await responderRating(aluno, substituto.id, solucao(substituto));
  if ("erro" in cronometrado) throw new Error(cronometrado.erro);
  const tempo = (await tentativas(aluno)).find((t) => t.puzzle_id === substituto.id)?.tempo_ms ?? -1;
  afirmar(tempo >= 42_000 && tempo < 60_000, `42 s de pendente viram ${tempo} ms na tentativa`);
  await admin
    .from("rating_tatica")
    .update({ pendente_desde: new Date(Date.now() - 3 * 3600_000).toISOString() })
    .eq("aluno", aluno);
  const esquecido = cronometrado.proximo!;
  await responderRating(aluno, esquecido.id, ["a1a1"]);
  const tempoEsquecido = (await tentativas(aluno)).find((t) => t.puzzle_id === esquecido.id)?.tempo_ms ?? -1;
  afirmar(tempoEsquecido === 30 * 60_000, `três horas de aba aberta ficam no teto de 30 min (${tempoEsquecido})`);

  /* -------------------------------------------------------------- */
  console.log("\n8. O próximo nunca é um problema já visto");
  const todas = await tentativas(aluno);
  const vistos = new Set(todas.map((t) => t.puzzle_id));
  const atual = await pendente(aluno);
  afirmar(!vistos.has(atual.id), `o pendente de agora (${atual.id}) não está entre os ${vistos.size} vistos`);
  afirmar(vistos.size === todas.length, "e nenhuma tentativa repetiu problema");

  /* -------------------------------------------------------------- */
  console.log("\n9. O erro vai para a revisão do dia, e não para a prova do tema");
  const erradas = todas.filter((t) => !t.acertou).map((t) => t.puzzle_id);
  const hoje = hojeNoBrasil();
  const emDoisDias = filaDeRevisao(todas, somarDias(hoje, INTERVALOS_DA_REVISAO[0]));
  afirmar(
    emDoisDias.length === erradas.length && emDoisDias.every((i) => erradas.includes(i.puzzleId)),
    `os ${erradas.length} erros estão na revisão de hoje+2 (tem ${emDoisDias.length})`,
  );
  afirmar(filaDeRevisao(todas, hoje).length === 0, "e hoje a revisão ainda não os serve");
  afirmar(idsErradosParaAProva(todas).length === 0, "e nenhum entra na prova do tema");

  /* -------------------------------------------------------------- */
  console.log("\n10. O modo rating só entra pela porta própria");
  const pelaPortaErrada = await gravarTentativa(aluno, {
    puzzleId: atual.id,
    tema: atual.origem,
    origem: atual.origem,
    modo: "rating",
    lances: solucao(atual),
    tempoMs: 1000,
  });
  afirmar("erro" in pelaPortaErrada, "gravarTentativa recusa modo = rating");
} catch (erro) {
  falhas.push(erro instanceof Error ? erro.message : String(erro));
  console.error(`\n${erro instanceof Error ? erro.message : erro}`);
} finally {
  if (alunoId) {
    await admin.auth.admin.deleteUser(alunoId);
    console.log("\nConta de teste apagada.");
  }
}

if (falhas.length) {
  console.error(`\n${falhas.length} de ${afirmacoes} afirmação(ões) falharam:`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log(`\n${afirmacoes} afirmações. O modo rating conta certo.`);
}
