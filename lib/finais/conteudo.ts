import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
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

/** Os ids de aula que existem em `content/lessons/`, em ordem alfabética. */
export function idsDeAula(): string[] {
  return varrer(AULAS).map((arquivo) => path.basename(arquivo, ".json"));
}

/** A aula, validada, ou `null` se o id não existe. */
export function lerAula(id: string): Lesson | null {
  const arquivo = path.join(AULAS, `${id}.json`);
  // O id vem da rota, e rota é entrada de fora: barrar caminho para fora da
  // pasta (`../../etc/passwd`) é obrigação, não zelo.
  if (!arquivo.startsWith(AULAS + path.sep) || !existsSync(arquivo)) return null;
  return lessonSchema.parse(lerJson(arquivo));
}

/** A aula e suas posições, ou `null` se o id não existe. */
export function lerPacote(id: string): PacoteDeAula | null {
  const lesson = lerAula(id);
  if (!lesson) return null;

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

/**
 * O cabeçalho de cada aula — o que a lista de `/finais` precisa.
 *
 * **Devolve rascunho junto, de propósito.** Quem decide o que o aluno enxerga é
 * a trilha (`lib/finais/trilha.ts`, no bloco B4): aula aberta é a que está na
 * trilha, tem `status: "published"` e teve o sábado dela chegado. Enquanto a
 * trilha não existe, esta lista é a bancada de conferência do professor, e
 * esconder o rascunho aqui só esconderia o que ele precisa abrir para revisar.
 * O `status` vai junto para a tela poder dizê-lo em voz alta.
 */
export function indiceDeAulas(): Array<{
  id: string;
  titulo: string;
  etapas: number;
  status: Lesson["status"];
}> {
  return idsDeAula()
    .map((id) => lessonSchema.parse(lerJson(path.join(AULAS, `${id}.json`))))
    .map((aula) => ({
      id: aula.id,
      titulo: aula.title,
      etapas: Object.keys(aula.stages).length,
      status: aula.status,
    }));
}
