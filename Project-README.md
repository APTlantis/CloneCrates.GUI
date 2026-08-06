# CloneCratesGUI

## Purpose and Boundaries

CloneCratesGUI is a local-first Windows desktop application for operating the CloneCratesio crates.io mirror pipeline without requiring the user to install Python, Go, or Git. It provides preset-driven workflows, advanced CLI controls, streamed process logs, and bundled runtime dependencies.

The GUI does not replace the CloneCratesio command-line project. The authoritative CLI implementation remains `D:\CTS\CloneCratesio`; this project consumes built CLI artifacts and presents them through a desktop interface.

## Governance

- Project manifest: `CloneCratesGUI.manifest.toml`
- Proposal: `docs/Project-Proposal.md`
- Release gate: `scripts/release-gate.ps1`
- Release checklist: `docs/Release-Checklist.md`
- Governing standard: DRS
- Supporting standards: WGS, PPS

## Current State

Lifecycle: `release-prep`.

The application has a working Tauri shell, bundled CloneCratesio binaries, bundled Portable Git, and a passing bundled-runtime self-test. The first local release candidate is `v0.1.0`.

## Structure

- `components/`, `app/`, `src/`, `lib/`: React frontend.
- `src-tauri/src/`: Rust backend commands and packaged runtime resolution.
- `src-tauri/resources/bin/`: bundled CloneCratesio executables.
- `src-tauri/resources/portable-git/`: bundled Portable Git runtime.
- `scripts/`: release gate and bundled-runtime self-test.
- `docs/`: PPS, release, trust, and verification records.

## Verification

Run the full release gate from the project root:

```powershell
pnpm run release:gate
```

The gate runs TypeScript checking, Rust checking, copied CLI payload tests, bundled runtime tests, Tauri packaging, and installer hashing.
