const BLOCKED_TAGS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'object',
  'embed',
  'img',
  'picture',
  'source',
  'video',
  'audio',
  'link',
  'meta',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
]

const URL_ATTRIBUTES = ['href', 'src', 'xlink:href', 'formaction']

function getBaseOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://local.virtual-library.invalid'
}

function isAllowedUrl(value) {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true
  if (trimmed.startsWith('data:image/')) return true

  try {
    const parsed = new URL(trimmed, getBaseOrigin())
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function sanitizeCapturedHtml(html) {
  return prepareCapturedHtml(html).sanitizedHtml
}

export function prepareCapturedHtml(html) {
  if (!html) {
    return {
      sanitizedHtml: '',
      plainText: '',
      quarantined: false,
      reason: null,
    }
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    doc.querySelectorAll(BLOCKED_TAGS.join(',')).forEach((node) => node.remove())

    doc.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase()
        const value = attribute.value

        if (name.startsWith('on') || name === 'srcdoc') {
          node.removeAttribute(attribute.name)
          return
        }

        if (URL_ATTRIBUTES.includes(name) && !isAllowedUrl(value)) {
          node.removeAttribute(attribute.name)
          return
        }

        if (node.tagName === 'A' && name === 'href' && isAllowedUrl(value)) {
          node.setAttribute('target', '_blank')
          node.setAttribute('rel', 'noreferrer noopener')
        }
      })
    })

    const sanitizedHtml = doc.body?.innerHTML || ''
    const plainText = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || ''

    return {
      sanitizedHtml,
      plainText,
      quarantined: false,
      reason: null,
    }
  } catch (error) {
    return {
      sanitizedHtml: '',
      plainText: stripHtmlFallback(html),
      quarantined: true,
      reason: error?.message || 'sanitize_failed',
    }
  }
}

function stripHtmlFallback(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
