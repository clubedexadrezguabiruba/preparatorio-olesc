/**
 * A barrinha de progresso, numa forma só.
 *
 * Três telas a desenham — a lista de temas, o painel e a lista de tarefas. Em
 * três lugares, três alturas e três cores ligeiramente diferentes, sem que
 * ninguém tivesse decidido isso.
 *
 * Ela é `aria-hidden` de propósito: o número ao lado dela diz a mesma coisa em
 * texto, e um leitor de tela que lesse os dois diria tudo duas vezes.
 */
export function Barra({
  feitos,
  de,
  tom = "metodo",
}: {
  feitos: number;
  de: number;
  tom?: "metodo" | "completo";
}) {
  const parte = de > 0 ? Math.min(1, feitos / de) : 0;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-carta-alta" aria-hidden>
      <div
        className={`h-full rounded-full transition-[width] ${
          tom === "completo" ? "bg-metodo-cheio" : "bg-metodo-superficie"
        }`}
        style={{ width: `${parte * 100}%` }}
      />
    </div>
  );
}
