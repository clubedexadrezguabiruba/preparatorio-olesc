import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { aulaDoAlunoV2, type AulaDoAlunoV2 } from "../editor-v2/fluxo-do-aluno.ts";
import type { PacoteV2 } from "../editor-v2/pacote.ts";
import { idsDeAulasV2Ativas, pacoteAtivoDoAluno } from "./conteudo-v2.ts";
import { extrasPublicadas } from "./trilha-em-disco.ts";
import type { AulaDaTrilha } from "./trilha.ts";
import { referencedPositionIds } from "../lesson/refs.ts";
import { lessonSchema, positionSchema, type Lesson, type Position } from "../lesson/schema.ts";

/**
 * A carga das aulas de finais, **do disco, no servidor**.
 *
 * ## Por que aula é arquivo e não linha de banco
 *
 * A regra do projeto para o Supabase é "o banco guarda o que o aluno fez". Uma
 * aula não é isso: é conteúdo do curso, escrito à mão, e o que a torna confiável
 * é ter passado pelo gate (`npm run validate:content`) — que roda sobre
 * arquivos, no CI, antes de qualquer deploy. Uma aula no banco escaparia do
 * gate no dia em que alguém editasse uma linha pelo painel do Supabase.
 *
 * Então as aulas moram em `content/lessons/` e as posições em
 * `content/positions/`, como os puzzles moram em `public/puzzles/`. O
 * `outputFileTracingIncludes` do `next.config.ts` faz a pasta viajar junto na
 * hospedagem — sem ele, a Vercel subiria o servidor sem os arquivos que ele lê
 * por caminho, e a primeira aula aberta responderia `ENOENT`.
 *
 * ## A validação daqui não substitui o gate
 *
 * O schema zod é o mesmo dos dois lados, mas as perguntas são diferentes: o
 * gate confere a **verdade xadrezística** (a tablebase diz que o lance ganha, o
 * nó terminal dá mate, a proveniência existe); aqui se confere só a **forma**,
 * para o motor nunca receber um arquivo torto sem dizer por quê. Um arquivo que
 * passa aqui e não passa no gate é exatamente o que o CI existe para barrar.
 *
 * ## Por que os imports são relativos e com `.ts`
 *
 * O alias `@/` é coisa do bundler do Next. Desde a FN1/B3 este arquivo também
 * roda **fora** do Next: `scripts/verificar-finais.ts` o carrega direto no Node
 * para provar a corrente inteira contra o banco de verdade, e ali o alias não
 * resolve. É a mesma escolha de `lib/tatica/banco.ts`, pelo mesmo motivo.
 */

const RAIZ = path.join(process.cwd(), "content");
const AULAS = path.join(RAIZ, "lessons");
const POSICOES = path.join(RAIZ, "positions");

/** A aula com as posições que ela referencia, pronta para o motor. */
export type PacoteDeAula = {
  lesson: Lesson;
  positions: Record<string, Position>;
};

function lerJson(arquivo: string): unknown {
  return JSON.parse(readFileSync(arquivo, "utf8"));
}

/**
 * Todos os `.json` de uma pasta, em ordem, descendo nas subpastas.
 *
 * As posições são organizadas por nível (`positions/N0/`, `positions/N1/`…), e
 * o nível é organização de autoria, não endereço: quem procura uma posição
 * procura pelo id. Daí varrer em vez de listar.
 */
function varrer(pasta: string): string[] {
  if (!existsSync(pasta)) return [];
  const achados: string[] = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const cheio = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) achados.push(...varrer(cheio));
    else if (entrada.name.endsWith(".json")) achados.push(cheio);
  }
  return achados.sort();
}

function lerPosicoes(): Record<string, Position> {
  const porId: Record<string, Position> = {};
  for (const arquivo of varrer(POSICOES)) {
    const posicao = positionSchema.parse(lerJson(arquivo));
    porId[posicao.id] = posicao;
  }
  return porId;
}

/** Os ids de aula v1 que existem em `content/lessons/`, em ordem alfabética. */
function idsDeAulaV1(): string[] {
  return varrer(AULAS).map((arquivo) => path.basename(arquivo, ".json"));
}

/**
 * Os ids de aula que o aluno pode abrir: as v1 de `content/lessons/` **e** as v2 com
 * publicação ativa (fatia 7). Uma aula que existe nas duas formas aparece uma vez.
 */
export function idsDeAula(): string[] {
  return [...new Set([...idsDeAulaV1(), ...idsDeAulasV2Ativas()])].sort();
}

/**
 * O que o aluno recebe numa aula: a v2 ativa, se houver — **a v2 vence a v1 do mesmo id** —,
 * ou a v1. `null` se o id não existe em nenhuma das duas.
 */
export function lerPacoteDoAluno(id: string):
  | { versao: 1; pacote: PacoteDeAula }
  | { versao: 2; pacote: PacoteV2; aula: AulaDoAlunoV2 }
  | null {
  const v2 = pacoteAtivoDoAluno(id);
  if (v2) return { versao: 2, pacote: v2, aula: aulaDoAlunoV2(v2) };
  const v1 = lerPacote(id);
  return v1 ? { versao: 1, pacote: v1 } : null;
}

