# Revisão da tática — 18/09/2026

## Parecer

Manter a estrutura aquecimento → série → prova, os 39 exercícios por tema como ponto de partida, a mistura de temas e a revisão espaçada. O projeto tem uma boa base de prática. Os problemas prioritários estão na precisão das explicações e na confiabilidade da avaliação/retomada, não na necessidade de uma reforma do currículo.

## Entrega autorizada após a auditoria

Doug pediu concluir as mudanças até meio-dia e fazer commit/push antes de atingir o limite de uso. Foram implementadas as correções de conteúdo da prioridade 1, a prova com cabeçalho neutro e sem dicas do tema atual, retomada com seleção persistida nas três etapas e na prova de nível, primeira resposta única por puzzle/rodada, botão de refazer prova de nível, espera pela confirmação de gravação, recuperação de resposta após queda de conexão, placar acumulado após F5 e mensagens de revisão corrigidas. O aquecimento agora prefere efetivamente `oneMove` quando existem cinco opções. A prova deixa de buscar erros da prova de nível como se fossem da série.

**Mantidos:** 5 + 24 + 10, conclusão temática sem nota de corte, revisão 2/7/14 e currículo. As melhorias pedagógicas de carga, adaptação e observação de retenção abaixo continuam como recomendações, não implementações.

**Banco:** migration aditiva `0020_tatica_rodadas.sql` aplicada; preserva as tentativas antigas. Provas de nível antigas sem identificação de rodada continuam no histórico, mas não são combinadas para conceder novas aprovações. Selos já conquistados não são removidos.

**Evidências:** ensaio de banco com contas descartáveis confirmou retomada, concorrência, primeira resposta, nova prova e isolamento entre alunos. Ensaio Playwright confirmou prova sem dica, F5, recuperação após requisição interrompida, espera com gravação atrasada em quatro segundos, placar 10/10 após retomada e tema concluído. Contas de ensaio removidas ao terminar.

Verificação final: **1.721 testes passaram**, `typecheck` e `build` passaram; lint sem erros (um aviso no arquivo temporário externo à revisão `tmp-conferir-escocesa.ts`). Captura de celular conferida em `.scratch/tatica-revisao/prova-celular.png`.

**Limitação preexistente dos portões:** `db:finais` falha em 14 afirmações porque suas listas KRK não correspondem à posição atual de `N1-KPK`; o próprio script registra que as listas precisam ser substituídas. Não houve mudança em finais. `db:rls` passou nas verificações executadas; o passo do professor é omitido pelo script quando não recebe o PIN do professor. `db:tatica` passou.

O restante deste documento registra os achados da auditoria inicial e as recomendações; os problemas técnicos corrigidos são os enumerados acima.

## Escopo e evidência

- Leitura do seletor, progressão, gravação, revisão, correção, conteúdo de todos os temas e componentes da série; leitura complementar da prova de nível e da seleção por rating.
- `node --test "lib/tatica/**/*.test.ts"`: **232 testes passaram**, nenhum falhou.
- Simulações somente de leitura contra os arquivos locais de puzzles: retomada da prova, dificuldade do aquecimento/série e comprimentos das linhas de `mateIn5`.
- Não houve execução no navegador autenticado, escrita no Supabase nem auditoria enxadrística individual de todo o banco. Problemas de fluxo de interface descritos abaixo foram identificados no código, não demonstrados em sessão real de aluno.
- Os testes existentes passam, mas não cobrem todos os cenários encontrados.

## O resumo fornecido: o que está certo e o que precisa de ressalva

**Correto:** metas 5/24/10, sequência fixa dentro do tema, conclusão por contagem de tentativas, prova com retomada de erros e mistura, retirada da pendência específica após tentativa na prova, revisão espaçada separada e existência de outra prova de nível.

**Ressalvas importantes:**

