# Template distribution: source repository → generated template repository

This repository is the **source/development monorepo**. It contains the `@ezhana/*` package sources
(core design tokens, the official theme packages, the theme builder, the theme runtime and the shared
ESLint/Prettier config packages), the external-scaffolder pipeline (`tools/create-app`, published as
`create-ezhana-app`) and the template skeleton. The React and Vue applications are generated on
demand; no full sample apps are committed.

The public **template repository** (the one users click "Use this template" on) is generated from
this repository. It keeps the monorepo layout (`apps/` + `packages/`) and **ships the five shared
config packages under `packages/` as workspace source**; the published `@ezhana` token and theme
packages are installed from npm.

## Direction

The template uses a generator-first workflow: it ships no default apps; after cloning, users run
`pnpm install` and then `pnpm create:app` and choose a stack. The generator is a **published npm
package**, pinned as an exact devDependency, not a copy in the template repository — see
[ADR 0002](adr/0002-distribute-create-app-via-npm.md). [ADR 0001](adr/0001-create-app-in-template-repo.md)
still governs the in-repo workflow and the repository-patch rules.

## Repository roles

| Repository                                    | Contains                                                                                                        | Dependency strategy                                                         | GitHub Template |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| this repo (`frontend-template-source`)        | `packages/*` + `tools/create-app` + `template/` + changesets                                                    | `workspace:*` for `@ezhana/*`                                               | No              |
| generated template repo (`frontend-template`) | empty `apps/` + pinned `create-ezhana-app` + `packages/` with the five config packages (plus your own packages) | `workspace:*` for config packages; npm semver ranges for `@ezhana/*` themes | Yes             |

Both repositories are pnpm monorepos. The generated template starts without apps; the user chooses
React or Vue with `pnpm create:app`, and can create multiple apps in the same workspace.

## What the generated template contains

```text
frontend-template/
├── apps/
│   └── README.md                # empty; pnpm create:app will add apps/<name>
├── packages/
│   ├── README.md                # how to edit the shared config packages, add your own
│   ├── eslint-config-base/      # shared ESLint rules, composed by the root config
│   ├── eslint-config-typescript/
│   ├── eslint-config-react/     # imported by configured React apps
│   ├── eslint-config-vue/       # imported by configured Vue apps
│   └── prettier-config/         # shared Prettier options
├── .github/workflows/ci.yml     # validate + create:app matrix
├── eslint.config.mjs            # composes @ezhana/eslint-config-base
├── prettier.config.mjs          # re-exports @ezhana/prettier-config
├── lint-staged.config.mjs
├── pnpm-workspace.yaml          # apps/*, packages/*, catalog
├── package.json                 # create:app (published generator) + workspace config packages
├── pnpm-lock.yaml               # includes the pinned create-ezhana-app version
├── README.md
└── README.zh-CN.md
```

The generator is **not** vendored: the root `package.json` pins the published `create-ezhana-app`
package in `devDependencies` and routes `create:app` to its bin. `pnpm install` therefore installs
the generator together with the root tooling, and `pnpm-lock.yaml` covers it.

The five config packages are copied from this repository by the export, so they are the only
`@ezhana` source code in the generated template. They are workspace packages, not npm dependencies.

The generated root `package.json` has:

- devDependencies on the shared config packages (`@ezhana/eslint-config-base` and
  `@ezhana/prettier-config`, both `workspace:*`) plus `eslint`, `prettier` and `typescript` from the
  catalog, and the pinned `lint-staged` / `simple-git-hooks`; the config packages declare their own
  ESLint/Prettier dependencies (`@eslint/js`, `eslint-config-prettier`, `globals`, the framework
  plugins), so those are no longer root devDependencies;
- an exact `create-ezhana-app` devDependency (the version published for this template snapshot);
- `create:app`, `dev`, `build:packages`, `build:apps`, `build`, `lint` and `check` scripts;
- app scripts use `pnpm -r --filter "./apps/*" --if-present`, so with zero apps install/lint/build
  are valid;
- no changeset scripts or publishing configuration.

`pnpm create:app` chooses React or Vue, creates the app under `apps/<name>`, applies the theme
overlay, adds the theme dependencies and verifies lint/build; `--no-theme` skips the overlay and the
theme packages and keeps the plain official scaffold. Lint/format configuration is opt-in:
`pnpm create:app --eslint --prettier` writes thin config files that compose the workspace config
packages, and `pnpm create:app configure apps/<name> --eslint --prettier` does the same for an
existing app. The official scaffold's own tooling is preserved by default and by configure.

