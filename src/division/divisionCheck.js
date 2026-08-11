// ÐŸÑ€Ð¾Ð²ÐµÑ€ÐºÐ° Ð¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ð¾ÑÑ‚Ð¸ Ð¾Ñ‚Ð²ÐµÑ‚Ð¾Ð² (Ð¸Ð· Laravel/useDivisionChecks.js)
import { getUserNumber } from './divisionHelpers.js';
import { highlightElement, clearHighlights } from './divisionHighlights.js';

export function checkProduct(stepIndex, steps, stepsData, quotientInputs, inputRefs, hintsEnabled, quotientStatus, checkMessage) {
  const step = steps[stepIndex]
  
  if (stepIndex >= stepsData.length) {
    step.productStatus = 'wrong'
    return
  }
  
  const stepData = stepsData[stepIndex]
  const quotientIndex = stepData.quotientIndex
  
  const correctQuotientDigit = String(stepData.quotientDigit)
  const userQuotientDigit = quotientInputs[quotientIndex]
  
  if (userQuotientDigit !== correctQuotientDigit) {
    step.productStatus = 'wrong'
    highlightElement(inputRefs[`q:${quotientIndex}`], 'wrong', hintsEnabled)
    return
  }
  
  const correctProduct = String(stepData.product)
  const userProduct = getUserNumber(step.productInput)
  
  const isCorrect = userProduct === correctProduct
  step.productStatus = isCorrect ? 'correct' : 'wrong'
  
  // Ð•ÑÐ»Ð¸ ÑÑ‚Ð¾ Ð¿Ð¾ÑÐ»ÐµÐ´Ð½Ð¸Ð¹ ÑˆÐ°Ð³ Ð¸ Ð²ÑÑ‘ Ð¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ð¾
  if (isCorrect && stepIndex === stepsData.length - 1) {
    const allQuotientFilled = quotientInputs.every(q => q !== '')
    if (allQuotientFilled) {
      quotientStatus.value = 'correct'
    }
  }
  
  // ÐŸÐ¾Ð´ÑÐ²ÐµÑ‚ÐºÐ° Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð·Ð°Ð¿Ð¾Ð»Ð½ÐµÐ½Ð½Ñ‹Ñ… ÑÑ‡ÐµÐµÐº
  for (let c = 0; c < step.productInput.length; c++) {
    const key = `${stepIndex}:product:${c}`
    if (step.productInput[c] !== '') {
      highlightElement(inputRefs[key], isCorrect ? 'ok' : 'wrong', true)
    } else {
      if (inputRefs[key]) inputRefs[key].style.backgroundColor = ''
    }
  }
}

export function checkDifference(stepIndex, steps, stepsData, inputRefs, hintsEnabled, dividend, divisor, quotientInputs, onComplete) {
  const step = steps[stepIndex]
  
  if (stepIndex >= stepsData.length) {
    step.differenceStatus = 'wrong'
    return
  }
  
  const stepData = stepsData[stepIndex]
  let correctValue = '0'
  
  if (stepIndex === stepsData.length - 1) {
    correctValue = String(stepData.remainder)
  } else {
    const nextStepData = stepsData[stepIndex + 1]
    correctValue = String(nextStepData.partialDividend)
  }
  
  const userDiff = getUserNumber(step.differenceInput)
  const isCorrect = userDiff === correctValue || (userDiff === '' && correctValue === '0')
  
  step.differenceStatus = isCorrect ? 'correct' : 'wrong'
  
  // ÐŸÐ¾Ð´ÑÐ²ÐµÑ‚ÐºÐ° Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð·Ð°Ð¿Ð¾Ð»Ð½ÐµÐ½Ð½Ñ‹Ñ… ÑÑ‡ÐµÐµÐº
  for (let c = 0; c < step.differenceInput.length; c++) {
    const key = `${stepIndex}:difference:${c}`
    if (step.differenceInput[c] !== '') {
      highlightElement(inputRefs[key], isCorrect ? 'ok' : 'wrong', true)
    } else {
      if (inputRefs[key]) inputRefs[key].style.backgroundColor = ''
    }
  }
  
  // Ð•ÑÐ»Ð¸ Ð¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ð¾ Ð¸ ÑÑ‚Ð¾ Ð¿Ð¾ÑÐ»ÐµÐ´Ð½Ð¸Ð¹ ÑˆÐ°Ð³
  if (isCorrect && stepIndex === stepsData.length - 1) {
    // Завершать пример можно только когда ВСЁ частное (включая возможные
    // хвостовые нули после этого шага) заполнено и верно — не просто
    // когда этот последний шаг сам по себе верен.
    const correctQuotientStr = String(Math.floor(dividend / divisor));
    const quotientFullyCorrect = quotientInputs.length === correctQuotientStr.length &&
      quotientInputs.every((q, i) => q === correctQuotientStr[i]);

    if (quotientFullyCorrect) {
      // Поздравление и конфетти после последней разности
      const childName = localStorage.getItem('childName');
      const message = childName ? '🥳 Умничка, ' + childName + '! Пример решён верно!' : '🥳 Пример решён верно!';
      // Выводим поздравление в нижнюю подсказку (как в multiplication)
      const sideHint = document.getElementById('sideHint');
      const sideHintText = document.getElementById('sideHintText');
      const sideHintBox = sideHint ? sideHint.querySelector('div') : null;
      if (sideHintText) sideHintText.textContent = message;
      if (sideHintBox) sideHintBox.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      if (sideHint) sideHint.style.visibility = 'visible';

      if (window.confetti) {
        confetti({ particleCount: 200, spread: 120, origin: { x: 0.5, y: 0.6 }, colors: ['#FFD700', '#FF6347', '#00CED1', '#32CD32', '#FF69B4'], scalar: 1.5 });
        setTimeout(() => confetti({ particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.6 }, colors: ['#FFD700', '#FF6347', '#00CED1'], scalar: 1.5 }), 300);
        setTimeout(() => confetti({ particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.6 }, colors: ['#32CD32', '#FF69B4', '#FFD700'], scalar: 1.5 }), 600);
      }
      clearHighlights(inputRefs);
      if (onComplete) onComplete();
    }
  }
}

export function checkQuotient(dividend, divisor, quotientInputs, inputRefs, checkMessage) {
  // Поздравление уже выведено в checkDifference через sideHint
}