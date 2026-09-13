/**
 * A aula v1 e a aula v2 ensinam a mesma coisa? (plano final §14 e especificação §20.3)
 *
 * ## Por que existe, se o adaptador já tem teste
 *
 * Os testes do adaptador conferem **contagens** — 13 narrações, 11 lances, 6 perguntas.
 * Contagem não vê o que some dentro de cada item: a N0-LADDER passava por eles e perdia
 * todos os desenhos do roteiro, as pausas de `espera` e o resumo da técnica, e o validador
 * dizia 0 problemas. Converter uma aula de verdade com esse buraco apagaria trabalho do
 * professor no instante em que ele clicasse "converter", sem nenhum alarme.
 *
 * ## O que é "equivalente"
 *
 * É o que o **aluno** recebe, e não a forma do arquivo — a conversão muda o formato por
 * definição (§14: "não tem obrigação de permanecer byte a byte igual. A obrigação é
 * equivalência pedagógica"). Por isso a comparação passa pelas mesmas traduções que o
 * player usa:
 *
 * - o capítulo, pela prévia (`previa.ts`): cada passo com a fala, o lance, o desenho e a
 *   pausa extra, na ordem;
 * - a introdução, quadro a quadro, com a posição resolvida;
 * - o treino, pelo que o `TreeStage` joga (`treino-jogavel.ts`): para **cada lance legal**
 *   de cada pergunta, o veredito que o juiz (`judgeMove`) devolve nas duas aulas — texto,
 *   se ainda ganha, e para onde a linha vai;
 * - a prática, e a ordem das etapas.
 *
 * ## O que ela não compara
 *
 * Ids (a conversão os materializa), a ordem das chaves no arquivo, e o nome interno de um
 * erro do catálogo — o aluno lê o texto e o veredito, não o id.
 */
import { Chess } from "chess.js";
import { judgeMove, respostasDe, type MoveVerdict } from "../lesson/tree.ts";
import type { Lesson, Position, TreeNode } from "../lesson/schema.ts";
import { quadroDoNo } from "./arvore.ts";
import type { AulaV2, DesenhoV2 } from "./modelo.ts";
import { previaDoCapitulo } from "./previa.ts";
import { treinoJogavel } from "./treino-jogavel.ts";

export type DivergenciaV1 = {
  /** Onde, em palavras de professor: "capítulo · passo 3 · desenho". */
  onde: string;
  v1: unknown;
  v2: unknown;
};

type DesenhoQualquer = { arrows?: ReadonlyArray<unknown>; highlights?: ReadonlyArray<unknown> } | undefined;

/**
 * Um desenho como lista de marcas legíveis. A forma curta do v1 (`["e2","e4"]`) e a longa
 * do v2 (`{de, para, cor}`) viram a mesma marca quando dizem o mesmo; a cor só entra quando
 * está escrita, porque uma cor que o v1 não tinha é uma diferença de verdade.
 */
export function marcasDoDesenho(desenho: DesenhoQualquer): string[] {
  const marcas: string[] = [];
  for (const seta of desenho?.arrows ?? []) {
    if (Array.isArray(seta)) marcas.push(`seta ${seta[0]}${seta[1]}`);
    else {
      const { de, para, cor } = seta as { de: string; para: string; cor: string };
      marcas.push(`seta ${de}${para} ${cor}`);
    }
  }
  for (const casa of desenho?.highlights ?? []) {
    if (typeof casa === "string") marcas.push(`casa ${casa}`);
    else {
      const { casa: nome, cor } = casa as { casa: string; cor: string };
      marcas.push(`casa ${nome} ${cor}`);
    }
  }
  return marcas;
}

function igual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function legais(fen: string): string[] {
  return new Chess(fen).moves({ verbose: true }).map((lance) => `${lance.from}${lance.to}${lance.promotion ?? ""}`);
}

/**
 * O veredito como o aluno o vive.
 *
 * `method-alternative` e `author-alternative` viram "elogio": a tela trata os dois pelo
 * mesmo predicado (`isPraise`) e a diferença é só de quem escreveu a frase — e a frase
 * entra na comparação. O id do erro nomeado sai: o aluno lê o texto e o veredito.
 */
