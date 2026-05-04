use std::collections::{HashMap, HashSet};
use std::fs::{self, File};
use std::io::{Read, Seek, Write};
use std::path::{Path, PathBuf};
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

    let output = Path::new(output_path);
    let partial_path = unique_partial_backup_path(output);
    let result = write_backup_archive(base, &partial_path)
        .and_then(|_| replace_backup_file(&partial_path, output));
    if result.is_err() {
        let _ = fs::remove_file(&partial_path);
    }
    result.map(|_| output_path.to_string())
}

fn write_backup_archive(base: &Path, output_path: &Path) -> Result<(), String> {
    let db_path = base.join("library.db");
    let output_file = File::create(output_path)
        .map_err(|error| format!("Unable to create backup file. {}", error))?;
    let mut zip = ZipWriter::new(output_file);
    let options = FileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);

    let mut manifest_files: Vec<BackupFile> = Vec::new();
    add_file_to_zip(
        &mut zip,
        &db_path,
        "library.db",
        options,
        &mut manifest_files,
    )?;
    for sidecar in ["library.db-wal", "library.db-shm"] {
        let sidecar_path = base.join(sidecar);
        if sidecar_path.exists() {
            add_file_to_zip(
                &mut zip,
                &sidecar_path,
                sidecar,
                options,
                &mut manifest_files,
            )?;
        }
    }

    let folders = ["library", "articles"];
    for folder in folders {
        let folder_path = base.join(folder);
        if !folder_path.exists() {
            continue;
        }
        for entry_result in WalkDir::new(&folder_path).into_iter() {
            let entry = entry_result
                .map_err(|error| format!("Unable to read backup folder {}. {}", folder, error))?;
            if !entry.file_type().is_file() {
                continue;
            }
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

    Ok(())
}

fn replace_backup_file(partial_path: &Path, output_path: &Path) -> Result<(), String> {
    if output_path.is_dir() {
        return Err("Unable to finalize backup file. Target path is a directory.".into());
    }
    if !output_path.exists() {
        return fs::rename(partial_path, output_path)
            .map_err(|error| format!("Unable to finalize backup file. {}", error));
    }

    let replaced_target = unique_replaced_path(output_path);
    fs::rename(output_path, &replaced_target).map_err(|error| {
        format!(
            "Unable to prepare existing backup for replacement. {}",
            error
        )
    })?;

    match fs::rename(partial_path, output_path) {
        Ok(()) => {
            let _ = fs::remove_file(&replaced_target);
            Ok(())
        }
        Err(error) => {
            let _ = fs::rename(&replaced_target, output_path);
            Err(format!("Unable to finalize backup file. {}", error))
        }
    }
}

pub fn restore_backup(backup_path: &str, target_path: &str) -> Result<(), String> {
    let file = File::open(backup_path)
        .map_err(|error| format!("Unable to open backup file. {}", error))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|error| format!("Backup file is not a valid zip. {}", error))?;

    let manifest: BackupManifest = {
        let mut manifest_entry = archive
            .by_name("manifest.json")
            .map_err(|_| "Backup is missing manifest.json.".to_string())?;
        let mut manifest_json = String::new();
        manifest_entry
            .read_to_string(&mut manifest_json)
            .map_err(|error| format!("Unable to read manifest.json. {}", error))?;
        serde_json::from_str(&manifest_json)
            .map_err(|error| format!("Unable to parse manifest.json. {}", error))?
    };

    let mut manifest_map: HashMap<String, BackupFile> = HashMap::new();
    for entry in manifest.files.iter() {
        if !is_safe_path(Path::new(&entry.path)) {
            return Err(format!("Unsafe path in manifest: {}", entry.path));
        }
        if manifest_map.contains_key(&entry.path) {
            return Err(format!("Duplicate file in manifest: {}", entry.path));
        }
        manifest_map.insert(entry.path.clone(), entry.clone());
    }

    fs::create_dir_all(target_path)
        .map_err(|error| format!("Unable to create target folder. {}", error))?;

    let target_base = Path::new(target_path);
    let staging_base = unique_restore_staging_path(target_base);
    fs::create_dir_all(&staging_base)
        .map_err(|error| format!("Unable to create restore staging folder. {}", error))?;

    let restore_result = stage_and_commit_restore(
        &mut archive,
        &manifest,
        &manifest_map,
        target_base,
        &staging_base,
    );
    if restore_result.is_err() {
        let _ = fs::remove_dir_all(&staging_base);
    }
    restore_result
}

