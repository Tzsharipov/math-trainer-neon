import './style.css';
import { getRandom } from './multiplication/multiplicationHelpers.js';
import { buildGrid, setupLogic } from './multiplication/multiplicationGrid.js';

console.log('MULTIPLICATION.JS LOADED - CORRECT PATHS');

// DOM элементы
const workspace = document.querySelector('#workspace');
const mathGrid = document.querySelector('#mathGrid');
const checkHints = document.querySelector('#checkHints');
const hintPopup = document.querySelector('#hintPopup');
const hintText = document.querySelector('#hintText');
const sideHint = document.querySelector('#sideHint');
const sideHintText = document.querySelector('#sideHintText');
const btnGen = document.querySelector('#btnGen');
const btnStartMan = document.querySelector('#btnStartMan');
const selectA = document.querySelector('#selectA');
const selectB = document.querySelector('#selectB');
const inA = document.querySelector('#inA');
const inB = document.querySelector('#inB');
const uiAuto = document.querySelector('#ui-auto');
const uiManual = document.querySelector('#ui-manual');
const checkMessage = document.querySelector('#checkMessage');
const btnClearAll = document.querySelector('#btnClearAll');
const settingsPanel = document.querySelector('#settingsPanel');
const btnNewExample = document.querySelector('#btnNewExample');
const btnBackToSettings = document.querySelector('#btnBackToSettings');

// Глобальное состояние
let currentA = 0;
let currentB = 0;
let carries = {};
let activeRow = { value: 0 }; // Используем объект чтобы передавать по ссылке

// Переключение режимов
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.onchange = (e) => {
    uiAuto.classList.toggle('hidden', e.target.value !== 'auto');
    uiManual.classList.toggle('hidden', e.target.value !== 'manual');
  };
});

// Генерация примера (автоматический режим)
btnGen.onclick = () => {
  currentA = getRandom(parseInt(selectA.value));
  currentB = getRandom(parseInt(selectB.value));
  buildGridWrapper();
};

// Начать решать (ручной режим)
btnStartMan.onclick = () => {
  const a = inA.value;
  const b = inB.value;
  if (a.length <= 7 && b.length <= 5 && a && b) {
    currentA = parseInt(a);
    currentB = parseInt(b);
    buildGridWrapper();
  } else {
    alert("Проверь числа!");
  }
};

// Очистить всё
btnClearAll.onclick = () => {
  if (currentA && currentB) {
    buildGridWrapper();
  }
};

// Новый пример (генерирует с теми же разрядностями)
btnNewExample.onclick = () => {
  if (currentA && currentB) {
    // Определяем текущий режим
    const mode = document.querySelector('input[name="mode"]:checked').value;
    
    if (mode === 'auto') {
      // Генерируем новые числа с той же разрядностью
      const digitsA = String(currentA).length;
      const digitsB = String(currentB).length;
      currentA = getRandom(digitsA);
      currentB = getRandom(digitsB);
    } else {
      // В ручном режиме тоже генерируем с той же разрядностью
      const digitsA = String(currentA).length;
      const digitsB = String(currentB).length;
      currentA = getRandom(digitsA);
      currentB = getRandom(digitsB);
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
  hintPopup.style.visibility = 'hidden';
  sideHint.style.visibility = 'hidden';
};


// Обёртка для buildGrid
function buildGridWrapper() {
  buildGrid(
    currentA,
    currentB,
    settingsPanel,
    workspace,
    mathGrid,
    checkMessage,
    checkHints,
    hintPopup,
    hintText,
    sideHint,
    sideHintText,
    carries,
    activeRow,
    setupLogic
  );
  // Устанавливаем стиль бежевого контейнера
  const beigeContainer = document.getElementById('beigeContainer');
  if (beigeContainer) {
    if (checkHints.checked) {
      beigeContainer.style.background = 'linear-gradient(135deg, #f5e6ca, #eedcbf)';
      beigeContainer.style.padding = 'clamp(2px, 0.4vw, 4px) clamp(10px, 2vw, 18px)';
      beigeContainer.style.borderRadius = 'clamp(24px, 4vw, 40px)';
      beigeContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
      hintPopup.style.display = '';
      sideHint.style.display = '';
      checkMessage.style.display = '';
    } else {
      beigeContainer.style.background = 'none';
      beigeContainer.style.padding = '0';
      beigeContainer.style.borderRadius = '0';
      beigeContainer.style.boxShadow = 'none';
      hintPopup.style.display = 'none';
      sideHint.style.display = 'none';
      checkMessage.style.display = 'none';
    }
  }

}

// Переключение фона при вкл/выкл подсказок
checkHints.onchange = () => {
  const beigeContainer = document.getElementById('beigeContainer');
  if (beigeContainer) {
    if (checkHints.checked) {
      beigeContainer.style.background = 'linear-gradient(135deg, #f5e6ca, #eedcbf)';
      beigeContainer.style.padding = 'clamp(2px, 0.4vw, 4px) clamp(10px, 2vw, 18px)';
      beigeContainer.style.borderRadius = 'clamp(24px, 4vw, 40px)';
      beigeContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
      hintPopup.style.display = '';
      sideHint.style.display = '';
      checkMessage.style.display = '';
    } else {
      beigeContainer.style.background = 'none';
      beigeContainer.style.padding = '0';
      beigeContainer.style.borderRadius = '0';
      beigeContainer.style.boxShadow = 'none';
      hintPopup.style.display = 'none';
      sideHint.style.display = 'none';
      checkMessage.style.display = 'none';
    }
  }
};

// ============ РЕЖИМ ПОДСКАЗОК ============
// 'full'      — подсветка + готовый ответ сбоку ("7×8 + 3 = 59, 9 пишем...")
// 'highlight' — подсветка + только задание без ответа ("7 × 8 + 3 = ?")
// 'none'      — без подсказок
// Подсветка включается служебным флажком checkHints (он включён в 'full' и 'highlight'),
// а прятать ли ответ — решает window.hintMode (читается в multiplicationGrid.js).
const HINT_MODE_KEY = 'hintMode_multiplication';
const HINT_MODES = ['full', 'highlight', 'none'];

function setHintMode(mode, remember = true) {
  if (!HINT_MODES.includes(mode)) mode = 'full';
  window.hintMode = mode;

  const radio = document.querySelector(`input[name="hintMode"][value="${mode}"]`);
  if (radio) radio.checked = true;

  const enabled = mode !== 'none';
  if (checkHints.checked !== enabled) {
    checkHints.checked = enabled;
    checkHints.onchange();
  }

  if (remember) {
    try { localStorage.setItem(HINT_MODE_KEY, mode); } catch (e) {}
  }
}
window.setHintMode = setHintMode;

document.querySelectorAll('input[name="hintMode"]').forEach(radio => {
  radio.onchange = (e) => setHintMode(e.target.value);
});

// Восстанавливаем последний выбранный режим (по умолчанию — с ответами)
let savedHintMode = null;
try { savedHintMode = localStorage.getItem(HINT_MODE_KEY); } catch (e) {}
setHintMode(savedHintMode || 'full', false);

document.body.classList.add('loaded');
