# Revisão rigorosa do plano de meio-jogo — orientação para reformulação

## Pedido ao Claude

Revise e reescreva o plano `MEIO-JOGO-PLANO-DIDATICO.md` considerando integralmente a análise abaixo. Nesta etapa, entregue o plano reformulado, sem começar a implementação.

A pergunta original é: manter 30 posições com 30 conceitos de meio-jogo parece uma boa ideia, mas a apresentação e a avaliação são pedagogicamente adequadas? Precisamos de outros diagramas do mesmo conceito, além do quiz? Como obter posições confiáveis? Como melhorar a didática e a relação entre texto e tabuleiro, evitando que o aluno precise rolar para entender a posição?

**Condição central: os alunos têm de 12 a 15 anos e podem estar vendo esses conceitos pela primeira vez.** A reformulação deve partir disso. Não transforme cada aula introdutória em uma bateria de reconhecimento, exceções, comparação de planos, justificativa aberta e cálculo. Distribua essas exigências ao longo do aprendizado.

O conhecimento prévio de xadrez importa tanto quanto a idade. Um aluno pode resolver táticas e ainda desconhecer ideias posicionais básicas. Não use apenas rating ou idade para presumir familiaridade conceitual.

## 1. Parecer geral

O plano original identifica problemas importantes e contém melhorias úteis, mas ainda privilegia correção automática, registro de tentativas e indicadores mais do que uma progressão completa de aprendizagem.

Reconhecer uma característica é um objetivo legítimo e importante no primeiro contato. A crítica não é começar por reconhecimento. É deixar o reconhecimento como principal resultado final e adiar excessivamente a passagem para decisões simples e guiadas.

Preservar:

- Os 30 conceitos como estrutura inicial, sujeitos à revisão de sobreposição e pré-requisitos.
- A separação entre posição ensinada e posição usada para avaliar independentemente.
- A redução da ficha bibliográfica visível, mantendo a fonte completa acessível.
- A prática espaçada.
- A distinção entre leitura declarada e desempenho observado.
- A revisão humana do conteúdo selecionado.
- O ensino explícito antes de exigir desempenho independente de um iniciante.

Corrigir a progressão pedagógica antes de ampliar o banco e consolidar os indicadores.

## 2. Limites desta revisão e evidências a verificar

Esta análise foi feita sobre o plano fornecido, não sobre uma auditoria independente de toda a aplicação ou de seu banco local.

As afirmações sobre 22 quizzes, 66 exercícios, estoque disponível, 574 testes, arquivos e linhas do código são afirmações do documento original. Devem ser confirmadas no projeto, sem serem apresentadas como verificações já feitas por esta revisão.

As “decisões do Doug” aparecem registradas no plano anterior. Distinga restrições efetivamente confirmadas no histórico de hipóteses ou decisões que precisam ser reavaliadas diante dos problemas encontrados. Não atribua ao usuário novas aprovações.

Na reformulação, diferencie explicitamente:

1. Fatos verificados no projeto.
2. Recomendações sustentadas por referências externas.
3. Julgamentos de design pedagógico.
4. Hipóteses que serão testadas com alunos.

## 3. Progressão para primeiro contato: ensinar, apoiar e retirar a ajuda

O percurso desejado ao longo do tempo é:

**Familiaridade → reconhecimento com ajuda → reconhecimento independente → aplicação simples guiada → aplicação independente → discriminação entre situações e transferência.**

Isso não significa percorrer tudo em uma única sessão.

### Exemplo introdutório: coluna aberta

1. Apresentar em linguagem concreta: “Nesta coluna não há peões. Veja como a torre pode usá-la”.
2. Destacar a coluna e mostrar uma possibilidade no tabuleiro, com explicação curta.
3. Mostrar outro diagrama e pedir: “Toque na coluna sem peões”.
4. Explicar o acerto ou orientar uma nova observação após o erro.
5. Quando houver compreensão, propor uma escolha guiada: qual das duas torres pode aproveitar aquela coluna?
6. Retomar em outro dia, verificando reconhecimento sem ajuda e avançando conforme o desempenho.

### Regras de adequação ao iniciante