fn stage_and_commit_restore<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    manifest: &BackupManifest,
    manifest_map: &HashMap<String, BackupFile>,
    target_base: &Path,
    staging_base: &Path,
) -> Result<(), String> {
    let mut seen: HashSet<String> = HashSet::new();

    for index in 0..archive.len() {
        let mut zip_entry = archive
            .by_index(index)
            .map_err(|error| format!("Unable to read backup entry. {}", error))?;
        let name = zip_entry.name().to_string();
        if name.ends_with('/') || name == "manifest.json" {
            continue;
        }
        let rel_path = Path::new(&name);
        if !is_safe_path(rel_path) {
            return Err(format!("Unsafe path in backup: {}", name));
        }
        let expected = manifest_map
            .get(&name)
            .ok_or_else(|| format!("File {} is not listed in manifest.", name))?;
        if !seen.insert(name.clone()) {
            return Err(format!("Duplicate file in backup: {}", name));
        }

        let staged_target = staging_base.join(rel_path);
        if let Some(parent) = staged_target.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Unable to create folder. {}", error))?;
        }
        let mut output = File::create(&staged_target)
            .map_err(|error| format!("Unable to write file {}. {}", name, error))?;

        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];
        let mut copied_bytes = 0u64;
        loop {
            let read_bytes = zip_entry
                .read(&mut buffer)
                .map_err(|error| format!("Unable to read file {}. {}", name, error))?;
            if read_bytes == 0 {
                break;
            }
            output
                .write_all(&buffer[..read_bytes])
                .map_err(|error| format!("Unable to write file {}. {}", name, error))?;
            hasher.update(&buffer[..read_bytes]);
            copied_bytes += read_bytes as u64;
        }

        let hash = hex::encode(hasher.finalize());
        if expected.hash != hash {
            return Err(format!("Hash mismatch for {}.", name));
        }
        if expected.size != copied_bytes {
            return Err(format!("Size mismatch for {}.", name));
        }
    }

    for entry in manifest.files.iter() {
        if !seen.contains(&entry.path) {
            return Err(format!("Missing file from backup: {}", entry.path));
        }
    }

    preflight_restore_targets(manifest, target_base)?;
    preflight_stale_database_sidecars(manifest, target_base)?;

    for entry in manifest.files.iter() {
        let rel_path = Path::new(&entry.path);
        let staged_target = staging_base.join(rel_path);
        let final_target = target_base.join(rel_path);
        if let Some(parent) = final_target.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Unable to create folder. {}", error))?;
        }
        replace_with_staged_file(&staged_target, &final_target, &entry.path)?;
    }
    remove_stale_database_sidecars(manifest, target_base)?;

    let _ = fs::remove_dir_all(staging_base);
    Ok(())
}

fn preflight_restore_targets(manifest: &BackupManifest, target_base: &Path) -> Result<(), String> {
    for entry in manifest.files.iter() {
        let rel_path = Path::new(&entry.path);
        let final_target = target_base.join(rel_path);
        if final_target.is_dir() {
            return Err(format!(
                "Unable to replace directory with file {}.",
                entry.path
            ));
        }
        if let Some(parent) = final_target.parent() {
            if parent.exists() && !parent.is_dir() {
                return Err(format!(
                    "Unable to restore file {} because its parent is not a folder.",
                    entry.path
                ));
            }
        }
    }
    Ok(())
}