1. **39 é a meta de tentativas, não 39 posições diferentes nem domínio demonstrado.** A prova repete posições de propósito. O erro é gravado no primeiro lance errado, antes de o aluno terminar a correção daquele puzzle.
2. **Aquecimento não escolhe necessariamente os cinco mais fáceis.** Sorteia na faixa mais baixa e ordena o recorte. `oneMove` e `short` entram no mesmo conjunto, sem preferência entre eles; no Lichess, `short` significa dois lances do aluno.
3. **A série não cobre literalmente “o tema inteiro”.** É uma amostra de 24 posições ordenada por rating; não há garantia de cobertura de variantes do motivo, equilíbrio por faixas ou adaptação ao desempenho durante a série.
4. **A prova não é inteiramente sem pista temática.** O título do tema permanece na moldura e a ajuda continua sendo a do tema atual, inclusive quando o puzzle é de outro tema.
5. **Os temas anteriores são temas com progresso, não necessariamente concluídos.** O seletor pega os primeiros três da lista recebida, sem regra explícita de recência, necessidade ou rotação. No primeiro tema, sem outros disponíveis, toda a prova fica nele.
6. **Estabilidade da semente não garante estabilidade da prova em andamento.** Mudar `faltam`, vistos e erros pendentes muda as fatias sorteadas. A série temática tem comportamento mais estável no caso normal; não é correto estender essa garantia à prova.
7. **Nem todo erro cabe na prova.** Com dez vagas há inicialmente até cinco repetições. Erros excedentes continuam atendidos pela revisão espaçada, mas podem nunca reaparecer na prova do tema concluído.
8. **“Não repete” tem exceção.** `sortear` volta ao conjunto inteiro quando faltam inéditos; pode repetir fora da retomada deliberada de erros.
9. **A prova de nível tem nota de corte:** 9 de 12. A ausência de corte se aplica à prova temática.

Referências: `lib/tatica/serie.ts`, `lib/tatica/escolher.ts`, `app/tatica/[tema]/page.tsx`, `lib/curso/nivel.ts`.

## Correções prioritárias

### 1. Explicações que ensinam regras falsas ou excessivamente absolutas

Em `content/temas.json`, preservar a linguagem simples, mas corrigir:

| Tema | Problema atual | Ajuste recomendado |
|---|---|---|
| Mate em 1 | Diz que a peça precisa “encostar” no rei. | Dizer “dar xeque sem permitir captura, bloqueio ou fuga”; o mate pode vir de longe. |
| Peça de graça | Condiciona o perigo da recaptura a ela ser feita por “algo maior”. | Comparar o material total ganho/perdido e as ameaças; uma peça menor também recaptura e pode refutar a combinação. |
| Garfo | “Garfo em casa defendida não é garfo.” | A casa atacada não invalida o motivo; verificar se a captura é legal e se refuta o ganho. |
| Cravada | A peça “não pode defender ninguém” e atacar ganha “sem calcular nada”. | Uma peça cravada pode manter ações legais na linha da cravada; cravadas relativas podem ser abandonadas. Calcular respostas e trocas. |
| Espeto | Peça de trás defendida significa que o espeto “não ganha nada”. | Uma troca favorável ainda pode ganhar material: bispo captura torre defendida, por exemplo. |
| Xeque duplo | “Capturar e tapar são ilegais.” | Só um lance do rei resolve; isso pode incluir o rei capturar um dos atacantes, desde que saia de ambos os xeques. |
| Boden | As diagonais dos dois bispos “se cruzam em cima do rei”. | Um bispo dá xeque e o outro controla fugas; não atribuir aos dois ataque à mesma casa do rei. |
| Ataque na ala do rei | Contar mais atacantes faz o sacrifício funcionar “sozinho”. | A contagem é uma pista; acesso ao rei, tempos e respostas concretas decidem. |
| Sacrifício | Todo sacrifício válido teria respostas obrigatórias; fora disso seria apenas peça perdida. | Delimitar a explicação aos sacrifícios táticos destes exercícios; há compensação posicional e combinações com várias defesas. |
| Mate em 5 | Promete exatamente cinco lances e uma resposta por lance. | “Mate em 5 ou mais”; exigir cálculo das respostas relevantes, sem prometer resposta única. |

**Evidência do último caso:** no banco local, `mateIn5` tem 2.677 linhas de cinco lances do aluno; 429 de seis; 76 de sete; 8 de oito; 1 de nove; 1 de dez. São **515 posições acima de cinco**. O próprio Lichess nomeia essa tag “Mate in 5 or more”. Preferir corrigir o nome/texto a excluir exercícios.

Também retirar estatísticas sem sustentação, como “metade das partidas do seu torneio”, e promessas de transferência exata, como enxergar três lances no puzzle equivaler a dois na partida. Elas não são necessárias para o texto motivar.

### 2. Prova temática: ajuda incompatível com a mistura

`app/tatica/[tema]/page.tsx` passa `explicacao`, `procure` e `cuidado` do tema atual para todas as etapas. `Serie.tsx` oferece essa ajuda também na prova. Um puzzle de outro tema pode receber orientação para procurar o motivo errado.

