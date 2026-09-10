import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Chess } from "chess.js";
import { hashDoAlvo } from "../lib/lesson/excecoes.ts";
import { MARCA_DE_MOLDE, type Lesson } from "../lib/lesson/schema.ts";
import { goalMovesOf, Tablebase } from "./tablebase.ts";

/**
 * O gate testado contra si mesmo (plano da F1, §3.4).
 *
 * Cada mutação é um estrago plantado numa **cópia** do conteúdo — o
 * `content/` do repositório não é tocado. Cada uma precisa ficar vermelha,
 * e vermelha *pelo motivo certo*: o teste exige o código de erro esperado,
 * não só um exit diferente de zero.
 *
 *   npm run validate:mutations
 */

const VERDE = "\u001b[32m";
const VERMELHO = "\u001b[31m";
const CINZA = "\u001b[90m";
const NORMAL = "\u001b[0m";

const repo = process.cwd();
const source = path.join(repo, "content");
const validator = path.join(repo, "scripts", "validate-content.ts");

type Mutation = {
  titulo: string;
  /** O código de erro que esta mutação *precisa* provocar. */
  codigo: string;
  /** Pedaço de texto que a mensagem precisa conter, quando o código é genérico. */
  contem?: string;
  /**
   * Flags a mais para o validador. As mutações do modo autor (B8) precisam de
   * `--rascunhos`: sem a flag o gate nem olha para `content/rascunhos/`, e a
   * mutação ficaria verde por não ter sido lida — o pior tipo de verde.
   */
  flags?: string[];
  /**
   * Instalar `content/fixtures/` nesta cópia antes de aplicar a mutação (B2).
   * Sem isto a aula sintética nem existe no `lessons/`, e a mutação ficaria
   * vermelha por arquivo faltando — vermelho que não prova regra nenhuma.
   */
  fixtures?: boolean;
  aplicar: (dir: string) => Promise<string>;
};

function lerAula(dir: string, id = "N1-KPK") {
  const file = path.join(dir, "lessons", `${id}.json`);
  return { file, json: JSON.parse(readFileSync(file, "utf8")) };
}
/**
 * A pasta sai do **id**, e não é fixada: `pos-n1-...` mora em `N1`. Estava
 * cravada em `N0` desde que a única aula era de classe E, e essa constante
 * escondida derrubou o run inteiro com ENOENT no dia em que o piloto virou uma
 * aula de classe D — que é o mesmo defeito que o `posicaoDeEnsino` conserta do
 * outro lado.
 */
function pastaDaPosicao(id: string): string {
  return id.slice(4, 6).toUpperCase();
}

