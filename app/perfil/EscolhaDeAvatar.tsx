"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar/Avatares";
import { AVATARES, type AvatarId } from "@/lib/avatar/avatares";
import { escolherAvatar } from "./acoes";

type Recado = { tom: "ok" | "erro"; texto: string };

/**
 * A grade dos dez avatares. Um toque escolhe e salva — não há botão "Salvar".
 *
 * **Otimista, como a partida do dia (`app/painel/Hoje.tsx`).** No 4G da escola a
 * ida ao servidor demora; sem a marca imediata o aluno toca de novo, em outro,
 * achando que não pegou. Se a gravação falhar, a marca volta sozinha para o
 * avatar de antes (é o que `useOptimistic` faz quando a transição termina) e o
 * recado diz o que houve.
 *
 * **Botões com `aria-pressed`, e não rádios.** Cada toque é uma ação que grava; um
 * grupo de rádios mudaria a escolha só de andar com as setas do teclado, e cada
 * seta seria uma ida ao banco. Com botões, Tab anda e Enter ou Espaço escolhe.
 */
export function EscolhaDeAvatar({ atual }: { atual: string | null }) {
  const [escolhido, aplicar] = useOptimistic(atual, (_antes, novo: AvatarId) => novo);
  const [recado, setRecado] = useState<Recado | null>(null);
  const [salvando, transicao] = useTransition();

  function escolher(id: AvatarId) {
    if (id === escolhido) return;
    transicao(async () => {
      aplicar(id);
      const resposta = await escolherAvatar(id);
      setRecado(resposta.ok ? { tom: "ok", texto: "Avatar salvo." } : { tom: "erro", texto: resposta.erro });
    });
  }

  return (
    <section aria-labelledby="escolha" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="escolha" className="text-base font-semibold text-tinta">
          Escolha seu avatar
        </h2>
        {/* O recado mora sempre no mesmo lugar e com altura reservada: aparecer e sumir
            não empurra a grade. */}
        <p
          role="status"
          className={`min-h-5 text-sm ${
            salvando ? "text-tinta-fraca" : recado?.tom === "erro" ? "text-erro-texto" : "text-metodo-tinta"
          }`}
        >
          {salvando ? "Salvando…" : (recado?.texto ?? "")}
        </p>
      </div>

      {/* Só os desenhos, sem nome escrito (Doug, 17/9: "o nome fica muito infantil"). O nome
          continua existindo para o leitor de tela, no `aria-label` do botão. */}
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
        {AVATARES.map((avatar) => {
          const marcado = avatar.id === escolhido;
          return (
            <li key={avatar.id}>
              <button
                type="button"
                aria-pressed={marcado}
                aria-label={avatar.nome}
                onClick={() => escolher(avatar.id)}
                className={`cartao-alvo foco relative flex w-full items-center justify-center p-2 sm:p-3 ${
                  marcado ? "ring-2 ring-metodo-cheio" : ""
                }`}
              >
                <Avatar id={avatar.id} tamanho={72} decorativo className="h-auto w-full max-w-18" />
                {marcado ? (
                  <span
                    aria-hidden
                    className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-metodo-cheio text-xs font-bold text-tinta-inversa"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
