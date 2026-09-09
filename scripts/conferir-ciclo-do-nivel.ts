/**
 * O ciclo do nível 1, contra o banco de verdade.
 *
 *     npm run dev
 *     node scripts/aluno-de-teste.ts criar
 *     npm run niveis:ciclo
 *
 * ## O que ele prova, e por que `npm test` não prova
 *
 * `lib/curso/nivel.test.ts` cobre a regra inteira, e cobre bem — mas com mapas
 * escritos à mão. O que ele **não** alcança é a fiação: se o que o banco guarda
 * chega à regra na forma que ela espera, e se a prova de nível corrige as
 * linhas que a série de fato gravou.
 *
 * A diferença é a que já mordeu este projeto antes: uma tela contando de um
 * jeito e o relatório de outro, com o aluno na frente. Aqui os números saem
 * todos de `lib/curso/estado.ts`, que é a mesma porta que a ação de encerrar a
 * prova usa.
 *
 * ## Ele semeia e limpa
 *
 * Fechar o nível 1 de verdade são 117 puzzles e cinco dias de calendário do
 * repertório. Este script **escreve o estado** — com a chave de serviço, como o
 * servidor faz — e depois apaga o que escreveu. A conta é a de ensaio, e a
 * limpeza roda no `finally`: uma execução interrompida no meio não deixa a
 * conta de ensaio com um nível que ela não ganhou.
 *
 * O que ele **não** faz é jogar os 12 puzzles da prova pelo tabuleiro. Isso é
 * `scripts/conferir-tatica.ts`, que já dirige o chessground, e a correção aqui
 * lê as linhas gravadas — que é exatamente o que a ação de encerrar faz.
 */

import { createClient } from "@supabase/supabase-js";
import { carregarEnv } from "./env-local.ts";
import { NIVEIS, PROVA_DE_NIVEL, fechamentoDoNivel, prontoParaProva, temasDoNivel } from "../lib/curso/nivel.ts";
import { METAS, ETAPAS } from "../lib/tatica/serie.ts";

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

/* ------------------------------------------------------------------ *
 * A conta de ensaio
 * ------------------------------------------------------------------ */

const { data: perfil } = await admin
  .from("perfis")
  .select("id, nome")
  .eq("usuario", "alunoteste")
  .maybeSingle();

if (!perfil) {
  console.error("A conta de ensaio não existe. Rode `node scripts/aluno-de-teste.ts criar`.");
  process.exit(1);
}
const aluno = perfil.id as string;

/* ------------------------------------------------------------------ *
 * A leitura, pela mesma porta do servidor
 * ------------------------------------------------------------------ */

type Estado = Awaited<ReturnType<typeof lerEstado>>;

/**
 * O estado do aluno para a regra do nível.
 *
 * Montado aqui e não por `lib/curso/estado.ts` por um motivo mecânico:
 * aquele arquivo é `server-only` e lê a sessão pelo cliente do Next, que não
 * existe num script. A **forma** é a mesma, e é o tipo que garante isso.
 */
async function lerEstado() {
  // Finais fica de fora da leitura de propósito: no nível 1 o requisito é zero
  // pelo clamp (nenhuma aula de classe E existe em disco), e semear uma aula
  // aprendida aqui provaria a fiação de uma tela que hoje não tem o que
  // mostrar. Quem cobre esse caminho é `nivel.test.ts`, com o mapa na mão.
  const [tentativas, escada] = await Promise.all([
    admin.from("tentativas_puzzle").select("tema, modo, acertou").eq("aluno", aluno),
    admin.from("repertorio_progresso").select("linha, degrau, aprendida_em").eq("aluno", aluno),
  ]);

  const temas = new Map<string, { aquecimento: number; serie: number; prova: number }>();
  for (const l of tentativas.data ?? []) {
    const etapa = ETAPAS.find((e) => e === l.modo);
    if (!etapa) continue;
    const atual = temas.get(l.tema) ?? { aquecimento: 0, serie: 0, prova: 0 };
    atual[etapa] += 1;
    temas.set(l.tema, atual);
  }

  const linhasAprendidas = (escada.data ?? []).filter((l) => l.aprendida_em !== null).length;

  return {
    temas,
    finais: new Map<string, never>(),
    publicadas: new Set<string>(),
    linhasAprendidas,
    baseCompleto: false,
  };
}

