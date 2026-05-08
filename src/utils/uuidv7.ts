/**
 * src/utils/uuidv7.ts
 *
 * UUIDv7 generator (time-ordered, 48-bit ms timestamp).
 *
 * Uses the maintained `uuidv7` npm package (~1 kb, MIT) rather than a hand-rolled
 * implementation — cryptographic uniqueness is the load-bearing property; using a
 * tested library avoids subtle bit-packing bugs.
 *
 * Used by apiClient as the default Idempotency-Key mint.
 */
export { uuidv7 } from 'uuidv7'
