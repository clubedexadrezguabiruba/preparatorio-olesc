import Image from "next/image";
import Link from "next/link";
import { BLOCOS, contaNoCurso } from "@/lib/tatica/blocos";

export default function Home() {
  const temas = BLOCOS.reduce((soma, bloco) => soma + bloco.temas.filter(contaNoCurso).length, 0);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-5 py-16">
      {/* O logo do clube, com o nome escrito nele; o `alt` o diz por extenso (18/9/2026). */}
      <Image
        src="/cxg-logo.webp"
        alt="Clube de Xadrez Guabiruba (CXG)"
        width={720}
        height={508}
        priority
        className="h-auto w-64 sm:w-80"
      />

      <header className="flex flex-col gap-3">
        <p className="rotulo text-metodo-tinta">25ª OLESC · Lages · 11 a 16 de outubro</p>
        <h1 className="titulo text-tinta">Preparatório de torneio</h1>
        <p className="text-base text-tinta-media">
          Tática, repertório e o ofício de jogar torneio — relógio, anotação, regras e
          cabeça — para as equipes masculina e feminina do Clube de Xadrez Guabiruba.
        </p>
      </header>

      <Link
        href="/entrar"
        className="foco self-start rounded-lg bg-metodo-cheio px-5 py-3 text-base font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
      >
        Entrar
      </Link>

      <p className="text-sm text-tinta-fraca">
        {temas} temas de tática em {BLOCOS.length} blocos, com dificuldade crescente. Sua
        conta é criada pelo professor: você entra com nome de usuário e PIN, sem e-mail.
      </p>
    </main>
  );
}
