import './style.css';
import { generateNumber, hasZeroInside, buildExample } from './division/divisionHelpers.js';import { buildGrid } from './division/divisionGrid.js';
import { checkProduct, checkDifference, checkQuotient } from './division/divisionCheck.js';
import { updateHighlights, updateHighlightsForStep, clearHighlights } from './division/divisionHighlights.js';
import { updateHintMessage, clearHintMessage } from './division/divisionHints.js';

console.log('DIVISION.JS LOADED v4 (Ð¿Ð¾Ð»Ð½Ñ‹Ð¹ Ð¿Ð¾Ñ€Ñ‚ Ð¸Ð· Laravel)');

// DOM ÑÐ»ÐµÐ¼ÐµÐ½Ñ‚Ñ‹
const workspace = document.querySelector('#workspace');
const mathGrid = document.querySelector('#mathGrid');
const checkHints = document.querySelector('#checkHints');
const btnGen = document.querySelector('#btnGen');
const btnStartMan = document.querySelector('#btnStartMan');
const selectDividend = document.querySelector('#selectDividend');
const selectDivisor = document.querySelector('#selectDivisor');
const inDividend = document.querySelector('#inDividend');
const inDivisor = document.querySelector('#inDivisor');
const uiAuto = document.querySelector('#ui-auto');
const uiManual = document.querySelector('#ui-manual');
const checkMessage = document.querySelector('#checkMessage');
const btnClearAll = document.querySelector('#btnClearAll');
const settingsPanel = document.querySelector('#settingsPanel');
const btnNewExample = document.querySelector('#btnNewExample');
const btnBackToSettings = document.querySelector('#btnBackToSettings');

function getExampleType() {
  const el = document.querySelector('input[name="exampleType"]:checked');
  return el ? el.value : 'normal';
}

const ALL_DIVIDEND_OPTIONS = [3, 4, 5, 6, 7];

// Прячет из списка "разрядность делимого" варианты, для которых
// "Не забываем ноль!" физически невозможен (частное короче 3 цифр)
function updateDividendOptions() {
  const type = getExampleType();
  const divisorDigits = parseInt(selectDivisor.value);
  const currentValue = selectDividend.value;

  let allowed = ALL_DIVIDEND_OPTIONS;
  if (type === 'zeroInside') {
    const minDividend = divisorDigits + 2;
    allowed = ALL_DIVIDEND_OPTIONS.filter(v => v >= minDividend);
  }

  selectDividend.innerHTML = '';
  allowed.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = `${v}-значное делимое`;
    selectDividend.appendChild(opt);
  });

  if (allowed.includes(parseInt(currentValue))) {
    selectDividend.value = currentValue;
  } else if (allowed.length > 0) {
    selectDividend.value = String(allowed[0]);
  }
}

document.querySelectorAll('input[name="exampleType"]').forEach(radio => {
  radio.onchange = updateDividendOptions;
});
selectDivisor.onchange = updateDividendOptions;
updateDividendOptions();

const zeroBanner = document.querySelector('#zeroBanner');
const zeroBannerBarValue = document.querySelector('#zeroBannerBarValue');
const zeroBannerBarDivisor = document.querySelector('#zeroBannerBarDivisor');
const zeroBannerValueLabel = document.querySelector('#zeroBannerValueLabel');
const zeroBannerDivisorLabel = document.querySelector('#zeroBannerDivisorLabel');
const zeroBannerNext = document.querySelector('#zeroBannerNext');
let shownZeroBanners = new Set();

function triggerZeroFlash(stepArrIdx) {
  const stepData = stepsData[stepArrIdx];
  if (!stepData.zeroCheckpoints || stepData.zeroCheckpoints.length === 0) return;
  if (shownZeroBanners.has(stepArrIdx)) return;
  shownZeroBanners.add(stepArrIdx);
  suppressedStepArrayIndex = stepArrIdx;

  // Мигаем СРАЗУ все клетки итогового числа — целиком, в момент прыжка
  // курсора вниз, ещё до всякого ввода.
  const isLastStep = stepArrIdx === stepsData.length - 1;
  let leftEdge, rightEdge;
  if (isLastStep) {
    // Хвостовые нули — остаток всегда виден явно, ширина известна заранее
    // (ровно zeroCheckpoints.length хвостовых цифр, без запаса на "ещё одну").
    const remainderLen = String(stepData.remainder).length;
    leftEdge = stepData.offset + String(stepData.partialDividend).length - remainderLen;
    rightEdge = leftEdge + remainderLen + stepData.zeroCheckpoints.length - 1;
  } else {
    // Между этим и следующим реальным шагом — остаток невидим, если 0,
    // плюс одна клетка "на вырост" — туда придёт следующая снесённая цифра.
    const remainderWidth = stepData.remainder === 0 ? 0 : String(stepData.remainder).length;
    leftEdge = stepData.position - remainderWidth;
    const totalDigits = remainderWidth + stepData.zeroCheckpoints.length + 1;
    rightEdge = leftEdge + totalDigits - 1;
  }
  activeZeroFlashCells = [];
  for (let c = leftEdge; c <= rightEdge; c++) {
    const el = inputRefs[`${stepArrIdx}:difference:${c}`];
    if (el) {
      // Инлайн-цвет (зелёный/красный от проверки правильности) перебивает
      // CSS-анимацию мигания для того же свойства — сбрасываем его явно.
      el.style.backgroundColor = '';
      el.classList.add('cell-pulse-zero-alert');
      activeZeroFlashCells.push(el);
    }
  }

  // Столбики баннера — на примере первой снесённой цифры (первое "меньше делителя").
  const digitsStr = String(dividend);
  const accVal = stepData.remainder * 10 + parseInt(digitsStr[stepData.position], 10);

  setTimeout(() => {
    const maxBarHeight = 54;
    const valueBarHeight = Math.max(8, Math.round((accVal / divisor) * maxBarHeight));

    zeroBannerBarValue.style.height = `${valueBarHeight}px`;
    zeroBannerBarDivisor.style.height = `${maxBarHeight}px`;
    zeroBannerValueLabel.textContent = `число: ${accVal}`;
    zeroBannerDivisorLabel.textContent = `делитель: ${divisor}`;

    // Запоминаем РЕАЛЬНЫЙ элемент, где сейчас курсор, — не важно, клетка ли
    // это частного, "умножь" или "вычти". Именно на него вернёмся по "Далее".
    bannerReturnFocusEl = document.activeElement;

    zeroBanner.classList.remove('hidden');
    // Подсветку "куда писать дальше" здесь НЕ включаем — она останется
    // выключенной до полного завершения этого шага (см. suppressedStepArrayIndex).
  }, 3500);
}



