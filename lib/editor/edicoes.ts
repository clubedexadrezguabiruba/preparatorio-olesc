/**
 * A cirurgia no JSON da aula: mudar um pedaço sem mexer no resto.
 *
 * ## A promessa que estas funções guardam
 *
 * O arquivo da N1-KPK tem 547 linhas. Trocar uma fala tem de deixar no
 * `git diff` **uma linha**, e não o arquivo inteiro reescrito — senão o diff
 * deixa de dizer o que o professor mudou, que é a única maneira de revisar o
 * trabalho dele depois.
 *
 * Por isso nada aqui passa pelo Zod. `lessonSchema.parse()` devolve as chaves
 * na ordem do **schema**, não na do arquivo; o Zod é o juiz do editor, nunca o
 * escritor. Estas funções recebem e devolvem o JSON cru, e a técnica é o
 * espalhamento (`{...obj, campo: novo}`), que preserva a posição de uma chave
 * que já existe e só acrescenta no fim as que não existiam.
 *
 * Elas moram em `lib/` e não dentro do componente porque são a garantia central
 * do editor, e garantia central se cobra por teste.
 */

/**
 * O carimbo do professor: **data, sem hora**.
 *
 * Com hora, cada salvamento mudaria os bytes do rascunho e o `git diff` de uma
 * aula tocada e destocada no mesmo dia mostraria uma linha de ruído. Com data,
 * um dia de trabalho é um carimbo só.
 *
 * O aluno não vê nada disto: o campo existe para o professor saber, meses
 * depois, que aquela fala saiu da tela e não do livro. A voz da casa é a de um
 * professor que não fala do sistema.
 */
export function comCarimbo(cru: Record<string, unknown>): Record<string, unknown> {
  const hoje = new Date().toISOString().slice(0, 10);
  const atual = cru.professor as { adaptouEm?: string } | undefined;
  if (atual?.adaptouEm === hoje) return cru;
  return { ...cru, professor: { ...atual, adaptouEm: hoje } };
}

/**
 * Troca a fala de um passo, preservando a ordem das chaves.
 *
 * A propagação por espalhamento (`{...obj, campo: novo}`) mantém a posição de
 * uma chave que já existe — e é isso que faz o `git diff` da aula mostrar uma
 * linha em vez do arquivo inteiro.
 */
export function comFala(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  passo: number,
  texto: string,
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  if (etapa === "intro") {
    const intro = stages.intro as { passos: Array<Record<string, unknown>> };
    const passos = intro.passos.map((p, i) => (i === passo ? { ...p, fala: texto } : p));
    return { ...cru, stages: { ...stages, intro: { ...intro, passos } } };
  }
  const objective = stages.objective as { roteiro: Array<Record<string, unknown>> };
  const roteiro = objective.roteiro.map((p, i) => (i === passo ? { ...p, fala: texto } : p));
  return { ...cru, stages: { ...stages, objective: { ...objective, roteiro } } };
}

/**
 * O passo cru de uma etapa — o objeto do arquivo, não o do Zod.
 *
 * Devolve `null` no índice que ainda não existe (o professor acabou de apagar
 * um diagrama, e a remontagem ainda não aconteceu): o tabuleiro fica sem
 * desenho por um quadro, em vez de a tela explodir.
 */
export function passoCru(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  passo: number,
): { arrows?: [string, string][]; highlights?: string[] } | null {
  const stages = cru.stages as Record<string, unknown> | undefined;
  const etapaCrua = stages?.[etapa] as Record<string, unknown> | undefined;
  const lista = (etapa === "intro" ? etapaCrua?.passos : etapaCrua?.roteiro) as
    | Array<Record<string, unknown>>
    | undefined;
  return (lista?.[passo] as { arrows?: [string, string][]; highlights?: string[] }) ?? null;
}

/**
 * Grava o desenho de um passo, preservando a ordem das chaves **e** a ausência.
 *
 * Duas coisas acontecem aqui, e as duas importam para o `git diff`:
 *
 * - Uma chave que já existia (`arrows`, por exemplo) é substituída **no lugar
 *   dela**, e não removida e reposta no fim.
 * - Uma chave que o desenho novo não tem é **omitida**, não zerada. É a regra
 *   do `desenhoSchema`: lista vazia é inválida, e a ausência é o jeito de dizer
 *   "sem desenho".
 */
export function comDesenho(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  passo: number,
  desenho: { arrows?: [string, string][]; highlights?: string[] },
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  const etapaCrua = stages[etapa] as Record<string, unknown>;
  const chaveDaLista = etapa === "intro" ? "passos" : "roteiro";
  const lista = etapaCrua[chaveDaLista] as Array<Record<string, unknown>>;

  const nova = lista.map((p, i) => {
    if (i !== passo) return p;
    const saida: Record<string, unknown> = {};
    for (const [chave, valor] of Object.entries(p)) {
      if (chave === "arrows" || chave === "highlights") {
        if (desenho[chave] !== undefined) saida[chave] = desenho[chave];
        continue;
      }
      saida[chave] = valor;
    }
    // As que não existiam no passo entram no fim, na ordem do schema.
    if (desenho.arrows !== undefined && !("arrows" in saida)) saida.arrows = desenho.arrows;
    if (desenho.highlights !== undefined && !("highlights" in saida)) {
      saida.highlights = desenho.highlights;
    }
    return saida;
  });

  return { ...cru, stages: { ...stages, [etapa]: { ...etapaCrua, [chaveDaLista]: nova } } };
}

export function comTecnica(
  cru: Record<string, unknown>,
  campo: "name" | "summary",
  texto: string,
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  const objective = stages.objective as { technique: Record<string, unknown> };
  return {
    ...cru,
    stages: {
      ...stages,
      objective: { ...objective, technique: { ...objective.technique, [campo]: texto } },
    },
  };
}
