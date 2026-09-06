/**
 * Os quatro números que fecham a F2, medidos na conta de ensaio.
 *
 * Uso:
 *   node --conditions=react-server scripts/quatro-numeros-da-f2.ts
 *   npm run db:f2
 *
 * ## Por que este script existe, ao lado dos três `verificar-*`
 *
 * Os três `verificar-*.ts` provam **peça por peça**: a RLS segura, a tática
 * conta, os finais julgam. Cada um cria contas próprias e as apaga no fim, e é
 * por isso que nenhum deles responde à pergunta que o Doug faz no sábado: *o
 * aluno de ensaio, na conta que eu vou abrir no celular, vê os números certos?*
 *
 * Este roda sobre `alunoteste` (a conta de `scripts/aluno-de-teste.ts`), deixa
 * o rastro **de pé** para o site ser aberto em seguida, e mede as quatro
 * afirmações que a F2 fez ao aluno:
 *
 *   1. **"os que você errou voltam na prova"** — erra 3 na série de `mateIn1` e
 *      confere que os 3 estão entre os 10 da prova;
 *   2. **"eles voltam em dois dias"** — a fila de hoje está vazia e a de
 *      `hoje+2` tem os mesmos 3;
 *   3. **"a aula volta para você jogar de novo"** — domina `N0-LADDER` e joga a
 *      posição de revisão, que vira linha com `etapa='revisao'` e a `posicao`
 *      gravada;
 *   4. **"você treinou tantos minutos hoje"** — o que o cartão *Hoje* soma é o
 *      que a view `minutos_por_dia` tem, sem arredondar duas vezes.
 *
 * ## Ele recria a conta antes de medir
 *
 * As quatro afirmações são sobre contagem, e contagem só é conferível a partir
 * de um zero conhecido. Recriar é uma chamada; conferir e limpar seletivamente
 * seriam quatro, e a primeira que errasse deixaria o número seguinte mentindo.
 * A conta é de mentira e o `on delete cascade` leva o rastro junto.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { hojeNoBrasil, somarDias } from "../lib/curso/calendario.ts";
import { minutosDeHoje } from "../lib/curso/hoje.ts";
import { gravarTentativaDeAula } from "../lib/finais/gravar.ts";
import { escolherPuzzles } from "../lib/tatica/escolher.ts";
import { gravarTentativa } from "../lib/tatica/gravar.ts";
import { puzzlesDoTema } from "../lib/tatica/banco.ts";
import {
  filaDeRevisao,
  INTERVALOS_DA_REVISAO,
  type LinhaDeTentativa,
} from "../lib/tatica/revisao.ts";
import { emOrdemDeRating, idsErradosParaAProva, sortear } from "../lib/tatica/serie.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

for (const linha of readFileSync(path.join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const corte = linha.indexOf("=");
  if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
  const nome = linha.slice(0, corte).trim();
  if (!process.env[nome]) process.env[nome] = linha.slice(corte + 1).trim();
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const USUARIO = "alunoteste";
const PIN = "112233";
const TEMA = "mateIn1";
const NA_SERIE = 8;
const ERRADOS = 3;
const AULA = "N0-LADDER";
const REVISAO = "pos-n0-ladder-freeborough-262";

/**
 * As duas partidas de `N0-LADDER`, dos dois lados, achadas por busca de mate
 * cooperativo e conferidas no tabuleiro. Como nos `verificar-*`, o defensor
 * ajuda: o que se mede aqui é a contagem, não a técnica.
 */
const PRATICA_QUE_MATA = ["f4f5", "e5e4", "f5f4", "e4e3", "d1d2"];
const REVISAO_QUE_MATA = ["d3e3", "d5d6", "g2g6", "d6e5", "a1a5"];

const falhas: string[] = [];

function medir(condicao: boolean, oQue: string): void {
  console.log(`  ${condicao ? "ok  " : "FALHOU"} ${oQue}`);
  if (!condicao) falhas.push(oQue);
}

async function recriar(): Promise<string> {
  const { data: antigo } = await admin
    .from("perfis")
    .select("id")
    .eq("usuario", USUARIO)
    .maybeSingle();
  if (antigo) await admin.auth.admin.deleteUser(antigo.id);

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
  if (error || !data.user) throw new Error(`não recriou a conta: ${error?.message}`);
  return data.user.id;
}

