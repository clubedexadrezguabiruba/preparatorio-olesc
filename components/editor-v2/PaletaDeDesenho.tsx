"use client";

import {
  CORES_DA_PALETA,
  instrucaoDaPaleta,
  type EstadoDaPaleta,
  type FerramentaDeDesenho,
} from "@/lib/editor-v2/paleta-de-desenho";
import type { CorDesenhoV2 } from "@/lib/editor-v2/modelo";
import { AjudaDeAtalhos } from "@/components/motor-do-professor/AjudaDeAtalhos";
import { useVirarTabuleiro } from "@/components/atalhos/Atalhos";

/**
 * As ferramentas clicáveis de desenho (§10.2 e §25).
 *
 * ## O que ela resolve
 *
 * Até aqui o desenho do editor só nascia do botão direito, com Shift e Alt escolhendo
 * a cor. §10.2 exige a porta visível — *"seta, casa, cor e limpar, para que o recurso
 * seja descoberto sem conhecer atalhos"* —, e §25 exige que toda ação de botão direito
 * tenha equivalente em botão. Os atalhos continuam valendo: esta é uma segunda porta
 * para a mesma sala, e a regra do segundo clique é a mesma nas duas
 * (`paleta-de-desenho.ts`).
 *
 * ## Duas decisões de acabamento
 *
 * **A cor escolhida não se anuncia só pela cor.** §25 é explícito: *"estado não depende
 * apenas de cor: seleção usa forma/texto/borda"*. Cada botão traz o nome da cor escrito
 * e, quando é o escolhido, ganha o aro e o "✓". Quem não distingue verde de vermelho
 * continua sabendo qual está ligada.
 *
 * **A legenda dos atalhos ficou, a um clique.** Ela não é redundância: o professor que já
 * aprendeu o Shift continua precisando dela, e ela é o que explica por que a mesma cor
 * aparece de dois jeitos. Na fatia 9 ela saiu da linha fixa para o `(?)` ao lado de
 * "Apagar", e a frase de instrução passou a aparecer só com a seta ou a casa na mão: as
 * duas linhas pagaram o espaço do motor do professor.
 */
