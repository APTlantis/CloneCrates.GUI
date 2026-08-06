use serde::Deserialize;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter, Manager};

fn clone_cratesio_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("CloneCratesio")
}

fn resource_bin_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().resource_dir().ok().map(|p| p.join("bin"))
}

fn src_tauri_resource_bin_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("bin")
}

fn resource_portable_git_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().resource_dir().ok().map(|p| p.join("portable-git"))
}

fn src_tauri_portable_git_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("portable-git")
}

fn resolve_tool_exe(app: &AppHandle, name: &str) -> PathBuf {
    let base = clone_cratesio_dir();
    let exe = format!("{name}.exe");
    let mut candidates = Vec::new();

    if let Some(resource_bin) = resource_bin_dir(app) {
        candidates.push(resource_bin.join(&exe));
    }
    candidates.extend([
        src_tauri_resource_bin_dir().join(&exe),
        base.join("cmd").join(name).join(format!("{name}.exe")),
        base.join("cmd").join(name).join("main.exe"),
        base.join("dist")
            .join("release-check")
            .join("CloneCratesio-v1.1.0-local-windows-amd64")
            .join(&exe),
    ]);

    candidates
        .into_iter()
        .find(|p| p.is_file())
        .unwrap_or_else(|| src_tauri_resource_bin_dir().join(exe))
}

fn portable_git_dir(app: &AppHandle) -> Option<PathBuf> {
    if let Some(dir) = resource_portable_git_dir(app) {
        if dir.join("cmd").join("git.exe").is_file() {
            return Some(dir);
        }
    }

    let dev_dir = src_tauri_portable_git_dir();
    if dev_dir.join("cmd").join("git.exe").is_file() {
        return Some(dev_dir);
    }

    None
}

fn resolve_git_exe(app: &AppHandle) -> String {
    if let Some(portable_git) = portable_git_dir(app) {
        let bundled = portable_git.join("cmd").join("git.exe");
        if bundled.is_file() {
            return bundled.to_string_lossy().to_string();
        }
    }
    "git".to_string()
}

fn configure_git_env(app: &AppHandle, cmd: &mut Command) {
    let Some(portable_git) = portable_git_dir(app) else {
        return;
    };

    let path_prefix = [
        portable_git.join("cmd"),
        portable_git.join("mingw64").join("bin"),
        portable_git.join("usr").join("bin"),
        portable_git.join("bin"),
    ];
    let mut path_parts: Vec<PathBuf> = path_prefix.into_iter().collect();
    if let Some(existing) = std::env::var_os("PATH") {
        path_parts.extend(std::env::split_paths(&existing));
    }
    if let Ok(joined) = std::env::join_paths(path_parts) {
        cmd.env("PATH", joined);
    }

    let exec_path = portable_git.join("mingw64").join("libexec").join("git-core");
    if exec_path.is_dir() {
        cmd.env("GIT_EXEC_PATH", exec_path);
    }

    let ca_info = portable_git
        .join("mingw64")
        .join("etc")
        .join("ssl")
        .join("certs")
        .join("ca-bundle.crt");
    if ca_info.is_file() {
        cmd.env("GIT_SSL_CAINFO", ca_info);
    }
}

fn emit_log(app: &AppHandle, event: &str, line: impl Into<String>) {
    let _ = app.emit(event, line.into());
}

/// Spawns `cmd`, streaming each stdout/stderr line to the frontend as `event`,
/// and returns the child's exit code once it completes.
fn stream_child(app: &AppHandle, event: &str, mut cmd: Command) -> Result<i32, String> {
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to start process: {e}"))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let out_handle = stdout.map(|s| {
        let app = app.clone();
        let event = event.to_string();
        std::thread::spawn(move || {
            for line in BufReader::new(s).lines().flatten() {
                let _ = app.emit(&event, line);
            }
        })
    });

    let err_handle = stderr.map(|s| {
        let app = app.clone();
        let event = event.to_string();
        std::thread::spawn(move || {
            for line in BufReader::new(s).lines().flatten() {
                let _ = app.emit(&event, line);
            }
        })
    });

    let status = child
        .wait()
        .map_err(|e| format!("process wait failed: {e}"))?;
    if let Some(h) = out_handle {
        let _ = h.join();
    }
    if let Some(h) = err_handle {
        let _ = h.join();
    }

    Ok(status.code().unwrap_or(-1))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloneIndexArgs {
    pub index_dir: String,
    pub output_dir: String,
    pub threads: u32,
    pub include_yanked: bool,
    pub verify_existing: bool,
    pub bundle: bool,
    pub bundle_mode: String,
    pub bundle_size_gb: u32,
    pub bundles_out: String,
    pub manifest: String,
    pub listen: String,
    pub skip_index_update: bool,
    pub dry_run: bool,
    pub base_url: Option<String>,
    pub limit: Option<u32>,
    pub timeout: Option<u32>,
    pub log_format: Option<String>,
    pub log_level: Option<String>,
    pub progress_interval: Option<String>,
    pub progress_every: Option<u32>,
    pub retries: Option<u32>,
    pub retry_base: Option<String>,
    pub retry_max: Option<String>,
    pub max_conns_per_host: Option<u32>,
    pub max_idle_conns: Option<u32>,
    pub max_idle_per_host: Option<u32>,
    pub idle_timeout: Option<String>,
    pub tls_timeout: Option<String>,
}

