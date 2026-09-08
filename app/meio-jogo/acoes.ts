"use server";

import { perfilAtual } from "@/lib/auth/perfil";
import { gravarTreino, type RespostaDoTreino } from "@/lib/meiojogo/gravar";

/*
 * A ação `marcarDica` saiu daqui em 2026-09-07, junto com a caixa "li".
 *
 * Ela não tinha mais tela que a chamasse, e uma server action sem tela **não é
 * código morto**: ela continua sendo um endereço que o navegador pode chamar.
 * Deixá-la seria manter aberta uma porta que escreve em `dica_lida` sem que
 * nada no site a use.
 *
 * A **tabela** não foi apagada, e é decisão do plano: ela guarda o que os
 * alunos já declararam, e derrubá-la jogaria fora histórico para não ganhar
 * nada. O que acabou foi o caminho de escrita.
 */

/**
 * Grava uma resposta do treino.
 *
 * A casca é fina de propósito: quem julga e quem escreve é
 * `lib/meiojogo/gravar.ts`, que roda fora de uma requisição do Next e por isso
 * pode ser provado contra o banco de verdade por `scripts/verificar-meiojogo.ts`.
 * O que só existe aqui é o **quem** — tirado do cookie de sessão, nunca do
 * corpo da chamada, porque a chave de serviço que grava ignora toda a RLS e não
 * tem como perguntar quem pediu.
 *
 * Sem `revalidatePath`: a página da dica não mostra número nenhum de tentativa,
 * e revalidá-la a cada clique jogaria fora o estado do treino em curso.
 */
export async function gravarTentativaDeTreino(dado: RespostaDoTreino): Promise<void> {
  const perfil = await perfilAtual();
  const resultado = await gravarTreino(perfil.id, dado);
  // O erro fica no servidor: a tela do aluno já mostrou o veredito no instante
  // do toque, e uma linha que não gravou é problema do professor, não dele.
  if ("erro" in resultado) console.error(`meio-jogo: ${dado.item} não gravou — ${resultado.erro}`);
}
