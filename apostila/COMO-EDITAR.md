# Como editar os cadernos

Este guia é para o Doug. Não precisa saber programar.

## O básico

Cada caderno é **um arquivo de texto**: `apostila/caderno-1.md`. Você abre no
Bloco de Notas (ou em qualquer editor), muda o que quiser, salva, e roda um
comando para gerar o PDF novo.

```
npm run apostila:ver 1
```

Isso refaz o `caderno-1.pdf` **e abre ele na sua tela**. Leva uns 15 segundos.
Se não quiser que abra sozinho, use `npm run apostila 1`.

Se você errar alguma coisa na escrita, o comando **não gera o PDF** — ele diz o
que está errado e **em que linha**. Por exemplo:

```
caderno, linha 212: não conheço o comando "@exercicio"
```

Aí é só abrir o arquivo, ir na linha 212 e arrumar.

## Escrevendo texto

Escreva normalmente. Uma linha em branco separa um parágrafo do outro.

```
Este é um parágrafo. Pode ocupar
várias linhas no arquivo, que na hora de
imprimir elas viram um parágrafo só.

Este é outro parágrafo.
```

Para dar ênfase:

- `**assim**` sai em **negrito**
- `*assim*` sai em *itálico*

## Títulos

```
# Um título de seção
## Um subtítulo dentro da seção
```

O `#` é o título grande, com a linha embaixo. O `##` é o subtítulo. Cada `#`
começa uma seção nova.

## Listas

```
- primeiro item
- segundo item

1. primeiro item numerado
2. segundo item numerado
```

## A caixa em destaque

É a caixinha com a barra preta do lado. Ela sempre começa com um rótulo em
negrito:

```
> **Cuidado:** xeque não é mate.
```

## Os comandos especiais

São linhas que começam com `@`. Cada uma sozinha na sua linha.

| Comando | O que faz |
|---|---|
| `@folha` | Daqui em diante, começa numa folha nova |
| `@tema mateIn1` | Puxa a lista "o que procurar" daquele tema, a mesma do site |
| `@tema mateIn1 completo` | Idem, mas com a explicação inteira junto |
| `@exercicios mateIn1 9 \| Ache o mate em 1.` | Põe 9 problemas daquele tema, com o enunciado depois da barra |
| `@planilha 50` | Uma planilha de anotação em branco, com 50 lances |
| `@tarefas 1` | A lista de tarefas da semana 1, a mesma do painel do site |
| `@gabarito` | As respostas de **todos** os exercícios do caderno, numeradas |
| `@diagrama <posição> \| Brancas jogam. \| legenda` | Um diagrama específico, para ilustrar |

### Sobre `@exercicios`

O formato é: `@exercicios` + o nome do tema + quantos + `|` + o que se pede.

```
@exercicios backRankMate 6 | Ache o mate no corredor.
```

**Quer mais exercícios?** Só aumentar o número. **Quer menos?** Só diminuir.
Os problemas vêm do mesmo banco que o site usa, e são sempre os mesmos — dois
PDFs gerados do mesmo arquivo saem idênticos.

Os nomes dos temas são os do site. Os do caderno 1 são: `mateIn1`, `mateIn2`,
`hangingPiece`, `backRankMate`, `smotheredMate`, `arabianMate`, `anastasiaMate`,
`hookMate`. A lista completa está em `lib/tatica/blocos.ts`.

### Sobre `@gabarito`

As respostas são **calculadas**, não digitadas. Você não precisa (nem deve)
escrever gabarito à mão: quem responde é o mesmo banco de problemas que o site
usa, traduzido para a notação portuguesa (R, D, T, B, C). Se você mudar a
quantidade de exercícios, o gabarito se ajusta sozinho.

## O cabeçalho

As seis primeiras linhas do arquivo, entre os dois `---`, são o que sai na capa:

```
---
numero: 1
titulo: Como funciona o torneio e como eu penso
sabado: Sábado 1 · 12 de setembro de 2026
subtitulo: As regras que pegam em torneio...
---
```

O `numero` tem de bater com o nome do arquivo: `caderno-1.md` tem `numero: 1`.

## Fazendo um caderno novo

Copie o `caderno-1.md`, salve como `caderno-2.md`, troque o cabeçalho e o
conteúdo, e rode `npm run apostila:ver 2`. Não precisa mexer em mais nada.

## Se quiser mudar o visual

O tamanho da letra, das margens, dos diagramas e tudo o mais está em
`apostila/impressao.css`. Cada decisão ali está explicada em comentário, com o
motivo e o número que a justifica — inclusive as que **não** devem ser mexidas
sem medir de novo (o tamanho da letra e o do diagrama são as duas).

Se mudar alguma coisa lá, vale rodar depois:

```
npm run apostila:conferir 1
```

Ele recorta pedaços do caderno em imagem, no tamanho real de impressão, para
conferir se ainda está legível.
