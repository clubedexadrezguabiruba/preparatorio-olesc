import { z } from "zod";
import { AfirmacaoSchema } from "./afirmacoes.ts";
import { Chess } from "chess.js";
import { MAPA } from "./exercicios.ts";
import { juizDaDica, uciDe } from "./lances.ts";
import { porta1 } from "./portas.ts";
import { NIVEIS } from "../curso/trilha.ts";

/**
 * As dicas de meio-jogo: o módulo que faltava entre a abertura e o final.
 *
 * ## Por que "dica", e não "aula"
 *
 * Porque meio-jogo **não tem juiz de máquina**. As aulas de finais são
 * certificadas pela tablebase Syzygy, que para em 7 peças; uma posição de
 * meio-jogo tem 20 e mais, e ali não existe "o lance certo" conferível — existe
 * o plano que o livro ensina. Chamar isso de aula, com prática contra o
 * computador e selo de domínio, seria vender como fato o que é julgamento.
 *
 * Então a dica é: uma técnica em uma frase, um "o que procurar", de uma a três
 * posições com proveniência, um quiz de plano cujo juiz é **o autor** (e isso
 * está escrito na tela), e um vídeo gratuito. O aluno declara que leu, como na
 * aula de leitura — e pelo mesmo motivo: não há o que reconferir.
 *
 * ## As fontes, pela política que já existe
 *
 * Posição é fato e entra com proveniência; prosa é 100% nossa. Domínio público
 * primeiro (Capablanca 1921 é o que a `content/sources.json` já registra), e
 * obra protegida sob o teto de 2 posições por dica, como nas aulas. Curso pago
 * não entra — nem como fonte de posição, nem como link.
 *
 * ## O esquema mora aqui, a leitura do arquivo mora fora
 *
 * Como em `lib/tatica/temas.ts`: este arquivo só sabe conferir um objeto. O
 * teste lê o JSON do disco e chama `validarDicas`; o site importa o JSON do
 * jeito do Next (`lib/meiojogo/conteudo.ts`) e chama a mesma função.
 */

const NIVEIS_VALIDOS = NIVEIS.map((n) => n.id) as [string, ...string[]];

/**
 * A proveniência de uma posição de meio-jogo.
 *
 * É a mesma ideia dos nove campos de `lib/lesson/schema.ts`, reduzida ao que
 * uma posição sem tablebase pode afirmar: de onde ela veio, de que obra, e o
 * que foi conferido. `editionFile` tem de casar com uma obra registrada em
 * `content/sources.json` — quem cobra isso é o gate.
 */
export const ProvenienciaSchema = z
  .object({
    /** A obra, a página e o diagrama, em prosa. */
    bibliographicSource: z.string().min(10),
    /**
     * A mesma citação em **uma linha**, e é ela que fica embaixo do diagrama.
     *
     * O teto de 90 é medido, não escolhido: os `bibliographicSource` das 30
     * dicas têm 204 caracteres de média e 765 de proveniência inteira, o que
     * punha ~17 linhas de letra miúda entre o tabuleiro e o primeiro parágrafo
     * da explicação num celular de 360 px. Nenhum dos 30 cabia em 90.
     *
     * A proveniência inteira não sai da página: ela desce para o `<details>` do
     * pé, onde continua aberta para o professor que abrir a dica no sábado. O
     * que muda é **onde**, não **se**.
     */
    citacaoCurta: z.string().min(10).max(90),
    /** O arquivo (ou slug) da obra em `content/sources.json`. */
    editionFile: z.string().min(3),
    /**
     * O capítulo ou seção de onde a posição saiu — **a unidade do teto de
     * citação no meio-jogo**.
     *
     * `PROTECTED_SOURCE_CAP` contava obra: no máximo duas posições da mesma
     * obra protegida por aula/dica. No meio-jogo o teto passa a contar
     * **capítulo**, por decisão editorial de 2026-09-07 (§3.1 do plano). O
     * raciocínio inteiro está em `content/sources.json`, e o resumo é: o que a
     * Lei 9.610 protege num livro de xadrez é o texto, as anotações e a
     * seleção/organização da coletânea (art. 7º, XIII) — não o arranjo das
     * peças. A FEN é fato. O que **é** reprodução de curadoria é esvaziar os
     * diagramas de um capítulo, e é isso que o teto novo mede.
     *
     * `null` é para fonte sem capítulo: partida do recorte CC0 do Lichess, ou
     * posição composta pela autoria. O gate recusa `null` quando a obra citada
     * tem PDF na biblioteca — livro sem capítulo é teto que não se cobra.
     */
    capitulo: z.string().min(4).nullable().default(null),
    /** A partida original, quando a posição vem de uma. */
    originalGame: z.string().min(3).nullable().default(null),
    /** Como a FEN foi obtida, e o que foi conferido. */
    fenMethod: z.string().min(10),
  })
  .strict();

export const PosicaoDaDicaSchema = z
  .object({
    fen: z
      .string()
      .regex(
        /^\S+ [wb] \S+ \S+ \d+ \d+$/,
        "a FEN precisa dos seis campos (posição, vez, roques, en passant, meios-lances, lance)",
      ),
    /**
     * A legenda, que é o que o aluno lê embaixo do diagrama.
     *
     * **Ela só pode afirmar, como fato, o que `afirma` mede.** Julgamento
     * ("o plano é atacar a base") vai para `explicacao` e `quiz`, onde a tela
     * diz que o juiz é o autor. O porquê está em `lib/meiojogo/afirmacoes.ts`.
     */
    legenda: z.string().min(10),
    /**
     * O que a legenda afirma, em forma conferível por chess.js.
     *
     * `.min(1)`: uma posição sem afirmação nenhuma é uma posição cuja legenda
     * ninguém mediu — e é exatamente esse silêncio que o campo existe para
     * impedir. A conferência roda no `npm test` e no gate de conteúdo.
     */
    afirma: z.array(AfirmacaoSchema).min(1),
    provenance: ProvenienciaSchema,
  })
  .strict();

const CASA = z.string().regex(/^[a-h][1-8]$/, "casa no formato `e4`");

