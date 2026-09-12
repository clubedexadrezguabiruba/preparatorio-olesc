/**
 * Os tetos do Editor v2 — quanto uma aula pode crescer antes de o editor deixar de
 * ser utilizável.
 *
 * ## Por que isto existe antes do importador, e não depois
 *
 * O plano final (§17) é explícito: "limites existem desde a primeira importação…
 * não esperar o último bloco para limitar bytes, número de nós, profundidade,
 * comentários, desenhos e expansão de treino". Um importador sem teto aceita um arquivo de torneio
 * inteiro e derruba a tela **antes** de qualquer aviso aparecer — e o professor fica
 * com uma página branca e nenhuma explicação. Por isso os tetos nascem aqui, e o
 * importador já chega ao mundo com o freio de mão.
 *
 * ## De onde saem os números
 *
 * Não de opinião. `scripts/medir-corpus-v2.ts` mede o corpus do plano — as 3 aulas
 * reais, a linha de 500 meios-lances e a árvore de 1.000 nós — e os tetos foram
 * escolhidos **acima** do que o corpus mede e **dentro** do que o alvo de tempo do
 * plano aguenta. Ampliar um teto é decisão que pede medida nova, não palpite.
 *
 * ## Por que o teto é erro, e por que isso não prende o professor
 *
 * `severidade: "erro"` no v2 significa **impede a publicação**, não "impede salvar":
 * o painel de problemas escreve "impede", e o rascunho continua gravando. É o que o
 * plano (§7) manda — o rascunho aceita pendência identificada, quem exige tudo em
 * ordem é a publicação. Um teto que travasse o salvamento prenderia o professor
 * dentro de um arquivo grande demais para ele conseguir encolher.
 *
 * ## O que estes tetos **não** prometem
 *
 * Não prometem que uma aula abaixo deles é rápida em qualquer máquina: o alvo do
 * plano (interação p95 até 100 ms, abertura da árvore de 1.000 nós até 2 s) é do
 * notebook de referência.
 */
import type { AulaV2, AnaliseV2 } from "./modelo.ts";

/**
 * Os tetos, com o número medido que os justifica.
 *
 * Cada linha responde "por que este número, e não o dobro".
 */
export const LIMITES_V2 = {
  /**
   * Nós numa mesma análise. Medido em 11/09/2026 (Node 24, win32, mediana de 20
   * execuções em processo limpo): abrir a árvore de 1.000 nós custa **290 ms de
   * percurso mais 286 ms de validação**, e a de 2.000 custa **613 mais 603** — pouco
   * mais de 1,2 s, ainda abaixo do alvo de 2 s do plano, e já sem folga para dobrar de
   * novo. É o teto que o importador aplica a um PGN anotado.
   */
  nosPorAnalise: 2000,
  /**
   * Nós na aula inteira, somando as análises. O dobro do teto de uma análise: uma aula
   * pode ter duas árvores grandes — a linha e a refutação —, mas não pode virar um
   * banco de partidas dentro de um arquivo só.
   */
  nosPorAula: 4000,
  /**
   * Profundidade de uma linha, em meios-lances. A fixture do plano tem 500; medida uma
   * linha de **1.000**, ela é percorrida em 348 ms e a recursão em profundidade não
   * chega perto de estourar a pilha. 1.000 meios-lances são 500 lances — o dobro da
   * partida mais longa já registrada em torneio.
   */
  profundidade: 1000,
  /**
   * Bytes do documento salvo. O rascunho é gravado **inteiro** a cada autosave, e o
   * arquivo grande demais faz a escrita atômica competir com a digitação. Medido: a
   * árvore no teto de nós, com um comentário a cada três lances, ocupa **196 KB**.
   * 2 MB são dez vezes isso — só é alcançado por quem cola texto longo em cada lance,
   * que é exatamente o caso que precisa ser avisado.
   */
  bytes: 2 * 1024 * 1024,
  /** Comentários na aula inteira: um por lance da maior aula admitida, e nem um a mais. */
  comentarios: 4000,
  /** Setas e casas pintadas, somadas. Cada desenho é trabalho de render a cada quadro. */
  desenhos: 4000,
  /**
   * Trecho que uma criação de treino pode percorrer. Medido em 12/09/2026 no
   * notebook de referência, Node 24/win32, após uma execução de aquecimento e 20
   * amostras: derivar ambos os lados de 200 meios-lances teve p95 de **67,57 ms**;
   * com 300, o p95 subiu para **222,49 ms**. O teto de 200 mantém a interação
   * abaixo do alvo inicial de 100 ms do plano e ainda produz até 100 perguntas por
   * tarefa (200 no total quando os dois lados são pedidos).
   */
  meiosLancesPorDerivacaoDeTreino: 200,
} as const;

export type MedidasAulaV2 = {
  /** Nós somados de todas as análises, sem contar as raízes. */
  nos: number;
  /** O maior número de nós numa mesma análise. */
  nosNaMaiorAnalise: number;
  /** A linha mais funda da aula, em meios-lances. */
  profundidade: number;
  /** O tamanho do documento salvo, em bytes UTF-8. */
  bytes: number;
  comentarios: number;
  desenhos: number;
};