**Ajuste pequeno:** durante a prova, usar apenas orientação geral de cálculo antes da resposta; revelar o motivo depois. Usar cabeçalho neutro no palco da prova. Se houver ajuda específica antes da resposta, distinguir “com ajuda” de “sem ajuda” no resultado, sem tratar pedir ajuda como punição.

Hoje pedir a dica textual não fica registrado na tentativa. Logo, “de primeira” significa sem lance errado registrado, não necessariamente sem ajuda. As setas automáticas são diferentes: aparecem depois de um erro que já foi contado.

### 3. Retomar a prova muda sua composição

Em `lib/tatica/escolher.ts`, o limite de erros e as fatias são calculados sobre as vagas restantes a cada requisição. A sequência inteira não fica preservada.

**Reprodução local:** tema `fork`, semente `auditoria:fork:prova`, primeiros 20 IDs do banco como erros prévios e temas anteriores `mateIn1`, `pin`, `skewer`. A seleção inicial tinha cinco erros retomados. Simular uma tentativa seguida de recarga a cada puzzle resultou em apenas um erro retomado entre dez e sete posições que não pertenciam à seleção inicial.

**Ajuste:** preservar a lista da rodada e a posição de retomada. Aplicar a cota à prova inteira, não recalculá-la como uma nova prova menor. Acrescentar teste que compare rodada contínua e rodada interrompida após cada resposta.

### 4. Prova de nível: refazer e retomar precisam de correção

Pela leitura de `app/nivel/[n]/prova/page.tsx`:

- Após reprovar, a rota continua encontrando o mesmo resultado reprovado e retorna a tela de resultado. Não há ação de iniciar outra tentativa nessa tela, apesar da promessa de poder repetir.
- Ao recarregar uma prova incompleta, o sorteio retorna a lista inteira e `jaFeitosNaEtapa` é zero. Não há filtro das respostas já feitas naquela rodada.
- `ultimaProvaDeNivel` agrupa as últimas 12 linhas sem um identificador da tentativa. Ter 12 IDs distintos e temas permitidos não prova que as respostas pertencem a uma única prova; rodadas parciais diferentes podem satisfazer os dois critérios.

**Ajuste necessário, sem redesenhar a experiência:** identificar cada tentativa, guardar sua lista e respostas, retomar de onde parou e oferecer “Refazer prova”. O resultado deve usar apenas as respostas daquela tentativa.

### 5. Encerramento antes de todas as gravações

`Serie.tsx` espera `gravandoRef` no fim do aquecimento/série, mas chama `setFim(true)` diretamente nos outros modos. Na prova de nível, isso monta `EncerrarProva` e dispara a correção. Com rede lenta, a última resposta pode ainda não estar salva.

**Ajuste:** aguardar confirmação das respostas antes de encerrar qualquer avaliação; se falhar, preservar e permitir reenviar a mesma tentativa sem duplicar a contagem. Hoje a proteção de primeira tentativa é local ao componente, e `gravarTentativa` faz inserção sem chave da tentativa. Duas abas podem duplicar contagem. O modo rating já tem mecanismos próprios de problema pendente e recuperação: usar a experiência dele como referência, preservando suas regras.

### 6. Textos prometem mais do que o sistema faz

- “Os que você errou voltam misturados na prova”: trocar por “Parte dos erros volta nesta prova; os demais entram na revisão”.
- “Os certos voltam em uma semana”, no fim da revisão: podem voltar em 7 dias, 14 dias ou sair da fila. Preferir “A próxima revisão depende do seu histórico”.
- Na reprovação de nível, “os 12 entraram na fila”: puzzles corretos sem erro anterior não entram. Dizer “Os erros entraram na revisão”.
- Evitar que a comemoração de encerramento signifique domínio ou aprovação, especialmente se houver falha de gravação.

## Melhorias pedagógicas conservadoras

### O que manter

- **Sequência previsível e poucas interrupções.** Dá ao aluno um caminho claro; não acrescentar telas de confirmação entre etapas.
- **Prática por tema antes da mistura.** Primeiro familiaridade com o desenho, depois escolha do motivo sem anúncio.
- **Primeira resposta separada da correção.** Evita que acertar por tentativas sucessivas apareça como acerto independente.
- **Ajuda gradual após erro.** A criança tem como continuar aprendendo, sem ficar presa indefinidamente.
- **Revisão espaçada 2/7/14.** Principalmente a regra que não considera um acerto na mesma tarde como prova de retenção. Os intervalos são uma escolha prática, não uma fórmula universal a ser vendida como ideal.
- **Correção compartilhada entre cliente e servidor e aceitação de mates alternativos.** Evita rejeitar uma solução que realmente termina a partida.
- **Modo rating separado da trilha temática.** Serve a outro propósito; não transferir automaticamente sua pressão por pontuação para o aquecimento.
- **Auditoria dos padrões e temas em teste declarados.** A documentação mostra cuidado em conferir etiquetas em vez de confiar cegamente na origem.

