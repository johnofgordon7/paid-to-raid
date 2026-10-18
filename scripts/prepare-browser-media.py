#!/usr/bin/env python3
"""Split the supplied native MP4s for file-size-limited browser uploads.

Run from this project: python scripts/prepare-browser-media.py --originals PATH
No re-encoding occurs. All writes stay in this script's project or the explicitly
permitted sibling output/browser-upload-2026-10-18 report directory. Four large
MP4s must be absent from the publication project; the small direct MP4 must exist.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys


PART_BYTES = 4 * 1024 * 1024
UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024
PROJECT = Path(__file__).resolve().parents[1]
REPORT_ROOT = PROJECT.parent / "output" / "browser-upload-2026-10-18"
VIDEOS = (
    ("sprint", "call-of-booty-sprint.mp4", 45642600, "cbf5331b3cc4dc1ad43957e9048685b62979e9b5300244738d67684d79da9924"),
    ("ambush-early", "call-of-booty-ambush-early.mp4", 17444048, "d9e0297ec40531723c73d3b94fa0804d4dbe0283070882f02edc07a6ba849da5"),
    ("ambush-late", "call-of-booty-ambush-late.mp4", 39044597, "a38880bcf80f1382a627ce9f90f0bbe3da7968ba2d9497798b71ec61ef8fb94e"),
    ("extraction-five", "call-of-booty-extraction-five.mp4", 42997236, "e3739bbd91ff09a42ae6549b82f17a2ced9da39bc82ed991ae854b9612d12f6f"),
    ("extraction-max", "call-of-booty-extraction-max.mp4", 43572023, "f8557534dd9e22b6e1654527e0ea9d6699f6c44db8a67a6f5d635db7f3a7403e"),
)


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(PART_BYTES), b""):
            digest.update(block)
    return digest.hexdigest()


def confined(path: Path, root: Path = PROJECT) -> Path:
    resolved = path.resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError(f"Refusing a destination outside {root}: {resolved}")
    return resolved


def write_bytes(path: Path, data: bytes, root: Path = PROJECT) -> None:
    target = confined(path, root)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.is_file() and target.stat().st_size == len(data) and digest_file(target) == hashlib.sha256(data).hexdigest():
        return
    temporary = confined(target.with_name(target.name + ".writing"), root)
    try:
        with temporary.open("wb") as handle:
            handle.write(data)
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=True) + "\n").encode("utf-8")


def verify_part(path: Path, expected: dict) -> bytes:
    if Path(expected["file"]).name != expected["file"]:
        raise ValueError("A part must use a relative basename, not a path.")
    data = confined(path).read_bytes()
    if len(data) != expected["bytes"] or hashlib.sha256(data).hexdigest() != expected["sha256"]:
        raise ValueError(f"Part byte/hash mismatch: {path}")
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--originals", required=True, type=Path, help="Read-only directory containing all five verified native MP4s.")
    parser.add_argument("--verify-only", action="store_true", help="Check existing catalog, module, chunks and source hashes without changing project files.")
    parser.add_argument("--report", type=Path, default=REPORT_ROOT / "media-reassembly-report.json")
    args = parser.parse_args()
    originals = args.originals.resolve(strict=True)
    if not originals.is_dir():
        raise ValueError("--originals must be a directory.")
    report_path = args.report.resolve()
    if not report_path.is_relative_to(PROJECT) and not report_path.is_relative_to(REPORT_ROOT.resolve()):
        raise ValueError("Report must remain in the project or output/browser-upload-2026-10-18.")
    report_root = PROJECT if report_path.is_relative_to(PROJECT) else REPORT_ROOT
    asset_root = confined(PROJECT / "public" / "assets")
    parts_root = confined(asset_root / "video-parts")

    # Preflight all native files before making any publication-asset changes.
    for key, filename, byte_count, sha256 in VIDEOS:
        source = originals / filename
        if source.stat().st_size != byte_count or digest_file(source) != sha256:
            raise ValueError(f"Native original does not match the verified archive: {source}")
        publication_mp4 = confined(asset_root / filename)
        if key == "ambush-early":
            if not publication_mp4.is_file() or publication_mp4.stat().st_size != byte_count or digest_file(publication_mp4) != sha256:
                raise ValueError("The native direct early-ambush MP4 must already exist unchanged in public/assets.")
        elif publication_mp4.exists():
            raise ValueError(f"Large native MP4 must not be included in this browser-upload project: {publication_mp4}")

    catalog = {"version": 1, "partSizeBytes": PART_BYTES, "videos": {}}
    checks = []
    for key, filename, byte_count, sha256 in VIDEOS:
        logical = "./assets/" + filename
        if key == "ambush-early":
            catalog["videos"][logical] = {"type": "direct", "url": logical, "bytes": byte_count, "sha256": sha256}
            checks.append({"key": key, "logicalVideo": logical, "type": "direct", "bytes": byte_count, "sourceSha256": sha256, "reassembledSha256": digest_file(asset_root / filename), "verified": True, "partCount": 0})
            continue
        directory = confined(parts_root / key)
        if not args.verify_only:
            directory.mkdir(parents=True, exist_ok=True)
        parts = []
        with (originals / filename).open("rb") as handle:
            index = 0
            for data in iter(lambda: handle.read(PART_BYTES), b""):
                name = f"part-{index:02d}.bin"
                part = {"file": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                if not args.verify_only:
                    write_bytes(directory / name, data)
                parts.append(part)
                index += 1
        expected_names = {part["file"] for part in parts}
        actual_names = {part.name for part in directory.glob("part-*.bin")}
        if actual_names != expected_names:
            raise ValueError(f"Unexpected/missing part files in {directory}: {actual_names ^ expected_names}")
        manifest = {"version": 1, "logicalVideo": logical, "bytes": byte_count, "sha256": sha256, "partSizeBytes": PART_BYTES, "parts": parts}
        manifest_path = confined(directory / "manifest.json")
        if not args.verify_only:
            write_bytes(manifest_path, json_bytes(manifest))
        if json.loads(manifest_path.read_text(encoding="utf-8")) != manifest:
            raise ValueError(f"Manifest does not match the exact source split: {manifest_path}")
        reassembled = hashlib.sha256()
        reassembled_bytes = 0
        for part in manifest["parts"]:
            data = verify_part(directory / part["file"], part)
            reassembled.update(data)
            reassembled_bytes += len(data)
        if reassembled_bytes != byte_count or reassembled.hexdigest() != sha256:
            raise ValueError(f"Reassembly does not match native original: {filename}")
        catalog["videos"][logical] = {"type": "chunks", "manifest": f"./assets/video-parts/{key}/manifest.json", "bytes": byte_count, "sha256": sha256}
        checks.append({"key": key, "logicalVideo": logical, "type": "chunks", "bytes": byte_count, "sourceSha256": sha256, "reassembledSha256": reassembled.hexdigest(), "verified": True, "partCount": len(parts), "manifest": str(manifest_path), "manifestSha256": digest_file(manifest_path), "partBytes": [part["bytes"] for part in parts]})

    catalog_path = confined(parts_root / "catalog.json")
    module_path = confined(PROJECT / "src" / "media-catalog.js")
    catalog_content = json_bytes(catalog)
    module_content = b"// Generated by scripts/prepare-browser-media.py.\nexport default " + catalog_content.rstrip() + b";\n"
    if not args.verify_only:
        write_bytes(catalog_path, catalog_content)
        write_bytes(module_path, module_content)
    if catalog_path.read_bytes() != catalog_content or module_path.read_bytes() != module_content:
        raise ValueError("Public catalog and synchronous JS metadata must match the generated schema exactly.")

    total_chunks = sum(item["partCount"] for item in checks)
    if total_chunks != 43 or len(checks) != 5:
        raise ValueError("Expected exactly five native videos and 43 parts for this source archive.")
    for item in checks:
        if item["sourceSha256"] != item["reassembledSha256"]:
            raise ValueError("Native media hash changed.")
    report = {
        "status": "PASS", "completedAt": datetime.now(timezone.utc).isoformat(),
        "method": "Verified original hashes, split without re-encoding, verified every part, and streamed ordered reassembly back to native SHA-256 without storing any large reconstructed MP4 in the publication tree.",
        "projectRoot": str(PROJECT), "originalsDirectory": str(originals), "verifyOnly": args.verify_only,
        "partSizeBytes": PART_BYTES, "totalChunks": total_chunks, "totalNativeMediaBytes": sum(item[2] for item in VIDEOS),
        "uploadFileLimitBytes": UPLOAD_LIMIT_BYTES, "largestGeneratedPartBytes": PART_BYTES,
        "directEarlyBytes": 17444048, "allPublicationMediaPayloadsUnderLimit": PART_BYTES < UPLOAD_LIMIT_BYTES and 17444048 < UPLOAD_LIMIT_BYTES,
        "largeNativeMp4sAbsentFromPublication": True, "nativeMediaBytesPreserved": True,
        "catalog": str(catalog_path), "catalogSha256": digest_file(catalog_path),
        "generatedModule": str(module_path), "generatedModuleSha256": digest_file(module_path),
        "publicCatalogAndModuleMetadataIdentical": True, "videos": checks,
    }
    write_bytes(report_path, json_bytes(report), report_root)
    print(json.dumps({"status": "PASS", "videos": len(checks), "chunks": total_chunks, "catalog": str(catalog_path), "report": str(report_path)}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"Browser-media preparation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