/** A profundidade da análise, contada sem recursão — árvore funda não pode estourar a pilha. */
function profundidadeDaAnalise(analise: AnaliseV2): number {
  let maior = 0;
  const pilha: Array<{ id: string; nivel: number }> = [{ id: analise.raizId, nivel: 0 }];
  const vistos = new Set<string>();
  while (pilha.length > 0) {
    const { id, nivel } = pilha.pop()!;
    // Um ciclo na árvore é problema de outro portão (`CICLO`); aqui ele só não pode
    // virar laço infinito enquanto a medida é tirada.
    if (vistos.has(id)) continue;
    vistos.add(id);
    if (nivel > maior) maior = nivel;
    for (const filho of analise.nos[id]?.filhos ?? []) pilha.push({ id: filho, nivel: nivel + 1 });
  }
  return maior;
}

/**
 * O tamanho da aula, nas seis dimensões que têm teto.
 *
 * Serve para dois públicos: o validador, que compara com `LIMITES_V2`, e o relatório
 * do importador, que precisa dizer "este PGN tem 1.240 nós" **antes** de aplicar.
 */
export function medidasDaAulaV2(aula: AulaV2): MedidasAulaV2 {
  let nos = 0;
  let nosNaMaiorAnalise = 0;
  let profundidade = 0;
  let comentarios = 0;
  let desenhos = 0;

  for (const analise of aula.analises) {
    const quantidade = Object.keys(analise.nos).length - 1;
    nos += quantidade;
    if (quantidade > nosNaMaiorAnalise) nosNaMaiorAnalise = quantidade;
    const funda = profundidadeDaAnalise(analise);
    if (funda > profundidade) profundidade = funda;
    for (const no of Object.values(analise.nos)) {
      if (no.comentario) comentarios += 1;
      desenhos += (no.desenhos?.arrows?.length ?? 0) + (no.desenhos?.highlights?.length ?? 0);
    }
  }
  for (const introducao of aula.introducoes) {
    for (const quadro of introducao.quadros) desenhos += (quadro.desenhos?.arrows?.length ?? 0) + (quadro.desenhos?.highlights?.length ?? 0);
  }

  // `TextEncoder`, e não `Buffer.byteLength`: este módulo é lido pelo validador, que
  // roda **também no navegador**, onde `Buffer` não existe.
  return { nos, nosNaMaiorAnalise, profundidade, bytes: new TextEncoder().encode(JSON.stringify(aula)).length, comentarios, desenhos };
}

export type ProblemaDeLimiteV2 = {
  codigo: string;
  mensagem: string;
  analiseId?: string;
  campo?: string;
};

/**
 * Os tetos estourados, em vocabulário de professor.
 *
 * A mensagem sempre traz **os dois números** — o que a aula tem e o que cabe. "Aula
 * grande demais" não diz ao professor se ele precisa cortar dois lances ou duzentos.
 */
export function problemasDeLimiteV2(aula: AulaV2, medidas = medidasDaAulaV2(aula)): ProblemaDeLimiteV2[] {
  const problemas: ProblemaDeLimiteV2[] = [];

  for (const analise of aula.analises) {
    const quantidade = Object.keys(analise.nos).length - 1;
    if (quantidade > LIMITES_V2.nosPorAnalise) problemas.push({ codigo: "LIMITE_NOS_ANALISE", mensagem: `esta análise tem ${quantidade} lances e o limite é ${LIMITES_V2.nosPorAnalise}`, analiseId: analise.id });
    const funda = profundidadeDaAnalise(analise);
    if (funda > LIMITES_V2.profundidade) problemas.push({ codigo: "LIMITE_PROFUNDIDADE", mensagem: `esta análise tem uma linha de ${funda} meios-lances e o limite é ${LIMITES_V2.profundidade}`, analiseId: analise.id });
  }
  if (medidas.nos > LIMITES_V2.nosPorAula) problemas.push({ codigo: "LIMITE_NOS_AULA", mensagem: `a aula tem ${medidas.nos} lances somando as análises e o limite é ${LIMITES_V2.nosPorAula}`, campo: "analises" });
  if (medidas.bytes > LIMITES_V2.bytes) problemas.push({ codigo: "LIMITE_BYTES", mensagem: `a aula ocupa ${Math.round(medidas.bytes / 1024)} KB e o limite é ${Math.round(LIMITES_V2.bytes / 1024)} KB`, campo: "aula" });
  if (medidas.comentarios > LIMITES_V2.comentarios) problemas.push({ codigo: "LIMITE_COMENTARIOS", mensagem: `a aula tem ${medidas.comentarios} comentários e o limite é ${LIMITES_V2.comentarios}`, campo: "analises" });
  if (medidas.desenhos > LIMITES_V2.desenhos) problemas.push({ codigo: "LIMITE_DESENHOS", mensagem: `a aula tem ${medidas.desenhos} setas e casas pintadas, e o limite é ${LIMITES_V2.desenhos}`, campo: "analises" });

  return problemas;
}
