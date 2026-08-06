# CloneCratesGUI

CloneCratesGUI is a self-contained Windows desktop console for running the CloneCratesio crates.io mirror pipeline. It wraps the proven CloneCratesio command tools in a Tauri application with preset workflows, advanced controls, streamed logs, live status polling, and packaged runtime dependencies.

The goal is simple: a Windows user should be able to install the GUI and start mirroring crates.io without separately installing Python, Go, or Git.

## What It Ships

- Tauri desktop app with React frontend.
- Rust backend command bridge.
- Bundled CloneCratesio `download-crates.exe`.
- Bundled CloneCratesio `generate-sidecars.exe`.
- Bundled CloneCratesio `extract-bundles.exe`.
- Bundled Portable Git for cloning and updating `crates.io-index`.
- Release gate and bundled-runtime self-test scripts.

## Workflows

- Clone or update the local crates.io index.
- Run a loose-file crate mirror.
- Run a bundle-first mirror.
- Generate sidecar metadata as files or JSONL.
- Extract bundle archives back to crates.io shard layout.
- Monitor downloader status through `/api/status`.

## Default Paths

The GUI defaults to user-profile-friendly working paths:

```text
C:\Rust-Crates\crates.io-index
C:\Rust-Crates\mirror
C:\Rust-Crates\bundles
C:\Rust-Crates\manifest.jsonl
```

These are operator defaults, not hard requirements. Advanced users can choose their own paths.

## Build Requirements for Developers

End users should not need these tools after installation. Developers building the application need:

- Node.js and pnpm/Corepack.
- Rust and Cargo.
- Tauri build requirements for Windows.
- Access to `D:\CTS\CloneCratesio` when refreshing bundled CLI binaries.

## Development Commands

```powershell
pnpm install
pnpm run lint
cargo check --manifest-path src-tauri\Cargo.toml
pnpm tauri build
```

## Release Gate

Run the full local release gate:

```powershell
pnpm run release:gate
```

The gate verifies TypeScript, Rust, copied CLI payload tests, bundled runtime behavior, installer build, tool versions, and final artifact hashes.

## Runtime Independence

The packaged app is designed not to depend on host-installed Python, Go, or Git. The bundled-runtime self-test strips the process `PATH` down to the app resources and Windows system folders before exercising Git clone, download, sidecar, bundle, and extraction workflows.

## Relationship to CloneCratesio

CloneCratesGUI is the desktop operator surface. CloneCratesio remains the command-line engine and source of truth:

```text
D:\CTS\CloneCratesio
```

When CloneCratesio changes, rebuild the three command binaries into:

```text
src-tauri\resources\bin
```

Then rerun the release gate.

## Current Release

Current candidate: `v0.1.0 - Self-Contained Runtime Release`.

See:

- `docs\Project-Proposal.md`
- `docs\Release-Checklist.md`
- `docs\releases\CloneCratesGUI-v0.1.0.md`
- `docs\Trust-and-Dependency-Provenance.md`
