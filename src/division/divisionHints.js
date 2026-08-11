// Управление текстовыми подсказками для ребёнка

// Находит ближайший ПРЕДЫДУЩИЙ реальный (ненулевой) шаг для произвольного
// индекса цифры частного — своя копия, независимая от division.js, чтобы
// не тянуть общий код между файлами для этой конкретной задачи.
function findPrecedingStepInfoForHint(stepsData, quotientIndex) {
  for (let i = stepsData.length - 1; i >= 0; i--) {
    if (stepsData[i].quotientIndex < quotientIndex) {
      return { step: stepsData[i], stepArrIdx: i };
    }
  }
  return null;
}

export function updateHintMessage(focusedRow, stepsData, dividend, divisor, hintsEnabled) {
  const sideHint = document.getElementById('sideHint');
  const sideHintText = document.getElementById('sideHintText');
  
  if (!hintsEnabled) {
    if (sideHint) sideHint.style.visibility = 'hidden';
    return;
  }
  
  let text = '';
  let useHTML = false;
  
  if (focusedRow.step === null) {
    const quotientIndex = focusedRow.quotientIndex || 0;
    const stepData = stepsData.find(s => s.quotientIndex === quotientIndex);
    
    if (stepData) {
      // Реальная (ненулевая) цифра частного — как было, без изменений.
      const partialDividend = stepData.partialDividend;
      const answer = stepData.quotientDigit;
      text = `Введи цифру частного: ${partialDividend} ÷ ${divisor} = <span class="cell-pulse-yellow" style="display:inline-block;padding:1px 6px;border-radius:6px;background:#fde047;color:#c6654af2;">${answer}</span>`;
      useHTML = true;
    } else {
      // Это может быть либо самая первая цифра, либо чекпоинт нуля —
      // полностью раздельная проверка, без пересечения с веткой выше.
      const info = findPrecedingStepInfoForHint(stepsData, quotientIndex);
      const checkpointNum = info ? quotientIndex - info.step.quotientIndex : 0;
      const isCheckpoint = info && checkpointNum <= (info.step.zeroCheckpoints ? info.step.zeroCheckpoints.length : 0);

      if (isCheckpoint) {
        const digitsStr = String(dividend);
        let accVal = info.step.remainder;
        for (let c = info.step.position; c < info.step.position + checkpointNum; c++) {
          accVal = accVal * 10 + parseInt(digitsStr[c], 10);
        }
        text = `Так как ${accVal} меньше ${divisor}, запиши 0 в частное`;
      } else {
        text = `Введи первую цифру частного`;
      }
    }
  } else {
    const stepIndex = focusedRow.step;
    const stepData = stepsData[stepIndex];
    
    if (!stepData) {
      if (sideHint) sideHint.style.visibility = 'hidden';
      return;
    }
    
    if (focusedRow.type === 'product') {
      const quotientDigit = stepData.quotientDigit;
      const product = stepData.product;
      text = `Умножь ${quotientDigit} × ${divisor} = ${product}`;
    } else if (focusedRow.type === 'difference') {
      const isCheckpointStep = stepData.zeroCheckpoints && stepData.zeroCheckpoints.length > 0;

      if (isCheckpointStep) {
        // Отдельная, самостоятельная ветка (работает и для хвостовых нулей
        // последнего шага тоже) — не переиспользует числа обычной ветки
        // ниже (они там всегда от исходного шага, устаревают по ходу
        // прохождения нулей).
        text = `Сноси следующую цифру и сравнивай с делителем`;
      } else {
        const partialDividend = stepData.partialDividend;
        const product = stepData.product;
        const remainder = stepData.remainder;

        if (stepIndex === stepsData.length - 1) {
          text = `Вычти ${partialDividend} − ${product} = ${remainder}`;
        } else {
          const nextStepData = stepsData[stepIndex + 1];
          const nextPartial = nextStepData ? nextStepData.partialDividend : remainder;
          text = `Вычти ${partialDividend} − ${product}, сноси цифру = ${nextPartial}`;
        }
      }
    }
  }
  
  if (sideHintText) {
    if (useHTML) {
      sideHintText.innerHTML = text;
    } else {
      sideHintText.textContent = text;
    }
  }
  if (sideHint) sideHint.style.visibility = text ? 'visible' : 'hidden';
}

export function clearHintMessage() {
  const sideHint = document.getElementById('sideHint');
  if (sideHint) sideHint.style.visibility = 'hidden';
}

export function showSuccessHint() {
  // Не показываем — поздравление теперь в checkMessage
}