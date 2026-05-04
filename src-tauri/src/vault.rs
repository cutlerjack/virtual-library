use std::fs;
use std::io;
use std::path::{Component, Path};

pub fn remove_import_staging_file(library_path: &str, candidate_path: &str) -> Result<(), String> {
    let library = Path::new(library_path);
    let candidate = Path::new(candidate_path);
    if library.as_os_str().is_empty() || candidate.as_os_str().is_empty() {
        return Err("Missing library path or staging file path.".into());
    }
    if candidate
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return Err("Refusing to remove non-staging import file.".into());
    }

    let staging_dir = library.join(".staging").join("imports");
    if candidate.parent() != Some(staging_dir.as_path()) || candidate.file_name().is_none() {
        return Err("Refusing to remove non-staging import file.".into());
    }
    let canonical_library = fs::canonicalize(library)
        .map_err(|error| format!("Unable to verify library path. {}", error))?;
    let expected_staging_dir = canonical_library.join(".staging").join("imports");
    let canonical_staging_dir = fs::canonicalize(&staging_dir)
        .map_err(|error| format!("Unable to verify import staging folder. {}", error))?;
    if canonical_staging_dir != expected_staging_dir {
        return Err("Refusing to remove non-staging import file.".into());
    }

    match fs::remove_file(candidate) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("Unable to remove import staging file. {}", error)),
    }
}

pub fn paths_refer_to_same_location(first_path: &str, second_path: &str) -> Result<bool, String> {
    let first = Path::new(first_path);
    let second = Path::new(second_path);
    if first.as_os_str().is_empty() || second.as_os_str().is_empty() {
        return Ok(false);
    }
    if first == second {
        return Ok(true);
    }
    let first_canonical = fs::canonicalize(first).ok();
    let second_canonical = fs::canonicalize(second).ok();
    Ok(matches!(
        (first_canonical, second_canonical),
        (Some(first_resolved), Some(second_resolved)) if first_resolved == second_resolved
    ))
}

#[cfg(test)]
mod tests {
    use super::{paths_refer_to_same_location, remove_import_staging_file};
    use std::fs;

    #[test]
    fn remove_import_staging_file_removes_files_inside_import_staging() {
        let temp = tempfile::tempdir().expect("tempdir");
        let staging = temp.path().join(".staging/imports");
        fs::create_dir_all(&staging).expect("create staging");
        let candidate = staging.join("import-book.pdf");
        fs::write(&candidate, b"draft").expect("write staging file");

        remove_import_staging_file(
            temp.path().to_str().expect("library path"),
            candidate.to_str().expect("candidate path"),
        )
        .expect("remove staging file");

        assert!(!candidate.exists());
    }

    #[test]
    fn remove_import_staging_file_refuses_final_library_files() {
        let temp = tempfile::tempdir().expect("tempdir");
        let library_dir = temp.path().join("library");
        fs::create_dir_all(&library_dir).expect("create library");
        let final_file = library_dir.join("book.pdf");
        fs::write(&final_file, b"book").expect("write final file");

        let error = remove_import_staging_file(
            temp.path().to_str().expect("library path"),
            final_file.to_str().expect("candidate path"),
        )
        .expect_err("reject final file");

        assert!(error.contains("Refusing to remove"));
        assert!(final_file.exists());
    }

    #[test]
    fn remove_import_staging_file_rejects_parent_directory_segments() {
        let temp = tempfile::tempdir().expect("tempdir");
        let candidate = temp.path().join(".staging/imports/../book.pdf");

        let error = remove_import_staging_file(
            temp.path().to_str().expect("library path"),
            candidate.to_str().expect("candidate path"),
        )
        .expect_err("reject traversal");

        assert!(error.contains("Refusing to remove"));
    }

    #[cfg(unix)]
    #[test]
    fn remove_import_staging_file_rejects_symlinked_import_staging_folder() {
        use std::os::unix::fs::symlink;

        let temp = tempfile::tempdir().expect("tempdir");
        let external = tempfile::tempdir().expect("external tempdir");
        let staging_parent = temp.path().join(".staging");
        fs::create_dir_all(&staging_parent).expect("create staging parent");
        symlink(external.path(), staging_parent.join("imports")).expect("symlink imports");
        let external_file = external.path().join("import-book.pdf");
        fs::write(&external_file, b"external").expect("write external file");
        let apparent_candidate = temp.path().join(".staging/imports/import-book.pdf");

        let error = remove_import_staging_file(
            temp.path().to_str().expect("library path"),
            apparent_candidate.to_str().expect("candidate path"),
        )
        .expect_err("reject symlinked staging");

        assert!(error.contains("Refusing to remove"));
        assert!(external_file.exists());
    }

    #[test]
    fn paths_refer_to_same_location_handles_trailing_slashes_and_symlinks() {
        let temp = tempfile::tempdir().expect("tempdir");
        let library = temp.path().join("library");
        fs::create_dir_all(&library).expect("create library");
        let trailing = format!("{}/", library.to_str().expect("library path"));

        assert!(
            paths_refer_to_same_location(library.to_str().expect("library path"), &trailing)
                .expect("compare trailing slash")
        );

        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;

            let link = temp.path().join("library-link");
            symlink(&library, &link).expect("symlink library");
            assert!(paths_refer_to_same_location(
                library.to_str().expect("library path"),
                link.to_str().expect("link path"),
            )
            .expect("compare symlink"));
        }
    }
}
