"""O retrato do professor, a partir do PNG original.

    python scripts/professor.py "C:/Users/Lenovo/Downloads/Untitled design.png"

## Por que existe um script, e por que ele é Python

Este é o **primeiro asset de imagem versionado do projeto** — até 8/9/2026 não
havia nenhum PNG, JPG ou avatar em lugar nenhum. Um raster que entra no
repositório sem o caminho de volta é um arquivo que ninguém consegue regerar
quando a arte mudar; então o caminho de volta é este arquivo, e ele é Python
porque o Pillow é a ferramenta de recorte que já existe nesta máquina.

Ele **não** roda em `npm run`, e é de propósito: nada do site depende dele em
tempo de build. É ferramenta de mão, executada quando a arte muda.

## Um busto solto, e não uma cabeça num balãozinho

A primeira versão recortava um quadrado do rosto e o punha num círculo com aro
e fundo próprio. Foi recusada na tela, e a recusa está certa: o círculo tem
outra cor que a do painel, o aro desenha um contorno, e o resultado lê como
**uma foto colada** em vez de alguém que está ali.

O molde é o treinador do chess.com, visto na aula "Espetos": ele aparece
**inteiro dentro do quadro** — cabeça, pescoço e o começo do tronco —, sem
moldura, sem disco de fundo e sem aro. O que faz o desenho pertencer à cena é
justamente não ter borda nenhuma: o alfa encosta direto no painel.

## A troca de arte em 9/9/2026, e o recorte que finalmente mostra o terno

A segunda arte (`Untitled design.png`, 1020×1611) é uma ilustração vetorial já
pensada como avatar de busto — terno cinza, camisa, gravata e um broche teal do
clube na lapela —, e não uma foto de corpo inteiro como a primeira. O fundo
branco sai do mesmo jeito (componente conexo, ver abaixo).

**A figura não encosta em borda lateral nenhuma**, diferente da primeira arte.
Medida linha a linha: a cabeça começa em y=124, o pescoço afunila em y≈924
(373 px de largura), o paletó abre e chega ao **pico de 957 px em y=1150**,
depois estreita de volta até uma ponta em y≈1446 — um fecho decorativo sem
conteúdo anatômico. O broche do clube fica em `x 706..765, y 1236..1327`.

### O defeito que este recorte veio corrigir

O corte anterior era `(31, 124, 1014, 1150)` com rampa de alfa de 0,12. Ele
continha o começo do paletó, mas **a rampa começava exatamente onde o terno
começava**: medido no WebP que ele gerava, o alfa máximo era 0,85 em y≈1052 e
0,36 em y≈1106. O terno estava lá e não aparecia. Na miniatura de 112 px o
resultado era uma cabeça flutuando sobre um véu claro.

### Por que a largura é 760, e por que o pé desce até o fim da figura

Ir mais fundo com a largura cheia (`31..1014`) é a armadilha: com papel sobrando
dos dois lados na altura do ombro, a silhueta **incha e volta a estreitar dentro
do quadro**, e a 112 px isso vira uma mancha triangular tipo capa.

O que resolve é **estreitar o quadro** até o paletó sair pelas laterais. Em
`x 140..900` o pico de y=1150 (que vai de x=44 a x=1000) é cortado com folga nos
dois lados, e o cinza atravessa a moldura em vez de fechar dentro dela — o corpo
lê como "continua fora do quadro", que é o que o treinador do chess.com faz. É o
mesmo motivo de o alfa encostar no painel: o que integra a figura à cena é ela
não ter contorno próprio. De quebra, quadro estreito é figura ampliada: a cabeça
sai com 88 px de largura contra os 73 que um recorte de 920 daria.

**E o pé desce até y=1450, que é abaixo da ponta em que a figura acaba
sozinha (y≈1446).** Um recorte que para antes disso precisa de rampa de alfa
para o corte não virar linha, e uma rampa larga o bastante para funcionar
**clareia o terno** — ver `DISSOLVE`, e a razão inteira está lá. Descendo até o
fim não há corte no desenho e não há nada a disfarçar.

O corte final é `(140, 112, 900, 1450)`, 760×1338 — retrato, razão 0,57, que a
112 px de largura dá **197 px de altura**. Nele o paletó tem cinza cheio até
embaixo, a lapela em V e o colarinho branco dão estrutura, e o broche teal lê
como ponto de cor.

## O pin do clube, e o que ele não entrega

O broche na lapela é, medido: um cavalo em mosaico de quadradinhos teal (~81 px
de largura na arte, uns 10 ladrilhos de 7 a 9 px) e, abaixo dele, uma tarja com
o wordmark **"Clube de Xadrez"** em serifa versalete.

**O wordmark não é legível, e não há recorte que resolva.** A altura de
caixa-alta dele é ~8,6 px na arte-mãe e o traço fino da serifa fica **abaixo de
1,5 px** — abaixo de 1,5 px o traço não sobrevive à rasterização: vira cinza, e
não linha. A arte é raster, não vetor, então ampliar não recupera o que não foi
escrito. Os patamares, medidos:

| Largura do pin na tela | O que o aluno vê |
| --- | --- |
| ~28 px (é o do painel, a 112 px) | "uma peça de xadrez azul" |
| ~45–60 px | reconhece que é um **cavalo** |
| ~95 px (a arte em 1:1, o teto) | o mosaico, e uma tarja escura texturizada |
| ~130–150 px | só aqui ele **leria** "Clube de Xadrez" — e não existe |

Por isso `professor-inteiro-v1.webp` sai em resolução **nativa** (983×1346) e
sem reamostragem: é literalmente tudo o que a arte tem. Conferido na tela, num
navegador de 1440×900 o pin fica com **31 px** — o cavalo se reconhece, a
plaquinha lê como borrão claro. Para o texto ser lido seria preciso outra coisa
— uma exportação da arte em resolução maior, ou o logotipo do clube entrando
como elemento próprio (ele existe em 4149×4160, fora do repositório).

## O fundo, e a armadilha do limiar

O original tem fundo **branco puro**, sólido, sem canal alfa. Sobre o papel do
site (`#ebf0ec`, um cinza esverdeado) um retângulo branco puro apareceria como
a mancha mais clara da tela inteira. Ele tem de sair.

**O recorte não pode ser por limiar global de branco.** A esclera dos olhos, o
brilho dos dentes e o branco da gravata também passam de 235 em todos os
canais: um limiar simples **fura os olhos** do desenho. Por isso o fundo é
achado por **componente conexo** — o branco que encosta na borda da imagem é
fundo; o branco cercado de traço escuro é olho, dente ou detalhe do desenho, e
fica. O script imprime quantas ilhas brancas internas preservou, que é a prova
de que os olhos sobreviveram.

A borda vetorial é limpa e o cabelo é massa sólida, sem fios soltos: o contorno
é complexo em forma e trivial em opacidade. Uma faixa de 2 px junto ao fundo
recebe alfa proporcional (o serrilhado do original) e tem a cor
"descontaminada" do branco que a compunha — sem isso, o retrato ganharia uma
auréola clara no dia em que o tema escuro voltar.

## O arquivo

`public/professor-v3.webp`, 360 px de largura — o dobro da maior exibição
(~180 px, no painel de fim). Ao lado do comentário ele aparece com ~112 px, que
é a escala em que o treinador do chess.com aparece na aula deles.

O nome carrega a versão porque é a doutrina de cache do `next.config.ts`
(`immutable`, um ano): **trocar os bytes exige trocar o nome.**

**E o número pulou o 2 porque a doutrina foi violada e cobrou na hora.** Durante
esta troca de arte o `-v2` foi gerado três vezes com recortes diferentes e o
mesmo nome; o navegador continuou servindo os primeiros bytes, e o retrato com o
véu que já tinha sido corrigido continuava na tela — inclusive medido: o `<img>`
anunciava a razão nova (360×634) e o layout usava a antiga (360×498), porque
`h-auto` segue o bitmap carregado, não o atributo. O `-v2` está queimado nos
caches que o viram. Regra prática para a próxima arte: **um número novo por
tentativa que chega ao navegador**, não um por arte.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "public"

# Um pixel é "quase branco" quando o canal mais escuro dele passa disto. 248
# deixa de fora o tom de pele mais claro do desenho com folga, e ainda pega o
# serrilhado do fundo.
LIMIAR = 248
# A faixa junto ao fundo que ganha alfa proporcional, em pixels.
SUAVIZACAO = 2
# O busto: o recorte escolhido na folha de contato — ver "A troca de arte em
# 9/9/2026" acima. Cada um destes quatro números foi medido na arte, e a largura
# estreita (760, contra os 959 que a figura chega a ocupar) é o que corta o
# paletó nas laterais em vez de deixá-lo fechar dentro do quadro.
BUSTO = (140, 112, 900, 1450)
# Quanto da altura do busto dissolve no pé. **Zero, e isso é uma correção.**
#
# A rampa existia para o corte de baixo não terminar em linha reta, e na arte
# antiga — em que o corte caía no meio de uma faixa larga de paletó — ela era o
# certo. Neste recorte ela virou o defeito: sobre o papel claro, baixar o alfa
# do cinza do terno **clareia** o cinza, e o Doug leu na tela exatamente isso,
# "uma camada branca por cima do terno, como se estivesse fadeaway". Não era
# ilusão nem banda de Mach: é o que a rampa faz, e neste corte ela come o terno
# inteiro em vez de só a borda.
#
# O que a substitui não é uma rampa melhor — é um corte que não precisa de
# rampa. `BUSTO` desce até y=1450, que é **abaixo da ponta em que a figura
# termina sozinha** (y≈1446): não há corte no desenho, então não há linha para
# disfarçar. A constante fica, com valor 0, porque é o parâmetro que documenta a
# decisão; `dissolver_o_pe` devolve a imagem intacta quando ela é zero.
DISSOLVE = 0.0
LARGURA = 360
# O retrato de perto, que o aluno abre clicando no professor. Sai na resolução
# NATIVA, sem reamostrar nada — ver "O pin do clube, e o que ele não entrega".
#
# **E o recorte é OUTRO: a figura inteira, sem cortar ombro nenhum.** O do
# painel é estreito de propósito, para o paletó sair pelas laterais e não virar
# mancha de capa a 112 px. Solto dentro de um cartão de diálogo, esse mesmo
# corte lê como defeito: a figura encosta na borda e o ombro parece decepado.
#
# Trocar de recorte **não custa nada ao pin**, e isso é aritmética, não gosto: o
# pin na tela vale `59 × altura_exibida / altura_do_recorte`, e a largura não
# entra na conta. 1338 px de recorte estreito dão 31,0 px de pin a 702 px de
# altura; 1346 px de figura inteira dão 30,8. A diferença é meio pixel.
#
# A caixa é a da figura (`x 43..1002`, `y 124..1446`, medida) com 12 px de
# margem em volta — inclusive em cima, diferente do recorte do painel, onde a
# cabeça encosta no topo.
INTEIRO = (31, 112, 1014, 1458)


def sem_fundo(imagem: Image.Image) -> Image.Image:
    """O PNG com alfa, com o branco de fora removido e os brancos de dentro não."""
    rgb = np.asarray(imagem.convert("RGB")).astype(np.int16)
    canal_mais_escuro = rgb.min(axis=2)
    quase_branco = canal_mais_escuro >= LIMIAR

    # Componentes conexos do branco. O que encosta na borda da imagem é fundo;
    # o resto é olho, dente ou brilho, e fica opaco.
    rotulos, quantos = ndimage.label(quase_branco)
    da_borda = set(rotulos[0, :]) | set(rotulos[-1, :]) | set(rotulos[:, 0]) | set(rotulos[:, -1])
    da_borda.discard(0)
    fundo = np.isin(rotulos, list(da_borda))

    internas = quantos - len(da_borda)
    print(f"  ilhas brancas: {quantos} no total, {len(da_borda)} de fundo, {internas} preservadas")
    print(f"  fundo removido: {100 * fundo.mean():.1f}% da área")

    alfa = np.where(fundo, 0.0, 1.0)

    # A faixa de serrilhado: alfa proporcional a quão longe do branco o pixel
    # está. Um pixel de fundo puro dá 0; um a 24 níveis de distância dá 1.
    perto = ndimage.binary_dilation(fundo, iterations=SUAVIZACAO) & ~fundo
    rampa = np.clip((LIMIAR - canal_mais_escuro) / 24.0, 0.0, 1.0)
    alfa = np.where(perto, rampa, alfa)

    # Descontaminação: o pixel da faixa é uma mistura da cor real com o branco
    # do fundo. Desfazer a mistura é o que impede a auréola clara sobre
    # superfície escura. `C = (Cobs - (1-a)*255) / a`, com o alfa baixo demais
    # deixado como está (ali a cor não é vista de qualquer jeito).
    limpo = rgb.astype(np.float64)
    vale = perto & (alfa > 0.15)
    a3 = alfa[..., None]
    limpo = np.where(vale[..., None], (limpo - (1 - a3) * 255.0) / np.maximum(a3, 1e-6), limpo)

    rgba = np.dstack([np.clip(limpo, 0, 255), alfa * 255.0]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def dissolver_o_pe(imagem: Image.Image, fracao: float) -> Image.Image:
    """Uma rampa de alfa no pé, para um corte de ombro não terminar em linha reta.

    **Hoje `DISSOLVE` é 0 e esta função é passagem** — o recorte atual desce
    abaixo da ponta em que a figura acaba sozinha, então não há corte a
    disfarçar. Ela fica porque o parâmetro é o que documenta a escolha, e porque
    uma arte futura que corte no meio do tronco vai precisar dela de novo.

    Quando ligada, a rampa é `smoothstep` e não uma reta: uma reta tem
    inclinação zero acima e −1/n dentro, e o degrau de inclinação no pixel em
    que ela começa é lido como borda. `1 − (3t² − 2t³)` entra e sai com
    inclinação zero.

    O aviso, para quem for religá-la: **sobre papel claro, baixar o alfa de uma
    superfície escura clareia a superfície.** Numa faixa larga de tecido isso não
    lê como dissolver, lê como véu branco por cima. Rampa serve para desmanchar
    uma *borda*, não um *terço da figura*.
    """
    if fracao <= 0:
        return imagem
    dados = np.asarray(imagem).astype(np.float64).copy()
    altura = dados.shape[0]
    quantas = max(1, int(round(altura * fracao)))
    t = np.linspace(0.0, 1.0, quantas)
    rampa = (1.0 - (3 * t**2 - 2 * t**3))[:, None]
    # Aplicada sobre o alfa que já existe — o contorno do desenho continua
    # mandando onde há figura.
    dados[altura - quantas :, :, 3] *= rampa
    return Image.fromarray(dados.astype(np.uint8), "RGBA")


def main() -> None:
    # O console do Windows abre em cp1252, e o relatório tem seta e multiplicação.
    sys.stdout.reconfigure(encoding="utf-8")
    origem = Path(sys.argv[1] if len(sys.argv) > 1 else RAIZ / "prof Douglas.png")
    if not origem.exists():
        sys.exit(f"não achei a arte de origem em {origem}")

    original = Image.open(origem)
    print(f"origem: {origem.name}, {original.size[0]}×{original.size[1]}, {original.mode}")
    cheio = sem_fundo(original)

    busto = cheio.crop(BUSTO)
    print(f"  busto: {busto.size[0]}×{busto.size[1]} a partir de ({BUSTO[0]}, {BUSTO[1]})")
    busto = dissolver_o_pe(busto, DISSOLVE)

    # O de perto é a figura inteira, em resolução nativa, e sai do `cheio` — não
    # do busto: ele tem outro recorte e não leva a rampa do pé.
    perto = cheio.crop(INTEIRO)
    caminho_perto = SAIDA / "professor-inteiro-v1.webp"
    perto.save(caminho_perto, "WEBP", quality=94, method=6, exact=False)
    kb = caminho_perto.stat().st_size / 1024
    print(f"  professor-inteiro-v1.webp: {perto.size[0]}×{perto.size[1]}, {kb:.1f} KB")

    altura = round(LARGURA * busto.size[1] / busto.size[0])
    busto = busto.resize((LARGURA, altura), Image.LANCZOS)

    caminho = SAIDA / "professor-v3.webp"
    busto.save(caminho, "WEBP", quality=92, method=6, exact=False)
    kb = caminho.stat().st_size / 1024
    print(f"  professor-v3.webp: {busto.size[0]}×{busto.size[1]}, {kb:.1f} KB")


if __name__ == "__main__":
    main()
