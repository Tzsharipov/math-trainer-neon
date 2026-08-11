// Управление подсветкой ячеек (из Laravel/useHighlights.js)
import { clampInt } from './divisionHelpers.js';

export function clearHighlights(inputRefs) {
  for (const k in inputRefs) {
    const el = inputRefs[k]
    if (!el) continue
    // Мигание убираем со ВСЕХ ячеек, включая зелёные/красные
    el.classList.remove('cell-pulse-yellow', 'cell-pulse-orange')
    const bg = el.style.backgroundColor
    // НЕ стираем зелёный и красный фон (результаты проверки)
    if (bg === 'rgb(134, 239, 172)' || bg === 'rgb(255, 154, 154)') {
      continue
    }
    el.style.backgroundColor = ''
  }
}

export function highlightElement(el, type, hintsEnabled) {
  if (!el) return
  
  if (type === 'hint') {
    if (!hintsEnabled) return
    
    const currentBg = el.style.backgroundColor
    if (currentBg === 'rgb(134, 239, 172)' || currentBg === 'rgb(255, 154, 154)') {
      return
    }
    
    if (el.dataset.stepType === 'product') {
      el.style.backgroundColor = '#ff9800'
      el.classList.add('cell-pulse-orange')
    } else if (el.dataset.stepType === 'difference') {
      el.style.backgroundColor = '#fff59d'
      el.classList.add('cell-pulse-yellow')
    } else if ('quotientIndex' in el.dataset) {
      el.style.backgroundColor = '#ff9800'
      el.classList.add('cell-pulse-orange')
    }
  } else if (type === 'ok') {
    el.classList.remove('cell-pulse-yellow', 'cell-pulse-orange')
    el.style.backgroundColor = '#86efac'
  } else if (type === 'wrong') {
    el.classList.remove('cell-pulse-yellow', 'cell-pulse-orange')
    el.style.backgroundColor = '#ff9a9a'
  }
}

export function updateHighlightsForStep(stepIndex, inputRefs, stepsData, dividendDigitsArray, hintsEnabled) {
  clearHighlights(inputRefs)
  if (!stepsData.length) return
  const sd = stepsData[stepIndex]
  if (!sd) return
  
  const productStr = String(sd.product)
  const len = productStr.length
  // Произведение выровнено по правому краю неполного делимого.
  const offset = clampInt(sd.offset + String(sd.partialDividend).length - len, 0, dividendDigitsArray.length - 1)
  
  for (let c = offset; c < offset + len; c++) {
    const key = `${stepIndex}:product:${c}`
    highlightElement(inputRefs[key], 'hint', hintsEnabled)
  }
  
  const qKey = `q:${sd.quotientIndex}`
  highlightElement(inputRefs[qKey], 'hint', hintsEnabled)
}

export function updateHighlights(focusedRow, inputRefs, stepsData, dividendDigitsArray, hintsEnabled) {
  clearHighlights(inputRefs)
  if (!stepsData.length) return
  
  if (focusedRow.step === null) {
    const qIdx = focusedRow.quotientIndex || 0
    const stepIdx = stepsData.findIndex(s => s.quotientIndex === qIdx)
    updateHighlightsForStep(stepIdx >= 0 ? stepIdx : 0, inputRefs, stepsData, dividendDigitsArray, hintsEnabled)
    return
  }
  
  const stepIndex = focusedRow.step
  const stepDatum = stepsData[stepIndex]
  if (!stepDatum) return
  
  if (focusedRow.type === 'product') {
    const productStr = String(stepDatum.product)
    const len = productStr.length
    const offset = clampInt(stepDatum.offset + String(stepDatum.partialDividend).length - len, 0, dividendDigitsArray.length - 1)
    
    for (let c = offset; c < offset + len; c++) {
      const key = `${stepIndex}:product:${c}`
      highlightElement(inputRefs[key], 'hint', hintsEnabled)
    }
    
    const qKey = `q:${stepDatum.quotientIndex}`
    highlightElement(inputRefs[qKey], 'hint', hintsEnabled)
  } else if (focusedRow.type === 'difference') {
    const next = stepsData[stepIndex + 1]
    if (next) {
      const pdStr = String(next.partialDividend)
      const len = pdStr.length
      const offset = clampInt(next.offset, 0, dividendDigitsArray.length - 1)
      for (let c = offset; c < offset + len; c++) {
        const key = `${stepIndex}:difference:${c}`
        highlightElement(inputRefs[key], 'hint', hintsEnabled)
      }
    } else {
      // Последний шаг — подсвечиваем ячейки разности по ширине ОСТАТКА
      // (а не неполного делимого — это разные числа и разная ширина).
      const remStr = String(stepDatum.remainder)
      const remLen = remStr.length
      const remOffset = clampInt(stepDatum.offset + String(stepDatum.partialDividend).length - remLen, 0, dividendDigitsArray.length - 1)
      for (let c = remOffset; c < remOffset + remLen; c++) {
        const key = `${stepIndex}:difference:${c}`
        highlightElement(inputRefs[key], 'hint', hintsEnabled)
      }
    }
  } else {
    updateHighlightsForStep(stepIndex, inputRefs, stepsData, dividendDigitsArray, hintsEnabled)
  }
}