import { z } from "zod";
import { chaveDe } from "../tatica/chave.ts";
import { casaEscura } from "./esquema.ts";

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
 * **A régua de tamanho saiu em 16/9/2026, para os 11 repertórios** (decisão do Doug, curso de
 * abertura — `docs/EDITOR-V2-ESPECIFICACAO-FUNCIONAL.md` §21). Não há mais piso de 12 lances nossos,
 * teto de 14, roque nem peças menores fora exigidos: a linha termina onde a fonte a termina. Ficam
 * as três regras que dizem se a linha ensina — termina em lance nosso, todo lance nosso tem
 * comentário, nenhuma linha repetida. O `[%plano]` continua valendo quando existe, e deixa de ser
 * obrigatório.
 *
 * O histórico de 8/9/2026 (a régua do término, §24 de `docs/REVISAO-FONTES.md`) fica no diário e
 * em `scripts/cauda-repertorio.ts`, a ferramenta que esticava as linhas até ela.
 */

/**
 * As casas de origem das peças menores, por cor, com a letra que elas têm na FEN.
 *
 * Só as **menores**: torre e dama não entram na régua. A torre sai pelo roque,
 * que já é cobrado à parte, e a dama de abertura não tem endereço fixo — quem
 * a desenvolve cedo geralmente erra.
 */
export const ORIGENS: Record<Cor, Record<string, string>> = {
  brancas: { b1: "N", g1: "N", c1: "B", f1: "B" },
  pretas: { b8: "n", g8: "n", c8: "b", f8: "b" },
};

/**
 * A posição em cada casa, lida da parte de peças da FEN.
 *
 * Sem `chess.js` de propósito: este arquivo é o contrato de dados, e ele é
 * importado pela tela. Arrastar um motor de xadrez de 100 KB para o navegador
 * só para saber se há um cavalo em b1 seria caro por nada — a primeira parte
 * da FEN já diz isso, e ela está gravada em toda linha.
 */
function pecasDaFen(fen: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const filas = fen.split(" ")[0].split("/");
  for (const [i, fila] of filas.entries()) {
    let coluna = 0;
    for (const c of fila) {
      if (c >= "1" && c <= "8") {
        coluna += Number(c);
        continue;
      }
      mapa.set(`${String.fromCharCode(97 + coluna)}${8 - i}`, c);
      coluna += 1;
    }
  }
  return mapa;
}

/** O que a linha fechou: o rei rocou, e quem ficou na casa de origem. */
export type Fechamento = {
  rocou: boolean;
  /** As casas de origem que ainda têm a peça menor original em cima. */
  emCasa: string[];
};

/**
 * A régua do término, medida na linha pronta.
 *
 * **Roque** é procurado no SAN, não na FEN, e por dois motivos. O primeiro é
 * que a FEN final não distingue "rocou" de "andou com o rei"; o segundo é que
 * ela nem sabe de quem foi o roque — o `O-O` do adversário deixa marca na
 * mesma string. Procurando em `sans` **nos índices de `meus`**, quem rocou é
 * necessariamente o aluno.
 *
 * **Peça em casa** é a FEN mesmo, e a leitura é literal: há um cavalo nosso em
 * b1? Então o cavalo de b1 não saiu. Peça capturada, trocada ou promovida some
 * da casa e conta como resolvida — o objetivo é "não sobrou peça dormindo",
 * não "cada peça andou". O caso de peça que saiu e voltou fica como não
 * resolvido, e isso é o certo: uma peça que voltou para b1 está dormindo
 * igual, e o aluno precisa saber o que fazer com ela.
 *
 * A única confusão possível é uma peça DIFERENTE parar na casa de origem — um
 * cavalo que voltou de d2 para b1, por exemplo. Para a régua tanto faz qual
 * dos dois cavalos é: o que interessa é que há um cavalo dormindo em b1.
 */