The generated app, not the root manifest, carries the theme stack. The generator injects
`@ezhana/design-tokens`, `@ezhana/theme`, `@ezhana/design-theme-cerulean` and
`@ezhana/design-theme-ocean` with `^<version>` ranges resolved from
`tools/create-app/versions.json`. That file is regenerated from the `packages/` manifests by
`pnpm sync:create-app`, so the official theme packages are collected automatically and version
independently of the core tokens. The app registers its themes in `src/theme/registry.ts` and derives
`AppTheme` from that registry; adding a theme package is an app-level change (install it, import its
stylesheet, register it), not a template change.

## Generation

From the source repository:

```bash
# Generate into dist-template/frontend-template (gitignored) without a lockfile
pnpm export:template

# Generate and create pnpm-lock.yaml (requires the pinned theme/token versions and
# create-ezhana-app@<version> to exist on npm; the config packages link locally)
pnpm export:template --install
```

The export copies the `template/` skeleton, copies the five config package directories from
`packages/` into `packages/` of the output (excluding `node_modules/` and `CHANGELOG.md`), reads the
generator version from `tools/create-app/package.json`, pins it as an exact root devDependency with a
`create:app` script, and never copies `tools/`. It validates that

- only the five config packages use `workspace:` dependencies — checked in the root manifest and in
  every copied package manifest (everything else must resolve from npm) — and the root
  devDependencies include `@ezhana/eslint-config-base` and `@ezhana/prettier-config` as
  `workspace:*`;
- all five config package directories are present under `packages/` with their manifest and
  `index.js`; each manifest keeps `private: true`, defines no `publishConfig` and only links the
  config packages with `workspace:`;
- the root `eslint.config.mjs` composes `@ezhana/eslint-config-base` and `prettier.config.mjs`
  re-exports `@ezhana/prettier-config`;
- `apps/` is empty, the `create:app` script points at the published package with an exact version,
  `tools/` is absent (including the `tools/*` workspace glob), and the `packages/README.md` guide is
  present.

`--install` then writes the root lockfile, which fails if the pinned generator version is not on
npm. The `workspace:*` config packages link locally, so they do not need to be published; the
`@ezhana` theme and token versions referenced by generated apps must exist on npm by the time the
apps are created.

`template/` is the source of truth for template-only files (README, CI workflow, empty `apps/`,
`packages/` README, root configs). The config package directories are copied from `packages/` in
this repository.

## CI automation

`.github/workflows/export-template.yml` is a `workflow_dispatch` job that:

1. installs this workspace,
2. verifies that the `create-ezhana-app` version pinned by the export exists on npm
   (`pnpm view create-ezhana-app@<version> version`),
3. verifies that the **published** generator supports the template workflow by running
   `pnpm dlx create-ezhana-app@<version> configure --help` and matching both the `shared ESLint
config package` and `--no-theme` help text; this blocks an export that would pin an older
   release and break the template CI matrix,
4. runs `pnpm export:template --install`,
5. initializes a git repository in `dist-template/frontend-template`,
6. force-pushes it to the repository configured by:
   - repository variable `TEMPLATE_REPO` (for example `ezhana/frontend-template`);
   - repository secret `TEMPLATE_REPO_TOKEN` (fine-grained token with `contents: write` on the
     template repository).

`dist-template/frontend-template` is a local, gitignored intermediate artifact. Do not commit or push
it directly; the export workflow regenerates it from the published packages. A template built with an
older `create-ezhana-app` release pins that release, so the exported root configs and configured apps
may not match the workspace-package design.

Run it **after** publishing the `@ezhana` theme/token versions and the `create-ezhana-app` version
referenced by the generated manifests. The template repository is generated and force-pushed; changes
should be made in this source repository, not in the generated one.

Enable GitHub's **Template repository** setting on the generated repository.

## GitHub configuration

### Source repository (`frontend-template-source`)

1. Rename the repository to `frontend-template-source` (GitHub → Settings → General → Repository
   name) and update the local remote:

   ```bash
   git remote set-url origin git@github.com:Ezhana/frontend-template-source.git
   ```

2. **Uncheck** _Settings → General → Template repository_. Only the generated repository should be
   a template.
