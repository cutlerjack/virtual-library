import { toExactUint8Array } from './binary'

export async function computeSha256(buffer) {
  const inputBytes = toExactUint8Array(buffer)
  const hashBuffer = await crypto.subtle.digest('SHA-256', inputBytes)
  const outputBytes = Array.from(new Uint8Array(hashBuffer))
  return outputBytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}
