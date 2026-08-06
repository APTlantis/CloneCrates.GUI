# CloneCratesGUI Project Proposal

Proposal readiness: `ready`

## Project Name

CloneCratesGUI

## Project Class or Type

Desktop application.

## WGS Lifecycle State

`release-prep`

## Project Theme

Self-contained desktop operation for CloneCratesio.

## Problem Statement

CloneCratesio has proven itself as an efficient command-line crates.io mirror pipeline, but its current operator path assumes the maintainer's local toolchain: Python, Git, Go-built binaries, source-tree paths, and command-line familiarity. That is fine for the original developer, but it is insufficient for a Windows user who simply wants to install a desktop tool, choose sane presets, and begin a mirror run without assembling the toolchain by hand.

## Mission Statement

CloneCratesGUI provides a local-first Windows desktop interface for the CloneCratesio mirror pipeline that packages the runtime pieces needed for normal operation, exposes efficient presets and documented advanced controls, and leaves a verifiable release record for every installer.

## Design Boundaries

In scope:

- Windows Tauri desktop application.
- Bundled CloneCratesio command binaries.
- Bundled Portable Git for `crates.io-index` clone/update.
- Preset and advanced controls for documented CLI workflows.
- Local release gates, hashes, and evidence.

Out of scope:

- Replacing the CloneCratesio CLI implementation.
- Hosting or serving a public crates.io mirror.
- Cross-platform installer support before Windows is stable.
- Cloud accounts, remote orchestration, telemetry collection, or SaaS behavior.

Explicit non-goals:

- Do not require Python, Go, or Git for end users.
- Do not silently delete mirror data, bundles, manifests, or sidecars.
- Do not claim public production readiness until a clean-machine install/uninstall pass is recorded.

## Success Criteria

- A Windows user can install the GUI and run a dry run without installing Python, Go, or Git.
- The GUI can clone or update `crates.io-index` using bundled Git.
- The GUI can run limited loose download, sidecar, bundle, and extraction workflows using bundled binaries.
- The release gate produces installer hashes and fails on meaningful regressions.
- Project intent, boundaries, and verification state can be recovered from repo documents.

## Failure Criteria

- The app requires host Python, Go, or Git for normal packaged operation.
- The app cannot run a bundled-runtime self-test.
- Installer hashes are missing or inconsistent across release records.
- The GUI hides important CloneCratesio settings behind undocumented behavior.
- The project drifts into modifying CloneCratesio engine behavior without updating the authoritative CLI repo.

## Operational Personas

- Operator: runs mirror workflows and monitors progress.
- Maintainer: refreshes bundled binaries, builds installers, and records release evidence.
- Agent: resumes work through manifests, proposal, release checklist, and scripts.
- Archivist: preserves mirror artifacts, manifests, sidecars, bundles, and release evidence.

## Technical Direction

- Frontend: React, TypeScript, Vite, Tailwind.
- Desktop shell: Tauri 2.
- Backend: Rust Tauri commands.
- Engine dependency: CloneCratesio Go binaries from `D:\CTS\CloneCratesio`.
- Index dependency: bundled Portable Git for Windows.
- Distribution: Windows MSI and NSIS installers.
- Governing standard: DRS, with WGS and PPS support.

## Constraints

- Local-first.
- Windows x64 first.
- End users should not need Python, Go, or Git.
- Do not mutate or delete user mirror data unless the operator explicitly chooses an overwrite mode.
- Keep release artifacts inspectable through hashes and evidence.
- Keep CLI source authority in `D:\CTS\CloneCratesio`.

## Risk Assessment

- Portable Git size increases installer size. Mitigation: keep full runtime until clone/update tests prove a safe trim list.
- Bundled CLI binaries can drift from authoritative source. Mitigation: rebuild from `D:\CTS\CloneCratesio` and run the release gate.
- Full crates.io index clone is slow and large. Mitigation: self-test supports `-KeepWorkRoot`; future work may add a fixture-mode fast test.
- Unsigned installers trigger Windows trust warnings. Mitigation: state unsigned status plainly until code signing exists.
- Long-running mirror jobs can consume large disk/network resources. Mitigation: presets, dry-run, visible paths, limits, and advanced controls.

## Roadmap

Phase 1: Runtime spine

- Bundle CloneCratesio binaries.
- Bundle Portable Git.
- Replace Python wrapper dependency with Rust orchestration.

Phase 2: Operator workflows

- Preserve efficient presets.
- Expose advanced flags.
- Stream logs and status.

Phase 3: Verification

- Add bundled-runtime self-test.
- Add release gate.
- Record hashes and release evidence.

Phase 4: Release readiness

- Move under `D:\DRS`.
- Complete DRS/PPS/WGS documentation.
- Validate installer on clean Windows Sandbox or VM.

## Entity-Named Manifest

`CloneCratesGUI.manifest.toml`

## Governing Standard

Primary: DRS.

Supporting: WGS and PPS.
