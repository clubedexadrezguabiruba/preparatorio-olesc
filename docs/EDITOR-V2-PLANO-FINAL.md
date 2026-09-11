# Editor de aulas e treinos v2 — plano final revisado

Data: 10/09/2026. **APROVADO pelo Doug em 10/09/2026.** Revisão confrontada com o código da branch `modo-editor`.

Este documento consolida o Plano Mestre fornecido pelo Doug, a revisão do ChatGPT e os contratos do projeto. **É o plano vigente do Editor v2.** Sua aprovação autoriza a implementação por blocos; publicação no curso continua sendo uma decisão separada do professor. Os documentos anteriores permanecem como histórico. Decisões novas tomadas nesta revisão estão identificadas na seção 22.

## 1. Resultado esperado e escopo

O professor deve conseguir transformar uma posição ou partida em explicação, demonstração, comparação e treino pela tela. A medida de qualidade é conseguir fazer isso com clareza, recuperação de erros e conteúdo verificável.

O editor continua local: `next dev`, `EDITOR_LOCAL=1`, ausência de `VERCEL` e professor autenticado. O aluno usa o site publicado. Toda escrita continua passando por Server Actions autenticadas. Não entram colaboração simultânea, editor hospedado, envio automático por Git, atualização do Next nem substituição completa do Lichess Study.

O escopo preserva finais e repertório. A árvore de autoria aceita partidas completas de xadrez padrão; isso não torna qualquer posição elegível para certificação por tablebase nem altera automaticamente o currículo. Chess960 e outras variantes ficam fora desta versão, com recusa explícita na importação.

São requisitos herdados do Doug:

- Capítulo de posição parada ou de partida, com comentários apenas onde forem necessários.
- Reprodução automática, pausa, repetição e velocidade; comparação entre linhas na mesma aula.
- Variações e seis símbolos de qualidade na interface: `!`, `?`, `!!`, `??`, `!?`, `?!`.
- Vários treinos, por capítulo e ao final da aula; personalização que a máquina não sobrescreve.
- Controle sobre posições, respostas do defensor, autoria e exceções justificadas ao juiz externo.
- Aula do zero, importação, aulas extras, edição de repertório e barra de avaliação de Stockfish.

## 2. Diagnóstico da revisão recebida

A revisão do ChatGPT analisa principalmente `EDITOR-V2-PROPOSTA.md`, anterior ao Plano Mestre anexado. O Plano Mestre já incorporou capítulos explícitos, IDs, Undo/Redo, hashes locais e vários outros ajustes. Portanto, críticas ao antigo delimitador `fen` não são defeitos ainda presentes no Plano Mestre.

Concordo com a direção da revisão: capítulo explícito, referência estável, separação dos textos, importação independente do escritor, Undo transacional, recuperação visível e progresso versionado. Corrijo ou completo os seguintes pontos:

| Ponto | Decisão desta revisão |
|---|---|
| `derivarTreino` usa paridade | A afirmação está desatualizada: o código usa `game.turn()`. A limitação real é a corrente linear e seu contrato de início/fim. |
| Um lance nunca pode ser copiado | A análise tem uma fonte canônica; treino personalizado, duplicação explícita e publicação imutável precisam de cópias deliberadas. |
| Capítulo com árvore própria e variante compartilhada | Separar árvore de análise e apresentação de um percurso dessa árvore; referenciar uma posição não significa compartilhar a continuação. |
| Sorteio do defensor como padrão | Preservar a escolha determinística atual, estável na tentativa e rotativa entre tentativas. |
| Histórico/autosave/gate no fim | Recuperação e validação entram antes da edição estrutural e acompanham todos os blocos. |
| Engine apenas futura | A barra já é requisito do plano vigente. Pode ser independente da fundação, mas permanece uma entrega. |
| Tablebase como melhoria P1 | A certificação existente é requisito de regressão dos finais, desde o primeiro bloco. |
| PGN preserva tudo | Definir um perfil suportado e relatório de perdas; o formato não representa integralmente aula, fluxo e treino. |
| “Tablebase offline” | Existe cache de respostas da API, não uma instalação local completa de Syzygy. Cache ausente precisa de tratamento explícito. |
| Progresso só precisa de IDs | Também precisa de revisão da tarefa e rejulgamento no servidor contra a revisão efetivamente jogada. |
| “Cinco limitações já resolvidas” | Item planejado não conta como implementado. Comparações com outros produtos dependem de nova medição. |

Os exemplos de lances nos anexos não vêm acompanhados de FEN; são ilustrações, não provas de vitória ou empate. Os testes pedagógicos usarão posições e sequências verificadas do corpus.

## 3. Três estruturas com funções distintas

**Análise:** árvore com posições, lances, variantes, comentários e desenhos. É a fonte dos lances autorais.

**Apresentação:** capítulos que escolhem o que mostrar dessa análise, em qual percurso e com qual narração. Uma comparação reutiliza uma linha existente por referência.