zeroBannerNext.onclick = () => {
  zeroBanner.classList.add('hidden');
  bannerReturnFocusEl?.focus();
};
// Ð“Ð»Ð¾Ð±Ð°Ð»ÑŒÐ½Ð¾Ðµ ÑÐ¾ÑÑ‚Ð¾ÑÐ½Ð¸Ðµ
let dividend = 0;
let divisor = 0;
let quotientInputs = [];
let steps = [];
let stepsData = [];
let inputRefs = {};
let focusedRow = { step: null, type: null };
let hintsEnabled = false;
let solved = false;
let mode = 'auto';
// Индекс шага с нулём, для которого обычная подсказка "куда писать дальше"
// временно отключена — от момента, когда до него дошли, и до полного
// завершения этого шага (когда фокус перейдёт на следующую цифру частного).
// Индекс (в массиве stepsData) реального шага, для которого пока подавлена
// обычная подсказка "куда писать дальше" — от первого чекпоинта нуля и до
// полного завершения строки "вычти" этого шага.
let suppressedStepArrayIndex = null;
// Клетки, которые сейчас мигают из-за чекпоинта с нулём.
let activeZeroFlashCells = [];
// Элемент, на который нужно вернуть фокус после закрытия баннера — реальный
// document.activeElement на момент показа, а не предположение по типу клетки.
let bannerReturnFocusEl = null;

// Находит ближайший ПРЕДЫДУЩИЙ реальный (ненулевой) шаг для произвольного
// индекса цифры частного — и в нём же, есть ли у этого индекса чекпоинт нуля.
function findPrecedingStepInfo(quotientIndex) {
  for (let i = stepsData.length - 1; i >= 0; i--) {
    if (stepsData[i].quotientIndex < quotientIndex) {
      return { step: stepsData[i], stepArrIdx: i };
    }
  }
  return null;
}

// ÐŸÐµÑ€ÐµÐºÐ»ÑŽÑ‡ÐµÐ½Ð¸Ðµ Ñ€ÐµÐ¶Ð¸Ð¼Ð¾Ð²
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.onchange = (e) => {
    mode = e.target.value;
    uiAuto.classList.toggle('hidden', mode !== 'auto');
    uiManual.classList.toggle('hidden', mode !== 'manual');
  };
});

// Ð“ÐµÐ½ÐµÑ€Ð°Ñ†Ð¸Ñ Ð¿Ñ€Ð¸Ð¼ÐµÑ€Ð°
btnGen.onclick = () => {
  if (mode === 'manual') {
    const num1 = parseInt(inDividend.value);
    const num2 = parseInt(inDivisor.value);
    
    if (!num1 || !num2 || num1 < 100 || num2 < 10) {
      alert('Введите корректные числа (делимое минимум 3-значное, делитель минимум 2-значное)');
      return;
    }
    if (num1 <= num2) {
      alert('Делимое должно быть больше делителя');
      return;
    }
    if (num1 % num2 !== 0) {
      alert('Делимое должно делиться на делитель без остатка');
      return;
    }
    
    dividend = num1;
    divisor = num2;
} else {
    const dividendDigits = parseInt(selectDividend.value);
    const divisorDigits = parseInt(selectDivisor.value);
    const exampleType = getExampleType();

    const result = buildExample(dividendDigits, divisorDigits, exampleType);
    if (result && !result.unsupported) {
      dividend = result.dividend;
      divisor = result.divisor;
    } else {
      const fallback = buildExample(dividendDigits, divisorDigits, 'normal');
      if (fallback) {
        dividend = fallback.dividend;
        divisor = fallback.divisor;
      }
    }
  }
  
  buildGridWrapper();
};

