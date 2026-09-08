import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  aulaDoTema,
  cartaoDaFase,
  dicaDoTema,
  falaDaFase,
  REPOUSO_DA_TATICA,
  type Situacao,
} from "./fala.ts";
import { validarTemas } from "./temas.ts";

/** A situação de repouso; cada teste troca só o que está provando. */
function situacao(mudancas: Partial<Situacao> = {}): Situacao {
  return {
    fase: "jogando",
    erros: 0,
    meuLado: "white",
    rating: 1200,
    nomeDoPadrao: null,
    ...mudancas,
  };
}

/* ------------------------------------------------------------------ *
 * O cartão de comando
 * ------------------------------------------------------------------ */

test("os três degraus do erro acompanham as dicas que o tabuleiro acende", () => {
  const um = cartaoDaFase(situacao({ fase: "errado", erros: 1 }));
  const dois = cartaoDaFase(situacao({ fase: "errado", erros: 2 }));
  const tres = cartaoDaFase(situacao({ fase: "errado", erros: 3 }));

  // O primeiro erro é o que grava: ele tem de dizer isso.
  assert.match(um.estado ?? "", /já contou como erro/);
  // Dois erros acendem a casa; três desenham a seta. O texto descreve o que
  // está desenhado — se divergir, o aluno procura uma seta que não existe.
  assert.match(dois.estado ?? "", /casa acesa/);
  assert.match(tres.estado ?? "", /seta/);

  for (const cartao of [um, dois, tres]) {
    assert.equal(cartao.tom, "ruim");
    assert.equal(cartao.comando, "Não é esse lance");
  }
});

test("do quarto erro em diante o recado continua sendo o da seta", () => {
  // A seta é a última ajuda que existe; não há degrau acima dela.
  assert.deepEqual(
    cartaoDaFase(situacao({ fase: "errado", erros: 9 })),
    cartaoDaFase(situacao({ fase: "errado", erros: 3 })),
  );
});

test("o padrão só é revelado quando há um nome a revelar", () => {
  const semNome = cartaoDaFase(situacao({ fase: "resolvido" }));
  const comNome = cartaoDaFase(situacao({ fase: "resolvido", nomeDoPadrao: "Garfo" }));

  assert.equal(semNome.estado, undefined);
  assert.equal(comNome.estado, "Era: Garfo.");
  // O tom não depende da revelação: resolver é bom nos dois casos.
  assert.equal(semNome.tom, "bom");
  assert.equal(comNome.tom, "bom");
});

test("acertar o lance já vale o visto verde, antes de a linha acabar", () => {
  // O disco na casa de destino some em menos de um segundo; o tom do cartão é
  // o único sinal de acerto que fica.
  assert.equal(cartaoDaFase(situacao({ fase: "respondendo" })).tom, "bom");
});

test("enquanto ele pensa, o cartão diz de que lado ele joga e quanto vale", () => {
  const brancas = cartaoDaFase(situacao({ meuLado: "white", rating: 1450 }));
  const pretas = cartaoDaFase(situacao({ meuLado: "black", rating: 900 }));

  assert.equal(brancas.estado, "Você joga de brancas · 1450");
  assert.equal(pretas.estado, "Você joga de pretas · 900");
  assert.equal(brancas.tom, "calma");
});

test("a abertura pede o olho na posição antes do erro do adversário", () => {
  const cartao = cartaoDaFase(situacao({ fase: "abrindo" }));
  assert.equal(cartao.tom, "calma");
  assert.match(cartao.estado ?? "", /adversário/);
});

test("toda fase tem cartão, e nenhum sai sem comando", () => {
  for (const fase of ["abrindo", "jogando", "respondendo", "errado", "resolvido"] as const) {
    const cartao = cartaoDaFase(situacao({ fase }));
    assert.ok(cartao.comando.length > 0, `a fase "${fase}" saiu sem comando`);
  }
});

/* ------------------------------------------------------------------ *
 * O repouso, e os dois degraus da dica
 * ------------------------------------------------------------------ */

test("o repouso é uma linha, e é a ordem de busca", () => {
  /*
   * Este texto fica na tela em todo puzzle de toda rodada de todo tema. O teto
   * é o piso do balão no celular — 88 px, quatro linhas a ~44 caracteres —, e
   * ultrapassá-lo faria a frase de repouso PAGINAR: o aluno teria de clicar
   * para ler o que está lá o tempo inteiro.
   */
  assert.ok(REPOUSO_DA_TATICA.length < 180, `o repouso tem ${REPOUSO_DA_TATICA.length} caracteres`);
  assert.match(REPOUSO_DA_TATICA, /xeques.*capturas.*ameaças/);
  assert.ok(!REPOUSO_DA_TATICA.includes("**"));
});

test("o primeiro degrau da dica é o `procure` do tema, sem marcador de lista", () => {
  const dica = dicaDoTema(["Olhe o rei.", "Conte as fugas."]);
  // Uma string só: o balão pagina prosa, e um marcador de lista viraria ou uma
  // página com um item solto, ou um traço no meio da fala.
  assert.equal(dica, "Olhe o rei. Conte as fugas.");
});

