/** Slug URL-safe a partir de nome de cliente (pt-BR, sem acentos). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Resolve slug de rota a partir do nome canônico do cliente. */
export function clienteSlug(nome: string): string {
  return slugify(nome);
}
