# AEGIS AE-08 Machine-Learning Pipeline

This directory contains the reproducible machine-learning pipeline for the AI4I 2020 Predictive Maintenance Dataset.

## Dataset

Source: UCI Machine Learning Repository, AI4I 2020 Predictive Maintenance Dataset.

Acquisition URL:

```text
https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip
```

The acquisition command downloads the UCI archive, extracts the CSV, computes SHA-256 checksums, and writes provenance metadata.

## Setup

Python is required for AE-08. Install the dependencies in an isolated environment:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Commands

From the repository root:

```powershell
python -m ml.aegis_ml.acquire
python -m ml.aegis_ml.train
python -m unittest discover -s tests/ml
```

The training command uses an 80/20 stratified split with seed `42`, excludes `UDI`, `Product ID`, and all failure-mode columns when `Machine failure` is the target, applies class weighting through XGBoost `scale_pos_weight`, tunes a compact parameter grid, and exports artefacts only when the required dependencies are installed.

## Artefacts

Runnable outputs are versioned under:

```text
models/ai4i/v1/
```

Expected generated files:

- `feature-schema.json`
- `thresholds.json`
- `metadata.json`
- `metrics.json`
- `model.onnx`
- `parity-report.json`

The pipeline does not provide placeholder scores. If dependencies, Python, or network access are unavailable, commands fail with explicit setup guidance and no fabricated metrics.
