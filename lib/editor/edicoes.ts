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

import {
  MARCA_DE_MOLDE,
  MAX_PASSOS_INTRO,
  MAX_PASSOS_ROTEIRO,
  MIN_PASSOS_INTRO,
  MIN_PASSOS_ROTEIRO,
} from "../lesson/schema.ts";

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
): { arrows?: [string, string][]; highlights?: string[]; fen?: string } | null {
  const stages = cru.stages as Record<string, unknown> | undefined;
  const etapaCrua = stages?.[etapa] as Record<string, unknown> | undefined;
  const lista = (etapa === "intro" ? etapaCrua?.passos : etapaCrua?.roteiro) as
    | Array<Record<string, unknown>>
    | undefined;
  return (
    (lista?.[passo] as {
      arrows?: [string, string][];
      highlights?: string[];
      fen?: string;
    }) ?? null
  );
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

/**
 * Acrescenta um diagrama vazio na posição pedida — o "+" da coluna.
 *
 * ## Por que o passo novo nasce **sem lance**
 *
 * Um passo de roteiro pode ter `lance`, e o encadeamento inteiro da aula
 * depende dele: o `superRefine` do schema aplica os lances um atrás do outro a
 * partir da posição da aula, e recusa o arquivo em que um não for legal. Um
 * passo novo com lance no meio da linha quebraria a corrente do ponto de
 * inserção em diante — o professor pediria um diagrama e receberia a aula
 * inteira recusada.
 *
 * O passo **sem** lance não é um passo pela metade: é a forma que o formato já
 * usa para "o passo que só aponta" (`roteiroPassoSchema.lance` é opcional, e a
 * N1-KPK abre com dois deles). Ele é ignorado pela corrente de legalidade, pelo
 * `montarQuadros` e pelo `derivarTreino` — que o pula antes de qualquer conta
 * (`lib/lesson/derivar-treino.ts`). O efeito prático é o que interessa:
 * **acrescentar um diagrama em qualquer ponto do roteiro não muda um byte da
 * etapa 3.** O lance vem depois, pelo arrastar do Bloco 2, e é aí que ele passa
 * a ter consequência.
 *
 * ## Por que a fala nasce marcada
 *
 * `texto` é `min(1)`: fala vazia não é aula válida, e rascunho inválido não vai
 * ao disco. Então o passo tem de nascer com alguma coisa — e o que ele carrega
 * é `MARCA_DE_MOLDE`, que a tela mostra como lembrete e o gate procura
 * (`TEXTO_DE_MOLDE`) antes de deixar a aula ser publicada.
 *
 * `indice` é a posição em que o passo entra: 0 põe antes do primeiro, e o
 * tamanho da lista põe no fim. Fora da faixa, o passo entra na ponta mais
 * próxima em vez de a tela explodir.
 */
export function comPassoNovo(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  indice: number,
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  const etapaCrua = stages[etapa] as Record<string, unknown>;
  const chaveDaLista = etapa === "intro" ? "passos" : "roteiro";
  const lista = etapaCrua[chaveDaLista] as Array<Record<string, unknown>>;

  const onde = Math.max(0, Math.min(indice, lista.length));
  const nova = [...lista.slice(0, onde), { fala: MARCA_DE_MOLDE }, ...lista.slice(onde)];

  return { ...cru, stages: { ...stages, [etapa]: { ...etapaCrua, [chaveDaLista]: nova } } };
}

/**
 * Ainda cabe um diagrama nesta etapa?
 *
 * Os dois tetos são do schema (`MAX_PASSOS_INTRO`, `MAX_PASSOS_ROTEIRO`), e são
 * importados de lá em vez de repetidos aqui: um "+" que aceitasse o sétimo
 * passo da apresentação produziria um rascunho que o próprio editor recusaria a
 * salvar, e a mensagem que o professor leria seria a do Zod.
 */
export function cabeMaisUmPasso(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
): boolean {
  const stages = cru.stages as Record<string, unknown> | undefined;
  const etapaCrua = stages?.[etapa] as Record<string, unknown> | undefined;
  const lista = (etapa === "intro" ? etapaCrua?.passos : etapaCrua?.roteiro) as
    | unknown[]
    | undefined;
  if (!lista) return false;
  return lista.length < (etapa === "intro" ? MAX_PASSOS_INTRO : MAX_PASSOS_ROTEIRO);
}

/**
 * A lista crua de passos de uma etapa: `passos` na apresentação, `roteiro` na
 * aula assistida. `undefined` quando a etapa não existe no arquivo.
 */
function listaCrua(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
): Array<Record<string, unknown>> | undefined {
  const stages = cru.stages as Record<string, unknown> | undefined;
  const etapaCrua = stages?.[etapa] as Record<string, unknown> | undefined;
  return (etapa === "intro" ? etapaCrua?.passos : etapaCrua?.roteiro) as
    | Array<Record<string, unknown>>
    | undefined;
}

/**
 * O veredicto da lixeira: pode apagar este diagrama, ou não pode e por quê.
 *
 * As duas recusas têm frases diferentes na tela, e por isso são casos
 * diferentes aqui — um "não pode" sem motivo é o botão apagado que o vão do
 * "+" recusou a ser.
 */
export type Apagavel =
  | { pode: true }
  | { pode: false; porque: "piso"; piso: number }
  | { pode: false; porque: "corrente"; seguintes: number };

/**
 * Este diagrama pode sair?
 *
 * ## Por que a pergunta existe, em vez de a lixeira apagar e ver no que dá
 *
 * O rascunho inválido **não chega ao disco**: `gravarRascunhoDeAula` julga
 * antes de escrever e devolve "esta versão da aula ainda não é válida"
 * (`lib/editor/rascunhos.ts`). Então uma lixeira que apagasse sem perguntar
 * deixaria o editor num estado de erro que o professor não pediu e do qual só
 * o desfazer o tira — pelo tempo em que o desfazer existir. A tela pergunta
 * antes porque a resposta é barata e a alternativa é cara.
 *
 * ## As duas recusas
 *
 * **O piso.** As duas listas são `.min(2)` no schema. Apagar o penúltimo
 * diagrama produz um arquivo que o Zod recusa — e a mensagem que o professor
 * leria seria a do Zod, não a da tela. É o espelho exato de `cabeMaisUmPasso`.
 *
 * **A corrente.** Um passo do roteiro pode ter `lance`, e a aula inteira é
 * encadeada: o `superRefine` aplica os lances um atrás do outro a partir da
 * posição da aula e recusa o arquivo em que um não for legal. Tirar um lance do
 * **meio** muda a posição — e, com ela, de quem é a vez — para todos os lances
 * de baixo: o professor pediria para tirar um diagrama e receberia a aula
 * recusada, sem entender o que um gesto tem a ver com o outro.
 *
 * Tirar o **último** passo que tem lance é seguro: o que sobra é um prefixo da
 * mesma corrente, e prefixo de corrente legal é corrente legal. Tirar um passo
 * **sem** lance é sempre seguro — ele é ignorado pela corrente, pelo
 * `montarQuadros` e pelo `derivarTreino`, que é a mesma descoberta que deu
 * forma ao "+" (ver `comPassoNovo`), lida ao contrário.
 *
 * Na apresentação não há corrente nenhuma: ninguém joga ali, cada passo é uma
 * ilustração. Só o piso morde.
 *
 * ## O que este veredicto NÃO promete
 *
 * Que o gate vai ficar verde. Ele julga o que o Zod julga — o arquivo ser
 * gravável —, e não se a aula continua fazendo sentido depois de perder um
 * diagrama. Quem julga isso é o professor, olhando, e depois o gate em
 * "Conferir". A última palavra continua sendo dele.
 */
export function podeApagarPasso(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  indice: number,
): Apagavel {
  const piso = etapa === "intro" ? MIN_PASSOS_INTRO : MIN_PASSOS_ROTEIRO;
  const lista = listaCrua(cru, etapa);
  if (!lista || lista.length <= piso) return { pode: false, porque: "piso", piso };
  // Índice fora da faixa não acontece pela tela — a lixeira nasce de um selo,
  // e o selo nasce da lista. Tratado como "não pode" em vez de estourar.
  if (indice < 0 || indice >= lista.length) return { pode: false, porque: "piso", piso };

  if (etapa === "intro") return { pode: true };
  if (typeof lista[indice].lance !== "string") return { pode: true };

  const seguintes = lista.slice(indice + 1).filter((p) => typeof p.lance === "string").length;
  return seguintes === 0 ? { pode: true } : { pode: false, porque: "corrente", seguintes };
}

/**
 * Tira um diagrama da etapa — a lixeira da coluna, o gesto contrário do "+".
 *
 * A cirurgia é o espelho de `comPassoNovo`, e a promessa também: o `git diff`
 * mostra **um bloco removido** e nada mais. Tudo antes do passo continua byte a
 * byte, tudo depois continua byte a byte e só sobe de lugar.
 *
 * Não julga nada — quem julga é `podeApagarPasso`, na tela, antes de chamar.
 * Índice fora da faixa devolve o arquivo intacto: "apagar o que não existe" não
 * tem ponta mais próxima que faça sentido, ao contrário do "+", que insere na
 * ponta.
 */
export function comPassoRemovido(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  indice: number,
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  const etapaCrua = stages[etapa] as Record<string, unknown>;
  const chaveDaLista = etapa === "intro" ? "passos" : "roteiro";
  const lista = etapaCrua[chaveDaLista] as Array<Record<string, unknown>>;

  if (indice < 0 || indice >= lista.length) return cru;
  const nova = [...lista.slice(0, indice), ...lista.slice(indice + 1)];

  return { ...cru, stages: { ...stages, [etapa]: { ...etapaCrua, [chaveDaLista]: nova } } };
}

/**
 * O veredicto do arrastar: para que vãos este diagrama pode ir.
 *
 * `vaos` são posições **entre** selos, não índices de selo: 0 é "antes do
 * primeiro", 1 é "entre o primeiro e o segundo", e o tamanho da lista é "no
 * fim" — a mesma numeração que o "+" já usa. Os dois vãos que ladeiam o próprio
 * diagrama (`indice` e `indice + 1`) entram na lista de propósito: soltar ali é
 * desistir do gesto, e um alvo que se apaga debaixo do ponteiro no meio do
 * arrasto faz o professor achar que soltou errado.
 */
export type Movivel =
  | { pode: true; vaos: number[] }
  | { pode: false; porque: "corrente" };

/**
 * Para onde este diagrama pode ser arrastado?
 *
 * ## A regra, numa frase
 *
 * **A ordem dos `lance` não pode mudar.** Nada mais.
 *
 * A aula assistida é uma partida: os passos que têm `lance` são jogados um
 * atrás do outro a partir da posição da aula, e o `superRefine` recusa o
 * arquivo em que um deles não for legal. Embaralhar a ordem deles é embaralhar
 * os lances de uma partida — o que sai quase nunca é partida.
 *
 * Os passos **sem** `lance` não estão nessa fila. O `derivarTreino` os pula
 * antes de qualquer conta (`derivar-treino.ts`), o `montarQuadros` repete neles
 * o quadro anterior, e a corrente do `superRefine` não os enxerga. É a mesma
 * descoberta que deu forma ao "+" (ver `comPassoNovo`), lida de um terceiro
 * jeito: se um passo é invisível para a corrente, ele pode estar em qualquer
 * lugar dela.
 *
 * Daí as duas respostas:
 *
 * - **passo sem `lance`: todos os vãos.** Ele passeia pela etapa inteira sem
 *   mexer num byte da etapa 3.
 * - **passo com `lance`: só os vãos entre o lance de cima e o lance de baixo.**
 *   Ou seja, ele atravessa quantos passos "só apontam" houver à sua volta, e
 *   para no primeiro que move peça. Quando não há nenhum dos dois lados — que é
 *   o caso de onze dos treze diagramas da N1-KPK —, os únicos vãos são os dois
 *   dele, e a resposta é `pode: false`.
 *
 * Na apresentação não há corrente nenhuma: ninguém joga ali, cada passo é uma
 * ilustração. Todos os vãos, sempre.
 *
 * ## Por que isto NÃO é `podeApagarPasso` de novo
 *
 * As duas nascem da mesma descoberta e respondem a perguntas diferentes, e a
 * diferença muda a resposta num caso comum. Apagar **encurta** a corrente:
 * tirar o último passo com lance é seguro, porque prefixo de corrente legal é
 * corrente legal. Mover **reordena** a corrente: o mesmo último passo com
 * lance, arrastado para o topo, embaralha tudo. Reaproveitar aquele veredicto
 * aqui deixaria a tela dizer "pode" e o disco recusar o arquivo — o professor
 * arrastaria um selo e receberia a aula inválida, sem ligar uma coisa à outra.
 *
 * O piso e o teto também somem, e por um motivo simples: mover não muda o
 * tamanho da lista.
 *
 * ## O que este veredicto NÃO promete
 *
 * Que a aula continua fazendo sentido com os diagramas noutra ordem. Ele julga
 * o que o Zod julga — o arquivo ser gravável. Quem julga o resto é o professor,
 * olhando, e depois o gate em "Conferir".
 */
export function podeMoverPasso(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  indice: number,
): Movivel {
  const lista = listaCrua(cru, etapa);
  if (!lista || indice < 0 || indice >= lista.length) return { pode: false, porque: "corrente" };

  const todos = lista.map((_, i) => i).concat(lista.length);
  if (etapa === "intro" || typeof lista[indice].lance !== "string") {
    return { pode: true, vaos: todos };
  }

  // O lance mais próximo acima e o mais próximo abaixo. Fora deles a ordem dos
  // lances mudaria; entre eles não há lance nenhum para trocar de vez com este.
  let antes = -1;
  for (let i = indice - 1; i >= 0; i -= 1) {
    if (typeof lista[i].lance === "string") {
      antes = i;
      break;
    }
  }
  let depois = lista.length;
  for (let i = indice + 1; i < lista.length; i += 1) {
    if (typeof lista[i].lance === "string") {
      depois = i;
      break;
    }
  }

  const vaos: number[] = [];
  for (let v = antes + 1; v <= depois; v += 1) vaos.push(v);
  // Sobraram só os dois vãos do próprio diagrama: ele está entre dois lances e
  // não tem para onde ir.
  return vaos.length <= 2 ? { pode: false, porque: "corrente" } : { pode: true, vaos };
}

/**
 * Muda um diagrama de lugar — o gesto de arrastar da coluna.
 *
 * `vao` é a posição **entre** selos em que ele é solto, contada na lista de
 * antes do gesto: 0 põe antes do primeiro, o tamanho da lista põe no fim. Soltar
 * num dos dois vãos do próprio diagrama devolve o arquivo intacto, que é o que
 * "desisti do arrasto" significa.
 *
 * A promessa do `git diff` é a das outras duas: o bloco inteiro do passo aparece
 * num lugar e desaparece do outro, e nenhuma linha de nenhum outro passo é
 * tocada. Os objetos dos passos que ficam parados são os **mesmos objetos**, e
 * não cópias, então a serialização os reimprime byte a byte.
 *
 * Não julga nada — quem julga é `podeMoverPasso`, na tela, antes de chamar.
 */
export function comPassoMovido(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  de: number,
  vao: number,
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  const etapaCrua = stages[etapa] as Record<string, unknown>;
  const chaveDaLista = etapa === "intro" ? "passos" : "roteiro";
  const lista = etapaCrua[chaveDaLista] as Array<Record<string, unknown>>;

  if (de < 0 || de >= lista.length) return cru;
  const alvo = Math.max(0, Math.min(vao, lista.length));
  if (alvo === de || alvo === de + 1) return cru;

  const sem = [...lista.slice(0, de), ...lista.slice(de + 1)];
  // O vão foi contado na lista de ANTES; tirado o passo, tudo o que estava
  // abaixo dele subiu um lugar.
  const onde = alvo > de ? alvo - 1 : alvo;
  const nova = [...sem.slice(0, onde), lista[de], ...sem.slice(onde)];

  return { ...cru, stages: { ...stages, [etapa]: { ...etapaCrua, [chaveDaLista]: nova } } };
}

/**
 * O passo com a `fen` **logo depois da `fala`**, e não no fim do objeto.
 *
 * Parece capricho e é a diferença entre um `git diff` de 1 linha e um de 3. O
 * espalhamento (`{...passo, fen}`) põe a chave nova no FIM, e no JSON a chave
 * anterior tem de ganhar uma vírgula — o `git diff` mostra uma linha removida e
 * duas acrescentadas para dizer uma coisa só. Entrando logo depois da `fala`,
 * que num passo com desenho nunca é a última, é **inserção pura**: uma linha a
 * mais e nenhuma tocada.
 *
 * Num passo que só tem `fala` os 3 são inevitáveis — não há chave depois dela
 * para carregar a vírgula. Nunca é pior, e quase sempre é melhor.
 *
 * A ordem também lê bem: o que o professor diz, sobre que posição, com que
 * marcas em cima dela.
 */
function comFenDepoisDaFala(
  passo: Record<string, unknown>,
  fen: string,
): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(passo)) {
    saida[chave] = valor;
    if (chave === "fala") saida.fen = fen;
  }
  if (!("fen" in saida)) saida.fen = fen;
  return saida;
}