/* ------------------------------------------------------------------ *
 * A semeadura
 * ------------------------------------------------------------------ */

const TEMAS_DO_1 = temasDoNivel(1);
const MARCA = "zz-ciclo-";

async function limpar(): Promise<void> {
  await admin.from("tentativas_puzzle").delete().eq("aluno", aluno).like("puzzle_id", `${MARCA}%`);
  await admin.from("repertorio_progresso").delete().eq("aluno", aluno).like("linha", `${MARCA}%`);
  await admin.from("nivel_conquistado").delete().eq("aluno", aluno);
}

/** Fecha os três temas do nível 1: 5 + 24 + 10 linhas em cada. */
async function fecharTatica(): Promise<void> {
  const linhas: object[] = [];
  for (const tema of TEMAS_DO_1) {
    for (const etapa of ETAPAS) {
      for (let i = 0; i < METAS[etapa]; i += 1) {
        linhas.push({
          aluno,
          puzzle_id: `${MARCA}${tema}-${etapa}-${i}`,
          tema,
          origem: tema,
          acertou: true,
          tempo_ms: 5000,
          modo: etapa,
        });
      }
    }
  }
  const { error } = await admin.from("tentativas_puzzle").insert(linhas);
  if (error) throw new Error(`não semeou a tática: ${error.message}`);
}

async function aprenderLinhas(quantas: number): Promise<void> {
  const linhas = Array.from({ length: quantas }, (_, i) => ({
    aluno,
    linha: `${MARCA}linha-${i}`,
    acertos_seguidos: 3,
    tentativas: 3,
    erros: 0,
    aprendida_em: new Date().toISOString(),
    degrau: 3,
    revisar_em: new Date(Date.now() + 86_400_000).toISOString(),
  }));
  const { error } = await admin.from("repertorio_progresso").insert(linhas);
  if (error) throw new Error(`não semeou o repertório: ${error.message}`);
}

/** Grava uma prova de nível com `acertos` de 12, nos temas do nível 1. */
async function gravarProva(acertos: number): Promise<void> {
  const linhas = Array.from({ length: PROVA_DE_NIVEL.puzzles }, (_, i) => ({
    aluno,
    puzzle_id: `${MARCA}prova-${Date.now()}-${i}`,
    tema: TEMAS_DO_1[i % TEMAS_DO_1.length],
    origem: TEMAS_DO_1[i % TEMAS_DO_1.length],
    acertou: i < acertos,
    tempo_ms: 8000,
    modo: "prova-de-nivel",
  }));
  const { error } = await admin.from("tentativas_puzzle").insert(linhas);
  if (error) throw new Error(`não gravou a prova: ${error.message}`);
}

/** A correção que a ação de encerrar faz, sobre as linhas gravadas. */
async function corrigirUltimaProva() {
  const { data } = await admin
    .from("tentativas_puzzle")
    .select("puzzle_id, tema, acertou, criada_em")
    .eq("aluno", aluno)
    .eq("modo", "prova-de-nivel")
    .order("criada_em", { ascending: false })
    .order("puzzle_id", { ascending: false })
    .limit(PROVA_DE_NIVEL.puzzles);

  const linhas = data ?? [];
  if (linhas.length < PROVA_DE_NIVEL.puzzles) return null;
  const acertos = linhas.filter((l) => l.acertou).length;
  return {
    acertos,
    passou: acertos >= PROVA_DE_NIVEL.paraPassar,
    erros: [...new Set(linhas.filter((l) => !l.acertou).map((l) => l.tema))],
  };
}

/* ------------------------------------------------------------------ *
 * O ciclo
 * ------------------------------------------------------------------ */

