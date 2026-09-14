import type { Linha, Nivel } from "../linhas.ts";

/**
 * O que aplicar uma edição do repertório faz com o curso — §21: "antes de aplicar,
 * compilar candidato e mostrar impacto em IDs/progresso".
 *
 * ## Por que o id é o centro de tudo
 *
 * O id de uma linha é o hash dos lances (`idDaLinha`). Mudar um comentário não muda o
 * id, e o progresso do aluno fica. Mudar um lance — esticar a linha, trocar a resposta,
 * excluir um ramo — **mata** o id antigo e cria um novo: o registro em
 * `repertorio_progresso` continua no banco, mas ninguém mais o alcança, e o aluno
 * recomeça a linha. É o comportamento certo (linha diferente é linha nova), e é por isso
 * mesmo que o professor precisa ver antes.
 *
 * ## O que re-tranca
 *
 * O Avançado abre quando **todas** as linhas do Base estão aprendidas (`baseCompleto`),
 * e o nível 5 e o selo "repertório base" cobram a mesma coisa. Qualquer id do Base que
 * não existia antes — linha nascida, linha **esticada** (id novo, progresso zero) ou linha
 * vinda do Avançado — faz quem já tinha terminado o Base voltar a ter uma linha por
 * aprender: o Avançado se fecha de novo para essa pessoa. O tamanho do Base pode nem mudar.
 *
 * Puro: recebe as linhas de antes e de depois (só as aberturas do arquivo editado) e
 * devolve números e frases. Quantos alunos têm registro nos ids que morrem é pergunta ao
 * banco, e entra de fora (`progresso-que-morre.ts`).
 */

export type LinhaNoImpacto = { id: string; nome: string; nivel: Nivel };

export type ImpactoDoRepertorio = {
  nascem: LinhaNoImpacto[];
  morrem: LinhaNoImpacto[];
  /** Mesmo id (mesmos lances), nível trocado. */
  mudamDeNivel: Array<{ id: string; nome: string; de: Nivel; para: Nivel }>;
  /** Mesmo id, texto que o aluno lê diferente (comentário, plano, nome ou fonte). */
  textoMudou: number;
  /** A ordem das linhas que ficam mudou — muda a ordem da lista e de `proximaLinha`. */
  ordemMudou: boolean;
  base: { antes: number; depois: number };
  avancado: { antes: number; depois: number };
  /** Entrou no Base um id sem progresso: quem já tinha o Base completo perde o Avançado, o nível 5 e o selo. */
  retrancaAvancado: boolean;
  semMudanca: boolean;
};

const resumo = (l: Linha): LinhaNoImpacto => ({ id: l.id, nome: l.nome, nivel: l.nivel });

/** O que o aluno lê de uma linha, fora os lances. */
const textoDaLinha = (l: Linha): string =>
  JSON.stringify([l.nome, l.comentarios, l.plano, l.fonte, l.alternativas, l.errosNomeados, l.marcas ?? {}]);

export function impactoDoRepertorio(antes: readonly Linha[], depois: readonly Linha[]): ImpactoDoRepertorio {
  const porIdAntes = new Map(antes.map((l) => [l.id, l]));
  const porIdDepois = new Map(depois.map((l) => [l.id, l]));

  const nascem = depois.filter((l) => !porIdAntes.has(l.id)).map(resumo);
  const morrem = antes.filter((l) => !porIdDepois.has(l.id)).map(resumo);
  const mudamDeNivel = depois
    .filter((l) => porIdAntes.has(l.id) && porIdAntes.get(l.id)!.nivel !== l.nivel)
    .map((l) => ({ id: l.id, nome: l.nome, de: porIdAntes.get(l.id)!.nivel, para: l.nivel }));
  const textoMudou = depois.filter((l) => porIdAntes.has(l.id) && textoDaLinha(porIdAntes.get(l.id)!) !== textoDaLinha(l)).length;

  const ficamAntes = antes.filter((l) => porIdDepois.has(l.id)).map((l) => l.id);
  const ficamDepois = depois.filter((l) => porIdAntes.has(l.id)).map((l) => l.id);
  const ordemMudou = ficamAntes.join(" ") !== ficamDepois.join(" ");

  const contar = (linhas: readonly Linha[], nivel: Nivel) => linhas.filter((l) => l.nivel === nivel).length;
  const idsBaseAntes = new Set(antes.filter((l) => l.nivel === "base").map((l) => l.id));
  const retrancaAvancado = depois.some((l) => l.nivel === "base" && !idsBaseAntes.has(l.id));

  return {
    nascem,
    morrem,
    mudamDeNivel,
    textoMudou,
    ordemMudou,
    base: { antes: contar(antes, "base"), depois: contar(depois, "base") },
    avancado: { antes: contar(antes, "avancado"), depois: contar(depois, "avancado") },
    retrancaAvancado,
    semMudanca: nascem.length + morrem.length + mudamDeNivel.length + textoMudou === 0 && !ordemMudou,
  };
}

