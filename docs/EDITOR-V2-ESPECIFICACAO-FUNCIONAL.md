# Editor v2 — especificação funcional completa

**Data:** 11/09/2026. **Estado:** contrato funcional vigente, criado a pedido do Doug.

Este documento transforma o plano arquitetural aprovado e as decisões posteriores de
uso em uma especificação que outra pessoa ou LLM consiga implementar sem depender da
conversa que as originou. Ele descreve **todas as funções previstas para o Editor v2**,
como o professor as aciona, o resultado esperado e a evidência mínima para considerá-las
prontas.

## 1. Autoridade e leitura obrigatória

Quem trabalhar no Editor v2 deve ler, nesta ordem:

1. `AGENTS.md` e os guias locais pertinentes de Next.js;
2. `docs/EDITOR-V2-PLANO-FINAL.md`, autoridade sobre arquitetura, dados e segurança;
3. este documento, autoridade sobre comportamento, interface e critérios funcionais;
4. `docs/MODO-EDITOR-ONDE-PARAMOS.md`, autoridade sobre o que já foi entregue.

Em conflito, a segurança e os contratos de dados do plano final prevalecem. Uma decisão
posterior explicitamente registrada como sendo do Doug prevalece sobre comportamento
anterior. Não interpretar um item deste documento como já implementado: o estado atual
fica no diário “Onde paramos”.

As palavras **deve**, **não pode** e **somente** indicam requisito. Um detalhe marcado
como “posterior” está fora do primeiro fechamento, mas continua documentado para não
ser implementado por acidente.

## 2. Resultado que encerra o projeto

O Editor v2 está funcionalmente pronto quando um professor, sem editar JSON ou PGN à
mão, consegue:

1. criar ou abrir uma aula;
2. criar posições e capítulos;
3. importar, jogar, corrigir e ramificar linhas;
4. comentar, narrar e desenhar;
5. comparar linhas;
6. criar treinos com respostas, erros, defensor, dicas e término;
7. assistir e jogar uma prévia idêntica à experiência do aluno;
8. conferir problemas e corrigi-los pela própria tela;
9. publicar de forma recuperável, sabendo o impacto no curso e no progresso;
10. exportar e reimportar o perfil suportado sem perda silenciosa;
11. editar finais, aulas extras e o repertório pelas fontes corretas;
12. usar a avaliação Stockfish como apoio, sem que ela altere autoria sozinha.

O fechamento exige ainda conteúdo v1 preservado, publicação interrompida recuperável,
revisão jogada reconhecida pelo servidor e pelo menos 90% das tarefas principais do
teste de uso concluídas sem ajuda.

## 3. Escopo e limites do produto

- O editor é local, em `next dev`, com `EDITOR_LOCAL=1`, fora da Vercel e acessível
  somente a professor autenticado.
- O aluno usa o conteúdo publicado; nunca vê rascunhos ou ferramentas de autoria.
- O alvo de autoria é desktop. O player do aluno continua responsivo.
- Xadrez padrão é suportado. Chess960 e outras variantes são recusadas com motivo.
- Finais e repertório são suportados, respeitando suas fontes e juízes diferentes.
- Não entram nesta versão: colaboração simultânea com merge visual, editor hospedado,
  envio automático por Git, atualização do Next, OAuth do Lichess, Opening Explorer e
  substituição completa do Lichess Study.
- Commit, push e deploy nunca são consequência automática de salvar ou publicar.

## 4. Vocabulário que a interface deve preservar

- **Aula:** pacote pedagógico completo.
- **Análise:** árvore autoral de posições, lances, variantes, comentários e desenhos.
- **Capítulo:** percurso escolhido de uma análise, com orientação e narração próprias.
- **Treino:** tarefa jogável, com respostas, feedback, defesa e término.
- **Prática:** avaliação já existente contra Stockfish/tablebase, preservada no v2.
- **Fluxo:** ordem única em que introduções, capítulos, treinos e práticas aparecem.

O professor não precisa conhecer “nó”, “hash”, “manifesto” ou “AST”. Mensagens devem
usar capítulo, lance, posição, treino, versão e publicação.

## 5. Entrada, índice e ciclo de uma aula

### 5.1 Índice do editor

O índice `/editor` deve:

- listar aulas existentes, com estado de rascunho/publicação e problemas conhecidos;
- abrir o Editor v2 sem alterar o arquivo só por visualizá-lo;
- oferecer **Nova aula**;
- distinguir aula do curso, aula extra e repertório;
- nunca listar um rascunho como publicado.

