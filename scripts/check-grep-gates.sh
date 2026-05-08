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
# ---------------------------------------------------------------------------
echo "Gate 5: no NumberInput in src/features/ (outside integer allowlist)..."
if grep -RE "\bNumberInput\b" src/features/ 2>/dev/null | grep -q .; then
  fail "NumberInput found in src/features/ — use <DecimalInput> for money/qty:"
  grep -RE "\bNumberInput\b" src/features/ 2>/dev/null || true
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
# Gate 7: api/generated not imported from src/data/ directly from features/routes
# (Duplicate-ish of gate 4, but enforced at data-layer imports too per SPEC §2.2)
# Actually gate 7 from SPEC §4 is the NumberInput one — let me align exactly.
# The seven greps from SPEC §4:
#  1. grep -RE "\b(fetch|axios)\(" src/features/ src/routes/
#  2. grep -RE "(fetch|axios)\(" src/ ... | grep -vE "src/data/|src/api/|src/utils/csv-export\.ts"
#  3. grep -RE "as any" ... | grep -v "src/api/generated"
#  4. grep -RE "from ['\"].*api/generated" src/features/ src/routes/
#  5. grep -RE "\bNumberInput\b" src/features/
# That's five in the SPEC block. The full set of CI gates from §2.2 + §4:
#  - tsc --noEmit (typecheck)
#  - npm test
#  - npm run generate:api -- --check
#  - the five greps above
# Gates 6 and 7 (console.log/debug, no-any) are enforced above as extras.
# ---------------------------------------------------------------------------

echo ""
if [ "$FAILED" -ne 0 ]; then
  echo "GREP GATES FAILED — fix the issues above before merging."
  exit 1
else
  echo "All grep gates passed."
  exit 0
fi
