# CloneCratesGUI Instructions

Inherit the parent portfolio and drive instructions when located under `D:\DRS`.

## Read first

1. `CloneCratesGUI.manifest.toml`
2. `Project-README.md`
3. `README.md`
4. `docs/Project-Proposal.md`
5. `docs/Release-Checklist.md`
6. `docs/Trust-and-Dependency-Provenance.md`

## Local boundaries

CloneCratesGUI is a Tauri desktop operator console for the CloneCratesio CLI toolchain. It may bundle release-built CloneCratesio binaries and Portable Git so Windows users do not need Python, Go, or Git installed.

Keep `D:\CTS\CloneCratesio` as the authoritative CLI source. Rebuild bundled binaries from that repo, then verify this GUI with `scripts\release-gate.ps1`.

Do not claim release readiness unless the gate has passed and the installer hashes in the manifest, release note, checklist, and evidence folder agree.