function lerPosicao(dir: string, id: string) {
  const file = path.join(dir, "positions", pastaDaPosicao(id), `${id}.json`);
  return { file, json: JSON.parse(readFileSync(file, "utf8")) };
}
function gravar(file: string, json: unknown) {
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

/**
 * Grava uma aula em `content/rascunhos/lessons/` (B8). A pasta espelha o
 * destino, e é dessa simetria que sai a promoção por cópia de bytes.
 */
function gravarRascunhoDeAula(dir: string, id: string, json: unknown) {
  const pasta = path.join(dir, "rascunhos", "lessons");
  mkdirSync(pasta, { recursive: true });
  gravar(path.join(pasta, `${id}.json`), json);
}

/**
 * Promove uma fixture a `candidate` com os 9 campos de proveniência
 * preenchidos, apontando a obra pedida. Sem isso a mutação bateria antes na
 * PROVENIENCIA_INCOMPLETA e o check sob teste nunca rodaria.
 */
function promover(dir: string, id: string, editionFile: string) {
  const { file, json } = lerPosicao(dir, id);
  json.status = "candidate";
  json.provenance = {
    externalHumanSource: "diagrama de livro impresso",
    bibliographicSource: `${editionFile}, p. 42, diagrama 7`,
    originalGame: "não se aplica — posição teórica",
    authorComposer: "não se aplica",
    license: "citação de posição isolada",
    editionFile,
    fenMethod: "transcrição verificada do diagrama",
    qaApplied: "mutação de teste",
    pendingRisk: "nenhum",
  };
  gravar(file, json);
}

/**
 * Os ids de posição que uma aula referencia, na ordem das etapas. Colhidos do
 * arquivo, e nunca escritos à mão: id fixo numa mutação vira ENOENT no dia em
 * que a aula troca de posição, e ENOENT derruba o run inteiro.
 */
type EtapasComPosicao = {
  objective?: { positionId: string };
  guided?: { positionId: string };
  practice?: { positionId: string };
};

function idsDePosicaoDaAula(json: { stages: EtapasComPosicao }): string[] {
  const s = json.stages;
  const ids = [s.objective?.positionId, s.guided?.positionId, s.practice?.positionId].filter(
    (id): id is string => typeof id === "string",
  );
  return [...new Set(ids)];
}

/**
 * A posição de ensino da aula — a que a maior parte das mutações estraga.
 *
 * **Ela é COLHIDA da aula, e não escrita aqui.** O campo já mentiu duas vezes:
 * apontava para a `rogers-xvi`, que era etapa 6 e deixou o corpus, e depois
 * para a `silman-d22`, que a demolição de 2026-09-08 apagou. Nas duas vezes o
 * sintoma foi o mesmo — ENOENT no meio de uma mutação, que mata o run inteiro
 * em vez de reprovar uma linha.
 *
 * No formato de três etapas ela é trivial de colher: as três jogam a MESMA
 * posição, e o `lessonSchema` recusa o arquivo em que não jogarem. Estragá-la
 * reprova por muitos caminhos diferentes, que é o que estas mutações querem.
 */
function posicaoDeEnsino(dir: string): string {
  const { json } = lerAula(dir);
  const ids = idsDePosicaoDaAula(json);
  if (ids.length === 0) throw new Error("a aula não referencia posição nenhuma");
  return ids[0];
}

/* ------------------------------------------------------------------ *
 * FN1/B2 — as fixtures
 * ------------------------------------------------------------------ */

/**
 * Instala `content/fixtures/` na cópia de trabalho, como se fosse conteúdo.
 *
 * As regras que a FN1/B2 acrescentou — objetivo de empate, lance terminal que
 * promove, a régua de DTM — não têm o que julgar no corpus de hoje: as duas
 * aulas prontas são mates de vitória. Sem conteúdo que as exercite, as seis
 * mutações novas ficariam vermelhas por não encontrar arquivo nenhum, que é o
 * pior tipo de vermelho: o que não prova regra alguma.
 *
 * A pasta é **irmã** de `lessons/` e `positions/`, e não filha, para que nem o
 * gate nem o site a varram sozinhos (o mesmo desenho de `content/rascunhos/`).
 * Aqui ela é copiada para dentro, e a partir daí é conteúdo comum, julgado
 * pelas mesmas ~50 regras.
 */
function instalarFixtures(dir: string) {
  const fixtures = path.join(dir, "fixtures");
  cpSync(path.join(fixtures, "lessons"), path.join(dir, "lessons"), { recursive: true });
  cpSync(path.join(fixtures, "positions"), path.join(dir, "positions", "FX"), { recursive: true });
  // O cache das fixtures viaja junto: é ele que deixa o teste de mutações rodar
  // sem rede, do mesmo jeito que o cache versionado deixa o gate rodar no CI.
  const cache = path.join(fixtures, "tablebase-cache");
  if (existsSync(cache)) {
    for (const arquivo of readdirSync(cache)) {
      cpSync(path.join(cache, arquivo), path.join(dir, "tablebase-cache", arquivo));
    }
  }
}

/** Lê uma aula de fixture **já instalada** na cópia de trabalho. */
function lerFixture(dir: string, id: string) {
  const file = path.join(dir, "lessons", `${id}.json`);
  return { file, json: JSON.parse(readFileSync(file, "utf8")) };
}

type Variante = { reply: string; next: string };

type ExpectDaAula = {
  moves: string[];
  reply?: string;
  next?: string;
  replies?: Variante[];
  /** O que o nó terminal promete. Ver `endsSchema` em `lib/lesson/schema.ts`. */
  ends?: string;
  generated?: boolean;
};

type NoDaAula = {
  fen: string;
  winningMoves: string[];
  expects: ExpectDaAula[];
  mistakes?: Array<{ moves: string[]; errorId?: string }>;
};

/** O nó terminal de uma etapa: o único cujo expect não aponta para outro nó. */
function acharTerminal(etapa: { nodes: Record<string, NoDaAula> }): [string, NoDaAula] {
  const achado = Object.entries(etapa.nodes).find(([, n]) => n.expects.some((e) => !e.next));
  if (!achado) throw new Error("nenhum nó terminal na etapa");
  return achado;
}

/* ------------------------------------------------------------------ *
 * B9/E1 — ajudantes das variantes do defensor
 * ------------------------------------------------------------------ */

/** O primeiro expect da etapa que tem resposta do defensor, com o nó e o id. */
function primeiroExpectComResposta(etapa: {
  nodes: Record<string, NoDaAula>;
}): [string, ExpectDaAula, NoDaAula] {
  for (const [id, node] of Object.entries(etapa.nodes)) {
    const expect = node.expects.find((e) => e.reply !== undefined && e.next !== undefined);
    if (expect) return [id, expect, node];
  }
  throw new Error("nenhum expect da etapa tem resposta do defensor");
}

/**
 * Troca a forma "única" (`reply` + `next`) pela forma "múltipla" (`replies`).
 *
 * Apaga os dois campos antigos: as três formas do expect são exclusivas, e uma
 * mutação que deixasse as duas escritas juntas bateria no schema antes de
 * chegar à regra que ela quer testar.
 */
function virarReplies(expect: ExpectDaAula, variantes: Variante[]): void {
  delete expect.reply;
  delete expect.next;
  expect.replies = variantes;
}

/** Um lance bem-formado que **não** é legal nesta posição. */
function lanceIlegal(game: Chess): string {
  const legais = new Set(
    game.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ""}`),
  );
  for (const de of "abcdefgh") {
    for (const para of "abcdefgh") {
      for (const linha of "12345678") {
        const uci = `${de}${linha}${para}${linha === "1" ? "2" : "1"}`;
        if (!legais.has(uci) && uci.slice(0, 2) !== uci.slice(2, 4)) return uci;
      }
    }
  }
  throw new Error("todo lance bem-formado é legal nesta posição — impossível");
}

const MUTACOES: Mutation[] = [
  {
    titulo: "FEN ilegal (reis adjacentes) na posição de ensino",
    codigo: "FEN_ILEGAL",
    aplicar: async (dir) => {
      const { file, json } = lerPosicao(dir, posicaoDeEnsino(dir));
      json.fen = "8/8/8/1k6/1K6/8/8/R7 w - - 0 1";
      gravar(file, json);
      return "fen → 8/8/8/1k6/1K6/8/8/R7 (rei branco em b4, colado no preto em b5)";
    },
  },
  {
    titulo: "resultado esperado errado",
    codigo: "RESULTADO_ERRADO",
    aplicar: async (dir) => {
      const { file, json } = lerPosicao(dir, posicaoDeEnsino(dir));
      json.expectedResult = "draw";
      gravar(file, json);
      return 'expectedResult → "draw" numa posição que a tablebase dá como ganha';
    },
  },
  /**
   * As duas mutações da exceção do professor (decisão 10 do plano do editor).
   *
   * Elas são de um tipo diferente das outras: não plantam um erro para ver se o
   * gate o pega — plantam um **perdão indevido** para ver se o gate o recusa. O
   * erro de base é o mesmo dos dois lados (`RESULTADO_ERRADO`, com a posição
   * mentindo sobre o resultado); o que muda é a exceção que o acompanha.
   *
   * Se alguém afrouxar a regra — parar de conferir o hash, ou passar a casar
   * exceção só pelo alvo —, estas duas ficam **verdes**, e verde aqui é a
   * suíte gritando. É o único jeito de uma regra que *perdoa* ter mutação.
   */
  {
    titulo: "exceção com hash velho perdoando o erro que ela descrevia",
    codigo: "RESULTADO_ERRADO",
    aplicar: async (dir) => {
      const id = posicaoDeEnsino(dir);
      const { file: fp, json: posicao } = lerPosicao(dir, id);
      posicao.expectedResult = "draw";
      gravar(fp, posicao);

      const { file: fa, json: aula } = lerAula(dir);
      aula.excecoes = [
        {
          codigo: "RESULTADO_ERRADO",
          alvo: id,
          // O hash descreve uma posição que não é mais esta.
          hash: "00000000000000000000000000000000",
          motivo: "Divergência que eu assumi quando a posição era outra, e ninguém reviu.",
          em: "2026-09-10",
        },
      ];
      gravar(fa, aula);
      return `exceção de ${id} com hash velho — o erro tem de voltar a bloquear`;
    },
  },
  {
    titulo: "exceção de outro código perdoando este erro",
    codigo: "RESULTADO_ERRADO",
    aplicar: async (dir) => {
      const id = posicaoDeEnsino(dir);
      const { file: fp, json: posicao } = lerPosicao(dir, id);
      posicao.expectedResult = "draw";
      gravar(fp, posicao);

      const { file: fa, json: aula } = lerAula(dir);
      // Hash **certo**: a exceção descreve exatamente esta posição. O que não
      // bate é o código — ela perdoa `METODO_NAO_GANHA`, e o erro é outro.
      const hash = hashDoAlvo(aula as Lesson, () => posicao.fen as string, id);
      aula.excecoes = [
        {
          codigo: "METODO_NAO_GANHA",
          alvo: id,
          hash,
          motivo: "Assumo que a linha do método não ganha, e é só isso que assumo aqui.",
          em: "2026-09-10",
        },
      ];
      gravar(fa, aula);
      return `exceção de METODO_NAO_GANHA, com hash certo, sobre um erro de RESULTADO_ERRADO`;
    },
  },
  /**
   * A marca do texto gerado sobrevivendo até a publicação.
   *
   * O "+" do editor cria o diagrama com `MARCA_DE_MOLDE` na fala, porque fala
   * vazia não é aula válida. Quem impede a marca de chegar à criança é o
   * `TEXTO_DE_MOLDE`, e esta mutação é a única prova de que ele impede: se
   * alguém trocar a marca em `schema.ts` sem trocar a busca no gate, ou mover
   * a regra para um ramo que não roda, ela fica **verde** — e verde aqui é a
   * suíte gritando.
   */
  {
    titulo: "fala com a marca do molde numa aula publicada",
    codigo: "TEXTO_DE_MOLDE",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const roteiro = json.stages.objective.roteiro as Array<{ fala: string }>;
      roteiro[2].fala = MARCA_DE_MOLDE;
      gravar(file, json);
      return `roteiro[2].fala → ${MARCA_DE_MOLDE} numa aula de status "published"`;
    },
  },
  {
    titulo: "campo de proveniência faltando",
    codigo: "SCHEMA_POSICAO",
    contem: "fenMethod",
    aplicar: async (dir) => {
      const { file, json } = lerPosicao(dir, posicaoDeEnsino(dir));
      delete json.provenance.fenMethod;
      gravar(file, json);
      return "provenance.fenMethod apagado (sobram 8 dos 9 campos)";
    },
  },
  {
    titulo: "posição não aprovada referenciada por aula publicável",
    codigo: "POSICAO_NAO_PUBLICAVEL",
    aplicar: async (dir) => {
      // Antes do B5 esta mutação só publicava a aula, e ficava vermelha porque
      // as 4 posições ainda eram fixtures. Com o garimpo feito, todas são
      // "approved" e a mutação precisa PLANTAR o estrago em vez de herdá-lo —
      // que aliás sempre foi o desenho certo dela.
      const ensino = posicaoDeEnsino(dir);
      const posicao = lerPosicao(dir, ensino);
      posicao.json.status = "candidate";
      gravar(posicao.file, posicao.json);
      const { file, json } = lerAula(dir);
      json.status = "published";
      // Desde a FN1/B2 o schema cobra a classe de quem publica: sem ela a
      // mutação morreria em SCHEMA_AULA e a regra sob teste nunca rodaria.
      json.class = "E";
      gravar(file, json);
      return `status da aula → "published" (classe E) com ${ensino} rebaixada a "candidate"`;
    },
  },
  {
    titulo: "lance perdedor marcado como método",
    codigo: "METODO_NAO_GANHA",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      // Procurado, não fixado à mão: qualquer nó onde exista lance legal fora
      // do winningMoves serve, e assim a mutação sobrevive à troca de posição.
      for (const [id, node] of Object.entries(json.stages.guided.nodes) as Array<
        [string, { fen: string; winningMoves: string[]; expects: Array<{ moves: string[] }>; mistakes?: Array<{ moves: string[] }> }]
      >) {
        const game = new Chess(node.fen);
        const perdedor = game
          .moves({ verbose: true })
          .map((m) => `${m.from}${m.to}`)
          .find((uci) => !node.winningMoves.includes(uci));
        if (!perdedor) continue;
        node.expects[0].moves = [perdedor];
        node.mistakes = (node.mistakes ?? []).filter((m) => !m.moves.includes(perdedor));
        if (node.mistakes.length === 0) delete node.mistakes;
        gravar(file, json);
        return `${id}: expects passa a ser ${perdedor}, que joga a vitória fora`;
      }
      throw new Error("nenhum nó guiado tem lance perdedor para plantar a mutação");
    },
  },
  {
    // O estrago mudou de forma com o piloto do de la Villa. Ele antes só
    // trocava o lance final por um que ganha sem dar mate, porque o terminal
    // da aula de então **declarava** `ends: "mate"`. O terminal do piloto
    // declara `ends: "promotion"` — é uma aula de peão, e ela acaba na dama
    // nova, não no mate. Trocar só o lance deixaria a regra sob teste sem
    // sujeito, e a mutação ficaria verde por não ter o que provar.
    //
    // Agora ela planta a declaração **e** o lance: `ends: "mate"` num lance que
    // não dá mate. É a promessa quebrada que a regra existe para pegar, e ela
    // sobrevive a qualquer aula que venha depois.
    titulo: "nó terminal sem mate",
    codigo: "TERMINAL_SEM_MATE",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const [id, node] = acharTerminal(json.stages.guided);
      const naoDaMate = node.winningMoves.find((uci: string) => {
        const game = new Chess(node.fen);
        game.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci.slice(4) : undefined,
        });
        return !game.isCheckmate();
      });
      if (!naoDaMate) throw new Error("o terminal não tem lance vencedor que deixe de dar mate");
      node.expects[0].moves = [naoDaMate];
      node.expects[0].ends = "mate";
      gravar(file, json);
      return `${id}: o lance final vira ${naoDaMate} e o nó passa a declarar ends "mate" — mas não há mate`;
    },
  },
  {
    // **Roda sobre a fixture, e não sobre a aula publicada.** O piloto do de la
    // Villa é rei e peão contra rei com o rei muito à frente: ali o defensor
    // não tem escolha nenhuma que encurte o mate em mais de 2 lances — todas
    // as fugas do rei preto valem quase o mesmo. Sem espalhamento não há
    // defesa frouxa a plantar, e a regra ficaria sem sujeito.
    //
    // A `N1-FIXTURE-KRK` é o mate de torre, onde o defensor **tem** escolhas
    // que custam muitos lances de diferença. É a mesma razão pela qual as
    // outras mutações da B2 moram em fixture: a regra é do gate, não do
    // currículo, e não pode depender de qual aula está escrita hoje.
    titulo: "defensor frouxo (resposta que encurta o mate)",
    codigo: "DEFENSOR_FROUXO",
    fixtures: true,
    aplicar: async (dir) => {
      const { file, json } = lerFixture(dir, "N1-FIXTURE-KRK");
      const tablebase = new Tablebase(path.join(dir, "tablebase-cache"), true);
      for (const nodeId of Object.keys(json.stages.guided.nodes)) {
        const node = json.stages.guided.nodes[nodeId];
        const expect = node.expects[0];
        if (!expect.reply) continue;
        const game = new Chess(node.fen);
        const move = expect.moves[0];
        game.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
        const entry = await tablebase.lookup(game.fen());
        const defesas = entry.moves
          .map((m) => ({ uci: m.uci, plies: m.checkmate ? 0 : Math.abs(m.dtm ?? 0) }))
          .sort((a, b) => a.plies - b.plies);
        const pior = defesas[0];
        const melhor = defesas[defesas.length - 1];
        if (melhor.plies - pior.plies <= 2) continue;
        expect.reply = pior.uci;
        gravar(file, json);
        return (
          `${nodeId}: a resposta do defensor vira ${pior.uci} (mate em ${pior.plies} plies), ` +
          `quando a melhor defesa aguenta ${melhor.plies}`
        );
      }
      throw new Error("nenhum nó tem defesa fraca o bastante para plantar a mutação");
    },
  },
  {
    titulo: "posição citando obra que não está no registro",
    codigo: "OBRA_NAO_REGISTRADA",
    aplicar: async (dir) => {
      promover(dir, posicaoDeEnsino(dir), "dvoretsky-endgame-manual.pdf");
      return (
        'pos-...-fx-a promovida a "candidate" com os 9 campos preenchidos, mas ' +
        'editionFile → "dvoretsky-endgame-manual.pdf", obra ausente de content/sources.json'
      );
    },
  },
  {
    titulo: "livro-base declarado que não é o de nenhuma cena",
    codigo: "FONTE_DIDATICA_DIVERGE",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      // **A obra errada é COLHIDA, e não escrita aqui — e essa é a terceira
      // versão desta linha.** Ela já foi "silman-endgame-course" e apodreceu no
      // dia em que a aula passou a ser genuinamente do Silman; virou
      // "de-la-villa-100" e apodreceu de novo em 2026-09-08, quando o piloto
      // passou a ser do de la Villa. Nas duas vezes o sintoma foi o mesmo: a
      // mutação vira no-op e passa batido, verde, sem provar nada.
      //
      // Agora ela pergunta ao registro qual é a outra: qualquer obra didática
      // que não seja a que a aula declara. Não há mais nome de obra escrito
      // nesta mutação, e por isso ela não tem como apodrecer numa terceira.
      const registro = JSON.parse(readFileSync(path.join(dir, "sources.json"), "utf8"));
      const antes = json.stages.objective.source;
      const outra = registro.sources.find(
        (o: { didactic?: boolean; slug: string }) => o.didactic && o.slug !== antes,
      );
      if (!outra) throw new Error("o registro não tem uma segunda obra didática");
      json.stages.objective.source = outra.slug;
      gravar(file, json);
      return (
        `objective.source: "${antes}" → "${outra.slug}", obra didática registrada ` +
        "mas de onde não sai a posição da aula"
      );
    },
  },
  {
    // FN1/B2: a regra deixou de ser "uma aula por nível" e passou a ser
    // `max(2, floor(N/3))` aulas **publicadas** por classe. Com o piso de 2, duas
    // aulas do mesmo autor são legítimas — a mutação precisa de **três**.
    titulo: "obra protegida como livro-base de 3 aulas publicadas da mesma classe",
    codigo: "FONTE_DIDATICA_DOMINA",
    // O teto é `max(2, floor(N/3))`, e N é o número de aulas publicadas da
    // classe — que cresce a cada aula nova. Fixar o texto inteiro (era
    // "max(2, floor(3/3))", escrito quando a classe E tinha 3 aulas) faz a
    // mutação ficar verde sozinha no dia em que a quarta aula entra. Cobrar só
    // a fórmula prova a mesma coisa sem depender do N do dia.
    contem: "max(2, floor(",
    aplicar: async (dir) => {
      // A obra tem de ser protegida, didática e **fora do regime integral**:
      // para quem está em regime integral a rotação é desligada de propósito, e
      // o `fail` nunca sai. Ela é colhida do registro, e não escrita — o livro
      // do piloto já mudou duas vezes, e em 2026-09-08 ele **entrou** em regime
      // integral (o de la Villa passou a ser o livro do módulo inteiro, por
      // decisão do Doug). Foi exatamente isso que deixou esta mutação sem alvo:
      // ela ficou verde sozinha, e o run a pegou.
      const registro = JSON.parse(readFileSync(path.join(dir, "sources.json"), "utf8")) as {
        sources: Array<{ slug: string; file: string | null; protected?: boolean; didactic?: boolean; integral?: unknown }>;
      };
      const alvo = registro.sources.find((o) => o.protected && o.didactic && !o.integral);
      if (!alvo) throw new Error("o registro não tem obra protegida, didática e fora do regime integral");

      // A posição da aula sai de uma obra em regime integral, e ela consta do
      // inventário de `content/divida-de-licenca.md`. Trocar a proveniência
      // dela faria a mutação disparar `DIVIDA_DESATUALIZADA` junto, e uma
      // mutação que acende dois códigos deixa de provar qual dos dois pegou o
      // estrago. Em vez disso: uma **cópia** da posição, com id novo e a
      // proveniência do alvo. Mesma FEN e mesmo resultado, então nenhuma outra
      // regra reclama; e como o alvo não está em regime integral, o inventário
      // não muda um byte.
      const original = lerAula(dir);
      const idPosicao = original.json.stages.objective.positionId as string;
      const posicao = lerPosicao(dir, idPosicao).json;
      const idCopia = `${idPosicao}-rotacao`;
      posicao.id = idCopia;
      posicao.provenance.editionFile = alvo.file ?? alvo.slug;
      gravar(path.join(dir, "positions", pastaDaPosicao(idCopia), `${idCopia}.json`), posicao);

      // Três aulas publicadas da mesma classe, todas com o alvo como livro-base.
      // Três é o menor N que estoura: com duas o teto é max(2, 0) = 2, e 2 não é
      // maior que 2. A aula original fica **intacta** — ela é classe D, o
      // livro dela é o do regime integral, e mexer nela é o que sujaria o
      // inventário.
      const aulas: string[] = [];
      for (let k = 0; k < 3; k += 1) {
        const { json } = lerAula(dir);
        json.id = `${json.id}-ROTACAO${k + 1}`;
        json.status = "published";
        json.class = "E";
        json.stages.objective.source = alvo.slug;
        for (const etapa of ["objective", "guided", "practice"] as const) {
          if (json.stages[etapa]) json.stages[etapa].positionId = idCopia;
        }
        gravar(path.join(dir, "lessons", `${json.id}.json`), json);
        aulas.push(json.id as string);
      }
      return (
        `${aulas.length} aulas publicadas da classe E declaram "${alvo.slug}" como ` +
        "livro-base — acima do teto de max(2, floor(N/3))"
      );
    },
  },
  /* ---------------------------------------------------------------- *
   * O regime integral (§1.1 do SOURCE-CORPUS)
   *
   * A exceção nasce com mutação plantada, como toda regra do gate. Sem estas
   * três, o `integral` seria um campo que desliga duas regras e não tem nada
   * cobrando que o desligamento continue medido.
   * ---------------------------------------------------------------- */
  {
    titulo: "prazo do regime integral vencido",
    codigo: "REGIME_INTEGRAL_VENCIDO",
    aplicar: async (dir) => {
      const file = path.join(dir, "sources.json");
      const json = JSON.parse(readFileSync(file, "utf8"));
      const obra = json.sources.find((s: { integral?: unknown }) => s.integral);
      if (!obra) throw new Error("nenhuma obra em regime integral para vencer");
      obra.integral.since = "2020-01-01";
      obra.integral.replaceBefore = "2021-01-01";
      gravar(file, json);
      return (
        `o prazo de "${obra.slug}" recuado para 2021-01-01 — a exceção temporária que ninguém ` +
        "renovou tem de reprovar sozinha"
      );
    },
  },
  /* ---------------------------------------------------------------- *
   * B8.2 — "este lance também vale"
   *
   * As três regras novas nascem com mutação plantada, e a quarta é uma regra
   * **antiga** que nunca teve cobertura: o `ERRO_E_METODO`. Ela guarda a
   * mesma ideia das outras — um lance não pode estar em duas listas ao mesmo
   * tempo — e passa a ser cobrada junto com elas.
   * ---------------------------------------------------------------- */
  {
    titulo: "lance que perde declarado válido pela autoria",
    codigo: "ALTERNATIVA_NAO_GANHA",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      for (const [id, node] of Object.entries(json.stages.guided.nodes) as Array<
        [string, NoDaAula & { authorAlternatives?: unknown }]
      >) {
        const game = new Chess(node.fen);
        const perdedor = game
          .moves({ verbose: true })
          .map((m) => `${m.from}${m.to}`)
          .find((uci) => !node.winningMoves.includes(uci));
        if (!perdedor) continue;
        node.mistakes = (node.mistakes ?? []).filter((m) => !m.moves.includes(perdedor));
        if (node.mistakes.length === 0) delete node.mistakes;
        node.authorAlternatives = [{ moves: [perdedor], feedback: "este também vale" }];
        gravar(file, json);
        return `${id}: ${perdedor} é declarado válido pela autoria e joga a vitória fora`;
      }
      throw new Error("nenhum nó guiado tem lance perdedor para plantar a mutação");
    },
  },
  {
    titulo: "mesmo lance em mistakes e em authorAlternatives",
    codigo: "ALTERNATIVA_E_ERRO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      for (const [id, node] of Object.entries(json.stages.guided.nodes) as Array<
        [string, NoDaAula & { authorAlternatives?: unknown }]
      >) {
        const erro = (node.mistakes ?? []).flatMap((m) => m.moves).find((uci) => node.winningMoves.includes(uci))
          ?? (node.mistakes ?? []).flatMap((m) => m.moves)[0];
        if (!erro) continue;
        node.authorAlternatives = [{ moves: [erro], feedback: "aceito e também repreendido" }];
        gravar(file, json);
        return `${id}: ${erro} continua em mistakes e entra também em authorAlternatives`;
      }
      throw new Error("nenhum nó guiado tem erro nomeado para plantar a mutação");
    },
  },
  {
    titulo: "mesmo lance em expects e em authorAlternatives",
    codigo: "ALTERNATIVA_E_METODO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const [id, node] = Object.entries(json.stages.guided.nodes)[0] as [
        string,
        NoDaAula & { authorAlternatives?: unknown },
      ];
      const roteiro = node.expects[0].moves[0];
      node.authorAlternatives = [{ moves: [roteiro], feedback: "avança e também volta" }];
      gravar(file, json);
      return `${id}: ${roteiro} é o lance do roteiro e entra também em authorAlternatives`;
    },
  },
  {
    titulo: "mesmo lance em expects e em mistakes",
    codigo: "ERRO_E_METODO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const [id, node] = Object.entries(json.stages.guided.nodes)[0] as [string, NoDaAula];
      const roteiro = node.expects[0].moves[0];
      // O id do erro é COLHIDO da aula. Estava escrito como "rei-distante", que
      // era um erro da aula de mate de torre; com o piloto do de la Villa esse
      // id deixou de existir e o gate passou a reprovar por ERRO_DESCONHECIDO —
      // um vermelho verdadeiro pelo motivo errado, que é o mesmo que verde.
      const [erroId] = Object.keys(json.errors);
      if (!erroId) throw new Error("a aula não declara erro nomeado nenhum");
      node.mistakes = [...(node.mistakes ?? []), { moves: [roteiro], errorId: erroId }];
      gravar(file, json);
      return `${id}: ${roteiro} é o lance do roteiro e entra também em mistakes`;
    },
  },

  {
    // A etapa 1 deixou de ser texto sobre um diagrama parado: ela TOCA. Um
    // lance ilegal no meio do roteiro não é erro de redação — é a demonstração
    // travando na tela do aluno, e o gate tem de pegá-lo antes.
    titulo: "roteiro da etapa 1 com lance ilegal no meio",
    codigo: "SCHEMA_AULA",
    contem: "não é legal em",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const roteiro = json.stages.objective.roteiro as Array<{ lance?: string }>;
      const passo = roteiro.findIndex((p) => p.lance);
      const antes = roteiro[passo].lance;
      // Um lance de peão que salta três casas: legal em UCI, ilegal no xadrez.
      roteiro[passo].lance = `${antes!.slice(0, 2)}${antes!.slice(0, 1)}8`;
      gravar(file, json);
      return `roteiro[${passo}].lance: "${antes}" → "${roteiro[passo].lance}", que a chess.js recusa`;
    },
  },

  /* ---------------------------------------------------------------- *
   * Modo autor (B8) — o canal dos rascunhos, testado contra si mesmo
   * ---------------------------------------------------------------- */
  {
    // O rascunho é conteúdo de verdade: as ~50 regras valem sobre ele igual.
    // A mutação prova que o gate **lê** o rascunho e o julga, em vez de
    // aprovar o arquivo publicado e ignorar o que o autor escreveu.
    titulo: "rascunho de aula com texto vazio",
    codigo: "SCHEMA_AULA",
    contem: "texto não pode ser vazio",
    flags: ["--rascunhos"],
    aplicar: async (dir) => {
      const { json } = lerAula(dir);
      json.stages.objective.roteiro[0].fala = "";
      gravarRascunhoDeAula(dir, "N1-KPK", json);
      return (
        "rascunhos/lessons/N1-KPK.json com a fala do passo 1 vazia — " +
        "o arquivo publicado continua intacto"
      );
    },
  },
  {
    // Rascunho que não está sob `lessons/` nem sob `positions/` nunca seria
    // carregado, julgado ou promovido: o autor salvaria, veria verde, e o
    // trabalho ficaria parado ali. É o silêncio que este código vira vermelho.
    titulo: "rascunho fora das pastas que espelham o destino",
    codigo: "RASCUNHO_ORFAO",
    flags: ["--rascunhos"],
    aplicar: async (dir) => {
      const { json } = lerAula(dir);
      mkdirSync(path.join(dir, "rascunhos"), { recursive: true });
      gravar(path.join(dir, "rascunhos", "N1-KPK.json"), json);
      return "rascunhos/N1-KPK.json, um degrau acima de rascunhos/lessons/";
    },
  },
  {
    // A trava do próprio canal. `--write` desliga três regras enquanto grava;
    // aplicar na mesma passada seria promover bytes julgados por um juiz
    // enfraquecido. O gate tem de morrer **antes** de conferir coisa nenhuma.
    titulo: "aplicar e regenerar na mesma passada",
    codigo: "FLAGS_INCOMPATIVEIS",
    contem: "juiz enfraquecido",
    flags: ["--rascunhos", "--aplicar", "--write"],
    aplicar: async (dir) => {
      const { json } = lerAula(dir);
      gravarRascunhoDeAula(dir, "N1-KPK", json);
      return "o gate é chamado com --aplicar e --write juntos, sobre um rascunho intacto";
    },
  },
  {
    // E a trava do nome errado: `--rascunho` sem o "s" era ignorado em
    // silêncio, o gate conferia o conteúdo publicado e devolvia verde — que o
    // autor leria como aprovação do rascunho que nem foi lido.
    titulo: "flag de rascunho escrita errada",
    codigo: "FLAG_DESCONHECIDA",
    contem: "--rascunho",
    flags: ["--rascunho"],
    aplicar: async (dir) => {
      const { json } = lerAula(dir);
      json.title = "título que nunca deveria ser aprovado por engano";
      gravarRascunhoDeAula(dir, "N1-KPK", json);
      return "o gate é chamado com --rascunho (sem o s) sobre um rascunho que mudou o título";
    },
  },
  {
    // B8.4: o rascunho de **posição** também é conteúdo de verdade. A mutação
    // prova que o gate lê `rascunhos/positions/` e o julga com as mesmas
    // regras — e que o montador não tem como escapar delas salvando primeiro.
    titulo: "rascunho de posição com os reis colados",
    codigo: "FEN_ILEGAL",
    contem: "reis adjacentes",
    flags: ["--rascunhos"],
    aplicar: async (dir) => {
      const ensino = posicaoDeEnsino(dir);
      const { json } = lerPosicao(dir, ensino);
      json.fen = "8/8/8/1k6/1K6/8/8/R7 w - - 0 1";
      const pasta = path.join(dir, "rascunhos", "positions", pastaDaPosicao(ensino));
      mkdirSync(pasta, { recursive: true });
      gravar(path.join(pasta, `${ensino}.json`), json);
      return (
        `rascunhos/positions/N1/${ensino}.json com os reis em b4 e b5 — ` +
        "o arquivo publicado continua legal"
      );
    },
  },
  {
    // B8.4: trocar a posição de uma etapa de árvore **não** apaga a árvore.
    // Ela fica órfã, e é o gate que recusa — que é exatamente o que o painel
    // avisa antes de deixar trocar.
    //
    // Ela trocava a posição da etapa 4 pela da etapa 3, que eram diferentes.
    // No formato de três etapas as três são a MESMA, então trocar por outra
    // qualquer é o estrago: a árvore continua escrita para a posição de antes,
    // e o primeiro nó dela deixa de bater com a FEN da posição nova.
    titulo: "posição da árvore trocada com a árvore velha de pé",
    codigo: "FEN_DO_NO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const antes = json.stages.guided.positionId;
      // Uma posição de outra classe, que existe no disco e não é a da aula.
      const outra = "pos-n1-square-dlv-1-1";
      json.stages.guided.positionId = outra;
      json.stages.objective.positionId = outra;
      json.stages.practice.positionId = outra;
      gravar(file, json);
      return `as três etapas apontam "${outra}" e a árvore continua escrita para "${antes}"`;
    },
  },

  /* ------------------------------------------------------------------ *
   * B9/E1 — as variantes do defensor
   *
   * O formato novo (`replies`) abre um caminho pelo qual conteúdo entra sem
   * ser julgado: o gate podia continuar olhando só a primeira resposta e ficar
   * verde com a segunda torta. As três mutações abaixo fecham as três portas —
   * a regra nova, o laço que precisa passar por *toda* variante, e a
   * exclusividade das três formas do expect.
   * ------------------------------------------------------------------ */
  {
    titulo: "duas variantes do defensor com o mesmo lance",
    codigo: "RESPOSTA_DUPLICADA",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const [id, expect] = primeiroExpectComResposta(json.stages.guided);
      const resposta = { reply: expect.reply as string, next: expect.next as string };
      virarReplies(expect, [resposta, { ...resposta }]);
      gravar(file, json);
      return `${id}: replies com "${resposta.reply}" duas vezes — a segunda nunca seria jogada`;
    },
  },
  {
    titulo: "segunda variante do defensor com lance ilegal",
    codigo: "RESPOSTA_ILEGAL",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const [id, expect, node] = primeiroExpectComResposta(json.stages.guided);
      // A primeira variante é a boa e continua boa: o que esta mutação prova é
      // que o gate **não para nela**. Um laço que olhasse só `respostas[0]`
      // ficaria verde aqui.
      const depoisDoLance = new Chess(node.fen);
      const lance = expect.moves[0];
      depoisDoLance.move({ from: lance.slice(0, 2), to: lance.slice(2, 4) });
      const ilegal = lanceIlegal(depoisDoLance);
      virarReplies(expect, [
        { reply: expect.reply as string, next: expect.next as string },
        { reply: ilegal, next: expect.next as string },
      ]);
      gravar(file, json);
      return `${id}: a segunda variante responde "${ilegal}", que não é lance legal depois de ${lance}`;
    },
  },
  {
    titulo: "expect com `reply` e `replies` ao mesmo tempo",
    codigo: "SCHEMA_AULA",
    contem: "replies",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const [id, expect] = primeiroExpectComResposta(json.stages.guided);
      // As três formas do expect são exclusivas: terminal, única, múltipla.
      // Escrever as duas últimas juntas deixaria duas verdades sobre a mesma
      // linha, e quem lê o arquivo não saberia qual o motor obedece.
      expect.replies = [
        { reply: expect.reply as string, next: expect.next as string },
        { reply: expect.reply as string, next: expect.next as string },
      ];
      gravar(file, json);
      return `${id}: replies escrito sem apagar reply/next`;
    },
  },
  /* ------------------------------------------------------------------ *
   * FN1/B2 — empate, promoção e a régua de DTM
   *
   * As seis mutações abaixo julgam regras que **nenhuma aula do curso exercita
   * hoje**: as duas prontas são mates de vitória, e a primeira aula de empate
   * só chega na FN2. Sem conteúdo que as ative, as regras novas passariam meses
   * verdes por falta de assunto — e ninguém saberia se funcionam.
   *
   * Daí as fixtures (`content/fixtures/`, `flag fixtures: true`): duas aulas
   * sintéticas, instaladas na cópia de trabalho como conteúdo comum e julgadas
   * pelas mesmas ~50 regras. O controle com fixtures, logo antes do laço, prova
   * que elas passam intactas — sem isso um vermelho aqui não distinguiria a
   * regra funcionando da fixture torta.
   * ------------------------------------------------------------------ */
  {
    titulo: "árvore de vitória declarada como objetivo de empate",
    codigo: "OBJETIVO_INCOERENTE",
    fixtures: true,
    aplicar: async (dir) => {
      const { file, json } = lerFixture(dir, "N1-FIXTURE-PROMOCAO");
      json.stages.guided.goal = "draw";
      // A mentira é plantada **inteira**: trocar o objetivo troca a lista de
      // lances que o preservam, e deixar a lista velha faria a mutação ficar
      // vermelha por WINNING_MOVES_DESATUALIZADO — um vermelho verdadeiro pelo
      // motivo errado, que não provaria nada sobre a regra sob teste.
      const tablebase = new Tablebase(path.join(dir, "tablebase-cache"), true);
      const node = json.stages.guided.nodes.p1;
      node.winningMoves = goalMovesOf(await tablebase.lookup(node.fen), "draw");
      gravar(file, json);
      return 'stages.guided.goal → "draw" numa posição que a tablebase dá como ganha para as brancas';
    },
  },
  {
    titulo: "prática de mate declarada como objetivo de empate",
    codigo: "OBJETIVO_INCOERENTE",
    contem: "practice",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      json.stages.practice.goal = "draw";
      gravar(file, json);
      return 'stages.practice.goal → "draw" numa posição ganha — o aluno seria aprovado por empatar';
    },
  },
  {
    titulo: "terminal que promete promoção e não promove",
    codigo: "TERMINAL_SEM_PROMOCAO",
    fixtures: true,
    aplicar: async (dir) => {
      const { file, json } = lerFixture(dir, "N1-FIXTURE-PROMOCAO");
      const expect = json.stages.guided.nodes.p1.expects[0];
      const antes = expect.moves[0];
      // "e6d7" ganha e está em winningMoves: o único defeito é não promover.
      expect.moves = ["e6d7"];
      gravar(file, json);
      return `o lance terminal "${antes}" vira "e6d7" — ainda ganha, e ends continua "promotion"`;
    },
  },
  {
    titulo: "terminal que promete empate seguro numa posição ganha",
    codigo: "TERMINAL_NAO_SEGURA",
    fixtures: true,
    aplicar: async (dir) => {
      const { file, json } = lerFixture(dir, "N1-FIXTURE-PROMOCAO");
      json.stages.guided.nodes.p1.expects[0].ends = "draw-secured";
      gravar(file, json);
      return 'ends do terminal → "draw-secured" depois de e7e8q, que deixa posição ganha, não empatada';
    },
  },
  {
    titulo: "terminal que promete vitória de tablebase e para num empate",
    codigo: "TERMINAL_FORA_DO_OBJETIVO",
    fixtures: true,
    aplicar: async (dir) => {
      const { file, json } = lerFixture(dir, "N1-FIXTURE-EMPATE");
      json.stages.guided.nodes.n2.expects[0].ends = "tablebase-win";
      gravar(file, json);
      return 'ends do terminal → "tablebase-win" numa posição que a tablebase dá como empate';
    },
  },
  {
    titulo: "terminal de vitória sem DTM para medir os 40 lances",
    codigo: "TERMINAL_LONGE_DEMAIS",
    fixtures: true,
    aplicar: async (dir) => {
      const { file, json } = lerFixture(dir, "N1-FIXTURE-PROMOCAO");
      json.stages.guided.nodes.p1.expects[0].ends = "tablebase-win";
      gravar(file, json);
      return (
        'ends → "tablebase-win" numa posição de 7 peças: a posição é ganha mesmo, ' +
        "mas a API só dá DTM até 5 peças e a régua fica sem o que medir"
      );
    },
  },

  /* ---------------------------------------------------------------- *
   * A etapa 3 derivada da etapa 2 (2026-09-09)
   *
   * As quatro primeiras cobrem o buraco que `schema.ts` prometia e que não
   * existia: **o roteiro nunca teve juiz contra a posição de verdade**. A trava
   * do schema encadeia os lances a partir da raiz da árvore, então uma aula sem
   * árvore — a N0-LADDER era uma — tinha o roteiro inteiro sem ninguém olhando.
   * Por isso três delas apagam `stages.guided` antes de plantar o estrago: é
   * assim que se põe o gate sozinho na frente do roteiro.
   * ---------------------------------------------------------------- */
  {
    titulo: "lance ilegal no roteiro da aula, sem árvore que o denuncie",
    codigo: "ROTEIRO_ILEGAL",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      delete json.stages.guided;
      // A ausência de etapa é declarada por escrito desde 9/9/2026: sem isto a
      // aula bateria na trava das quatro etapas e a regra sob teste — que é
      // sobre o ROTEIRO — nunca chegaria a rodar.
      json.etapasAusentes = { guided: "mutação de teste: a árvore foi apagada de propósito" };
      json.stages.objective.roteiro[2].lance = "h1h8";
      gravar(file, json);
      return 'stages.guided apagado (e declarado ausente) e roteiro[2].lance → "h1h8"';
    },
  },
  {
    titulo: "roteiro que começa pelo lance do adversário",
    codigo: "ROTEIRO_COMECA_ERRADO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      json.orientation = "black";
      gravar(file, json);
      return 'orientation → "black": o primeiro lance do roteiro passa a ser do defensor';
    },
  },
  {
    titulo: "roteiro que termina com o lance do adversário",
    codigo: "ROTEIRO_NAO_FECHA",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const fora = json.stages.objective.roteiro.pop();
      gravar(file, json);
      return `último passo do roteiro removido ("${fora.lance}") — a linha passa a acabar no preto`;
    },
  },
  {
    titulo: "bloco de treino num passo que não vira nó do aluno",
    codigo: "TREINO_SEM_NO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      json.stages.objective.roteiro[0].treino = { dica: "ninguém leria esta dica" };
      gravar(file, json);
      return "roteiro[0] (passo sem lance) ganhou um bloco treino que nunca seria lido";
    },
  },
  {
    titulo: "etapa 3 do arquivo divergindo do roteiro que a produz",
    codigo: "TREINO_DESATUALIZADO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const raiz = json.stages.guided.root;
      json.stages.guided.nodes[raiz].hint = "uma dica que o roteiro não pediu";
      gravar(file, json);
      return `guided.nodes.${raiz}.hint editado à mão — a árvore é SAÍDA, e o roteiro não mudou`;
    },
  },

  /* ---------------------------------------------------------------- *
   * A apresentação — a única FEN do curso sem arquivo de posição
   *
   * Ela não passa pela tablebase de propósito (é ilustração, e pode ter mais de
   * sete peças). O que sobra de mecânico são estas duas, e é por isso que elas
   * ganham mutação: uma regra sem mutação plantada é uma regra que se pode
   * apagar sem ninguém notar.
   * ---------------------------------------------------------------- */
  {
    titulo: "aula publicada sem uma das quatro etapas, e sem dizer por quê",
    codigo: "SCHEMA_AULA",
    contem: 'não tem a etapa "intro"',
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      delete json.stages.intro;
      gravar(file, json);
      return "stages.intro apagado sem entrar em etapasAusentes — um formato só, e a ausência se escreve";
    },
  },
  {
    titulo: "diagrama de apresentação com os dois reis colados",
    codigo: "INTRO_FEN_ILEGAL",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      json.stages.intro.passos[0].fen = "8/8/8/1k6/1K6/8/8/8 w - - 0 1";
      gravar(file, json);
      return "intro.passos[0].fen → reis em b4 e b5, colados — não é posição, é erro de digitação";
    },
  },
  {
    titulo: "diagrama de apresentação repetindo a posição da aula",
    codigo: "INTRO_FEN_REDUNDANTE",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const { json: posicao } = lerPosicao(dir, posicaoDeEnsino(dir));
      json.stages.intro.passos[0].fen = posicao.fen;
      gravar(file, json);
      return "intro.passos[0].fen → a FEN da própria posição da aula, que se diz omitindo o campo";
    },
  },
];

function rodarValidador(dir: string, flags: string[] = []) {
  const result = spawnSync(
    process.execPath,
    [validator, "--content", dir, "--refresh-cache", ...flags],
    { cwd: repo, encoding: "utf8" },
  );
  return { status: result.status ?? -1, saida: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

/** Tira as cores da saída do validador, para poder procurar texto nela. */
const limpar = (texto: string) => texto.replace(/\u001b\[\d+m/g, "");

/**
 * As linhas de **erro** com este código. Aviso não conta.
 *
 * O `✖` é exigido, e não apenas removido. Desde que o gate ganhou avisos
 * (`▲ [CODIGO] onde`, para a exceção do professor), as duas coisas passaram a
 * ter o mesmo formato — e uma busca por `[CODIGO]` solto aceitava um aviso como
 * prova de que a regra pegou o estrago. O efeito era uma mutação vermelha
 * **pelo motivo errado**: ela ficava vermelha mesmo com a regra desligada, que
 * é exatamente o verde que esta suíte existe para produzir.
 *
 * Medido: com a conferência de hash de `julgarComExcecoes` sabotada, a mutação
 * "exceção com hash velho" continuava passando. Com o `✖` exigido, ela fica
 * verde e a suíte grita.
 */
function linhasDoCodigo(saida: string, codigo: string): string[] {
  const linhas = saida.split(/\r?\n/);
  const encontradas: string[] = [];
  for (const [i, linha] of linhas.entries()) {
    const limpa = limpar(linha);
    if (!limpa.includes(`[${codigo}]`)) continue;
    if (!limpa.trimStart().startsWith("✖")) continue;
    const cabeca = limpa.replace(/^\s*✖\s*/, "").trim();
    encontradas.push(`${cabeca}\n      ${limpar(linhas[i + 1] ?? "").trim()}`);
  }
  return encontradas;
}

const base = mkdtempSync(path.join(tmpdir(), "labfinais-mutacoes-"));
let vermelhos = 0;

console.log("");
console.log(
  `Teste do gate contra si mesmo — ${MUTACOES.length} mutações plantadas (§3.4 do plano da F1)`,
);
console.log(`${CINZA}cópia de trabalho em ${base}${NORMAL}`);
console.log("");

// Controle: a cópia intacta precisa passar. Sem isso, um vermelho não prova nada.
const controle = path.join(base, "controle");
cpSync(source, controle, { recursive: true });
const resultadoControle = rodarValidador(controle);
if (resultadoControle.status === 0) {
  console.log(`  ${VERDE}✔${NORMAL} controle — a cópia intacta passa no validador`);
} else {
  console.log(`  ${VERMELHO}✖ controle — a cópia intacta já falha; o teste não vale${NORMAL}`);
  console.log(limpar(resultadoControle.saida));
  process.exit(1);
}

// Segundo controle (B2): as fixtures **intactas** também precisam passar. Sem
// ele, um vermelho nas seis mutações novas não distinguiria "a regra pegou o
// estrago" de "a aula sintética estava torta desde o começo".
const controleFx = path.join(base, "controle-fixtures");
cpSync(source, controleFx, { recursive: true });
instalarFixtures(controleFx);
const resultadoFx = rodarValidador(controleFx);
if (resultadoFx.status === 0) {
  console.log(`  ${VERDE}✔${NORMAL} controle — as fixtures da B2, instaladas e intactas, passam também`);
} else {
  console.log(`  ${VERMELHO}✖ controle — as fixtures da B2 já falham intactas; o teste não vale${NORMAL}`);
  console.log(limpar(resultadoFx.saida));
  process.exit(1);
}
console.log("");

for (const [i, mutacao] of MUTACOES.entries()) {
  const dir = path.join(base, `m${i + 1}`);
  cpSync(source, dir, { recursive: true });
  if (mutacao.fixtures) instalarFixtures(dir);
  const detalhe = await mutacao.aplicar(dir);
  const { status, saida } = rodarValidador(dir, mutacao.flags);
  const achados = linhasDoCodigo(saida, mutacao.codigo);
  const contemOk = mutacao.contem ? achados.some((l) => l.includes(mutacao.contem as string)) : true;
  const passou = status !== 0 && achados.length > 0 && contemOk;
  if (passou) vermelhos += 1;

  console.log(`${i + 1}. ${mutacao.titulo}`);
  console.log(`   ${CINZA}${detalhe}${NORMAL}`);
  if (passou) {
    console.log(`   ${VERMELHO}✖ ${achados[0]}${NORMAL}`);
  } else {
    console.log(
      `   ${VERDE}!! a mutação passou batido${NORMAL} — exit ${status}, ` +
        `esperado o código ${mutacao.codigo}${mutacao.contem ? ` com "${mutacao.contem}"` : ""}`,
    );
    console.log(limpar(saida));
  }
  console.log("");
}

rmSync(base, { recursive: true, force: true });

const cor = vermelhos === MUTACOES.length ? VERDE : VERMELHO;
console.log(`${cor}${vermelhos} de ${MUTACOES.length} mutações ficaram vermelhas${NORMAL}`);
process.exit(vermelhos === MUTACOES.length ? 0 : 1);
