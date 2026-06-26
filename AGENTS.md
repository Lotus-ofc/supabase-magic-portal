<!-- LOTUS:BEGIN -->
> [!IMPORTANT]
> **Engenharia oficial Lotus:** todo desenvolvimento acontece neste repositório via **Cursor**.
> Fluxo: Desenvolvimento → Commit → Git → GitHub → Deploy → Portal Lotus.
>
> Documentação: `docs/09-standards/development-workflow.md` · ADR-0010
>
> Lovable é **transitório** (build/deploy apenas) — não implemente features no editor Lovable.
<!-- LOTUS:END -->

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