btnStartMan.onclick = btnGen.onclick;

// ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚ÑŒ Ð²ÑÑ‘
btnClearAll.onclick = () => {
  if (dividend && divisor) {
    buildGridWrapper();
  }
};

// ÐÐ¾Ð²Ñ‹Ð¹ Ð¿Ñ€Ð¸Ð¼ÐµÑ€
// Новый пример (генерирует с теми же разрядностями)
btnNewExample.onclick = () => {
  if (dividend && divisor) {
    if (mode === 'manual') {
      // В ручном режиме генерируем с той же разрядностью
      const dividendDigits = String(dividend).length;
      const divisorDigits = String(divisor).length;
      
      let attempts = 0;
      let validExample = false;
      
      while (!validExample && attempts < 100) {
        attempts++;
        
        divisor = generateNumber(divisorDigits);
        const quotientDigitsCount = dividendDigits - divisorDigits + 1;
        const q = generateNumber(quotientDigitsCount);
        dividend = q * divisor;
        
        if (String(dividend).length !== dividendDigits) continue;
        if (hasZeroInside(dividend) || hasZeroInside(divisor)) continue;
        if (String(q).includes('0')) continue;
        
        validExample = true;
      }
      
      if (!validExample) {
        divisor = generateNumber(divisorDigits);
        const quotientDigitsCount = dividendDigits - divisorDigits + 1;
        const q = generateNumber(quotientDigitsCount);
        dividend = q * divisor;
      }
    } else {
// В автоматическом режиме - генерируем с текущими настройками
      const dividendDigits = parseInt(selectDividend.value);
      const divisorDigits = parseInt(selectDivisor.value);
      const exampleType = getExampleType();

      const result = buildExample(dividendDigits, divisorDigits, exampleType);
      if (result && !result.unsupported) {
        dividend = result.dividend;
        divisor = result.divisor;
      } else {
        const fallback = buildExample(dividendDigits, divisorDigits, 'normal');
        if (fallback) {
          dividend = fallback.dividend;
          divisor = fallback.divisor;
        }
      }
    }
    
    buildGridWrapper();
  }
};

// Назад к настройкам
btnBackToSettings.onclick = () => {
  workspace.classList.add('hidden');
  workspace.classList.remove('flex');
  settingsPanel.classList.remove('hidden');
  mathGrid.innerHTML = '';
  checkMessage.textContent = '';
};


// Ð’ÐºÐ»ÑŽÑ‡ÐµÐ½Ð¸Ðµ Ð¿Ð¾Ð´ÑÐºÐ°Ð·Ð¾Ðº
checkHints.onchange = () => {
  hintsEnabled = checkHints.checked;
  const dividendDigitsArray = String(dividend).split('').map(Number);
  
  const bc = document.getElementById('beigeContainer');
  const sh = document.getElementById('sideHint');
  const cm = document.getElementById('checkMessage');
  
  if (hintsEnabled) {
    if (bc) { bc.style.background = 'linear-gradient(135deg, #f5e6ca, #eedcbf)'; bc.style.padding = 'clamp(2px, 0.4vw, 4px) clamp(10px, 2vw, 18px)'; bc.style.borderRadius = 'clamp(24px, 4vw, 40px)'; bc.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)'; }
    if (sh) sh.style.display = '';
    if (cm) cm.style.display = '';
    setTimeout(() => {
      inputRefs['q:0']?.focus();
      focusedRow = { step: null, type: null, quotientIndex: 0 };
      if (!solved) updateHighlights(focusedRow, inputRefs, stepsData, dividendDigitsArray, hintsEnabled);
      updateHintMessage(focusedRow, stepsData, dividend, divisor, hintsEnabled);
    }, 0);
  } else {
    if (bc) { bc.style.background = 'none'; bc.style.padding = '0'; bc.style.borderRadius = '0'; bc.style.boxShadow = 'none'; }
    if (sh) sh.style.display = 'none';
    if (cm) cm.style.display = 'none';
    // ÐŸÑ€Ð¸ Ð²Ñ‹ÐºÐ»ÑŽÑ‡ÐµÐ½Ð¸Ð¸ Ð¿Ð¾Ð´ÑÐºÐ°Ð·Ð¾Ðº - ÑƒÐ±Ð¸Ñ€Ð°ÐµÐ¼ Ð³Ð¾Ð»ÑƒÐ±ÑƒÑŽ/Ð¶Ñ‘Ð»Ñ‚ÑƒÑŽ Ð¿Ð¾Ð´ÑÐ²ÐµÑ‚ÐºÑƒ Ð¸ Ñ‚ÐµÐºÑÑ‚ Ð¿Ð¾Ð´ÑÐºÐ°Ð·ÐºÐ¸
    clearHintMessage();
    for (const k in inputRefs) {
      const el = inputRefs[k];
      if (el) {
        const bg = el.style.backgroundColor;
        // Ð£Ð±Ð¸Ñ€Ð°ÐµÐ¼ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð³Ð¾Ð»ÑƒÐ±ÑƒÑŽ Ð¸ Ð¶Ñ‘Ð»Ñ‚ÑƒÑŽ Ð¿Ð¾Ð´ÑÐ²ÐµÑ‚ÐºÑƒ (Ð¿Ð¾Ð´ÑÐºÐ°Ð·ÐºÐ¸)
        // ÐÐ• Ñ‚Ñ€Ð¾Ð³Ð°ÐµÐ¼ Ð·ÐµÐ»Ñ‘Ð½ÑƒÑŽ Ð¸ ÐºÑ€Ð°ÑÐ½ÑƒÑŽ (Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐ¸)
        if (bg === 'rgb(68, 214, 232)' || bg === 'rgb(255, 245, 157)') {
          el.style.backgroundColor = '';
        }
      }
    }
  }
};