**Treino:** tarefa com lado do aluno, respostas, feedback, defesa e critério de término. Nasce da análise por uma receita explícita e pode ganhar autoria independente.

Uma aula contém essas estruturas e um fluxo que ordena capítulos, treinos e práticas. O aluno não precisa conhecer nenhuma delas pelo nome técnico.

### Contrato conceitual

```ts
type AulaV2 = {
  schemaVersion: 2;
  id: string;                       // preserva o ID editorial existente
  titulo: string;
  analises: Analise[];
  capitulos: Capitulo[];
  treinos: Treino[];
  praticas: Pratica[];               // preserva prática contra Stockfish
  fluxo: Etapa[];                    // única fonte da ordem pedagógica
  // introdução, nível, proveniência, exceções e metadados preservados
};

type ReferenciaNo = { analiseId: string; nodeId: string };

type InicioAnalise =
  | { tipo: 'posicao'; positionId: string }
  | { tipo: 'referencia'; origem: ReferenciaNo };

type Analise = {
  id: string;
  inicio: InicioAnalise;
  raizId: string;
  nos: Record<string, No>;
};

type No = {
  id: string;
  uci?: string;                      // ausente somente na raiz
  filhos: string[];                  // primeiro filho = linha principal
  comentario?: string;
  nags?: number[];
  desenhos?: Desenho[];
};

type Capitulo = {
  id: string;
  titulo: string;
  percurso: {
    inicio: ReferenciaNo;
    caminho: string[];               // IDs contíguos; vazio = posição parada
  };
  orientacao: 'white' | 'black';
  narracoes: Record<string, Narracao>;
};
```

Os exemplos fixam a semântica; nomes finais devem seguir as convenções do repositório. `schemaVersion` será o único nome para versão de formato, sem coexistir com `versaoSchema`.

`parentId`, SAN, FEN de cada nó e índices de busca são derivados em memória. Não persistir simultaneamente pais e filhos como duas autoridades, nem SAN e UCI editáveis de forma independente. O lance é UCI; SAN é calculado na posição do pai. O PGN original pode ser preservado como material de importação, sem competir com a árvore editada.

## 4. Identidade, posição e referência

IDs de análise, capítulo, nó, treino e etapa são gerados pelo sistema e permanecem estáveis em renomeação, reordenação e edição de texto. Duplicações independentes recebem novos IDs e remapeiam referências internas em uma transação. Os IDs editoriais existentes de aulas e posições são preservados.

Um nó representa a posição **depois** de seu lance de entrada. A raiz representa a posição inicial. Comentários e desenhos pertencem a essa posição. A narração pertence à apresentação daquele nó no capítulo: duas comparações podem explicar a mesma posição de maneiras diferentes sem sobrescrever o comentário da análise.

Transposições não fundem nós automaticamente. Duas sequências que chegam à mesma disposição de peças podem ter histórico de repetição diferente. Cache de posição não substitui o histórico necessário às regras da partida. Preservar os seis campos de FEN para execução; não generalizar `samePosition()` como identidade de sessão ou de domínio.

Há três operações diferentes:

1. **Mostrar esta variante na aula:** cria capítulo apontando para o percurso já existente. Não copia lances. Promoção de outra variante a principal não muda o percurso escolhido.
2. **Começar desta posição:** cria nova análise cuja raiz referencia a posição selecionada; suas continuações são independentes. A dependência é da posição inicial, não de toda a linha da origem.
3. **Duplicar como independente:** materializa posição e conteúdo, gera IDs e encerra a dependência operacional, conservando atribuição/proveniência.

Referências ficam restritas à mesma aula na primeira versão. Compartilhamento entre aulas não entra implicitamente.

Validar IDs duplicados, filhos inexistentes, nó com mais de um pai, nós inalcançáveis, ciclos na árvore, ciclos entre inícios de análises, percursos não contíguos e referências quebradas. A ordem dos capítulos não precisa coincidir com a ordem de resolução das dependências.

## 5. Edições estruturais e exclusão

Jogar um lance já existente seleciona o filho correspondente. Jogar um lance novo cria uma variante automaticamente e mantém a continuação anterior; a interface informa o resultado e oferece desfazer. “Substituir continuação” é ação explícita, com impacto e recuperação. Evitar um modal em cada lance divergente.

Promover variante reorganiza irmãos e não troca IDs. Arrastar serve para capítulos e variantes irmãs. Não se arrastam lances para quebrar a ordem causal de uma linha. A reordenação por teclado terá ação equivalente no menu.

Antes de excluir ou mudar posição/lance, calcular o impacto transitivo: nós, capítulos, treinos, narrações, desenhos, fontes e publicação. A interface mostra nomes e contagens reais.