test("o segundo degrau é a explicação, e ela nunca aparece sozinha", () => {
  assert.equal(aulaDoTema(["Primeiro.", "Segundo."]), "Primeiro. Segundo.");
  // Sem explicação escrita não há segundo degrau, e o botão de "mais uma"
  // some — em vez de abrir um balão vazio.
  assert.equal(aulaDoTema([]), null);
});

test("sem tema não há dica — é o caso da revisão do dia", () => {
  // A revisão mistura temas: não existe UM "o que procurar" a dar. O repouso,
  // que é a ordem de busca, continua valendo lá.
  assert.equal(dicaDoTema([]), null);
  assert.equal(aulaDoTema([]), null);
});

test("o negrito do conteúdo não chega ao balão como asterisco", () => {
  // O balão pagina texto puro e digita caractere a caractere: um `**` sairia
  // desenhado na tela.
  assert.equal(dicaDoTema(["Comece pelos **xeques**."]), "Comece pelos xeques.");
  assert.equal(aulaDoTema(["O primeiro lance **obriga**."]), "O primeiro lance obriga.");
});

test("o conteúdo real de todos os temas atravessa os dois degraus", () => {
  const bruto = fs.readFileSync(path.join(process.cwd(), "content", "temas.json"), "utf8");
  const temas = validarTemas(JSON.parse(bruto));

  for (const tema of temas) {
    const dica = dicaDoTema(tema.procure);
    const aula = aulaDoTema(tema.explicacao);
    assert.ok(dica !== null, `${tema.tag}: sem primeiro degrau`);
    assert.ok(aula !== null, `${tema.tag}: sem segundo degrau`);
    assert.ok(!dica.includes("**"), `${tema.tag}: sobrou marcação na dica`);
    assert.ok(!aula.includes("**"), `${tema.tag}: sobrou marcação na aula`);
    /*
     * A dica é o degrau que o aluno pede no meio de um puzzle, e ele tem de
     * poder lê-la de uma vez no celular: 88 px de balão a ~44 caracteres por
     * linha dão quatro linhas, e a paginação corta em ponto final. Acima de
     * ~350 caracteres ela vira três páginas, e três páginas de dica são mais
     * trabalho do que o puzzle.
     */
    assert.ok(dica.length < 350, `${tema.tag}: a dica tem ${dica.length} caracteres`);
  }
});

/* ------------------------------------------------------------------ *
 * As reações
 * ------------------------------------------------------------------ */

test("o professor não repete o cartão", () => {
  for (const fase of ["abrindo", "jogando", "respondendo", "errado", "resolvido"] as const) {
    for (const erros of [0, 1, 2, 3]) {
      const s = situacao({ fase, erros, nomeDoPadrao: "Garfo" });
      const fala = falaDaFase(s);
      if (fala === null) continue;
      const cartao = cartaoDaFase(s);
      assert.notEqual(fala, cartao.comando);
      assert.notEqual(fala, cartao.estado);
    }
  }
});

test("o professor cala nas fases em que não há tempo de ler", () => {
  // 480 ms de resposta do adversário não dão para ler um parágrafo; ali fica o
  // repouso, que já estava na tela.
  assert.equal(falaDaFase(situacao({ fase: "jogando" })), null);
  assert.equal(falaDaFase(situacao({ fase: "respondendo" })), null);
  assert.equal(falaDaFase(situacao({ fase: "abrindo" })), null);
});

test("o professor fala nos três degraus do erro, e diferente em cada um", () => {
  const falas = [1, 2, 3].map((erros) => falaDaFase(situacao({ fase: "errado", erros })));

  for (const fala of falas) assert.ok(fala !== null && fala.length > 0);
  assert.equal(new Set(falas).size, 3, "dois degraus disseram a mesma coisa");
});

test("toda reação cabe no balão do celular sem paginar", () => {
  /*
   * O recado de erro fica 850 ms na tela (`VOLTA_MS`), e o de acerto some com o
   * puzzle. Paginar um texto que dura menos de um segundo é servi-lo pela
   * metade — quatro linhas a ~44 caracteres dão ~176, e a folga é para a
   * quebra de palavra.
   */
  for (const fase of ["errado", "resolvido"] as const) {
    for (const erros of [1, 2, 3]) {
      for (const nomeDoPadrao of [null, "Ataque duplo"]) {
        const fala = falaDaFase(situacao({ fase, erros, nomeDoPadrao }));
        if (fala === null) continue;
        assert.ok(fala.length <= 160, `${fase}/${erros}: ${fala.length} caracteres — "${fala}"`);
      }
    }
  }
});

test("ao resolver, o professor manda guardar o desenho e não o nome", () => {
  const comNome = falaDaFase(situacao({ fase: "resolvido", nomeDoPadrao: "Garfo" }));
  const semNome = falaDaFase(situacao({ fase: "resolvido" }));

  assert.match(comNome ?? "", /Garfo/);
  assert.ok(semNome !== null);
  assert.ok(!semNome.includes("Era "));
});
