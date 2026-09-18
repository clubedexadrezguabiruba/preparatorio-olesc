import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Chess } from "chess.js";
import { executarComando } from "../../editor-v2/comandos.ts";
import type { AulaV2 } from "../../editor-v2/modelo.ts";
import { idDaLinha } from "../linhas.ts";
import { criarLeitorDoBanco } from "../leitor-do-banco.ts";
import { cascaDoArquivo } from "./adaptar.ts";
import { aplicarRepertorio, compiladoCoerente } from "./aplicar.ts";
import { escreverArquivo } from "./escrever.ts";
import { impactoDoRepertorio } from "./impacto.ts";
import {
  classificarLance,
  comentarioComPlano,
  conferirCasca,
  efeitoDoSimbolo,
  fenDepois,
  pgnDaAberturaNova,
  planoDoComentario,
  planoLido,
  slugDaAbertura,
} from "./sessao.ts";

/**
 * A sessão do editor do repertório na Escocesa real — parada 8D.
 *
 * Os gestos passam pelos **comandos do Editor v2** (`executarComando`), como na tela: é a
 * prova de que o painel e os comandos servem ao repertório por adaptador, sem um segundo
 * modelo de edição.
 */

const ESCOCESA = readFileSync("content/repertorio/brancas-escocesa.pgn", "utf8");
const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;
const uciDe = (m: { from: string; to: string; promotion?: string }) => `${m.from}${m.to}${m.promotion ?? ""}`;

function abrir() {
  const casca = cascaDoArquivo("brancas-escocesa", ESCOCESA);
  return { casca, aula: casca.aula };
}

const executar = (aula: AulaV2, comando: Parameters<typeof executarComando>[1]) => executarComando(aula, comando, {});

test("os 11 arquivos reais conferem sem erro na tela, como no compilador", () => {
  for (const nome of readdirSync("content/repertorio").filter((n) => n.endsWith(".pgn"))) {
    const casca = cascaDoArquivo(nome.slice(0, -4), readFileSync(path.join("content/repertorio", nome), "utf8"));
    const { itens, linhas } = conferirCasca(casca.aula, casca.formas);
    assert.deepEqual(itens.filter((i) => i.severidade === "erro"), [], nome);
    assert.ok(linhas.length > 0, nome);
  }
});

test("lance novo no lance do adversário: 'linha nova', e a linha nasce com o id previsto", () => {
  const { casca, aula } = abrir();
  const analise = aula.analises[0];
  const e4 = analise.nos[analise.raizId].filhos[0];
  const fenDoE4 = fenDepois(analise.inicio.tipo === "fen" ? analise.inicio.fen : "", [analise.nos[e4].uci!]);

  const jogo = new Chess(fenDoE4);
  const existentes = new Set(analise.nos[e4].filhos.map((f) => analise.nos[f].uci));
  const dele = jogo.moves({ verbose: true }).find((m) => !existentes.has(uciDe(m)))!;
  assert.equal(classificarLance(analise, "brancas", e4, fenDoE4, uciDe(dele)).tipo, "linha-nova");
  assert.equal(classificarLance(analise, "brancas", e4, fenDoE4, analise.nos[analise.nos[e4].filhos[0]].uci!).tipo, "existente");

  const antes = conferirCasca(aula, casca.formas).linhas;
  let depois = executar(aula, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: e4, uci: uciDe(dele), novoNodeId: "n-dele" });
  // Até a nossa resposta, a conferência acusa a ponta no adversário — no lance novo.
  const pendente = conferirCasca(depois, casca.formas);
  assert.ok(pendente.itens.some((i) => i.severidade === "erro" && /lance do adversário/.test(i.mensagem) && i.nodeId === "n-dele"));

  jogo.move(dele);
  const nosso = jogo.moves({ verbose: true })[0];
  depois = executar(depois, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: "n-dele", uci: uciDe(nosso), novoNodeId: "n-nosso" });
  assert.equal(classificarLance(depois.analises[0], "brancas", "n-dele", jogo.fen(), uciDe(nosso)).tipo, "existente");
  const conferido = conferirCasca(depois, casca.formas);
  assert.equal(conferido.linhas.length, antes.length + 1);
  const previsto = idDaLinha("brancas", "escocesa", [analise.nos[e4].uci!, uciDe(dele), uciDe(nosso)]);
  assert.ok(conferido.linhas.some((l) => l.id === previsto));
  // O lance nosso novo, sem comentário, não é erro: comentário é opcional (Doug, 17/9/2026).
  assert.ok(!conferido.itens.some((i) => i.severidade === "erro" && i.nodeId === "n-nosso"), JSON.stringify(conferido.itens));
});