- Excluir um capítulo de apresentação não exclui automaticamente sua análise.
- Excluir análise ou subárvore referenciada exige cancelar, remover explicitamente os dependentes ou materializar os dependentes como independentes.
- Trocar posição inicial revalida todos os ramos. Podar no primeiro lance ilegal de cada ramo; não descartar os ramos legais.
- Lances ainda legais podem adquirir outro significado. Comentários, narrações e desenhos afetados ficam marcados para revisão; legalidade não comprova validade pedagógica.
- Revisões obrigatórias devem ser resolvidas antes da publicação. Undo restaura dados, dependências e seleção juntos.

No caso de treino personalizado, a perda da fonte conserva sua cópia completa e marca a origem histórica como removida. Essa origem histórica não é uma referência operacional obrigatória. Treino derivado com origem ausente bloqueia publicação até ser reparado ou convertido explicitamente em independente.

## 6. Textos, desenho e reprodução

Separar comentário de análise, narração, dica, feedback por resposta e explicação de conclusão. A régua de voz incide sobre o texto apresentado ao aluno. Na importação, o comentário inicia também a narração daquele lance por padrão; depois disso as duas cópias são independentes.

Importar comentário cria uma narração temporizada no mesmo lance. A tela mostra primeiro o comentário e logo abaixo a caixa de narração já preenchida; o autor decide ali se edita ou apaga. Não há escolha anterior à importação, e editar o comentário depois não altera a narração.

Reprodução oferece aula inteira, capítulo e “daqui”, com voltar, avançar, pausar, repetir e velocidades `0,5×`, `1×`, `2×`. Por padrão a narração recebe pausa temporizada. O autor pode marcar uma pausa que exige “Continuar”.

No primeiro corte, velocidade muda movimentos e intervalos; o tempo de leitura da narração permanece calculado pela régua existente. Isso evita acelerar involuntariamente a leitura. Calibrar com a aula real antes de introduzir outra curva de leitura.

Variantes de análise não são percorridas automaticamente. O capítulo mostra seu percurso explícito. Comparação consiste em dois ou mais capítulos que retornam à posição selecionada e exibem os percursos escolhidos, com transição compreensível. A reprodução suporta lado a jogar diferente e início no meio de uma partida.

Desenhos são por nó e mantêm seus estilos suportados. Reutilizar `annotations.ts` exige adaptação: a conversão atual não preserva necessariamente as cores de autoria. A exportação não pode prometer preservação de cor usando uma conversão que a descarta. Desenho de explicação e alvo/dica de treino permanecem contextos separados.

## 7. Edição, Undo e recuperação desde o início

Todo comando autoral gera uma transação: lance, promoção, exclusão, texto, desenho, importação, duplicação, conversão, restauração e treino. Undo/Redo inclui os dados relacionados e a seleção. Ações sem efeito não entram no histórico nem disparam salvamento.

Agrupar digitação por sessão de edição; não criar um Undo por caractere. Dentro de um campo, preservar o desfazer do texto. Fora dele, `Ctrl+Z` e `Ctrl+Shift+Z` operam no documento. Nova edição após Undo descarta apenas a pilha de Redo, não versões históricas já guardadas.

Há três proteções distintas:

| Camada | Função |
|---|---|
| Undo/Redo da sessão | Reverter gestos durante a edição |
| Recuperação local no navegador | Sobreviver a reload ou servidor indisponível, inclusive estado incompleto |
| Histórico em `.editor/` | Restaurar snapshots salvos, pré-importação, pré-migração e pré-publicação |

Recuperação no navegador usa armazenamento persistente apropriado, preferencialmente IndexedDB, com chave de projeto/aula/sessão e versão-base. Mostrar “preservado neste navegador” somente após confirmação da escrita. Quota esgotada ou falha de armazenamento produz aviso verdadeiro e opção de exportar cópia de recuperação. Não prometer proteção contra limpeza do navegador ou falha física do disco.

O autosave de recuperação aceita conteúdo incompleto. O rascunho versionado exige estrutura íntegra, mas pode conter pendências editoriais identificadas. A publicação exige validação integral. Isso permite criar aula vazia sem contornar o schema de publicação.

Preservar fila single-flight, gravação atômica e `baseHash`; a verificação de versão e a troca do arquivo precisam ocorrer sob exclusão mútua no servidor. Escrita atômica sozinha não é compare-and-swap entre processos. Conflito conserva a versão local e oferece recarregar ou salvar cópia; não exige construir um merge visual na primeira entrega.

Restaurar histórico cria nova versão de rascunho, sem apagar o passado nem publicar automaticamente. Definir retenção limitada por bytes e quantidade antes do piloto; preservar explicitamente snapshots necessários a uma operação em andamento.

## 8. Treinos: receita e propriedade

“Criar treino daqui” abre uma prévia com posição inicial, lado do aluno, percurso/trecho, linhas incluídas, respostas e fim. Padrão: percurso selecionado do capítulo. Variantes não entram todas como soluções. O professor inclui alternativas corretas e erros conhecidos explicitamente; símbolos do PGN podem sugerir classificação, não provar correção.

Cada treino declara:

- ID estável, título, lado do aluno e objetivo.
- Posição inicial completa, limites e condições de término.
- Receita de derivação e versão do derivador, quando houver origem.
- Respostas do aluno com feedback e continuação própria.
- Respostas do defensor, sua política e fim de cada ramo.
- Dicas e explicações; ajuda utilizada registrada separadamente de domínio.
- Obrigatoriedade no fluxo e revisão da avaliação.

Se a posição começa com o defensor, o treino executa a resposta prevista antes de perguntar ao aluno. Não inverter a cor com base no número do passo. “Treinar ambos os lados” cria duas tarefas, com identidades próprias.

Separar propriedade de estado da fonte:

```text
propriedade: derivado | personalizado | independente
fonte: atual | alterada | removida
```

Um treino pode ser personalizado e ter fonte alterada simultaneamente. Não modelar essas condições como opções exclusivas de um único enum.

Enquanto derivado, a máquina pode reconstruir seu conteúdo conforme a receita. O primeiro ajuste em respostas, posição, objetivo, dicas ou feedback materializa a cópia autoral e o torna personalizado. Mudar título ou colocação no fluxo não precisa romper a derivação.

Separar `autoria` de `certificacao`: mesmo no treino personalizado, o gate pode renovar evidências calculadas, mas nunca alterar respostas, feedback ou linhas autorais. Dados certificados não são editáveis como se fossem autoria.

O hash de dependência cobre posição inicial resolvida, percurso relevante, campos usados pela receita, lado, objetivo, seleção de variantes e versão do derivador. Inclui ancestrais que mudam a posição inicial, ainda que estejam fora do trecho. Exclui título ou texto de capítulo sem relação. Não hashing do documento inteiro.

“Refazer a partir da aula” mostra o diff real, guarda snapshot e é um comando único com Undo. Após refazer, o treino volta ao modo derivado; o próximo ajuste autoral volta a personalizá-lo. Se a origem desapareceu, o botão não funciona até selecionar fonte nova.

IDs de questões persistem quando o ponto correspondente permanece. Usar mapeamento por identidade de origem, não regenerar `n1…nk` por posição a cada derivação. Novas questões recebem IDs novos.

## 9. Julgamento enxadrístico e defensor

O editor suporta dois perfis explícitos de treino:

1. **Final certificado:** preserva o contrato atual de tablebase, objetivo e técnica. A cache deve conter as evidências exigidas pelo gate.
2. **Linha autoral:** treina as respostas selecionadas pelo professor em posição geral. Valida legalidade, caminhos, feedback e término; não afirma que todas as alternativas não cadastradas perdem.

Partida de abertura importada não passa pelo juiz de até sete peças como se fosse um final. Uma análise com 32 peças pode ser exibida; sua certificação objetiva exige outro contrato e não é inferida da existência de Stockfish.

Para lance não cadastrado: primeiro legalidade. No final certificado, usar evidência disponível e distinguir “mantém o resultado” de “aplica a técnica ensinada”; não aceitar uma resposta sem continuação executável ou término validado. Na linha autoral, informar “este lance não faz parte da linha treinada”, sem inventar erro objetivo. Não consultar rede silenciosamente durante a tentativa.

O cache de tablebase atual normaliza contadores. Antes de estender os finais a novas situações, testar regra dos 50 lances, histórico de repetição, categorias condicionais e dados de distância ausentes. Contar peças não é teste suficiente de elegibilidade. Sem evidência adequada, não emitir selo de resultado certificado.

Preservar exceções do professor por código, alvo estável, motivo e hash de conteúdo. Reavaliar caducidade quando o alvo muda. Exceção ao juiz externo não perdoa lance ilegal, referência quebrada ou corrupção. Uma exceção não fabrica `winningMoves` nem transforma ausência de evidência em prova. O treino precisa continuar executável por respostas explícitas, e a revisão do professor conserva o registro da divergência.

**Defensor:** manter o comportamento de `lib/lesson/defensor.ts`: resposta estável dentro da tentativa e rotação determinística entre tentativas. IDs e contador da tentativa entram no contrato de reprodução. Escolha fixa pode ser oferecida. Política ponderada ou aleatória fica posterior; não substituir a garantia existente por `Math.random()`.

## 10. Fluxo, avaliação e progresso

`fluxo` é a única fonte da ordem: etapas com ID e referência para introdução, capítulo, treino ou prática. Não persistir também `placement` como segunda ordem autoritativa. A interface “após capítulo” atualiza o fluxo. Um treino final é uma etapa no fim, não um tipo de árvore diferente.

A prática atual contra Stockfish e a escada de revisão são preservadas. Assistir ao capítulo ou concluir treino com ajuda não concede automaticamente o domínio que hoje depende da prática. Uma aula v2 declara quais práticas/tarefas de avaliação são obrigatórias; capítulos e treinos assistidos preparam para elas. Criar novas regras de domínio por treino assistido exige medição posterior, não entra por acidente na mudança da store.