function buildGridWrapper() {
  shownZeroBanners.clear();
  buildGrid(dividend, divisor, settingsPanel, workspace, mathGrid, checkMessage, steps, stepsData, inputRefs, focusedRow, quotientInputs, setupLogic);
  
  const bc = document.getElementById('beigeContainer');
  const sh = document.getElementById('sideHint');
  const cm = document.getElementById('checkMessage');
  if (checkHints.checked) {
    if (bc) { bc.style.background = 'linear-gradient(135deg, #f5e6ca, #eedcbf)'; bc.style.padding = 'clamp(2px, 0.4vw, 4px) clamp(10px, 2vw, 18px)'; bc.style.borderRadius = 'clamp(24px, 4vw, 40px)'; bc.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)'; }
    if (sh) sh.style.display = '';
    if (cm) cm.style.display = '';
    const shBox = sh ? sh.querySelector('div') : null;
    if (shBox) shBox.style.background = 'linear-gradient(135deg, #cdb987, #906b2b)';
  } else {
    if (bc) { bc.style.background = 'none'; bc.style.padding = '0'; bc.style.borderRadius = '0'; bc.style.boxShadow = 'none'; }
    if (sh) sh.style.display = 'none';
    if (cm) cm.style.display = 'none';
  }
}

function setupLogic() {
  const dividendDigitsArray = String(dividend).split('').map(Number);
  
  // Ð¡Ð¸Ð½Ñ…Ñ€Ð¾Ð½Ð¸Ð·Ð¸Ñ€ÑƒÐµÐ¼ hintsEnabled Ñ Ñ€ÐµÐ°Ð»ÑŒÐ½Ñ‹Ð¼ ÑÐ¾ÑÑ‚Ð¾ÑÐ½Ð¸ÐµÐ¼ Ñ‡ÐµÐºÐ±Ð¾ÐºÑÐ°
  hintsEnabled = checkHints.checked;
  
  // Ð§Ð°ÑÑ‚Ð½Ð¾Ðµ
  document.querySelectorAll('.quotient-input').forEach(input => {
    const index = parseInt(input.dataset.quotientIndex);
    inputRefs[`q:${index}`] = input;
    
    input.oninput = (e) => handleQuotientInput(e, index);
    input.onkeydown = (e) => handleQuotientKey(e, index);
    input.onfocus = () => {
      focusedRow = { step: null, type: null, quotientIndex: index };

      // Пока идёт (ещё не завершён) чекпоинт нуля — подсветку "куда писать
      // дальше" не включаем вообще, вплоть до полного завершения шага.
      const info = findPrecedingStepInfo(index);
      const isCheckpointHere = info && (index - info.step.quotientIndex) <= (info.step.zeroCheckpoints ? info.step.zeroCheckpoints.length : 0);
      const relevantArrIdx = isCheckpointHere ? info.stepArrIdx : null;

      if (suppressedStepArrayIndex === null || relevantArrIdx !== suppressedStepArrayIndex) {
        if (!solved) updateHighlights(focusedRow, inputRefs, stepsData, dividendDigitsArray, hintsEnabled);
      } else {
        clearHighlights(inputRefs);
      }
      updateHintMessage(focusedRow, stepsData, dividend, divisor, hintsEnabled);
    };
  });
  
  // Ð¨Ð°Ð³Ð¸
  document.querySelectorAll('.step-input').forEach(input => {
    const step = parseInt(input.dataset.step);
    const type = input.dataset.type;
    const col = parseInt(input.dataset.col);
    
    inputRefs[`${step}:${type}:${col}`] = input;
    
    input.oninput = (e) => handleStepInput(e, step, type, col);
    input.onkeydown = (e) => handleStepKey(e, step, type, col);
    input.onfocus = () => {
      focusedRow = { step, type };
      if (suppressedStepArrayIndex === null || step !== suppressedStepArrayIndex) {
        if (!solved) updateHighlights(focusedRow, inputRefs, stepsData, dividendDigitsArray, hintsEnabled);
      } else {
        clearHighlights(inputRefs);
      }
      updateHintMessage(focusedRow, stepsData, dividend, divisor, hintsEnabled);
    };
  });
  
  // Ð’Ñ‹Ð·Ñ‹Ð²Ð°ÐµÐ¼ Ð½Ð°Ñ‡Ð°Ð»ÑŒÐ½ÑƒÑŽ Ð¿Ð¾Ð´ÑÐ²ÐµÑ‚ÐºÑƒ Ð¢ÐžÐ›Ð¬ÐšÐž ÐµÑÐ»Ð¸ Ð¿Ð¾Ð´ÑÐºÐ°Ð·ÐºÐ¸ Ð²ÐºÐ»ÑŽÑ‡ÐµÐ½Ñ‹
  if (hintsEnabled) {
    updateHighlightsForStep(0, inputRefs, stepsData, dividendDigitsArray, hintsEnabled);
    updateHintMessage({ step: null, type: null, quotientIndex: 0 }, stepsData, dividend, divisor, hintsEnabled);
  }
}

