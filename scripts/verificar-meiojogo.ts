/**
 * A prova de que o treino de meio-jogo grava certo. Roda contra o banco de
 * verdade.
 *
 * Uso:
 *   node --conditions=react-server scripts/verificar-meiojogo.ts
 *
 * ## Por que isto não é teste unitário
 *
 * `lib/meiojogo/tentativa.test.ts` prova o juiz e a máquina de estado em
 * memória, e `scripts/conferir-treino.ts` prova o gesto no navegador. O que
 * nenhum dos dois alcança é a emenda: julgar no servidor, derivar as colunas
 * que o navegador **não** manda, gravar com a chave de serviço, e o aluno
 * conseguir ler de volta o próprio número — e só o próprio.
 *
 * O que ele afirma:
 *
 *   1. a casa certa grava `acertou=true`, e uma casa errada grava `false` —
 *      quem julga é o servidor, com a mesma função do gate de conteúdo;
 *   2. `apoio` chega como o aluno pediu, e não é apagado no caminho;
 *   3. `tentativa` e `primeira` contam respostas, e não cliques: a resposta 2
 *      do mesmo item no mesmo dia é `tentativa=2, primeira=false`;
 *   4. `inedita` é verdadeira no primeiro dia, e não se confunde com
 *      `primeira`;
 *   5. a aplicação grava com `habilidade=aplicacao` e `nivel_evidencia=curado`,
 *      guardando a **letra** escolhida;
 *   6. `versao` é a mesma para o mesmo item, e muda quando o item muda;
 *   7. item inventado e casa malformada **não** viram linha;
 *   8. a linha entra na `minutos_por_dia` no bloco `meiojogo`, no **dia de
 *      Guabiruba** — a afirmação que prova que o fuso do SQL e o do TypeScript
 *      concordam;
 *   9. o aluno lê a própria linha, **não** lê a do colega, e não consegue
 *      gravar por conta própria.
 *
 * No fim, apaga as duas contas de mentira; o `on delete cascade` leva as
 * tentativas junto.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { hojeNoBrasil } from "../lib/curso/calendario.ts";
import { dicaPorId } from "../lib/meiojogo/conteudo.ts";
import { gravarTreino } from "../lib/meiojogo/gravar.ts";
import { casasAceitas } from "../lib/meiojogo/tentativa.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

for (const linha of readFileSync(path.join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const corte = linha.indexOf("=");
  if (corte <= 0 || linha.trimStart().startsWith("#")) continue;
  const nome = linha.slice(0, corte).trim();
  if (!process.env[nome]) process.env[nome] = linha.slice(corte + 1).trim();
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SERVICO = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(URL_, SERVICO, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const falhas: string[] = [];

function afirmar(condicao: boolean, oQue: string): void {
  console.log(`  ${condicao ? "ok  " : "FALHOU"} ${oQue}`);
  if (!condicao) falhas.push(oQue);
}

const SUFIXO = Date.now().toString(36).slice(-5);
const PIN = "424242";
/** A dica da fatia usada na prova. Qualquer uma de m9–m16 serviria. */
const DICA = "m12";

type Conta = { id: string; usuario: string };

async function criarConta(usuario: string, nome: string): Promise<Conta> {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailDoUsuario(usuario),
    password: PIN,
    email_confirm: true,
    user_metadata: { usuario, nome, papel: "aluno", equipe: "M" },
  });
  if (error || !data.user) throw new Error(`não deu para criar ${usuario}: ${error?.message}`);
  return { id: data.user.id, usuario };
}

