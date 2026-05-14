#!/usr/bin/env bash
# scripts/check-grep-gates.sh
#
# Seven architectural grep gates from SPEC §4.
# Run by `npm run lint:gates` (chained into `npm run lint`).
# All gates must return 0 matches. Any match = exit 1.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAILED=0

fail() {
  echo "  [GATE FAIL] $1"
  FAILED=1
}

# ---------------------------------------------------------------------------
# Gate 1: No bare fetch/axios in src/features/ or src/routes/
# ---------------------------------------------------------------------------
echo "Gate 1: no bare fetch/axios in features/routes..."
if grep -RE "\b(fetch|axios)\(" src/features/ src/routes/ 2>/dev/null | grep -q .; then
  fail "bare fetch/axios found in src/features/ or src/routes/"
  grep -RE "\b(fetch|axios)\(" src/features/ src/routes/ 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Gate 2: No bare fetch/axios anywhere outside data/api/csv-export
# ---------------------------------------------------------------------------
echo "Gate 2: no bare fetch/axios outside data/api/csv-export..."
GATE2=$(grep -RE "\b(fetch|axios)\(" src/ --include='*.ts' --include='*.tsx' 2>/dev/null \
  | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts" || true)
if [ -n "$GATE2" ]; then
  fail "bare fetch/axios found outside allowed paths:"
  echo "$GATE2"
fi

# ---------------------------------------------------------------------------
# Gate 3: No `as any` outside generated client
# Excludes: src/api/generated/ (API types) and *.gen.ts (TanStack Router generated)
# ---------------------------------------------------------------------------
echo "Gate 3: no 'as any' outside src/api/generated..."
GATE3=$(grep -RE "as any" src/ --include='*.ts' --include='*.tsx' 2>/dev/null \
  | grep -vE "src/api/generated|\.gen\.ts" || true)
if [ -n "$GATE3" ]; then
  fail "'as any' found outside generated files:"
  echo "$GATE3"
fi

# ---------------------------------------------------------------------------
# Gate 4: No import from api/generated in features or routes
# ---------------------------------------------------------------------------
echo "Gate 4: no import from api/generated in features/routes..."
if grep -RE "from ['\"].*api/generated" src/features/ src/routes/ 2>/dev/null | grep -q .; then
  fail "features/routes import from api/generated directly:"
  grep -RE "from ['\"].*api/generated" src/features/ src/routes/ 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Gate 5: No NumberInput in features (outside integer-only allowlist)
# Allowlist (ILE-6): expiring_within days field in StockByBatchPage/StockListFilters is an
# integer-only counter (days), not a money/qty field — NumberInput is permitted.
# ILE-16: StockByBatchPage now delegates to StockListFilters; both are allowlisted.
# ---------------------------------------------------------------------------
echo "Gate 5: no NumberInput in src/features/ (outside integer allowlist)..."
GATE5=$(grep -RE "\bNumberInput\b" src/features/ 2>/dev/null \
  | grep -vE "StockByBatchPage|StockListFilters" || true)
if [ -n "$GATE5" ]; then
  fail "NumberInput found in src/features/ — use <DecimalInput> for money/qty:"
  echo "$GATE5"
fi

# ---------------------------------------------------------------------------
# Gate 6: No console.log/debug left in source
# ---------------------------------------------------------------------------
echo "Gate 6: no console.log/debug in src/..."
if grep -RE "console\.(log|debug)" src/ --include='*.ts' --include='*.tsx' 2>/dev/null | grep -q .; then
  fail "console.log/debug found in src/:"
  grep -RE "console\.(log|debug)" src/ --include='*.ts' --include='*.tsx' 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Gate 7: No inline <Title order={1}> in src/features/ (use <PageHeader>)
# Excludes src/components/ where PageHeader itself renders <Title order={1}>.
# ---------------------------------------------------------------------------
echo "Gate 7: no inline <Title order={1}> in src/features/..."
GATE7=$(grep -RE "<Title order=\{1\}" src/features/ 2>/dev/null || true)
if [ -n "$GATE7" ]; then
  fail "inline <Title order={1}> found in src/features/ — use <PageHeader>:"
  echo "$GATE7"
fi

# ---------------------------------------------------------------------------
# Gate 8: No inline ApiError red <Alert> in src/features/ (use <ErrorState>)
# Specifically checks for the pattern where ApiError.is() is evaluated inside
# a red Alert — the form that should be replaced by <ErrorState error={...} />.
# Non-ApiError alertMsg strings in modals/forms are permitted.
# ---------------------------------------------------------------------------
echo "Gate 8: no inline ApiError <Alert color=\"red\"> in src/features/..."
GATE8=$(grep -RE "Alert[^>]*color=\"red\"[^>]*>.*ApiError\.is\|ApiError\.is.*Alert[^>]*color=\"red\"" src/features/ 2>/dev/null || true)
if [ -n "$GATE8" ]; then
  fail "inline ApiError <Alert color=\"red\"> found in src/features/ — use <ErrorState>:"
  echo "$GATE8"
fi

echo ""
if [ "$FAILED" -ne 0 ]; then
  echo "GREP GATES FAILED — fix the issues above before merging."
  exit 1
else
  echo "All grep gates passed."
  exit 0
fi