### 5.2 Nova aula

“Nova aula” abre um formulário com título, tipo, nível quando aplicável e orientação
padrão. O ID é gerado/validado pelo sistema; o professor não digita IDs internos.

- Aula extra usa namespace `EX-` e nível explícito.
- Uma aula vazia pode ser salva como rascunho incompleto.
- Cancelar não cria arquivo.
- Criar abre a nova aula e oferece imediatamente **Adicionar capítulo**.
- A criação inteira é uma transação e recebe snapshot de recuperação.

### 5.3 Cabeçalho da aula

Deve mostrar:

- título editável;
- estado `salvo`, `alterado`, `salvando`, `erro` ou `conflito`;
- Importar;
- Desfazer;
- Refazer;
- Desfazer tudo;
- Pré-visualizar;
- Conferir;
- Publicar, somente quando permitido;
- Mais opções para metadados, histórico, exportação e operações menos frequentes.

Salvar é automático. Não existe botão REC.

## 6. Histórico, Desfazer e recuperação

### 6.1 Undo/Redo

Toda ação autoral é uma transação: texto confirmado, desenho, lance, variante,
reordenação, importação, criação, duplicação, exclusão, restauração e treino.

- `Ctrl+Z` desfaz fora de campos de texto.
- `Ctrl+Shift+Z` e `Ctrl+Y` refazem.
- Dentro de input/textarea, o desfazer nativo do texto prevalece.
- Digitação é agrupada por sessão de edição, não por caractere.
- Ação sem efeito não entra no histórico nem dispara autosave.
- Desfazer/Refazer restaura dados relacionados e seleção coerente.

### 6.2 Desfazer tudo

O botão restaura **a aula inteira ao estado exato em que estava quando o editor foi
aberto**, não apenas desenhos ou o capítulo atual.

- Fica desabilitado quando a aula já está no estado de abertura.
- Exibe: “Desfazer todas as alterações feitas desde que você abriu o editor? A aula
  inteira voltará ao estado daquela abertura.”
- Cancelar não altera nada.
- Confirmar volta também ao primeiro capítulo/posição válidos daquele estado.
- A restauração entra como uma ação recuperável pelo Desfazer comum.
- O resultado passa pelo autosave, sem publicar.

### 6.3 Recuperação e conflito

- Recuperação do navegador é por aula e sessão/aba.
- Só afirmar “preservado” depois da confirmação do armazenamento.
- Falha de armazenamento mostra aviso e **Baixar cópia agora**.
- Duas abas partindo do mesmo hash não podem sobrescrever uma à outra.
- Em conflito, conservar a edição local e oferecer **Baixar minha cópia** e **Abrir
  versão do disco**.
- Abrir a versão do disco só ocorre depois de preservar a cópia local.
- Histórico em `.editor/` mantém snapshots pré-importação, pré-migração e
  pré-publicação, com retenção limitada e explícita.

## 7. Layout principal e navegação

No desktop, a tela tem três áreas próximas:

1. capítulos à esquerda;
2. tabuleiro ao centro;
3. lances, variantes e edição contextual à direita.

As colunas rolam internamente quando necessário; procurar um lance não deve fazer o
professor perder o tabuleiro. Não pode haver rolagem horizontal na árvore.

Atalhos fora de campos:

- `←`: pai;
- `→`: filho da linha principal;
- `↑`/`↓`: item anterior/seguinte na ordem visual, variantes incluídas;
- `Home`: raiz;
- `End`: fim da linha atual.

O foco acompanha a navegação, é sempre visível e não fica atrás de modal. Fechar um
diálogo devolve o foco ao controle que o abriu.

### 7.1 Introdução e quadros explicativos

A aula pode ter uma introdução antes dos capítulos. O professor deve conseguir:

- editar título e texto de cada quadro;
- acrescentar, duplicar, reordenar e excluir quadros;
- usar a posição principal da aula, referenciar uma posição da análise ou informar uma
  FEN própria para o quadro;
- desenhar setas e casas em cada quadro;
- criar quadros sem lance para explicar a posição parada;
- inserir lance quando a demonstração exigir mudança de posição;
- definir narração e pausa;
- pré-visualizar a introdução isoladamente.

Repetir por escrito a mesma FEN da posição referenciada é recusado: a referência é a
fonte única. Excluir ou mudar posição mostra impacto nos quadros dependentes. A ordem
dos quadros é editável, mas não cria uma segunda ordem concorrente com o fluxo da aula.

