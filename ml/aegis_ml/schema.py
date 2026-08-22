from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Iterable

from .config import (
    CATEGORICAL_FEATURE_COLUMNS,
    FAILURE_MODE_COLUMNS,
    IDENTIFIER_COLUMNS,
    MODEL_VERSION,
    NUMERIC_FEATURE_COLUMNS,
    RANDOM_SEED,
    RAW_FEATURE_COLUMNS,
    SCHEMA_VERSION,
    TARGET_COLUMN,
    TRANSFORMED_FEATURE_COLUMNS,
    TYPE_CATEGORIES,
)


@dataclass(frozen=True)
class FeatureSpec:
    name: str
    dtype: str
    source_column: str
    required: bool = True


def raw_feature_specs() -> list[FeatureSpec]:
    return [
        FeatureSpec("type", "category", "Type"),
        FeatureSpec("air_temperature_k", "float", "Air temperature [K]"),
        FeatureSpec("process_temperature_k", "float", "Process temperature [K]"),
        FeatureSpec("rotational_speed_rpm", "float", "Rotational speed [rpm]"),
        FeatureSpec("torque_nm", "float", "Torque [Nm]"),
        FeatureSpec("tool_wear_min", "float", "Tool wear [min]"),
    ]


def feature_schema() -> dict[str, object]:
    return {
        "schema_version": SCHEMA_VERSION,
        "model_version": MODEL_VERSION,
        "target": TARGET_COLUMN,
        "random_seed": RANDOM_SEED,
        "split": {"strategy": "stratified", "train_fraction": 0.8, "test_fraction": 0.2},
        "excluded_columns": {
            "identifiers": list(IDENTIFIER_COLUMNS),
            "failure_modes": list(FAILURE_MODE_COLUMNS),
        },
        "raw_features": [asdict(feature) for feature in raw_feature_specs()],
        "categorical_features": list(CATEGORICAL_FEATURE_COLUMNS),
        "numeric_features": list(NUMERIC_FEATURE_COLUMNS),
        "category_levels": {"Type": list(TYPE_CATEGORIES)},
        "transformed_features": list(TRANSFORMED_FEATURE_COLUMNS),
    }


def validate_required_columns(columns: Iterable[str]) -> None:
    available = set(columns)
    required = set(RAW_FEATURE_COLUMNS + (TARGET_COLUMN,))
    missing = sorted(required - available)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing)}")
