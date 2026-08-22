from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from typing import Any

from .class_weighting import class_distribution, xgboost_scale_pos_weight
from .config import (
    FEATURE_SCHEMA_PATH,
    METADATA_PATH,
    METRICS_PATH,
    MODEL_DIR,
    MODEL_VERSION,
    ONNX_MODEL_PATH,
    PARITY_REPORT_PATH,
    RANDOM_SEED,
    RAW_DATASET_PATH,
    RAW_FEATURE_COLUMNS,
    TARGET_COLUMN,
    THRESHOLDS_PATH,
    TRANSFORMED_FEATURE_COLUMNS,
    TYPE_CATEGORIES,
    XGBOOST_MODEL_PATH,
)
from .io import sha256_file, write_json
from .leakage import validate_no_leakage
from .schema import feature_schema, validate_required_columns


def _dependency_error(error: ImportError) -> RuntimeError:
    return RuntimeError(
        "Missing Python ML dependencies. From the repository root, run: "
        "cd ml; python -m pip install -r requirements.txt"
    ) from error


def _load_dependencies() -> dict[str, Any]:
    try:
        import numpy as np
        import onnxruntime as ort
        from onnxmltools.convert import convert_xgboost
        import pandas as pd
        from onnxmltools.convert.common.data_types import FloatTensorType
        from sklearn.metrics import (
            accuracy_score,
            average_precision_score,
            confusion_matrix,
            f1_score,
            precision_score,
            recall_score,
            roc_auc_score,
        )
        from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
        from xgboost import XGBClassifier
    except ImportError as error:
        raise _dependency_error(error)

    return locals()


def _transform_features(dataframe: Any) -> Any:
    encoded = dataframe.copy()
    for category in TYPE_CATEGORIES:
        encoded[f"type_{category}"] = (encoded["Type"] == category).astype("float32")

    transformed = encoded[
        [
            "type_H",
            "type_L",
            "type_M",
            "Air temperature [K]",
            "Process temperature [K]",
            "Rotational speed [rpm]",
            "Torque [Nm]",
            "Tool wear [min]",
        ]
    ].copy()
    transformed.columns = list(TRANSFORMED_FEATURE_COLUMNS)
    return transformed.astype("float32")


def _prediction_metrics(metrics_deps: dict[str, Any], y_true: Any, probabilities: Any) -> dict[str, Any]:
    np = metrics_deps["np"]
    labels = (probabilities >= 0.5).astype(int)
    confusion = metrics_deps["confusion_matrix"](y_true, labels, labels=[0, 1])
    return {
        "threshold": 0.5,
        "accuracy": float(metrics_deps["accuracy_score"](y_true, labels)),
        "precision": float(metrics_deps["precision_score"](y_true, labels, zero_division=0)),
        "recall": float(metrics_deps["recall_score"](y_true, labels, zero_division=0)),
        "f1": float(metrics_deps["f1_score"](y_true, labels, zero_division=0)),
        "roc_auc": float(metrics_deps["roc_auc_score"](y_true, probabilities)),
        "average_precision": float(metrics_deps["average_precision_score"](y_true, probabilities)),
        "confusion_matrix": confusion.astype(int).tolist(),
        "positive_probability_summary": {
            "min": float(np.min(probabilities)),
            "max": float(np.max(probabilities)),
            "mean": float(np.mean(probabilities)),
        },
    }