## 8. Capítulos

### 8.1 Lista

Cada capítulo mostra título, estado selecionado, alça/área de arraste e botão `•••`.
A ordem visual vem exclusivamente do `fluxo`.

### 8.2 Reordenar

- Arrastar exibe linha clara no vão de destino.
- Soltar coloca exatamente naquele vão.
- O menu oferece **Mover para cima** e **Mover para baixo** para teclado.
- Tab chega ao `•••`; Enter abre; Esc fecha.
- Reordenação é uma única ação de Undo/Redo.
- Tabuleiro, nome e painel continuam apontando para o capítulo arrastado.
- Autosave e reload preservam a ordem.

### 8.3 Adicionar capítulo

O botão **Adicionar capítulo** fica junto à lista. Abre um diálogo com cinco portas:

1. **Posição inicial:** tabuleiro padrão do xadrez;
2. **Montar posição:** editor manual de peças;
3. **FEN:** colar posição completa;
4. **PGN:** colar/subir um ou vários jogos;
5. **URL:** partida, capítulo ou Study público do Lichess.

Também existem ações contextuais:

- **Mostrar esta variante na aula:** novo capítulo que referencia um percurso existente;
- **Começar desta posição:** nova análise independente a partir da posição selecionada;
- **Duplicar como independente:** copia conteúdo, gera IDs novos e conserva origem.

Campos comuns: nome obrigatório, orientação e ponto de inserção. Xadrez padrão é a
única variante da primeira versão. Confirmar:

- valida a origem;
- cria análise/capítulo/etapa com IDs estáveis;
- insere depois do capítulo atual, salvo escolha explícita diferente;
- seleciona automaticamente o capítulo e sua posição inicial;
- é uma única ação de Undo/Redo.

Cancelar não altera a aula. Erro mantém o diálogo e os dados digitados.

### 8.4 Renomear, duplicar e excluir

- Nome é editável no contexto do capítulo; vazio não apaga o nome anterior.
- Duplicar como independente remapeia todos os IDs internos e referências copiadas.
- Excluir capítulo não exclui automaticamente a análise compartilhada.
- Antes de excluir, mostrar nomes e contagens de análises, treinos, narrações, desenhos
  e publicação afetados.
- Exclusão simples e sem dependentes ainda exige confirmação clara.
- Dependente existente exige cancelar, remover explicitamente dependentes ou
  materializá-los como independentes.
- Toda exclusão pode ser desfeita.

## 9. Montador e posição inicial

O montador oferece:

- paleta de peças brancas e pretas;
- arrastar peça para o tabuleiro;
- mover livremente;
- remover peça arrastando para fora;
- limpar;
- restaurar posição inicial;
- lado a jogar;
- orientação;
- roques;
- en passant;
- contadores de meio-lance e lance nas opções avançadas.

Deve validar sintaxe e consistência: um rei de cada cor, reis não adjacentes, lado fora
da vez não pode estar em xeque impossível, campos de FEN válidos e regras coerentes.
Não deve afirmar que provou alcançabilidade histórica completa.

Trocar a posição inicial de capítulo existente:

- mostra FEN anterior e nova;
- calcula ramos que continuam legais;
- poda somente a partir do primeiro lance ilegal de cada ramo;
- mantém irmãos legais;
- marca comentários, narrações, desenhos e treinos afetados para revisão;
- reabre proveniência/certificação vinculada à posição antiga;
- mostra impacto antes de aplicar;
- acontece numa transação com Undo.

## 10. Tabuleiro e desenhos

### 10.1 Jogar

- Casas legais são indicadas.
- Jogar um lance existente seleciona a continuação correspondente.
- Jogar um lance novo cria variante automaticamente, preserva a continuação anterior,
  seleciona o lance criado e informa que uma variante nasceu.
- Promoção abre escolha de peça; dama pode ser o padrão, mas a escolha deve estar
  disponível.
- Lance ilegal não altera o documento e explica o motivo em português.

### 10.2 Desenhar

- Botão direito arrasta seta; clique direito acende casa.
- A tela também possui ferramentas clicáveis: seta, casa, cor e limpar, para que o
  recurso seja descoberto sem conhecer atalhos.
- Atalhos compatíveis: sozinho verde, Shift vermelho, Alt azul/roxo do plano e
  Shift+Alt amarelo.