export function fechamentoDe(linha: {
  cor: Cor;
  sans: readonly string[];
  meus: readonly number[];
  fenFinal: string;
}): Fechamento {
  const rocou = linha.meus.some((i) => {
    const san = linha.sans[i]?.replace(/[+#!?]+$/, "");
    return san === "O-O" || san === "O-O-O";
  });
  const pecas = pecasDaFen(linha.fenFinal);
  const emCasa = Object.entries(ORIGENS[linha.cor])
    .filter(([casa, letra]) => pecas.get(casa) === letra)
    .map(([casa]) => casa);
  return { rocou, emCasa };
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
    /**
     * A marca **boa** que a fonte deu a um lance nosso da linha, por meio-lance:
     * `!!` ou `!` (`$3` e `$1` chegam aqui já traduzidos). É o que o treino
     * mostra como Brilhante e Ótimo quando o aluno acerta aquele lance.
     *
     * **Opcional, e não `.default({})`**, ao contrário dos vizinhos: o compilador
     * só escreve o campo quando há marca. Com padrão, cada uma das linhas do
     * repertório ganharia um `"marcas": {}` no JSON publicado sem nada ter
     * mudado para o aluno — e o `--check` acusaria os onze arquivos.
     */
    marcas: z.record(z.string(), z.enum(["!!", "!"])).optional(),
    /** O texto do professor, por meio-lance. Redigido do zero, nunca do curso. */
    comentarios: z.record(z.string(), z.string()),
    /**
     * O que a linha **não** fechou até o teto, declarado com motivo.
     *
     * Chave: a casa de origem da peça menor (`c8`) ou `rei`. Só pode existir
     * para peça que ainda está em casa ou rei que não rocou — uma entrada para
     * peça que já saiu é texto velho, e o gate a reprova. Vem do bloco
     * `[%plano]` do PGN; ver `lib/repertorio/esquema.ts`.
     *
     * `.default({})` porque os construtores à mão — os testes, e todo JSON
     * escrito antes de 8/9/2026 — não têm o campo, e um `.strict()` sem
     * padrão os quebraria todos de uma vez sem nenhum ganho.
     */
    plano: z
      .record(
        z.string(),
        z.object({ casa: z.string().nullable(), motivo: z.string().min(25) }),
      )
      .default({}),
    /** Proveniência. Obrigatória: nenhum lance entra sem dizer de onde veio. */
    fonte: z.string().min(3),
    /**
     * De que tipo é a linha no move trainer (16/9/2026): arma, esquema, golpe, defesa… Vem da tag
     * `[Categoria]` do PGN gerado a partir do estudo; o seletor agrupa por ela. Opcional, e sem
     * padrão, pelo mesmo motivo de `marcas`: as aberturas sem estudo não ganham um campo vazio.
     */
    categoria: z.enum(["arma", "esquema", "preparacao", "golpe", "nao-funciona", "defesa", "linha-critica", "desvio", "se-esquecer", "arvore"]).optional(),
    /**
     * A ordem em que a linha **nova** chega ao aluno (regra 15): a do estudo. Sem trava — revisão
     * vencida pode entrar no meio. Tag `[Ordem]` do PGN gerado.
     */
    ordem: z.number().int().positive().optional(),
  })
  .strict();

export type Linha = z.infer<typeof LinhaSchema>;

export const BancoSchema = z.array(LinhaSchema);

/**
 * Uma abertura no `index.json`: o que a lista de `/aberturas` precisa saber
 * **sem abrir os doze arquivos**.
 *
 * O `linhas` é a contagem, e existe para a barrinha de progresso: com ele a
 * lista faz doze barras lendo um arquivo só. O `arquivo` é URL a partir da raiz
 * do site (`/repertorio/brancas/petroff.json`), porque quem primeiro o leu foi
 * o navegador; o servidor tira o `/repertorio/` da frente para chegar ao
 * caminho em disco (ver `lib/repertorio/banco.ts`).
 *
 * O `ids` é a **lista de quem existe**, e é por causa dela que a contagem de
 * progresso não precisa adivinhar. O id de uma linha é o hash dos lances, então
 * uma linha reescrita deixa no banco um registro que ninguém mais alcança;
 * contar por prefixo de texto (`brancas-escocesa-`) contaria esse fantasma, e a
 * tela mostraria "3 de 2". Com o `ids` aqui, a lista continua fazendo doze
 * barras lendo um arquivo só — e conta certo.
 *
 * ## Por que `idsAvancado` existe, e por que ele é um SUBCONJUNTO de `ids`
 *
 * Acrescentado em 7/9/2026. Até então o campo `nivel` de cada linha **não
 * chegava à tela**: este schema é `.strict()` e não tinha onde carregá-lo, então
 * marcar uma linha como `avancado` não a escondia de ninguém. O sintoma era
 * concreto — `brancas-caro-kann-428a7cce` (base, `6.h3`) e
 * `brancas-caro-kann-d2337d9b` (avançado, `6.Bf4`) ensinam lances **diferentes
 * na mesma posição**, e o aluno treinava os dois sem saber por quê.
 *
 * É subconjunto, e não uma segunda lista paralela, por causa de
 * `lib/repertorio/banco.test.ts`: ele exige `linhas === tamanho do arquivo`.
 * Separar em duas listas obrigaria `linhas` a contar só o Base, e aí o teste que
 * pega "alguém apagou uma linha do JSON e esqueceu o índice" pararia de pegar.
 * Assim `ids` continua sendo tudo que existe, `linhas` continua batendo com o
 * arquivo, e quem quer só o Base filtra — ver `idsLiberados` em `treino.ts`.
 */
export const EntradaDoIndiceSchema = z
  .object({
    cor: z.enum(CORES),
    abertura: z.string().regex(/^[a-z0-9-]+$/),
    nome: z.string().min(3),
    linhas: z.number().int().positive(),
    ids: z.array(z.string().regex(/^(brancas|pretas)-[a-z0-9-]+-[0-9a-f]{8}$/)).nonempty(),
    /** Os ids de `ids` que são do Avançado. Vazio quando a abertura é toda Base. */
    idsAvancado: z.array(z.string().regex(/^(brancas|pretas)-[a-z0-9-]+-[0-9a-f]{8}$/)),
    arquivo: z.string().regex(/^\/repertorio\/(brancas|pretas)\/[a-z0-9-]+\.json$/),
  })
  .strict()
  // Dois campos dizendo a mesma coisa podem divergir, e divergiriam calados: a
  // barra usa `linhas` e a conta usa `ids`, então a tela mostraria denominador
  // de um e numerador do outro.
  .refine((e) => e.linhas === e.ids.length, {
    message: "`linhas` e o tamanho de `ids` têm de bater",
    path: ["linhas"],
  })
  // Um id de Avançado fora de `ids` seria uma linha trancada que não existe: a
  // tela subtrairia do total um id que nunca esteve lá, e a barra do Base ficaria
  // com denominador menor do que o número de linhas que o aluno vê.
  .refine((e) => e.idsAvancado.every((id) => e.ids.includes(id)), {
    message: "`idsAvancado` tem id que não está em `ids`",
    path: ["idsAvancado"],
  });

export const IndiceSchema = z.array(EntradaDoIndiceSchema);

export type EntradaDoIndice = z.infer<typeof EntradaDoIndiceSchema>;

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

    // Comentário é opcional em qualquer lance, nosso ou dele, no meio ou no fim
    // da linha — nem erro nem aviso. Decisão do Doug, 17/9/2026, para os 11
    // repertórios: o move trainer é a última etapa, e o porquê de cada lance o
    // aluno já ouviu antes dele. De 7/9 a 17/9 todo lance nosso tinha de ser
    // comentado (§23 de `docs/REVISAO-FONTES.md`), e antes disso o último.
    // As telas já tratam a falta: sem texto, a caixa do comentário não aparece.

    // As regras do `[%plano]`, quando ele existe. Desde 16/9/2026 ele não é
    // obrigatório — a régua de tamanho saiu —, mas um plano ERRADO continua
    // pior que plano nenhum: ele promete ao aluno
    // uma casa para uma peça que já saiu, ou um roque que já aconteceu. Isso
    // nunca é trabalho em andamento; é texto velho que sobrou, e o único jeito
    // de ele não chegar à tela é reprovar na hora.
    const fechamento = fechamentoDe(linha);
    for (const [chave, entrada] of Object.entries(linha.plano)) {
      const onde = `[%plano] ${chave}`;
      if (entrada.motivo.trim().length < 25) {
        problemas.push({
          linha: ondeEstou,
          erro: `${onde}: o motivo tem ${entrada.motivo.trim().length} caracteres. ` +
            "Um plano sem motivo escrito é o mesmo que linha curta com desculpa.",
        });
      }

      if (chave === "rei") {
        if (fechamento.rocou) {
          problemas.push({
            linha: ondeEstou,
            erro: `${onde}: a linha já roca ("${linha.sans[linha.meus.find((i) => /^O-O/.test(linha.sans[i] ?? "")) ?? 0]}"), ` +
              "então o plano do rei é texto velho — some com ele.",
          });
        }
        continue;
      }

      if (!ORIGENS[linha.cor][chave]) {
        problemas.push({
          linha: ondeEstou,
          erro: `${onde}: "${chave}" não é casa de peça menor das ${linha.cor}. ` +
            `As que valem são ${Object.keys(ORIGENS[linha.cor]).join(", ")} e "rei".`,
        });
        continue;
      }
      if (!fechamento.emCasa.includes(chave)) {
        problemas.push({
          linha: ondeEstou,
          erro: `${onde}: a peça de ${chave} já saiu no fim da linha — ` +
            "o plano promete ao aluno uma coisa que ele acabou de fazer.",
        });
        continue;
      }
      if (entrada.casa === chave) {
        problemas.push({ linha: ondeEstou, erro: `${onde}: o destino é a própria casa de origem.` });
      }
      if (ORIGENS[linha.cor][chave].toUpperCase() === "B" && entrada.casa) {
        if (casaEscura(entrada.casa) !== casaEscura(chave)) {
          problemas.push({
            linha: ondeEstou,
            erro: `${onde}: o bispo de ${chave} anda em casas ${casaEscura(chave) ? "escuras" : "claras"} ` +
              `e ${entrada.casa} é ${casaEscura(entrada.casa) ? "escura" : "clara"} — ele nunca chega lá.`,
          });
        }
      }
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
/** O que falta a uma linha para fechar, já descontado o que o plano declara. */
export function pendenciasDe(linha: Linha): { faltando: string[]; declaradas: string[] } {
  const { rocou, emCasa } = fechamentoDe(linha);
  const tudo = [...(rocou ? [] : ["rei"]), ...emCasa];
  return {
    faltando: tudo.filter((chave) => !linha.plano[chave]),
    declaradas: tudo.filter((chave) => linha.plano[chave]),
  };
}

/** Como a linha termina: fechada no tabuleiro, fechada por promessa, ou aberta. */
export type Estado = "fecha" | "com-plano" | "aberta";

export function estadoDe(linha: Linha): Estado {
  const { faltando, declaradas } = pendenciasDe(linha);
  if (faltando.length > 0) return "aberta";
  return declaradas.length === 0 ? "fecha" : "com-plano";
}

/** O placar que o compilador imprime a cada rodada, mesmo quando reprova. */
export function placarDeFechamento(linhas: readonly Linha[]): string {
  let fecham = 0;
  let comPlano = 0;
  let semRoque = 0;
  let menoresEmCasa = 0;
  for (const linha of linhas) {
    const estado = estadoDe(linha);
    if (estado === "fecha") fecham += 1;
    else if (estado === "com-plano") comPlano += 1;
    else {
      const { faltando } = pendenciasDe(linha);
      if (faltando.includes("rei")) semRoque += 1;
      menoresEmCasa += faltando.filter((c) => c !== "rei").length;
    }
  }
  const abertas = linhas.length - fecham - comPlano;
  return (
    `Fechamento: ${fecham} de ${linhas.length} fecham na linha; ` +
    `${comPlano} fecham com [%plano]; ` +
    `${abertas} abertas (${semRoque} sem roque, ${menoresEmCasa} menores em casa).`
  );
}

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

  const problemas = conferirRegras(lido.data).map((p) => `${p.linha}: ${p.erro}`);

  if (problemas.length > 0) {
    const lista = problemas.map((p) => `  ${p}`).join("\n");
    throw new Error(`${onde} não passou na conferência:\n${lista}`);
  }
  return lido.data;
}
