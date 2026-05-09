/**
 * src/components/CsvExportButton.tsx
 *
 * Renders a Mantine Button as an anchor element (<a href download>) targeting
 * a CSV export endpoint. The browser navigates with the session cookie attached
 * automatically — this is the documented exception to the no-bare-fetch rule
 * per SPEC §2.5.
 *
 * No state, no effects, no fetch.
 * Lives in src/components/ so multiple features can reuse it without copy-paste:
 *  - FinancialSummary → /financials/dashboard
 *  - MarginByProductTable → /financials/margin
 *  - BatchDetailPage movements audit → /movements
 *  - RecallReportPage (deferred from ILE-6) → /batches/{id}/recall-report
 */

import { Button } from '@mantine/core'
import { csvExportUrl } from '@/utils/csv-export'

export interface CsvExportButtonProps {
  /** Endpoint path — must be in the CSV allowlist (SPEC §2.5). Throws otherwise. */
  path: string
  /** Optional query params. Undefined values are dropped. */
  params?: Record<string, string | number | undefined> | undefined
  /** Button label. Defaults to "Download CSV". */
  label?: string
  /** Mantine Button variant. Defaults to 'subtle'. */
  variant?: 'subtle' | 'default'
}

export function CsvExportButton({
  path,
  params,
  label = 'Download CSV',
  variant = 'subtle',
}: CsvExportButtonProps) {
  // csvExportUrl throws immediately for non-allowlisted paths — loud at call site.
  const href = csvExportUrl(path, params)

  return (
    <Button
      component="a"
      href={href}
      download
      variant={variant}
      size="sm"
    >
      {label}
    </Button>
  )
}