- No desenho livre do editor, todas as cores usam a mesma espessura padrão 10; somente
  a cor muda. Espessuras semânticas das marcações pedagógicas automáticas não mudam.
- Desenho pertence à posição selecionada e cada gesto é uma ação.
- Apagar o último desenho omite o campo; não salva listas vazias inválidas.
- **Apagar desenhos desta posição** afeta somente a posição atual.
- Ferramenta de desenho explicativo e alvo/dica de treino são contextos distintos e
  recebem indicação visível.
- **Virar tabuleiro** altera orientação de visualização sem reescrever a posição.

## 11. Painel de lances e variantes

### 11.1 Representação

- Linha principal permanece no mesmo eixo, com numeração correta.
- Variantes recebem recuo curto e limitado; profundidade não cria escada infinita.
- Comentário pode abrir um bloco legível sem transformar cada lance em uma tela.
- SAN é calculado; UCI é o valor persistido.
- Selecionar um lance atualiza tabuleiro, comentário, desenhos, símbolo e narração.

### 11.2 Símbolos de qualidade

A interface oferece somente `!`, `?`, `!!`, `??`, `!?`, `?!`.

- Apenas um dos seis pode ficar selecionado no mesmo lance.
- Clicar no selecionado novamente o remove.
- Outros NAGs importados são preservados no arquivo, embora não ganhem botão.
- O símbolo aparece ao lado do SAN na lista.
- O símbolo aparece também em círculo sobre o canto superior direito da peça/casa de
  destino no tabuleiro, como no Lichess, acompanhando a orientação.
- A posição inicial não aceita símbolo porque não é lance.

### 11.3 Ações contextuais

Botão direito no lance e `•••` acessível por teclado devem oferecer o mesmo conjunto
aplicável de ações:

- Tornar linha principal;
- Comentar este lance;
- Anotar com símbolo;
- Criar variante daqui;
- Mostrar esta variante como capítulo;
- Começar novo capítulo desta posição;
- Criar treino daqui;
- Copiar PGN desta variante;
- Substituir continuação;
- Excluir a partir daqui.

Ações impossíveis ficam ausentes ou desabilitadas com motivo. Excluir/substituir mostra
impacto transitivo e permite cancelar. Promover/reordenar variante muda a ordem dos
irmãos sem trocar IDs. Arrastar serve apenas para variantes irmãs, nunca para quebrar
a causalidade da linha.

## 12. Comentários e narrações

### 12.1 Comentário

- Comentário pertence à posição da análise.
- Pode ser criado, editado e apagado.
- Editar comentário não altera narração já existente.
- Comentário técnico privado não é necessariamente publicado ao aluno.

### 12.2 Narração

- Narração pertence à apresentação daquele nó no capítulo.
- Pode ser criada, editada, apagada e ordenada quando houver mais de uma.
- A caixa aparece abaixo do comentário, no contexto do lance.
- Esvaziar uma narração a remove; Undo a recupera.
- Pode usar pausa temporizada ou pausa manual que exige **Continuar**.
- Texto exibido ao aluno passa pela régua de voz.

### 12.3 Regra da importação decidida pelo Doug

Ao importar PGN, não há escolha anterior “usar como narração”. Primeiro importa.
Cada comentário de lance:

1. permanece como comentário;
2. cria automaticamente uma narração temporizada com o mesmo texto;
3. aparece na caixa de narração logo abaixo;
4. pode ser editado ou apagado pelo professor depois.

As cópias ficam independentes imediatamente após importar. Material de terceiros pode
ser preservado localmente, mas a publicação exige declaração/revisão editorial; copiar
automaticamente para narração não concede direito de publicação.

## 13. Importação

### 13.1 Texto e arquivo PGN

- Aceita colar texto, arrastar arquivo ou escolher arquivo.
- Cada jogo pode virar capítulo.
- Antes de aplicar, mostra título, lances, variantes, comentários, perdas e recusa.
- Jogos aproveitáveis vêm selecionados por padrão.
- A linha selecionada inteira fica destacada e mostra **incluído**; desmarcada mostra
  **fora**.
- Há contador de selecionados, **Selecionar todos** e **Desmarcar todos**.
- Item recusado fica desabilitado e explica o motivo.
- Rodapé mostra quantos lances a aula terá e o teto.
- Aplicar lote escolhido é uma única transação e um único Undo.
- Cancelar, arquivo recusado ou importação interrompida não altera a aula.