fn preflight_stale_database_sidecars(
    manifest: &BackupManifest,
    target_base: &Path,
) -> Result<(), String> {
    if !manifest
        .files
        .iter()
        .any(|entry| entry.path == "library.db")
    {
        return Ok(());
    }

    for sidecar in ["library.db-wal", "library.db-shm"] {
        if manifest.files.iter().any(|entry| entry.path == sidecar) {
            continue;
        }
        let target = target_base.join(sidecar);
        if target.is_dir() {
            return Err(format!(
                "Unable to remove stale database sidecar {} because it is a directory.",
                sidecar
            ));
        }
    }

    Ok(())
}

fn remove_stale_database_sidecars(
    manifest: &BackupManifest,
    target_base: &Path,
) -> Result<(), String> {
    if !manifest
        .files
        .iter()
        .any(|entry| entry.path == "library.db")
    {
        return Ok(());
    }

    for sidecar in ["library.db-wal", "library.db-shm"] {
        if manifest.files.iter().any(|entry| entry.path == sidecar) {
            continue;
        }
        let target = target_base.join(sidecar);
        if target.exists() {
            fs::remove_file(&target).map_err(|error| {
                format!(
                    "Unable to remove stale database sidecar {}. {}",
                    sidecar, error
                )
            })?;
        }
    }

    Ok(())
}

fn replace_with_staged_file(
    staged_target: &Path,
    final_target: &Path,
    rel_path: &str,
) -> Result<(), String> {
    if final_target.is_dir() {
        return Err(format!(
            "Unable to replace directory with file {}.",
            rel_path
        ));
    }
    if !final_target.exists() {
        return fs::rename(staged_target, final_target)
            .map_err(|error| format!("Unable to restore file {}. {}", rel_path, error));
    }

    let replaced_target = unique_replaced_path(final_target);
    fs::rename(final_target, &replaced_target).map_err(|error| {
        format!(
            "Unable to prepare file {} for replacement. {}",
            rel_path, error
        )
    })?;

    match fs::rename(staged_target, final_target) {
        Ok(()) => {
            let _ = fs::remove_file(&replaced_target);
            Ok(())
        }
        Err(error) => {
            let _ = fs::rename(&replaced_target, final_target);
            Err(format!("Unable to restore file {}. {}", rel_path, error))
        }
    }
}

fn unique_restore_staging_path(target_base: &Path) -> PathBuf {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos().to_string())
        .unwrap_or_else(|_| "0".to_string());
    target_base.join(format!(
        ".restore-staging-{}-{}",
        std::process::id(),
        suffix
    ))
}

fn unique_replaced_path(final_target: &Path) -> PathBuf {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos().to_string())
        .unwrap_or_else(|_| "0".to_string());
    let file_name = final_target
        .file_name()
        .map(|name| name.to_string_lossy())
        .unwrap_or_else(|| "file".into());
    final_target.with_file_name(format!(
        ".restore-replaced-{}-{}-{}",
        std::process::id(),
        suffix,
        file_name
    ))
}

fn unique_partial_backup_path(output_path: &Path) -> PathBuf {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos().to_string())
        .unwrap_or_else(|_| "0".to_string());
    let file_name = output_path
        .file_name()
        .map(|name| name.to_string_lossy())
        .unwrap_or_else(|| "backup.zip".into());
    output_path.with_file_name(format!(
        ".partial-backup-{}-{}-{}",
        std::process::id(),
        suffix,
        file_name
    ))
}

