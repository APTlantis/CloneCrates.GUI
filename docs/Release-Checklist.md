# CloneCratesGUI Release Checklist

This checklist is the DRS release gate record for CloneCratesGUI. Run `scripts/release-gate.ps1` before treating any installer as releasable.

## Pre-Release Gates

### Build

- [ ] Clean checkout restores dependencies.
- [ ] `pnpm run lint` passes.
- [ ] `cargo check` passes.
- [ ] `pnpm tauri build` completes.
- [ ] Windows x64 MSI and NSIS installers are produced.

### Tests

- [ ] Copied CloneCratesio payload passes `go test ./...`.
- [ ] Bundled runtime self-test passes.
- [ ] Bundled Git can reach `crates.io-index` over HTTPS.
- [ ] Limited loose download succeeds.
- [ ] Sidecar JSONL generation succeeds.
- [ ] Bundle creation succeeds.
- [ ] Bundle extraction succeeds.

### Data Safety

- [ ] Default mirror paths are visible before execution.
- [ ] Dry-run is available and verified.
- [ ] Existing files are trusted by default unless `verify-existing` is selected.
- [ ] Extraction overwrite is opt-in.
- [ ] Installer install/uninstall data safety is verified in clean Windows Sandbox or VM before public distribution.

### Security / Trust

- [ ] README and release note state unsigned status.
- [ ] Trust and dependency provenance document is updated.
- [ ] Bundled Git source/version is recorded.
- [ ] No production security claim is made without review.

### Artifacts

- [ ] Installer artifact names are recorded.
- [ ] SHA-256 hashes are recorded in this checklist.
- [ ] SHA-256 hashes are recorded in the release note.
- [ ] SHA-256 hashes are recorded in the manifest.
- [ ] Evidence folder contains `filehash.txt`.
- [ ] Docs are included in the Tauri resources.

## v0.1.0 win-x64 Verification

- Package target: `src-tauri\target\release\bundle\msi\CloneCratesGUI_0.1.0_x64_en-US.msi`
- Package target: `src-tauri\target\release\bundle\nsis\CloneCratesGUI_0.1.0_x64-setup.exe`
- Package size: `PENDING_RELEASE_GATE`
- SHA-256: `PENDING_RELEASE_GATE`
- Signing: unsigned
- Build result: pending final release gate
- Test result: pending final release gate
- Install result: clean-machine install/uninstall pending
- Data safety: installer uninstall behavior pending clean-machine check
- Public release: not planned until clean-machine verification is recorded