Preservar quando suportado: FEN/SetUp, lado, numeração, linha principal, variantes,
comentários, NAGs reconhecidos, resultado, tags e desenhos `%cal`/`%csl` com cores.
Diretivas desconhecidas preserváveis ficam opacas; nunca são executadas. Toda perda é
anunciada, nunca silenciosa.

### 13.2 URL do Lichess

Aceita somente:

- partida pública;
- capítulo público;
- Study público completo.

O sistema reconhece o formato e constrói endpoints conhecidos; não busca URL arbitrária.
Deve impor tamanho, timeout, cancelamento e redirecionamentos seguros. Conteúdo privado
orienta exportar arquivo; OAuth é posterior.

## 14. Exportação

Deve oferecer:

- copiar PGN da variante;
- exportar linha selecionada;
- exportar capítulo;
- exportar análises da aula como PGNs;
- baixar pacote JSON v2 completo.

Linha/variante exportada inclui FEN e numeração corretas do ponto inicial. Writer e
reader são verificados também por expectativas independentes, não apenas um contra o
outro.

A interface explica:

- PGN preserva o perfil de xadrez suportado;
- PGN não representa integralmente narração, fluxo, treino, histórico e certificação;
- somente o pacote JSON v2 promete restaurar a aula inteira;
- qualquer perda ou exclusão editorial é listada antes de baixar.

## 15. Prévia, reprodução e comparação

### 15.1 Prévia

- Usa o mesmo runtime do aluno, nunca um segundo player aproximado.
- Não grava progresso real.
- Pode iniciar na aula inteira, no capítulo ou **daqui**.
- Abre isolada da seleção e do Undo da autoria.
- Fechar devolve o professor ao mesmo contexto.

### 15.2 Controles

- reproduzir/pausar;
- voltar/avançar;
- repetir;
- velocidades `0,5×`, `1×`, `2×`;
- reiniciar capítulo/aula;
- respeitar pausa manual com **Continuar**.

Velocidade altera movimentos e intervalos. No primeiro corte, o tempo de leitura da
narração continua calculado pela régua existente e não é comprimido pela velocidade.
Variantes de análise não tocam sozinhas: o capítulo reproduz somente seu percurso.

### 15.3 Comparação

O professor pode transformar dois ou mais percursos em capítulos de comparação. A
experiência deve:

1. mostrar a linha escolhida;
2. retornar de forma compreensível à posição de comparação;
3. mostrar a alternativa;
4. permitir narração diferente em cada apresentação da mesma posição;
5. suportar lado a jogar diferente e início no meio de uma partida.

O caso de aceite obrigatório é uma posição de rei e peão: linha correta até o empate,
retorno ao ponto de escolha e linha errada até a derrota, na mesma aula.

## 16. Treinos

### 16.1 Criar treino daqui

Abre prévia contendo:

- título;
- posição inicial;
- lado do aluno;
- capítulo/percurso/trecho de origem;
- linhas incluídas;
- objetivo;
- respostas;
- defensor;
- dicas, feedback e condições de término;
- colocação no fluxo e obrigatoriedade.

O padrão usa o percurso selecionado. Variantes não viram automaticamente soluções.
Símbolos podem sugerir classificação, mas não provam correção.

### 16.2 Colocação e quantidade

- Uma aula aceita vários treinos.
- Treino de capítulo entra depois do capítulo correspondente.
- Treino geral entra no fim da aula, antes das práticas finais conforme o fluxo.
- Treinar ambos os lados cria duas tarefas com IDs próprios.

### 16.3 Questões e respostas

Cada questão permite:

- uma ou mais respostas corretas explícitas;
- alternativas corretas fora do método, com feedback próprio;
- erros conhecidos nomeados, com explicação própria;
- continuação executável para cada resposta aceita;
- uma ou mais respostas do defensor;
- dica sob demanda;
- explicação de conclusão;
- fim por mate, promoção, empate seguro, vitória certificada ou condição autoral
  suportada.

Lance legal fora da linha autoral recebe “este lance não faz parte da linha treinada”,
sem mentira objetiva. Em final certificado, distinguir manter resultado de aplicar a
técnica. Resposta sem continuação ou término válido não pode ser aceita.

### 16.4 Defensor

- Resposta é estável dentro da tentativa.
- Variantes giram deterministicamente entre tentativas.
- Escolha fixa pode ser configurada.
- Política aleatória/ponderada é posterior e nunca substitui a garantia por acidente.
- Se a posição começa com o defensor, ele joga antes da pergunta ao aluno.