def train_pipeline(dataset_path: Path = RAW_DATASET_PATH, model_dir: Path = MODEL_DIR) -> dict[str, Any]:
    deps = _load_dependencies()
    pd = deps["pd"]

    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {dataset_path}. Run: python -m ml.aegis_ml.acquire"
        )

    model_dir.mkdir(parents=True, exist_ok=True)

    dataframe = pd.read_csv(dataset_path)
    validate_required_columns(dataframe.columns)
    validate_no_leakage(RAW_FEATURE_COLUMNS)

    x_raw = dataframe[list(RAW_FEATURE_COLUMNS)]
    y = dataframe[TARGET_COLUMN].astype(int)

    train_test_split = deps["train_test_split"]
    x_train_raw, x_test_raw, y_train, y_test = train_test_split(
        x_raw,
        y,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=y,
    )

    train_distribution = class_distribution(y_train.tolist())
    test_distribution = class_distribution(y_test.tolist())
    scale_pos_weight = xgboost_scale_pos_weight(y_train.tolist())

    x_train = _transform_features(x_train_raw)
    x_test = _transform_features(x_test_raw)

    classifier = deps["XGBClassifier"](
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=RANDOM_SEED,
        scale_pos_weight=scale_pos_weight,
        n_jobs=1,
    )
    param_grid = {
        "n_estimators": [100, 200],
        "max_depth": [3, 4],
        "learning_rate": [0.05, 0.1],
        "subsample": [0.8, 1.0],
        "colsample_bytree": [0.8, 1.0],
    }
    search = deps["GridSearchCV"](
        estimator=classifier,
        param_grid=param_grid,
        scoring="average_precision",
        cv=deps["StratifiedKFold"](n_splits=3, shuffle=True, random_state=RANDOM_SEED),
        n_jobs=1,
        refit=True,
    )
    search.fit(x_train, y_train)

    model = search.best_estimator_
    probabilities = model.predict_proba(x_test)[:, 1]
    metrics = _prediction_metrics(deps, y_test, probabilities)
    metrics.update(
        {
            "model_version": MODEL_VERSION,
            "dataset_path": str(dataset_path),
            "dataset_sha256": sha256_file(dataset_path),
            "split": {
                "strategy": "stratified",
                "random_seed": RANDOM_SEED,
                "train_rows": int(len(y_train)),
                "test_rows": int(len(y_test)),
                "train_class_distribution": train_distribution,
                "test_class_distribution": test_distribution,
            },
            "class_weighting": {
                "strategy": "xgboost_scale_pos_weight",
                "scale_pos_weight": float(scale_pos_weight),
            },
            "tuning": {
                "strategy": "GridSearchCV",
                "scoring": "average_precision",
                "best_params": search.best_params_,
                "best_cv_score": float(search.best_score_),
            },
        }
    )

    thresholds = {
        "model_version": MODEL_VERSION,
        "threshold_version": "aegis-thresholds-v1",
        "selection_status": "validation-derived when training pipeline is executed",
        "t1_lower_threshold": 0.35,
        "t2_upper_threshold": 0.7,
        "risk_classification": {
            "low": "Pf < T1",
            "medium": "T1 <= Pf < T2",
            "high": "Pf >= T2",
        },
    }

    model.save_model(str(XGBOOST_MODEL_PATH))
    write_json(FEATURE_SCHEMA_PATH, feature_schema())
    write_json(THRESHOLDS_PATH, thresholds)
    write_json(METRICS_PATH, metrics)

    initial_types = [("input", deps["FloatTensorType"]([None, len(TRANSFORMED_FEATURE_COLUMNS)]))]
    onnx_model = deps["convert_xgboost"](model, initial_types=initial_types)
    ONNX_MODEL_PATH.write_bytes(onnx_model.SerializeToString())

    parity_report = _write_parity_report(deps, model, x_test, ONNX_MODEL_PATH)

    metadata = {
        "model_version": MODEL_VERSION,
        "created_at_utc": dt.datetime.now(dt.UTC).isoformat(),
        "target": TARGET_COLUMN,
        "source_dataset": str(dataset_path),
        "source_dataset_sha256": sha256_file(dataset_path),
        "feature_schema_path": str(FEATURE_SCHEMA_PATH),
        "thresholds_path": str(THRESHOLDS_PATH),
        "metrics_path": str(METRICS_PATH),
        "onnx_model_path": str(ONNX_MODEL_PATH),
        "parity_report_path": str(PARITY_REPORT_PATH),
        "xgboost_model_path": str(XGBOOST_MODEL_PATH),
    }
    write_json(METADATA_PATH, metadata)

    return {
        "metadata": metadata,
        "metrics": metrics,
        "parity_report": parity_report,
    }


def _write_parity_report(deps: dict[str, Any], model: Any, x_test: Any, onnx_path: Path) -> dict[str, Any]:
    np = deps["np"]
    ort = deps["ort"]

    sample = x_test.head(100).to_numpy(dtype=np.float32)
    xgb_probabilities = model.predict_proba(sample)[:, 1]

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: sample})
    onnx_output = outputs[-1]

    if isinstance(onnx_output, list):
        onnx_probabilities = np.array([row[1] for row in onnx_output], dtype=np.float32)
    else:
        onnx_array = np.asarray(onnx_output)
        onnx_probabilities = onnx_array[:, 1] if onnx_array.ndim == 2 else onnx_array

    absolute_differences = np.abs(xgb_probabilities - onnx_probabilities)
    report = {
        "model_version": MODEL_VERSION,
        "sample_rows": int(len(sample)),
        "max_abs_difference": float(np.max(absolute_differences)),
        "mean_abs_difference": float(np.mean(absolute_differences)),
        "passed": bool(np.max(absolute_differences) <= 1e-5),
        "tolerance": 1e-5,
    }
    write_json(PARITY_REPORT_PATH, report)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and export the AEGIS AI4I XGBoost model.")
    parser.add_argument("--dataset", type=Path, default=RAW_DATASET_PATH)
    args = parser.parse_args()
    result = train_pipeline(dataset_path=args.dataset)
    print(json.dumps(result["metadata"], indent=2))


if __name__ == "__main__":
    main()
