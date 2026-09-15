/**
 * Os ensaios de navegador do projeto — fatia 10 do Editor v2.
 *
 * - `npm run e2e` roda tudo; `e2e:layout`, `e2e:a11y` e `e2e:desempenho` rodam as marcas.
 * - `workers: 1`: os ensaios dividem o mesmo `next dev`, o mesmo disco e o mesmo banco de contas
 *   de teste; em paralelo, um publicaria por cima do outro.
 * - O servidor é o `next dev` que já estiver na porta 3000 (`reuseExistingServer`), porque o editor
 *   só existe em `next dev` com `EDITOR_LOCAL=1`.
 * - Preparo e limpeza em `e2e/preparo/`: contas, sessões, e a prova por SHA-256 de que nada fora
 *   de `EX-E2E-…` mudou.
 *
 * Guia lido antes: `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`.
 */
import { defineConfig } from "@playwright/test";

const SO_LAYOUT = /layout\.spec\.ts$/;

/**
 * A porta do ensaio. Padrão 3000; `E2E_PORTA=3005` quando outra cópia do projeto já ocupa a
 * 3000 — com `reuseExistingServer`, o ensaio usaria o servidor da outra cópia sem avisar.
 */
const PORTA = process.env.E2E_PORTA ?? "3000";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  outputDir: ".editor/e2e/resultados",
  globalSetup: "./e2e/preparo/global-setup.ts",
  globalTeardown: "./e2e/preparo/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 90_000,
  },
  webServer: {
    command: `npx next dev -p ${PORTA}`,
    url: `http://localhost:${PORTA}/entrar`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: "editor-1366", use: { viewport: { width: 1366, height: 768 } } },
    { name: "editor-1280", use: { viewport: { width: 1280, height: 720 } }, testMatch: SO_LAYOUT },
    { name: "editor-1920", use: { viewport: { width: 1920, height: 1080 } }, testMatch: SO_LAYOUT },
    // As partidas modelo são tela de aluno: rodam também a 375 px.
    { name: "aluno-375", use: { viewport: { width: 375, height: 812 }, hasTouch: true }, testMatch: /(layout|partidas)\.spec\.ts$/ },
  ],
});