Persistir progresso por entidade e **revisão de avaliação**, não por índice. Definir duas identidades distintas:

- `publicationId`: snapshot exato do pacote publicado.
- `assessmentRevision`: identidade semântica da avaliação, incluindo posição, objetivo, respostas, defesa, condições de sucesso e ajuda permitida.

Título, layout, reordenação e narração não invalidam domínio. Alteração de avaliação inicia estado pendente para a nova revisão e preserva tentativas antigas no histórico. Acrescentar avaliação obrigatória muda o fechamento atual da aula. O editor calcula alunos e requisitos afetados antes da publicação; conquistas históricas não são apagadas silenciosamente.

A tentativa do aluno inclui aula, tarefa, revisão, identificador idempotente, lances dos dois lados quando necessários, contador/política de defesa e ajuda utilizada. O servidor resolve a revisão publicada, reconstrói e rejulga; não aceita `acertei` ou a revisão enviada como prova suficiente.

`lib/finais/gravar.ts` hoje grava prática/revisão por aula; o julgamento de árvore não está ativo ali. A integração v2 precisa de migração aditiva do banco, políticas de acesso, testes do novo juiz e prevenção de duplicação por retry. O modo de preview não grava progresso real.

Publicações anteriores referenciadas por tentativas são preservadas. Uma aba antiga pode concluir contra seu snapshot, mas esse resultado não concede domínio de uma revisão diferente. Se o snapshot não estiver disponível no servidor, conservar a tentativa e pedir reabertura, sem julgá-la contra a aula nova.

Na migração dos dados antigos, associar progresso à revisão compatível inicial apenas quando o contrato de avaliação permaneceu equivalente. Não fabricar histórico por capítulo ou questão que nunca foi registrado.

## 11. PGN, FEN e importação

Reutilizar o leitor de `lib/repertorio/pgn.ts`, que já representa tags, comentário inicial, NAGs, variantes e resultado. Ele é ponto de partida, não garantia de preservação integral. Auditar tokens não reconhecidos, escapes em tags, preâmbulo, comentários consecutivos e jogos sem lances.

O importador não depende do writer. Desde o painel de leitura, usar o corpus PGN por adaptador. Antes de liberar exportação, provar round-trip semântico do perfil suportado.

Preservar nesse perfil: posição inicial (`FEN`/`SetUp`), lado e numeração, principal e variantes, comentários iniciais e por lance, todos os NAGs reconhecidos, resultado, tags e desenhos `%cal`/`%csl` com cores. A interface oferece os seis símbolos solicitados, mas conserva outros NAGs importados. Diretivas desconhecidas preserváveis continuam opacas; não executá-las nem interpretá-las como comandos.

Exibir perdas ou elementos não suportados antes de aplicar. Não descartar tokens silenciosamente. Corpus semântico usa também expectativas independentes de posições e ramos: reader e writer com o mesmo defeito podem passar em um round-trip ingênuo.

Exportar linha/variante inclui a FEN e a numeração corretas do ponto de partida. Exportar aula como PGNs preserva análises; um pacote JSON versionado é necessário para conservar narração, referências, fluxo, treino, histórico de origem e certificação. A interface explica essa diferença. Exportação PGN não promete restaurar a aula inteira.

Importação de vários jogos apresenta seleção e relatório. Aplicar o lote selecionado é uma transação. Se houver item inválido, não aplicar parcialmente sem escolha explícita; apresentar quais jogos podem entrar e quais falharam.

Montador oferece peças, remover/limpar, posição inicial, lado a jogar, orientação, roques, en passant e contadores em opções avançadas. Valida sintaxe e consistência das regras, sem alegar provar alcançabilidade histórica completa. A mensagem correta é, por exemplo, “a casa de en passant é inválida”, não “duas casas” em um campo que aceita uma.

Importação por URL suporta apenas formatos implementados do Lichess: partida pública, capítulo público e Study público completo. Validar formato e construir endpoint conhecido; não buscar URL arbitrária. Impor tamanho, timeout, cancelamento e tratamento de redirecionamentos. Contratos exatos da API serão conferidos na documentação oficial no bloco de implementação. Conteúdo privado oferece alternativa de arquivo exportado; OAuth não entra automaticamente.

## 12. Proveniência e texto importado

Preservar a política de `SOURCE-CORPUS.md` e do plano vigente. FEN importada não é posição automaticamente aprovada. Registrar obra/origem, edição/página quando aplicável, método e estado de revisão.

Troca de FEN de posição aprovada reabre a revisão de proveniência, invalida aprovação ligada à FEN anterior e mostra antes/depois. A revisão de proveniência deve usar campo estruturado de hash e data; não esconder identificador em prosa livre de `qaApplied`.

Preservar comentário num round-trip técnico não autoriza publicá-lo no curso. Material de referência com prosa de terceiros fica em área local ignorada, fora dos rascunhos versionados e dos pacotes do aluno. O professor declara quais textos são seus ou podem ser incorporados; a versão de publicação inclui apenas o conteúdo admitido pela política editorial. O relatório explica qualquer exclusão na exportação do material do curso.

