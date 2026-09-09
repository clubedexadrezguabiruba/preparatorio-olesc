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
 * cor: as brancas jogam nos meios-lances ímpares (o 11º lance branco é o 21º
 * meio-lance), as pretas nos pares (o 11º lance preto é o 22º).
 *
 * **O Base foi de 8 para 11 em 7/9/2026**, e o motivo é medido, não de gosto.
 * O bloco de "cauda de verdade" (seção 21 de `docs/REVISAO-FONTES.md`) trocou
 * cinco linhas de motor por linhas de curso, e as variantes dos cursos não
 * param no lance 8: cortar ali deixava a Alapin e o Gambito Morra terminando
 * com **as brancas um peão à frente**, porque a recaptura `…Bxd6` só acontece
 * no lance 11. Uma linha que acaba com o aluno um peão atrás ensina o
 * contrário do que devia. O 11 é o menor número em que as cinco caem num ponto
 * de material igual ou de plano completo.
 *
 * **E em 8/9/2026 os dois foram para 14, iguais.** A §24 conta a decisão; o
 * resumo é que o teto de 11/12 continuava sendo o teto de quando a régua era
 * "até onde a fonte vai", e a régua mudou: **a abertura acaba quando o aluno
 * rocou e as quatro peças menores saíram**. Medido nas 27 linhas de então:
 * nenhuma fechava esse critério, 17 terminavam com o rei no meio e havia 30
 * peças menores paradas na casa de origem. Um aluno que termina a linha assim
 * não terminou a abertura — decorou um pedaço dela.
 *
 * Os dois níveis são iguais **de propósito**, e isso também mudou na §24: o
 * Avançado deixou de ser "mais fundo" e passou a ser "os ramos que o Base
 * deixou de lado". Profundidade diferente por nível seria dizer que a abertura
 * acaba mais cedo para quem sabe menos, que é o contrário do que se quer.
 */
export const PROFUNDIDADE: Record<Nivel, number> = { base: 14, avancado: 14 };

/**
 * O piso: nenhuma linha para antes do lance nosso 12.
 *
 * Não é meta de tamanho, é consequência da régua. Contando os lances que uma
 * abertura precisa para rocar e soltar as quatro peças menores — quatro peões
 * de centro e desenvolvimento, dois cavalos, dois bispos, o roque —, doze é o
 * primeiro número em que isso cabe sem apertar. Abaixo dele a linha termina
 * necessariamente com alguém em casa.
 *
 * O teto de 14 é a folga: dois lances a mais para o aluno que precisou gastar
 * um tempo respondendo a alguma coisa. Passou de 14, o que faltou vai escrito
 * num bloco `[%plano]` — ver `lib/repertorio/esquema.ts`.
 */
export const PROFUNDIDADE_MINIMA = 12;

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

