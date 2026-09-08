# -*- coding: utf-8 -*-
"""Recorta os diagramas de uma página de PDF, um arquivo PNG por diagrama.

Existe por causa do passo F.2 do pipeline de meio-jogo: quem transcreve um
capítulo do Yusupov precisa ler a FEN de um diagrama, e a página inteira,
reduzida ao que um modelo enxerga, dá uns 30 pixels por casa — pouco para
distinguir um bispo de um peão. Recortado, cada diagrama chega com 500 a 900
pixels de lado, e a leitura para de ser adivinhação.

O recorte não é um grid fixo: o script **acha** os tabuleiros. Um diagrama de
xadrez impresso é a única coisa numa página de livro que é ao mesmo tempo
quadrada, grande e cheia de tinta. O algoritmo é isto, e nada mais:

1. renderiza a página em tons de cinza e trabalha numa cópia pequena (rápida);
2. binariza (tinta = escuro) e engorda a tinta, para o tabuleiro virar um bloco
   só em vez de sessenta e quatro casas soltas;
3. acha as manchas conexas com uma união-e-busca escrita aqui — nada de
   dependência nova, só a `PIL` e o `numpy` que o projeto já tem;
4. fica com as manchas grandes e de proporção quase 1:1;
5. ordena por linha e depois por coluna — a ordem de leitura do livro, que é a
   ordem em que os exercícios são numerados;
6. salva cada uma na resolução cheia, com margem folgada, porque o rótulo
   (`Ex. 3-1`), as estrelas de dificuldade e o glifo de quem joga ficam **fora**
   da moldura do tabuleiro.

Uso:

    python scripts/recortar-diagramas.py <pdf> <pagina> <pasta-de-saida> [--dpi 300]

Escreve `<pasta>/p<pagina>-full.png` (a página inteira, reduzida, para ler os
rótulos) e `<pasta>/p<pagina>-d1.png` … `-dN.png` (um por diagrama, na ordem de
leitura), e imprime uma linha por arquivo com a caixa medida.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageFilter

# Um diagrama ocupa uma fração generosa da página. Estes números são a única
# calibração do script, e são frouxos de propósito: o que descarta o resto é a
# proporção quadrada, não o tamanho.
FRACAO_MINIMA_DA_LARGURA = 0.16   # menor lado aceitável, em fração da largura da página
FRACAO_MAXIMA_DA_LARGURA = 0.80
PROPORCAO_TOLERADA = 0.28         # |largura/altura - 1| máximo
MARGEM = 0.13                     # folga em volta do recorte, em fração do lado
LARGURA_DE_TRABALHO = 520         # a cópia pequena onde as manchas são achadas
LIMIAR_DE_TINTA = 190             # abaixo disto é tinta; moldura fina é cinza médio


def renderiza(pdf: str, pagina: int, dpi: int, destino: str) -> str:
    """Roda o pdftoppm e devolve o caminho do PNG da página."""
    prefixo = os.path.join(destino, "pagina")
    subprocess.run(
        ["pdftoppm", "-png", "-r", str(dpi), "-f", str(pagina), "-l", str(pagina),
         "-gray", pdf, prefixo],
        check=True,
    )
    achados = sorted(f for f in os.listdir(destino) if f.startswith("pagina") and f.endswith(".png"))
    if not achados:
        raise SystemExit(f"pdftoppm não gerou nada para a página {pagina} de {pdf}")
    return os.path.join(destino, achados[0])


def manchas(binaria: np.ndarray) -> dict[int, tuple[int, int, int, int]]:
    """Componentes conexas de 4 vizinhos, por união-e-busca em duas passadas.

    Devolve `{rótulo: (x0, y0, x1, y1)}`, com `x1`/`y1` exclusivos. Escrita à
    mão para não trazer a `scipy` só por causa de um `label()`.
    """
    altura, largura = binaria.shape
    rotulos = np.zeros((altura, largura), dtype=np.int32)
    pai: list[int] = [0]  # pai[0] não é usado; rótulos começam em 1

    def raiz(a: int) -> int:
        while pai[a] != a:
            pai[a] = pai[pai[a]]
            a = pai[a]
        return a

    def une(a: int, b: int) -> None:
        ra, rb = raiz(a), raiz(b)
        if ra != rb:
            pai[max(ra, rb)] = min(ra, rb)

    proximo = 1
    for y in range(altura):
        linha = binaria[y]
        for x in range(largura):
            if not linha[x]:
                continue
            acima = rotulos[y - 1, x] if y > 0 else 0
            esquerda = rotulos[y, x - 1] if x > 0 else 0
            if acima and esquerda:
                rotulos[y, x] = min(acima, esquerda)
                une(acima, esquerda)
            elif acima:
                rotulos[y, x] = acima
            elif esquerda:
                rotulos[y, x] = esquerda
            else:
                rotulos[y, x] = proximo
                pai.append(proximo)
                proximo += 1

    caixas: dict[int, list[int]] = {}
    ys, xs = np.nonzero(rotulos)
    for y, x in zip(ys.tolist(), xs.tolist()):
        r = raiz(int(rotulos[y, x]))
        c = caixas.get(r)
        if c is None:
            caixas[r] = [x, y, x + 1, y + 1]
        else:
            if x < c[0]:
                c[0] = x
            if y < c[1]:
                c[1] = y
            if x + 1 > c[2]:
                c[2] = x + 1
            if y + 1 > c[3]:
                c[3] = y + 1
    return {r: (c[0], c[1], c[2], c[3]) for r, c in caixas.items()}


def caixas_dos_diagramas(pagina: Image.Image) -> list[tuple[int, int, int, int]]:
    """As caixas dos tabuleiros na resolução da página, na ordem de leitura."""
    largura, altura = pagina.size
    escala = largura / LARGURA_DE_TRABALHO
    pequena = pagina.resize(
        (LARGURA_DE_TRABALHO, max(1, int(altura / escala))), Image.LANCZOS
    )
    # Binariza e engorda: sem o MaxFilter cada casa do tabuleiro é uma mancha.
    tinta = pequena.point(lambda v: 255 if v < LIMIAR_DE_TINTA else 0)
    tinta = tinta.filter(ImageFilter.MaxFilter(5))
    matriz = np.array(tinta) > 127

    lp, ap = pequena.size
    minimo = FRACAO_MINIMA_DA_LARGURA * lp
    maximo = FRACAO_MAXIMA_DA_LARGURA * lp

    encontradas: list[tuple[int, int, int, int]] = []
    for x0, y0, x1, y1 in manchas(matriz).values():
        w, h = x1 - x0, y1 - y0
        if not (minimo <= w <= maximo) or not (minimo <= h <= maximo):
            continue
        if abs(w / h - 1.0) > PROPORCAO_TOLERADA:
            continue
        encontradas.append((x0, y0, x1, y1))

    if not encontradas:
        return []

    # Ordem de leitura: agrupa por faixa horizontal (os diagramas que estão na
    # mesma "linha" da página) e, dentro dela, da esquerda para a direita.
    altura_media = sum(y1 - y0 for _, y0, _, y1 in encontradas) / len(encontradas)
    encontradas.sort(key=lambda c: (round(c[1] / (altura_media * 0.6)), c[0]))

    return [
        (int(x0 * escala), int(y0 * escala), int(x1 * escala), int(y1 * escala))
        for x0, y0, x1, y1 in encontradas
    ]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("pdf")
    p.add_argument("pagina", type=int)
    p.add_argument("saida")
    p.add_argument("--dpi", type=int, default=300)
    args = p.parse_args()

    os.makedirs(args.saida, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        pagina = Image.open(renderiza(args.pdf, args.pagina, args.dpi, tmp)).convert("L")

        inteira = os.path.join(args.saida, f"p{args.pagina}-full.png")
        # A página inteira só serve para ler rótulo e glifo: 1400 px bastam e
        # custam menos contexto que o original de 300 dpi.
        copia = pagina.copy()
        copia.thumbnail((1400, 1400))
        copia.save(inteira)
        print(f"{inteira}\tpagina {pagina.size[0]}x{pagina.size[1]} -> {copia.size[0]}x{copia.size[1]}")

        caixas = caixas_dos_diagramas(pagina)
        for i, (x0, y0, x1, y1) in enumerate(caixas, start=1):
            folga = int(MARGEM * max(x1 - x0, y1 - y0))
            recorte = pagina.crop((
                max(0, x0 - folga),
                max(0, y0 - folga),
                min(pagina.size[0], x1 + folga),
                min(pagina.size[1], y1 + folga),
            ))
            destino = os.path.join(args.saida, f"p{args.pagina}-d{i}.png")
            recorte.save(destino)
            print(f"{destino}\tcaixa=({x0},{y0})-({x1},{y1})\t{recorte.size[0]}x{recorte.size[1]}")

        if not caixas:
            print("NENHUM DIAGRAMA ACHADO — leia a página inteira e ajuste as frações do topo",
                  file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