function handleQuotientInput(e, index) {
  const value = e.target.value;
  quotientInputs[index] = value;
  
  if (!value) return;
  
  const correctQuotient = String(Math.floor(dividend / divisor));
  const correctDigit = correctQuotient[index];
  
  e.target.style.backgroundColor = '';
  
  if (value === correctDigit) {
    // Зелёный фон при правильном ответе
    e.target.style.backgroundColor = '#86efac';

    const stepIndex = stepsData.findIndex(s => s.quotientIndex === index);
    if (stepIndex >= 0) {
      // Реальная (ненулевая) цифра частного — переходим к строке "умножь"
      // этого шага. Правый край строки "умножь" ВСЕГДА совпадает с правым
      // краем неполного делимого (произведение выравнивается по правому
      // краю, как в обычном вычитании столбиком) — поэтому здесь именно
      // длина делимого, а не произведения.
      const stepData = stepsData[stepIndex];
      const partialDividendLen = String(stepData.partialDividend).length;
      const offset = stepData.offset;
      const rightmostCol = offset + partialDividendLen - 1;

      setTimeout(() => {
        inputRefs[`${stepIndex}:product:${rightmostCol}`]?.focus();
      }, 0);
    } else {
      // Это ноль-чекпоинт — своей пары строк умножь/вычти у него нет.
      // Возвращаемся в ТУ ЖЕ строку "вычти" предыдущего реального шага,
      // на только что открывшуюся колонку — сносить следующую цифру.
      const info = findPrecedingStepInfo(index);
      if (info) {
        const checkpointNum = index - info.step.quotientIndex;
        const isTrailingCheckpoint = info.stepArrIdx === stepsData.length - 1;
        // Обычный чекпоинт: первая цифра-чекпоинт уже напечатана ДО этого
        // перехода в частное (окно стартует прямо с неё), поэтому цель —
        // position+checkpointNum. Хвостовой чекпоинт: сначала печатается
        // остаток (отдельная клетка), значит первая цифра-чекпоинт ещё не
        // печаталась — цель на одну колонку левее: position+checkpointNum-1.
        const nextCol = isTrailingCheckpoint
          ? info.step.position + checkpointNum - 1
          : info.step.position + checkpointNum;
        setTimeout(() => {
          inputRefs[`${info.stepArrIdx}:difference:${nextCol}`]?.focus();
        }, 0);
      }
    }
  } else {
    e.target.style.backgroundColor = '#ff9a9a';
  }
}

// Простая проверка ФАКТА: заполнен ли диапазон клеток [offset, offset+len)
// и совпадают ли ВСЕ они с data-correct. Ничего не решает про то, что делать
// дальше — это остаётся в каждой ветке своё, отдельно.
function isRangeFilledCorrectly(step, type, offset, len) {
  for (let c = offset; c < offset + len; c++) {
    const value = steps[step][type + 'Input'][c];
    if (value === '') return false;
    const el = inputRefs[`${step}:${type}:${c}`];
    const correct = el ? el.dataset.correct : '';
    if (correct && value !== correct) return false;
  }
  return true;
}

function handleStepInput(e, step, type, col) {
  const value = e.target.value;
  steps[step][type + 'Input'][col] = value;

  // Мгновенная подсветка каждой цифры по data-correct
  // Убираем ЛЮБОЕ мигание именно с этой клетки — CSS-анимация (в т.ч.
  // мигание нуля) продолжает перерисовывать фон каждый кадр и забивает
  // красный/зелёный цвет, который ставим ниже при вводе.
  e.target.classList.remove('cell-pulse-yellow', 'cell-pulse-orange', 'cell-pulse-zero-alert');
  const correct = e.target.dataset.correct;
  if (value && correct) {
    e.target.style.backgroundColor = value === correct ? '#86efac' : '#ff9a9a';
  } else {
    e.target.style.backgroundColor = '';
  }

  if (!value) return;

  if (type === 'product') {
    handleProductInput(step, col);
  } else if (type === 'difference') {
    // Три ПОЛНОСТЬЮ раздельные ветки — ни одной общей переменной вычисления
    // между ними, кроме завершающего действия (finishDifferenceStep).
    // Определяем только КАКАЯ это ветка, дальше каждая функция сама себе
    // заново читает stepsData и считает всё с нуля, не полагаясь на чужие
    // промежуточные значения.
    const stepData = stepsData[step];
    const isLastStep = step === stepsData.length - 1;
    // Чекпоинты (нули) теперь могут быть и у последнего шага (хвостовые
    // нули) — поэтому проверяем чекпоинты ПЕРВЫМИ, а isLastStep только
    // как признак "последнего шага БЕЗ чекпоинтов" для простого случая.
    const isCheckpointStep = stepData.zeroCheckpoints && stepData.zeroCheckpoints.length > 0;

    if (isCheckpointStep) {
      handleDifferenceInputCheckpoint(step);
    } else if (isLastStep) {
      handleDifferenceInputLastStep(step);
    } else {
      handleDifferenceInputNormal(step);
    }
  }
}