test("lance nosso ao lado do lance da linha: alternativa ou erro, e o símbolo diz o efeito", () => {
  const { aula } = abrir();
  const analise = aula.analises[0];
  const fen = analise.inicio.tipo === "fen" ? analise.inicio.fen : "";
  const outro = new Chess(fen).moves({ verbose: true }).find((m) => uciDe(m) !== analise.nos[analise.nos[analise.raizId].filhos[0]].uci)!;
  assert.equal(classificarLance(analise, "brancas", analise.raizId, fen, uciDe(outro)).tipo, "alternativa-ou-erro");
  assert.match(efeitoDoSimbolo(5, true, false), /alternativa aceita/);
  assert.match(efeitoDoSimbolo(2, true, false), /erro nomeado/);
  assert.match(efeitoDoSimbolo(1, true, true), /só anota/);
});

test("excluir um ramo: os ids que morrem são os que o impacto mostra", () => {
  // Precisa de um ramo do ADVERSÁRIO dentro do jogo: um arquivo escrito à mão. Foi a Escocesa até
  // 18/9/2026, quando ela passou a ser gerada do estudo (um jogo por linha, sem ramo dele).
  const casca = cascaDoArquivo("brancas-escandinava", readFileSync("content/repertorio/brancas-escandinava.pgn", "utf8"));
  const aula = casca.aula;
  const analise = aula.analises[0];
  // O primeiro nó com mais de um filho é um ramo do adversário: excluir a variante.
  const pai = Object.values(analise.nos).find((n) => n.filhos.length > 1)!;
  const ramo = pai.filhos[1];
  const antes = conferirCasca(aula, casca.formas).linhas;
  const depois = executar(aula, { tipo: "EXCLUIR_RAMO", analiseId: analise.id, parentId: pai.id, nodeId: ramo });
  const linhasDepois = conferirCasca(depois, casca.formas).linhas;
  const impacto = impactoDoRepertorio(antes, linhasDepois);
  const sumiram = antes.filter((l) => !linhasDepois.some((d) => d.id === l.id)).map((l) => l.id);
  assert.ok(sumiram.length >= 1);
  assert.deepEqual(impacto.morrem.map((l) => l.id), sumiram);
  assert.deepEqual(impacto.nascem, []);
});

test("editar um comentário não muda id nenhum, e o texto aparece na linha", () => {
  const { casca, aula } = abrir();
  const analise = aula.analises[1];
  const no = Object.values(analise.nos).find((n) => n.comentario)!;
  const antes = conferirCasca(aula, casca.formas).linhas.map((l) => l.id);
  const depois = executar(aula, { tipo: "EDITAR_COMENTARIO", analiseId: analise.id, nodeId: no.id, comentario: `${no.comentario} Mais uma.` });
  const conferido = conferirCasca(depois, casca.formas);
  assert.deepEqual(conferido.linhas.map((l) => l.id), antes);
  assert.ok(JSON.stringify(conferido.linhas).includes("Mais uma."));
});

test("Mais opções: editar Nome, Nível e Fonte preserva a ordem das tags e reescreve só aquele jogo", () => {
  const { aula } = abrir();
  const analise = aula.analises[2];
  const ordem = Object.keys(analise.origemPgn!.tags);
  let depois = executar(aula, { tipo: "EDITAR_TAG_PGN", analiseId: analise.id, chave: "Fonte", valor: "Fonte revista pelo professor" });
  depois = executar(depois, { tipo: "EDITAR_TAG_PGN", analiseId: analise.id, chave: "Nome", valor: "" });
  assert.deepEqual(Object.keys(depois.analises[2].origemPgn!.tags), ordem);
  assert.equal(depois.analises[2].origemPgn!.tags.Nome, analise.origemPgn!.tags.Nome, "vazio não apaga");
  const escrito = escreverArquivo(ESCOCESA, depois, new Set([analise.id]));
  assert.deepEqual(escrito.problemas, []);
  assert.ok(escrito.texto.includes('[Fonte "Fonte revista pelo professor"]'));
  assert.equal(escrito.texto.split("[Fonte ").length, ESCOCESA.split("[Fonte ").length);
});

test("o [%plano] em campos vai e volta pelo leitor do compilador", () => {
  const prosa = "O bispo fica em casa por enquanto.\nE a torre também.";
  const comentario = comentarioComPlano(prosa, [
    { chave: "rei", roque: "O-O", motivo: "o roque sai no lance seguinte, com o bispo de f1 fora do caminho" },
    { chave: "c1", destino: "e3", motivo: "só sai depois do h3, quando a casa g4 já não serve de nada para ele" },
  ]);
  assert.deepEqual(planoLido(comentario, "brancas"), {
    rei: { casa: "g1", motivo: "o roque sai no lance seguinte, com o bispo de f1 fora do caminho" },
    c1: { casa: "e3", motivo: "só sai depois do h3, quando a casa g4 já não serve de nada para ele" },
  });
  const lido = planoDoComentario(comentario, "brancas");
  assert.equal(lido.prosa, prosa);
  assert.deepEqual(comentarioComPlano(lido.prosa, lido.entradas), comentario);
  assert.equal(planoDoComentario("sem plano\ncom quebra", "pretas").prosa, "sem plano\ncom quebra");

  // Os blocos reais do corpus também vão e voltam.
  const caro = cascaDoArquivo("brancas-caro-kann", readFileSync("content/repertorio/brancas-caro-kann.pgn", "utf8"));
  const comBloco = caro.aula.analises.flatMap((a) => Object.values(a.nos)).filter((n) => n.comentario?.includes("[%plano"));
  assert.ok(comBloco.length > 0);
  for (const no of comBloco) {
    const campos = planoDoComentario(no.comentario, "brancas");
    assert.deepEqual(campos.erros, []);
    assert.deepEqual(planoLido(comentarioComPlano(campos.prosa, campos.entradas), "brancas"), planoLido(no.comentario!, "brancas"));
  }
});

