/**
 * O anel de progresso dos cartões de tema (Doug, 16/9: "não gosto de lista,
 * prefiro cartões", e escolheu o anel entre três desenhos).
 *
 * Herda as duas lições da `Barra`:
 *
 * - **O trilho é `carta-toque`.** Um anel a 0% tem de ler como anel vazio, e não
 *   como um fio sumindo no cartão.
 * - **Ele é `aria-hidden`.** O cartão escreve "18 de 34" ao lado; um leitor de
 *   tela que lesse o anel e o texto diria tudo duas vezes.
 *
 * No meio vai a porcentagem, ou o ✓ quando fechou, ou nada quando vazio. `metodo-cheio` só no anel
 * completo — o mesmo `tom="completo"` da barra.
 */
export function AnelDeProgresso({
  feitos,
  de,
  tamanho = 52,
}: {
  feitos: number;
  de: number;
  tamanho?: number;
}) {
  const parte = de > 0 ? Math.min(1, feitos / de) : 0;
  const completo = parte >= 1;
  const traco = tamanho >= 48 ? 5 : 4;
  const raio = (tamanho - traco) / 2;
  const volta = 2 * Math.PI * raio;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: tamanho, height: tamanho }} aria-hidden>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" strokeWidth={traco} className="stroke-carta-toque" />
        {parte > 0 ? (
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            strokeWidth={traco}
            strokeLinecap="round"
            strokeDasharray={`${(volta * parte).toFixed(2)} ${volta.toFixed(2)}`}
            className={completo ? "stroke-metodo-cheio" : "stroke-metodo-superficie"}
          />
        ) : null}
      </svg>
      {/* Vazio, o anel não escreve "0%": cinza sobre cinza a 9 px era ilegível, e o
          rodapé do cartão já diz "Começar". */}
      {parte > 0 ? (
        <span className={`absolute text-[11px] font-semibold tabular-nums ${completo ? "text-metodo-tinta-alta" : "text-tinta"}`}>
          {completo ? "✓" : `${Math.round(parte * 100)}%`}
        </span>
      ) : null}
    </div>
  );
}