/**
 * Troca a posição que um diagrama da **apresentação** mostra.
 *
 * ## Por que só a apresentação, e por que isso não é uma limitação
 *
 * Na etapa 2 não existe "a posição deste diagrama": os quadros são derivados de
 * UMA posição jogando o roteiro (`montarQuadros`), e um passo sem lance repete
 * o quadro anterior. Trocar a posição de um diagrama do meio da aula seria
 * trocar a aula inteira dali para a frente.
 *
 * A apresentação é o contrário, e o gate já diz por quê: ela é **a única FEN do
 * curso sem arquivo de posição** — ilustração, ninguém joga nela, pode ter mais
 * de sete peças de propósito, não vira `content/positions/` e não se consulta a
 * tablebase sobre ela (ver o bloco "A apresentação" em
 * `scripts/validate-content.ts`). É por isso que a galeria de posições que o
 * professor quer — "aqui dá mate, aqui não dá" — mora aqui e sai barata.
 *
 * ## `null` OMITE o campo, e isso é a regra que morde
 *
 * "Mostra a posição da aula" se diz pela **ausência** de `fen`
 * (`introPassoSchema`), nunca por `fen` vazia nem por `fen` igual à da aula —
 * essa última o gate recusa por `INTRO_FEN_REDUNDANTE`, e a mensagem que o
 * professor leria seria sobre "uma segunda cópia da mesma FEN para divergir
 * depois". É a mesma regra do desenho, que some em vez de virar `arrows: []`.
 *
 * Não julga a FEN: quem julga é `fenProblem`, na tela antes de salvar e no gate
 * depois. Aqui só se troca o campo, e trocar por igual devolve o mesmo objeto —
 * sem isso, reabrir a mesma posição marcaria a aula como alterada e mataria o
 * direito de publicar sem que nada tivesse mudado.
 */
export function comFenDoDiagrama(
  cru: Record<string, unknown>,
  passo: number,
  fen: string | null,
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  const intro = stages.intro as Record<string, unknown> | undefined;
  if (!intro) return cru;
  const lista = intro.passos as Array<Record<string, unknown>> | undefined;
  if (!lista || passo < 0 || passo >= lista.length) return cru;

  const antigo = lista[passo];
  let novo: Record<string, unknown>;
  if (fen === null) {
    if (!("fen" in antigo)) return cru;
    novo = { ...antigo };
    delete novo.fen;
  } else if (antigo.fen === fen) {
    return cru;
  } else if ("fen" in antigo) {
    // Já existe: o espalhamento preserva a POSIÇÃO da chave, e trocar a
    // posição de um diagrama passa a mudar uma linha só.
    novo = { ...antigo, fen };
  } else {
    novo = comFenDepoisDaFala(antigo, fen);
  }

  const nova = [...lista.slice(0, passo), novo, ...lista.slice(passo + 1)];
  return { ...cru, stages: { ...stages, intro: { ...intro, passos: nova } } };
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
