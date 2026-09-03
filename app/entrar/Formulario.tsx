"use client";

import { useActionState } from "react";
import { entrar, type EstadoDaEntrada } from "./acoes";
import { TAMANHO_DO_PIN } from "@/lib/auth/usuario";

export function Formulario({ proxima }: { proxima: string }) {
  const [estado, agir, pendente] = useActionState<EstadoDaEntrada, FormData>(entrar, {});

  return (
    <form action={agir} className="flex flex-col gap-5">
      <input type="hidden" name="proxima" value={proxima} />

      <label className="flex flex-col gap-1.5">
        <span className="rotulo text-tinta-fraca">Nome de usuário</span>
        <input
          name="usuario"
          required
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="foco rounded-lg border border-borda bg-carta px-3 py-2.5 text-base text-tinta placeholder:text-tinta-muda"
          placeholder="joaopedro"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="rotulo text-tinta-fraca">PIN</span>
        <input
          name="pin"
          required
          /* `inputMode="numeric"` e não `type="number"`: o teclado do celular
             abre nos números do mesmo jeito, mas sem as setinhas de incremento
             e sem o navegador apagar o zero à esquerda de um PIN como 042318. */
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={TAMANHO_DO_PIN}
          autoComplete="current-password"
          className="foco rounded-lg border border-borda bg-carta px-3 py-2.5 text-center font-mono text-2xl tracking-[0.35em] text-tinta placeholder:tracking-normal placeholder:text-tinta-muda"
          placeholder="6 números"
        />
      </label>

      {estado.erro ? (
        <p role="alert" className="text-sm text-erro-texto">
          {estado.erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pendente}
        className="foco rounded-lg bg-metodo-cheio px-4 py-3 text-base font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque disabled:opacity-60"
      >
        {pendente ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-sm text-tinta-fraca">
        Esqueceu o PIN? Fale com o professor — ele consegue gerar outro.
      </p>
    </form>
  );
}