- Preferir linguagem concreta antes do vocabulário técnico; apresentar o termo e conectá-lo à imagem.
- Usar poucos elementos relevantes por vez e indicar claramente o lado a jogar ou o lado analisado.
- Começar com contrastes simples: coluna aberta versus fechada. Deixar para depois casos em que uma coluna aberta não oferece entrada útil.
- Fazer perguntas delimitadas antes de perguntas amplas: “Qual peça chega a essa casa?” antes de “Qual é o melhor plano?”.
- Oferecer justificativas apoiadas inicialmente: escolher entre duas razões ou completar uma frase. Respostas abertas entram depois.
- Não impor cronômetro no primeiro contato.
- Permitir ajuda sem apresentar isso como fracasso; registrar o nível de apoio utilizado.
- Não exigir domínio na primeira passagem nem a mesma quantidade de atividades para todos os conceitos.
- Não tornar pré-teste obrigatório para quem ainda não conhece o tema. Uma pergunta inicial de observação pode ser útil se não exigir conhecimento não ensinado e não servir como nota de domínio.

Os 30 temas são um percurso, não 30 obrigações de domínio imediato.

## 4. Reconhecimento não substitui aplicação

O banco precisa atender progressivamente a diferentes habilidades:

| Conceito | Reconhecimento inicial válido | Aplicação a desenvolver depois |
|---|---|---|
| Coluna aberta | Identificar a coluna sem peões | Decidir se vale ocupá-la, com qual torre e buscando qual entrada |
| Peão isolado | Localizar o peão | Avaliar fraqueza, atividade compensatória e plano adequado |
| Posto avançado | Identificar uma casa candidata | Verificar acesso, estabilidade e utilidade da peça |
| Bispo mau | Reconhecer a relação estrutural com os peões | Avaliar função, atividade e possibilidades de melhora |
| Peão passado | Localizar o peão | Decidir quando apoiar, avançar ou conter contrajogo |

Não usar o acerto na segunda coluna como prova automática de capacidade na terceira.

O mapa atual também associa várias dicas à mesma tarefa. Verificar se isso representa uma progressão legítima ou se conceitos diferentes estão recebendo um exercício genérico que não avalia sua particularidade.

## 5. Rever a regra “só há número onde existe juiz de máquina”

Essa regra confunde três formas de avaliação:

1. Correção por regra geométrica ou propriedade formal.
2. Correção automática por gabarito específico, elaborado e revisado por especialista.
3. Avaliação humana de resposta aberta.

Um exercício de plano pode ter alternativas e justificativas revisadas para aquela posição. O sistema não precisa descobrir o melhor plano em qualquer posição para conferir uma escolha em um item previamente curado.

Uma resposta aberta também pode ser registrada como “aguardando avaliação”, sem inventar acerto automático.

As oito dicas classificadas como julgamento não devem ficar sem prática estruturada apenas porque não admitem uma regra geométrica geral. Atividades possíveis, adequadas ao estágio do aluno:

- Identificar a ameaça adversária com orientação.
- Escolher entre dois planos plausíveis.
- Comparar duas decisões concretas.
- Escolher a razão que sustenta um plano.
- Explicar brevemente a escolha em estágio posterior.
- Examinar uma pequena continuação instrutiva.

Não exigir resposta única se houver alternativas igualmente defensáveis. Ajustar o enunciado, aceitar alternativas justificadas ou substituir o item.

“A partida de hoje é o treino” não basta: o conceito pode não aparecer nela. A aplicação nas próprias partidas é complementar, com orientação quando houver uma ocorrência relevante.

## 6. Auditar os supostos fatos objetivos

Resposta única produzida por algoritmo não prova validade pedagógica ou enxadrística.

### Peça que ainda não saiu

A FEN não registra todo o histórico de deslocamentos. Uma peça pode ter saído e retornado. Se a intenção é desenvolvimento, formular um critério compatível com o que se observa e não inferir histórico indevidamente.

### Peça que menos joga

Contar lances disponíveis mede uma forma de mobilidade, não necessariamente qualidade, utilidade ou prioridade de melhora. Uma peça com poucos movimentos pode cumprir função importante.

### Bispo mau

A relação com os próprios peões permite uma classificação estrutural, mas não determina sozinha a qualidade concreta do bispo. Não ensinar que todo bispo assim classificado deve ser trocado ou está inútil.

### Posto, casa negada e peão retardatário

Definir critérios operacionais, limites e situações ambíguas. Evitar transformar uma simplificação de código em uma regra universal de xadrez.

Para cada tarefa automática, documentar:

- O que exatamente ela mede.
- O que ela não permite concluir.
- Exemplos válidos e contraexemplos.
- Como lida com múltiplas respostas e casos-limite.
- Correspondência entre enunciado e algoritmo.
- Revisão humana necessária.

## 7. Corrigir o estoque para revisão espaçada

Existe uma contradição no plano: as três posições são consumidas no treino inicial e depois se prometem posições inéditas nas revisões.

Separar explicitamente os usos:

- Exemplo ensinado.
- Prática guiada.
- Avaliação independente.
- Revisão posterior.

