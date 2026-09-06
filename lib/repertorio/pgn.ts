/**
 * Ler PGN com variações — a metade "pontuação" do repertório.
 *
 * **Por que um leitor próprio, e não a `chess.js`.** Medido na versão 1.4.0 que
 * o projeto usa: o `loadPgn` dela anda só por `variations[0]` e **descarta os
 * irmãos, sem erro nenhum**. Um PGN com uma variação entra e sai sem ela. Como
 * o repertório inteiro é feito de variações — um arquivo é uma árvore, e cada
 * ramo do adversário vira uma linha de treino —, usar o `loadPgn` aqui seria
 * perder a maior parte do conteúdo em silêncio. O `pgn.test.ts` mede os dois
 * lados no mesmo teste, para o número não virar lenda.
 *
 * O corpo deste arquivo é cópia de `laboratorio-finais\lib\autor\pgn.ts`, o
 * leitor que o Laboratório de Finais já usa em produção. Copiar em vez de
 * importar é decisão: são dois repositórios sem dependência um do outro, e um
 * pacote compartilhado para 300 linhas custaria mais do que a cópia. O que
 * mudou em relação ao original está listado abaixo, e cada item tem teste.
 *
 * **O que mudou na cópia**
 *
 * 1. **`0-0` com zero vira `O-O`.** O original engole `0-0`/`0-0-0` (o roque
 *    escrito com o algarismo zero, como saem alguns exportadores) sem token e
 *    sem aviso: o lance simplesmente some da linha. Aqui ele é reconhecido e
 *    normalizado para a letra `O`, que é o que a `chess.js` aceita. A correção
 *    é **no token**, não numa troca de texto antes de ler — nos 20 arquivos de
 *    fonte deste projeto as duas únicas ocorrências de `0-0` estão **dentro de
 *    comentário**, e uma troca cega reescreveria a prosa do autor.
 * 2. **`lerPgns` — vários jogos num arquivo.** O plano original mandava separar
 *    os jogos "nos `[Event`". Medido: **6 dos 13** arquivos do Grigoryan não
 *    têm tag `[Event]` nenhuma, e esse corte os engoliria inteiros. A separação
 *    aqui é por **token**: começa jogo novo quando aparece uma tag depois de já
 *    ter aparecido lance. Não é por linha começando com `[` — há linhas que
 *    começam com `[%cal …]}` e com `[#]`, que são pedaços de comentário.
 * 3. **`apenasLances` e `lancesComProsa`** — a cirurgia de texto que o
 *    importador usa para escrever os dois rascunhos. O primeiro tira as tags da
 *    fonte e toda a prosa, e é o que entra no Git; o segundo guarda a prosa,
 *    limpa dos artefatos do exportador, e é o que fica fora do Git para quem
 *    escreve o comentário ter o argumento do autor na mão.
 * 4. **Sem `paraPares` e sem escritor.** `paraPares` é da mecânica do Estúdio do
 *    Laboratório (pares aluno/resposta) e não tem uso aqui — quem converte
 *    SAN→UCI no repertório é `arvore.ts`. E não há escritor porque o rascunho
 *    sai por `apenasLances`, do texto original, em vez de ser reimpresso a
 *    partir da árvore.
 *
 * **O leitor não sabe xadrez, e é de propósito.** Ele lê pontuação: número de
 * lance, SAN, `$5`, `!?`, `{comentário}`, `( variação aninhada )` e as tags do
 * cabeçalho. Quem converte SAN em UCI é a `chess.js`, que faz isso muito bem —
 * duas implementações de regra de xadrez no mesmo projeto seriam duas opiniões
 * sobre o que é legal.
 */

export type LancePgn = {
  san: string;
  /** Anotações do lance: `!`, `?`, `!?`, `$5`. Ficam como vieram. */
  nags: string[];
  /** O `{comentário}` que vem depois do lance. */
  comentario: string | null;
  /** Linhas alternativas a **este** lance — os `( … )` que o seguem. */
  variacoes: LancePgn[][];
};

export type PartidaPgn = {
  /** O cabeçalho `[Event "…"]`, na ordem em que apareceu. */
  tags: Record<string, string>;
  /** O comentário antes do primeiro lance, quando há um. */
  intro: string | null;
  lances: LancePgn[];
  /** `1-0`, `0-1`, `1/2-1/2` ou `*`. `null` se o PGN não traz. */
  resultado: string | null;
};

/* ------------------------------------------------------------------ *
 * Varredura
 * ------------------------------------------------------------------ */

type Token =
  | { t: "tag"; chave: string; valor: string }
  | { t: "comentario"; texto: string }
  | { t: "abre" }
  | { t: "fecha" }
  | { t: "nag"; texto: string }
  | { t: "numero" }
  | { t: "resultado"; texto: string }
  | { t: "san"; texto: string };