const hoje = hojeNoBrasil();
console.log(`Banco: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`Hoje em Guabiruba: ${hoje}\n`);

const aluno = await recriar();
console.log(`Conta ${USUARIO} recriada (${aluno}), com zero tentativas.\n`);

/* ------------------------------------------------------------------ *
 * 1. Os errados voltam na prova
 * ------------------------------------------------------------------ */

console.log(`1. A série de "${TEMA}": ${NA_SERIE} puzzles, ${ERRADOS} errados de propósito`);

const doTema = await puzzlesDoTema(TEMA);
const serie = emOrdemDeRating(sortear(doTema, NA_SERIE, aluno, new Set()));
const idsErrados: string[] = [];

for (const [i, p] of serie.entries()) {
  const solucao = p.lances.filter((_, j) => j % 2 === 1);
  const errar = i < ERRADOS;
  if (errar) idsErrados.push(p.id);
  const r = await gravarTentativa(aluno, {
    puzzleId: p.id,
    tema: TEMA,
    origem: TEMA,
    modo: i < 5 ? "aquecimento" : "serie",
    // "a1a1" nunca é legal: o servidor julga como erro, e a linha existe.
    lances: errar ? ["a1a1", ...solucao.slice(1)] : solucao,
    tempoMs: 30_000 + i * 1_000,
  });
  if ("erro" in r) throw new Error(`puzzle ${p.id}: ${r.erro}`);
  medir(r.acertou === !errar, `${p.id} gravado como ${r.acertou ? "certo" : "erro"}`);
}

const linhasCruas = async (): Promise<LinhaDeTentativa[]> => {
  const { data } = await admin
    .from("tentativas_puzzle")
    .select("puzzle_id, tema, origem, modo, acertou, criada_em")
    .eq("aluno", aluno)
    .order("criada_em");
  return (data ?? []) as LinhaDeTentativa[];
};

const linhas = await linhasCruas();
const paraAProva = idsErradosParaAProva(
  linhas.map((l) => ({ puzzle_id: l.puzzle_id, modo: l.modo, acertou: l.acertou })),
);
const prova = await escolherPuzzles({
  tag: TEMA,
  etapa: "prova",
  faltam: 10,
  semente: aluno,
  jaVistos: new Set(linhas.map((l) => l.puzzle_id)),
  outrosTemas: [],
  errados: paraAProva,
});
const naProva = idsErrados.filter((id) => prova.some((p) => p.id === id));

console.log("");
console.log(`  NÚMERO 1 — dos ${ERRADOS} errados, ${naProva.length} estão entre os ${prova.length} da prova.`);
medir(naProva.length === ERRADOS, `os ${ERRADOS} errados voltam na prova`);
medir(prova.length === 10, `a prova tem 10 vagas (tem ${prova.length})`);

/* ------------------------------------------------------------------ *
 * 2. A fila de revisão: vazia hoje, cheia em hoje+2
 * ------------------------------------------------------------------ */

const emDois = somarDias(hoje, INTERVALOS_DA_REVISAO[0]);
const filaHoje = filaDeRevisao(linhas, hoje);
const filaEmDois = filaDeRevisao(linhas, emDois);

console.log("");
console.log(`2. A fila de /tatica/revisao`);
console.log("");
console.log(`  NÚMERO 2 — hoje (${hoje}): ${filaHoje.length}.  Em ${emDois}: ${filaEmDois.length}.`);
medir(filaHoje.length === 0, "hoje a revisão está vazia — quem errou agora não volta hoje");
medir(filaEmDois.length === ERRADOS, `em hoje+${INTERVALOS_DA_REVISAO[0]} a fila tem os ${ERRADOS}`);
medir(
  filaEmDois.every((i) => idsErrados.includes(i.puzzleId) && i.nivel === 1),
  "e são exatamente os errados, todos no nível 1",
);

/* ------------------------------------------------------------------ *
 * 3. A aula dominada, e a revisão dela jogada
 * ------------------------------------------------------------------ */

console.log("");
console.log(`3. A aula ${AULA} (curta: dominada é vencer a prática)`);

const pratica = await gravarTentativaDeAula(aluno, {
  aula: AULA,
  etapa: "pratica",
  lances: PRATICA_QUE_MATA,
  tempoMs: 240_000,
});
medir("sucesso" in pratica && pratica.sucesso, `a prática venceu (${JSON.stringify(pratica)})`);

const revisao = await gravarTentativaDeAula(aluno, {
  aula: AULA,
  etapa: "revisao",
  posicaoId: REVISAO,
  lances: REVISAO_QUE_MATA,
  tempoMs: 150_000,
});
medir("sucesso" in revisao && revisao.sucesso, `a revisão venceu (${JSON.stringify(revisao)})`);

const { data: deAula } = await admin
  .from("tentativas_aula")
  .select("aula, etapa, sucesso, posicao, tempo_ms")
  .eq("aluno", aluno)
  .order("criada_em");
const linhaDeRevisao = (deAula ?? []).find((l) => l.etapa === "revisao");

console.log("");
console.log(
  `  NÚMERO 3 — a linha da revisão: etapa='${linhaDeRevisao?.etapa}', posicao='${linhaDeRevisao?.posicao}'.`,
);
medir(linhaDeRevisao?.etapa === "revisao", "a etapa é `revisao`");
medir(linhaDeRevisao?.posicao === REVISAO, `a posição gravada é ${REVISAO}`);
medir(
  (deAula ?? []).filter((l) => l.etapa !== "revisao").every((l) => l.posicao === null),
  "e a linha da prática tem `posicao` nula",
);

/* ------------------------------------------------------------------ *
 * 4. Os minutos de hoje: a tela e a view dizem o mesmo
 * ------------------------------------------------------------------ */

console.log("");
console.log("4. O cartão \"Hoje\" e a view `minutos_por_dia`");

const { data: naView } = await admin
  .from("minutos_por_dia")
  .select("dia, bloco, tempo_ms, itens")
  .eq("aluno", aluno)
  .eq("dia", hoje);

const msDaView = (naView ?? []).reduce((s, l) => s + l.tempo_ms, 0);
const itensDaView = (naView ?? []).reduce((s, l) => s + l.itens, 0);

// A mesma função que o cartão usa. É ela que decide **onde** se arredonda: uma
// vez, sobre a soma — dois puzzles de 59,6 s são 2 minutos, não 1 + 1.
const doCartao = minutosDeHoje(
  (naView ?? []).map((l) => ({ dia: l.dia, bloco: l.bloco, tempo_ms: l.tempo_ms, itens: l.itens })),
  hoje,
);

const { data: cruasParaSomar } = await admin
  .from("tentativas_puzzle")
  .select("tempo_ms")
  .eq("aluno", aluno);
const { data: cruasDeAula } = await admin
  .from("tentativas_aula")
  .select("tempo_ms")
  .eq("aluno", aluno);
const msDasTabelas =
  (cruasParaSomar ?? []).reduce((s, l) => s + l.tempo_ms, 0) +
  (cruasDeAula ?? []).reduce((s, l) => s + l.tempo_ms, 0);

console.log("");
console.log(
  `  NÚMERO 4 — o cartão mostra ${doCartao.total} min (${doCartao.tatica} de tática + ` +
    `${doCartao.finais} de finais); a view soma ${msDaView} ms ` +
    `(${(msDaView / 60000).toFixed(2)} min) em ${itensDaView} itens.`,
);
medir(msDaView === msDasTabelas, `a view soma o mesmo que as tabelas (${msDaView} = ${msDasTabelas})`);
medir(
  itensDaView === (cruasParaSomar ?? []).length + (cruasDeAula ?? []).length,
  `e conta os mesmos itens (${itensDaView})`,
);
medir(
  doCartao.total === Math.round(msDaView / 60000),
  `o cartão arredonda uma vez só (${doCartao.total} min)`,
);
medir(
  (naView ?? []).every((l) => l.dia === hoje),
  `e tudo caiu no dia de Guabiruba (${hoje})`,
);

console.log("");
console.log(
  `O rastro fica de pé na conta ${USUARIO} / PIN ${PIN} — entre no site e confira as telas.`,
);

if (falhas.length) {
  console.error(`\n${falhas.length} medida(s) falharam:`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("\nOs quatro números batem.");
}