### 16.5 Derivado, personalizado e independente

- Treino novo pode ser **derivado** de análise e receita versionada.
- Primeiro ajuste em resposta, posição, objetivo, dica ou feedback materializa a cópia
  e o torna **personalizado**; a máquina nunca sobrescreve essa autoria.
- **Independente** não mantém dependência operacional, mas conserva origem histórica.
- Fonte pode estar atual, alterada ou removida independentemente da propriedade.
- Fonte alterada mostra aviso e diff.
- **Refazer a partir da aula** mostra o que será substituído, guarda snapshot e é uma
  ação única com Undo.
- Fonte removida impede refazer até selecionar nova fonte; treino personalizado mantém
  sua cópia completa.
- IDs de questões sobrevivem quando o ponto de origem continua o mesmo.

## 17. Julgamento, prática e certificação

Existem dois perfis:

1. **Final certificado:** tablebase/contratos atuais verificam resultado, técnica,
   distância e término com evidência disponível;
2. **Linha autoral:** verifica legalidade, caminhos, feedback e término, sem afirmar que
   todo lance não cadastrado perde.

- Posição geral com 32 peças não é enviada ao juiz de sete peças.
- Cache ausente é informado; rede não é consultada silenciosamente na tentativa.
- Regra dos 50 lances, repetição e ausência de distância precisam ser respeitadas.
- Exceção do professor exige código, alvo, motivo e hash; caduca quando o alvo muda.
- Exceção nunca perdoa ilegalidade, corrupção ou referência quebrada.
- Autoria e certificação são campos distintos; gate renova evidência, não texto ou
  respostas autorais.
- Práticas atuais contra Stockfish e escada de revisão continuam preservadas.
- Assistir ou concluir treino com ajuda não concede domínio automaticamente.

### 17.1 Configuração de práticas

O professor pode preservar, criar e editar práticas de avaliação, definindo:

- título e obrigatoriedade;
- posição inicial e lado do aluno;
- objetivo;
- configuração do adversário Stockfish suportada pelo runtime atual;
- limite de lances/condição de sucesso;
- lugar no fluxo;
- ajuda permitida e efeito no domínio.

A tela diferencia treino pedagógico de prática avaliativa. Alterar posição, objetivo,
respostas, defesa, término ou ajuda permitida cria nova `assessmentRevision` e mostra o
impacto antes de publicar. Reordenar ou renomear não invalida domínio.

## 18. Fluxo pedagógico

- `fluxo` é a única ordem autoritativa.
- Pode conter introdução, capítulo, treino e prática, todos com ID estável.
- Interface permite mover etapas válidas e diz “após capítulo” em linguagem humana.
- Treino de capítulo e treino geral não usam estruturas diferentes: são etapas com
  colocação diferente.
- Nova avaliação obrigatória mostra impacto antes de alterar fechamento da aula/nível.
- Reordenação, título e narração não invalidam domínio; mudança semântica da avaliação
  cria nova revisão.

## 19. Problemas, conferência e correção

### 19.1 Metadados, proveniência e exceções

“Mais opções” permite editar, quando aplicável:

- nível, classe, critério de domínio e estado editorial;
- fonte didática;
- posição/obra de origem, edição, página e método de obtenção da FEN;
- estado de revisão e hash da evidência;
- justificativa de etapa ausente;
- nota de adaptação do professor;
- catálogo de erros e mensagens pedagógicas;
- exceção do professor a julgamento externo.

Campos técnicos derivados não são editados como autoria. Mudar FEN reabre revisão de
proveniência e torna evidência antiga caduca. Exceção exige problema específico, alvo,
motivo suficientemente descritivo e hash atual. A interface mostra que exceção permite
uma divergência justificada; não transforma ausência de prova em certificação.

### 19.2 Painel de problemas

- Mostra primeiro o que impede publicação, depois avisos.
- Usa nomes: aula, capítulo, lance, treino e campo; não expõe IDs crus.
- Cada problema navegável possui **Ir para o problema**.
- Clicar seleciona exatamente capítulo/nó/campo afetado.
- Rascunho com pendência continua sendo salvo.
- Corrigir remove o problema da tela sem exigir reload.

### 19.3 Conferir

Executa geração controlada de derivados e validação limpa. Verifica estrutura,
referências, legalidade, proveniência, certificação, voz, limites e dependências. Em
treino personalizado, pode renovar apenas certificação/cache.