### O que ajustar sem mexer no 5+24+10

1. **Concluir prática não equivale a dominar.** Manter conclusão por participação e acrescentar orientação curta no fim: o que precisa de revisão. Não colocaria agora um bloqueio de 80% por tema. A nota agregada dos 39 mistura dificuldade, repetições e motivos diferentes; sozinha não mede domínio.
2. **Dar valor diferente ao acerto de posição nova e ao de erro repetido.** Ambos são úteis, mas o segundo pode refletir memória recente. Mostrar separadamente esses resultados quando houver amostra, sem criar outra tela nem classificar domínio com apenas duas ou três questões.
3. **Preservar os 24, suavizar a dificuldade se os dados da turma pedirem.** A série cresce por rating, mas não reage aos erros. Na amostra `fork`/`auditoria`, foi de 883 a 2035 em 24 puzzles. Eu começaria acompanhando erros/ajuda por faixa; se houver colapso persistente, distribuir melhor as faixas ou reduzir o teto para aquele momento, sem retirar o desafio.
4. **Melhorar a escolha dos temas misturados.** Priorizar temas efetivamente estudados e alternar os anteriores ao longo das provas. A lista atual de três não garante variedade ao longo do curso; amostragem conjunta também não garante uma vaga para cada tema escolhido.
5. **Retenção também merece amostras de acertos.** A fila atual acompanha sobretudo erros. A prova de nível/rating pode reencontrar acertos, mas não garante uma verificação posterior de cada habilidade. Futuramente, reservar poucas posições novas de temas antigos nas misturas, sem aumentar a carga total.
6. **Não obrigar o aluno a errar para receber ajuda adequada.** Manter a dica textual; considerar que o pedido posterior possa chegar à pista visual. Isso facilita a recuperação sem incentivar lances aleatórios só para desbloquear setas. Registrar a ajuda quando ela comprometer a leitura de independência.
7. **Após erro, dar chance de observar o desfecho.** Hoje o avanço ocorre em 1,1 s, ou 1,5 s com mate. Manter o automático para o ritmo normal; considerar pausa opcional nos puzzles errados para observar por que a combinação funcionou, sem pedir confirmação em cada acerto.
8. **Ensinar a checar a ameaça adversária.** Preservar xeques → capturas → ameaças como roteiro de busca; completar com “O que ele ameaça?” e “Qual é a melhor resposta dele?”. A ordem de busca não significa jogar qualquer xeque disponível.
9. **Não prometer simulação completa da partida.** Misturar motivos reduz pistas, mas o aluno ainda sabe que existe uma tarefa tática. Reconhecer quando não há combinação exige outras posições e análise das próprias partidas. Isso pode ficar para evolução futura.
10. **Acompanhar a carga dos níveis altos antes de reformar.** São 3/6/5/15/34 temas por nível: 117/234/195/585/1.326 tentativas, respectivamente, fora revisões. A expansão dos padrões raros pesa no nível 5. Manter os temas; medir tempo e abandono antes de decidir se parte vira aprofundamento opcional.

## Ordem sugerida

1. Corrigir as afirmações enxadrísticas e o nome de Mate em 5 ou mais.
2. Corrigir ajuda e linguagem da prova/revisão.
3. Garantir retomada, nova tentativa e gravação confiáveis; acrescentar testes de interrupção e rede lenta.
4. Observar desempenho da turma para calibrar dificuldade e carga. Só depois alterar quotas ou critérios de domínio.

## Fundamentação externa e limites

- [IES/WWC — Organizing Instruction and Study to Improve Student Learning](https://ies.ed.gov/ncee/wwc/PracticeGuide/1): recomenda espaçamento, recuperação por testes e alternância entre exemplos resolvidos e problemas. Dá suporte à direção pedagógica geral, não aos números exatos 5/24/10 ou 2/7/14 nem a efeitos medidos neste projeto.
- [Lichess — Puzzle Themes](https://lichess.org/training/themes): define `short` como dois lances e `mateIn5` como cinco ou mais; descreve os motivos usados como fonte.

Meu parecer: vale preservar o formato e o ritmo. Corrigir o que o aluno aprende nas frases e o que o sistema realmente mede trará mais benefício imediato do que aumentar exercícios, criar novas telas ou introduzir reprovação por tema.
