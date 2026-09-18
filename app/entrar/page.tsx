import type { Metadata } from "next";
import Image from "next/image";
import { Formulario } from "./Formulario";

export const metadata: Metadata = { title: "Entrar — Preparatório OLESC" };

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ proxima?: string }>;
}) {
  const { proxima } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-5 py-12">
      <Image
        src="/cxg-logo.webp"
        alt="Clube de Xadrez Guabiruba (CXG)"
        width={720}
        height={508}
        priority
        className="h-auto w-60"
      />

      <header className="flex flex-col gap-2">
        <p className="rotulo text-metodo-tinta">Clube de Xadrez Guabiruba · Preparatório OLESC 2026</p>
        <h1 className="titulo text-tinta">Entrar</h1>
        <p className="text-sm text-tinta-media">
          Use o nome de usuário e o PIN que o professor entregou. Não precisa de e-mail.
        </p>
      </header>

      <Formulario proxima={proxima ?? ""} />
    </main>
  );
}
