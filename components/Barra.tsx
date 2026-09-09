/**
 * A barrinha de progresso, numa forma só.
 *
 * Três telas a desenham — a lista de temas, o painel e a lista de tarefas. Em
 * três lugares, três alturas e três cores ligeiramente diferentes, sem que
 * ninguém tivesse decidido isso.
 *
 * Ela é `aria-hidden` de propósito: o número ao lado dela diz a mesma coisa em
 * texto, e um leitor de tela que lesse os dois diria tudo duas vezes.
 *
 * ## O segundo segmento, e por que ele é hachurado
 *
 * `declarado` nasceu com a barra do dia em 2026-09-09. A meta de 90 minutos
 * inclui os 30 da partida, e a partida acontece no chess.com: o site não a
 * cronometra, ele acredita na caixa que o aluno marcou. Desenhar esse pedaço
 * com a mesma cor cheia do tempo medido seria a barra afirmando ter medido o
 * que ela não mediu — e é exatamente o tipo de número mentiroso que esta
 * rodada veio consertar. Por isso ele entra como hachura, encostado no fim do
 * medido, e não como uma cor a mais.
 *
 * Ele fica **opcional**: as outras três telas não têm nada declarado, e um
 * parâmetro obrigatório que elas passariam como zero seria ruído em três
 * lugares para servir a um.
 */
export function Barra({
  feitos,
  de,
  tom = "metodo",
  declarado = 0,
}: {
  feitos: number;
  de: number;
  tom?: "metodo" | "completo";
  /** A parte que o aluno declarou e o site não mediu. Sai hachurada. */
  declarado?: number;
}) {
  const parte = de > 0 ? Math.min(1, feitos / de) : 0;
  // O declarado não empurra o medido para fora: os dois juntos param em 100%.
  const parteDeclarada = de > 0 ? Math.min(1 - parte, declarado / de) : 0;
  return (
    // **O trilho é `carta-toque`, e não `carta-alta`.** No tema escuro a
    // distância entre `carta` e `carta-alta` é 1,24:1, e uma barra a 0% ficava
    // indistinguível de um fio divisório dentro do cartão — medido na folha do
    // painel novo: "o aluno não tem nenhum progresso legível". Uma barra vazia
    // precisa ler como barra vazia, senão ela só existe para quem já avançou.
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-carta-toque" aria-hidden>
      <div
        className={`h-full rounded-full transition-[width] ${
          tom === "completo" ? "bg-metodo-cheio" : "bg-metodo-superficie"
        }`}
        style={{ width: `${parte * 100}%` }}
      />
      {parteDeclarada > 0 ? (
        <div
          className="hachura h-full rounded-full transition-[width]"
          style={{ width: `${parteDeclarada * 100}%` }}
        />
      ) : null}
    </div>
  );
}
