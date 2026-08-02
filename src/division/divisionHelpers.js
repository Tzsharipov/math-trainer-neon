// Утилиты и вспомогательные функции

export function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min
  return n < min ? min : n > max ? max : n
}

export function clampInt(n, min, max) {
  const v = Number.isFinite(n) ? Math.floor(n) : min
  if (v < min) return min
  if (v > max) return max
  return v
}

export function generateNumber(digits) {
  const d = clamp(Math.floor(digits), 2, 9)
  const min = Math.pow(10, d - 1)
  const max = Math.pow(10, d) - 1
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function hasZeroInside(num) {
  const str = String(num)
  for (let i = 0; i < str.length - 1; i++) {
    if (str[i] === '0') return true
  }
  return false
}

export function getUserNumber(inputArray) {
  const filledDigits = inputArray.filter(d => d !== '')
  return filledDigits.join('').replace(/^0+/, '') || '0'
}

// Строит частное заданной длины с нулём где-то ВНУТРИ (не первая, не последняя цифра)
export function generateNumberWithZeroInside(digits) {
  const arr = []
  arr.push(String(Math.floor(Math.random() * 9) + 1)) // первая цифра 1-9
  const zeroPos = 1 + Math.floor(Math.random() * (digits - 2)) // случайная позиция внутри
  for (let i = 1; i < digits - 1; i++) {
    arr.push(i === zeroPos ? '0' : String(Math.floor(Math.random() * 9) + 1))
  }
  arr.push(String(Math.floor(Math.random() * 9) + 1)) // последняя цифра 1-9
  return parseInt(arr.join(''))
}

// Единая функция сборки примера — используется вместо 3 копий одинакового кода в division.js
export function buildExample(dividendDigits, divisorDigits, exampleType = 'normal') {
  const quotientDigitsCount = dividendDigits - divisorDigits + 1
  if (quotientDigitsCount < 1) return null

  // Ноль внутри частного математически невозможен при частном короче 3 цифр
  if (exampleType === 'zeroInside' && quotientDigitsCount < 3) {
    return { unsupported: true, reason: 'quotientTooShort' }
  }

  const MAX_ATTEMPTS = 100

  for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
    const divisor = generateNumber(divisorDigits)
    let q

    if (exampleType === 'zeroInside') {
      q = generateNumberWithZeroInside(quotientDigitsCount)
    } else {
      q = generateNumber(quotientDigitsCount)
    }

    const dividend = q * divisor
    if (String(dividend).length !== dividendDigits) continue

    if (hasZeroInside(dividend) || hasZeroInside(divisor)) continue
    if (exampleType !== 'zeroInside' && String(q).includes('0')) continue

    return { dividend, divisor, quotient: q }
  }

  return null
}