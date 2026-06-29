import { BRAND_NAME, BRAND_COLORS } from "./brand";

export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${BRAND_NAME} — página não carregou</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #f5f5f5; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #a3a3a3; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: linear-gradient(180deg, ${BRAND_COLORS.purple}, ${BRAND_COLORS.blue}); color: #fff; }
      .secondary { background: #171717; color: #f5f5f5; border-color: #404040; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Esta página não carregou</h1>
      <p>Algo deu errado no ${BRAND_NAME}. Você pode atualizar a página ou voltar ao início.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar novamente</button>
        <a class="secondary" href="/">Ir ao início</a>
      </div>
    </div>
  </body>
</html>`;
}