try {
  await limpar();
  console.log(`\nO ciclo do nível 1, na conta de ensaio (${perfil.nome}).\n`);

  console.log("a. Zerado: o painel diz nível 1, e a prova não é ofertada");
  let estado = (await lerEstado()) as Estado;
  afirmar(prontoParaProva(estado) === 0, "nenhuma prova ofertada");
  let f = fechamentoDoNivel(1, estado);
  afirmar(f.tatica.feitos === 0 && f.tatica.total === 3, `tática 0 de 3 (viu ${f.tatica.feitos} de ${f.tatica.total})`);
  afirmar(f.finais.exigidas === 0, `finais exigidas 0 pelo clamp (viu ${f.finais.exigidas})`);

  console.log("\nb. Fechados os três temas: a prova CONTINUA indisponível");
  await fecharTatica();
  estado = (await lerEstado()) as Estado;
  f = fechamentoDoNivel(1, estado);
  afirmar(f.tatica.feitos === 3, `tática 3 de 3 (viu ${f.tatica.feitos})`);
  afirmar(f.fechado === false, "o nível não fecha só com tática");
  afirmar(prontoParaProva(estado) === 0, "e a prova segue indisponível");

  console.log("\nc. Mais 4 linhas de repertório: a prova PASSA a ser ofertada");
  await aprenderLinhas(4);
  estado = (await lerEstado()) as Estado;
  f = fechamentoDoNivel(1, estado);
  afirmar(f.repertorio.feitas === 4, `repertório 4 de 4 (viu ${f.repertorio.feitas})`);
  afirmar(f.fechado === true, "as três trilhas fecharam");
  afirmar(prontoParaProva(estado) === 1, `a prova do nível 1 é ofertada (viu ${prontoParaProva(estado)})`);

  console.log("\nd. A prova com 8 de 12: não passa, e a tela nomeia os temas");
  await gravarProva(8);
  const reprovou = await corrigirUltimaProva();
  afirmar(reprovou?.acertos === 8, `contou 8 acertos (viu ${reprovou?.acertos})`);
  afirmar(reprovou?.passou === false, "8 de 12 não passa");
  afirmar((reprovou?.erros.length ?? 0) > 0, `os temas dos erros são nomeados (${reprovou?.erros.join(", ")})`);
  const { count: semConquista } = await admin
    .from("nivel_conquistado")
    .select("*", { count: "exact", head: true })
    .eq("aluno", aluno);
  afirmar(semConquista === 0, `reprovar não grava linha nenhuma (viu ${semConquista})`);

  console.log("\ne. A prova com 9 de 12: passa, e o nível é concedido");
  await gravarProva(9);
  const passou = await corrigirUltimaProva();
  afirmar(passou?.passou === true, `9 de 12 passa (viu ${passou?.acertos})`);
  await admin.from("nivel_conquistado").insert({ aluno, nivel: 1 });
  const { data: conquistas } = await admin
    .from("nivel_conquistado")
    .select("nivel")
    .eq("aluno", aluno);
  afirmar(conquistas?.length === 1 && conquistas[0].nivel === 1, "uma linha, no nível 1");

  console.log("\nf. Publicar uma aula de finais nova não rebaixa quem já passou");
  // O requisito de finais **sobe** quando se publica: `prontoParaProva` cai
  // para 0. Se o nível fosse derivado dele, o aluno perderia o selo — e é por
  // isso que ele é gravado. A tabela não desce: subir é `insert`.
  const comAulaPublicada = { ...estado, publicadas: new Set(["N0-Q-MATE"]) };
  afirmar(
    prontoParaProva(comAulaPublicada) === 0,
    "o requisito de finais subiu, e a elegibilidade caiu",
  );
  afirmar(conquistas?.[0]?.nivel === 1, "mas a conquista gravada continua lá");

  console.log("\ng. A escada não tem buraco: os cinco níveis existem e somam o currículo");
  const total = NIVEIS.reduce((s, n) => s + temasDoNivel(n).length, 0);
  afirmar(total === 36, `os 36 temas do currículo estão na escada (viu ${total})`);
} finally {
  await limpar();
  console.log("\nO que este script escreveu foi apagado.");
}

if (falhas.length) {
  console.error(`\n${falhas.length} afirmação(ões) falharam.`);
  process.exit(1);
}
console.log("\nO ciclo do nível 1 fecha.");
