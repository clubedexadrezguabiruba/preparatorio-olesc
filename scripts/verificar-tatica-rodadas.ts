/** Ensaio aditivo da retomada, idempotência e isolamento; só usa contas descartáveis. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { criarClienteAdmin } from "../lib/supabase/admin.ts";
import { obterRodada, lerRodada, puzzlesPendentes } from "../lib/tatica/rodadas.ts";
import { escolherPuzzles } from "../lib/tatica/escolher.ts";
import { gravarTentativa } from "../lib/tatica/gravar.ts";
import { abrirProvaDeNivel, ultimaProvaDeNivel } from "../lib/tatica/prova.ts";

process.loadEnvFile(".env.local");
const admin = criarClienteAdmin();
const contas: string[] = [];
const usuario = `teste.rodada.${randomUUID().slice(0, 8)}`;
const pin = randomUUID();
try {
  for (const sufixo of ["a", "b"]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: emailDoUsuario(`${usuario}${sufixo}`), password: pin, email_confirm: true,
      user_metadata: { usuario: `${usuario}${sufixo}`, nome: "Ensaio de rodada", papel: "aluno", equipe: "M" },
    });
    assert.equal(error, null);
    contas.push(data.user!.id);
  }
  const [aluno, outro] = contas;
  const opcoes = {
    aluno, chave: "tema:fork:prova", modo: "prova" as const, tema: "fork",
    selecionar: () => escolherPuzzles({ tag: "fork", etapa: "prova", faltam: 10, semente: aluno,
      jaVistos: new Set<string>(), outrosTemas: ["mateIn1", "pin"], errados: [] }),
  };
  const [rodada, concorrente] = await Promise.all([obterRodada(opcoes), obterRodada(opcoes)]);
  assert.equal(rodada.id, concorrente.id);
  const originais = await puzzlesPendentes(rodada);
  assert.equal(originais.length, 10);
  const p = originais[0];
  const tentativa = { rodadaId: rodada.id, puzzleId: p.id, tema: "fork", origem: p.origem,
    modo: "prova" as const, lances: ["a1a1"], tempoMs: 1000 };
  assert.ok("erro" in await gravarTentativa(outro, tentativa));
  assert.ok("erro" in await gravarTentativa(aluno, { ...tentativa, tema: "pin" }));
  assert.ok("erro" in await gravarTentativa(aluno, { ...tentativa, modo: "serie" }));
  assert.deepEqual(await gravarTentativa(aluno, tentativa), { acertou: false });
  const reenvios = await Promise.all([gravarTentativa(aluno, tentativa), gravarTentativa(aluno, {
    ...tentativa, lances: p.lances.filter((_, i) => i % 2 === 1),
  })]);
  assert.deepEqual(reenvios, [{ acertou: false }, { acertou: false }]);
  let retomada = (await lerRodada(aluno, rodada.id))!;
  assert.equal(retomada.respostas.length, 1);
  assert.deepEqual((await puzzlesPendentes(retomada)).map((x) => x.id), originais.slice(1).map((x) => x.id));
  for (const puzzle of originais.slice(1)) {
    const r = await gravarTentativa(aluno, { ...tentativa, puzzleId: puzzle.id, origem: puzzle.origem,
      lances: puzzle.lances.filter((_, i) => i % 2 === 1) });
    assert.deepEqual(r, { acertou: true });
    retomada = await obterRodada(opcoes);
    // A última resposta encerra a rodada; não abrimos outra automaticamente neste ensaio.
    if (puzzle.id !== originais.at(-1)!.id) assert.equal(retomada.id, rodada.id);
  }
  assert.equal((await lerRodada(aluno, rodada.id))!.respostas.length, 10);
  console.log("ok: retomada conserva a seleção; duas abas e reenvio contam uma vez; primeira resposta prevalece");

  const nivel = await abrirProvaDeNivel(aluno, 1);
  const prova = await puzzlesPendentes(nivel);
  assert.equal(prova.length, 12);
  for (const puzzle of prova) {
    assert.deepEqual(await gravarTentativa(aluno, { rodadaId: nivel.id, puzzleId: puzzle.id,
      tema: puzzle.origem, origem: puzzle.origem, modo: "prova-de-nivel", lances: ["a1a1"], tempoMs: 1000 }), { acertou: false });
  }
  assert.equal((await ultimaProvaDeNivel(aluno, 1))?.passou, false);
  assert.equal((await abrirProvaDeNivel(aluno, 1)).id, nivel.id);
  const nova = await abrirProvaDeNivel(aluno, 1, true);
  assert.notEqual(nova.id, nivel.id);
  assert.equal(await ultimaProvaDeNivel(aluno, 1), null);
  for (const puzzle of await puzzlesPendentes(nova)) {
    assert.deepEqual(await gravarTentativa(aluno, { rodadaId: nova.id, puzzleId: puzzle.id,
      tema: puzzle.origem, origem: puzzle.origem, modo: "prova-de-nivel",
      lances: puzzle.lances.filter((_, i) => i % 2 === 1), tempoMs: 1000 }), { acertou: true });
  }
  assert.equal((await ultimaProvaDeNivel(aluno, 1))?.acertos, 12);
  console.log("ok: prova reprovada pode ser refeita; nova tentativa não herda respostas; resultado 12/12");

  const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  assert.equal((await cliente.auth.signInWithPassword({ email: emailDoUsuario(`${usuario}b`), password: pin })).error, null);
  const leitura = await cliente.from("tatica_rodadas").select("id").eq("aluno", aluno);
  assert.equal(leitura.error, null);
  assert.deepEqual(leitura.data, []);
  const escrita = await cliente.from("tatica_rodadas").insert({ aluno: outro, chave: "forjada", numero: 1,
    modo: "prova", tema: "fork", puzzles: [{ id: p.id, origem: p.origem }] });
  assert.ok(escrita.error);
  console.log("ok: aluno não lê a rodada do colega nem cria a própria seleção pelo banco");
} finally {
  for (const id of contas) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`Não foi possível limpar a conta de ensaio ${id}`);
  }
  console.log(`${contas.length} contas descartáveis removidas.`);
}