/**
 * A varredura, em uma passada.
 *
 * A ordem das alternativas importa e cada troca aqui é uma decisão:
 *
 * - o **comentário** vem logo depois da tag, e por isso tudo que estiver dentro
 *   de `{ }` — inclusive `[%cal …]`, `[#]` e um `0-0` escrito na prosa — é
 *   engolido por ele antes de qualquer outra alternativa ter chance;
 * - o **resultado** (`1-0`, `1/2-1/2`) vem antes do número de lance, senão
 *   `1/2-1/2` viraria três coisas;
 * - o **roque com zero** vem depois do resultado, porque `0-1` é resultado e
 *   `0-0` não é, e antes do SAN, que não sabe começar com algarismo;
 * - o **número de lance** exige o ponto, o que já o separa de `1-0`.
 */
const VARREDURA = new RegExp(
  [
    /\[\s*(\w+)\s*"([^"]*)"\s*\]/, // tag
    /\{([^}]*)\}/, // comentário
    /;([^\n]*)/, // comentário até o fim da linha
    /(\()/, // abre variação
    /(\))/, // fecha variação
    /(\$\d+)/, // NAG numérico
    /(1-0|0-1|1\/2-1\/2|\*)/, // resultado
    /(0-0-0|0-0)([+#]*[!?]*)/, // roque escrito com zero
    /(\d+\s*\.(?:\s*\.\s*\.)?)/, // 12.  ou  12...
    /([OKQRBNa-h][\w=+#-]*[!?]*)/, // SAN, com ! e ? colados
    /([!?]+)/, // ! e ? soltos
  ]
    .map((r) => `(?:${r.source})`)
    .join("|"),
  "g",
);

/** Separa o SAN das anotações coladas nele: `Nf3!?` vira `Nf3` mais `!?`. */
function separarNags(bruto: string): { san: string; nags: string[] } {
  const casou = /^(.*?)([!?]+)$/.exec(bruto);
  if (!casou) return { san: bruto, nags: [] };
  return { san: casou[1], nags: [casou[2]] };
}

function varrer(texto: string): Token[] {
  const tokens: Token[] = [];
  for (const m of texto.matchAll(VARREDURA)) {
    const [
      ,
      chave,
      valor,
      comentario,
      ateOFim,
      abre,
      fecha,
      nag,
      resultado,
      roque,
      roqueDepois,
      numero,
      san,
      soltos,
    ] = m;
    if (chave !== undefined) tokens.push({ t: "tag", chave, valor: valor ?? "" });
    else if (comentario !== undefined) tokens.push({ t: "comentario", texto: comentario.trim() });
    else if (ateOFim !== undefined) tokens.push({ t: "comentario", texto: ateOFim.trim() });
    else if (abre !== undefined) tokens.push({ t: "abre" });
    else if (fecha !== undefined) tokens.push({ t: "fecha" });
    else if (nag !== undefined) tokens.push({ t: "nag", texto: nag });
    else if (resultado !== undefined) tokens.push({ t: "resultado", texto: resultado });
    else if (roque !== undefined)
      // O algarismo vira letra aqui, e só aqui: a `chess.js` recusa `0-0`.
      tokens.push({ t: "san", texto: roque.replaceAll("0", "O") + (roqueDepois ?? "") });
    else if (numero !== undefined) tokens.push({ t: "numero" });
    else if (san !== undefined) tokens.push({ t: "san", texto: san });
    else if (soltos !== undefined) tokens.push({ t: "nag", texto: soltos });
  }
  return tokens;
}

/* ------------------------------------------------------------------ *
 * Leitura
 * ------------------------------------------------------------------ */

const vazia = (): PartidaPgn => ({ tags: {}, intro: null, lances: [], resultado: null });

/** Monta a árvore de uma partida a partir dos tokens dela. */
function montar(tokens: Token[]): PartidaPgn {
  const tags: Record<string, string> = {};
  const raiz: LancePgn[] = [];
  let intro: string | null = null;
  let resultado: string | null = null;

  /** A pilha de linhas: o topo é a linha em que os lances estão entrando. */
  const pilha: LancePgn[][] = [raiz];
  /**
   * De qual lance cada `(` pendurou a variação. Guardado na abertura porque o
   * último lance da linha de dentro não é o dono da variação — o dono é o lance
   * que ela **substitui**, que ficou na linha de fora.
   */
  const donos: LancePgn[] = [];

  const atual = (): LancePgn[] => pilha[pilha.length - 1];
  const ultimo = (): LancePgn | undefined => atual()[atual().length - 1];

  for (const token of tokens) {
    switch (token.t) {
      case "tag":
        tags[token.chave] = token.valor;
        break;

      case "abre": {
        const dono = ultimo();
        if (!dono) break; // `(` antes de qualquer lance: PGN torto, ignorado.
        const nova: LancePgn[] = [];
        dono.variacoes.push(nova);
        donos.push(dono);
        pilha.push(nova);
        break;
      }

      case "fecha":
        if (pilha.length > 1) {
          pilha.pop();
          donos.pop();
        }
        break;

      case "comentario": {
        const alvo = ultimo();
        if (!alvo) {
          // Antes do primeiro lance da linha principal é a introdução; dentro de
          // uma variação, é comentário da variação e vai para o dono dela.
          const dono = donos[donos.length - 1];
          if (dono) dono.comentario = juntar(dono.comentario, token.texto);
          else intro = juntar(intro, token.texto);
          break;
        }
        alvo.comentario = juntar(alvo.comentario, token.texto);
        break;
      }

      case "nag": {
        const alvo = ultimo();
        if (alvo) alvo.nags.push(token.texto);
        break;
      }

      case "resultado":
        // Só o resultado da linha principal conta: dentro de uma variação ele é
        // decoração de quem exportou o arquivo.
        if (pilha.length === 1) resultado = token.texto;
        break;

      case "san": {
        const { san, nags } = separarNags(token.texto);
        atual().push({ san, nags, comentario: null, variacoes: [] });
        break;
      }

      case "numero":
        break;
    }
  }

  return { tags, intro, lances: raiz, resultado };
}

/**
 * Lê **todos** os jogos de um arquivo PGN.
 *
 * A regra de corte: uma tag que aparece **depois** de já ter aparecido lance
 * abre um jogo novo. É o que funciona nos dois formatos que este projeto
 * recebe — o ChessMood exporta um jogo por arquivo e às vezes sem `[Event]`
 * nenhuma; o chess.com e o arquivo do Kushager exportam vários jogos, cada um
 * com o cabeçalho inteiro.
 *
 * Arquivo sem lance nenhum devolve lista vazia, não um jogo vazio: assim quem
 * chama consegue distinguir "não tinha nada" de "tinha um jogo".
 */
export function lerPgns(texto: string): PartidaPgn[] {
  const tokens = varrer(texto);
  const jogos: Token[][] = [];
  let corrente: Token[] = [];
  let jaViuLance = false;

  for (const token of tokens) {
    if (token.t === "tag" && jaViuLance) {
      jogos.push(corrente);
      corrente = [];
      jaViuLance = false;
    }
    if (token.t === "san") jaViuLance = true;
    corrente.push(token);
  }
  if (jaViuLance) jogos.push(corrente);

  return jogos.map(montar);
}

/**
 * Lê o primeiro jogo de um PGN, com variações aninhadas e comentários.
 *
 * Não confere legalidade nenhuma: um SAN impossível entra na árvore como texto,
 * e quem o recusa é `expandir`, em `arvore.ts` — lá a `chess.js` diz o que é
 * legal, e o erro sai com o lance nomeado em vez de com a linha inteira perdida.
 */
export function lerPgn(texto: string): PartidaPgn {
  return lerPgns(texto)[0] ?? vazia();
}

const juntar = (antes: string | null, novo: string): string =>
  antes === null || antes === "" ? novo : `${antes} ${novo}`;

/* ------------------------------------------------------------------ *
 * Cirurgia de texto para o rascunho
 * ------------------------------------------------------------------ */

/**
 * Devolve só os lances de um PGN: sem as tags da fonte e sem uma palavra de
 * prosa.
 *
 * É o que o importador escreve no rascunho. **Por que cirurgia de texto e não
 * reimpressão da árvore:** reimprimir exigiria um escritor que emite
 * parênteses aninhados, com numeração correta em cada nível — e o único ganho
 * seria formatação. Aqui o que interessa é que a fonte entre no repositório
 * **sem a prosa do curso pago** e com os lances intactos, e para isso apagar
 * basta.
 *
 * O que sai: as tags (`[Event "…"]` — o cabeçalho do rascunho é nosso), os
 * comentários entre chaves (com tudo que mora dentro deles: `[%cal …]`,
 * `[%csl …]`, `[#]`, `[%c_effect …]`, o artefato `$146ão` que o chess.com
 * escreve onde era "Não") e os comentários de ponto e vírgula. O que fica:
 * números de lance, SAN e NAGs — os NAGs porque são a matéria-prima da regra
 * do erro nomeado em `arvore.ts`.
 */
export function apenasLances(texto: string): string {
  return texto
    .replace(/\{[^}]*\}/g, " ") // a prosa, e tudo que mora dentro dela
    .replace(/\[\s*\w+\s*"[^"]*"\s*\]/g, " ") // as tags da fonte
    .replace(/;[^\n]*/g, " ") // comentário até o fim da linha
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O que sobra de um `{comentário}` da fonte depois de tirar o que o exportador
 * escreveu para si mesmo.
 *
 * Sai: `[%c_effect …]`, `[%cal …]`, `[%csl …]` — as setas e as casas pintadas
 * do chess.com, que só fazem sentido dentro do visualizador dele — e `[#]`, a
 * marca de "põe um diagrama aqui". Fica a frase.
 *
 * O `$146` vira `N`: 146 é o NAG da novidade, e o exportador do chess.com
 * converte a letra **N** no começo de palavra para ele. No PGN do Krikor isso
 * aparece como `$146ão é uma defesa ruim`, que é "Não é uma defesa ruim".
 * Desfazer aqui é seguro porque este texto é prosa — dentro dos lances, `$146`
 * continua sendo NAG e nem chega nesta função.
 */
function limparComentario(dentro: string): string {
  return dentro
    .replace(/\[%[^\]]*\]/g, " ")
    .replace(/\[#\]/g, " ")
    .replace(/\$146/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Devolve os lances **com** a prosa da fonte, limpa dos artefatos do
 * exportador. É o irmão de `apenasLances`, e existe pelo motivo oposto.
 *
 * `apenasLances` protege o repositório: o rascunho versionado não pode carregar
 * o texto de um curso pago. Mas quem escreve o comentário do repertório precisa
 * do **argumento** do autor na mão — sem ele a justificativa de cada lance é
 * escrita do zero olhando o tabuleiro, que foi exatamente o buraco medido em
 * 6/9/2026: 4 de 103 comentários carregavam o raciocínio da fonte. O importador
 * escreve esta versão num gêmeo **fora do Git**, e o rascunho versionado aponta
 * para ela.
 *
 * A ordem da alternância é a mesma da varredura, e pelo mesmo motivo: o
 * `{comentário}` casa primeiro, então um `;` ou um `[%… "…"]` que more dentro
 * da prosa é engolido por ela antes de as outras alternativas terem chance. Ao
 * contrário de fazer as três trocas em sequência, isto não corta uma frase no
 * primeiro ponto e vírgula que a fonte escrever.
 *
 * Comentário que fica vazio depois da limpeza — os `{[%c_effect …]}` sozinhos,
 * que são a maioria no Krikor — some, em vez de virar um `{}` sem palavra.
 */
export function lancesComProsa(texto: string): string {
  return texto
    .replace(/\{[^}]*\}|\[\s*\w+\s*"[^"]*"\s*\]|;[^\n]*/g, (achado) => {
      if (!achado.startsWith("{")) return " ";
      const limpo = limparComentario(achado.slice(1, -1));
      return limpo === "" ? " " : ` {${limpo}} `;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recorta o texto bruto de um arquivo nos jogos que ele contém.
 *
 * Serve ao importador, que precisa do **texto** de cada jogo (para escrever o
 * rascunho sem prosa) e não só da árvore. Com um jogo só — 19 dos 20 arquivos
 * de fonte — é o texto inteiro e acabou. Com vários, o corte é no `[Event`, o
 * que é seguro porque um arquivo com vários jogos é um arquivo que os separa
 * com cabeçalho completo. Quem separa para **ler** continua sendo `lerPgns`,
 * por token.
 *
 * **O que este código já errou:** a primeira versão descartava os pedaços "sem
 * lance" testando `/\d\s*\./`, para se livrar do preâmbulo que vem antes do
 * primeiro `[Event`. O preâmbulo do arquivo do Kushager traz a data
 * "5/9/2026." — que casa com esse teste. Ele sobreviveu ao filtro, empurrou os
 * dez capítulos uma casa, e o rascunho saiu com o capítulo 1 vazio e o 10
 * perdido. Agora o preâmbulo é reconhecido pelo que ele é — o que vem antes do
 * primeiro `[Event` — e a contagem é conferida contra o que o leitor achou:
 * discordando, `confere` vem `false` e quem chamou trata o arquivo como um
 * bloco só. Recortar errado em silêncio é o que não pode acontecer.
 */
export function recortarJogos(
  texto: string,
  quantos: number,
): { pedacos: string[]; confere: boolean } {
  if (quantos <= 1) return { pedacos: [texto], confere: true };
  const partes = texto.split(/(?=^\[Event )/m);
  const jogos = partes[0].trimStart().startsWith("[Event ") ? partes : partes.slice(1);
  return jogos.length === quantos
    ? { pedacos: jogos, confere: true }
    : { pedacos: [texto], confere: false };
}

/** Quebra uma linha longa de lances em linhas de até `largura` colunas. */
export function embrulhar(texto: string, largura = 80): string {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(" ")) {
    if (atual === "") atual = palavra;
    else if (atual.length + 1 + palavra.length <= largura) atual += ` ${palavra}`;
    else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual !== "") linhas.push(atual);
  return linhas.join("\n");
}
