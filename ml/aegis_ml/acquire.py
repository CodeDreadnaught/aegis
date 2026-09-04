from __future__ import annotations

import argparse
import datetime as dt
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

from .config import PROVENANCE_PATH, RAW_ARCHIVE_PATH, RAW_DATASET_PATH, UCI_AI4I_URL
from .io import sha256_file, write_json


def acquire_dataset(
    url: str = UCI_AI4I_URL,
    archive_path: Path = RAW_ARCHIVE_PATH,
    dataset_path: Path = RAW_DATASET_PATH,
    provenance_path: Path = PROVENANCE_PATH,
) -> dict[str, object]:
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    urlretrieve(url, archive_path)

    with zipfile.ZipFile(archive_path) as archive:
        csv_members = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not csv_members:
            raise ValueError("UCI archive did not contain a CSV dataset")
        member = csv_members[0]
        with archive.open(member) as source, dataset_path.open("wb") as target:
            target.write(source.read())

    provenance = {
        "source_name": "UCI AI4I 2020 Predictive Maintenance Dataset",
        "source_url": url,
        "acquired_at_utc": dt.datetime.now(dt.UTC).isoformat(),
        "archive_path": str(archive_path),
        "archive_sha256": sha256_file(archive_path),
        "dataset_path": str(dataset_path),
        "dataset_sha256": sha256_file(dataset_path),
    }
    write_json(provenance_path, provenance)
    return provenance


def main() -> None:
    parser = argparse.ArgumentParser(description="Acquire the UCI AI4I 2020 dataset.")
    parser.add_argument("--url", default=UCI_AI4I_URL)
    args = parser.parse_args()
    provenance = acquire_dataset(url=args.url)
    print(f"Downloaded dataset to {provenance['dataset_path']}")
    print(f"Wrote provenance to {PROVENANCE_PATH}")


if __name__ == "__main__":
    main()
