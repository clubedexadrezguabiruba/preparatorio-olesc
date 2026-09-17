import { redirect } from "next/navigation";

/**
 * `/progresso` virou parte de "Meu perfil" (Doug, 17/9/2026).
 *
 * A rota fica, e redireciona: um link salvo, um favorito ou o histórico do navegador de um aluno
 * não podem cair num 404 por causa de uma mudança de nome. O conteúdo — a revisão de hoje e os
 * graus de cada linha, aula e tema — está em `app/perfil/Graus.tsx`, com a conta em
 * `lib/progresso/resumo.ts`.
 */
export default function Progresso(): never {
  redirect("/perfil");
}