Uma distribuição ilustrativa seria um exemplo, dois exercícios guiados, uma aplicação independente e três posições reservadas para revisões: sete posições no total por conceito. **Isso não é uma quantidade obrigatória nem uma fórmula cientificamente estabelecida.** Serve para demonstrar que a promessa de revisões inéditas tem custo de conteúdo.

Dimensionar o banco conforme o fluxo realmente adotado. Especificar o comportamento quando acabarem as posições inéditas, sem prometer novidade que o sistema não consegue entregar.

Rever também a afirmação de que repetir a mesma posição “só prova memória do tabuleiro”. Repetição pode ser útil para consolidar e corrigir erros. O problema é inferir transferência usando apenas itens repetidos. Registrar a diferença entre repetição e posição inédita.

Os intervalos de 2, 7 e 14 dias podem ser uma hipótese operacional inicial, não uma sequência declarada ideal para todo aluno e conceito. Definir o que ocorre após erro, ajuda, ausência e acerto tardio.

Um acerto fora da data continua sendo evidência de aprendizagem. Separar pontualidade de desempenho.

## 8. Fontes confiáveis: disponibilidade não equivale a adequação

A base aberta do Lichess é uma fonte viável e rastreável de dados. Seus exports são CC0. Isso não certifica a adequação estratégica ou didática de cada posição selecionada.

O rating original é do puzzle, não da nova atividade de reconhecimento ou planejamento. Não transferir automaticamente essa dificuldade para a pergunta criada.

Detalhe de formato a conferir: na base de puzzles, a FEN representa a posição antes do primeiro lance da sequência. A posição apresentada ao solucionador resulta da aplicação desse lance. Registrar explicitamente qual estado foi selecionado. Uma atividade própria pode usar outro recorte, desde que intencional e corretamente documentado.

Não considerar a presença de tática forçada “inofensiva” de forma geral. Para identificação estrutural isolada, pode ser aceitável. Para ensinar planos, pode produzir um exemplo em que o plano temático perde imediatamente.

### Processo de curadoria

1. Encontrar candidatos em fontes rastreáveis.
2. Confirmar posição, lado analisado, lado a jogar e origem.
3. Verificar se o conceito é perceptível e relevante.
4. Examinar ameaças e refutações táticas; usar análise de máquina quando apropriado como apoio, não como certificação pedagógica.
5. Escrever pergunta, respostas aceitáveis e feedback.
6. Revisar adequação ao público e ao estágio de aprendizagem.

Combinar, conforme disponibilidade e condições de uso verificadas:

- Partidas completas de bases abertas.
- Referências já disponíveis e adequadas ao projeto.
- Exemplos didáticos construídos, claramente identificados e conferidos.

Uma segunda posição de livro é uma opção, não condição necessária para melhorar o quiz. Não é preciso adiar toda aplicação até concluir transcrições de livros.

## 9. Feedback específico é parte essencial do exercício

Enunciados reutilizáveis economizam trabalho, mas quatro campos e um retorno verde/vermelho não constituem um modelo didático completo.

Cada posição precisa de feedback curto e específico, apresentado depois da tentativa:

- Evidência que sustenta a resposta.
- Orientação para o erro mais provável.
- Relação com a ideia que o aluno está aprendendo.

Exemplo de conteúdo posterior, quando apropriado: “A coluna está aberta, mas as casas de entrada estão controladas. Ocupar a coluna ainda não garante que a torre consiga entrar”.

No primeiro contato, manter o feedback simples e visual. Não despejar todas as exceções após um erro básico.

Prever uma sequência de apoio: convite para observar um detalhe, destaque visual e solução explicada. Depois da solução, distinguir conclusão assistida de acerto independente.

## 10. Texto e tabuleiro: resolver a relação visual

Texto abaixo do tabuleiro não é necessariamente ruim, especialmente no celular. O problema é o aluno ter que memorizar coordenadas, rolar e reconstruir sozinho a relação entre texto e posição.

Mover a bibliografia ajuda, mas não resolve sozinho.

| Contexto | Proposta a testar |
|---|---|
| Computador | Tabuleiro ao lado da explicação curta, com relação visual clara |
| Celular | Tabuleiro e um pequeno passo explicativo por vez, com controles próximos |
| Demonstração | Destaques de casas e peças acompanhando a explicação |
| Exercício | Posição e pergunta juntas; solução oculta até a tentativa |
| Consulta | Texto completo e fontes acessíveis sem interromper a atividade |

Um tabuleiro fixo pode ajudar, mas pode ocupar espaço excessivo em telas pequenas. Testar antes de escolher como regra.