fn add_file_to_zip<W: Write + Seek>(
    zip: &mut ZipWriter<W>,
    full_path: &Path,
    rel_path: &str,
    options: FileOptions,
    manifest: &mut Vec<BackupFile>,
) -> Result<(), String> {
    let mut file =
        File::open(full_path).map_err(|error| format!("Unable to open {}. {}", rel_path, error))?;
    let metadata = file
        .metadata()
        .map_err(|error| format!("Unable to stat {}. {}", rel_path, error))?;

    zip.start_file(rel_path, options)
        .map_err(|error| format!("Unable to add {} to backup. {}", rel_path, error))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let read_bytes = file
            .read(&mut buffer)
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
        if matches!(
            component,
            std::path::Component::ParentDir
                | std::path::Component::RootDir
                | std::path::Component::Prefix(_)
        ) {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn write_file(path: &Path, contents: &[u8]) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("create parent directory");
        }
        fs::write(path, contents).expect("write file");
    }

    fn write_backup_zip(backup_path: &Path, files: Vec<(&str, &[u8])>) {
        let file = File::create(backup_path).expect("create backup file");
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);
        let manifest = BackupManifest {
            version: 1,
            created_at: "0".into(),
            files: files
                .iter()
                .map(|(path, payload)| BackupFile {
                    path: (*path).into(),
                    hash: hex::encode(Sha256::digest(payload)),
                    size: payload.len() as u64,
                })
                .collect(),
        };

        for (path, payload) in files {
            zip.start_file(path, options).expect("write file entry");
            zip.write_all(payload).expect("write payload");
        }
        zip.start_file("manifest.json", options)
            .expect("write manifest entry");
        zip.write_all(
            serde_json::to_string_pretty(&manifest)
                .expect("serialize manifest")
                .as_bytes(),
        )
        .expect("write manifest");
        zip.finish().expect("finish zip");
    }

    #[test]
    fn export_and_restore_round_trip_preserves_library_files() {
        let source_dir = tempdir().expect("create source tempdir");
        let restore_dir = tempdir().expect("create restore tempdir");
        let backup_dir = tempdir().expect("create backup tempdir");
        let library_root = source_dir.path();

        write_file(&library_root.join("library.db"), b"sqlite-bytes");
        write_file(&library_root.join("library.db-wal"), b"wal-bytes");
        write_file(&library_root.join("library.db-shm"), b"shm-bytes");
        write_file(&library_root.join("library/book.pdf"), b"%PDF sample");
        write_file(
            &library_root.join("articles/article.html"),
            b"<article>hello</article>",
        );

        let backup_path = backup_dir.path().join("library-backup.zip");
        export_backup(
            library_root.to_str().expect("source path utf8"),
            backup_path.to_str().expect("backup path utf8"),
        )
        .expect("export backup");

        restore_backup(
            backup_path.to_str().expect("backup path utf8"),
            restore_dir.path().to_str().expect("restore path utf8"),
        )
        .expect("restore backup");

        assert_eq!(
            fs::read(restore_dir.path().join("library.db")).expect("read restored db"),
            b"sqlite-bytes"
        );
        assert_eq!(
            fs::read(restore_dir.path().join("library.db-wal")).expect("read restored wal"),
            b"wal-bytes"
        );
        assert_eq!(
            fs::read(restore_dir.path().join("library.db-shm")).expect("read restored shm"),
            b"shm-bytes"
        );
        assert_eq!(
            fs::read(restore_dir.path().join("library/book.pdf")).expect("read restored pdf"),
            b"%PDF sample"
        );
        assert_eq!(
            fs::read(restore_dir.path().join("articles/article.html"))
                .expect("read restored article"),
            b"<article>hello</article>"
        );
    }

    #[test]
    fn restore_backup_rejects_unsafe_paths() {
        let backup_dir = tempdir().expect("create backup tempdir");
        let restore_dir = tempdir().expect("create restore tempdir");
        let backup_path = backup_dir.path().join("unsafe.zip");

        let file = File::create(&backup_path).expect("create backup file");
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        let payload = b"owned";
        let hash = hex::encode(Sha256::digest(payload));
        let manifest = BackupManifest {
            version: 1,
            created_at: "0".into(),
            files: vec![BackupFile {
                path: "../evil.txt".into(),
                hash,
                size: payload.len() as u64,
            }],
        };

        zip.start_file("../evil.txt", options)
            .expect("write unsafe file entry");
        zip.write_all(payload).expect("write payload");
        zip.start_file("manifest.json", options)
            .expect("write manifest entry");
        zip.write_all(
            serde_json::to_string_pretty(&manifest)
                .expect("serialize manifest")
                .as_bytes(),
        )
        .expect("write manifest");
        zip.finish().expect("finish zip");

        let error = restore_backup(
            backup_path.to_str().expect("backup path utf8"),
            restore_dir.path().to_str().expect("restore path utf8"),
        )
        .expect_err("unsafe backup should fail");

        assert!(error.contains("Unsafe path"), "unexpected error: {error}");
    }

    #[test]
    fn restore_backup_does_not_overwrite_existing_files_when_validation_fails() {
        let backup_dir = tempdir().expect("create backup tempdir");
        let restore_dir = tempdir().expect("create restore tempdir");
        let backup_path = backup_dir.path().join("corrupt.zip");

        write_file(&restore_dir.path().join("library.db"), b"original-db");

        let file = File::create(&backup_path).expect("create backup file");
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        let payload = b"corrupt-db";
        let manifest = BackupManifest {
            version: 1,
            created_at: "0".into(),
            files: vec![BackupFile {
                path: "library.db".into(),
                hash: hex::encode(Sha256::digest(b"expected-db")),
                size: payload.len() as u64,
            }],
        };

        zip.start_file("library.db", options)
            .expect("write db entry");
        zip.write_all(payload).expect("write db payload");
        zip.start_file("manifest.json", options)
            .expect("write manifest entry");
        zip.write_all(
            serde_json::to_string_pretty(&manifest)
                .expect("serialize manifest")
                .as_bytes(),
        )
        .expect("write manifest");
        zip.finish().expect("finish zip");

        let error = restore_backup(
            backup_path.to_str().expect("backup path utf8"),
            restore_dir.path().to_str().expect("restore path utf8"),
        )
        .expect_err("corrupt backup should fail");

        assert!(error.contains("Hash mismatch"), "unexpected error: {error}");
        assert_eq!(
            fs::read(restore_dir.path().join("library.db")).expect("read original db"),
            b"original-db"
        );
        let leaked_staging = fs::read_dir(restore_dir.path())
            .expect("read restore dir")
            .filter_map(Result::ok)
            .any(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with(".restore-staging-")
            });
        assert!(
            !leaked_staging,
            "restore staging folder should be cleaned up"
        );
    }

    #[test]
    fn restore_backup_does_not_start_commit_when_later_target_is_directory() {
        let backup_dir = tempdir().expect("create backup tempdir");
        let restore_dir = tempdir().expect("create restore tempdir");
        let backup_path = backup_dir.path().join("directory-collision.zip");

        write_file(&restore_dir.path().join("library.db"), b"original-db");
        fs::create_dir_all(restore_dir.path().join("library/book.pdf"))
            .expect("create directory collision");

        let file = File::create(&backup_path).expect("create backup file");
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        let db_payload = b"restored-db";
        let file_payload = b"%PDF restored";
        let manifest = BackupManifest {
            version: 1,
            created_at: "0".into(),
            files: vec![
                BackupFile {
                    path: "library.db".into(),
                    hash: hex::encode(Sha256::digest(db_payload)),
                    size: db_payload.len() as u64,
                },
                BackupFile {
                    path: "library/book.pdf".into(),
                    hash: hex::encode(Sha256::digest(file_payload)),
                    size: file_payload.len() as u64,
                },
            ],
        };

        zip.start_file("library.db", options)
            .expect("write db entry");
        zip.write_all(db_payload).expect("write db payload");
        zip.start_file("library/book.pdf", options)
            .expect("write file entry");
        zip.write_all(file_payload).expect("write file payload");
        zip.start_file("manifest.json", options)
            .expect("write manifest entry");
        zip.write_all(
            serde_json::to_string_pretty(&manifest)
                .expect("serialize manifest")
                .as_bytes(),
        )
        .expect("write manifest");
        zip.finish().expect("finish zip");

        let error = restore_backup(
            backup_path.to_str().expect("backup path utf8"),
            restore_dir.path().to_str().expect("restore path utf8"),
        )
        .expect_err("directory collision should fail");

        assert!(
            error.contains("Unable to replace directory"),
            "unexpected error: {error}"
        );
        assert_eq!(
            fs::read(restore_dir.path().join("library.db")).expect("read original db"),
            b"original-db"
        );
        assert!(
            restore_dir.path().join("library/book.pdf").is_dir(),
            "directory collision should remain unchanged"
        );
    }

    #[test]
    fn restore_backup_removes_stale_database_sidecars_when_backup_has_none() {
        let backup_dir = tempdir().expect("create backup tempdir");
        let restore_dir = tempdir().expect("create restore tempdir");
        let backup_path = backup_dir.path().join("no-sidecars.zip");

        write_file(&restore_dir.path().join("library.db"), b"original-db");
        write_file(&restore_dir.path().join("library.db-wal"), b"stale-wal");
        write_file(&restore_dir.path().join("library.db-shm"), b"stale-shm");
        write_backup_zip(&backup_path, vec![("library.db", b"restored-db")]);

        restore_backup(
            backup_path.to_str().expect("backup path utf8"),
            restore_dir.path().to_str().expect("restore path utf8"),
        )
        .expect("restore backup");

        assert_eq!(
            fs::read(restore_dir.path().join("library.db")).expect("read restored db"),
            b"restored-db"
        );
        assert!(
            !restore_dir.path().join("library.db-wal").exists(),
            "stale WAL sidecar should be removed"
        );
        assert!(
            !restore_dir.path().join("library.db-shm").exists(),
            "stale SHM sidecar should be removed"
        );
    }

    #[test]
    fn restore_backup_does_not_replace_db_when_stale_sidecar_is_directory() {
        let backup_dir = tempdir().expect("create backup tempdir");
        let restore_dir = tempdir().expect("create restore tempdir");
        let backup_path = backup_dir.path().join("sidecar-directory.zip");

        write_file(&restore_dir.path().join("library.db"), b"original-db");
        fs::create_dir_all(restore_dir.path().join("library.db-wal"))
            .expect("create stale sidecar directory");
        write_backup_zip(&backup_path, vec![("library.db", b"restored-db")]);

        let error = restore_backup(
            backup_path.to_str().expect("backup path utf8"),
            restore_dir.path().to_str().expect("restore path utf8"),
        )
        .expect_err("sidecar directory should fail");

        assert!(
            error.contains("Unable to remove stale database sidecar"),
            "unexpected error: {error}"
        );
        assert_eq!(
            fs::read(restore_dir.path().join("library.db")).expect("read original db"),
            b"original-db"
        );
        assert!(
            restore_dir.path().join("library.db-wal").is_dir(),
            "sidecar directory should remain unchanged"
        );
    }

    #[test]
    fn export_backup_cleans_partial_file_when_final_path_is_directory() {
        let source_dir = tempdir().expect("create source tempdir");
        let backup_dir = tempdir().expect("create backup tempdir");
        let library_root = source_dir.path();
        let output_path = backup_dir.path().join("existing-backup.zip");

        write_file(&library_root.join("library.db"), b"sqlite-bytes");
        fs::create_dir_all(&output_path).expect("create directory at output path");

        let error = export_backup(
            library_root.to_str().expect("source path utf8"),
            output_path.to_str().expect("backup path utf8"),
        )
        .expect_err("directory output path should fail");

        assert!(
            error.contains("Target path is a directory"),
            "unexpected error: {error}"
        );
        let leaked_partial = fs::read_dir(backup_dir.path())
            .expect("read backup dir")
            .filter_map(Result::ok)
            .any(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with(".partial-backup-")
            });
        assert!(!leaked_partial, "partial backup file should be cleaned up");
    }

    #[test]
    fn export_backup_requires_library_database() {
        let source_dir = tempdir().expect("create source tempdir");
        let backup_dir = tempdir().expect("create backup tempdir");
        write_file(&source_dir.path().join("library/book.pdf"), b"%PDF sample");

        let error = export_backup(
            source_dir.path().to_str().expect("source path utf8"),
            backup_dir
                .path()
                .join("missing-db.zip")
                .to_str()
                .expect("backup path utf8"),
        )
        .expect_err("missing database should fail");

        assert!(
            error.contains("library.db was not found"),
            "unexpected error: {error}"
        );
    }
}
