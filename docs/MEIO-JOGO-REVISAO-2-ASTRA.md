# Segunda revisão da Astra — sobre o plano v2

> Recebida em 2026-09-07, colada pelo Doug diretamente na conversa (não como
> arquivo). Responde à v2 de `MEIO-JOGO-PLANO-DIDATICO.md`; a v2.1/v2.2 do plano
> incorporam o que está aqui — ver a §1 do plano para o histórico ponto a ponto.

A resposta do Claude é boa e o v2 melhorou bastante. Minha decisão seria: aprovar a fatia de 8 conceitos antes de 26/9 e rejeitar a expansão para os 30 antes do piloto.

Essa escolha é mais adequada para alunos de 12 a 15 anos que possivelmente estão conhecendo os temas pela primeira vez. Entretanto, eu ainda não liberaria a implementação sem corrigir alguns pontos do v2.

Os problemas restantes são estes:

1. A posição final do puzzle não é "quieta por construção".
   O fato de a linha fornecida pelo Lichess terminar legalmente não demonstra que desapareceram todas as ameaças táticas. O puzzle termina quando sua solução registrada termina; a posição final ainda pode conter xeque, captura forte, ameaça imediata ou vantagem material esmagadora. Cada posição precisa de uma verificação tática própria. A frase "quieta por construção" deve sair do plano.
2. O método troca um risco por outro.
   Aplicar toda a linha elimina a combinação original, mas frequentemente deixa a posição depois de ganho de material, promoção ou ataque decisivo. Isso pode distorcer perguntas como "qual plano seguir?" ou "qual peça melhorar?". A posição final pode servir como candidata, nunca como posição automaticamente apropriada.
3. "Número de candidatos a descartar" não mede bem a dificuldade.
   Contar peões ou colunas é, no máximo, uma variável auxiliar. A dificuldade também depende de familiaridade visual, peças sobrecarregadas, quantidade de elementos concorrentes, necessidade de imaginar movimentos e clareza do enunciado. O plano deve chamar isso de característica do item, não de "medida própria de dificuldade". A dificuldade real será estimada pelas tentativas dos alunos.
4. O banco de sete posições ainda não cobre todos os cinco degraus anunciados.
   A tabela reserva posições para exemplo, reconhecimento e revisão, mas não aloca claramente uma posição independente para aplicação. O degrau 4 reaproveita a posição de reconhecimento e o degrau 5 promete uma posição nova. É necessário declarar:
   - qual posição serve à aplicação guiada;
   - qual serve à aplicação independente;
   - se essas posições estão incluídas nas sete;
   - quando o degrau 5 será realmente oferecido.
   Se a aplicação independente só chegar depois do torneio, isso precisa aparecer claramente como objetivo futuro, e não como parte da entrega piloto.
5. O exemplo de feedback sobre o peão isolado ensina uma generalização ruim.
   A frase "toda defesa dele custa uma peça parada" é excessiva. Uma peça pode defendê-lo ativamente, o rei pode defendê-lo, ou o peão pode avançar, ser trocado ou gerar atividade. Um feedback mais seguro seria:
   "Como não há um peão amigo nas colunas vizinhas, esse peão não pode receber a defesa simples de outro peão na estrutura atual. Por isso, pode exigir defesa de peças ou virar alvo."
6. A aplicação proposta para m12 não está suficientemente definida.
   "Para atacar g6, qual casa a peça branca precisa alcançar primeiro?" pode exigir cálculo ou ter várias respostas plausíveis. "Gabarito curado" não elimina ambiguidade. O plano precisa registrar alternativas aceitáveis, justificativa e análise de refutações.
7. O piloto não avaliará a revisão espaçada.
   A revisão só será implementada até 2/10. Portanto, o piloto de 19–25/9 avaliará apresentação, compreensão, ajuda, interação e exercícios iniciais. Ele não validará retenção, transferência tardia nem funcionamento pedagógico dos intervalos 2–7–14. O relatório do piloto deve declarar esse limite.
8. "Mais de um terço errou" não basta para decidir reescrita.
   Com aproximadamente 12 alunos, isso representa cerca de quatro alunos. Um índice alto pode indicar enunciado ruim, dificuldade apropriada, conceito mal ensinado, posição ambígua ou problema de interface. É preciso examinar os erros e observar os alunos antes de concluir que o texto deve ser reescrito.
9. Falta critério para interpretar itens fáceis demais.
   Um exercício em que todos acertam pode estar bem ensinado ou entregar a resposta visualmente. O piloto deve examinar erros elevados, acertos quase universais, uso frequente de apoio, cliques muito rápidos e padrões de alternativas escolhidas.
10. O realce automático de todas as coordenadas pode produzir excesso visual.
    As 136 referências não devem virar necessariamente 136 destaques automáticos. Em frases com várias casas, acender tudo pode aumentar a carga cognitiva. O conteúdo precisa definir o destaque relevante em cada passo, em vez de extrair automaticamente todas as coordenadas da prosa.
11. O critério "explicação acima da dobra" pode conflitar com o próprio layout.
    Num viewport de 360 px, tabuleiro, cabeçalho, legenda e citação provavelmente ocupam mais que uma tela. O objetivo adequado é a explicação aparecer cedo e evitar rolagem de ida e volta. Exigir que o primeiro parágrafo esteja acima da dobra pode levar a um tabuleiro pequeno ou a conteúdo comprimido. O critério deve ser testado, não fixado previamente.
12. A seleção dos oito conceitos precisa acompanhar a tarefa real.
    Se esses são exatamente os oito conceitos de s2-meiojogo, a escolha faz sentido. Se foram escolhidos apenas pela variedade, é preciso verificar a correspondência com o que os alunos realmente receberão na semana do piloto.
13. O plano precisa prever consentimento e interpretação cuidadosa do tempo.
    Gravar tempo_ms sem mostrar cronômetro é razoável. Porém, tempos muito curtos não provam fraude ou falta de estudo: podem resultar de releitura, retorno à página ou compreensão rápida. O professor deve receber o tempo como sinal contextual, não diagnóstico do aluno.
14. A migração para produção na véspera do piloto deixa pouco espaço de segurança.
    A entrega técnica termina em 18/9 e o uso começa em 19/9. Seria melhor concluir um fluxo funcional alguns dias antes ou reduzir ainda mais o conteúdo se surgirem problemas. A prioridade deve ser a qualidade dos oito temas, não atingir obrigatoriamente 56 posições.

Minha orientação ao Claude seria:

Adote a opção de 8 conceitos até o piloto e mantenha as outras 22 dicas disponíveis com a melhoria de leitura. Antes de implementar, faça uma v2.1 corrigindo a afirmação de que a posição final do puzzle é quieta, esclarecendo a alocação de posições para cada degrau, limitando o que o piloto poderá validar e revisando os critérios de dificuldade, feedback e análise dos resultados.

Não trate 56 posições como obrigação absoluta. O piloto precisa de uma sequência íntegra e bem curada para os oito conceitos. Se o prazo não comportar isso, reduza o número de posições iniciais por conceito e deixe reservas adicionais para antes da ativação da revisão espaçada. Não reduza a revisão humana.

Considere aprovada a decisão de escopo: 8 conceitos antes de 26/9; expansão para os 30 somente depois da análise do piloto e das correções.

Portanto, eu concordo com a principal recomendação do Claude, mas pediria essa correção final do plano. O salto da v1 para a v2 foi relevante; ainda existem afirmações técnicas fortes demais e uma lacuna entre os cinco degraus prometidos e as posições efetivamente alocadas.
