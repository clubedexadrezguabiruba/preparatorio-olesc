"use client";

import { useActionState, useState } from "react";
import { excluirConta, gerarNovoPin, type EstadoDaConta } from "../acoes";

/**
 * O fim do relatório do aluno: PIN novo e exclusão da conta (Doug, 18/9/2026).
 *
 * O PIN novo é o caso comum (o aluno esqueceu o dele) e fica à mostra. A exclusão fica fechada
 * numa gaveta e só se arma com o usuário digitado: ela apaga o aluno e todo o progresso dele, e
 * não tem volta.
 */
export function GerirConta({ id, nome, usuario }: { id: string; nome: string; usuario: string }) {
  const [pin, pedirPin, gerando] = useActionState<EstadoDaConta, FormData>(gerarNovoPin, {});
  const [exclusao, pedirExclusao, excluindo] = useActionState<EstadoDaConta, FormData>(excluirConta, {});
  const [confirmacao, setConfirmacao] = useState("");
  const armado = confirmacao.trim().toLowerCase() === usuario.toLowerCase();

  return (
    <section aria-labelledby="conta" className="flex flex-col gap-4 border-t border-borda-fraca pt-6">
      <h2 id="conta" className="rotulo text-tinta-fraca">
        Conta
      </h2>

      <form action={pedirPin} className="cartao flex flex-col gap-3 p-4">
        <input type="hidden" name="id" value={id} />
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-tinta">Gerar PIN novo</h3>
          <p className="text-sm text-tinta-media">
            Para quando {nome.split(/\s+/)[0]} esquecer o PIN. O antigo deixa de valer na hora; o usuário continua{" "}
            <span className="font-mono">{usuario}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo text-tinta-fraca">PIN</span>
            <input
              name="pin"
              placeholder="em branco = sorteado"
              inputMode="numeric"
              autoComplete="off"
              className="foco w-48 rounded-lg border border-borda bg-papel px-3 py-2.5 text-base text-tinta placeholder:text-tinta-muda"
            />
          </label>
          <button
            type="submit"
            disabled={gerando}
            className="foco rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque disabled:opacity-60"
          >
            {gerando ? "Gerando…" : "Gerar PIN novo"}
          </button>
        </div>
        {pin.erro ? (
          <p role="alert" className="rounded-lg bg-erro-superficie/12 px-3 py-2 text-sm text-erro-tinta">
            {pin.erro}
          </p>
        ) : null}
        {pin.pinNovo ? (
          <div className="flex flex-col gap-2 rounded-xl border border-borda-forte bg-aviso-superficie/12 p-4">
            <p className="rotulo text-aviso-tinta">Anote agora — o PIN não aparece de novo</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-tinta-fraca">Usuário</dt>
              <dd className="font-mono font-medium text-tinta">{usuario}</dd>
              <dt className="text-tinta-fraca">PIN novo</dt>
              <dd className="font-mono text-lg font-semibold tracking-[0.3em] text-tinta">{pin.pinNovo}</dd>
            </dl>
          </div>
        ) : null}
      </form>

      <details className="cartao group p-4">
        <summary className="foco cursor-pointer font-semibold text-erro-tinta">Excluir conta</summary>
        <form action={pedirExclusao} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-tinta-media">
            Apaga a conta de <strong className="text-tinta">{nome}</strong> e <strong className="text-tinta">tudo</strong> o
            que ela guarda no banco: tentativas, progresso, selos, níveis e rating. <strong className="text-tinta">Não tem
            volta</strong> — nem você consegue recuperar depois.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-tinta-media">
              Para confirmar, digite o usuário <span className="font-mono font-semibold text-tinta">{usuario}</span>
            </span>
            <input
              name="confirmacao"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="foco w-64 max-w-full rounded-lg border border-borda bg-papel px-3 py-2.5 font-mono text-base text-tinta"
            />
          </label>
          {exclusao.erro ? (
            <p role="alert" className="rounded-lg bg-erro-superficie/12 px-3 py-2 text-sm text-erro-tinta">
              {exclusao.erro}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!armado || excluindo}
            className="foco self-start rounded-lg bg-erro-superficie px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-opacity disabled:opacity-40"
          >
            {excluindo ? "Excluindo…" : "Excluir conta para sempre"}
          </button>
        </form>
      </details>
    </section>
  );
}