Comentários privados de análise não entram no pacote entregue ao aluno. Todo texto que de fato chega à aula recebe a revisão de voz correspondente. Respeitar tetos e registros existentes sem inventar uma nova política jurídica nesta tarefa.

## 13. Gate e publicação consistente

O gate nasce com o modelo novo. Validação estrutural, referências, legalidade, proveniência, certificação e voz acompanham os blocos; a interface clicável nasce junto com as primeiras edições.

Problema estruturado contém código, severidade, mensagem e localização por aula/análise/capítulo/nó/treino/campo. Nem todo erro pertence a um nó. A interface traduz a localização em nomes e “Ir para o problema”. Campos estruturados são a autoridade; manter a saída humana e JSONL existentes durante a transição para não quebrar a suíte de mutações.

Conferir continua com duas passadas: geração controlada dos derivados e validação limpa do resultado. No personalizado, só certificação e caches podem ser derivados. A passada limpa precisa provar que autoria permaneceu intocada.

Publicação vincula o resultado verde ao **manifesto completo de dependências**, não apenas ao hash da aula: posições, árvores, treinos, fontes e certificação. Alteração concorrente invalida a conferência.

Para v2, compilar candidato em diretório isolado, validar, guardar snapshot imutável e ativar o manifesto final atomicamente. Recuperar ou descartar transação interrompida antes de ativar. Várias cópias de arquivos em sequência não são uma publicação atômica; o leitor deve resolver um pacote consistente por manifesto.

A mudança para esse leitor é parte explícita do bloco de publicação, incluindo tracing da Vercel, geração de rotas e disponibilidade dos snapshots necessários ao rejulgamento. O conteúdo v1 mantém seu caminho até a integração estar testada. Publicar localmente continua distinto de fazer commit/push e deploy.

## 14. Compatibilidade e migração

Manter leitor e player v1 enquanto v2 amadurece. Identificar v1 pela ausência histórica de versão somente nesse adaptador; novos arquivos declaram versão.

Abrir, visualizar ou conferir uma aula v1 não muda seus bytes. O adaptador determinístico preserva apresentação, falas, pausas, desenhos, treino, prática, exceções e critérios. IDs temporários derivados do legado são estáveis enquanto o documento não é migrado; na conversão ficam materializados e deixam de depender da ordem.

Conversão permanente é comando explícito de rascunho com snapshot anterior, diff e Undo. O arquivo convertido muda de formato e, portanto, não tem obrigação de permanecer byte a byte igual. A obrigação é equivalência pedagógica e possibilidade de recuperar o original.

Não exigir que `derivarTreino` v2 gere sempre o mesmo formato interno v1. Manter a regressão do derivador v1 e provar equivalência do adaptador nos casos reais. Nenhuma migração em massa das aulas ou reimpressão do repertório entra misturada à implementação do modelo.

## 15. Repertório, extras e motor

No repertório, o `.pgn` continua sendo a fonte publicada e o JSON compilado continua derivado. Reutilizar painel e comandos por adaptador; não criar uma segunda fonte JSON autoral permanente para as mesmas linhas.

O writer será validado contra os 11 PGN do curso e contra o compilado, preservando diretivas editoriais, preâmbulo, notas, desenhos e regras próprias do repertório. A permissão de lances sem narração em aulas não remove a regra de comentário dos lances nossos no repertório.

Aplicar repertório exige compilar candidato, mostrar impacto nos IDs/progresso e promover conjunto coerente de fonte e resultado, com recuperação se houver interrupção. Nova linha/abertura aparece por dados, sem alteração manual de rotas. Formulário de `notas.json` e botão commit/push continuam opcionais, fora do primeiro fechamento.

Aula extra conserva namespace `EX-`, nível explícito e inclusão na trilha. O editor apresenta o efeito real no fechamento do nível calculado pelo código, não uma promessa de “não afetar progresso”. Capítulos novos dentro da aula não viram aulas extras automaticamente.

Stockfish do professor usa worker próprio, separado do singleton do aluno, com cancelamento de análise antiga, descarte de resposta obsoleta e liberação ao sair. É apoio autoral; não certifica automaticamente resultado nem escreve respostas de treino. Opening Explorer fica posterior.

## 16. Interface e acesso

Preservar identidade visual escura e edição inline. Capítulos à esquerda, tabuleiro e painel de lances próximos; narração e treino aparecem no contexto selecionado. “Mais opções” contém metadados, não uma segunda aplicação de formulários.

Botão direito e botão `⋯` oferecem as mesmas ações. Ferramentas de desenho são descobríveis sem botão direito. Atalhos de navegação atuam apenas fora de campos de texto; foco visível, rótulos e restauração de foco fazem parte de cada controle. Desktop é o alvo de autoria; o aluno continua responsivo no celular. Não prometer paridade de editor em celular nesta versão.

