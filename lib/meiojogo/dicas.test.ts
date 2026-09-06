import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { NIVEIS } from "../curso/trilha.ts";
import { sourceRegistrySchema } from "../lesson/schema.ts";
import { problemasDaPosicao } from "./afirmacoes.ts";
import { validarDicas } from "./dicas.ts";

/**
 * O conteúdo do meio-jogo, conferido a cada `npm test`.
 *
 * É o gêmeo de `lib/tatica/temas.test.ts`, com uma diferença que é a razão de
 * a F2 existir: aqui não basta o esquema. Uma dica pode estar perfeitamente
 * bem formada e trazer uma FEN impossível, ou uma legenda que afirma um peão
 * isolado que tem vizinho. É `lib/meiojogo/afirmacoes.ts` que julga isso, e é
 * daqui que ele é chamado.
 *
 * O gate (`scripts/validate-content.ts`) chama a **mesma** função, pelo motivo
 * de sempre: dois juízes com regras próprias divergem, e a divergência aparece
 * no pior momento.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

const DICAS = validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content/meio-jogo.json"), "utf8")),
);

const OBRAS = new Set(
  sourceRegistrySchema
    .parse(JSON.parse(readFileSync(path.join(RAIZ, "content/sources.json"), "utf8")))
    .sources.flatMap((s) => (s.file === null ? [s.slug] : [s.slug, s.file])),
);

test("o conteúdo do meio-jogo passa no esquema", () => {
  assert.ok(DICAS.length >= 30, `são ${DICAS.length} dicas, e o combinado foram 30`);
});

test("toda posição é legal, e toda afirmação da legenda é verdade", () => {
  // Este é o teste que o Doug pediu por escrito: "sem isso, 'posição
  // verificada' é palavra". Uma FEN impossível ou uma legenda que afirma o que
  // o tabuleiro não mostra reprova aqui, e não na aula de sábado.
  const problemas: string[] = [];
  for (const dica of DICAS) {
    for (const [i, posicao] of dica.posicoes.entries()) {
      for (const problema of problemasDaPosicao(posicao)) {
        problemas.push(`${dica.id} posição ${i + 1}: ${problema}`);
      }
    }
  }
  assert.deepEqual(problemas, []);
});

test("toda posição afirma alguma coisa conferível", () => {
  // O `.min(1)` do esquema já cobra isto, e o teste existe para o caso de
  // alguém relaxar o esquema: uma posição sem afirmação é uma legenda que
  // ninguém mediu, e é justamente o silêncio que a F2 veio fechar.
  for (const dica of DICAS) {
    for (const posicao of dica.posicoes) {
      assert.ok(posicao.afirma.length >= 1, `${dica.id}: posição sem afirmação`);
    }
  }
});

test("toda dica tem quiz, com a resposta certa dentro das opções", () => {
  for (const dica of DICAS) {
    assert.ok(dica.quiz, `${dica.id} está sem quiz`);
    assert.ok(
      dica.quiz.certa >= 0 && dica.quiz.certa < dica.quiz.opcoes.length,
      `${dica.id}: o índice da resposta certa está fora das opções`,
    );
    // Três opções iguais seriam um quiz que não pergunta nada.
    assert.equal(new Set(dica.quiz.opcoes).size, dica.quiz.opcoes.length, `${dica.id}: opção repetida`);
  }
});

test("a proveniência de toda posição aponta obra registrada", () => {
  // É a mesma regra da §12.2 que o gate cobra nas posições de finais, e ela
  // vale aqui pelo mesmo motivo: sem âncora no registro, "de onde veio esta
  // posição" vira texto livre que ninguém confere.
  for (const dica of DICAS) {
    for (const posicao of dica.posicoes) {
      const chave = posicao.provenance.editionFile;
      assert.ok(OBRAS.has(chave), `${dica.id}: obra "${chave}" não está em content/sources.json`);
    }
  }
});

test("as dicas cobrem os quatro níveis, e chegam ao mais alto", () => {
  // O pedido do Doug era explícito: ir até a faixa dos alunos mais avançados.
  // Um nível vazio aqui é uma tela com um cabeçalho e nada embaixo.
  for (const nivel of NIVEIS) {
    const daqui = DICAS.filter((d) => d.nivel === nivel.id);
    assert.ok(daqui.length >= 4, `o nível ${nivel.id} tem só ${daqui.length} dica(s)`);
  }
});

test("os ids são únicos e sobem junto com o nível", () => {
  // `lib/meiojogo/conteudo.ts` ordena por nível e, dentro dele, pelo número do
  // id. Se um id baixo cair num nível alto, a numeração que o aluno lê na tela
  // deixa de bater com a ordem de leitura.
  const numero = (id: string) => Number(id.slice(1));
  const ordemDoNivel = (nivel: string) => NIVEIS.findIndex((n) => n.id === nivel);
  const vistos = new Set<string>();
  let maiorAte = -1;
  for (const dica of [...DICAS].sort((a, b) => numero(a.id) - numero(b.id))) {
    assert.ok(!vistos.has(dica.id), `id repetido: ${dica.id}`);
    vistos.add(dica.id);
    const nivel = ordemDoNivel(dica.nivel);
    assert.ok(nivel >= maiorAte, `${dica.id} está num nível abaixo da dica anterior`);
    maiorAte = nivel;
  }
});

test("nenhuma FEN se repete entre dicas diferentes", () => {
  // Duas dicas com o mesmo diagrama existiram na primeira versão do arquivo, e
  // a segunda parecia um erro de cópia para quem folheia. Se um dia houver
  // motivo para reaproveitar, este teste é o lugar de registrar o porquê.
  const vistas = new Map<string, string>();
  for (const dica of DICAS) {
    for (const posicao of dica.posicoes) {
      const dono = vistas.get(posicao.fen);
      assert.equal(dono, undefined, `${dica.id} repete a FEN de ${dono}`);
      vistas.set(posicao.fen, dica.id);
    }
  }
});

test("as trinta dicas têm link de vídeo, e nenhum link se repete", () => {
  // A F2 fechou com os 30 links abertos e conferidos um a um (o oEmbed do
  // YouTube devolveu 200 para os 30, com o título e o canal que estão no
  // arquivo). O que este teste tranca é a regressão silenciosa: um link
  // apagado por engano volta a mostrar "ainda não há link conferido" na tela,
  // e ninguém repara numa dica entre trinta.
  //
  // Ele **não** afirma que o vídeo continua no ar — isso é a rede, e teste que
  // depende de rede é teste que quebra sem culpa de ninguém. Para reconferir,
  // `node .scratch/conferir-videos.mjs`.
  const vistos = new Map<string, string>();
  for (const dica of DICAS) {
    assert.ok(dica.video, `${dica.id} está sem a seção de vídeo`);
    assert.ok(dica.video?.url, `${dica.id} está sem link de vídeo`);
    const dono = vistos.get(dica.video!.url!);
    assert.equal(dono, undefined, `${dica.id} repete o vídeo de ${dono}`);
    vistos.set(dica.video!.url!, dica.id);
  }
  assert.equal(vistos.size, DICAS.length);
});

test("o título do vídeo é o do YouTube, e não a sugestão de busca", () => {
  // Antes dos links, `video.titulo` guardava uma sugestão de busca — "Buscar:
  // …" —, e a tela a mostrava em letra miúda. Com o link no lugar, o título é
  // o texto **clicável**: se a sugestão sobrar ali, o aluno lê "Buscar: …" e
  // clica num vídeo cujo nome ninguém disse.
  for (const dica of DICAS) {
    const titulo = dica.video?.titulo ?? "";
    assert.ok(!titulo.startsWith("Buscar:"), `${dica.id} ainda tem a sugestão de busca no título`);
    assert.ok(titulo.includes(" — "), `${dica.id}: o título não traz o canal depois do travessão`);
    assert.equal(titulo, titulo.trim(), `${dica.id}: sobra espaço nas pontas do título`);
    assert.ok(!/\s\s/.test(titulo), `${dica.id}: espaço duplo no título`);
  }
});
