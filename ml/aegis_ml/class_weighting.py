from __future__ import annotations

from collections import Counter
from typing import Iterable


def class_distribution(labels: Iterable[int]) -> dict[str, int]:
    counts = Counter(int(label) for label in labels)
    return {"negative": counts.get(0, 0), "positive": counts.get(1, 0)}


def xgboost_scale_pos_weight(labels: Iterable[int]) -> float:
    distribution = class_distribution(labels)
    positive = distribution["positive"]
    negative = distribution["negative"]
    if positive == 0:
        raise ValueError("Cannot compute class weight because the positive class is absent")
    return negative / positive
