# CloneCratesGUI v0.1.0 - Self-Contained Runtime Release

This release turns the CloneCratesio operator workflow into a Windows desktop application with its own packaged runtime. It is a local release candidate intended to prove that the GUI can run without host-installed Python, Go, or Git.

---

## Highlights

### Self-Contained Runtime

The installer bundles Portable Git and the three CloneCratesio command binaries. The GUI uses bundled Git for `crates.io-index` clone/update and bundled Go binaries for mirror, sidecar, and extraction workflows.

### Preset and Advanced Operation

The main workflow keeps efficient defaults visible while exposing advanced settings for concurrency, limits, retry behavior, bundle mode, logging, metrics, verification, and output paths.

### Release Gate and Runtime Self-Test

The project now includes a release gate plus an isolated bundled-runtime self-test. The test strips the process path to bundled resources and Windows system folders, then verifies Git HTTPS, dry-run, limited download, sidecar JSONL, bundle creation, and extraction.

---

## What This Release Improves

CloneCratesio was already strong as a command-line pipeline. This release makes the toolchain approachable for Windows users who should not have to assemble Python, Go, Git, source folders, and command invocations before starting.

---

## Design Boundaries

CloneCratesGUI v0.1.0 intentionally does not:

- Replace the authoritative CloneCratesio CLI source in `D:\CTS\CloneCratesio`.
- Claim public production readiness before clean-machine install/uninstall verification.
- Include code signing.
- Attempt macOS or Linux packaging.
- Host, serve, or publish a crates.io mirror.

---

## Built With

- Tauri 2.
- Rust backend commands.
- React 19.
- TypeScript.
- Vite.
- Tailwind CSS.
- CloneCratesio `1.1.0` command binaries.
- Portable Git for Windows `2.55.0.windows.3`.
- WiX MSI and NSIS installer outputs.

---

## Release Artifact

Expected installers:

- `CloneCratesGUI_0.1.0_x64_en-US.msi`
- `CloneCratesGUI_0.1.0_x64-setup.exe`

SHA-256:

- MSI: `3AE83EC0057DF66D39620888D4251161178BF88C6142DD5B2772375AD8CA0CC9`
- NSIS: `E79DEE7C0FBEF615AF3E84B84F6A00F454D2AB7E1B05C2F3213C94E4B3E01A81`

Signing status:

- Unsigned. Windows may show an unknown publisher warning.

Clean-machine install/uninstall status:

- Pending Windows Sandbox or VM verification.