O objetivo não é eliminar toda rolagem. É evitar rolagem repetida para relacionar a instrução atual à posição.

“Até 90 caracteres” não garante uma linha nem explicação visível. Validar telas reais, fonte, zoom e tamanho do tabuleiro. Considerar navegação por teclado, toque, seleção de casas e feedback que não dependa apenas de cor.

A primeira aula deve funcionar sem pressupor domínio de notação algébrica. Se a explicação usa coordenadas, apoiar a localização visualmente.

## 11. Corrigir a avaliação e o relatório

Definir a unidade de avaliação antes de criar indicadores. Cinco cliques até acertar não são cinco exercícios independentes, nem um acerto sem ajuda.

Registrar conforme necessário:

- Item, conceito e versão do conteúdo.
- Primeira resposta.
- Uso de dicas.
- Novas tentativas.
- Exibição da solução.
- Conclusão independente ou assistida.
- Posição inédita ou repetida.
- Habilidade avaliada.

Separar no relatório:

- Leitura declarada.
- Reconhecimento com ajuda.
- Reconhecimento independente.
- Aplicação simples guiada.
- Aplicação independente, quando já trabalhada.
- Revisões pendentes.

Não é necessário transformar todas essas categorias em uma tela carregada. São distinções do modelo de evidência; a interface pode mostrá-las de forma simples.

Exemplo de informação útil: “Reconhecimento: 4/5 sem ajuda; aplicação: 1/3; revisão pendente”. Não interpretar poucos itens como domínio consolidado.

Incluir meio-jogo nos minutos pode corrigir uma lacuna operacional, mas minutos não são medida de aprendizagem. Definir como serão estimados ou medidos, evitando contar cliques repetidos ou aba parada como estudo efetivo.

## 12. O vazamento não desaparece apenas com outra posição

Uma posição nova reduz memorização do exemplo, mas o título, a explicação aberta e alternativas óbvias podem continuar entregando a resposta.

Distinguir:

- **Checagem de compreensão após ensino:** pode ter apoio e tema anunciado.
- **Avaliação independente:** exige resposta sem pistas que resolvam a tarefa.

Os quizzes atuais podem ser mantidos provisoriamente como checagem de compreensão, se corretos e rotulados de forma coerente. Não atribuir a eles evidência que não fornecem.

Progressivamente, usar alternativas plausíveis, perguntas dependentes da posição e revisões misturadas sem anunciar o conceito. Não introduzir essa dificuldade toda no primeiro contato.

A trava “22 quizzes respondíveis pelo texto, reprovar se aumentar” impede piora quantitativa, mas não resolve o problema. Definir também como essa classificação é feita; uma contagem automática não substitui avaliação semântica.

## 13. Arquitetura pedagógica proposta

### Por conceito

Definir:

1. Objetivo concreto de aprendizagem.
2. Pré-requisitos.
3. Vocabulário novo.
4. Exemplo de ensino.
5. Reconhecimento inicial com apoio.
6. Erro comum e feedback correspondente.
7. Aplicação simples a introduzir quando houver compreensão.
8. Revisões e posições reservadas.
9. Limites da evidência de aprendizagem gerada.

### Ao longo das sessões

- Primeira passagem: familiaridade, exemplo guiado e reconhecimento.
- Consolidação: reconhecimento com menos ajuda e aplicação curta guiada.
- Retomadas: recuperação sem explicação aberta e novas posições.
- Etapa posterior: contrastes mais difíceis, mistura de conceitos e decisões mais autônomas.

O ritmo depende do aluno e do conceito. Não adotar um tempo de 90 segundos para a aula inteira com base na duração estimada de três cliques.

## 14. Implementação e cronograma: validar antes de escalar

Antecipar uma aula completa e um piloto representativo. Banco, estatísticas e ampliação do conteúdo devem ser construídos com base em uma experiência pedagógica já examinada.

Sequência proposta, caso as datas do plano continuem válidas:

| Prazo de referência | Entrega |
|---|---|
| Até 10/9 | Melhorar leitura e bibliografia; definir objetivos e modelo de aula |
| Até 13/9 | Uma aula completa funcionando, do ensino à aplicação guiada |
| Até 17/9 | Conjunto piloto de aproximadamente 6–8 conceitos, revisado e com posições reservadas |
| Até 20/9 | Observar alunos e corrigir compreensão, feedback e navegação |
| Até 23/9 | Integrar registro e relatório com definições claras |
| Até 25/9 | Liberar o conjunto validado e verificar o fluxo completo |

Essas datas são uma proposta de sequenciamento, não estimativa de esforço comprovada. Reestimar no projeto e explicitar dependências.