export function PaletaDeDesenho({ estado, temDesenho, aoTrocarFerramenta, aoTrocarCor, aoApagar }: {
  estado: EstadoDaPaleta;
  /** Sem nenhum traço nesta posição, "apagar" não tem o que fazer. */
  temDesenho: boolean;
  aoTrocarFerramenta: (ferramenta: FerramentaDeDesenho) => void;
  aoTrocarCor: (cor: CorDesenhoV2) => void;
  aoApagar: () => void;
}) {
  const desenhando = estado.ferramenta !== "mover";
  const vista = useVirarTabuleiro();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <div role="group" aria-label="Ferramenta do tabuleiro" className="flex items-center gap-1">
          {FERRAMENTAS.map(({ chave, rotulo, sinal }) => {
            const ligada = estado.ferramenta === chave;
            return (
              <button
                key={chave}
                type="button"
                aria-pressed={ligada}
                onClick={() => aoTrocarFerramenta(chave)}
                aria-label={rotulo}
                title={rotulo}
                className={`foco flex min-h-8 min-w-8 items-center justify-center rounded border text-base leading-none ${ligada ? "border-metodo-superficie bg-metodo-superficie/25 text-metodo-tinta-alta" : "border-borda text-tinta hover:bg-carta-toque"}`}
              >
                <span aria-hidden>{sinal}</span>
              </button>
            );
          })}
        </div>

        <div role="group" aria-label="Cor do desenho" className="flex items-center gap-1">
          {CORES_DA_PALETA.map((cor) => {
            const escolhida = estado.cor === cor;
            return (
              <button
                key={cor}
                type="button"
                aria-pressed={escolhida}
                onClick={() => aoTrocarCor(cor)}
                aria-label={`Cor ${cor}`}
                title={`Cor ${cor}`}
                className={`foco flex min-h-8 min-w-8 items-center justify-center rounded-full border-2 ${escolhida ? "border-tinta" : "border-transparent hover:border-borda"}`}
              >
                <i aria-hidden className="h-4 w-4 shrink-0 rounded-full ring-1 ring-tinta/40" style={{ background: `var(${TOKEN_DA_COR[cor]})` }} />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!temDesenho}
          onClick={aoApagar}
          aria-label="Apagar desenhos desta posição"
          title="Apagar desenhos desta posição"
          className="foco flex min-h-8 min-w-8 items-center justify-center rounded border border-borda text-base leading-none text-tinta hover:bg-carta-toque disabled:opacity-40"
        >
          <span aria-hidden>🗑</span>
        </button>

        {/* §10.2 "Virar tabuleiro": o mesmo `x`, só a vista do professor. O lado que o aluno vê
            mora no ••• do capítulo. */}
        <button
          type="button"
          aria-pressed={vista.virada}
          onClick={vista.virar}
          aria-label="Virar tabuleiro"
          title="Virar tabuleiro (tecla x) — só na sua tela; o aluno não muda"
          className={`foco flex min-h-8 min-w-8 items-center justify-center rounded border text-base leading-none ${vista.virada ? "border-metodo-superficie bg-metodo-superficie/25 text-metodo-tinta-alta" : "border-borda text-tinta hover:bg-carta-toque"}`}
        >
          <span aria-hidden>⇅</span>
        </button>

        <AjudaDeAtalhos rotulo="Atalhos de desenho" lado="esquerda">
          <p className="mb-1">{instrucaoDaPaleta({ ...estado, ferramenta: "mover" })}</p>
          <p className="flex flex-wrap items-center gap-2">
            <span>Ou com o botão direito, sem escolher nada aqui:</span>
            {ATALHOS.map(({ token, tecla }) => (
              <span key={tecla} className="inline-flex items-center gap-1">
                <i aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: `var(${token})` }} />
                {tecla}
              </span>
            ))}
          </p>
        </AjudaDeAtalhos>
      </div>

      {/* `role="status"` porque a frase muda sozinha entre um clique e outro — quem usa
          leitor de tela precisa ouvir que a seta está esperando o destino. A região fica
          sempre montada (vazia com "Mover peças"), para o leitor de tela não perder o
          anúncio da primeira troca; só a caixa visível some. */}
      <p role="status" className={`text-center text-xs text-metodo-tinta ${desenhando ? "" : "sr-only"}`}>
        {desenhando ? instrucaoDaPaleta(estado) : ""}
      </p>
    </div>
  );
}

const FERRAMENTAS: readonly { chave: FerramentaDeDesenho; rotulo: string; sinal: string }[] = [
  { chave: "mover", rotulo: "Mover peças", sinal: "♟" },
  { chave: "seta", rotulo: "Seta", sinal: "↗" },
  { chave: "casa", rotulo: "Casa", sinal: "◎" },
];

/**
 * O azul do professor é desenhado com o pincel `plano` deste site — a explicação
 * inteira está em `lib/chess/annotations.ts`. A bolinha da paleta tem de mostrar a cor
 * com que o traço **vai sair**, e não a que o nome sugere.
 */
const TOKEN_DA_COR: Record<CorDesenhoV2, string> = {
  verde: "--color-pincel-defendida",
  vermelho: "--color-pincel-pendurada",
  azul: "--color-pincel-plano",
  amarelo: "--color-pincel-alternativa",
};

const ATALHOS = [
  { token: "--color-pincel-defendida", tecla: "sozinho" },
  { token: "--color-pincel-pendurada", tecla: "Shift" },
  { token: "--color-pincel-plano", tecla: "Alt" },
  { token: "--color-pincel-alternativa", tecla: "Shift+Alt" },
] as const;
