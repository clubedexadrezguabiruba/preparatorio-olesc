import type { ReactNode } from "react";

/**
 * O palco de uma aula: o tabuleiro de um lado, a voz do professor do outro.
 *
 * **Por que isto existe.** Até 8/9/2026 a aula de abertura era uma coluna só de
 * 576 px. Medida num notebook de 1366×768, na Escandinava, ela punha o cartão
 * de comando em 744 px, o comentário em 820 e o botão "Continuar" em 864 — os
 * três **abaixo da dobra**, com 315 px de rolagem obrigatória. E o comentário
 * trava a passada (`fase: "lendo"` em `lib/repertorio/passada.ts`), então o
 * aluno era obrigado a rolar para ler e rolar de volta para jogar, a cada lance
 * comentado. Enquanto isso sobravam 384 px de vão vazio de cada lado.
 *
 * O molde é o chess.com, medido ao vivo na aula "Roque" em 8/9/2026 (viewport
 * de 1366×577): tabuleiro de 544 px, painel de 452 px a 24 px dele, botão
 * cravado em y=497 em **todos** os treze estados da aula, e rolagem **zero** em
 * todos eles. O que sustenta isso está no CSS, não aqui: `.aula-tabuleiro`
 * dimensiona o tabuleiro pela ALTURA que sobra, e não pela largura da coluna.
 * Ver o bloco "O palco da aula" em `app/globals.css`.
 *
 * **Este componente não sabe nada de xadrez.** É por isso que ele mora em
 * `components/lesson/` e não em `app/aberturas/`: os finais, o meio-jogo e o
 * que vier depois têm o mesmo par tabuleiro/painel, hoje copiado à mão em
 * quatro `*Stage.tsx` com uma divergência já plantada (`lg:w-[26rem]` em três
 * deles, `lg:w-104` no `PracticeStage`).
 */
export function AulaShell({
  tabuleiro,
  painel,
  magro = false,
}: {
  tabuleiro: ReactNode;
  painel: ReactNode;
  /**
   * O painel magro: 416 px em vez de 522, e mais tabuleiro no celular.
   *
   * É para a tela em que o professor **não explica** — na tática ele diz uma
   * linha em repouso e só abre a aula do tema se o aluno pedir a dica. Um
   * painel dimensionado para prosa, servindo uma linha, é vão desenhado como
   * conteúdo. A conta dos três números está em `.aula-palco-magro`, no bloco
   * "O palco da aula" de `app/globals.css`.
   */
  magro?: boolean;
}) {
  return (
    <div className={magro ? "aula-palco aula-palco-magro" : "aula-palco"}>
      <div className="aula-tabuleiro">{tabuleiro}</div>
      <div className="aula-painel">{painel}</div>
    </div>
  );
}

/**
 * O rodapé do painel, onde moram os botões.
 *
 * **O botão NÃO é cravado no pé do painel, e isso foi uma correção.** A
 * primeira versão usava `mt-auto` para encostá-lo na borda de baixo, copiando
 * o chess.com — lá o botão não se move um pixel em treze estados seguidos.
 *
 * Medido na nossa tela, não funcionou: numa janela de 1152 de altura sobravam
 * **358 px de vazio absoluto** entre o fim do comentário e o botão, com o
 * vazio medindo o dobro da altura da caixa de texto. Dois motivos para
 * desfazer:
 *
 * 1. O chess.com pode cravar porque o painel dele está CHEIO — avatar de 96 px,
 *    bolha, barra de progresso e os selos das etapas. O nosso era esparso, e num
 *    painel esparso a âncora não organiza: rasga.
 * 2. "Continuar" é a resposta a "leia o comentário". Cravar no pé trocava uma
 *    relação que o aluno sente a cada lance — o botão perto do texto — por uma
 *    que ele não percebe: a borda de baixo do botão alinhada com a do
 *    tabuleiro, do outro lado de um vão de 40 px, sem nenhuma linha em comum.
 *
 * A estabilidade do alvo, que era o ponto do `mt-auto`, veio de outro lugar e
 * mais barato: o comentário reserva altura fixa (ver `Comentario`), então o
 * botão já fica no mesmo pixel de um lance para o outro. O que sobra de painel
 * cai **abaixo** do botão — que é borda de coluna, e não rasgo no meio dela.
 *
 * **A premissa 1 mudou em 8/9/2026, e a decisão não.** O painel deixou de ser
 * esparso: ganhou o retrato do professor de 96 px ao lado do comentário e a
 * trilha das três etapas abaixo do cartão — que é, item por item, o que fazia o
 * painel deles caber a âncora. O que **não** mudou é a premissa 2, e ela é a
 * que decide: cravar o botão no pé continuaria separando "Continuar" do texto
 * que ele responde, e essa é uma relação que o aluno sente a cada lance. Um
 * painel cheio torna a âncora possível; ela continua não sendo melhor.
 */
export function AulaRodape({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 lg:pt-1">{children}</div>;
}
