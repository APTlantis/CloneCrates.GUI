# CloneCratesGUI Trust and Dependency Provenance

## Trust Model

CloneCratesGUI is a local desktop operator console. It does not use accounts, cloud services, or remote telemetry. Its remote network activity is limited to the workflows the operator starts:

- Git clone/update of `https://github.com/rust-lang/crates.io-index.git`.
- Crate downloads from `https://static.crates.io/crates` or an operator-provided alternate base URL.

The app trusts:

- The bundled Tauri application.
- Bundled CloneCratesio binaries built from `D:\CTS\CloneCratesio`.
- Bundled Portable Git for Windows.
- The crates.io index and crate artifact hosts selected by the operator.

## Bundled Runtime Components

| Component | Location | Purpose |
| --- | --- | --- |
| `download-crates.exe` | `src-tauri/resources/bin` | Mirrors crate archives and writes manifests/bundles. |
| `generate-sidecars.exe` | `src-tauri/resources/bin` | Generates metadata sidecars. |
| `extract-bundles.exe` | `src-tauri/resources/bin` | Restores bundle archives. |
| Portable Git | `src-tauri/resources/portable-git` | Clones and updates `crates.io-index`. |

## Source Authority

CloneCratesio source authority:

```text
D:\CTS\CloneCratesio
```

Current authoritative CLI commits used during release-prep:

- `9a728c8 Align module path with CloneCratesio repo`
- `a4d23ac Fix sidecar limit deadlock`

## Known Security Boundaries

- The installer is currently unsigned.
- No independent security audit has been completed.
- The application can write large amounts of data to operator-selected paths.
- `extract-bundles -overwrite` can replace existing files only when the operator enables overwrite.

## Release Controls

The release gate verifies:

- Bundled tool versions.
- TypeScript type checking.
- Rust backend checking.
- Copied CLI payload tests.
- Bundled Git HTTPS access.
- Bundled loose download, sidecar, bundle, and extraction workflows.
- Final installer hashes.

## Dependency Refresh Rules

- Refresh CloneCratesio binaries only from the authoritative CLI repo.
- Refresh Portable Git only from Git for Windows official releases.
- Rebuild installers after any resource change.
- Re-run `scripts/release-gate.ps1` after any dependency refresh.
