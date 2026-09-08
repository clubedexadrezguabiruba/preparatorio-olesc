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

## A troca de arte em 9/9/2026, e o recorte escolhido entre três

A segunda arte (`Untitled design.png`, 1020×1611) é uma ilustração vetorial já
pensada como avatar de busto — terno cinza, gravata com peças de xadrez, e um
broche do clube na lapela —, e não uma foto de corpo inteiro como a primeira. O
fundo branco sai do mesmo jeito (componente conexo, ver abaixo).

**A figura não encosta em borda lateral nenhuma**, diferente da primeira arte:
o paletó se abre num alargamento largo — quase uma capa — que chega a 959 px de
largura por volta de y=1140, e depois **afunila até uma ponta** perto do
rodapé (y≈1446), um fecho decorativo sem conteúdo anatômico. Recortar até esse
ponto reproduziria o defeito que a troca de arte veio resolver: numa miniatura
de 112 px o alargamento vira uma mancha cinza triangular sem sentido.

Três recortes foram testados numa folha de contato, cada um redimensionado para
os 112 px de exibição, e julgados por uma segunda leitura:

- **Rente ao pescoço** (até y≈1010, onde a largura afunila antes do paletó
  abrir): o rosto sai ótimo, mas o corte no cabelo e a quase ausência de
  paletó leem como "recorte de emergência".
- **A figura inteira** (até y≈1446, com a capa e a ponta): reintroduz a mancha
  triangular acima.
- **O ombro largo, antes do pico do alargamento** (até y=1150): cabeça,
  pescoço e ombros com folga nos dois lados, sem cortar o cabelo e sem entrar
  no trecho em que o paletó vira capa. **Este é o escolhido**, e continua
  sendo depois de duas voltas atrás: uma tentativa de descer o corte para
  caber o broche da lapela (9/9/2026) deixou o avatar largo demais, e o Doug
  pediu para voltar a este.

O corte final é `(31, 124)–(1014, 1150)`, 983×1026 — quase quadrado (razão
1,04), com margem de 12 px em volta do que a figura ocupa naquele intervalo, e
não escolhido a olho. O que sobra embaixo é uma linha reta na altura do
alargamento do paletó, e ela **não fica reta**: os últimos 12% da altura
recebem uma rampa de alfa, e o busto dissolve no painel em vez de terminar com
um corte.

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

`public/professor-v1.webp`, 360 px de largura — o dobro da maior exibição
(~180 px, no painel de fim). Ao lado do comentário ele aparece com ~112 px, que
é a escala em que o treinador do chess.com aparece na aula deles.

O nome carrega a versão (`-v1`) porque é a doutrina de cache do
`next.config.ts`: trocar os bytes exige trocar o nome.
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
# O busto: o recorte escolhido entre três candidatos na folha de contato — ver
# "A troca de arte em 9/9/2026" acima. Cada um destes quatro números foi medido
# na arte.
BUSTO = (31, 124, 1014, 1150)
# Quanto da altura do busto dissolve no pé, para o corte reto do ombro não
# terminar em linha seca. Medido na primeira arte (8/9/2026): 0,06 dava só 6 px
# de rampa a 96 px de exibição e o corte continuava lendo como linha; 0,12 é o
# que passa a dissolver de verdade sem comer o ombro.
DISSOLVE = 0.12
LARGURA = 360


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
    """Uma rampa de alfa no pé, para o corte dos ombros não terminar em linha reta."""
    dados = np.asarray(imagem).astype(np.float64).copy()
    altura = dados.shape[0]
    quantas = max(1, int(round(altura * fracao)))
    # `linspace` de 1 a 0 ao longo das últimas linhas, aplicado sobre o alfa que
    # já existe — o contorno do desenho continua mandando onde há figura.
    rampa = np.linspace(1.0, 0.0, quantas)[:, None]
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

    altura = round(LARGURA * busto.size[1] / busto.size[0])
    busto = busto.resize((LARGURA, altura), Image.LANCZOS)

    caminho = SAIDA / "professor-v1.webp"
    busto.save(caminho, "WEBP", quality=92, method=6, exact=False)
    kb = caminho.stat().st_size / 1024
    print(f"  professor-v1.webp: {busto.size[0]}×{busto.size[1]}, {kb:.1f} KB")


if __name__ == "__main__":
    main()
