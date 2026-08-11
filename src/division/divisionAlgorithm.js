// Алгоритм расчёта шагов деления уголком.
// Шаг (пара умножь/вычти) создаётся ТОЛЬКО для ненулевых цифр частного.
// Для нулевых цифр отдельного шага нет — снесённая под них цифра дописывается
// в уже открытую строку "вычти" предыдущего (ненулевого) шага. Список
// zeroCheckpoints у каждого шага — на каких по счёту снесённых цифрах после
// него нужно вписать 0 в частное, прежде чем сносить следующую.
export function calculateDivisionSteps(dividend, divisor) {
  const divStr = String(dividend ?? '')
  const divs = Number(divisor ?? 0)
  if (!divStr || !divs) return []

  const correctQuotient = String(Math.floor(Number(dividend) / divs))
  const steps = []

  let pos = 0
  let currentNumber = 0
  let quotientIndex = 0

  while (pos < divStr.length) {
    currentNumber = currentNumber * 10 + parseInt(divStr[pos], 10)
    pos++
    if (currentNumber >= divs) break
  }

  while (quotientIndex < correctQuotient.length) {
    const quotientDigit = parseInt(correctQuotient[quotientIndex], 10)

    if (quotientDigit === 0) {
      if (pos < divStr.length) {
        currentNumber = currentNumber * 10 + parseInt(divStr[pos], 10)
        pos++
      }
      quotientIndex++
      continue
    }

    const partialDividend = currentNumber
    const product = quotientDigit * divs
    const remainder = partialDividend - product
    const offset = pos - String(partialDividend).length

    steps.push({
      partialDividend,
      quotientDigit,
      quotientIndex,
      product,
      remainder,
      position: pos,
      offset,
      zeroCheckpoints: []
    })

    currentNumber = remainder
    quotientIndex++
    if (pos < divStr.length) {
      currentNumber = currentNumber * 10 + parseInt(divStr[pos], 10)
      pos++
    }
  }

  // zeroCheckpoints считаем для ВСЕХ шагов, включая последний — хвостовые
  // нули в конце частного (когда сносить после них больше нечего) — это
  // тот же механизм, просто без перехода к следующему реальному шагу потом.
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    let val = step.remainder
    let p = step.position
    let count = 0
    const checkpoints = []
    while (p < divStr.length) {
      val = val * 10 + parseInt(divStr[p], 10)
      p++
      count++
      if (val >= divs) break
      checkpoints.push(count)
    }
    step.zeroCheckpoints = checkpoints
  }

  return steps
}