// ==================== ОБЩАЯ ЦЕЛЬ ПЕРЕХОДА "УМНОЖЬ" → "ВЫЧТИ" ====================
// Единственное место, которое считает эту цель — используется и при обычном
// вводе цифр, и при навигации стрелками, чтобы эти два пути ФИЗИЧЕСКИ не
// могли разъехаться (именно так и родился прошлый баг).
function computeDifferenceEntryTarget(step) {
  const stepData = stepsData[step];
  const isLastStep = step === stepsData.length - 1;
  const isCheckpointStep = stepData.zeroCheckpoints && stepData.zeroCheckpoints.length > 0;

  if (isLastStep) {
    const diffLen = String(stepData.remainder).length;
    const diffOffset = stepData.offset + String(stepData.partialDividend).length - diffLen;
    return diffOffset + diffLen - 1;
  } else if (isCheckpointStep) {
    // Серединный чекпоинт: если остаток НЕ равен 0 — он виден явно (фаза A,
    // справа налево), и курсор сначала идёт на её правый край (position-1).
    // Если остаток = 0 — он невидим (сливается со снесённой цифрой), курсор
    // сразу на саму позицию чекпоинта (как было).
    return stepData.remainder === 0 ? stepData.position : stepData.position - 1;
  } else {
    const next = stepsData[step + 1];
    const carryCol = next.offset + String(next.partialDividend).length - 1;
    return carryCol - 1;
  }
}

// ==================== СТРОКА "УМНОЖЬ" ====================
function handleProductInput(step, col) {
  const stepData = stepsData[step];
  const filledCount = steps[step].productInput.filter(d => d !== '').length;
  const expectedProduct = stepData.quotientDigit * divisor;
  const expectedLen = stepData.quotientDigit === 0
    ? String(stepData.partialDividend).length
    : String(expectedProduct).length;

  if (filledCount < expectedLen) {
    if (col - 1 >= 0) {
      setTimeout(() => inputRefs[`${step}:product:${col - 1}`]?.focus(), 0);
    }
    return;
  }
  if (filledCount !== expectedLen) return;

  // Диапазон произведения выровнен по ПРАВОМУ краю неполного делимого —
  // левый край сдвинут, если произведение короче делимого.
  const productOffset = stepData.offset + String(stepData.partialDividend).length - expectedLen;

  // Все клетки заполнены — но переходить дальше можно только если ВСЕ верны.
  if (!isRangeFilledCorrectly(step, 'product', productOffset, expectedLen)) {
    checkProduct(step, steps, stepsData, quotientInputs, inputRefs, hintsEnabled, { value: null }, checkMessage, () => { solved = true; });
    return;
  }

  setTimeout(() => {
    checkProduct(step, steps, stepsData, quotientInputs, inputRefs, hintsEnabled, { value: null }, checkMessage, () => { solved = true; });

    const isCheckpointStep = stepData.zeroCheckpoints && stepData.zeroCheckpoints.length > 0;
    if (isCheckpointStep) {
      // Есть нули впереди — сразу мигаем всей будущей строкой целиком,
      // ДО того как курсор туда встанет и ДО всякого ввода.
      triggerZeroFlash(step);
    }
    const targetCol = computeDifferenceEntryTarget(step);

    inputRefs[`${step}:difference:${targetCol}`]?.focus();
  }, 0);
}

// ==================== СТРОКА "ВЫЧТИ" — ПОСЛЕДНИЙ ШАГ ====================
function handleDifferenceInputLastStep(step) {
  const stepData = stepsData[step];
  const diffLen = String(stepData.remainder).length;
  const rangeOffset = (stepData.offset || 0) + String(stepData.partialDividend).length - diffLen;

  let rangeFilled = 0;
  for (let c = rangeOffset; c < rangeOffset + diffLen; c++) {
    if (steps[step].differenceInput[c] !== '') rangeFilled++;
  }

  if (rangeFilled < diffLen) {
    const lastCol = rangeOffset + diffLen - rangeFilled - 1;
    if (lastCol >= rangeOffset) {
      setTimeout(() => inputRefs[`${step}:difference:${lastCol}`]?.focus(), 0);
    }
    return;
  }

  // Все клетки заполнены — но завершать шаг можно только если ВСЕ верны.
  if (!isRangeFilledCorrectly(step, 'difference', rangeOffset, diffLen)) return;

  finishDifferenceStep(step, null);
}