3. Allow GitHub Actions (_Settings → Actions → General_) and keep workflow permissions read-only.
4. Add the export configuration under _Settings → Secrets and variables → Actions_:
   - variable `TEMPLATE_REPO`: `Ezhana/frontend-template` (owner/repo, no URL);
   - secret `TEMPLATE_REPO_TOKEN`: a fine-grained PAT with:
     - repository access: only `Ezhana/frontend-template`;
     - permissions: `Contents: read and write` **and** `Workflows: read and write`;
     - short expiry and a rotation reminder.

   > `Workflows: read and write` is required because the generated template contains
   > `.github/workflows/ci.yml`. Without it, GitHub rejects the push with
   > "refusing to allow a personal access token to create or update workflow file".

   #### Creating the fine-grained token
   1. Create the template repository first (or at least know its `owner/repo`). If it belongs to an
      organization, make sure you are allowed to create fine-grained tokens for that organization
      and that the organization has approved the token (or is configured to allow it).
   2. Open GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
      and choose **Generate new token**.
   3. Fill in:
      - **Token name**: e.g. `frontend-template-export`;
      - **Expiration**: 30–90 days (use a rotation reminder);
      - **Resource owner**: the account/org that owns `frontend-template`.
   4. **Repository access** → _Only select repositories_ → `Ezhana/frontend-template`.
   5. **Permissions** → _Repository permissions_:
      - `Contents`: **Read and write** (push commits);
      - `Workflows`: **Read and write** (push `.github/workflows/ci.yml`);
      - `Metadata`: Read-only (selected automatically).
        No Actions permission is needed — the token only pushes to the template repository.
   6. Generate the token and copy it once. GitHub will not show it again.
   7. In the **source repository** open **Settings → Secrets and variables → Actions**:
      - **Secrets → New repository secret**: name `TEMPLATE_REPO_TOKEN`, value the token;
      - **Variables → New repository variable**: name `TEMPLATE_REPO`,
        value `Ezhana/frontend-template` (no URL, no `https://github.com/`).

   Or with the GitHub CLI (from the source repository):

   ```bash
   gh secret set TEMPLATE_REPO_TOKEN --repo Ezhana/frontend-template-source
   gh variable set TEMPLATE_REPO --repo Ezhana/frontend-template-source \
     --body Ezhana/frontend-template
   ```

   If the organization uses SAML SSO, open the token on GitHub and click **Configure SSO** to
   authorize it for the organization; otherwise the API/push returns 403.

   To verify before running the workflow (do not paste the token into shell history; use an
   environment variable or a one-off `read -s`):

   ```bash
   export GH_TOKEN=...   # your token
   gh api repos/Ezhana/frontend-template --jq '.permissions'
   ```

   A token with push access usually reports `{"admin":false,"push":true,"pull":true}` (exact output
   depends on your role). You can also run the export workflow once and inspect the push step.

5. Keep this repository as the canonical source. The generated repository is force-pushed and should
   not be edited directly.

### Template repository (`frontend-template`)

1. Create the repository as a public repository (an initial README is fine; the workflow overwrites
   it).
2. After the first successful export, enable _Settings → General → Template repository_.
3. Set a clear description, for example: "Generated from frontend-template-source — do not edit
   directly." Add topics such as `template`, `monorepo`, `react`, `vue`, `vite`, `design-tokens`.
4. Enable Actions. The generated repository has its own CI
   (a `validate` job plus a `create:app` matrix) and does not need npm secrets. The
   `create:app` matrix exercises the published generator.
5. **Do not require pull requests/reviews on `main` unless the token can bypass the rules** — the
   export workflow force-pushes `main`. The simplest policy is an unprotected `main` plus a note
   that the repository is generated; edits belong in the source repository.
6. **Do not enable Renovate/Dependabot for the published `@ezhana/*` packages or
   `create-ezhana-app`** in the generated repository: dependency updates are published through
   releases in the source repository and applied by regenerating the template. The config packages
   under `packages/` are copied source as well, so upstream rule changes also arrive by regenerating
   the template. Renovate PRs would be overwritten by the next force-push.
7. Configure issues/PRs to point to the source repository (repository description or an issue
   template) because generated content is replaced on every export.
8. Optionally tag generated commits (`template-YYYY.MM.DD`) for traceability; template consumers do
   not need these tags.

### First export

Run **Actions → Export template repo → Run workflow** in the source repository after publishing the
`@ezhana` theme/token versions and `create-ezhana-app`. The job pushes `main` to `TEMPLATE_REPO`.
Then verify:

- the generated repository contains an empty `apps/`, the five config packages under `packages/`,
  the pinned `create-ezhana-app` devDependency, both READMEs and a committed `pnpm-lock.yaml`;
