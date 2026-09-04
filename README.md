# AEGIS

AEGIS is a production-oriented predictive maintenance application for upstream
oil and gas equipment. It uses Next.js App Router, Prisma/PostgreSQL,
server-side RBAC, Server Actions for mutations, and a server-only ONNX inference
path for AI4I XGBoost predictions.

## Runtime Requirements

- Bun `1.2.19`
- Node-compatible production host for Next.js
- PostgreSQL with SSL enabled
- Python only for retraining/exporting ML artefacts

## Required Environment

Create `.env` locally or configure equivalent production environment variables:

```text
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...
SESSION_SECRET=<at least 32 characters>
```

For Neon/PostgreSQL production URLs, use SSL verification, for example
`sslmode=verify-full`.

## App Commands

```powershell
bun install
bun run prisma:generate
bun run prisma:migrate
bun run dev
```

`bun run prisma:seed` creates demo users and demo equipment. Use it for local or
intentional demo environments only. In production it is blocked unless
`AEGIS_ALLOW_DEMO_SEED=true` is explicitly set.

Production verification:

```powershell
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
```

## Machine Learning Artefacts

The production app does not train models at runtime. It loads the validated ONNX
artefact from:

```text
models/ai4i/v1/model.onnx
```

The committed model directory also contains metadata, thresholds, feature schema,
metrics, parity report, and the XGBoost model export.

To retrain the model in a Python environment:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd ..
python -m ml.aegis_ml.acquire
python -m ml.aegis_ml.train
python -m unittest discover -s tests/ml
```

Only promote a new model artefact when `parity-report.json` has `"passed": true`.

## Production Notes

- No ordinary `/api` routes are used for workflows.
- Server Actions perform mutations and enforce permissions server-side.
- `onnxruntime-node` requires a Node runtime; the analytics route is marked
  `runtime = "nodejs"`.
- `docs/` and `coding-specs/` are intentionally ignored and not committed.