/** A aula, validada, ou `null` se o id não existe. */
export function lerAula(id: string): Lesson | null {
  const arquivo = path.join(AULAS, `${id}.json`);
  // O id vem da rota, e rota é entrada de fora: barrar caminho para fora da
  // pasta (`../../etc/passwd`) é obrigação, não zelo.
  if (!arquivo.startsWith(AULAS + path.sep) || !existsSync(arquivo)) return null;
  return lessonSchema.parse(lerJson(arquivo));
}

/**
 * O pacote de uma aula **que já está na mão** — o motor precisa dela com as
 * posições dentro.
 *
 * Existe separada de `lerPacote` por causa do modo editor: lá a aula não vem de
 * `content/lessons/`, vem do rascunho que o professor está escrevendo, e ainda
 * assim precisa das mesmas posições para o player montar.
 */
export function pacoteDaAula(lesson: Lesson): PacoteDeAula {
  const todas = lerPosicoes();
  const positions: Record<string, Position> = {};
  for (const idDaPosicao of referencedPositionIds(lesson)) {
    const posicao = todas[idDaPosicao];
    if (!posicao) {
      // O gate já barraria isto; se chegou aqui, o deploy subiu sem o gate.
      throw new Error(`aula ${lesson.id} referencia a posição inexistente "${idDaPosicao}"`);
    }
    positions[idDaPosicao] = posicao;
  }
  return { lesson, positions };
}

/** A aula e suas posições, ou `null` se o id não existe. */
export function lerPacote(id: string): PacoteDeAula | null {
  const lesson = lerAula(id);
  if (!lesson) return null;
  return pacoteDaAula(lesson);
}

/**
 * O cabeçalho de cada aula — o que a lista de `/finais` precisa.
 *
 * **Devolve rascunho junto, de propósito.** Quem decide o que o aluno enxerga é
 * a trilha (`lib/finais/trilha.ts`): aula aberta é a que está na trilha, tem
 * `status: "published"` e teve o sábado dela chegado. Esta lista é a matéria-
 * prima das duas leituras que a tela faz em cima disso — o conjunto de
 * publicadas (`aulasPublicadas`) e a bancada do professor, onde o rascunho
 * *precisa* aparecer para ser revisado antes do sábado. O `status` vai junto
 * para a tela poder dizê-lo em voz alta.
 */
export function indiceDeAulas(): Array<{
  id: string;
  titulo: string;
  etapas: number;
  /** Tem a etapa 4? É a pergunta que decide o que "aprendida" quer dizer. */
  temPratica: boolean;
  status: Lesson["status"];
}> {
  const v2 = new Set(idsDeAulasV2Ativas());
  return idsDeAula().map((id) => {
    // A v2 ativa vence a v1 do mesmo id (fatia 7): é ela que o aluno abre, e é o fluxo dela
    // que diz quantas etapas há e se há prática. Publicada no v2 é publicada.
    if (v2.has(id)) {
      const pacote = pacoteAtivoDoAluno(id)!;
      return {
        id,
        titulo: pacote.aula.titulo,
        etapas: pacote.aula.fluxo.length,
        temPratica: pacote.aula.praticas.length > 0,
        status: "published" as const,
      };
    }
    const aula = lessonSchema.parse(lerJson(path.join(AULAS, `${id}.json`)));
    return {
      id: aula.id,
      titulo: aula.title,
      etapas: Object.keys(aula.stages).length,
      temPratica: aula.stages.practice !== undefined,
      status: aula.status,
    };
  });
}

/**
 * Os ids das aulas com `status: "published"`.
 *
 * É metade da regra da aula aberta (`lib/finais/trilha.ts`): a trilha diz o que
 * é curso e quando abre, e este conjunto diz o que já passou pelo gate. Sai
 * daqui, e não da trilha, porque quem publica é quem edita o arquivo — a lista
 * de aulas do curso não muda quando uma delas fica pronta.
 */
export function aulasPublicadas(): Set<string> {
  return new Set(indiceDeAulas().filter((a) => a.status === "published").map((a) => a.id));
}

/**
 * Os ids das aulas que têm a etapa 4 — a partida contra a máquina.
 *
 * É o que substituiu a coluna `formato` da trilha, apagada em 9/9/2026 junto
 * com os três formatos. A pergunta que o `aprendeu` faz é uma só — a aula tem
 * prática? —, e a resposta mora no arquivo da aula, e não numa tabela ao lado
 * que pode divergir dele.
 */
/**
 * As aulas extras publicadas (§22 do Editor v2), na forma da trilha: `EX-…` com publicação
 * v2 ativa, nível e classe. Quem pergunta pela trilha passa isto como `extras` —
 * `aulasAbertas`, `fechamentoDoNivel`, o mapa e o painel —, e a extra conta no nível dela.
 */
export function aulasExtras(): AulaDaTrilha[] {
  return extrasPublicadas();
}

export function aulasComPratica(): Set<string> {
  return new Set(indiceDeAulas().filter((a) => a.temPratica).map((a) => a.id));
}
