from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from ml.aegis_ml.class_weighting import class_distribution, xgboost_scale_pos_weight
from ml.aegis_ml.config import FAILURE_MODE_COLUMNS, IDENTIFIER_COLUMNS, RAW_FEATURE_COLUMNS
from ml.aegis_ml.leakage import leakage_columns_present, selected_raw_features, validate_no_leakage
from ml.aegis_ml.schema import feature_schema, validate_required_columns


class LeakageTests(unittest.TestCase):
    def test_selected_raw_features_exclude_identifiers_and_failure_modes(self) -> None:
        selected = selected_raw_features()

        for column in IDENTIFIER_COLUMNS + FAILURE_MODE_COLUMNS:
            self.assertNotIn(column, selected)

    def test_validate_no_leakage_rejects_failure_modes(self) -> None:
        leaked_features = RAW_FEATURE_COLUMNS + ("TWF",)

        with self.assertRaisesRegex(ValueError, "Leakage columns"):
            validate_no_leakage(leaked_features)

    def test_leakage_columns_present_preserves_configured_order(self) -> None:
        leaked = leakage_columns_present(("Torque [Nm]", "Product ID", "RNF", "UDI"))

        self.assertEqual(leaked, ["UDI", "Product ID", "RNF"])


class FeatureSchemaTests(unittest.TestCase):
    def test_feature_schema_contains_expected_target_split_and_transforms(self) -> None:
        schema = feature_schema()

        self.assertEqual(schema["target"], "Machine failure")
        self.assertEqual(schema["random_seed"], 42)
        self.assertEqual(schema["split"]["strategy"], "stratified")
        self.assertEqual(schema["transformed_features"][0:3], ["type_H", "type_L", "type_M"])

    def test_validate_required_columns_accepts_ai4i_columns(self) -> None:
        columns = RAW_FEATURE_COLUMNS + ("Machine failure",)

        validate_required_columns(columns)

    def test_validate_required_columns_reports_missing_columns(self) -> None:
        with self.assertRaisesRegex(ValueError, "Machine failure"):
            validate_required_columns(RAW_FEATURE_COLUMNS)


class ClassWeightingTests(unittest.TestCase):
    def test_class_distribution_returns_negative_and_positive_counts(self) -> None:
        self.assertEqual(
            class_distribution([0, 0, 0, 1, 1]),
            {"negative": 3, "positive": 2},
        )

    def test_xgboost_scale_pos_weight_uses_negative_to_positive_ratio(self) -> None:
        self.assertEqual(xgboost_scale_pos_weight([0, 0, 0, 1]), 3.0)

    def test_xgboost_scale_pos_weight_requires_positive_class(self) -> None:
        with self.assertRaisesRegex(ValueError, "positive class is absent"):
            xgboost_scale_pos_weight([0, 0])


if __name__ == "__main__":
    unittest.main()
