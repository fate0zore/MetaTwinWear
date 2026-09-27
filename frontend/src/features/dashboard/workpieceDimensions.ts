/** Converts a three-dimensional workpiece size into the dashboard's display format. */
export function normalizeWorkpieceSize(value: string): string | null {
  const dimensions = value
    .trim()
    .replace(/[×xX]/g, ' ')
    .split(/\s+/)

  if (dimensions.length !== 3) return null

  const isPositiveNumber = dimensions.every((dimension) => {
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(dimension)) return false
    const numericValue = Number(dimension)
    return Number.isFinite(numericValue) && numericValue > 0
  })

  return isPositiveNumber ? dimensions.join(' × ') : null
}