- the root `eslint.config.mjs` imports and the root `prettier.config.mjs` re-exports the workspace
  config packages (no inlined rules);
- the generated CI is green, including the `create:app` matrix job;
- _Template repository_ is enabled;
- the source repository is **not** a template.

## Prerelease checklist

1. `pnpm check` in this repository.
2. Run `pnpm changeset version` + `pnpm changeset publish` for package changes. Publish in
   dependency order: `@ezhana/design-tokens` first, then the official theme packages
   (`@ezhana/design-theme-cerulean`, `@ezhana/design-theme-ocean`, `@ezhana/design-theme-quest`) and
   `@ezhana/theme`, then `create-ezhana-app` (the template pins the published versions; a version
   that is not on npm makes `--install` fail). The generator's `prepack` hook refreshes `versions.json` before packing. From
   GitHub Actions, publish with provenance (`pnpm publish --provenance`, or trusted publishing, which
   attaches it automatically); local publishes omit provenance. The `create-ezhana-app` minor bump
   containing the workspace-config change must be **published** before exporting; the export
   workflow's capability check verifies the published release supports `configure`.
3. Run `pnpm sync:create-app` locally to keep the committed `versions.json` in sync (CI verifies it).
   The shared ESLint/Prettier config packages are private, so they are excluded automatically; they
   reach the template through the export, not through npm.
4. Verify the published packages with `pnpm view @ezhana/design-tokens version`,
   `pnpm view @ezhana/design-theme-cerulean version`, `pnpm view @ezhana/design-theme-ocean version`,
   `pnpm view @ezhana/design-theme-quest version`, `pnpm view create-ezhana-app version`.
5. Run `pnpm export:template --install` (or dispatch the export workflow) only after publishing the
   new `create-ezhana-app` version, then let the generated template's own CI pass. The generated
   `dist-template/` directory is an untracked intermediate artifact and is not committed.

If the generated template is meant for teams with a strict `minimumReleaseAge` policy, note that
pnpm 12's built-in default is 1440 minutes (non-strict); a version published minutes ago may still be
rejected by strict consumers. Prefer exporting the template at least a day after publishing a new
generator version.

The lint/format config packages are shared workspace source: they are private, so they are not
published, and the export copies them into the generated template under `packages/`. The template's
root configs and configured apps import them through `workspace:*`; there are no self-contained rule
copies.

## User packages

The generated template ships the five config packages in `packages/`; that directory is **not** an
empty placeholder and must not be deleted, because the root and app lint/format configs resolve the
packages through the workspace. Users add their own shared packages alongside them:

- create `packages/<their-package>` with a `package.json`, `src/` and a build script;
- add it to an app with `"workspace:*"`;
- build packages with `pnpm build:packages` (the config packages have no build script, so they are
  skipped);
- add their own versioning/publishing setup (Changesets, etc.) if they publish packages.

The published `@ezhana` theme and token packages remain npm-only in the template; the five config
packages under `packages/` are the only `@ezhana` source in it. Do not edit the config packages in a
generated repository to make upstream changes: the generated repository is force-pushed, so changes
belong in this source repository and reach users through a new export.

## Version policy

- The generator pins its `@ezhana/*` dependencies (core tokens, theme runtime and the official theme
  packages) to `^<version>` values collected from this monorepo's package manifests into
  `tools/create-app/versions.json`.
- Official theme packages version independently: a theme fix publishes only that theme package, and
  newly generated apps pick it up through the `^<version>` range without regenerating the template.
  Existing apps can upgrade one theme package without touching the core tokens.
- The generated template pins `create-ezhana-app` to an **exact** version (no `^`), so a template
  snapshot always generates the same apps. Bump the generator version in the source repository, then
  regenerate the template; do not bump it in the generated repository.
- The five lint/format config packages are not published or versioned: the export copies them into
  the template as workspace source. A rule or dependency change in those packages reaches users
  only after the template is regenerated.
- Run `pnpm changeset version` and `pnpm changeset publish` first, then regenerate the template.
- The generated `pnpm-lock.yaml` is committed by the publish workflow and covers the pinned
  generator, so `pnpm install --frozen-lockfile` fails if it is not published.
- Template CI installs with `--frozen-lockfile`, catching missing files/exports in published
  packages.
- For 0.x packages, `^0.2.0` accepts patch releases only; review minor releases manually if you
  want tighter control.
