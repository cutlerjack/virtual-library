function isArrayBufferLike(value) {
  return value instanceof ArrayBuffer
    || Object.prototype.toString.call(value) === '[object ArrayBuffer]'
}

export function toExactUint8Array(input) {
  if (input instanceof Uint8Array) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  }
  if (isArrayBufferLike(input)) {
    return new Uint8Array(input)
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  }
  throw new Error('Unsupported binary payload')
}

export function toCloneSafeArrayBuffer(input) {
  const bytes = toExactUint8Array(input)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}