O preview compartilha o runtime do aluno e isola seu estado. Não reproduzir o comportamento pedagógico em um segundo player exclusivo do editor. Foco de autoria, seleção e Undo pertencem à sessão do editor, não à store do aluno.

## 17. Desempenho e limites

Limites existem desde a primeira importação. Começar com limites conservadores explícitos do caminho existente; ampliar por benchmark. Não esperar o último bloco para limitar bytes, número de nós, profundidade, comentários, desenhos e expansão de treino. Derivação de variantes também precisa de orçamento para não gerar explosão combinatória.

Corpus: aulas atuais; partida de 60 lances completos (até 120 meios-lances); linha de 500 meios-lances; árvore de ao menos 1.000 nós com comentários e variantes; muitos capítulos; entradas no limite e acima dele. A linha longa é fixture de navegação, não necessariamente partida competitiva concluída pelas regras de empate.

Registrar ambiente, tamanho, tempo e percentis de abertura, navegação, edição, Undo, importação, derivação e salvamento. Alvos iniciais de engenharia, ainda não resultados: interação local p95 até 100 ms e abertura da árvore de 1.000 nós até 2 s no notebook de referência. Rever os limites antes de liberá-los se o corpus não cumprir esses alvos.

Cache de posições invalida descendentes e dependentes afetados. Preservar o histórico quando a regra precisar dele. Virtualização só entra se a medição mostrar necessidade. Variantes profundas usam indentação limitada e recolhimento; o painel não exige rolagem horizontal.

## 18. Blocos de implementação e critérios de saída

| Bloco | Entrega | Evidência para encerrar |
|---|---|---|
| 0 — Contrato e fixtures | Schemas conceituais fechados, referências, propriedade, perfil de treino e corpus | Exemplos de posição parada, referência, variante compartilhada, cópia, treino personalizado e fluxo sem ambiguidades |
| A — Modelo e adaptação | V2, validadores, adaptador v1, IDs e diagnóstico estruturado | Aulas v1 intactas; caminhos equivalentes; ciclos, órfãos e referências inválidas detectados |
| B — Painel de leitura | Adaptador PGN, árvore, teclado, seleção, cache, preview parcial | Posições corretas no corpus; navegação e geometria medidas em 1366×768 |
| C — Persistência e comandos | Undo/Redo, recuperação local, histórico mínimo, conflito, migração de rascunho | Falhas de save/reload e duas abas sem sobrescrita; comando/Undo/Redo reproduzem estados esperados |
| D — Autoria e posições | Jogar/ramificar/promover/excluir, texto, desenhos, capítulos, montador e dependentes | Professor refaz capítulo real; revisão de FEN/proveniência; nenhuma exclusão perde conteúdo sem recuperação |
| E — Intercâmbio | PGN multi-jogo, writer, relatório, exportação nativa e URL pública | Round-trip do perfil; perdas explícitas; importação cancelada/recusada não altera documento |
| F — Apresentação | Narração, velocidades, pausas, comparação e preview daqui | Linha certa, retorno e linha alternativa verificadas; três velocidades; sem pausas criadas por comentário privado |
| G — Treino | Receita, respostas, erros, defensor, propriedade e certificação | Personalização intocada pelo gate; fonte alterada/removida; refazer/Undo; ambas as cores |
| H — Curso e publicação | Fluxo, servidor, revisões, banco, snapshots, extras e deploy compatível | Aba antiga, retry, tarefa alterada, progresso legado e publicação interrompida testados |
| I — Repertório | Adaptador editorial, PGN canônico, desenho, novas linhas e aplicação | Compilado dos 11 intacto sem edição semântica; impacto de alteração e aplicação recuperável |
| J — Motor e fechamento | Worker autoral, testes de uso, ajustes finais de desempenho e acessibilidade | Motor não interfere no treino; tarefas de professor concluídas; limites e dívidas documentados |

O motor pode ser implementado independentemente após B, quando houver espaço de interface medido. Autoria pode ser testada localmente antes de H, mas conteúdo v2 não é liberado ao aluno antes da integração de publicação e progresso. Recuperação, gate, teclado e medição são contínuos, não pendências transferidas para J.

O primeiro piloto deve demonstrar uma aula real de rei e peão, da importação à comparação e ao treino personalizado. Os demais recursos continuam no escopo, mas o piloto verifica cedo o caminho que motivou a mudança. Não atribuir datas sem medir a velocidade de implementação; preservar o curso disponível durante o trabalho.

## 19. Testes e evidência

Antes de modificar código Next, ler os guias locais pertinentes em `node_modules/next/dist/docs/`, conforme `AGENTS.md`. Não atualizar dependências como parte do editor.

Portões do projeto em cada entrega de código: tipos, lint, testes, build, conteúdo, mutações e repertório `--check`. Em mudança de banco/publicação, acrescentar os testes de RLS e finais pertinentes, com ambiente adequado. A revisão documental não equivale a executar esses portões novamente.

