/**
 * src/features/sales/ShortfallBanner.tsx
 *
 * Renders the 422 shortfall envelope inline in the FEFO preview right column.
 * Clay-red Alert, dismissible. NOT a toast.
 */

import { Alert } from '@mantine/core'
import { formatQty } from '@/utils/qty'
import type { BaseUnit } from '@/utils/qty'

export type ShortfallBannerProps = {
  productName: string
  required: string
  available: string
  baseUnit: BaseUnit
  onDismiss: () => void
}

export function ShortfallBanner({
  productName,
  required,
  available,
  baseUnit,
  onDismiss,
}: ShortfallBannerProps) {
  return (
    <Alert
      color="red"
      withCloseButton
      onClose={onDismiss}
      title="Cannot commit — insufficient stock"
    >
      {`Cannot commit — Product '${productName}' requires ${formatQty(required, baseUnit)} but only ${formatQty(available, baseUnit)} on hand.`}
    </Alert>
  )
}
