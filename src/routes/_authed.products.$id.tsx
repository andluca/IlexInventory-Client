import { createFileRoute } from '@tanstack/react-router'
import { ProductDetailPage } from '@/features/catalog/ProductDetailPage'

/**
 * Route: /products/:id
 *
 * id param is a UUID product identifier.
 * Cross-owner / not-found → rendered as 404 by the page component
 * (no route-level error handling — the page handles 404 inline per BE-D4).
 */
export const Route = createFileRoute('/_authed/products/$id')({
  component: ProductDetailPage,
})
