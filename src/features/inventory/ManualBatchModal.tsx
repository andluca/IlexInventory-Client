/**
 * src/features/inventory/ManualBatchModal.tsx
 *
 * F4 — Manual batch creation modal.
 * Form: product_id (Select), batch_code (required), expiration_date (optional DateInput),
 * unit_cost (DecimalInput), initial_quantity (DecimalInput in display units).
 * Action-confirmation step before POST.
 * Idempotency-Key auto-attached by apiClient middleware.
 */

import { useState, useEffect } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { DecimalInput } from '@/components/DecimalInput'
import { useCreateBatch } from '@/data/inventory/mutations'
import { useProductsList } from '@/data/catalog/queries'
import { ApiError } from '@/api/errors'

export type ManualBatchModalProps = {
  opened: boolean
  onClose: () => void
  defaultProductId?: string
}

export function ManualBatchModal({ opened, onClose, defaultProductId }: ManualBatchModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [productId, setProductId] = useState<string>(defaultProductId ?? '')
  const [batchCode, setBatchCode] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [initialQuantity, setInitialQuantity] = useState('')
  const [alertMsg, setAlertMsg] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const createBatch = useCreateBatch()
  const products = useProductsList({ limit: 200 })

  useEffect(() => {
    if (opened) {
      setProductId(defaultProductId ?? '')
      setBatchCode('')
      setExpirationDate('')
      setUnitCost('')
      setInitialQuantity('')
      setAlertMsg(null)
      setFieldErrors({})
      setConfirming(false)
    }
  }, [opened, defaultProductId])

  const productOptions =
    products.data?.items.map((p) => ({ value: p.id, label: p.name })) ?? []

  const selectedProduct = products.data?.items.find((p) => p.id === productId)

  function validate() {
    const errors: Record<string, string> = {}
    if (!productId) errors.product_id = 'Product is required'
    if (!batchCode.trim()) errors.batch_code = 'Batch code is required'
    if (!unitCost || unitCost === '0') errors.unit_cost = 'Unit cost is required'
    if (!initialQuantity || initialQuantity === '0') errors.initial_quantity = 'Initial quantity is required'
    return errors
  }

  function handleContinue() {
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setConfirming(true)
  }

  function handleSubmit() {
    setAlertMsg(null)
    createBatch.mutate(
      {
        product_id: productId,
        batch_code: batchCode.trim(),
        ...(expirationDate ? { expiration_date: expirationDate } : {}),
        unit_cost: Number(unitCost),
        initial_quantity: Number(initialQuantity),
      },
      {
        onSuccess: () => {
          notifications.show({ color: 'green', title: 'Batch created', message: 'New batch added to stock.' })
          onClose()
        },
        onError: (error) => {
          if (ApiError.is(error) && error.fields) {
            setFieldErrors(Object.fromEntries(
              Object.entries(error.fields).map(([k, v]) => [k, String(v)])
            ))
            setConfirming(false)
          } else if (ApiError.is(error)) {
            setAlertMsg(error.detail ?? error.error)
            setConfirming(false)
          }
        },
      },
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="New batch" size="md">
      <Stack>
        {alertMsg && <Alert color="red">{alertMsg}</Alert>}

        {!confirming ? (
          <>
            <Select
              label="Product"
              data={productOptions}
              value={productId}
              onChange={(v) => setProductId(v ?? '')}
              required
              error={fieldErrors.product_id}
              placeholder="Select a product"
            />

            <TextInput
              label="Batch code"
              value={batchCode}
              onChange={(e) => setBatchCode(e.currentTarget.value)}
              required
              error={fieldErrors.batch_code}
              placeholder="LOT-2026-A"
            />

            <TextInput
              label="Expiration date (optional)"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.currentTarget.value)}
            />

            <DecimalInput
              label="Unit cost"
              value={unitCost}
              onChange={setUnitCost}
              precision={4}
              placeholder="0.0000"
              required
              {...(fieldErrors.unit_cost ? { error: fieldErrors.unit_cost } : {})}
            />

            <DecimalInput
              label={`Initial quantity${selectedProduct ? ` (${selectedProduct.base_unit})` : ''}`}
              value={initialQuantity}
              onChange={setInitialQuantity}
              precision={4}
              placeholder="0.0000"
              required
              {...(fieldErrors.initial_quantity ? { error: fieldErrors.initial_quantity } : {})}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleContinue}>Continue to confirmation</Button>
            </Group>
          </>
        ) : (
          <>
            <Text>
              About to create batch <strong>{batchCode}</strong> for{' '}
              <strong>{selectedProduct?.name ?? productId}</strong> with initial quantity{' '}
              <strong>{initialQuantity}</strong>
              {selectedProduct ? ` ${selectedProduct.base_unit}` : ''}.
            </Text>

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setConfirming(false)} disabled={createBatch.isPending}>
                Back
              </Button>
              <Button onClick={handleSubmit} loading={createBatch.isPending}>
                Confirm
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
