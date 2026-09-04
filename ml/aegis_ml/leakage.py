from __future__ import annotations

from typing import Iterable

from .config import LEAKAGE_COLUMNS, RAW_FEATURE_COLUMNS, TARGET_COLUMN


def leakage_columns_present(feature_columns: Iterable[str]) -> list[str]:
    selected = set(feature_columns)
    return [column for column in LEAKAGE_COLUMNS if column in selected]


def validate_no_leakage(feature_columns: Iterable[str], target_column: str = TARGET_COLUMN) -> None:
    leaked = leakage_columns_present(feature_columns)
    if leaked:
        joined = ", ".join(leaked)
        raise ValueError(
            f"Leakage columns cannot be used as features for target '{target_column}': {joined}"
        )


def selected_raw_features() -> tuple[str, ...]:
    validate_no_leakage(RAW_FEATURE_COLUMNS)
    return RAW_FEATURE_COLUMNS
