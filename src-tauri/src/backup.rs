use std::collections::{HashMap, HashSet};
use std::fs::{self, File};
use std::io::{Read, Seek, Write};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use walkdir::WalkDir;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

#[derive(Debug, Serialize, Deserialize)]
struct BackupManifest {
  version: u32,
  created_at: String,
  files: Vec<BackupFile>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct BackupFile {
  path: String,
  hash: String,
  size: u64,
}

pub fn export_backup(library_path: &str, output_path: &str) -> Result<String, String> {
  let base = Path::new(library_path);
  if !base.exists() {
    return Err("Library path does not exist.".into());
  }
  let db_path = base.join("library.db");
  if !db_path.exists() {
    return Err("library.db was not found in the library folder.".into());
  }

  let output_file = File::create(output_path)
    .map_err(|error| format!("Unable to create backup file. {}", error))?;
  let mut zip = ZipWriter::new(output_file);
  let options = FileOptions::default()
    .compression_method(CompressionMethod::Deflated)
    .unix_permissions(0o644);

  let mut manifest_files: Vec<BackupFile> = Vec::new();
  add_file_to_zip(&mut zip, &db_path, "library.db", options, &mut manifest_files)?;

  let folders = ["library", "articles"];
  for folder in folders {
    let folder_path = base.join(folder);
    if !folder_path.exists() {
      continue;
    }
    for entry in WalkDir::new(&folder_path)
      .into_iter()
      .filter_map(Result::ok)
      .filter(|entry| entry.file_type().is_file())
    {
      let full_path = entry.path();
      let rel_path = relative_zip_path(base, full_path)?;
      add_file_to_zip(&mut zip, full_path, &rel_path, options, &mut manifest_files)?;
    }
  }

  let created_at = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_secs().to_string())
    .unwrap_or_else(|_| "0".to_string());

  let manifest = BackupManifest {
    version: 1,
    created_at,
    files: manifest_files,
  };
  let manifest_json = serde_json::to_string_pretty(&manifest)
    .map_err(|error| format!("Unable to serialize manifest. {}", error))?;

  zip.start_file("manifest.json", options)
    .map_err(|error| format!("Unable to write manifest. {}", error))?;
  zip.write_all(manifest_json.as_bytes())
    .map_err(|error| format!("Unable to write manifest. {}", error))?;

  zip.finish()
    .map_err(|error| format!("Unable to finalize backup. {}", error))?;

  Ok(output_path.to_string())
}

pub fn restore_backup(backup_path: &str, target_path: &str) -> Result<(), String> {
  let file = File::open(backup_path)
    .map_err(|error| format!("Unable to open backup file. {}", error))?;
  let mut archive = ZipArchive::new(file)
    .map_err(|error| format!("Backup file is not a valid zip. {}", error))?;

  let manifest: BackupManifest = {
    let mut manifest_entry = archive.by_name("manifest.json")
      .map_err(|_| "Backup is missing manifest.json.".to_string())?;
    let mut manifest_json = String::new();
    manifest_entry.read_to_string(&mut manifest_json)
      .map_err(|error| format!("Unable to read manifest.json. {}", error))?;
    serde_json::from_str(&manifest_json)
      .map_err(|error| format!("Unable to parse manifest.json. {}", error))?
  };

  let mut manifest_map: HashMap<String, BackupFile> = HashMap::new();
  for entry in manifest.files.iter() {
    manifest_map.insert(entry.path.clone(), entry.clone());
  }

  fs::create_dir_all(target_path)
    .map_err(|error| format!("Unable to create target folder. {}", error))?;

  let mut seen: HashSet<String> = HashSet::new();

  for index in 0..archive.len() {
    let mut entry = archive.by_index(index)
      .map_err(|error| format!("Unable to read backup entry. {}", error))?;
    let name = entry.name().to_string();
    if name.ends_with('/') || name == "manifest.json" {
      continue;
    }
    let rel_path = Path::new(&name);
    if !is_safe_path(rel_path) {
      return Err(format!("Unsafe path in backup: {}", name));
    }
    let target = Path::new(target_path).join(rel_path);
    if let Some(parent) = target.parent() {
      fs::create_dir_all(parent)
        .map_err(|error| format!("Unable to create folder. {}", error))?;
    }
    let mut output = File::create(&target)
      .map_err(|error| format!("Unable to write file {}. {}", name, error))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
      let read_bytes = entry.read(&mut buffer)
        .map_err(|error| format!("Unable to read file {}. {}", name, error))?;
      if read_bytes == 0 {
        break;
      }
      output.write_all(&buffer[..read_bytes])
        .map_err(|error| format!("Unable to write file {}. {}", name, error))?;
      hasher.update(&buffer[..read_bytes]);
    }

    let hash = hex::encode(hasher.finalize());
    if let Some(expected) = manifest_map.get(&name) {
      if expected.hash != hash {
        return Err(format!("Hash mismatch for {}.", name));
      }
    } else {
      return Err(format!("File {} is not listed in manifest.", name));
    }
    seen.insert(name);
  }

  for entry in manifest.files.iter() {
    if !seen.contains(&entry.path) {
      return Err(format!("Missing file from backup: {}", entry.path));
    }
  }

  Ok(())
}

fn add_file_to_zip<W: Write + Seek>(
  zip: &mut ZipWriter<W>,
  full_path: &Path,
  rel_path: &str,
  options: FileOptions,
  manifest: &mut Vec<BackupFile>,
) -> Result<(), String> {
  let mut file = File::open(full_path)
    .map_err(|error| format!("Unable to open {}. {}", rel_path, error))?;
  let metadata = file.metadata()
    .map_err(|error| format!("Unable to stat {}. {}", rel_path, error))?;

  zip.start_file(rel_path, options)
    .map_err(|error| format!("Unable to add {} to backup. {}", rel_path, error))?;

  let mut hasher = Sha256::new();
  let mut buffer = [0u8; 8192];
  loop {
    let read_bytes = file.read(&mut buffer)
      .map_err(|error| format!("Unable to read {}. {}", rel_path, error))?;
    if read_bytes == 0 {
      break;
    }
    zip.write_all(&buffer[..read_bytes])
      .map_err(|error| format!("Unable to write {}. {}", rel_path, error))?;
    hasher.update(&buffer[..read_bytes]);
  }

  let hash = hex::encode(hasher.finalize());
  manifest.push(BackupFile {
    path: rel_path.to_string(),
    hash,
    size: metadata.len(),
  });
  Ok(())
}

fn relative_zip_path(base: &Path, full_path: &Path) -> Result<String, String> {
  let rel_path = full_path
    .strip_prefix(base)
    .map_err(|_| "Unable to compute backup path.".to_string())?;
  Ok(rel_path.to_string_lossy().replace('\\', "/"))
}

fn is_safe_path(path: &Path) -> bool {
  if path.is_absolute() {
    return false;
  }
  for component in path.components() {
    if matches!(component, std::path::Component::ParentDir | std::path::Component::RootDir | std::path::Component::Prefix(_)) {
      return false;
    }
  }
  true
}
