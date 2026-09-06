import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Os arquivos de puzzle viajam junto com o servidor.
   *
   * O Next monta o pacote de cada rota a partir do que ele **enxerga** nos
   * imports. `public/puzzles/**` é lido por caminho, em tempo de execução
   * (`lib/tatica/banco.ts`), então ele não enxerga nada — e o pacote sobe sem
   * os arquivos. Localmente funciona, porque o processo roda dentro do
   * repositório inteiro; na Vercel, a página do tema responderia
   * `ENOENT: index.json` no primeiro aluno que abrisse a tarefa.
   *
   * São 33 MB no pacote do servidor, contra o teto de 250 MB. O que se compra
   * com eles: o servidor escolhe os 24 puzzles da série (em vez de mandar 1,4
   * MB ao celular para ele sortear) e reconfere o lance antes de gravar.
   */
  /**
   * As aulas de finais viajam junto pelo mesmo motivo — e a previsão de que a
   * estaticidade cairia sozinha se cumpriu pela metade no B4:
   *
   * - `/finais` virou **dinâmica**: a trilha mostra o estado de cada aula para
   *   *aquele* aluno, e para isso lê o `content/` por caminho a cada pedido.
   *   Sem esta entrada, a lista responderia `ENOENT` na Vercel.
   * - `/finais/[aula]` continua **estática**: o único pedaço de aula que depende
   *   do aluno é o controle da aula de leitura, e ele busca o próprio estado do
   *   navegador (`Leitura.tsx`) em vez de cobrar uma consulta na abertura das 49.
   *   Ela fica listada assim mesmo, porque a próxima aula que precise do aluno
   *   na renderização derruba a estaticidade sem que ninguém lembre daqui.
   *
   * São ~700 KB de JSON contra o teto de 250 MB do pacote.
   */
  /**
   * F2: toda rota que lê disco por caminho entra aqui, e a lista é o lugar em
   * que se descobre uma rota nova que esqueceu de entrar — em produção, como
   * `ENOENT`, no primeiro aluno. Por isso as rotas que só chamam
   * `aulasPublicadas()` (painel, professor, trilha) também estão listadas: a
   * varredura devolve `[]` numa pasta que não existe, e o painel diria
   * "0 aulas abertas" sem erro nenhum.
   */
  outputFileTracingIncludes: {
    "/tatica/[tema]": ["./public/puzzles/**"],
    "/tatica/revisao": ["./public/puzzles/**"],
    "/finais": ["./content/**"],
    "/finais/[aula]": ["./content/**"],
    "/trilha": ["./content/**"],
    "/meio-jogo": ["./content/**"],
    "/meio-jogo/[dica]": ["./content/**"],
    "/professor": ["./content/**"],
    "/professor/[aluno]": ["./content/**", "./public/puzzles/**"],
    // As 42 linhas do repertório entram pelo mesmo motivo:
    // `lib/repertorio/banco.ts` as lê por caminho, então o Next não as enxerga.
    // São poucos KB — o que se compra com eles é o servidor julgar os lances
    // antes de gravar, em vez de acreditar num "acertei" vindo do navegador.
    "/aberturas": ["./public/repertorio/**"],
    "/aberturas/[cor]/[abertura]": ["./public/repertorio/**"],
    /*
     * **O painel lê os dois, e por isso ele é uma linha só com os dois.**
     *
     * Ele veio de dois ramos que cresceram em paralelo: o de finais listou
     * `content/` aqui, o de repertório listou `public/repertorio/`. Em objeto
     * de JavaScript a segunda chave apaga a primeira **sem erro nenhum** — e o
     * que se perderia é o pacote de arquivos da página inicial do aluno, com o
     * `ENOENT` aparecendo só na Vercel, no primeiro aluno que abrisse o site.
     * É exatamente a falha que o comentário do F2 acima descreve, e ela quase
     * entrou pela porta de um merge.
     */
    "/painel": ["./content/**", "./public/repertorio/**"],
  },
  /**
   * O motor da etapa 5 são 7,3 MB servidos de `public/engine/`. O padrão do
   * Next para `public/` é `max-age=0, must-revalidate`: correto para conteúdo
   * que muda, caro para um binário que nunca muda — cada aluno que reabre a
   * etapa paga um round-trip antes do primeiro lance.
   *
   * `immutable` só é honesto porque **o nome carrega a versão**
   * (`stockfish-18.0.8-lite-single.wasm`). A regra que sustenta isso: trocar os
   * bytes exige trocar o nome. Um dia atualizar o motor é mexer no
   * `lib/engine/build.ts` e trazer arquivos novos — nunca sobrescrever estes.
   *
   * Isto é otimização, não requisito: se a hospedagem não honrar o cabeçalho
   * sobre `public/`, o padrão ainda devolve 304 com os bytes já em disco.
   */
  async headers() {
    return [
      {
        source: "/engine/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