/** Quantos registros de progresso apontam para os ids que morrem. `null`: o banco não respondeu. */
export type ProgressoQueMorre = { registros: number; alunos: number } | null;

const plural = (n: number, um: string, varios: string): string => `${n} ${n === 1 ? um : varios}`;

/** O impacto em frases de professor, na ordem em que importam. */
export function frasesDoImpactoDoRepertorio(impacto: ImpactoDoRepertorio, progresso?: ProgressoQueMorre): string[] {
  if (impacto.semMudanca) return ["Nada muda para o aluno: as linhas, os ids e os textos são os mesmos de hoje."];
  const frases: string[] = [];

  if (impacto.morrem.length > 0) {
    frases.push(
      `${plural(impacto.morrem.length, "linha deixa de existir", "linhas deixam de existir")} como estão hoje: ` +
        `${impacto.morrem.map((l) => l.nome).join("; ")}. Quem treinou ${impacto.morrem.length === 1 ? "essa linha" : "essas linhas"} recomeça do zero.`,
    );
    if (progresso === undefined) {
      // A tela ainda não perguntou ao banco.
    } else if (progresso === null) {
      frases.push("Não deu para contar os alunos com progresso nessas linhas: o banco não respondeu.");
    } else if (progresso.registros === 0) {
      frases.push("Nenhum aluno tem progresso guardado nelas.");
    } else {
      frases.push(
        `${plural(progresso.registros, "registro", "registros")} de ${plural(progresso.alunos, "aluno", "alunos")} ` +
          (progresso.registros === 1 ? "fica guardado no banco, mas nenhuma tela o alcança mais." : "ficam guardados no banco, mas nenhuma tela os alcança mais."),
      );
    }
  }
  if (impacto.nascem.length > 0) {
    frases.push(
      `${plural(impacto.nascem.length, "linha nova entra", "linhas novas entram")}: ` +
        `${impacto.nascem.map((l) => `${l.nome} (${l.nivel === "base" ? "Base" : "Avançado"})`).join("; ")}.`,
    );
  }
  for (const m of impacto.mudamDeNivel) {
    frases.push(`${m.nome} passa do ${m.de === "base" ? "Base" : "Avançado"} para o ${m.para === "base" ? "Base" : "Avançado"}, com o mesmo progresso.`);
  }
  if (impacto.retrancaAvancado) {
    frases.push(
      "Entra no Base uma linha que ninguém aprendeu ainda: quem já tinha terminado o Base volta a ter linha por aprender, e o Avançado, " +
        "o requisito de repertório do nível 5 e o selo do Base se fecham de novo para essa pessoa até ela aprender a nova.",
    );
  }
  if (impacto.textoMudou > 0) {
    frases.push(`${plural(impacto.textoMudou, "linha muda", "linhas mudam")} só no texto que o aluno lê; o progresso nelas fica.`);
  }
  if (impacto.ordemMudou) frases.push("A ordem das linhas na lista da abertura muda.");
  frases.push(`Base: ${impacto.base.antes} → ${impacto.base.depois} linhas. Avançado: ${impacto.avancado.antes} → ${impacto.avancado.depois}.`);
  return frases;
}