function vividoPeloAluno(veredito: MoveVerdict, fenDoNo: (id: string) => string | undefined) {
  switch (veredito.kind) {
    case "method":
      return { tipo: "metodo", texto: veredito.feedback, respostas: veredito.respostas.map((r) => ({ lance: r.reply, vaiPara: fenDoNo(r.next) ?? `(nó ${r.next} ausente)` })) };
    case "named-error":
      return { tipo: "erro-nomeado", veredito: veredito.verdict, texto: veredito.text, aindaGanha: veredito.preservesWin };
    case "method-alternative":
    case "author-alternative":
      return { tipo: "elogio", texto: veredito.text };
    default:
      return { tipo: veredito.kind, texto: veredito.text, aindaGanha: veredito.preservesWin };
  }
}

/** Divergências pedagógicas entre a aula v1 e a v2 que diz substituí-la. Vazia = equivalentes. */
export function divergenciasDaMigracaoV1(lesson: Lesson, positions: Record<string, Position>, aula: AulaV2): DivergenciaV1[] {
  const divergencias: DivergenciaV1[] = [];
  const comparar = (onde: string, v1: unknown, v2: unknown) => {
    if (!igual(v1, v2)) divergencias.push({ onde, v1, v2 });
  };
  const etapa = (tipo: AulaV2["fluxo"][number]["tipo"]) => aula.fluxo.find((item) => item.tipo === tipo);

  comparar("título da aula", lesson.title, aula.titulo);

  const tiposV1 = [
    ...(lesson.stages.intro ? ["introducao"] : []),
    ...(lesson.stages.objective ? ["capitulo"] : []),
    ...(lesson.stages.guided ? ["treino"] : []),
    ...(lesson.stages.practice ? ["pratica"] : []),
  ];
  comparar("ordem das etapas", tiposV1, aula.fluxo.map((item) => item.tipo));

  const objective = lesson.stages.objective;
  const posicaoDaAula = objective ? positions[objective.positionId] : undefined;

  // ---- introdução ------------------------------------------------------------------
  const intro = lesson.stages.intro;
  const introducao = aula.introducoes.find((item) => item.id === etapa("introducao")?.entidadeId);
  if (intro || introducao) {
    const v1 = (intro?.passos ?? []).map((passo) => ({
      fala: passo.fala,
      fen: passo.fen ?? posicaoDaAula?.fen,
      desenho: marcasDoDesenho(passo),
    }));
    const v2 = (introducao?.quadros ?? []).map((quadro) => ({
      fala: quadro.texto,
      fen: quadro.posicao.tipo === "fen"
        ? quadro.posicao.fen
        : quadroDoNo(aula, quadro.posicao.origem.analiseId, quadro.posicao.origem.nodeId, positions).fen,
      desenho: marcasDoDesenho(quadro.desenhos),
    }));
    comparar("introdução · número de quadros", v1.length, v2.length);
    v1.forEach((quadro, i) => {
      if (!v2[i]) return;
      comparar(`introdução · quadro ${i + 1} · fala`, quadro.fala, v2[i].fala);
      comparar(`introdução · quadro ${i + 1} · posição`, quadro.fen, v2[i].fen);
      comparar(`introdução · quadro ${i + 1} · desenho`, quadro.desenho, v2[i].desenho);
    });
  }

  // ---- capítulo ----------------------------------------------------------------------
  const capitulo = aula.capitulos.find((item) => item.id === etapa("capitulo")?.entidadeId);
  if (objective || capitulo) {
    comparar("capítulo · existe", Boolean(objective), Boolean(capitulo));
    if (objective && capitulo) {
      comparar("capítulo · nome da técnica", objective.technique.name, capitulo.titulo);
      comparar("capítulo · resumo da técnica", objective.technique.summary, capitulo.resumo);
      comparar("capítulo · orientação", lesson.orientation, capitulo.orientacao);
      const previa = previaDoCapitulo(aula, positions, capitulo.id).trechos[0];
      comparar("capítulo · posição de partida", posicaoDaAula?.fen, previa.fen);
      const v1 = objective.roteiro.map((passo) => ({
        fala: passo.fala,
        lance: passo.lance ?? null,
        desenho: marcasDoDesenho(passo),
        espera: passo.espera ?? 0,
        pausaManual: false,
      }));
      const v2 = previa.passos.map((passo) => ({
        fala: passo.fala,
        lance: passo.lance ?? null,
        desenho: marcasDoDesenho(passo.desenhos),
        espera: passo.esperaMs ?? 0,
        pausaManual: passo.pausaManual,
      }));
      comparar("capítulo · número de passos", v1.length, v2.length);
      v1.forEach((passo, i) => {
        const outro = v2[i];
        if (!outro) return;
        for (const campo of ["fala", "lance", "desenho", "espera", "pausaManual"] as const) {
          comparar(`capítulo · passo ${i + 1} · ${campo}`, passo[campo], outro[campo]);
        }
      });
    }
  }

  // ---- treino --------------------------------------------------------------------------
  const guided = lesson.stages.guided;
  const treino = aula.treinos.find((item) => item.id === etapa("treino")?.entidadeId);
  if (guided || treino) {
    comparar("treino · existe", Boolean(guided), Boolean(treino));
    if (guided && treino) {
      const jogavel = treinoJogavel(aula, treino.id, positions);
      comparar("treino · lado do aluno", lesson.orientation, jogavel.orientacao);
      comparar("treino · objetivo (vitória ou empate)", guided.goal, jogavel.tree.goal);
      comparar("treino · caixa do rei", guided.showBox ?? false, false);
      if (guided.intro) comparar("treino · fala de abertura", guided.intro, jogavel.intro);
      comparar("treino · defensor abre a linha", null, jogavel.defesaInicial ?? null);

      const fenV1 = (id: string) => guided.nodes[id]?.fen;
      const fenV2 = (id: string) => jogavel.tree.nodes[id]?.fen;
      comparar("treino · primeira posição", fenV1(guided.root), fenV2(jogavel.tree.root));

      const v2PorFen = new Map(Object.entries(jogavel.tree.nodes).map(([id, no]) => [no.fen, id]));
      const nomes = Object.keys(guided.nodes);
      comparar("treino · número de perguntas", nomes.length, Object.keys(jogavel.tree.nodes).length);
      nomes.forEach((nomeV1, i) => {
        const noV1: TreeNode = guided.nodes[nomeV1];
        const idV2 = v2PorFen.get(noV1.fen);
        const onde = `treino · pergunta ${i + 1}`;
        if (!idV2) {
          divergencias.push({ onde: `${onde} · posição`, v1: noV1.fen, v2: "(nenhuma pergunta nesta posição)" });
          return;
        }
        const noV2 = jogavel.tree.nodes[idV2];
        comparar(`${onde} · dica`, noV1.hint ?? null, noV2.hint ?? null);
        comparar(`${onde} · desenho`, marcasDoDesenho(noV1), marcasDoDesenho(jogavel.desenhos[idV2] as DesenhoV2 | undefined));
        // O juiz, lance por lance: é o que o aluno vive, e a única conta que pega um texto
        // de reserva trocado ou uma lista de lances vencedores que sumiu.
        const lancesQueDivergem: Array<{ lance: string; v1: unknown; v2: unknown }> = [];
        for (const lance of legais(noV1.fen)) {
          const a = vividoPeloAluno(judgeMove(lesson, noV1, lance), fenV1);
          const b = vividoPeloAluno(judgeMove(jogavel.lesson, noV2, lance), fenV2);
          if (!igual(a, b)) lancesQueDivergem.push({ lance, v1: a, v2: b });
        }
        if (lancesQueDivergem.length) {
          divergencias.push({
            onde: `${onde} · o que o aluno ouve em ${lancesQueDivergem.length} lance(s)`,
            v1: lancesQueDivergem.map((item) => ({ lance: item.lance, ...item.v1 as object })),
            v2: lancesQueDivergem.map((item) => ({ lance: item.lance, ...item.v2 as object })),
          });
        }
        // Os lances esperados precisam da mesma defesa, na mesma ordem: a rotação entre
        // tentativas depende dela.
        comparar(
          `${onde} · respostas do defensor`,
          noV1.expects.map((expect) => respostasDe(expect).map((r) => `${r.reply}→${fenV1(r.next)}`)),
          noV2.expects.map((expect) => respostasDe(expect).map((r) => `${r.reply}→${fenV2(r.next)}`)),
        );
      });
    }
  }

  // ---- prática -----------------------------------------------------------------------------
  const practice = lesson.stages.practice;
  const pratica = aula.praticas.find((item) => item.id === etapa("pratica")?.entidadeId);
  if (practice || pratica) {
    comparar(
      "prática",
      practice ? { positionId: practice.positionId, lado: lesson.orientation, objetivo: practice.goal, engine: practice.engine } : null,
      pratica ? { positionId: pratica.positionId, lado: pratica.ladoAluno, objetivo: pratica.objetivo, engine: pratica.engine } : null,
    );
  }

  return divergencias;
}