Resultado mostra contagens, problemas e se pode publicar. Um resultado verde está
vinculado ao manifesto completo julgado; mudança posterior invalida a conferência.

## 20. Publicação, snapshots e progresso

### 20.1 Publicar

- Só professor autenticado e editor local podem publicar.
- Publicar é separado de salvar, conferir, commit, push e deploy.
- Compila candidato em área isolada.
- Valida pacote completo.
- Mostra impacto em curso, nível, alunos e avaliações.
- Guarda snapshot imutável anterior.
- Ativa manifesto final atomicamente.
- Interrupção é recuperada ou descartada antes de ativar qualquer pacote.
- Conteúdo v1 permanece ativo até a integração v2 estar provada.

### 20.2 Progresso

- Progresso usa IDs de entidade, `publicationId` e `assessmentRevision`, nunca índice.
- Tentativa registra revisão efetivamente jogada, lances dos dois lados, política do
  defensor, ajuda e ID idempotente.
- Servidor reconstrói e rejulga; não aceita `acertei` enviado pelo navegador.
- Aba antiga conclui contra seu snapshot, mas não concede domínio de revisão diferente.
- Retry não duplica tentativa.
- Conquistas históricas não são apagadas silenciosamente.
- Preview não grava tentativa.

### 20.3 Migração

- Abrir v1 não muda bytes.
- Conversão permanente é explícita, mostra diff, guarda snapshot e aceita Undo.
- Migração de progresso antigo só associa revisão quando a avaliação é equivalente.
- Não fabricar histórico por capítulo/questão que nunca existiu.
- Não misturar migração em massa com implementação de outro recurso.

## 21. Repertório

- PGN permanece fonte autoral; JSON compilado permanece derivado.
- O editor reutiliza painel/comandos por adaptador, sem criar JSON concorrente.
- Writer preserva preâmbulo, tags, comentários, NAGs, desenhos e diretivas suportadas.
- Regras próprias de comentários/narração do repertório continuam valendo.
- Nova linha ou abertura nasce por dados, não por alteração manual de rota.
- Antes de aplicar, compilar candidato e mostrar impacto em IDs/progresso.
- Fonte e compilado são promovidos como conjunto coerente.
- Interrupção é recuperável.
- Critério de aceite: os 11 PGNs atuais compilam sem edição semântica involuntária.
- Formulário de `notas.json` e botão de commit/push são opcionais, posteriores ao
  primeiro fechamento.

## 22. Aulas extras

- Usam namespace `EX-`.
- Exigem nível explícito.
- Entram na trilha por dados.
- Antes de publicar, mostram o efeito real no fechamento do nível.
- Capítulo novo dentro de aula existente não vira aula extra.

## 23. Stockfish do professor

- Barra de avaliação aparece ao lado do tabuleiro sem esconder controles essenciais.
- Usa worker próprio, separado do singleton do aluno.
- Nova posição cancela análise antiga e descarta resposta obsoleta.
- Worker é liberado ao sair.
- Mostra avaliação da posição, mate quando aplicável e perspectiva claramente nomeada.
- Pode apoiar revisão, mas não escreve símbolo, resposta, comentário ou certificação
  automaticamente.
- Não substitui tablebase em final certificado.
- Opening Explorer é posterior.

## 24. Limites e desempenho

Limites iniciais:

- 2.000 lances por análise;
- 4.000 lances por aula;
- profundidade de 1.000 meios-lances;
- 2 MB por documento;
- 4.000 comentários;
- 4.000 desenhos.

Ao exceder, mostrar valor atual e limite; rascunho salva, publicação bloqueia. Metas:

- interação local p95 até 100 ms;
- abrir árvore de 1.000 nós até 2 s no notebook de referência;
- navegação sem rolagem horizontal;
- variantes profundas com recuo limitado e recolhimento;
- cache invalida somente descendentes/dependentes afetados.

Virtualização só entra se medição exigir. Benchmarks registram ambiente, tamanho,
mediana/p95 de abertura, navegação, edição, Undo, importação, derivação e salvamento.

## 25. Acessibilidade e acabamento

- Todo controle possui nome acessível.
- Foco visível e restaurado após diálogo.
- Ação de botão direito tem equivalente em botão/teclado.
- Arrastar tem equivalente no menu.
- Alvos têm tamanho confortável e não se sobrepõem.
- Estado não depende apenas de cor: seleção usa forma/texto/borda.
- Confirmação descreve consequência real.
- Mensagens são em português e dizem como corrigir.
- Modal prende foco, fecha com Esc e não deixa Tab passear pela tela atrás.
- Operações longas mostram progresso/cancelamento quando possível.
- Não declarar paridade do editor em celular; não quebrar o player responsivo.

