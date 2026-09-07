"""Acha o tabuleiro numa página de livro digitalizada e recorta só ele.

Uso:
    python scripts/recortar-diagrama.py <pagina.png> <saida-prefixo> [--lado 900]

## Por que este script existe

As posições de livro do Bloco 3 são reconstruídas pelos lances impressos, e
nessa via a chess.js confere cada lance. Para os conceitos cujo acervo não tinha
partida com o traço não sobrou alternativa a ler o diagrama em imagem — e aí a
primeira tentativa falhou por um motivo que não era o método: a página inteira,
depois de reduzida para caber no leitor, deixa cada casa com ~20 pixels. Duas
leituras independentes recusaram transcrever, e as duas estavam certas.

O conserto é recortar. Um tabuleiro sozinho, ocupando o quadro inteiro, chega ao
leitor com ~100 pixels por casa em vez de 20.

## Como ele acha o tabuleiro

A moldura de um diagrama impresso é a coisa mais escura e mais reta da página:
duas linhas horizontais longas e duas verticais, formando um quadrado. O script
conta pixels escuros por linha e por coluna, procura os picos que atravessam boa
parte da largura, e fica com os pares que formam uma região aproximadamente
quadrada. Não adivinha coordenada nenhuma — se não achar quadrado, diz que não
achou, e aí o recorte é manual.
"""
import sys
from PIL import Image

caminho = sys.argv[1]
prefixo = sys.argv[2]
LADO = int(sys.argv[sys.argv.index("--lado") + 1]) if "--lado" in sys.argv else 900

im = Image.open(caminho).convert("L")
L, A = im.size
px = im.load()

# Binariza num limiar generoso: a tinta de uma varredura antiga raramente é preta.
LIMIAR = 140
escuro = [[1 if px[x, y] < LIMIAR else 0 for x in range(L)] for y in range(A)]

def corrida(seq):
    """A maior sequência contínua de pixels escuros — não a soma deles.

    É a diferença entre uma **linha** e uma coluna de texto: as duas somam
    muito, e só a linha é contínua. Somar foi a primeira tentativa, e ela achou
    o bloco de texto inteiro em vez da moldura do diagrama."""
    maior = 0
    atual = 0
    for v in seq:
        atual = atual + 1 if v else 0
        if atual > maior:
            maior = atual
    return maior


# A moldura de um diagrama impresso tem umas 1,5 polegada de lado; a 400 dpi
# isso é ~600 px. Exigir 400 deixa margem para varredura torta e borda fina.
MINIMO = 400

linhas = [corrida(escuro[y]) for y in range(A)]
colunas = [corrida([escuro[y][x] for y in range(A)]) for x in range(L)]


def picos(contagem, minimo):
    """Os índices em que a corrida passa do mínimo, agrupados em faixas."""
    faixas = []
    dentro = None
    for i, n in enumerate(contagem):
        if n >= minimo and dentro is None:
            dentro = i
        elif n < minimo and dentro is not None:
            faixas.append((dentro, i - 1))
            dentro = None
    if dentro is not None:
        faixas.append((dentro, len(contagem) - 1))
    return faixas


hs = picos(linhas, MINIMO)
vs = picos(colunas, MINIMO)
print(f"linhas horizontais longas: {len(hs)} · verticais: {len(vs)}")

achados = []
for i, (y0, _) in enumerate(hs):
    for (y1, _) in hs[i + 1:]:
        alto = y1 - y0
        if alto < 300 or alto > 1400:
            continue
        for j, (x0, _) in enumerate(vs):
            for (x1, _) in vs[j + 1:]:
                largo = x1 - x0
                if largo < 300 or largo > 1400:
                    continue
                if abs(largo - alto) / max(largo, alto) > 0.12:
                    continue
                achados.append((largo * alto, x0, y0, x1, y1))

achados.sort(reverse=True)
vistos = []
for area, x0, y0, x1, y1 in achados:
    if any(abs(x0 - a) < 120 and abs(y0 - b) < 120 for a, b in vistos):
        continue
    vistos.append((x0, y0))
    margem = int((x1 - x0) * 0.04)
    corte = im.crop((max(0, x0 - margem), max(0, y0 - margem), min(L, x1 + margem), min(A, y1 + margem)))
    corte = corte.resize((LADO, LADO), Image.LANCZOS)
    nome = f"{prefixo}-{len(vistos)}.png"
    corte.save(nome)
    print(f"{nome}  ({x1 - x0}x{y1 - y0} px na página, ~{(x1 - x0) // 8} px por casa antes de ampliar)")
    if len(vistos) >= 3:
        break

if not vistos:
    print("nenhum quadrado com cara de tabuleiro nesta página")
