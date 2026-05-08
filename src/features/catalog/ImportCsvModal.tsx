/**
 * src/features/catalog/ImportCsvModal.tsx
 *
 * "Import CSV" modal (F2 + F11 flow). Multipart upload to POST /products/import.
 * Idempotency-Key is auto-attached by the apiClient middleware.
 * Renders per-row error panel when import partially fails.
 */

import { useState, useRef } from 'react'
import { Modal, Button, Text, Stack, Alert, Group, FileInput } from '@mantine/core'
import { useImportProducts } from '@/data/catalog/mutations'
import type { FailedRowResponse } from '@/data/catalog/mutations'
import { useQueryClient } from '@tanstack/react-query'
import { catalogKeys } from '@/data/catalog/keys'
import { ApiError } from '@/api/errors'

interface ImportCsvModalProps {
  opened: boolean
  onClose: () => void
}

export function ImportCsvModal({ opened, onClose }: ImportCsvModalProps) {
  const queryClient = useQueryClient()
  const importProducts = useImportProducts()
  const [file, setFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{
    imported: number
    failed: FailedRowResponse[]
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const idempotencyKeyRef = useRef<string | null>(null)

  function handleClose() {
    // If a successful import happened, invalidate the list
    if (importResult !== null) {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
    }
    setFile(null)
    setImportResult(null)
    setErrorMsg(null)
    idempotencyKeyRef.current = null
    importProducts.reset()
    onClose()
  }

  function handleSubmit() {
    if (!file) return
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('file', file)

    importProducts.mutate(formData, {
      onSuccess: (data) => {
        setImportResult(data)
      },
      onError: (error) => {
        if (ApiError.is(error)) {
          setErrorMsg(error.detail ?? error.error)
        } else {
          setErrorMsg('An error occurred during import')
        }
      },
    })
  }

  function formatFailedRows(failed: FailedRowResponse[]): string {
    return failed
      .map((row) => {
        const fields = row.fields
          ? Object.entries(row.fields)
              .flatMap(([k, v]) => v.map((msg) => `${k}: ${msg}`))
              .join('; ')
          : ''
        return `Row ${row.row_index}: ${row.error}${row.detail ? ` — ${row.detail}` : ''}${fields ? ` (${fields})` : ''}`
      })
      .join('\n')
  }

  async function handleCopyErrors() {
    if (!importResult?.failed.length) return
    const text = formatFailedRows(importResult.failed)
    await navigator.clipboard.writeText(text)
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Import CSV" centered>
      <Stack gap="sm">
        {importResult === null && (
          <>
            <Text size="sm" c="dimmed">
              CSV columns: sku, name, description, base_unit. Existing SKUs are skipped.
            </Text>

            <FileInput
              label="CSV file"
              placeholder="Choose a .csv file"
              accept=".csv"
              value={file}
              onChange={setFile}
            />

            {errorMsg && (
              <Alert color="red" data-testid="import-error">
                {errorMsg}
              </Alert>
            )}

            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleClose} disabled={importProducts.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                loading={importProducts.isPending}
                disabled={!file}
              >
                Import
              </Button>
            </Group>
          </>
        )}

        {importResult !== null && (
          <>
            <Alert color="teal">
              Imported {importResult.imported} products
            </Alert>

            {importResult.failed.length > 0 && (
              <Alert color="yellow" title={`${importResult.failed.length} rows failed`}>
                <Stack gap="xs">
                  {importResult.failed.map((row) => (
                    <Text key={row.row_index} size="xs" ff="monospace">
                      Row {row.row_index}: {row.error}
                      {row.detail ? ` — ${row.detail}` : ''}
                    </Text>
                  ))}
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => void handleCopyErrors()}
                  >
                    Copy errors
                  </Button>
                </Stack>
              </Alert>
            )}

            <Group justify="flex-end">
              <Button onClick={handleClose}>Done</Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