// ==================== СТРОКА "ВЫЧТИ" — ШАГ С НУЛЯМИ (ЧЕКПОИНТЫ) ====================
function handleDifferenceInputCheckpoint(step) {
  const stepData = stepsData[step];
  const isLastStep = step === stepsData.length - 1;
  const nextStep = isLastStep ? null : stepsData[step + 1];
  const zeroCheckpoints = stepData.zeroCheckpoints;

  // Ширина остатка по конвенции: у хвостового шага остаток ВСЕГДА виден
  // явно (как у обычного последнего шага); у серединного — невидим, если
  // он 0 (сливается со снесённой цифрой), иначе виден.
  const remainderLen = isLastStep
    ? String(stepData.remainder).length
    : (stepData.remainder === 0 ? 0 : String(stepData.remainder).length);

  // ===== ФАЗА A: сам остаток, справа налево, В СВОИХ колонках =====
  // Полностью отдельная от фазы B — не пересекается с ней ни одной
  // переменной вычисления, только идёт СТРОГО перед ней.
  if (remainderLen > 0) {
    const phaseAOffset = stepData.position - remainderLen;
    let phaseAFilled = 0;
    for (let c = phaseAOffset; c < phaseAOffset + remainderLen; c++) {
      if (steps[step].differenceInput[c] !== '') phaseAFilled++;
    }
    if (phaseAFilled < remainderLen) {
      const lastCol = phaseAOffset + remainderLen - phaseAFilled - 1;
      if (lastCol >= phaseAOffset) {
        setTimeout(() => inputRefs[`${step}:difference:${lastCol}`]?.focus(), 0);
      }
      return;
    }
    if (!isRangeFilledCorrectly(step, 'difference', phaseAOffset, remainderLen)) return;
    // Фаза A только что дописана целиком — проваливаемся в фазу B ниже.
  }

  // ===== ФАЗА B: растущее окно цифр-чекпоинтов, СВОИМИ колонками =====
  // Начинается строго с stepData.position — остаток в ней не участвует,
  // он уже полностью закрыт фазой A выше.
  const upperBoundQuotientIndex = isLastStep ? quotientInputs.length : nextStep.quotientIndex;
  let zerosEntered = 0;
  for (let qi = stepData.quotientIndex + 1; qi < upperBoundQuotientIndex; qi++) {
    if (quotientInputs[qi] === '0') zerosEntered++;
    else break;
  }

  const phaseBOffset = stepData.position;
  // Хвостовой случай: ширина известна заранее (ровно zerosEntered), без
  // запаса — после фазы A сразу уходим в частное, ничего не печатая.
  // Серединный случай: есть запас "+1" на текущую непройденную цифру —
  // печатаем её ДО ухода в частное (как было раньше, уже проверено).
  const phaseBLen = isLastStep ? zerosEntered : zerosEntered + 1;

  let phaseBFilled = 0;
  for (let c = phaseBOffset; c < phaseBOffset + phaseBLen; c++) {
    if (steps[step].differenceInput[c] !== '') phaseBFilled++;
  }

  if (phaseBFilled < phaseBLen) {
    const lastCol = phaseBOffset + phaseBLen - phaseBFilled - 1;
    if (lastCol >= phaseBOffset) {
      setTimeout(() => inputRefs[`${step}:difference:${lastCol}`]?.focus(), 0);
    }
    return;
  }

  if (!isRangeFilledCorrectly(step, 'difference', phaseBOffset, phaseBLen)) return;

  if (zerosEntered < zeroCheckpoints.length) {
    setTimeout(() => {
      const zeroQuotientIndex = stepData.quotientIndex + zerosEntered + 1;
      inputRefs[`q:${zeroQuotientIndex}`]?.focus();
    }, 0);
    return;
  }

  finishDifferenceStep(step, nextStep);
}

// ==================== СТРОКА "ВЫЧТИ" — ОБЫЧНЫЙ ШАГ (БЕЗ НУЛЕЙ) ====================
function handleDifferenceInputNormal(step) {
  const stepData = stepsData[step];
  const nextStep = stepsData[step + 1];

  // Двухфазный ввод: сначала цифры самого остатка (справа налево, в их
  // собственных колонках), потом отдельно — снесённая цифра, на одну
  // колонку правее. Остаток здесь никогда не равен 0 (делитель всегда
  // 2+-значный, а однозначная снесённая цифра сама по себе не может дать
  // число ≥ делителя) — эта ветка вообще не пересекается с чекпоинт-веткой.
  const diffOnlyLen = String(stepData.remainder).length;
  const carryCol = nextStep.offset + String(nextStep.partialDividend).length - 1;
  const phase1Offset = carryCol - diffOnlyLen;

  let phase1Filled = 0;
  for (let c = phase1Offset; c < phase1Offset + diffOnlyLen; c++) {
    if (steps[step].differenceInput[c] !== '') phase1Filled++;
  }
  const carryFilled = steps[step].differenceInput[carryCol] !== '';

  if (phase1Filled < diffOnlyLen) {
    const lastCol = phase1Offset + diffOnlyLen - phase1Filled - 1;
    if (lastCol >= phase1Offset) {
      setTimeout(() => inputRefs[`${step}:difference:${lastCol}`]?.focus(), 0);
    }
    return;
  }

  // Остаток заполнен целиком — но идти дальше (хоть к снесённой цифре,
  // хоть к завершению) можно только если он введён верно.
  if (!isRangeFilledCorrectly(step, 'difference', phase1Offset, diffOnlyLen)) return;

  if (!carryFilled) {
    setTimeout(() => inputRefs[`${step}:difference:${carryCol}`]?.focus(), 0);
    return;
  }

  // Снесённая цифра тоже введена — но завершать шаг можно только если и она верна.
  if (!isRangeFilledCorrectly(step, 'difference', carryCol, 1)) return;

  finishDifferenceStep(step, nextStep);
}