fn ensure_parent(path: &str) -> Result<(), String> {
    if path.trim().is_empty() {
        return Ok(());
    }
    let p = PathBuf::from(path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn ensure_dir(path: &str) -> Result<(), String> {
    if path.trim().is_empty() {
        return Ok(());
    }
    std::fs::create_dir_all(path).map_err(|e| e.to_string())
}

fn index_git_dir(index_dir: &str) -> PathBuf {
    Path::new(index_dir).join(".git")
}

fn clone_or_update_index(app: &AppHandle, args: &CloneIndexArgs) -> Result<i32, String> {
    let event = "clone-index://log";
    let git = resolve_git_exe(app);

    if index_git_dir(&args.index_dir).is_dir() {
        emit_log(app, event, format!("Crates.io index already exists at {}", args.index_dir));
        if args.skip_index_update {
            emit_log(app, event, "Skipping index update as requested");
            return Ok(0);
        }

        emit_log(app, event, "Updating crates.io index");
        let mut cmd = Command::new(git);
        configure_git_env(app, &mut cmd);
        cmd.arg("-C").arg(&args.index_dir).arg("pull").arg("--ff-only");
        return stream_child(app, event, cmd);
    }

    emit_log(app, event, format!("Cloning crates.io index to {}", args.index_dir));
    ensure_parent(&args.index_dir)?;
    let mut cmd = Command::new(git);
    configure_git_env(app, &mut cmd);
    cmd.arg("clone")
        .arg("https://github.com/rust-lang/crates.io-index.git")
        .arg(&args.index_dir);
    stream_child(app, event, cmd)
}

fn add_download_advanced_args(
    cmd: &mut Command,
    base_url: &Option<String>,
    limit: Option<u32>,
    timeout: Option<u32>,
    log_format: &Option<String>,
    log_level: &Option<String>,
    progress_interval: &Option<String>,
    progress_every: Option<u32>,
    retries: Option<u32>,
    retry_base: &Option<String>,
    retry_max: &Option<String>,
    max_conns_per_host: Option<u32>,
    max_idle_conns: Option<u32>,
    max_idle_per_host: Option<u32>,
    idle_timeout: &Option<String>,
    tls_timeout: &Option<String>,
) {
    if let Some(v) = base_url.as_deref().filter(|v| !v.trim().is_empty()) {
        cmd.arg("-crates-base-url").arg(v);
    }
    if let Some(v) = limit.filter(|v| *v > 0) {
        cmd.arg("-limit").arg(v.to_string());
    }
    if let Some(v) = timeout.filter(|v| *v > 0) {
        cmd.arg("-timeout").arg(v.to_string());
    }
    if let Some(v) = log_format.as_deref().filter(|v| !v.trim().is_empty()) {
        cmd.arg("-log-format").arg(v);
    }
    if let Some(v) = log_level.as_deref().filter(|v| !v.trim().is_empty()) {
        cmd.arg("-log-level").arg(v);
    }
    if let Some(v) = progress_interval.as_deref().filter(|v| !v.trim().is_empty()) {
        cmd.arg("-progress-interval").arg(v);
    }
    if let Some(v) = progress_every.filter(|v| *v > 0) {
        cmd.arg("-progress-every").arg(v.to_string());
    }
    if let Some(v) = retries {
        cmd.arg("-retries").arg(v.to_string());
    }
    if let Some(v) = retry_base.as_deref().filter(|v| !v.trim().is_empty()) {
        cmd.arg("-retry-base").arg(v);
    }
    if let Some(v) = retry_max.as_deref().filter(|v| !v.trim().is_empty()) {
        cmd.arg("-retry-max").arg(v);
    }
    if let Some(v) = max_conns_per_host.filter(|v| *v > 0) {
        cmd.arg("-max-conns-per-host").arg(v.to_string());
    }
    if let Some(v) = max_idle_conns.filter(|v| *v > 0) {
        cmd.arg("-max-idle-conns").arg(v.to_string());
    }
    if let Some(v) = max_idle_per_host.filter(|v| *v > 0) {
        cmd.arg("-max-idle-per-host").arg(v.to_string());
    }
    if let Some(v) = idle_timeout.as_deref().filter(|v| !v.trim().is_empty()) {
        cmd.arg("-idle-timeout").arg(v);
    }
    if let Some(v) = tls_timeout.as_deref().filter(|v| !v.trim().is_empty()) {
        cmd.arg("-tls-timeout").arg(v);
    }
}

/// Rust-native replacement for Clone-Index.py in the packaged GUI: it prepares
/// the workspace, updates the crates.io index, and launches bundled download-crates.
#[tauri::command]
pub async fn run_clone_index(app: AppHandle, args: CloneIndexArgs) -> Result<i32, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ensure_dir(&args.output_dir)?;
        if args.bundle {
            ensure_dir(&args.bundles_out)?;
        }
        ensure_parent(&args.manifest)?;

        let index_code = clone_or_update_index(&app, &args)?;
        if index_code != 0 {
            return Ok(index_code);
        }

        let mut cmd = Command::new(resolve_tool_exe(&app, "download-crates"));
        cmd.arg("-index-dir")
            .arg(&args.index_dir)
            .arg("-out")
            .arg(&args.output_dir)
            .arg("-concurrency")
            .arg(args.threads.to_string())
            .arg("-manifest")
            .arg(&args.manifest)
            .arg("-listen")
            .arg(&args.listen);
        if args.include_yanked {
            cmd.arg("-include-yanked");
        }
        if args.verify_existing {
            cmd.arg("-verify-existing");
        }
        if args.bundle {
            cmd.arg("-bundle")
                .arg("-bundle-mode")
                .arg(&args.bundle_mode)
                .arg("-bundle-size-gb")
                .arg(args.bundle_size_gb.to_string())
                .arg("-bundles-out")
                .arg(&args.bundles_out);
        }
        if args.dry_run {
            cmd.arg("-dry-run");
        }
        add_download_advanced_args(
            &mut cmd,
            &args.base_url,
            args.limit,
            args.timeout,
            &args.log_format,
            &args.log_level,
            &args.progress_interval,
            args.progress_every,
            args.retries,
            &args.retry_base,
            &args.retry_max,
            args.max_conns_per_host,
            args.max_idle_conns,
            args.max_idle_per_host,
            &args.idle_timeout,
            &args.tls_timeout,
        );
        stream_child(&app, "clone-index://log", cmd)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadCratesArgs {
    pub index_dir: String,
    pub out: String,
    pub concurrency: u32,
    pub include_yanked: bool,
    pub verify_existing: bool,
    pub manifest: String,
    pub bundle: bool,
    pub bundle_mode: String,
    pub bundle_size_gb: u32,
    pub bundles_out: String,
    pub listen: String,
    pub dry_run: bool,
    pub base_url: Option<String>,
    pub limit: Option<u32>,
    pub timeout: Option<u32>,
    pub log_format: Option<String>,
    pub log_level: Option<String>,
    pub progress_interval: Option<String>,
    pub progress_every: Option<u32>,
    pub retries: Option<u32>,
    pub retry_base: Option<String>,
    pub retry_max: Option<String>,
    pub max_conns_per_host: Option<u32>,
    pub max_idle_conns: Option<u32>,
    pub max_idle_per_host: Option<u32>,
    pub idle_timeout: Option<String>,
    pub tls_timeout: Option<String>,
}

/// Runs the `download-crates` Go binary directly, bypassing the Python wrapper
/// (e.g. for re-running a download without re-cloning/updating the index).
#[tauri::command]
pub async fn run_download_crates(app: AppHandle, args: DownloadCratesArgs) -> Result<i32, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new(resolve_tool_exe(&app, "download-crates"));
        cmd.arg("-index-dir")
            .arg(&args.index_dir)
            .arg("-out")
            .arg(&args.out)
            .arg("-concurrency")
            .arg(args.concurrency.to_string())
            .arg("-manifest")
            .arg(&args.manifest)
            .arg("-listen")
            .arg(&args.listen);
        if args.include_yanked {
            cmd.arg("-include-yanked");
        }
        if args.verify_existing {
            cmd.arg("-verify-existing");
        }
        if args.bundle {
            cmd.arg("-bundle")
                .arg("-bundle-mode")
                .arg(&args.bundle_mode)
                .arg("-bundle-size-gb")
                .arg(args.bundle_size_gb.to_string())
                .arg("-bundles-out")
                .arg(&args.bundles_out);
        }
        if args.dry_run {
            cmd.arg("-dry-run");
        }
        add_download_advanced_args(
            &mut cmd,
            &args.base_url,
            args.limit,
            args.timeout,
            &args.log_format,
            &args.log_level,
            &args.progress_interval,
            args.progress_every,
            args.retries,
            &args.retry_base,
            &args.retry_max,
            args.max_conns_per_host,
            args.max_idle_conns,
            args.max_idle_per_host,
            &args.idle_timeout,
            &args.tls_timeout,
        );
        stream_child(&app, "download-crates://log", cmd)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateSidecarsArgs {
    pub index_dir: String,
    pub out: String,
    pub output_mode: String,
    pub jsonl_out: String,
    pub include_yanked: bool,
    pub manifest: String,
    pub limit: u32,
    pub concurrency: Option<u32>,
    pub progress_interval: Option<String>,
    pub progress_every: Option<u32>,
    pub log_format: Option<String>,
    pub log_level: Option<String>,
    pub base_url: Option<String>,
}

#[tauri::command]
pub async fn run_generate_sidecars(
    app: AppHandle,
    args: GenerateSidecarsArgs,
) -> Result<i32, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new(resolve_tool_exe(&app, "generate-sidecars"));
        cmd.arg("-index-dir").arg(&args.index_dir);
        if args.output_mode == "jsonl" {
            cmd.arg("-output-mode")
                .arg("jsonl")
                .arg("-jsonl-out")
                .arg(&args.jsonl_out);
        } else {
            cmd.arg("-out").arg(&args.out);
        }
        if args.include_yanked {
            cmd.arg("-include-yanked");
        }
        if !args.manifest.is_empty() {
            cmd.arg("-manifest").arg(&args.manifest);
        }
        if args.limit > 0 {
            cmd.arg("-limit").arg(args.limit.to_string());
        }
        if let Some(v) = args.concurrency.filter(|v| *v > 0) {
            cmd.arg("-concurrency").arg(v.to_string());
        }
        if let Some(v) = args.progress_interval.as_deref().filter(|v| !v.trim().is_empty()) {
            cmd.arg("-progress-interval").arg(v);
        }
        if let Some(v) = args.progress_every.filter(|v| *v > 0) {
            cmd.arg("-progress-every").arg(v.to_string());
        }
        if let Some(v) = args.log_format.as_deref().filter(|v| !v.trim().is_empty()) {
            cmd.arg("-log-format").arg(v);
        }
        if let Some(v) = args.log_level.as_deref().filter(|v| !v.trim().is_empty()) {
            cmd.arg("-log-level").arg(v);
        }
        if let Some(v) = args.base_url.as_deref().filter(|v| !v.trim().is_empty()) {
            cmd.arg("-crates-base-url").arg(v);
        }
        stream_child(&app, "generate-sidecars://log", cmd)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractBundlesArgs {
    pub bundles_dir: String,
    pub out: String,
    pub pattern: String,
    pub overwrite: bool,
}

#[tauri::command]
pub async fn run_extract_bundles(app: AppHandle, args: ExtractBundlesArgs) -> Result<i32, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new(resolve_tool_exe(&app, "extract-bundles"));
        cmd.arg("-bundles-dir")
            .arg(&args.bundles_dir)
            .arg("-out")
            .arg(&args.out);
        if !args.pattern.is_empty() {
            cmd.arg("-pattern").arg(&args.pattern);
        }
        if args.overwrite {
            cmd.arg("-overwrite");
        }
        stream_child(&app, "extract-bundles://log", cmd)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Polls the download-crates `/api/status` endpoint (see Architecture.md Observability
/// section). `listen_addr` may be a bare port (`:9090`) or a full base URL.
#[tauri::command]
pub async fn fetch_download_status(listen_addr: String) -> Result<serde_json::Value, String> {
    let url = if listen_addr.starts_with("http://") || listen_addr.starts_with("https://") {
        format!("{}/api/status", listen_addr.trim_end_matches('/'))
    } else {
        format!(
            "http://127.0.0.1:{}/api/status",
            listen_addr.trim_start_matches(':')
        )
    };
    let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    resp.json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())
}
