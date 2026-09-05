import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Chess } from "chess.js";
import { Tablebase, winningMovesOf } from "./tablebase.ts";

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
  aplicar: (dir: string) => Promise<string>;
};

function lerAula(dir: string, id = "N0-R-MATE") {
  const file = path.join(dir, "lessons", `${id}.json`);
  return { file, json: JSON.parse(readFileSync(file, "utf8")) };
}
function lerPosicao(dir: string, id: string) {
  const file = path.join(dir, "positions", "N0", `${id}.json`);
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

/** A posição de ensino da aula — a que a maior parte das mutações estraga. */
const ENSINO = "pos-n0-rmate-rogers-xvi";

type Variante = { reply: string; next: string };

type ExpectDaAula = {
  moves: string[];
  reply?: string;
  next?: string;
  replies?: Variante[];
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
      const { file, json } = lerPosicao(dir, ENSINO);
      json.fen = "8/8/8/1k6/1K6/8/8/R7 w - - 0 1";
      gravar(file, json);
      return "fen → 8/8/8/1k6/1K6/8/8/R7 (rei branco em b4, colado no preto em b5)";
    },
  },
  {
    titulo: "resultado esperado errado",
    codigo: "RESULTADO_ERRADO",
    aplicar: async (dir) => {
      const { file, json } = lerPosicao(dir, ENSINO);
      json.expectedResult = "draw";
      gravar(file, json);
      return 'expectedResult → "draw" numa posição que a tablebase dá como ganha';
    },
  },
  {
    titulo: "campo de proveniência faltando",
    codigo: "SCHEMA_POSICAO",
    contem: "fenMethod",
    aplicar: async (dir) => {
      const { file, json } = lerPosicao(dir, ENSINO);
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
      const posicao = lerPosicao(dir, ENSINO);
      posicao.json.status = "candidate";
      gravar(posicao.file, posicao.json);
      const { file, json } = lerAula(dir);
      json.status = "published";
      gravar(file, json);
      return `status da aula → "published" com ${ENSINO} rebaixada a "candidate"`;
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
    titulo: "nó terminal sem mate",
    codigo: "TERMINAL_SEM_MATE",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const [id, node] = acharTerminal(json.stages.guided);
      const naoDaMate = node.winningMoves.find((uci: string) => {
        const game = new Chess(node.fen);
        game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
        return !game.isCheckmate();
      });
      node.expects[0].moves = [naoDaMate as string];
      gravar(file, json);
      return `${id}: o lance final vira ${naoDaMate}, que ganha mas não dá mate`;
    },
  },
  {
    titulo: "defensor frouxo (resposta que encurta o mate)",
    codigo: "DEFENSOR_FROUXO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
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
    titulo: "teto de lances impossível na etapa 4",
    codigo: "TETO_IMPOSSIVEL",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      json.stages.solo.moveLimit = 2;
      gravar(file, json);
      return "moveLimit da etapa 4 → 2, numa posição cujo mate mais curto tem 9 lances";
    },
  },
  {
    titulo: "ramo gerado adulterado (expect derivado que a derivação não produz)",
    codigo: "RAMO_DESATUALIZADO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      // Antes do B5 esta mutação APAGAVA um expect gerado da etapa 4. As
      // posições garimpadas não têm nenhum: nelas cada corte é geometricamente
      // único, então o gerador de ramos equivalentes legitimamente não produz
      // nada (`Rg1` em vez de `Ra7`, por exemplo, não separa os dois reis e
      // por isso não é corte). O estrago agora entra pelo outro lado — um
      // expect marcado como gerado que a derivação NÃO produz — e continua
      // cobrando exatamente a mesma regra: o que é derivado não se escreve à
      // mão. Quando alguma posição futura voltar a render ramo equivalente,
      // vale acrescentar de novo a versão que apaga.
      const [id, node] = Object.entries(json.stages.solo.nodes)[0] as [
        string,
        { fen: string; winningMoves: string[]; expects: Array<Record<string, unknown>> },
      ];
      const game = new Chess(node.fen);
      const outro = game
        .moves({ verbose: true })
        .map((m) => `${m.from}${m.to}`)
        .find((uci) => node.winningMoves.includes(uci) && !node.expects.some((e) => (e.moves as string[]).includes(uci)));
      node.expects.push({ moves: [outro], feedback: "ramo forjado à mão", generated: true });
      gravar(file, json);
      return (
        `${id}: acrescentado à mão um expect com generated:true para ${outro}, ` +
        "que o gerador não deriva — como faria quem editasse o JSON sem rodar o gerador"
      );
    },
  },
  {
    titulo: "posição citando obra que não está no registro",
    codigo: "OBRA_NAO_REGISTRADA",
    aplicar: async (dir) => {
      promover(dir, ENSINO, "dvoretsky-endgame-manual.pdf");
      return (
        'pos-...-fx-a promovida a "candidate" com os 9 campos preenchidos, mas ' +
        'editionFile → "dvoretsky-endgame-manual.pdf", obra ausente de content/sources.json'
      );
    },
  },
  {
    titulo: "teto de citação furado (3 posições da mesma obra protegida numa aula)",
    codigo: "TETO_DE_CITACAO",
    aplicar: async (dir) => {
      for (const id of [ENSINO, "pos-n0-rmate-capablanca-ex1", "pos-n0-rmate-staunton-d2"]) {
        promover(dir, id, "silman-complete-endgame-course.pdf");
      }
      return (
        "as posições das etapas 1–4 e 5 promovidas a \"candidate\", todas saindo do Silman — " +
        "3 posições de uma obra protegida na mesma aula, contra o teto de 2 da §12.7"
      );
    },
  },
  {
    titulo: "lance do exemplo que joga a vitória fora",
    codigo: "EXEMPLO_NAO_GANHA",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const tablebase = new Tablebase(path.join(dir, "tablebase-cache"), true);
      // Procurado, não fixado à mão: o primeiro lance das brancas que tenha uma
      // alternativa que **não** ganha. No fim de um KRK não existe: com o rei
      // preto no canto e a torre longe, todo lance legal continua ganhando —
      // e foi tentando o último lance primeiro que isso apareceu.
      //
      // Trocado o lance, o resto da linha vira ilegal, então a cena é cortada
      // ali. Isso faz sair junto um EXEMPLO_SEM_MATE, que é a consequência
      // honesta do mesmo estrago: um lance que joga a vitória fora não termina
      // em mate. A mutação continua vermelha pelo código que ela cobra.
      const cena = [...json.stages.example.scenes].sort(
        (a: { steps: unknown[] }, b: { steps: unknown[] }) => b.steps.length - a.steps.length,
      )[0];
      const game = new Chess(lerPosicao(dir, cena.positionId).json.fen);
      for (const [i, step] of (cena.steps as Array<{ move: string }>).entries()) {
        if (game.turn() === "w") {
          const ganhadores = new Set(winningMovesOf(await tablebase.lookup(game.fen())));
          const joga = game
            .moves({ verbose: true })
            .map((m) => `${m.from}${m.to}`)
            .find((uci) => !ganhadores.has(uci));
          if (joga) {
            const antes = step.move;
            cena.steps = cena.steps.slice(0, i + 1);
            cena.steps[i].move = joga;
            cena.phases = (cena.phases ?? []).filter(
              (f: { fromStep: number }) => f.fromStep <= cena.steps.length,
            );
            gravar(file, json);
            return (
              `cena "${cena.id}": o lance ${i + 1} (${antes}) vira ${joga}, que não ganha, ` +
              "e a linha é cortada ali — o EXEMPLO_SEM_MATE que sai junto é consequência do mesmo estrago"
            );
          }
        }
        game.move({ from: step.move.slice(0, 2), to: step.move.slice(2, 4) });
      }
      throw new Error("nenhum lance das brancas na cena tem alternativa perdedora");
    },
  },
  {
    titulo: "cena de vitória que para antes do mate",
    codigo: "EXEMPLO_SEM_MATE",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      // A cena mais curta é a do "como termina" — cortar o último lance dela é
      // exatamente o defeito que a etapa 2 tinha antes desta reforma: mostrar o
      // caminho e não mostrar o fim.
      const cena = [...json.stages.example.scenes].sort(
        (a: { steps: unknown[] }, b: { steps: unknown[] }) => a.steps.length - b.steps.length,
      )[0];
      const cortado = cena.steps.pop();
      gravar(file, json);
      return `cena "${cena.id}": o lance de mate (${cortado.move}) some, e a linha para um lance antes`;
    },
  },
  {
    titulo: "passo do objetivo que o exemplo não mostra",
    codigo: "REGRA_SEM_FASE",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      // Renomear a fase, e não apagá-la, é o estrago realista: alguém melhora
      // o texto de um lado e esquece o outro, e as duas listas passam a
      // parecer duas técnicas diferentes.
      const cena = json.stages.example.scenes.find((s: { phases?: unknown[] }) => s.phases);
      const antes = cena.phases[0].title;
      cena.phases[0].title = `${antes} (rev. 2)`;
      gravar(file, json);
      return `a fase 1 da cena "${cena.id}" vira "${antes} (rev. 2)" e deixa de casar com a regra do objetivo`;
    },
  },
  {
    titulo: "livro-base declarado que não é o de nenhuma cena",
    codigo: "FONTE_DIDATICA_DIVERGE",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir);
      const antes = json.stages.objective.source;
      json.stages.objective.source = "silman-endgame-course";
      gravar(file, json);
      return (
        `objective.source: "${antes}" → "silman-endgame-course", obra didática registrada ` +
        "mas de onde não sai nenhuma cena do exemplo"
      );
    },
  },
  {
    // Só testável a partir da segunda aula: com uma aula só no repositório, nenhuma
    // obra pode ser livro-base de duas. Entrou junto com a N0-Q-MATE.
    titulo: "mesma obra protegida como livro-base de duas aulas do mesmo nível",
    codigo: "FONTE_DIDATICA_DOMINA",
    aplicar: async (dir) => {
      // O estrago realista é escolher, para as duas aulas, o livro que já fornece uma
      // cena a cada uma: assim a `FONTE_DIDATICA_DIVERGE` fica satisfeita e só a regra
      // da rotação reclama — que é exatamente o que a mutação quer provar.
      const alvo = "pandolfini-endgame-course";
      const r = lerAula(dir, "N0-R-MATE");
      const q = lerAula(dir, "N0-Q-MATE");
      const antesR = r.json.stages.objective.source;
      const antesQ = q.json.stages.objective.source;
      r.json.stages.objective.source = alvo;
      q.json.stages.objective.source = alvo;
      gravar(r.file, r.json);
      gravar(q.file, q.json);
      return (
        `livro-base das duas aulas de N0 vira "${alvo}" ("${antesR}" na R-MATE, ` +
        `"${antesQ}" na Q-MATE) — a rotação pede uma obra protegida por nível`
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
      node.mistakes = [...(node.mistakes ?? []), { moves: [roteiro], errorId: "rei-distante" }];
      gravar(file, json);
      return `${id}: ${roteiro} é o lance do roteiro e entra também em mistakes`;
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
      const { json } = lerAula(dir, "N0-R-MATE");
      json.stages.objective.rules[0].text = "";
      gravarRascunhoDeAula(dir, "N0-R-MATE", json);
      return (
        "rascunhos/lessons/N0-R-MATE.json com o texto da regra 1 vazio — " +
        "o arquivo publicado continua intacto"
      );
    },
  },
  {
    // O acoplamento que o painel resolve num gesto, provado pelo lado de fora:
    // renomear a regra do objetivo sem renomear a fase da cena deixa o
    // objetivo prometendo um passo que o exemplo não mostra.
    titulo: "rascunho com a regra renomeada e a fase não",
    codigo: "REGRA_SEM_FASE",
    flags: ["--rascunhos"],
    aplicar: async (dir) => {
      const { json } = lerAula(dir, "N0-R-MATE");
      const antes = json.stages.objective.rules[0].title;
      json.stages.objective.rules[0].title = `${antes} (só na regra)`;
      gravarRascunhoDeAula(dir, "N0-R-MATE", json);
      return `no rascunho a regra 1 vira "${antes} (só na regra)"; a fase da cena continua "${antes}"`;
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
      const { json } = lerAula(dir, "N0-R-MATE");
      mkdirSync(path.join(dir, "rascunhos"), { recursive: true });
      gravar(path.join(dir, "rascunhos", "N0-R-MATE.json"), json);
      return "rascunhos/N0-R-MATE.json, um degrau acima de rascunhos/lessons/";
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
      const { json } = lerAula(dir, "N0-R-MATE");
      gravarRascunhoDeAula(dir, "N0-R-MATE", json);
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
      const { json } = lerAula(dir, "N0-R-MATE");
      json.title = "título que nunca deveria ser aprovado por engano";
      gravarRascunhoDeAula(dir, "N0-R-MATE", json);
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
      const { json } = lerPosicao(dir, ENSINO);
      json.fen = "8/8/8/1k6/1K6/8/8/R7 w - - 0 1";
      const pasta = path.join(dir, "rascunhos", "positions", "N0");
      mkdirSync(pasta, { recursive: true });
      gravar(path.join(pasta, `${ENSINO}.json`), json);
      return (
        `rascunhos/positions/N0/${ENSINO}.json com os reis em b4 e b5 — ` +
        "o arquivo publicado continua legal"
      );
    },
  },
  {
    // B8.4: trocar a posição de uma etapa de árvore **não** apaga a árvore.
    // Ela fica órfã, e é o gate que recusa — que é exatamente o que o painel
    // avisa antes de deixar trocar.
    titulo: "posição da etapa 4 trocada com a árvore velha de pé",
    codigo: "FEN_DO_NO",
    aplicar: async (dir) => {
      const { file, json } = lerAula(dir, "N0-R-MATE");
      const antes = json.stages.solo.positionId;
      const outra = json.stages.guided.positionId;
      json.stages.solo.positionId = outra;
      gravar(file, json);
      return `stages.solo.positionId: "${antes}" → "${outra}", e a árvore de ${antes} fica de pé`;
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

function linhasDoCodigo(saida: string, codigo: string): string[] {
  const linhas = saida.split(/\r?\n/);
  const encontradas: string[] = [];
  for (const [i, linha] of linhas.entries()) {
    if (!limpar(linha).includes(`[${codigo}]`)) continue;
    const cabeca = limpar(linha).replace(/^\s*✖\s*/, "").trim();
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
console.log("");

for (const [i, mutacao] of MUTACOES.entries()) {
  const dir = path.join(base, `m${i + 1}`);
  cpSync(source, dir, { recursive: true });
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