// ==================== ОБЩЕЕ ЗАВЕРШЕНИЕ ШАГА (одно и то же для всех трёх) ====================
function finishDifferenceStep(step, nextStep) {
  setTimeout(() => {
    checkDifference(step, steps, stepsData, inputRefs, hintsEnabled, dividend, divisor, quotientInputs, () => {
      checkQuotient(dividend, divisor, quotientInputs, inputRefs, checkMessage);
    });

    if (suppressedStepArrayIndex === step) {
      suppressedStepArrayIndex = null;
      activeZeroFlashCells.forEach(el => el.classList.remove('cell-pulse-zero-alert'));
      activeZeroFlashCells = [];
    }

    if (nextStep) {
      inputRefs[`q:${nextStep.quotientIndex}`]?.focus();
    }
  }, 0);
}

function handleQuotientKey(e, index) {
  if (e.key === 'ArrowRight' && index + 1 < quotientInputs.length) {
    e.preventDefault();
    inputRefs[`q:${index + 1}`]?.focus();
  } else if (e.key === 'ArrowLeft' && index > 0) {
    e.preventDefault();
    inputRefs[`q:${index - 1}`]?.focus();
  }
}

function handleStepKey(e, step, type, col) {
  const dividendDigitsArray = String(dividend).split('').map(Number);
  const totalCols = dividendDigitsArray.length;
  
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (col + 1 < totalCols) inputRefs[`${step}:${type}:${col + 1}`]?.focus();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (col > 0) inputRefs[`${step}:${type}:${col - 1}`]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    
    if (type === 'difference') {
      const targetCol = Math.min(col, steps[step].productInput.length - 1);
      inputRefs[`${step}:product:${targetCol}`]?.focus();
      focusedRow = { step, type: 'product' };
    } else if (type === 'product') {
      if (step > 0) {
        const prevStep = step - 1;
        const targetCol = Math.min(col, steps[prevStep].differenceInput.length - 1);
        inputRefs[`${prevStep}:difference:${targetCol}`]?.focus();
        focusedRow = { step: prevStep, type: 'difference' };
      } else {
        const qIndex = Math.min(col, quotientInputs.length - 1);
        inputRefs[`q:${qIndex}`]?.focus();
        focusedRow = { step: null, type: null, quotientIndex: qIndex };
      }
    }
    if (!solved) updateHighlights(focusedRow, inputRefs, stepsData, dividendDigitsArray, hintsEnabled);
    updateHintMessage(focusedRow, stepsData, dividend, divisor, hintsEnabled);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    
    if (type === 'product') {
      checkProduct(step, steps, stepsData, quotientInputs, inputRefs, hintsEnabled, { value: null }, checkMessage, () => { solved = true; });

      const stepData = stepsData[step];
      const isCheckpointStep = stepData.zeroCheckpoints && stepData.zeroCheckpoints.length > 0;
      if (isCheckpointStep) triggerZeroFlash(step);
      const colToFocus = computeDifferenceEntryTarget(step);

      inputRefs[`${step}:difference:${colToFocus}`]?.focus();
      focusedRow = { step, type: 'difference' };
    } else if (type === 'difference') {
      checkDifference(step, steps, stepsData, inputRefs, hintsEnabled, dividend, divisor, quotientInputs, () => {
        checkQuotient(dividend, divisor, quotientInputs, inputRefs, checkMessage);
      });
      
      if (step + 1 < steps.length) {
        const nextStepIndex = step + 1;
        const nextStepData = stepsData[nextStepIndex];
        const offset = nextStepData ? nextStepData.offset : 0;
        const partialLen = nextStepData ? String(nextStepData.partialDividend).length : 1;
        const colToFocus = offset + partialLen - 1;
        
        if (colToFocus >= 0) {
          inputRefs[`${nextStepIndex}:product:${colToFocus}`]?.focus();
          focusedRow = { step: nextStepIndex, type: 'product' };
        }
      } else {
        checkQuotient(dividend, divisor, quotientInputs, inputRefs, checkMessage);
      }
    }
    if (!solved) updateHighlights(focusedRow, inputRefs, stepsData, dividendDigitsArray, hintsEnabled);
    updateHintMessage(focusedRow, stepsData, dividend, divisor, hintsEnabled);
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    steps[step][type + 'Input'][col] = '';
    e.target.value = '';
  }
}

document.body.classList.add('loaded');