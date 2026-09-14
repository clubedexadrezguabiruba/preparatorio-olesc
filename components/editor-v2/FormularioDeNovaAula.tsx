"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarAulaV2 } from "@/app/editor/v2/acoes";
import { idDaNovaAula } from "@/lib/editor-v2/nova-aula";

/**
 * "Nova aula" — §5.2.
 *
 * ## O identificador aparece, e não se digita
 *
 * §5.2: "o ID é gerado/validado pelo sistema; o professor não digita IDs
 * internos". Mas ele também não pode ser invisível: o id de uma aula vira o nome
 * do arquivo, a URL e a chave do progresso do aluno, e quem cria precisa ver o
 * que vai ficar antes de confirmar. Então ele é mostrado, em tempo real,
 * desabilitado — dá para ler e conferir, e não dá para inventar um que o projeto
 * não aceita.
 *
 * ## O que esta tela promete, e o que ela avisa que não faz
 *
 * Ela cria o **rascunho v2**. Ela não põe a aula na trilha do curso: a trilha é
 * uma lista em código (`lib/finais/trilha.ts`), e acrescentar uma aula lá é
 * alteração de código. Prometer o contrário faria o professor esperar a aula
 * aparecer para o aluno, e ela não apareceria.
 */
export function FormularioDeNovaAula() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<"curso" | "extra">("curso");
  const [nivel, setNivel] = useState(0);
  const [orientacaoPadrao, setOrientacaoPadrao] = useState<"white" | "black">("white");
  const [criterioDominio, setCriterioDominio] = useState<"D1" | "D2" | "D3" | "D4">("D1");
  const [classe, setClasse] = useState<"" | "E" | "D" | "C" | "B">("");
  const [erro, setErro] = useState<{ campo: string; mensagem: string } | null>(null);
  const [criando, comTransicao] = useTransition();

  const id = idDaNovaAula({ titulo, tipo, nivel });

  function criar() {
    setErro(null);
    comTransicao(async () => {
      const resultado = await criarAulaV2(JSON.stringify({ titulo, tipo, nivel, orientacaoPadrao, criterioDominio, ...(classe ? { classe } : {}) }));
      if (!resultado.ok) {
        setErro(resultado);
        return;
      }
      // §5.2: "criar abre a nova aula e oferece imediatamente Adicionar capítulo".
      router.push(`/editor/v2/finais/${resultado.id}`);
    });
  }

  return (
    <form
      onSubmit={(evento) => { evento.preventDefault(); criar(); }}
      className="cartao-vazio flex flex-col gap-4 p-4"
    >
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Título da aula
        <input
          type="text"
          value={titulo}
          autoFocus
          onChange={(evento) => setTitulo(evento.currentTarget.value)}
          placeholder="Peão de torre na sétima"
          aria-invalid={erro?.campo === "titulo" ? true : undefined}
          className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Tipo
          <select
            value={tipo}
            onChange={(evento) => {
              const novo = evento.currentTarget.value === "extra" ? "extra" : "curso";
              setTipo(novo);
              // Nível 0 não existe numa extra; a série N0 existe numa aula do curso.
              if (novo === "extra" && nivel === 0) setNivel(1);
            }}
            className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
          >
            <option value="curso">Aula do curso</option>
            <option value="extra">Aula extra (EX-)</option>
          </select>
        </label>
        {tipo === "curso" ? (
          <label className="flex flex-col gap-1 text-sm text-tinta">
            Série do identificador
            <select
              value={nivel}
              onChange={(evento) => setNivel(Number(evento.currentTarget.value))}
              aria-invalid={erro?.campo === "nivel" ? true : undefined}
              className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
            >
              {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>N{n}</option>)}
            </select>
            <span className="text-xs text-tinta-fraca">Não é o nível: o nível de uma aula do curso vem da trilha.</span>
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm text-tinta">
              Nível
              <select
                value={nivel}
                onChange={(evento) => setNivel(Number(evento.currentTarget.value))}
                aria-invalid={erro?.campo === "nivel" ? true : undefined}
                className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Nível {n}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-tinta">
              Classe
              <select
                value={classe}
                onChange={(evento) => setClasse(evento.currentTarget.value as "" | "E" | "D" | "C" | "B")}
                aria-invalid={erro?.campo === "classe" ? true : undefined}
                className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
              >
                <option value="">— escolha —</option>
                {(["E", "D", "C", "B"] as const).map((c) => <option key={c} value={c}>Classe {c}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Tabuleiro visto por
          <select
            value={orientacaoPadrao}
            onChange={(evento) => setOrientacaoPadrao(evento.currentTarget.value === "black" ? "black" : "white")}
            className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
          >
            <option value="white">Brancas embaixo</option>
            <option value="black">Pretas embaixo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Critério de domínio
          <select
            value={criterioDominio}
            onChange={(evento) => setCriterioDominio(evento.currentTarget.value as "D1" | "D2" | "D3" | "D4")}
            className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
          >
            {["D1", "D2", "D3", "D4"].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>

      <p className="rounded-md border border-borda-fraca bg-carta p-3 text-sm text-tinta">
        Identificador: <code className="font-mono text-xs">{id || "—"}</code>
        <span className="block text-xs text-tinta-fraca">
          Gerado pelo título{tipo === "curso" ? " e pela série" : ""}. É o nome do arquivo e o endereço da aula; não dá para mudá-lo depois sem mexer no progresso do aluno.
        </span>
      </p>

      {erro ? <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{erro.mensagem}</p> : null}

      <p className="text-xs text-tinta-fraca">
        A aula nasce vazia e é salva como rascunho — isso é permitido, e a tela seguinte oferece «Adicionar capítulo».
        {tipo === "extra"
          ? "Aula extra: com nível e classe, ela entra na trilha quando for publicada, e passa a contar para o fechamento daquele nível."
          : "Pôr uma aula do curso na trilha é passo separado (a trilha das 49 é código), e não é feito por aqui."}
      </p>

      <div className="flex flex-wrap justify-end gap-3">
        <a href="/editor" className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</a>
        <button
          type="submit"
          disabled={criando || id === ""}
          className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
        >
          {criando ? "Criando…" : "Criar aula"}
        </button>
      </div>
    </form>
  );
}