/**
 * Um passo da explicação, com o que ele acende no tabuleiro.
 *
 * ## Por que o realce é autoral, e por que ele é pequeno
 *
 * A prosa das 30 dicas é escrita em notação algébrica — 29 delas citam casa ou
 * lance, 4,5 referências por dica, 136 no total — e o tabuleiro não acompanhava
 * nada disso: nada na tela ligava "d5" à casa d5.
 *
 * A saída **não** é extrair as 136 com uma expressão regular. Um passo que cita
 * seis casas para dizer que uma delas importa acenderia as seis, e o aluno de
 * doze anos que abre a dica pela primeira vez leria um tabuleiro pintado —
 * carga maior, não menor. Quem escreve o passo diz o que ele cita, e o teto de
 * quatro casas é o que impede a tentação de acender tudo.
 *
 * Passo sem realce nenhum é estado previsto: o passo que fala do plano, e não
 * de uma casa, não tem o que acender.
 */
export const PassoSchema = z
  .object({
    texto: z.string().min(20),
    realce: z.array(CASA).max(4).default([]),
  })
  .strict();

export const QuizSchema = z
  .object({
    pergunta: z.string().min(10),
    /** Três planos plausíveis. Duas seriam sorteio; quatro não cabem no celular. */
    opcoes: z.array(z.string().min(3)).length(3),
    /** O índice da certa, de 0 a 2. */
    certa: z.number().int().min(0).max(2),
    /** Por que ela é a certa — é isto que ensina, não o acerto. */
    porque: z.string().min(20),
  })
  .strict();

/* ------------------------------------------------------------------ *
 * O treino — os degraus 2, 3 e 4
 * ------------------------------------------------------------------ */

/**
 * A sequência de exercícios de um conceito, e por que ela não é mais uma
 * posição na lista `posicoes`.
 *
 * `posicoes` é o **ensino**: o diagrama que o autor escolheu, com legenda que
 * afirma e explicação que explica. Um item de treino é o contrário disso —
 * existe para o aluno achar sozinho o que a legenda do ensino entrega de
 * graça. Misturar os dois no mesmo campo obrigaria cada leitor a saber, de
 * cabeça, qual posição pode aparecer com o traço já nomeado embaixo e qual
 * não. Daí dois campos.
 *
 * ## O juiz do item é o mesmo que vai julgar o clique
 *
 * Um item de reconhecimento **não** é conferido por `afirma`, e sim por
 * `respostaDaTarefa(fen, tarefa, lado)` — a função de
 * `lib/meiojogo/exercicios.ts` que o Bloco 4 vai chamar quando o aluno tocar
 * numa casa. O gate compara a resposta escrita no conteúdo com a que o juiz
 * devolve, e reprova a diferença.
 *
 * Isso é mais forte que legenda conferida, e prova a coisa que mais importa:
 * que o item tem **uma** resposta. `respostaDaTarefa` devolve vazio quando o
 * traço não existe **ou** quando existe duas vezes, e nos dois casos a posição
 * não pode virar item — é a diferença entre um exercício e um aluno que acerta
 * e é recusado.
 *
 * ## Os degraus, e o que cada um exige da fonte
 *
 * | degrau | o que é | fonte | por quê |
 * |---|---|---|---|
 * | 1 | o exemplo | `posicoes`, já existe | é o que o autor escolheu para ensinar |
 * | 2 | reconhecimento guiado, ×2 | **livro**, obra diferente da do exemplo | traço encenado é o certo enquanto há apoio |
 * | 3 | reconhecimento independente, ×1 | **partida real CC0** | traço não encenado é o que prova reconhecimento |
 * | 4 | aplicação guiada | **a posição do degrau 3**, pergunta mais funda | trocar posição e pergunta ao mesmo tempo são duas mudanças |
 *
 * O degrau 5 e as reservas são pós-piloto (§5 do plano); `reservas` já existe
 * como campo, e vazio é o estado correto dele hoje.
 */

/** Um dos três níveis da escada de apoio, na ordem em que o aluno os pede. */
export const ApoioSchema = z
  .object({
    /**
     * Nível 1 — a pergunta que reorganiza a busca, sem entregar nada.
     *
     * "Olhe coluna por coluna: quais têm peão do mesmo lado vizinho?" O aluno
     * que lê isso ainda tem todo o trabalho pela frente; o que ele ganhou foi
     * uma ordem para fazê-lo.
     */
    convite: z.string().min(20),
    /**
     * Qual dos dois formatos de apoio este é.
     *
     * Há dois jeitos honestos de estreitar o campo, e eles são opostos:
     *
     * - **`contem`** — acende um conjunto que **inclui** a resposta e é maior
     *   que ela. "Toque no peão sem vizinho" com os seis peões pretos acesos: a
     *   resposta está ali dentro, e ainda há o que decidir.
     * - **`contorno`** — acende o que **define** a resposta por ausência, e não
     *   a toca. "Ache a coluna sem peão nenhum" com todos os peões acesos: o vão
     *   é a resposta, e acendê-lo seria entregá-la.
     *
     * Sem este campo, a conferência teria de escolher uma das duas regras e
     * chamar a outra de defeito. `coluna-aberta` responde com as oito casas da
     * coluna, e um realce que a contivesse e fosse maior não cabe no teto de 8 —
     * a regra do `contem` tornaria a tarefa inexequível.
     */
    modo: z.enum(["contem", "contorno"]),
    /**
     * Nível 2 — as casas que a tela acende para estreitar o campo.
     *
     * O teto é 8, e não os 4 de {@link PassoSchema}, porque o trabalho é outro:
     * lá o realce acompanha uma frase, e acender demais vira tabuleiro pintado;
     * aqui ele **é** o apoio, e "os peões pretos" podem ser seis.
     */
    realce: z.array(CASA).min(1).max(8),
    /** Nível 3 — a solução explicada. Depois dela o item não conta como sem apoio. */
    solucao: z.string().min(20),
  })
  .strict();

/** O teto de salto da porta 2, em centésimos de peão — o mesmo do funil. */
export const SALTO_DA_PORTA_2 = 100;

/**
 * O registro dos seis passos da curadoria (§6 do plano), por posição.
 *
 * Três dos seis já estão gravados em outro lugar e não se repetem aqui: o
 * candidato e a origem estão no `provenance`, a legalidade da posição é
 * conferida pela `chess.js` no gate, e a pergunta escrita é o resto do item. O
 * que sobra são os dois que **só existem se alguém os escrever** — e as duas
 * portas, que são número.
 */