async function entrar(usuario: string): Promise<SupabaseClient> {
  const cliente = createClient(URL_, PUBLICA, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await cliente.auth.signInWithPassword({
    email: emailDoUsuario(usuario),
    password: PIN,
  });
  if (error) throw new Error(`${usuario} não entrou: ${error.message}`);
  return cliente;
}

/** Uma casa vazia que não é resposta — o clique que só o `select` entrega. */
function casaErrada(fen: string, resposta: readonly string[]): string {
  const linhas = fen.split(" ")[0].split("/");
  for (let i = 0; i < 8; i += 1) {
    let coluna = 0;
    for (const c of linhas[i]) {
      if (/\d/.test(c)) {
        for (let n = 0; n < Number(c); n += 1) {
          const casa = `${"abcdefgh"[coluna + n]}${8 - i}`;
          if (!resposta.includes(casa)) return casa;
        }
        coluna += Number(c);
      } else {
        coluna += 1;
      }
    }
  }
  throw new Error("a posição não tem casa vazia fora da resposta");
}

const contas: Conta[] = [];

try {
  console.log(`Banco: ${URL_}\n`);

  const dica = dicaPorId(DICA);
  const treino = dica?.treino;
  if (!treino) throw new Error(`${DICA} não tem treino no conteúdo`);
  const item = treino.reconhecimento[0];
  const certa = casasAceitas(item)[0];
  const errada = casaErrada(item.fen, item.resposta);

  const ana = await criarConta(`teste.meiojogo.a${SUFIXO}`, "Ana de Teste");
  contas.push(ana);
  const bruno = await criarConta(`teste.meiojogo.b${SUFIXO}`, "Bruno de Teste");
  contas.push(bruno);

  /* ---------------------------------------------------------------- *
   * 1. O servidor julga
   * ---------------------------------------------------------------- */
  console.log(`\nA Ana responde ${item.id} (resposta certa: ${certa}):`);

  const erro1 = await gravarTreino(ana.id, {
    dica: DICA,
    item: item.id,
    resposta: errada,
    apoio: 0,
    tempoMs: 9000,
  });
  afirmar("acertou" in erro1 && erro1.acertou === false, `a casa ${errada} grava acertou=false`);

  const comApoio = await gravarTreino(ana.id, {
    dica: DICA,
    item: item.id,
    resposta: certa,
    apoio: 2,
    tempoMs: 7000,
  });
  afirmar("acertou" in comApoio && comApoio.acertou === true, `a casa ${certa} grava acertou=true`);

  /* ---------------------------------------------------------------- *
   * 2. As colunas que o navegador não manda
   * ---------------------------------------------------------------- */
  console.log("\nO que o servidor derivou:");

  const { data: linhas } = await admin
    .from("tentativa_meiojogo")
    .select("*")
    .eq("aluno", ana.id)
    .order("id");
  const gravadas = linhas ?? [];
  afirmar(gravadas.length === 2, `duas linhas gravadas (${gravadas.length})`);

  const [primeiraLinha, segundaLinha] = gravadas;
  afirmar(primeiraLinha?.tentativa === 1 && primeiraLinha?.primeira === true, "a 1ª é primeira=true");
  afirmar(
    segundaLinha?.tentativa === 2 && segundaLinha?.primeira === false,
    "a 2ª resposta do mesmo item no mesmo dia é tentativa=2, primeira=false",
  );
  afirmar(primeiraLinha?.apoio === 0 && segundaLinha?.apoio === 2, "o apoio chega como foi pedido");
  afirmar(
    primeiraLinha?.inedita === true && segundaLinha?.inedita === true,
    "inedita é verdadeira no primeiro dia — e não se confunde com primeira",
  );
  afirmar(
    primeiraLinha?.conceito === item.tarefa &&
      primeiraLinha?.habilidade === "reconhecimento" &&
      primeiraLinha?.nivel_evidencia === "fato",
    `o reconhecimento grava conceito=${item.tarefa}, habilidade=reconhecimento, evidência=fato`,
  );
  afirmar(
    primeiraLinha?.resposta === errada && segundaLinha?.resposta === certa,
    "a casa tocada fica gravada — e não um booleano",
  );
  afirmar(
    typeof primeiraLinha?.versao === "string" &&
      primeiraLinha.versao.length === 8 &&
      primeiraLinha.versao === segundaLinha?.versao,
    `a versão do item é estável (${primeiraLinha?.versao})`,
  );

  /* ---------------------------------------------------------------- *
   * 3. A aplicação
   * ---------------------------------------------------------------- */
  console.log("\nA aplicação (degrau 4):");

  const letraCerta = String.fromCharCode(97 + treino.aplicacao.opcoes.findIndex((o) => o.certa));
  const aplicacao = await gravarTreino(ana.id, {
    dica: DICA,
    item: treino.aplicacao.id,
    resposta: letraCerta,
    apoio: 0,
    tempoMs: 12000,
  });
  afirmar(
    "acertou" in aplicacao && aplicacao.acertou === true,
    `a opção "${letraCerta}" é a certa e grava acertou=true`,
  );

  const { data: doDegrau4 } = await admin
    .from("tentativa_meiojogo")
    .select("*")
    .eq("aluno", ana.id)
    .eq("item", treino.aplicacao.id)
    .single();
  afirmar(
    doDegrau4?.habilidade === "aplicacao" && doDegrau4?.nivel_evidencia === "curado",
    "a aplicação grava habilidade=aplicacao e evidência=curado",
  );
  afirmar(doDegrau4?.resposta === letraCerta, "a letra escolhida fica gravada");
  afirmar(
    doDegrau4?.conceito === treino.reconhecimento[2].tarefa,
    "a aplicação herda o conceito do item do degrau 3, para a fila de revisão",
  );
  afirmar(
    doDegrau4?.versao !== primeiraLinha?.versao,
    "item diferente, versão diferente — as duas não se comparam",
  );

  /* ---------------------------------------------------------------- *
   * 4. O que o servidor recusa
   * ---------------------------------------------------------------- */
  console.log("\nO que o servidor recusa:");

  const inventado = await gravarTreino(ana.id, {
    dica: DICA,
    item: "m12-d9-z",
    resposta: certa,
    apoio: 0,
    tempoMs: 10,
  });
  afirmar("erro" in inventado, "item que não existe no conteúdo não vira linha");

  const malformada = await gravarTreino(ana.id, {
    dica: DICA,
    item: item.id,
    resposta: "z9",
    apoio: 0,
    tempoMs: 10,
  });
  afirmar("erro" in malformada, "casa fora do tabuleiro não vira linha");

  const semTreino = await gravarTreino(ana.id, {
    dica: "m1",
    item: item.id,
    resposta: certa,
    apoio: 0,
    tempoMs: 10,
  });
  afirmar("erro" in semTreino, "dica sem treino curado não vira linha");

  /* ---------------------------------------------------------------- *
   * 5. Os minutos, no dia de Guabiruba
   * ---------------------------------------------------------------- */
  console.log("\nOs minutos:");

  const { data: minutos } = await admin
    .from("minutos_por_dia")
    .select("dia, bloco, tempo_ms, itens")
    .eq("aluno", ana.id)
    .eq("bloco", "meiojogo");
  const hoje = minutos?.find((m) => m.dia === hojeNoBrasil());
  afirmar(
    hoje !== undefined,
    `a linha entra na minutos_por_dia no dia de Guabiruba (${hojeNoBrasil()})`,
  );
  afirmar(hoje?.itens === 3, `os três itens somam na view (${hoje?.itens ?? 0})`);
  afirmar(
    hoje?.tempo_ms === 9000 + 7000 + 12000,
    `o tempo soma 28000 ms (${hoje?.tempo_ms ?? 0})`,
  );

  /* ---------------------------------------------------------------- *
   * 6. A RLS
   * ---------------------------------------------------------------- */
  console.log("\nO que cada um enxerga:");

  const comoAna = await entrar(ana.usuario);
  const { data: daAna } = await comoAna.from("tentativa_meiojogo").select("id, item");
  afirmar((daAna ?? []).length === 3, `a Ana lê as três linhas dela (${(daAna ?? []).length})`);

  const comoBruno = await entrar(bruno.usuario);
  const { data: doBruno } = await comoBruno.from("tentativa_meiojogo").select("id");
  afirmar(
    (doBruno ?? []).length === 0,
    `o Bruno não enxerga as linhas da Ana (viu ${(doBruno ?? []).length})`,
  );

  const { error: erroDeEscrita } = await comoBruno.from("tentativa_meiojogo").insert({
    aluno: bruno.id,
    dica: DICA,
    item: item.id,
    conceito: item.tarefa,
    habilidade: "reconhecimento",
    nivel_evidencia: "fato",
    versao: "forjada0",
    resposta: certa,
    acertou: true,
    tentativa: 1,
    apoio: 0,
    inedita: true,
    tempo_ms: 1,
  });
  afirmar(erroDeEscrita !== null, "o aluno logado não consegue gravar tentativa por conta própria");
} catch (erro) {
  falhas.push(erro instanceof Error ? erro.message : String(erro));
  console.error(`\n${erro instanceof Error ? erro.message : erro}`);
} finally {
  for (const conta of contas) {
    await admin.auth.admin.deleteUser(conta.id);
  }
  if (contas.length) console.log(`\n${contas.length} conta(s) de teste apagada(s).`);
}

if (falhas.length) {
  console.error(`\n${falhas.length} afirmação(ões) falharam:`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("\nO treino de meio-jogo grava certo.");
}