## 26. Critérios de aceite por risco

Cada funcionalidade só fecha com evidência proporcional:

- **Estrutura:** IDs, alcance, ciclos, dois pais, referências e percursos.
- **Edição:** ação, Undo, Redo, autosave e reload.
- **Exclusão:** impacto real, cancelar, confirmar e recuperar.
- **Recuperação:** falha local, duas abas, conflito e cópia baixável.
- **PGN:** entradas independentes, perdas explícitas e round-trip suportado.
- **Pedagogia:** comentário versus narração, comparação, pausas e ambos os lados.
- **Treino:** respostas, erros, defensor, dica, término e autoria preservada.
- **Certificação:** tablebase/cache/exceção sem fabricar prova.
- **Progresso:** revisão antiga, retry, preview isolado e tentativa falsa recusada.
- **Publicação:** pacote consistente e interrupção recuperável.
- **Interface:** navegador real em 1366×768 e teste humano dos gestos.
- **Gate:** mutação para cada regra impeditiva nova e prova de que desligar a regra faz
  a mutação escapar.

Portões antes de cada commit de código:

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run validate:content
npm run validate:mutations
npm run repertorio:compilar -- --check
```

## 27. Roteiro obrigatório de entrega

Implementar em fatias completas, sem declarar todo o editor pronto ao terminar uma
tela:

1. adicionar aula/capítulo, montador e FEN;
2. concluir operações de capítulos e variantes;
3. completar ferramentas de desenho e edição contextual;
4. writer, URL e exportação nativa;
5. reprodução, pausas, velocidades e comparação;
6. autoria de treinos e defensor;
7. gate/publicação/progresso/migração;
8. repertório e aulas extras;
9. worker Stockfish;
10. desempenho, acessibilidade e teste de uso final.

Ao final de cada fatia:

1. atualizar `docs/MODO-EDITOR-ONDE-PARAMOS.md`;
2. registrar o que está pronto, parcial e aberto;
3. proteger aulas reais e usar fixture temporária;
4. executar portões pertinentes;
5. testar a interação real;
6. criar commit coerente;
7. fazer push somente quando solicitado.

## 28. Checklist mestre de conclusão

- [ ] Nova aula e aula extra pela tela.
- [ ] Introdução e quadros explicativos completos.
- [ ] Adicionar capítulo pelas cinco portas.
- [ ] Montar e editar posição completa.
- [ ] Referenciar posição/variante e duplicar independente.
- [ ] Renomear, reordenar e excluir capítulo com impacto.
- [ ] Jogar, promover, reordenar, substituir e excluir variantes.
- [ ] Menu de contexto e `•••` equivalentes.
- [ ] Comentário, símbolo, desenho e narração completos.
- [ ] Importar PGN por texto/arquivo e URL Lichess.
- [ ] Exportar variante, capítulo, aula PGN e pacote v2.
- [ ] Prévia real da aula, capítulo e daqui.
- [ ] Reprodução, pausa, repetição e três velocidades.
- [ ] Comparação com retorno à posição de escolha.
- [ ] Vários treinos por capítulo e por aula.
- [ ] Respostas corretas, alternativas, erros, feedback, dicas e término.
- [ ] Defensor determinístico e treino dos dois lados.
- [ ] Derivado/personalizado/independente e refazer com diff.
- [ ] Final certificado e linha autoral julgados corretamente.
- [ ] Práticas avaliativas configuráveis e versionadas.
- [ ] Metadados, proveniência e exceções editáveis com segurança.
- [ ] Fluxo completo de introdução, capítulos, treinos e práticas.
- [ ] Problemas localizados e corrigíveis pela tela.
- [ ] Publicação atômica, snapshots e recuperação.
- [ ] Progresso por revisão e rejulgamento no servidor.
- [ ] Migração v1 explícita e conteúdo antigo preservado.
- [ ] Repertório editado pela fonte PGN e compilação coerente.
- [ ] Barra Stockfish isolada do motor do aluno.
- [ ] Limites e metas de desempenho comprovados.
- [ ] Acessibilidade e teste humano final aprovados.

Este checklist mede o plano completo. Marcar um item exige atualizar o diário com a
evidência; existência de código parcial ou de um botão sem o caminho completo não basta.