export const CuradoriaSchema = z
  .object({
    /** Passo 3 — por que o tema é aplicável **nesta** posição, para este aluno. */
    perceptivel: z.string().min(30),
    /**
     * Passo 4 — as portas do funil, medidas nesta posição.
     *
     * Só o resultado aprovado é representável, e é de propósito: uma posição
     * que reprova numa porta não vira item, então não há o que escrever. O
     * `salto` é o que o Stockfish mediu entre as duas melhores linhas, e o teto
     * é o {@link SALTO_DA_PORTA_2} do funil.
     */
    portas: z
      .object({
        porta1: z.literal("passou"),
        profundidade: z.number().int().min(10),
        salto: z.number().int().min(0).max(SALTO_DA_PORTA_2),
        /**
         * O que **cada lance aceito** custa, em centésimos, na ordem de
         * `lancesAceitos` — a regra dura do plano, gravada.
         *
         * Um número por lance, e não um por posição: a torre que ocupa a coluna
         * aberta pela casa segura e a que a ocupa pendurando são dois lances do
         * mesmo tema na mesma posição, e só um deles pode entrar na lista. Sem
         * a coluna, o gate teria de acreditar que quem escreveu mediu os dois.
         *
         * Negativo é normal e não é defeito: o motor pode avaliar a posição
         * depois do lance um pouco melhor do que avaliou a linha principal
         * antes dele, na mesma profundidade. É ruído de busca, e o teto que
         * importa é o de cima.
         */
        custos: z
          .array(z.number().int().min(-SALTO_DA_PORTA_2).max(SALTO_DA_PORTA_2))
          .min(1),
      })
      .strict(),
    /** Passo 6 — por que ela serve a um aluno de 12 a 15 anos vendo isto pela primeira vez. */
    adequacao: z.string().min(30),
  })
  .strict();

const LANCE = z
  .string()
  .regex(/^[a-h][1-8][a-h][1-8][nbrq]?$/, "o lance é UCI: `f1d1`, e `e7e8q` quando promove");

/** O piso e o alvo de exercícios por dica (§6 do plano). */
export const EXERCICIOS_PISO = 2;
export const EXERCICIOS_ALVO = 5;

/**
 * Um exercício: a posição, e os lances que aplicam o tema nela.
 *
 * ## Por que o id não tem degrau
 *
 * `m12-d2-a` dizia, no próprio id, que aquele item era "guiado". Com dois a
 * cinco exercícios a escada de apoio fica disponível em **todos**, e quem
 * separa quem resolveu sozinho de quem pediu ajuda é a coluna `apoio` do
 * registro, que já existe e já grava o nível. Um degrau declarado no id era uma
 * promessa sobre o aluno; a coluna é o que ele fez.
 *
 * ## As três camadas do juiz, e o que cada item tem de carregar
 *
 * | camada | quem decide os lances | o que o item escreve |
 * |---|---|---|
 * | geométrica | `lancesQueAplicam`, das `grupos()` que já existem | nada além da FEN — o gate confere que o escrito é o calculado |
 * | autoral | quem escreveu o item | `porqueAceitos`, obrigatório |
 * | motor | Stockfish, na curadoria | `curadoria.portas.custos`, um por lance |
 *
 * A camada do motor vale para as três: **todo** lance aceito tem de ser são.
 */
export const ItemDeLanceSchema = z
  .object({
    /** `m9-a`. Dica e letra, e nada mais — ver acima por que o degrau saiu. */
    id: z.string().regex(/^m[0-9]+-[a-e]$/, "o id é `m9-a`: a dica, um hífen e uma letra"),
    fen: z
      .string()
      .regex(
        /^\S+ [wb] \S+ \S+ \d+ \d+$/,
        "a FEN precisa dos seis campos (posição, vez, roques, en passant, meios-lances, lance)",
      ),
    /**
     * O argumento `lado` do juiz — e não "o lado do aluno".
     *
     * As tarefas não têm a mesma perspectiva, e fingir que têm produziria itens
     * invertidos. `peao-isolado` recebe o dono do peão; `peao-na-semiaberta`
     * recebe quem **não** tem peão na coluna. Quem joga o lance sai do
     * `quemJoga` do juiz, e a vez da FEN tem de ser a dele — o gate cobra.
     */
    lado: z.enum(["brancas", "pretas"]),
    /** A tarefa de `lib/meiojogo/exercicios.ts`, que é também o id do juiz de lance. */
    tarefa: z.string().min(3),
    /**
     * Os lances aceitos, em UCI.
     *
     * Todos os que aplicam o tema e são sãos, e não o que o autor tinha em
     * mente: recusar Tad1 e aceitar Tfd1 porque ele pensou numa só ensina o
     * aluno a adivinhar o site.
     */
    lancesAceitos: z.array(LANCE).min(1),
    /**
     * Por que estes lances, quando quem os escolheu foi uma pessoa — ou `null`
     * quando o juiz geométrico os calcula sozinho.
     *
     * O gate cobra os dois lados: obrigatório quando o juiz não confirma a
     * lista, proibido quando confirma. Uma justificativa escrita ao lado de uma
     * lista que a máquina deriva é uma justificativa que ninguém vai reler
     * quando a máquina mudar de ideia.
     */
    porqueAceitos: z.string().min(30).nullable().default(null),
    /**
     * Os lances que **aplicam o tema e o motor reprovou**, com o custo de cada.
     *
     * A lista existe para uma frase só, e é a frase que separa este exercício
     * de um exercício que mente. O aluno que leva a torre para a coluna aberta
     * pendurando-a fez exatamente o que a dica manda — e perde a partida. Sem
     * esta lista a tela lhe diria "esse não é o lance desta dica", que é falso;
     * com ela, diz "é o lance da dica, mas aqui ele custa caro", que é a aula.
     *
     * O gate cobra que `lancesAceitos` mais estes cubram **todo** lance que o
     * juiz geométrico devolve: nenhum lance do tema pode sumir em silêncio.
     */
    lancesRecusados: z
      .array(
        z
          .object({
            lance: LANCE,
            /** Fora do teto dos aceitos, e é por isso que ele foi recusado. */
            custo: z.number().int(),
          })
          .strict(),
      )
      .default([]),
    /**
     * A legenda do item — que é a legenda que **não** pode entregar o lance.
     *
     * Aqui a regra se inverte em relação a `PosicaoDaDicaSchema`: lá a legenda
     * afirma o que `afirma` mede, porque a posição ensina; aqui ela descreve o
     * contexto sem entregar a resposta, porque a posição pergunta. O gate
     * recusa uma legenda que cite a casa de destino de qualquer lance aceito.
     */
    legenda: z.string().min(10),
    /**
     * A frase sobre o material, quando ele está desigual — ou `null`.
     *
     * A posição de partida real nasce com desequilíbrio: é o que a combinação
     * produziu. Para o exercício estrutural isso é aceitável, e a §3.3 do plano
     * exige que fique **escrito**, para o aluno não passar o exercício
     * procurando por que um dos lados está com uma torre a mais.
     */
    material: z.string().min(10).nullable().default(null),
    apoio: ApoioSchema,
    curadoria: CuradoriaSchema,
    provenance: ProvenienciaSchema,
  })
  .strict();

