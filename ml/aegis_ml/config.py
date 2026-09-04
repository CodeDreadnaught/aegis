from __future__ import annotations

from pathlib import Path

RANDOM_SEED = 42
MODEL_VERSION = "ai4i-xgboost-v1"
SCHEMA_VERSION = "ae-08-feature-schema-v1"
TARGET_COLUMN = "Machine failure"

UCI_AI4I_URL = (
    "https://archive.ics.uci.edu/static/public/601/"
    "ai4i+2020+predictive+maintenance+dataset.zip"
)

RAW_DATA_DIR = Path("ml/data/raw")
PROCESSED_DATA_DIR = Path("ml/data/processed")
MODEL_DIR = Path("models/ai4i/v1")

RAW_ARCHIVE_PATH = RAW_DATA_DIR / "ai4i-2020-predictive-maintenance.zip"
RAW_DATASET_PATH = RAW_DATA_DIR / "ai4i2020.csv"
PROVENANCE_PATH = RAW_DATA_DIR / "provenance.json"

FEATURE_SCHEMA_PATH = MODEL_DIR / "feature-schema.json"
THRESHOLDS_PATH = MODEL_DIR / "thresholds.json"
METADATA_PATH = MODEL_DIR / "metadata.json"
METRICS_PATH = MODEL_DIR / "metrics.json"
ONNX_MODEL_PATH = MODEL_DIR / "model.onnx"
PARITY_REPORT_PATH = MODEL_DIR / "parity-report.json"
XGBOOST_MODEL_PATH = MODEL_DIR / "xgboost-model.json"

IDENTIFIER_COLUMNS = ("UDI", "Product ID")
FAILURE_MODE_COLUMNS = ("TWF", "HDF", "PWF", "OSF", "RNF")
LEAKAGE_COLUMNS = IDENTIFIER_COLUMNS + FAILURE_MODE_COLUMNS

RAW_FEATURE_COLUMNS = (
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
)

NUMERIC_FEATURE_COLUMNS = (
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
)

CATEGORICAL_FEATURE_COLUMNS = ("Type",)
TYPE_CATEGORIES = ("H", "L", "M")

TRANSFORMED_FEATURE_COLUMNS = (
    "type_H",
    "type_L",
    "type_M",
    "air_temperature_k",
    "process_temperature_k",
    "rotational_speed_rpm",
    "torque_nm",
    "tool_wear_min",
)
