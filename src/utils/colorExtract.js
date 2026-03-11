// Simple color extraction from image URL
// Uses canvas to sample the dominant color

const colorCache = new Map()

export async function extractDominantColor(imageUrl) {
  if (!imageUrl) return getRandomSpineColor()

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)
  }

  try {
    const img = new Image()
    img.crossOrigin = 'Anonymous'

    const color = await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = 10
        canvas.height = 10

        ctx.drawImage(img, 0, 0, 10, 10)

        const imageData = ctx.getImageData(0, 0, 10, 10).data

        let r = 0, g = 0, b = 0, count = 0

        for (let i = 0; i < imageData.length; i += 4) {
          // Skip very light or very dark pixels
          const brightness = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3
          if (brightness > 30 && brightness < 220) {
            r += imageData[i]
            g += imageData[i + 1]
            b += imageData[i + 2]
            count++
          }
        }

        if (count > 0) {
          r = Math.round(r / count)
          g = Math.round(g / count)
          b = Math.round(b / count)

          // Darken the color slightly for book spine look
          r = Math.max(0, Math.round(r * 0.7))
          g = Math.max(0, Math.round(g * 0.7))
          b = Math.max(0, Math.round(b * 0.7))

          resolve(`rgb(${r}, ${g}, ${b})`)
        } else {
          resolve(getRandomSpineColor())
        }
      }

      img.onerror = () => {
        resolve(getRandomSpineColor())
      }

      img.src = imageUrl
    })

    colorCache.set(imageUrl, color)
    return color
  } catch {
    return getRandomSpineColor()
  }
}

const spineColors = [
  '#2d5a27', // Forest green
  '#8b4513', // Saddle brown
  '#654321', // Dark brown
  '#1a3a5c', // Navy blue
  '#5c1a1a', // Dark red
  '#3d3d3d', // Charcoal
  '#4a3728', // Coffee
  '#2e4a3e', // Dark teal
  '#4a3048', // Plum
  '#3a4a5c', // Slate blue
]

export function getRandomSpineColor() {
  return spineColors[Math.floor(Math.random() * spineColors.length)]
}