/**
 * A ficha do conceito (§6 do plano).
 *
 * Cinco dos nove itens da lista da §6 já são estrutura e não se reescrevem em
 * prosa: o exemplo de ensino é `posicoes[0]`, o reconhecimento com apoio são os
 * itens do degrau 2, a aplicação é o do degrau 4, e as reservas são o campo
 * `reservas`. O que resta são os quatro que só existem escritos.
 */
export const FichaSchema = z
  .object({
    /** O que o aluno consegue fazer depois, dito em comportamento e não em tema. */
    objetivo: z.string().min(30),
    /** O que ele já precisa saber. Se não souber, a dica não é a próxima dele. */
    prerequisitos: z.array(z.string().min(10)).min(1).max(4),
    /** O termo novo e o que ele quer dizer, na linguagem da tela. */
    vocabulario: z
      .array(z.object({ termo: z.string().min(3), significa: z.string().min(20) }).strict())
      .min(1)
      .max(4),
    /** O erro mais provável, e a linha que responde a ele. */
    erroMaisProvavel: z.object({ qual: z.string().min(20), feedback: z.string().min(30) }).strict(),
    /**
     * Os limites da evidência que este conceito gera.
     *
     * É o campo que impede o relatório do professor de dizer mais do que os
     * cliques provaram, e ele é obrigatório porque a tentação de esquecê-lo é
     * proporcional ao quanto o número parece bom.
     */
    limitesDaEvidencia: z.string().min(40),
  })
  .strict();

/**
 * A sequência de exercícios de uma dica.
 *
 * **Dois é o piso, cinco é o alvo, e quem decide entre os dois é o estoque.**
 * Um tema com quinze candidatas aprovadas fica com cinco; um tema em que o
 * acervo só dá duas fica com duas, e o gate não deixa publicar com uma. O teto
 * de cinco não é orçamento: é a sessão de treino de um aluno de doze anos, que
 * não faz oito posições seguidas do mesmo assunto sem parar de olhar o
 * tabuleiro.
 *
 * O que saiu, e por quê: `aplicacao` (a pergunta de duas alternativas do degrau
 * 4) e `reservas`. A pergunta saiu por decisão do Doug em 2026-09-07 — o que
 * fica na tela é a apresentação e o exercício de jogar, e mais nada. As
 * reservas saíram porque deixaram de ser um lugar separado: as posições que
 * sobram do funil acima de cinco **são** o estoque de revisão do Bloco 6, e
 * ficam onde o funil as deixou.
 */
export const TreinoSchema = z
  .object({
    ficha: FichaSchema,
    exercicios: z.array(ItemDeLanceSchema).min(EXERCICIOS_PISO).max(EXERCICIOS_ALVO),
  })
  .strict();