test("abertura nova: o formulário gera só as tags, e recusa o que o PGN não guarda", () => {
  assert.equal(slugDaAbertura("Gambito Évans!"), "gambito-evans");
  const nova = pgnDaAberturaNova({ cor: "brancas", nome: "Gambito Évans", nivel: "avancado", fonte: "Curso X, cap. 2" }, ["brancas-escocesa"]);
  assert.equal(nova.ok, true);
  assert.ok(nova.ok && nova.arquivo === "brancas-gambito-evans");
  assert.ok(nova.ok && nova.texto.startsWith('[Abertura "gambito-evans"]\n[Nome "Gambito Évans"]'));
  const casca = cascaDoArquivo("brancas-gambito-evans", nova.ok ? nova.texto : "");
  assert.equal(casca.aula.analises.length, 1, "o cabeçalho sem lances já é um jogo que a tela edita");
  const vazia = conferirCasca(casca.aula, casca.formas);
  assert.equal(vazia.linhas.length, 0);
  // Achado no roteiro da 8F: sem este erro a tela dizia "este jogo passa nas regras" e
  // habilitava Aplicar numa abertura sem lance nenhum.
  assert.equal(vazia.itens.filter((i) => i.severidade === "erro").length, 1);
  assert.match(vazia.itens[0].mensagem, /ainda não tem nenhuma linha/);

  const recusada = pgnDaAberturaNova({ cor: "brancas", nome: 'A "melhor"', nivel: "base", fonte: "" }, ["brancas-a-melhor"]);
  assert.equal(recusada.ok, false);
  assert.ok(!recusada.ok && recusada.problemas.length === 3, !recusada.ok ? recusada.problemas.join("\n") : "");
});

test("abertura nova por dados: aplicada numa pasta temporária, o índice passa a 12 e a abertura é encontrada", async () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "abertura-nova-"));
  try {
    cpSync("content/repertorio", path.join(raiz, "content", "repertorio"), { recursive: true, filter: (origem) => !origem.includes("rascunhos") && !origem.includes("cache") });
    cpSync("public/repertorio", path.join(raiz, "public", "repertorio"), { recursive: true });

    // A semente: o último jogo da Siciliana sai daquele arquivo e vira uma abertura própria.
    // Cópia não serve — a mesma sequência de lances em dois arquivos reprova o banco.
    const caminhoDaSiciliana = path.join(raiz, "content", "repertorio", "pretas-siciliana.pgn");
    const siciliana = readFileSync(caminhoDaSiciliana, "utf8");
    const casca = cascaDoArquivo("pretas-siciliana", siciliana);
    const ultimo = casca.intervalos.jogos.at(-1)!;
    const jogoDaSemente = siciliana.slice(ultimo.inicio, ultimo.fim).replace('[Abertura "siciliana"]', '[Abertura "siciliana-teste"]');
    const semOJogo = `${siciliana.slice(0, casca.intervalos.jogos.at(-2)!.fim)}\n`;
    writeFileSync(caminhoDaSiciliana, siciliana);
    assert.equal(aplicarRepertorio("pretas-siciliana", semOJogo, { raiz, env: ligada }).ok, true);

    const nova = pgnDaAberturaNova({ cor: "pretas", nome: "Siciliana Teste", slug: "siciliana-teste", nivel: "base", fonte: "semente do teste" }, []);
    assert.ok(nova.ok);
    const texto = `${nova.ok ? nova.texto.split("\n\n")[0] : ""}\n\n${jogoDaSemente.split("\n\n").slice(1).join("\n\n")}\n`;
    const resultado = aplicarRepertorio("pretas-siciliana-teste", texto, { raiz, env: ligada });
    assert.deepEqual(resultado, { ok: true, semMudanca: false });
    assert.deepEqual(compiladoCoerente(raiz), []);

    const leitor = criarLeitorDoBanco(path.join(raiz, "public", "repertorio"));
    const indice = await leitor.lerIndice();
    assert.equal(indice.length, 12);
    const entrada = await leitor.aberturaNoIndice("pretas", "siciliana-teste");
    assert.ok(entrada);
    assert.equal(entrada.arquivo, "/repertorio/pretas/siciliana-teste.json");
    assert.ok((await leitor.linhasDaAbertura("pretas", "siciliana-teste")).length >= 1);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
