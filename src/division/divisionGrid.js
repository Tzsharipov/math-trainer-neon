// Построение HTML сетки для деления уголком (портировано из Laravel/DivisionGrid.vue)
import { calculateDivisionSteps } from './divisionAlgorithm.js';

export function buildGrid(
  dividendVal,
  divisorVal,
  settingsPanel,
  workspace,
  mathGrid,
  checkMessage,
  steps,
  stepsData,
  inputRefs,
  focusedRow,
  quotientInputs,
  setupLogic
) {
  settingsPanel.classList.add('hidden');
  workspace.classList.remove('hidden');
  workspace.classList.add('flex');
  
  checkMessage.textContent = '';
  
  for (let key in inputRefs) {
    delete inputRefs[key];
  }
  focusedRow.step = null;
  focusedRow.type = null;
  
  const dividendStr = String(dividendVal);
  const divisorStr = String(divisorVal);
  const quotient = Math.floor(dividendVal / divisorVal);
  const quotientStr = String(quotient);
  
  const calculatedSteps = calculateDivisionSteps(dividendVal, divisorVal);
  stepsData.length = 0;
  stepsData.push(...calculatedSteps);
  
  quotientInputs.length = 0;
  quotientInputs.push(...Array(quotientStr.length).fill(''));
  
  const divLen = dividendStr.length;
  // Строк "умножь"/"вычти" — по числу РЕАЛЬНЫХ (ненулевых) шагов, не по числу
  // цифр частного. У цифр-нулей своей пары строк нет.
  steps.length = 0;
  steps.push(...Array.from({ length: stepsData.length }).map(() => ({
    productInput: Array(divLen).fill(''),
    differenceInput: Array(divLen).fill(''),
    productStatus: null,
    differenceStatus: null,
    offset: 0
  })));
  
  const dividendDigits = dividendStr.split('').map(Number);
  const divisorDigits = divisorStr.split('').map(Number);
  
  const dividendCols = dividendDigits.length;
  const quotientCols = Math.max(quotientStr.length, divisorDigits.length);
  const totalGridCols = dividendCols + 1 + quotientCols;
  
  const cellWidth = `clamp(24px, calc(85vw / ${totalGridCols}), 32px)`;
  const fontSize = `clamp(11px, calc(60vw / ${totalGridCols}), 16px)`;
  
  let html = `<div class="bg-gray-100 border-2 border-gray-400 rounded-lg shadow p-2 md:p-4 mx-auto grid gap-x-1 items-start" 
    style="grid-template-columns: repeat(${dividendCols}, ${cellWidth}) 2px repeat(${quotientCols}, ${cellWidth});">`;
  
  dividendDigits.forEach((d, i) => {
    html += `<div style="grid-row: 1; grid-column: ${i + 1}; margin-bottom: 4px; width: ${cellWidth}; height: ${cellWidth}; line-height: ${cellWidth}; font-size: ${fontSize};" 
      class="bg-pink-300 text-gray-800 rounded-md font-bold text-center flex items-center justify-center">${d}</div>`;
  });
  
  divisorDigits.forEach((d, i) => {
    const col = dividendCols + 2 + i;
    html += `<div style="grid-row: 1; grid-column: ${col}; margin-bottom: 4px; width: ${cellWidth}; height: ${cellWidth}; line-height: ${cellWidth}; font-size: ${fontSize};" 
      class="bg-yellow-400 text-gray-800 rounded-md font-bold text-center flex items-center justify-center">${d}</div>`;
  });
  
  quotientStr.split('').forEach((_, i) => {
    const col = dividendCols + 2 + i;
    html += `<input type="text" inputmode="numeric" maxlength="1" 
      data-quotient-index="${i}"
      style="grid-row: 2; grid-column: ${col}; margin-top: 4px; width: ${cellWidth}; height: ${cellWidth}; font-size: ${fontSize};"
      class="quotient-input text-center border-2 border-gray-300 bg-blue-200 rounded font-black outline-none focus:border-blue-400 transition-all shadow-sm">`;
  });
  
  html += `<div class="border-l-2 border-gray-400 row-span-full" style="grid-column: ${dividendCols + 1};"></div>`;
  
  let currentRow = 2;
  stepsData.forEach((stepData, sIdx) => {
    const offset = stepData.offset;
    
    const productStr = String(stepData.product);
    // Произведение выравнивается по ПРАВОМУ краю неполного делимого (как
    // в обычном вычитании в столбик — единицы под единицами), а не по
    // левому. Если произведение короче делимого — сдвигаем старт вправо.
    const productOffset = offset + String(stepData.partialDividend).length - productStr.length;
    for (let c = 0; c < divLen; c++) {
      const col = c + 1;
      const dp = c - productOffset;
      const correctDigit = (dp >= 0 && dp < productStr.length) ? productStr[dp] : '';
      html += `<input type="text" inputmode="numeric" maxlength="1" 
        data-step="${sIdx}" data-type="product" data-col="${c}"
        data-step-type="product" data-correct="${correctDigit}"
        style="grid-row: ${currentRow}; grid-column: ${col}; width: ${cellWidth}; height: ${cellWidth}; font-size: ${fontSize}; margin-top: ${sIdx === 0 ? '4px' : '0'};"
        class="step-input text-center border-2 border-gray-300 bg-yellow-100 rounded font-black outline-none focus:border-blue-400 transition-all shadow-sm">`;
    }
    currentRow++;

    const isLastStep = sIdx === stepsData.length - 1;
    let diffStr, diffOff;
    if (stepData.zeroCheckpoints && stepData.zeroCheckpoints.length > 0) {
      if (isLastStep) {
        // Хвостовые нули (сносить после них больше нечего). Остаток здесь
        // ВСЕГДА виден явно (это последний шаг, как и раньше), плюс все
        // хвостовые снесённые цифры подряд, взятые прямо из делимого.
        const remainderLen = String(stepData.remainder).length;
        diffOff = offset + String(stepData.partialDividend).length - remainderLen;
        const trailingDigits = dividendVal.toString().slice(stepData.position, stepData.position + stepData.zeroCheckpoints.length);
        diffStr = String(stepData.remainder) + trailingDigits;
      } else {
        // Между этим и следующим шагом были нули. В строке физически видны:
        // сам остаток этого шага (если он не 0 — тогда он невидим, 0 ширины)
        // + все снесённые цифры подряд, взятые прямо из делимого (а не из
        // числового значения — иначе ведущий ноль среди снесённых цифр
        // потерялся бы, например 068 → 68).
        const rw = stepData.remainder === 0 ? 0 : String(stepData.remainder).length;
        const remStr = stepData.remainder === 0 ? '' : String(stepData.remainder);
        diffOff = stepData.position - rw;
        diffStr = remStr + dividendVal.toString().slice(stepData.position, stepData.position + stepData.zeroCheckpoints.length + 1);
      }
    } else if (isLastStep) {
      diffStr = String(stepData.remainder);
      diffOff = offset + String(stepData.partialDividend).length - diffStr.length;
    } else {
      diffStr = String(stepsData[sIdx + 1].partialDividend);
      diffOff = stepsData[sIdx + 1].offset;
    }
    for (let c = 0; c < divLen; c++) {
      const col = c + 1;
      const dp = c - diffOff;
      const correctDigit = (dp >= 0 && dp < diffStr.length) ? diffStr[dp] : '';
      html += `<input type="text" inputmode="numeric" maxlength="1" 
        data-step="${sIdx}" data-type="difference" data-col="${c}"
        data-step-type="difference" data-correct="${correctDigit}"
        style="grid-row: ${currentRow}; grid-column: ${col}; width: ${cellWidth}; height: ${cellWidth}; font-size: ${fontSize}; margin-bottom: 2px;"
        class="step-input text-center border-2 border-gray-300 bg-blue-100 rounded font-black outline-none focus:border-blue-400 transition-all shadow-sm">`;
    }
    currentRow++;
  });
  
  html += `</div>`;
  
  mathGrid.innerHTML = html;
  setupLogic();
  
  const firstQuotient = document.querySelector('[data-quotient-index="0"]');
  if (firstQuotient) firstQuotient.focus();
}
