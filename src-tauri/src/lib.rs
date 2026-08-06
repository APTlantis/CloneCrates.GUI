mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::run_clone_index,
      commands::run_download_crates,
      commands::run_generate_sidecars,
      commands::run_extract_bundles,
      commands::fetch_download_status,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