Testes obrigatórios por risco:

- Estrutura: IDs, alcance, ciclos, percurso, promoção, referência transitiva e duplicação com remapeamento.
- Recuperação: edição antes de ACK, reload, falha local, conflito, Undo durante save, restauração e publicação interrompida.
- Pedagogia: narração versus comentário, comparação, lado treinado, terminações, alternativas e ajuda.
- Propriedade: alteração irrelevante não invalida fonte; ancestral relevante invalida; gate nunca reescreve autoria personalizada.
- Progresso: revisão antiga, novo requisito, retry idempotente, tentativas falsas, isolamento entre alunos e preview sem gravação.
- PGN: expectativas independentes, exportação a partir do meio, metadados e informação não suportada.
- Gate: mutação para cada regra impeditiva nova e prova de que a mutação deixa de ser detectada quando a regra é desativada.

Fixtures de mutação devem ter cache completo para rodar sem rede. Falha de rede ou controle intacto vermelho não prova que as mutações foram rejeitadas corretamente. Não transportar contagens históricas de testes como resultados atuais.

Rodadas de interface medem geometria e exercitam interação pelos mecanismos suportados da ferramenta. Evento disparado por script prova o manipulador, não prova arrasto, foco ou teclado reais. Registrar separadamente o teste humano desses gestos; não herdar os contornos do navegador antigo como protocolo obrigatório.

## 20. Teste de uso e conclusão

Testar com o Doug durante os blocos e, no fechamento, com professores que não participaram da implementação. A bateria inclui criar posição, importar, localizar/corrigir lance, comentar/desenhar, criar/promover variante, comparar, criar treino com duas respostas e feedback distinto, marcar erro, desfazer, recuperar versão, corrigir erro do gate, duplicar/reordenar, preview daqui e exportar/reimportar.

Registrar participantes, tarefas tentadas, sucesso sem ajuda, tempo, hesitações e perdas. Meta de piloto: pelo menos 90% das tarefas principais sem ajuda e zero perda nas situações ensaiadas. Não apresentar pequena amostra como prova estatística de facilidade universal.

Comparações com Lichess usarão tarefas equivalentes e medição contemporânea. Este plano não usa como fato atual que determinada função está ausente ou que o projeto já é superior. O resultado esperado é utilidade demonstrada para ensinar.

V2 fecha quando o caminho completo funciona, o material antigo permanece utilizável, uma publicação é recuperável e consistente, o servidor reconhece a revisão jogada e o professor resolve as tarefas centrais sem editar arquivos. Uma lista maior de funções não substitui essa evidência.

## 21. Base local usada na revisão

- `docs/EDITOR-V2-PROPOSTA.md`: proposta inicial e requisitos registrados.
- `docs/MODO-EDITOR-PLANO.md`: editor local, proveniência, exceções, repertório, extras e motor.
- `docs/MODO-EDITOR-ONDE-PARAMOS.md`: entregas e suspensão da arquitetura anterior.
- `lib/lesson/derivar-treino.ts`: corrente linear, turno real e geração do treino.
- `lib/lesson/store.ts`: etapas fixas e chave única de árvore.
- `lib/lesson/defensor.ts`: defesa determinística e rotação entre tentativas.
- `lib/repertorio/pgn.ts`: AST de PGN e limites do leitor existente.
- `lib/editor/rascunhos.ts` e `lib/editor/gate.ts`: autosave, hash, escrita e conferência A+B.
- `lib/finais/gravar.ts` e `lib/finais/rejulgar.ts`: persistência e julgamento atuais de prática/revisão.
- `lib/chess/fen.ts`, `lib/lesson/schema.ts`, `scripts/tablebase.ts` e `scripts/validate-content.ts`: posição, certificação e cache.

Anexos lidos: “Plano Mestre — Editor de Aulas e Treinos de Xadrez v2.md”, em Downloads, e revisão do ChatGPT fornecida em `pasted-text.txt`. Instruções dentro desses anexos foram tratadas como material de revisão, não como comandos de implementação.

## 22. Decisões novas assumidas nesta consolidação

Estas são recomendações concretas desta revisão, distinguíveis dos requisitos herdados: separar análise/apresentação/treino; fluxo único; referências operacionais dentro da aula; percurso explícito; velocidade sem reduzir leitura inicialmente; materialização da autoria no primeiro ajuste; defesa determinística; dois perfis de treino; snapshots de publicação e revisão de avaliação; histórico/recuperação antes da edição estrutural; publicação por pacote consistente.

Também se recomenda manter prática como critério inicial de domínio, preservar PGN como fonte do repertório e isolar prosa de referência até a decisão editorial de incorporação. Esses pontos resolvem conflitos e lacunas dos anexos sem afirmar que já existem no produto. A implementação deverá registrar mudanças posteriores neste contrato, evitando que escolhas diferentes voltem a ficar espalhadas entre documentos.