export const DicaSchema = z
  .object({
    /** `m1`, `m2`… A ordem é a de leitura dentro do nível. */
    id: z.string().regex(/^m[0-9]+$/, "o id é `m` mais o número (`m1`)"),
    titulo: z.string().min(8),
    /** Em que nível de força ela entra (`lib/curso/trilha.ts`). */
    nivel: z.enum(NIVEIS_VALIDOS),
    /** A técnica em uma frase — o que a dica ensina. */
    resumo: z.string().min(20),
    explicacao: z.array(PassoSchema).min(1).max(3),
    procure: z.array(z.string().min(10)).min(2).max(4),
    cuidado: z.string().min(10).optional(),
    posicoes: z.array(PosicaoDaDicaSchema).min(1).max(3),
    /**
     * Obrigatório desde a F2. Uma dica sem pergunta é uma dica que o aluno lê
     * e não usa — e "li" vira o único registro que o professor tem dela.
     */
    quiz: QuizSchema,
    /**
     * A sequência de exercícios, quando o conceito já foi curado.
     *
     * `null` nas 22 dicas fora da fatia do piloto, e é o estado correto delas:
     * elas continuam no ar com a leitura do Bloco 1, e ninguém perde nada. O
     * campo é nulo em vez de ausente para que a diferença entre "ainda não" e
     * "esqueceram" seja visível no arquivo.
     */
    treino: TreinoSchema.nullable().default(null),
    /**
     * O vídeo gratuito.
     *
     * `url` continua podendo ser nula — uma dica nova entra sem link, e a tela
     * escreve "ainda não há link conferido" em vez de fingir um. O que o
     * esquema **não** aceita é uma string que não seja um endereço de vídeo do
     * YouTube: o link é a única coisa neste arquivo que leva a criança para
     * fora do site, e um id errado dá uma página de erro no meio da tarefa de
     * casa.
     *
     * O `titulo` é o título canônico do vídeo mais o canal, copiados do oEmbed
     * do YouTube — e não da página de busca, que **traduz** o título de vídeo
     * em inglês para o idioma de quem procura. Foi assim que dois vídeos em
     * inglês quase entraram aqui como se fossem em português.
     */
    video: z
      .object({
        titulo: z.string().min(5),
        /**
         * O que o vídeo **não** entrega, quando ele não entrega tudo.
         *
         * São 30 vídeos gratuitos em português para 30 dicas, e em dois casos
         * não sobrava escolha: o do `m11` é de finais de torre e o do `m22`
         * trata do ataque de minoria, tema que saiu da lista. A alternativa —
         * publicar o link calado — faria a tela afirmar que o vídeo é da dica,
         * e o aluno descobriria que não depois de dez minutos assistindo. A
         * ressalva vai na tela, ao lado do link, não num comentário de código.
         */
        ressalva: z.string().min(20).nullable().default(null),
        url: z
          .string()
          .regex(
            /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/,
            "o link tem de ser `https://www.youtube.com/watch?v=` mais os 11 caracteres do id",
          )
          .nullable(),
      })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();

export type Dica = z.infer<typeof DicaSchema>;
export type Treino = z.infer<typeof TreinoSchema>;
export type ItemDeLance = z.infer<typeof ItemDeLanceSchema>;
export type Ficha = z.infer<typeof FichaSchema>;
export type PosicaoDaDica = z.infer<typeof PosicaoDaDicaSchema>;
export type Proveniencia = z.infer<typeof ProvenienciaSchema>;

export const DicasSchema = z.array(DicaSchema).min(1);

/**
 * Quantas posições do **mesmo capítulo** uma dica de meio-jogo pode usar.
 *
 * Não é o `PROTECTED_SOURCE_CAP` de `lib/lesson/schema.ts`, e a diferença é
 * deliberada. Aquele conta **obra** e continua valendo para as aulas de finais,
 * onde os livros são de autores vivos ou recentes (de la Villa, Silman,
 * Seirawan). Este conta **capítulo** e vale só aqui.
 *
 * A troca de unidade vem de uma premissa que não se sustentava. O teto por obra
 * foi escrito como se fosse restrição legal; é política editorial, e a coisa
 * que ela deveria proteger não é a que ela media:
 *
 * - **posição é fato, não obra.** Uma FEN é o arranjo das peças. O que a
 *   Lei 9.610 protege num livro de xadrez é o texto, as anotações e a
 *   seleção/organização da coletânea (art. 7º, XIII);
 * - **nestes dois livros a camada protegida não é a que se copia.** O texto de
 *   Nimzowitsch é livre no Brasil desde 2006 e o de Znosko-Borovsky desde 2025;
 *   o prazo em aberto era o da **tradução**, que é camada de texto. A FEN do
 *   diagrama CXLVIII não deve nada ao tradutor;
 * - **o que sobra de preocupação real é copiar a seleção** — esvaziar os
 *   diagramas do capítulo do peão isolado é reproduzir a curadoria do autor. É
 *   isso, e só isso, que este teto mede.
 *
 * Aprovado pelo Doug em 2026-09-07; o raciocínio inteiro está em
 * `content/sources.json`, ao lado das licenças.
 *
 * ## Por que 3, e não 2
 *
 * Nasceu 2, pelo paralelo com o teto das aulas de finais. A execução do Bloco 3
 * mostrou que o número apertava a coisa errada: no meio-jogo o capítulo passou a
 * ser, na prática, **uma partida ilustrada** do Capablanca, e uma partida tem de
 * duas a seis figuras. Com teto 2, dois conceitos que precisavam do mesmo tema
 * disputavam a mesma partida, e um dos dois ficava sem posição de livro —
 * `torre-na-setima` tem as três figuras do acervo alcançável na mesma partida.
 *
 * **Aprovado pelo Doug em 2026-09-07, junto com o registro das duas obras do
 * Lasker**, e é aumento de folga, não de licença: o que protege o aluno de ver
 * duas telas parecidas continua sendo o teto de semelhança de
 * {@link SEMELHANCA_MAXIMA}, que mede o tabuleiro em vez da bibliografia. Este
 * teto protege outra coisa — a seleção do autor —, e três de seis figuras de uma
 * partida não a reproduzem.
 */
export const CAPITULO_CAP = 3;

/** O que a conferência de citação precisa saber de uma obra registrada. */
export type ObraCitada = { readonly slug: string; readonly temArquivo: boolean };

/**
 * Os problemas de citação de uma dica: capítulo faltando e teto estourado.
 *
 * Recebe a busca da obra por parâmetro para não puxar `content/sources.json`
 * para dentro do esquema — quem junta as duas pontas é o gate e o `npm test`,
 * que já leem os dois arquivos.
 */
export function problemasDeCitacao(
  dica: Dica,
  obraDe: (editionFile: string) => ObraCitada | undefined,
): { codigo: string; mensagem: string }[] {
  const problemas: { codigo: string; mensagem: string }[] = [];
  const porCapitulo = new Map<string, number>();

  // O ensino **e** o treino, e é por isso que o treino mora dentro da dica: o
  // teto conta capítulo por dica, e duas posições guiadas do mesmo capítulo do
  // exemplo estourariam o teto sem que ninguém visse, se morassem em arquivos
  // diferentes.
  for (const { provenance, onde } of posicoesCitadas(dica)) {
    const obra = obraDe(provenance.editionFile);
    if (!obra) continue; // já reportado como OBRA_NAO_REGISTRADA

    if (provenance.capitulo === null) {
      // Livro sem capítulo declarado é teto que não se cobra: a posição
      // passaria por todas as portas sem nunca contar para nenhuma.
      if (obra.temArquivo) {
        problemas.push({
          codigo: "CAPITULO_AUSENTE",
          mensagem:
            `${onde} sai de "${obra.slug}", que é livro da biblioteca, e não diz de ` +
            `que capítulo — sem isso o teto por capítulo não tem o que contar`,
        });
      }
      continue;
    }

    const chave = `${obra.slug} · ${provenance.capitulo}`;
    const quantas = (porCapitulo.get(chave) ?? 0) + 1;
    porCapitulo.set(chave, quantas);
    if (quantas > CAPITULO_CAP) {
      problemas.push({
        codigo: "TETO_DE_CAPITULO",
        mensagem:
          `${quantas} posições saem de "${chave}" e o teto é ${CAPITULO_CAP} por capítulo — ` +
          `esvaziar um capítulo é reproduzir a seleção do autor, que é a camada protegida`,
      });
    }
  }
  return problemas;
}

/* ------------------------------------------------------------------ *
 * As conferências do treino
 * ------------------------------------------------------------------ */

/**
 * As obras que são **a mesma obra** em `content/sources.json`.
 *
 * A regra da §3.2 — a posição guiada vem de obra diferente da do exemplo —
 * compara `editionFile`, e dois slugs podem apontar para o mesmo livro. É o
 * caso do Capablanca: `capablanca-1921` é o exemplar de 1921 e
 * `capablanca-fundamentals-reimpressao` é a reimpressão do mesmo *Chess
 * Fundamentals*. São dois PDFs e um livro só, e sem esta tabela a regra passaria
 * por cima do próprio motivo de existir: não esvaziar a seleção de um autor.
 */
const MESMA_OBRA: readonly (readonly string[])[] = [
  ["capablanca-1921", "capablanca-fundamentals-reimpressao"],
];

/** Verdade quando os dois slugs são o mesmo livro, ainda que em edições diferentes. */
export function mesmaObra(a: string, b: string): boolean {
  if (a === b) return true;
  return MESMA_OBRA.some((grupo) => grupo.includes(a) && grupo.includes(b));
}

/** Todas as posições de uma dica: a de ensino e as dos exercícios. */
export function posicoesCitadas(dica: Dica): { provenance: Proveniencia; onde: string }[] {
  const lista = dica.posicoes.map((p, i) => ({ provenance: p.provenance, onde: `posição ${i + 1}` }));
  if (dica.treino === null) return lista;
  for (const item of dica.treino.exercicios) {
    lista.push({ provenance: item.provenance, onde: `item ${item.id}` });
  }
  return lista;
}

/** O valor clássico das peças, para dizer se o material está desigual. */
const VALOR: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** A diferença de material em peões, positiva para as brancas. */
export function saldoDeMaterial(fen: string): number {
  let saldo = 0;
  for (const letra of fen.split(" ")[0]) {
    const valor = VALOR[letra.toLowerCase()];
    if (valor === undefined) continue;
    saldo += letra === letra.toUpperCase() ? valor : -valor;
  }
  return saldo;
}

/**
 * O teto de semelhança entre duas posições de treino, e de onde ele saiu.
 *
 * Duas posições da mesma partida, a poucos lances de distância, chegam ao aluno
 * como quase o mesmo tabuleiro. Ele responde a segunda pela memória da
 * primeira, o registro conta isso como reconhecimento, e o relatório chama de
 * transferência o que foi lembrança.
 *
 * A primeira versão desta regra proibia **capítulo repetido entre dicas**, que
 * é um proxy — e proxy erra dos dois lados. Duas posições da mesma partida a
 * vinte lances de distância são tabuleiros diferentes; duas posições de
 * partidas diferentes poderiam, em tese, cair parecidas. O que importa é a
 * semelhança, e ela se mede.
 *
 * **Medido nesta sessão**, sobre pares reais do acervo — peças na mesma casa,
 * sobre a posição mais cheia das duas:
 *
 * | par | distância | semelhança |
 * |---|---|---:|
 * | Fig112 × Fig113 | 2 meios-lances | 92% |
 * | Fig149 × Fig150 | 4 meios-lances | 78% |
 * | **Fig145 × Fig147** | 7 meios-lances | **77%** |
 * | Fig106 × Fig107 | 10 meios-lances | 71% |
 * | Fig124 × Fig125 | 22 meios-lances | 48% |
 * | Fig148 × Fig149 | 6 meios-lances | 47% |
 * | partidas diferentes | — | 8% a 42% |
 *
 * O par em negrito é o que eu escolhi sem ver e recusei a olho na parada 3. O
 * corte em 70% pega ele e os três acima dele, e deixa passar as posições da
 * mesma partida em que de fato houve trocas — que é o critério certo, porque é
 * o tabuleiro que o aluno vê, e não a bibliografia.
 */
export const SEMELHANCA_MAXIMA = 0.7;

/** A fração de peças que duas posições têm na mesma casa, sobre a mais cheia. */
export function semelhancaDePosicoes(fenA: string, fenB: string): number {
  const mapa = (fen: string): Map<string, string> => {
    const casas = new Map<string, string>();
    for (const [i, linha] of fen.split(" ")[0].split("/").entries()) {
      let coluna = 0;
      for (const letra of linha) {
        if (/[1-8]/.test(letra)) {
          coluna += Number(letra);
          continue;
        }
        casas.set(`${String.fromCharCode(97 + coluna)}${8 - i}`, letra);
        coluna += 1;
      }
    }
    return casas;
  };
  const a = mapa(fenA);
  const b = mapa(fenB);
  const maior = Math.max(a.size, b.size);
  if (maior === 0) return 1;
  let iguais = 0;
  for (const [casa, peca] of a) if (b.get(casa) === peca) iguais += 1;
  return iguais / maior;
}

/**
 * Os pares de posições de treino perto demais um do outro, no módulo inteiro —
 * e os capítulos drenados além do teto.
 *
 * As duas conferências moram juntas porque atravessam dicas, e
 * `problemasDoTreino` só enxerga uma dica por vez. A segunda é a §3.1 aplicada
 * onde a preocupação dela de fato vive: "esvaziar os diagramas de um capítulo é
 * reproduzir a curadoria do autor" fala do **capítulo**, e não da dica. O teto
 * por dica deixava três dicas tirarem duas posições cada da mesma partida, o
 * que drena seis diagramas de uma partida só sem nenhum aviso.
 */
export function problemasEntreDicas(
  dicas: readonly Dica[],
): { codigo: string; onde: string; mensagem: string }[] {
  const itens: { dica: string; id: string; fen: string; capitulo: string | null }[] = [];
  for (const dica of dicas) {
    for (const item of dica.treino?.exercicios ?? []) {
      itens.push({
        dica: dica.id,
        id: item.id,
        fen: item.fen,
        capitulo:
          item.provenance.capitulo === null
            ? null
            : `${item.provenance.editionFile} · ${item.provenance.capitulo}`,
      });
    }
  }

  const problemas: { codigo: string; onde: string; mensagem: string }[] = [];

  for (let i = 0; i < itens.length; i += 1) {
    for (let k = i + 1; k < itens.length; k += 1) {
      const quanto = semelhancaDePosicoes(itens[i].fen, itens[k].fen);
      if (quanto < SEMELHANCA_MAXIMA) continue;
      problemas.push({
        codigo: "POSICOES_QUASE_IGUAIS",
        onde: `${itens[i].id} × ${itens[k].id}`,
        mensagem:
          `as duas posições têm ${Math.round(quanto * 100)}% das peças nas mesmas casas, e o ` +
          `teto é ${Math.round(SEMELHANCA_MAXIMA * 100)}% — o aluno responde a segunda pela ` +
          `memória da primeira, e o registro chama isso de reconhecimento`,
      });
    }
  }

  const porCapitulo = new Map<string, string[]>();
  for (const item of itens) {
    if (item.capitulo === null) continue;
    porCapitulo.set(item.capitulo, [...(porCapitulo.get(item.capitulo) ?? []), item.id]);
  }
  for (const [capitulo, usos] of porCapitulo) {
    if (usos.length <= CAPITULO_CAP) continue;
    problemas.push({
      codigo: "CAPITULO_DRENADO",
      onde: capitulo,
      mensagem:
        `${usos.length} posições de treino saem deste capítulo (${usos.join(", ")}) e o teto do ` +
        `módulo é ${CAPITULO_CAP} — esvaziar um capítulo é reproduzir a seleção do autor, que é ` +
        `a camada protegida (§3.1)`,
    });
  }

  return problemas;
}

/**
 * Os problemas do treino de uma dica — a conferência que o gate roda.
 *
 * Ela é longa porque cada linha corresponde a um jeito conhecido de o item
 * chegar torto na tela do aluno, e nenhum deles é visível relendo o JSON:
 *
 * - a lista escrita diverge da que o juiz calcula → o aluno joga o lance certo
 *   e é recusado, ou joga um lance qualquer e é aprovado;
 * - a vez da FEN é do lado errado → o exercício pede um lance que ninguém pode
 *   jogar;
 * - falta o número do motor de algum lance aceito → o site pode estar ensinando
 *   o contrário da dica;
 * - a legenda cita a casa de destino → o exercício se responde sem olhar;
 * - o realce do apoio não contém o destino, ou **é** o destino → o apoio leva
 *   para o lado errado, ou o nível 2 virou o nível 3;
 * - a solução não nomeia lance nenhum → o nível 3 deixou de ser solução.
 */
export function problemasDoTreino(dica: Dica): { codigo: string; mensagem: string }[] {
  const problemas: { codigo: string; mensagem: string }[] = [];
  const erro = (codigo: string, mensagem: string): void => {
    problemas.push({ codigo, mensagem });
  };
  const treino = dica.treino;
  if (treino === null) return problemas;

  const noMapa = MAPA.find((n) => n.dica === dica.id);
  const juiz = juizDaDica(dica.id);
  if (!juiz) {
    erro(
      "TREINO_SEM_JUIZ",
      `${dica.id} tem treino mas não há juiz de lance escrito para ela em ` +
        `lib/meiojogo/lances.ts — sem juiz não há exercício de jogar a escrever`,
    );
    return problemas;
  }
  if (noMapa?.tarefa && noMapa.tarefa !== juiz.id) {
    erro(
      "JUIZ_FORA_DO_MAPA",
      `o juiz de ${dica.id} é "${juiz.id}" e o MAPA lhe dá a tarefa "${noMapa.tarefa}"`,
    );
  }

  const ids = new Set<string>();

  for (const item of treino.exercicios) {
    const onde = `item ${item.id}`;

    if (!item.id.startsWith(`${dica.id}-`)) {
      erro("ID_DE_OUTRA_DICA", `${onde} não começa por "${dica.id}-"`);
    }
    if (ids.has(item.id)) erro("ID_REPETIDO", `${onde} aparece duas vezes`);
    ids.add(item.id);

    if (item.tarefa !== juiz.id) {
      erro(
        "TAREFA_FORA_DO_JUIZ",
        `${onde} usa a tarefa "${item.tarefa}" e o juiz de ${dica.id} é "${juiz.id}"`,
      );
      continue;
    }

    // A vez. Sem isto o item pediria um lance que ninguém pode jogar, e a tela
    // ficaria esperando um toque que o tabuleiro não aceita.
    const jogo = new Chess(item.fen);
    const quemJoga = juiz.quemJoga(item.lado);
    if (jogo.turn() !== (quemJoga === "brancas" ? "w" : "b")) {
      erro(
        "VEZ_DO_LADO_ERRADO",
        `${onde}: quem aplica o tema é ${quemJoga}, e a FEN está com a vez do outro lado`,
      );
      continue;
    }

    const legais = new Set(jogo.moves({ verbose: true }).map(uciDe));
    for (const lance of item.lancesAceitos) {
      if (!legais.has(lance)) {
        erro("LANCE_ILEGAL", `${onde}: o lance aceito "${lance}" não é legal nesta posição`);
      }
    }

    // O juiz. É esta linha que o item inteiro existe para satisfazer.
    const doJuiz = juiz.lances(item.fen, item.lado);
    const recusados = item.lancesRecusados.map((r) => r.lance);
    const escritos = [...item.lancesAceitos, ...recusados].sort();
    for (const { lance, custo } of item.lancesRecusados) {
      if (Math.abs(custo) <= SALTO_DA_PORTA_2) {
        erro(
          "RECUSADO_QUE_PASSA",
          `${onde}: o lance "${lance}" está na lista de recusados custando ${custo} centésimos, ` +
            `que cabe no teto de ${SALTO_DA_PORTA_2} — se ele é são, ele é aceito`,
        );
      }
      if (item.lancesAceitos.includes(lance)) {
        erro(
          "RECUSADO_E_ACEITO",
          `${onde}: o lance "${lance}" está nas duas listas ao mesmo tempo`,
        );
      }
    }
    if (doJuiz.length > 0) {
      if (item.porqueAceitos !== null) {
        erro(
          "PORQUE_SOBRANDO",
          `${onde}: o juiz calcula a lista sozinho, e mesmo assim o item escreve um ` +
            `"porqueAceitos" — justificativa ao lado de lista derivada é justificativa que ` +
            `ninguém relê quando a máquina muda de ideia`,
        );
      }
      if (doJuiz.join(",") !== escritos.join(",")) {
        erro(
          "LANCES_DESMENTIDOS",
          `${onde}: os lances escritos (aceitos + recusados) são ${escritos.join(", ")} e o juiz ` +
            `devolve ${doJuiz.join(", ")} — um lance do tema que some da lista vira "esse não é o ` +
            `lance desta dica" na tela, e é mentira`,
        );
      }
    } else if (item.porqueAceitos === null) {
      erro(
        "CAMADA_AUTORAL_MUDA",
        `${onde}: o juiz geométrico não devolve lance nenhum aqui, então quem escolheu foi ` +
          `uma pessoa — e "porqueAceitos" tem de dizer o porquê`,
      );
    }

    // O motor, gravado: um número por lance aceito, e nenhum acima do teto.
    const custos = item.curadoria.portas.custos;
    if (custos.length !== item.lancesAceitos.length) {
      erro(
        "MOTOR_SEM_NUMERO",
        `${onde}: são ${item.lancesAceitos.length} lance(s) aceito(s) e ${custos.length} ` +
          `número(s) do motor — todo lance aceito tem de ter sido medido`,
      );
    }

    const reprovacao = porta1(item.fen);
    if (reprovacao !== null) {
      erro("PORTA_1", `${onde} reprova na porta 1 por ${reprovacao} — a posição não está quieta`);
    }

    // O que a legenda não pode entregar é a casa de **chegada**. A de origem
    // pode: dizer "a torre de a1" não diz para onde ela vai, e às vezes é o
    // contexto que a posição precisa.
    const destinos = [...new Set(item.lancesAceitos.map((l) => l.slice(2, 4)))];
    for (const casa of destinos) {
      if (new RegExp(`\\b${casa}\\b`).test(item.legenda)) {
        erro(
          "LEGENDA_ENTREGA",
          `${onde}: a legenda cita "${casa}", que é destino de lance aceito — o item se ` +
            `responde sem olhar`,
        );
      }
    }

    const realce = new Set(item.apoio.realce);
    if (item.apoio.modo === "contem") {
      const faltando = destinos.filter((c) => !realce.has(c));
      if (faltando.length > 0) {
        erro(
          "APOIO_NAO_CONTEM_O_DESTINO",
          `${onde}: o apoio é "contem" e não acende ${faltando.join(", ")} — ele estreitaria o ` +
            `campo para longe do lance`,
        );
      } else if (item.apoio.realce.length <= destinos.length) {
        erro(
          "APOIO_E_A_RESPOSTA",
          `${onde}: o realce do apoio tem ${item.apoio.realce.length} casa(s) para ` +
            `${destinos.length} destino(s) — o nível 2 virou o nível 3`,
        );
      }
    } else {
      const tocadas = destinos.filter((c) => realce.has(c));
      if (tocadas.length > 0) {
        erro(
          "CONTORNO_TOCA_A_RESPOSTA",
          `${onde}: o apoio é "contorno" e acende ${tocadas.join(", ")}, que é destino — ` +
            `contorno mostra o que **define** a resposta por ausência, e não a resposta`,
        );
      } else if (item.apoio.realce.length < 2) {
        erro(
          "CONTORNO_CURTO_DEMAIS",
          `${onde}: um contorno de uma casa só não desenha ausência nenhuma`,
        );
      }
    }

    // O nível 3 da escada nomeia o **lance**, e não a casa: é a frase que o
    // aluno lê depois de desistir de achar sozinho, e "a coluna d" não diz o
    // que ele tem de arrastar no tabuleiro.
    const nomeiaLance = item.lancesAceitos.some(
      (l) =>
        new RegExp(`\\b${l.slice(2, 4)}\\b`).test(item.apoio.solucao) &&
        new RegExp(`\\b${l.slice(0, 2)}\\b`).test(item.apoio.solucao),
    );
    if (!nomeiaLance) {
      erro(
        "SOLUCAO_SEM_LANCE",
        `${onde}: a solução do apoio não nomeia origem e destino de nenhum lance aceito — ` +
          `ela é o nível 3 da escada, e o nível 3 entrega o lance`,
      );
    }

    if (Math.abs(saldoDeMaterial(item.fen)) >= 1 && item.material === null) {
      erro(
        "MATERIAL_CALADO",
        `${onde}: o material está ${Math.abs(saldoDeMaterial(item.fen))} peão(ões) desigual e o ` +
          `campo "material" é nulo — o aluno passa o exercício procurando o motivo`,
      );
    }

    // A §3.2, que sobreviveu ao fim dos degraus: o exercício não sai da obra do
    // exemplo. Os degraus acabaram, mas o motivo não — o exemplo já bebeu
    // daquele autor, e tirar dele também a prática é reproduzir a seleção dele,
    // que é a única camada protegida (§3.1). Hoje a regra quase não morde,
    // porque o funil traz partida CC0; ela existe para o dia em que alguém
    // curar uma posição de livro à mão.
    const obraDoExemplo = dica.posicoes[0]?.provenance.editionFile;
    if (obraDoExemplo !== undefined && mesmaObra(item.provenance.editionFile, obraDoExemplo)) {
      erro(
        "EXERCICIO_DA_MESMA_OBRA",
        `${onde} sai de "${item.provenance.editionFile}", a mesma obra do exemplo — a §3.2 pede ` +
          `obra diferente, e esvaziar um autor é copiar a seleção dele`,
      );
    }
  }

  return problemas;
}

/**
 * Confere as dicas e devolve a lista, ou estoura com o caminho do erro.
 *
 * Estourar é o certo, como em `validarTemas`: isto roda na build e no
 * `npm test`. Uma dica sem posição tem de reprovar ali, e não virar uma página
 * sem diagrama no celular do aluno na manhã do sábado.
 */
export function validarDicas(dados: unknown): Dica[] {
  const lido = DicasSchema.safeParse(dados);
  if (!lido.success) {
    const problemas = lido.error.issues
      .map((i) => `  content/meio-jogo.json [${i.path.join(".")}]: ${i.message}`)
      .join("\n");
    throw new Error(`O conteúdo do meio-jogo não passou na conferência:\n${problemas}`);
  }

  const vistos = new Set<string>();
  for (const dica of lido.data) {
    if (vistos.has(dica.id)) {
      throw new Error(`content/meio-jogo.json: o id "${dica.id}" aparece duas vezes.`);
    }
    vistos.add(dica.id);
  }
  return lido.data;
}
