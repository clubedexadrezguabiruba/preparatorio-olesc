import { z } from "zod";
import { chaveDe } from "../tatica/chave.ts";

/**
 * O contrato de dados do repertório: o que o treinador de linhas vai ler.
 *
 * **Uma linha é um caminho da raiz até uma ponta da árvore.** O arquivo PGN é
 * uma árvore (um jogo com variantes entre parênteses) porque as linhas dividem
 * os primeiros lances; o JSON que o celular baixa é a lista de caminhos, já
 * expandida, porque a tela não deve reexpandir árvore a cada aluno.
 *
 * O schema roda no `npm test` e no compilador. Estourar ali é o comportamento
 * certo — a mesma regra de `validarTarefas`: uma linha torta que passa pela
 * conferência vira, no sábado, um aluno cobrado por um lance errado.
 */

export const CORES = ["brancas", "pretas"] as const;
export const NIVEIS = ["base", "avancado"] as const;

export type Cor = (typeof CORES)[number];
export type Nivel = (typeof NIVEIS)[number];

/**
 * Até que lance **nosso** cada nível vai.
 *
 * Contado em lances nossos, não em meios-lances, e isto é correção de um erro
 * do plano. O plano trazia três números para a mesma coisa — "até o lance 8"
 * no texto, "16 meios-lances" no importador, "≤ 24" no validador — e o de 16
 * é aritmeticamente incompatível com a regra "toda linha termina num lance
 * nosso": numa árvore das brancas o 16º meio-lance é **das pretas**. Medido
 * antes de corrigir: 24 das 25 linhas da Escocesa terminavam no adversário
 * depois da poda.
 *
 * Contando em lance nosso o número é um só, e os meios-lances saem dele por
 * cor: as brancas jogam nos meios-lances ímpares (o 8º lance branco é o 15º
 * meio-lance), as pretas nos pares (o 8º lance preto é o 16º).
 */
export const PROFUNDIDADE: Record<Nivel, number> = { base: 8, avancado: 12 };

/** Quantos meios-lances uma linha daquele nível e daquela cor pode ter. */
export function meiosLances(nivel: Nivel, cor: Cor): number {
  return cor === "brancas" ? PROFUNDIDADE[nivel] * 2 - 1 : PROFUNDIDADE[nivel] * 2;
}

/**
 * O id de uma linha, derivado dos lances dela.
 *
 * **Por que hash e não número em sequência.** O id vai para
 * `repertorio_progresso.linha` no banco, na tarefa seguinte. Numerado em
 * sequência (`…-0007`), inserir uma linha no meio renumera todas as de baixo —
 * e o progresso de quem já treinou passa a apontar para outra linha, sem erro
 * nenhum. `lib\tarefas\tarefas.ts` já documenta o mesmo problema para as
 * tarefas de casa.
 *
 * Derivado dos lances, o id **muda quando a linha muda** — que é o
 * comportamento certo: linha diferente é linha nova, e o aluno recomeça nela.
 * Mexer no comentário ou no nome não mexe no id, e o progresso fica.
 */
export function idDaLinha(cor: Cor, abertura: string, lances: readonly string[]): string {
  return `${cor}-${abertura}-${chaveDe(lances.join(" ")).toString(16).padStart(8, "0")}`;
}

const Meia = z.number().int().min(0);

export const LinhaSchema = z
  .object({
    id: z.string().regex(/^(brancas|pretas)-[a-z0-9-]+-[0-9a-f]{8}$/, "id fora do padrão"),
    cor: z.enum(CORES),
    abertura: z.string().regex(/^[a-z0-9-]+$/, "a abertura é o nome do arquivo, minúsculo"),
    nivel: z.enum(NIVEIS),
    /** O que o aluno lê na lista: "Escocesa — 4…Bc5 5.Nb3". */
    nome: z.string().min(3),
    fenInicial: z.string().min(10),
    fenFinal: z.string().min(10),
    /** Os lances em UCI (`e2e4`), que é o que a tela compara. */
    lances: z.array(z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)).min(1),
    /** Os mesmos lances em SAN canônico da chess.js, para mostrar e imprimir. */
    sans: z.array(z.string().min(2)).min(1),
    /** Os índices de `lances` em que quem joga é **o aluno**. */
    meus: z.array(Meia).min(1),
    /**
     * Outros lances nossos que o treinador aceita sem cobrar, por meio-lance.
     * Só entram irmãos que o autor marcou como bons — ver `arvore.ts`.
     */
    alternativas: z.record(z.string(), z.array(z.string())).default({}),
    /**
     * Lances nossos que a fonte mostra **de propósito como errados**, por
     * meio-lance. Nunca são aceitos; existem para o treinador dar o aviso certo
     * quando o aluno cai neles, em vez de só dizer "errado". Guardar isto é o
     * que impede que `6.Qd5?` — que o Krikor mostra para ensinar que é ruim —
     * vire resposta certa por ser irmão do lance principal.
     */
    errosNomeados: z.record(z.string(), z.array(z.string())).default({}),
    /** O texto do professor, por meio-lance. Redigido do zero, nunca do curso. */
    comentarios: z.record(z.string(), z.string()),
    /** Proveniência. Obrigatória: nenhum lance entra sem dizer de onde veio. */
    fonte: z.string().min(3),
  })
  .strict();