O piloto deve incluir conceitos de tipos diferentes e alunos com conhecimentos prévios diferentes, especialmente iniciantes nos temas. Um piloto pequeno detecta problemas de uso e compreensão, mas não prova eficácia geral.

Se o prazo apertar, reduzir o número de conceitos com sequência completa. Manter os 30 exemplos disponíveis e ampliar o treino validado progressivamente. Não preencher rapidamente o banco com atividades inadequadas apenas para atingir uma contagem.

Retirar “sem piloto com aluno” dos riscos simplesmente aceitos e transformá-lo em etapa de validação. Se não for possível realizá-lo, declarar a entrega como ainda não validada com o público, sem alegar que a revisão por adulto substitui essa observação.

Corrigir ou justificar explicitamente os problemas já conhecidos de conteúdo, como m11 e m22, em vez de apenas carregá-los para a nova versão.

## 15. Critérios de aceite

### Pedagógicos

- O enunciado é compreensível por quem recebeu apenas o ensino previsto.
- O exercício mede a habilidade declarada.
- A aplicação exigida corresponde ao estágio do aluno.
- O feedback explica e orienta, sem se limitar a certo/errado.
- Há distinção entre ajuda, repetição e desempenho independente.
- Há posições suficientes para o fluxo de revisão prometido.
- As tarefas de julgamento têm prática estruturada adequada.
- Nenhuma heurística é apresentada como verdade estratégica universal.

### Visuais e de uso

- O aluno relaciona a instrução atual ao tabuleiro sem alternância cansativa de rolagem.
- Pergunta e posição estão acessíveis juntas durante a resposta.
- A solução não aparece antes da tentativa independente.
- Toque, teclado, zoom e indicadores visuais são verificados.
- A bibliografia permanece acessível sem ocupar o espaço principal de aprendizagem.

### Técnicos

- Correção, persistência e isolamento entre alunos são verificados.
- Primeira tentativa e tentativas assistidas são diferenciadas.
- Os testes incluem casos que desafiam os critérios de correção, não apenas exemplos favoráveis.
- A fila funciona após erros, atrasos e esgotamento de itens inéditos.
- Mudanças na contabilização de minutos não geram duplicação.
- Há verificação apropriada das migrações e da compatibilidade entre versões, conforme a infraestrutura existente.

Contagem de testes, posições e caracteres não demonstra aprendizagem. Esses números podem apoiar a engenharia, mas não substituir os critérios pedagógicos.

## 16. Referências consultadas e alcance

- [Institute of Education Sciences — Organizing Instruction and Study to Improve Student Learning](https://ies.ed.gov/ncee/wwc/PracticeGuide/1): sustenta orientações gerais como espaçamento, alternância entre exemplos e problemas, integração de representações e perguntas explicativas. Não valida especificamente este módulo de xadrez nem estabelece número ideal de diagramas ou intervalos para estes alunos.
- [Lichess — Open Database](https://database.lichess.org/): documenta os exports e sua licença CC0.
- [Lichess — Formato da base de puzzles](https://database.lichess.org/#puzzles): documenta a relação entre FEN inicial e sequência de lances. Não certifica adequação didática das atividades que serão criadas.

As recomendações específicas de interface, banco, etapas e cronograma deste documento são propostas de design fundamentadas na análise do plano e devem ser verificadas no contexto real.

## 17. Entrega esperada do Claude

Entregue um plano reformulado que contenha:

1. Diagnóstico revisto, separando fatos verificados e hipóteses.
2. Progressão adequada ao primeiro contato de alunos de 12–15 anos.
3. Mapa dos 30 conceitos com objetivos, pré-requisitos, habilidades e atividades.
4. Modelo de aula introdutória e de revisões posteriores.
5. Um exemplo concreto de aula de reconhecimento estrutural e outro de julgamento, sem inventar FENs como se fossem posições validadas.
6. Proposta de interface para computador e celular.
7. Plano de curadoria com feedback específico e controle de ambiguidades.
8. Dimensionamento realista do banco, incluindo reservas para revisão.
9. Modelo de avaliação e relatório que diferencie leitura, apoio, reconhecimento e aplicação.
10. Etapas de implementação, piloto, critérios de aceite e cortes de escopo.
11. O que muda em relação ao plano anterior e quais pontos dependem de verificação no código ou com alunos.

**Diretriz final:** manter o reconhecimento como começo legítimo, oferecer apoio suficiente para o iniciante e planejar a passagem gradual para decisões simples. Não sobrecarregar a primeira aula e não confundir uma primeira identificação correta com domínio do conceito.
