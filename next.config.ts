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
  outputFileTracingIncludes: {
    "/tatica/[tema]": ["./public/puzzles/**"],
    "/finais": ["./content/**"],
    "/finais/[aula]": ["./content/**"],
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