export type Linha = z.infer<typeof LinhaSchema>;

export const BancoSchema = z.array(LinhaSchema);

/** O que a conferência achou de errado, sem estourar no meio. */
export type Problema = { linha: string; erro: string };

/**
 * As regras que o schema não alcança, porque olham a linha inteira ou o banco
 * inteiro. Devolve a lista de problemas; quem estoura é `validarBanco`.
 */
export function conferirRegras(linhas: readonly Linha[]): Problema[] {
  const problemas: Problema[] = [];
  /** sequência de lances → id de quem a usou primeiro. */
  const sequencias = new Map<string, string>();
  const ids = new Set<string>();

  for (const linha of linhas) {
    const ondeEstou = `${linha.id} (${linha.nome})`;
    const ultimo = linha.lances.length - 1;

    if (linha.sans.length !== linha.lances.length) {
      problemas.push({
        linha: ondeEstou,
        erro: `${linha.lances.length} lances em UCI e ${linha.sans.length} em SAN`,
      });
    }

    // A regra central. Uma linha que termina no lance do adversário deixaria o
    // aluno esperando um lance que ele não vai jogar — e, pior, ensinaria a
    // posição sem ensinar a resposta.
    if (!linha.meus.includes(ultimo)) {
      problemas.push({
        linha: ondeEstou,
        erro: `termina em "${linha.sans[ultimo]}", que é lance do adversário. ` +
          "Toda linha tem de terminar num lance nosso.",
      });
    }

    if (!linha.comentarios[String(ultimo)]?.trim()) {
      problemas.push({
        linha: ondeEstou,
        erro: `o último lance ("${linha.sans[ultimo]}") está sem comentário. ` +
          "É o que o aluno lê quando acerta.",
      });
    }

    const teto = meiosLances(linha.nivel, linha.cor);
    if (linha.lances.length > teto) {
      problemas.push({
        linha: ondeEstou,
        erro: `${linha.lances.length} meios-lances; o nível ${linha.nivel} das ` +
          `${linha.cor} vai até ${teto} (lance ${PROFUNDIDADE[linha.nivel]}).`,
      });
    }

    for (const i of linha.meus) {
      if (i >= linha.lances.length) {
        problemas.push({ linha: ondeEstou, erro: `"meus" aponta para o meio-lance ${i}, que não existe` });
      }
    }
    for (const chave of Object.keys(linha.comentarios)) {
      if (Number(chave) >= linha.lances.length) {
        problemas.push({ linha: ondeEstou, erro: `há comentário no meio-lance ${chave}, que não existe` });
      }
    }

    if (linha.id !== idDaLinha(linha.cor, linha.abertura, linha.lances)) {
      problemas.push({ linha: ondeEstou, erro: "o id não bate com os lances da linha" });
    }

    const sequencia = linha.lances.join(" ");
    const jaVi = sequencias.get(sequencia);
    if (jaVi) problemas.push({ linha: ondeEstou, erro: `é a mesma sequência de lances de ${jaVi}` });
    else sequencias.set(sequencia, linha.id);

    // Id repetido com lances diferentes é colisão de hash — improvável, e por
    // isso mesmo tem de estourar em vez de virar duas linhas com um progresso só.
    if (ids.has(linha.id)) problemas.push({ linha: ondeEstou, erro: "id repetido" });
    ids.add(linha.id);
  }

  return problemas;
}

/**
 * Quais aberturas passaram de 40 linhas.
 *
 * **Aviso, não erro.** O teto de 40 é a meta pedagógica do Base inteiro, não um
 * limite técnico; quem corta é o professor olhando a frequência do explorer, e
 * uma build que reprova por isso no meio de uma revisão atrapalharia mais do
 * que ajuda.
 */
export function aberturasInchadas(linhas: readonly Linha[], teto = 40): string[] {
  const conta = new Map<string, number>();
  for (const l of linhas) conta.set(l.abertura, (conta.get(l.abertura) ?? 0) + 1);
  return [...conta].filter(([, n]) => n > teto).map(([a, n]) => `${a}: ${n} linhas (teto ${teto})`);
}

/** Confere o banco inteiro e devolve as linhas, ou estoura com o que achou. */
export function validarBanco(dados: unknown, onde = "o banco de linhas"): Linha[] {
  const lido = BancoSchema.safeParse(dados);
  if (!lido.success) {
    const problemas = lido.error.issues.map((i) => `  ${onde} [${i.path.join(".")}]: ${i.message}`);
    throw new Error(`${onde} não passou na conferência:\n${problemas.join("\n")}`);
  }

  const problemas = conferirRegras(lido.data);
  if (problemas.length > 0) {
    const lista = problemas.map((p) => `  ${p.linha}: ${p.erro}`).join("\n");
    throw new Error(`${onde} não passou na conferência:\n${lista}`);
  }
  return lido.data;
}
