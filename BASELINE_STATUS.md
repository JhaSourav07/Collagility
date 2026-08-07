# Collagility Monorepo Baseline Status

**Timestamp:** 2026-08-08 00:12:45  
**Branch:** `version-0.1.7`  
**Node Version:** `v22.22.2`  
**pnpm Version:** `9.15.4`  

---

## 1. Summary Matrix

| Step | Command | Result | Pass Count / Metric | Details / Failures |
|---|---|---|---|---|
| **Install** | `pnpm install` | **PASS** | 10 workspace packages | Resolution up to date |
| **Build** | `pnpm build` | **PASS** | 9 build targets | Clean build across all packages |
| **Test** | `pnpm test` | **PASS** | 18 test files, 67 tests | 0 failing tests |
| **Lint** | `pnpm lint` | **PASS** | 15 lint targets | 0 errors, 78 warnings (`@typescript-eslint/no-unused-vars`, `no-explicit-any`) |
| **Coverage** | `pnpm test:coverage` | **PASS** | Configured via `@vitest/coverage-v8` | Tested on `apps/cli`, `packages/adapters`, `packages/renderer` |

---

## 2. Step 1 Output Logs

### A. `pnpm install`
```text
Scope: all 10 workspace projects
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 1s
```

### B. `pnpm build` (`pnpm build --force`)
```text
• turbo 2.10.7
   • Packages in scope: @collagility/adapters, @collagility/protocol, @collagility/renderer, @collagility/sdk, @collagility/server, @collagility/stream, @collagility/types, @collagility/web, collagility
   • Running build in 9 packages

 Tasks:    9 successful, 9 total
Cached:    0 cached, 9 total
 Time:     17.991s
```

### C. `pnpm test` (`pnpm --filter '!@collagility/web' test -- --run`)
```text
packages/types: 1 passed (1 test)
packages/renderer: 1 passed (4 tests)
packages/protocol: 17 passed (59 tests)
packages/stream: 6 passed (16 tests)
packages/adapters: 8 passed (64 tests)
packages/sdk: 1 passed (1 test)
apps/server: 9 passed (28 tests)
apps/cli (collagility): 18 passed (67 tests)

Test Files  18 passed (18)
     Tests  67 passed (67)
  Duration  6.14s
```

### D. `pnpm lint`
```text
✔ 0 errors
✖ 76 problems (0 errors, 76 warnings)
Main warning types:
- @typescript-eslint/no-unused-vars (unused function/variable parameters in tests/commands)
- @typescript-eslint/no-explicit-any (explicit any types in CLI prompt handlers)
```

---

## 3. Test Coverage Tooling Configuration

- **Installed Tooling:** `@vitest/coverage-v8@^2.1.9` added to devDependencies.
- **Root Script:** `"test:coverage": "turbo run test:coverage"` in root `package.json` and task added to `turbo.json`.
- **Package Scripts Added:**
  - `apps/cli/package.json`: `"test:coverage": "vitest run --coverage"`
  - `packages/adapters/package.json`: `"test:coverage": "vitest run --coverage"`
  - `packages/renderer/package.json`: `"test:coverage": "vitest run --coverage"`
- **Default behavior preserved:** `pnpm test` behavior remains completely untouched.
