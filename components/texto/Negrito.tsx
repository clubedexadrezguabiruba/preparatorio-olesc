import { emPedacos } from "@/lib/texto/negrito";

/**
 * O texto de conteúdo com o `**negrito**` desenhado, e não impresso.
 *
 * Sem `"use client"` de propósito: é uma função pura de string para JSX, então
 * roda no servidor quando quem a usa é servidor, e é arrastada para o pacote do
 * cliente só quando um componente de cliente a importa (o `Quiz`). Não há
 * `dangerouslySetInnerHTML` aqui — cada pedaço é texto, e o React o escapa.
 *
 * A regra e os limites dela estão em `lib/texto/negrito.ts`.
 */
export function Negrito({ children }: { children: string }) {
  return (
    <>
      {emPedacos(children).map((pedaco, i) =>
        pedaco.forte ? (
          // A chave é o índice porque a lista é derivada de uma string imutável
          // e nunca é reordenada nem filtrada: o índice **é** a identidade do
          // pedaço.
          <strong key={i} className="font-semibold">
            {pedaco.texto}
          </strong>
        ) : (
          <span key={i}>{pedaco.texto}</span>
        ),
      )}
    </>
  );
}