/** Quantos meios-lances uma linha daquele nível e daquela cor pode ter. */
export function meiosLances(nivel: Nivel, cor: Cor): number {
  return cor === "brancas" ? PROFUNDIDADE[nivel] * 2 - 1 : PROFUNDIDADE[nivel] * 2;
}

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

    if (!linha.comentarios[String(ultimo)]?.trim()) {
      problemas.push({
        linha: ondeEstou,
        erro: `o último lance ("${linha.sans[ultimo]}") está sem comentário. ` +
          "É o que o aluno lê quando acerta.",
      });
    }

    // NENHUM lance nosso pode ser mudo. A régua do repertório (§1 de
    // `docs/REVISAO-FONTES.md`) é que o aluno aprenda o motivo de cada lance,
    // não a sequência; um lance sem comentário é exatamente o contrário, e o
    // treinador ainda assim o cobra. Até 7/9/2026 este gate olhava só o último
    // lance, e por isso 80 dos 149 lances nossos estavam calados sem que nada
    // reprovasse — a §23 conta a história. Os lances DELE seguem podendo ser
    // mudos: o aluno não os joga, e comentar todos viraria ruído.
    const mudos = linha.meus
      .filter((i) => i !== ultimo && !linha.comentarios[String(i)]?.trim())
      .map((i) => `${Math.floor(i / 2) + 1}${linha.cor === "brancas" ? "." : "..."}${linha.sans[i]}`);
    if (mudos.length > 0) {
      problemas.push({
        linha: ondeEstou,
        erro: `${mudos.length} lance(s) nosso(s) sem comentário: ${mudos.join(", ")}. ` +
          "Todo lance que o aluno tem de jogar precisa dizer por quê.",
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

    // As duas regras do `[%plano]` que são erro DESDE SEMPRE, e não aviso.
    //
    // A diferença com `fechamentosAbertos` é de quem paga o preço. "Esta linha
    // ainda não fecha" é trabalho por fazer, e reprovar a build por isso
    // travaria a própria revisão que vem consertá-lo — por isso é aviso até a
    // Fase 4. Já um plano ERRADO é pior que plano nenhum: ele promete ao aluno
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
  if (linha.meus.length < PROFUNDIDADE_MINIMA) return "aberta";
  const { faltando, declaradas } = pendenciasDe(linha);
  if (faltando.length > 0) return "aberta";
  return declaradas.length === 0 ? "fecha" : "com-plano";
}

/**
 * As linhas que ainda não fecham a régua do término.
 *
 * **Era aviso até 8/9/2026; hoje é ERRO.** Enquanto o conteúdo da §24 estava
 * sendo escrito, uma linha por esticar era a lista de trabalho, e uma build
 * vermelha em cima dela atrapalharia a própria revisão que vinha consertá-la —
 * a mesma escolha que `aberturasInchadas` faz até hoje. No dia em que as 27
 * linhas passaram a fechar, `validarBanco` passou a somar esta lista aos
 * problemas. Agora encurtar uma linha quebra a build, e é isso que impede a
 * régua de se afrouxar sozinha — que foi o que aconteceu com o teto de 8 lances
 * entre a §1 e a §21, sem ninguém decidir nada.
 */
export function fechamentosAbertos(linhas: readonly Linha[]): string[] {
  const abertas: string[] = [];
  for (const linha of linhas) {
    const onde = `${linha.id} (${linha.nome})`;
    if (linha.meus.length < PROFUNDIDADE_MINIMA) {
      abertas.push(
        `${onde}: ${linha.meus.length} lances nossos; o mínimo é ${PROFUNDIDADE_MINIMA} — ` +
          "a abertura só termina com o roque feito e as peças menores fora.",
      );
      continue;
    }
    const { faltando } = pendenciasDe(linha);
    if (faltando.length === 0) continue;
    const emPalavras = faltando.map((c) => (c === "rei" ? "o rei não rocou" : `a peça de ${c} não saiu`));
    abertas.push(
      `${onde}: ${emPalavras.join("; ")}. Ou a linha estica, ou o [%plano] diz por quê.`,
    );
  }
  return abertas;
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

  // A régua do término entrou aqui na Fase 4 da §24, no dia em que as 27 linhas
  // passaram a fechá-la. Enquanto o conteúdo estava sendo escrito ela era aviso,
  // porque uma build vermelha em cima da lista de trabalho travaria a própria
  // revisão que vinha consertá-la. Terminado o trabalho, a escolha se inverte:
  // agora quem encurtar uma linha quebra a build, e é isso que impede a régua de
  // se afrouxar sozinha daqui a seis meses — que foi exatamente o que aconteceu
  // com o teto de 8 lances entre a §1 e a §21, sem ninguém decidir nada.
  problemas.push(...fechamentosAbertos(lido.data));

  if (problemas.length > 0) {
    const lista = problemas.map((p) => `  ${p}`).join("\n");
    throw new Error(`${onde} não passou na conferência:\n${lista}`);
  }
  return lido.data;
}
