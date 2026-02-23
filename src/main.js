// Pomodoro Timer
import './style.css';

const DEFAULT_WORK_MIN = 25;
const DEFAULT_BREAK_MIN = 5;
const STORAGE_FOCUS_MIN_KEY = 'pomodoro-default-focus-min';
const STORAGE_BREAK_MIN_KEY = 'pomodoro-default-break-min';
/** Focus presets: 15 (Quick Boost), 25 (Pomodoro), 40 (Deep Dive), 55 (Power Session). */
const FOCUS_PRESET_MINS = [15, 25, 40, 55];
/** Break presets: 5 (short), 10 (relaxed), 15 (long). */
const BREAK_PRESET_MINS = [5, 10, 15];

function getWorkDurationSeconds() {
  try {
    const m = parseInt(localStorage.getItem(STORAGE_FOCUS_MIN_KEY), 10);
    return (Number.isFinite(m) && m >= 1 && m <= 99) ? m * 60 : DEFAULT_WORK_MIN * 60;
  } catch (_) {
    return DEFAULT_WORK_MIN * 60;
  }
}

function getBreakDurationSeconds() {
  try {
    const m = parseInt(localStorage.getItem(STORAGE_BREAK_MIN_KEY), 10);
    return (Number.isFinite(m) && m >= 1 && m <= 99) ? m * 60 : DEFAULT_BREAK_MIN * 60;
  } catch (_) {
    return DEFAULT_BREAK_MIN * 60;
  }
}

const state = {
  timeRemaining: DEFAULT_WORK_MIN * 60,
  isRunning: false,
  currentMode: 'focus', // 'focus' | 'break'
  skipNextBreak: false,
  hasRevealedActions: false,
  lastMinutesElapsed: -1,
  hasStartedInCurrentMode: false,
  sessionDurationSeconds: DEFAULT_WORK_MIN * 60,
};

let intervalId = null;
let progressIntervalId = null;
let lastTickTimestamp = 0;
let add5RevealTimeout = null;
let breakIntroAnimationId = null;
let focusIntroAnimationId = null;
let isTimeEditMode = false;

// DOM refs
const app = document.getElementById('app');
const timeDisplay = document.getElementById('time-display');
const modeIndicator = document.getElementById('pomodoro-mode');
const controlsRow = document.getElementById('controls-row');
const btnStartPause = document.getElementById('btn-start-pause');
const controlsSecondary = document.getElementById('controls-secondary');
const btnStartBreakNow = document.getElementById('btn-start-break-now');
const btnSwitchMode = document.getElementById('btn-switch-mode');
const controlsSwitchRow = document.getElementById('controls-switch-row');
const btnReset = document.getElementById('btn-reset');
const pomodoroActions = document.getElementById('pomodoro-actions');
const btnStartBreak = document.getElementById('btn-start-break');
const progressContainer = document.getElementById('progress-circles');
const timerAdjust = document.getElementById('timer-adjust');
const btnAdd5 = document.getElementById('btn-add-5');
const btnAdd10 = document.getElementById('btn-add-10');
const btnAdd15 = document.getElementById('btn-add-15');
const btnAdjustTimer = document.getElementById('btn-adjust-timer');

const THEME_STORAGE_KEY = 'pomodoro-theme';
const SOUND_STORAGE_KEY = 'pomodoro-sound-on';
/** Theme IDs and labels; order in VALID_THEMES matches theme switcher UI (Minimal, Cherry, Cherryverse, Retro). */
const THEME_LABELS = { default: 'Minimal theme', cherry: 'Cherry theme', cherryverse: 'Cherryverse theme', retro: 'Retro pixel theme' };
const VALID_THEMES = ['cherry', 'cherryverse', 'retro'];

function getSoundEnabled() {
  try {
    const v = localStorage.getItem(SOUND_STORAGE_KEY);
    return v !== 'false';
  } catch (_) {
    return true;
  }
}

function setSoundEnabled(on) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, on ? 'true' : 'false');
  } catch (_) {}
}

function updateThemeSwitcherIndicator() {
  const container = document.querySelector('.theme-switcher');
  const indicator = container?.querySelector('.theme-switcher__indicator');
  const selected = container?.querySelector('.theme-switcher__btn.is-selected');
  if (!indicator || !selected || !container) return;
  const paddingLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0;
  const left = selected.offsetLeft - paddingLeft;
  const width = selected.offsetWidth;
  indicator.style.width = width + 'px';
  indicator.style.transform = 'translateX(' + left + 'px)';
}

function applyTheme(theme) {
  const valid = VALID_THEMES.includes(theme) ? theme : 'default';
  const label = THEME_LABELS[valid] || 'Minimal theme';
  document.body.setAttribute('data-theme', valid);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, valid);
  } catch (_) {}
  const cardsContainer = document.querySelector('.settings__theme-cards');
  if (cardsContainer) {
    cardsContainer.querySelectorAll('.settings__theme-card').forEach((card) => {
      const cardTheme = card.getAttribute('data-theme');
      const isSelected = cardTheme === valid;
      const cardLabel = THEME_LABELS[cardTheme] || cardTheme;
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      card.setAttribute('aria-label', isSelected ? cardLabel + ' (current)' : cardLabel);
    });
  }
  const oldSwitcher = document.querySelector('.theme-switcher');
  if (oldSwitcher) {
    requestAnimationFrame(() => {
      requestAnimationFrame(updateThemeSwitcherIndicator);
    });
  }
  const live = document.getElementById('theme-switcher-live');
  if (live) live.textContent = 'Theme set to ' + label;
}

function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(VALID_THEMES.includes(saved) ? saved : 'default');
  } catch (_) {
    applyTheme('default');
  }
  requestAnimationFrame(updateThemeSwitcherIndicator);
  const cardsContainer = document.querySelector('.settings__theme-cards');
  if (cardsContainer) {
    cardsContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.settings__theme-card');
      if (card && card.getAttribute('data-theme')) {
        applyTheme(card.getAttribute('data-theme'));
      }
    });
    cardsContainer.addEventListener('keydown', (e) => {
      const cards = Array.from(cardsContainer.querySelectorAll('.settings__theme-card'));
      const i = cards.indexOf(document.activeElement);
      if (i === -1) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        cards[(i - 1 + cards.length) % cards.length].focus();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        cards[(i + 1) % cards.length].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        cards[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        cards[cards.length - 1].focus();
      }
    });
  }
}

function openSettingsMenu() {
  const settings = document.querySelector('.settings');
  const trigger = document.getElementById('settings-trigger');
  const fullscreen = document.getElementById('settings-fullscreen');
  if (settings && trigger) {
    settings.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    if (fullscreen) {
      fullscreen.classList.add('is-open');
      fullscreen.setAttribute('aria-hidden', 'false');
    }
  }
}

function closeSettingsMenu() {
  const settings = document.querySelector('.settings');
  const trigger = document.getElementById('settings-trigger');
  const fullscreen = document.getElementById('settings-fullscreen');
  if (settings && trigger) {
    settings.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    if (fullscreen) {
      fullscreen.classList.remove('is-open');
      fullscreen.setAttribute('aria-hidden', 'true');
    }
  }
}

function initSettingsMenu() {
  const trigger = document.getElementById('settings-trigger');
  const settings = document.querySelector('.settings');
  const overlay = document.getElementById('settings-overlay');
  const closeBtn = document.getElementById('settings-close');
  if (!trigger || !settings) return;
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (settings.classList.contains('is-open')) {
      closeSettingsMenu();
    } else {
      openSettingsMenu();
    }
  });
  if (overlay) {
    overlay.addEventListener('click', closeSettingsMenu);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSettingsMenu);
  }
  document.addEventListener('click', (e) => {
    if (!document.querySelector('.top-controls')?.contains(e.target)) closeSettingsMenu();
  });
}

function initAudioToggle() {
  const btn = document.getElementById('audio-toggle');
  if (!btn) return;
  const updateUi = () => {
    const on = getSoundEnabled();
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    btn.setAttribute('title', on ? 'Turn sound off' : 'Turn sound on');
  };
  updateUi();
  btn.addEventListener('click', () => {
    const on = !getSoundEnabled();
    setSoundEnabled(on);
    updateUi();
  });
}

function setDurationPresetActive(inputId, value) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const group = input.closest('.settings__duration-group');
  if (!group) return;
  const duration = inputId.indexOf('focus') !== -1 ? 'focus' : 'break';
  const v = parseInt(value, 10);
  if (!Number.isFinite(v)) return;
  const pomodoroMin = duration === 'focus' ? 25 : 5;
  const otherPresets = duration === 'focus' ? [15, 40, 55] : [10, 15];
  const isPomodoro = v === pomodoroMin;

  const toggleBtn = group.querySelector('.settings__pomodoro-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-checked', isPomodoro ? 'true' : 'false');
  }
  group.classList.toggle('is-pomodoro', isPomodoro);

  const othersId = duration === 'focus' ? 'settings-focus-others' : 'settings-break-others';
  const othersContainer = document.getElementById(othersId);
  if (othersContainer) {
    othersContainer.setAttribute('aria-hidden', isPomodoro ? 'true' : 'false');
  }

  const cards = group.querySelectorAll('.settings__duration-others .settings__duration-card');
  cards.forEach((btn) => {
    const min = parseInt(btn.getAttribute('data-min'), 10);
    const isSelected = v === min;
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    btn.classList.toggle('is-selected', isSelected);
  });

  const customRow = group.querySelector('.settings__custom-row');
  if (customRow) {
    const isCustomSelected = !isPomodoro && otherPresets.indexOf(v) === -1;
    customRow.classList.toggle('is-selected', isCustomSelected);
  }
}

function initDefaultDurations() {
  const focusInput = document.getElementById('settings-default-focus');
  const breakInput = document.getElementById('settings-default-break');
  if (!focusInput || !breakInput) return;
  try {
    const savedFocus = localStorage.getItem(STORAGE_FOCUS_MIN_KEY);
    const savedBreak = localStorage.getItem(STORAGE_BREAK_MIN_KEY);
    const focusVal = savedFocus !== null && Number.isFinite(parseInt(savedFocus, 10)) ? savedFocus : String(DEFAULT_WORK_MIN);
    const breakVal = savedBreak !== null && Number.isFinite(parseInt(savedBreak, 10)) ? savedBreak : String(DEFAULT_BREAK_MIN);
    focusInput.value = focusVal;
    breakInput.value = breakVal;
    setDurationPresetActive('settings-default-focus', focusVal);
    setDurationPresetActive('settings-default-break', breakVal);
  } catch (_) {
    focusInput.value = String(DEFAULT_WORK_MIN);
    breakInput.value = String(DEFAULT_BREAK_MIN);
    setDurationPresetActive('settings-default-focus', String(DEFAULT_WORK_MIN));
    setDurationPresetActive('settings-default-break', String(DEFAULT_BREAK_MIN));
  }
  const applySaved = (key, value, isFocus) => {
    try {
      localStorage.setItem(key, String(value));
    } catch (_) {}
    if (!state.isRunning && !state.hasStartedInCurrentMode) {
      if (isFocus && state.currentMode === 'focus') {
        state.timeRemaining = value * 60;
        state.sessionDurationSeconds = value * 60;
      }
      if (!isFocus && state.currentMode === 'break') {
        state.timeRemaining = value * 60;
        state.sessionDurationSeconds = value * 60;
      }
      updateDOM();
    }
  };

  document.querySelectorAll('.settings__pomodoro-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const duration = btn.getAttribute('data-duration');
      const pomodoroMin = duration === 'focus' ? 25 : 5;
      const firstOther = duration === 'focus' ? 15 : 10;
      const input = duration === 'focus' ? focusInput : breakInput;
      const inputId = input.id;
      const key = duration === 'focus' ? STORAGE_FOCUS_MIN_KEY : STORAGE_BREAK_MIN_KEY;
      const isOn = btn.getAttribute('aria-checked') === 'true';
      const newVal = isOn ? firstOther : pomodoroMin;
      input.value = String(newVal);
      setDurationPresetActive(inputId, String(newVal));
      applySaved(key, newVal, duration === 'focus');
    });
  });

  document.querySelectorAll('.settings__duration-others .settings__duration-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const duration = btn.getAttribute('data-duration');
      const min = parseInt(btn.getAttribute('data-min'), 10);
      if (!Number.isFinite(min)) return;
      const input = duration === 'focus' ? focusInput : breakInput;
      const inputId = input.id;
      const key = duration === 'focus' ? STORAGE_FOCUS_MIN_KEY : STORAGE_BREAK_MIN_KEY;
      input.value = String(min);
      setDurationPresetActive(inputId, String(min));
      applySaved(key, min, duration === 'focus');
    });
  });

  const saveAndClamp = (key, inputId, isFocus) => (e) => {
    const el = e.target;
    let v = parseInt(el.value, 10);
    if (!Number.isFinite(v)) return;
    v = Math.max(1, Math.min(99, v));
    el.value = String(v);
    setDurationPresetActive(inputId, String(v));
    applySaved(key, v, isFocus);
  };
  focusInput.addEventListener('change', saveAndClamp(STORAGE_FOCUS_MIN_KEY, 'settings-default-focus', true));
  breakInput.addEventListener('change', saveAndClamp(STORAGE_BREAK_MIN_KEY, 'settings-default-break', false));
}

const PAUSE_SHRINK_MS = 350;
const CIRCLES_PER_ROW = 5;
const SHOW_START_BREAK = false; /* hide Start break for now */

function playModeSwitchSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const playTones = () => {
      const playTone = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      playTone(523.25, 0, 0.15);
      playTone(659.25, 0.2, 0.2);
    };
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(playTones).catch(() => {});
    } else {
      playTones();
    }
  } catch (_) {}
}

function scheduleAdd5Reveal() {
  if (!SHOW_START_BREAK) return;
  if (add5RevealTimeout) clearTimeout(add5RevealTimeout);
  add5RevealTimeout = setTimeout(() => {
    add5RevealTimeout = null;
    if (state.isRunning && state.currentMode === 'focus') {
      state.hasRevealedActions = true;
      controlsRow.classList.add('add-5-revealed');
      updateDOM();
      requestAnimationFrame(() => {
        pomodoroActions.classList.add('actions-visible');
      });
    }
  }, PAUSE_SHRINK_MS);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseTimeInput(str) {
  const trimmed = String(str).trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const [m, s] = trimmed.split(':').map(Number);
    if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s > 59) return null;
    return m * 60 + s;
  }
  const minutes = parseInt(trimmed, 10);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  return minutes * 60;
}

function enterTimeEditMode() {
  const wasRunningBeforeEdit = state.isRunning;
  if (state.isRunning) {
    state.isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (progressIntervalId) {
      clearInterval(progressIntervalId);
      progressIntervalId = null;
    }
    if (add5RevealTimeout) {
      clearTimeout(add5RevealTimeout);
      add5RevealTimeout = null;
    }
  }

  isTimeEditMode = true;

  const value = formatTime(state.timeRemaining);
  timeDisplay.innerHTML = '<input type="text" class="pomodoro__time-input" value="' + value + '" aria-label="Edit time (MM:SS)" autocomplete="off" />';
  const input = timeDisplay.querySelector('.pomodoro__time-input');

  updateDOM();

  input.focus();
  input.select();

  function resumeIfWasRunning() {
    if (wasRunningBeforeEdit) {
      state.isRunning = true;
      lastTickTimestamp = Date.now();
      intervalId = setInterval(tick, 1000);
      progressIntervalId = setInterval(updateProgressCircles, 80);
      if (state.currentMode === 'focus' && SHOW_START_BREAK) scheduleAdd5Reveal();
      updateDOM();
    }
  }

  function commit() {
    isTimeEditMode = false;
    const parsed = parseTimeInput(input.value);
    if (parsed !== null && parsed > 0) {
      const maxSeconds = 99 * 60 + 59;
      state.timeRemaining = Math.min(maxSeconds, Math.max(1, parsed));
      state.sessionDurationSeconds = state.timeRemaining;
    }
    updateDOM();
    resumeIfWasRunning();
  }

  input.addEventListener('blur', commit, { once: true });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isTimeEditMode = false;
      updateDOM();
      resumeIfWasRunning();
    }
  });
}

function getSessionDurationSeconds() {
  return state.sessionDurationSeconds;
}

function updateProgressCircles() {
  const totalSeconds = getSessionDurationSeconds();
  const totalMinutes = Math.max(1, Math.ceil(totalSeconds / 60));
  const minutesElapsed = Math.floor((totalSeconds - state.timeRemaining) / 60);

  if (!progressContainer) return;

  let circles = progressContainer.querySelectorAll('.progress-circle');
  if (circles.length !== totalMinutes) {
    progressContainer.innerHTML = '';
    for (let i = 0; i < totalMinutes; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'progress-circle';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.innerHTML = '<span class="progress-circle__fill">' +
        '<span class="progress-circle__stem" aria-hidden="true"></span>' +
        '<span class="progress-circle__leaf progress-circle__leaf--1" aria-hidden="true"></span>' +
        '<span class="progress-circle__leaf progress-circle__leaf--2" aria-hidden="true"></span>' +
        '<span class="progress-circle__leaf progress-circle__leaf--3" aria-hidden="true"></span>' +
        '<span class="progress-circle__tomato" aria-hidden="true"></span>' +
        '</span>';
      progressContainer.appendChild(wrap);
    }
    circles = progressContainer.querySelectorAll('.progress-circle');
  }

  const justFilledIndex = state.lastMinutesElapsed >= 0 && minutesElapsed > state.lastMinutesElapsed ? minutesElapsed - 1 : -1;
  state.lastMinutesElapsed = minutesElapsed;

  circles.forEach((circle, i) => {
    const fillEl = circle.querySelector('.progress-circle__fill');
    if (!fillEl) return;
    circle.classList.remove('filled', 'filling', 'just-filled');
    fillEl.style.animation = '';
    fillEl.style.animationDelay = '';
    fillEl.style.removeProperty('--progress-fill');
    circle.style.removeProperty('--progress-fill');

    if (i < minutesElapsed) {
      circle.classList.add('filled');
      if (i === justFilledIndex) {
        circle.classList.add('just-filled');
        setTimeout(() => circle.classList.remove('just-filled'), 500);
      }
      fillEl.style.setProperty('--progress-fill', '1');
      circle.style.setProperty('--progress-fill', '1');
    } else if (i === minutesElapsed) {
      circle.classList.add('filling');
      const secondsSoFarInMinute = (totalSeconds - state.timeRemaining) % 60;
      const fractionOfSecond = state.isRunning && lastTickTimestamp
        ? Math.min((Date.now() - lastTickTimestamp) / 1000, 0.999)
        : 0;
      const fillRatio = Math.min((secondsSoFarInMinute + fractionOfSecond) / 60, 59.99 / 60);
      fillEl.style.setProperty('--progress-fill', String(fillRatio));
      circle.style.setProperty('--progress-fill', String(fillRatio));
    }
  });

  progressContainer.setAttribute('aria-hidden', 'false');
}

function updateDOM() {
  const focusIntro = !state.isRunning && state.currentMode === 'focus' && !state.hasStartedInCurrentMode;
  const breakIntro = !state.isRunning && state.currentMode === 'break' && !state.hasStartedInCurrentMode;

  if (!isTimeEditMode) {
    if (focusIntro) {
      const t = formatTime(state.timeRemaining);
      timeDisplay.innerHTML = "Your focus time is set for <span class=\"pomodoro__time-value\" tabindex=\"0\" role=\"button\">" + t + "</span> minutes.";
    } else if (breakIntro) {
      const t = formatTime(state.timeRemaining);
      timeDisplay.innerHTML = "Your break time is set for <span class=\"pomodoro__time-value\" tabindex=\"0\" role=\"button\">" + t + "</span> minutes.";
    } else {
      const timeStr = formatTime(state.timeRemaining);
      const label = state.currentMode === 'focus' ? 'You are in the zone ' : 'You are on a break ';
      timeDisplay.innerHTML = label + '<span class="pomodoro__time-value" tabindex="0" role="button">' + timeStr + '</span>';
    }
  }

  modeIndicator.textContent = state.currentMode === 'focus' ? 'Focus' : 'Break';
  app.setAttribute('data-mode', state.currentMode);

  document.body.setAttribute('data-mode', state.currentMode);
  const lastMinute = state.timeRemaining >= 1 && state.timeRemaining <= 60;
  if (lastMinute) {
    app.setAttribute('data-last-minute', 'true');
    document.body.setAttribute('data-last-minute', 'true');
  } else {
    app.removeAttribute('data-last-minute');
    document.body.removeAttribute('data-last-minute');
  }
  const introMode = focusIntro || breakIntro;
  const introTargetSeconds = state.sessionDurationSeconds;
  const introAnimating = (focusIntro && state.timeRemaining < introTargetSeconds) || (breakIntro && state.timeRemaining < introTargetSeconds);
  const introComplete = (focusIntro && state.timeRemaining >= introTargetSeconds) || (breakIntro && state.timeRemaining >= introTargetSeconds);
  app.classList.toggle('intro-complete', introComplete);
  app.classList.toggle('intro-animating', introAnimating);
  btnReset.hidden = introMode;
  btnReset.classList.toggle('is-hidden', introMode);
  controlsRow.classList.toggle('has-reset', !introMode);
  if (progressContainer) {
    progressContainer.hidden = introMode || isTimeEditMode;
    progressContainer.classList.toggle('is-hidden', introMode || isTimeEditMode);
  }
  if (timerAdjust) {
    timerAdjust.hidden = !isTimeEditMode;
    timerAdjust.classList.toggle('is-hidden', !isTimeEditMode);
    timerAdjust.setAttribute('aria-hidden', isTimeEditMode ? 'false' : 'true');
  }
  if (controlsRow) controlsRow.classList.toggle('is-hidden', isTimeEditMode);
  const controlsContainer = controlsRow ? controlsRow.parentElement : null;
  if (controlsContainer) {
    controlsContainer.hidden = isTimeEditMode;
    controlsContainer.classList.toggle('is-hidden', isTimeEditMode);
    controlsContainer.classList.toggle('intro-reserving', introAnimating);
  }
  controlsSecondary.classList.toggle('visible', state.isRunning && !isTimeEditMode);
  controlsSecondary.setAttribute('aria-hidden', state.isRunning ? 'false' : 'true');
  const showActions = state.currentMode === 'focus' && state.hasRevealedActions && !focusIntro;
  if (showActions && SHOW_START_BREAK && !isTimeEditMode) {
    pomodoroActions.hidden = false;
    if (!pomodoroActions.classList.contains('actions-visible')) {
      requestAnimationFrame(() => {
        pomodoroActions.classList.add('actions-visible');
      });
    }
  } else {
    pomodoroActions.hidden = true;
    pomodoroActions.classList.remove('actions-visible');
  }

  btnStartPause.textContent = state.isRunning ? 'Pause' : 'Start';
  btnStartPause.setAttribute('aria-label', state.isRunning ? 'Pause timer' : 'Start timer');

  btnStartBreakNow.textContent = state.currentMode === 'focus' ? 'Start break now' : 'Start focus now';
  btnStartBreakNow.setAttribute('aria-label', state.currentMode === 'focus' ? 'Start break now' : 'Start focus now');

  if (btnSwitchMode) {
    if (introMode) {
      btnSwitchMode.textContent = state.currentMode === 'focus' ? 'Switch to break' : 'Switch to focus';
      btnSwitchMode.setAttribute('aria-label', state.currentMode === 'focus' ? 'Switch to break' : 'Switch to focus');
      btnSwitchMode.classList.remove('is-tertiary-label');
    } else {
      btnSwitchMode.textContent = state.currentMode === 'focus' ? 'Start break now' : 'Start focus now';
      btnSwitchMode.setAttribute('aria-label', state.currentMode === 'focus' ? 'Start break now' : 'Start focus now');
      btnSwitchMode.classList.add('is-tertiary-label');
    }
  }
  if (controlsSwitchRow) {
    controlsSwitchRow.hidden = state.isRunning;
    controlsSwitchRow.classList.toggle('is-hidden', state.isRunning);
    controlsSwitchRow.classList.toggle('intro-complete--switch', introComplete);
  }

  btnReset.setAttribute('aria-label', 'Reset timer');

  btnStartPause.classList.toggle('is-running', state.isRunning);
  if (!state.isRunning || state.currentMode !== 'focus') {
    controlsRow.classList.remove('add-5-revealed');
  }

  updateProgressCircles();
}

function tick() {
  lastTickTimestamp = Date.now();
  state.timeRemaining -= 1;
  if (state.timeRemaining <= 0) {
    if (state.currentMode === 'focus' && state.skipNextBreak) {
      state.timeRemaining = getWorkDurationSeconds();
      state.skipNextBreak = false;
    } else {
      if (getSoundEnabled()) playModeSwitchSound();
      document.body.classList.add('timer-zero-flash');
      const flashDuration = 600;
      setTimeout(() => document.body.classList.remove('timer-zero-flash'), flashDuration);
      const wasBreak = state.currentMode === 'break';
      state.currentMode = state.currentMode === 'focus' ? 'break' : 'focus';
      state.timeRemaining = state.currentMode === 'focus' ? getWorkDurationSeconds() : getBreakDurationSeconds();
      state.sessionDurationSeconds = state.timeRemaining;
      if (state.currentMode === 'focus' && wasBreak && SHOW_START_BREAK) scheduleAdd5Reveal();
    }
  }
  updateDOM();
}

function startPause() {
  state.isRunning = !state.isRunning;
  if (state.isRunning) {
    state.hasStartedInCurrentMode = true;
    state.sessionDurationSeconds = state.timeRemaining;
    lastTickTimestamp = Date.now();
    intervalId = setInterval(tick, 1000);
    progressIntervalId = setInterval(updateProgressCircles, 80);
    if (state.currentMode === 'focus' && SHOW_START_BREAK) scheduleAdd5Reveal();
  } else {
    clearInterval(intervalId);
    intervalId = null;
    if (progressIntervalId) {
      clearInterval(progressIntervalId);
      progressIntervalId = null;
    }
    if (add5RevealTimeout) {
      clearTimeout(add5RevealTimeout);
      add5RevealTimeout = null;
    }
  }
  updateDOM();
}

function reset() {
  state.isRunning = false;
  state.skipNextBreak = false;
  state.hasRevealedActions = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (progressIntervalId) {
    clearInterval(progressIntervalId);
    progressIntervalId = null;
  }
  if (add5RevealTimeout) {
    clearTimeout(add5RevealTimeout);
    add5RevealTimeout = null;
  }
  state.timeRemaining = state.currentMode === 'focus' ? getWorkDurationSeconds() : getBreakDurationSeconds();
  state.sessionDurationSeconds = state.timeRemaining;
  state.lastMinutesElapsed = -1;
  controlsRow.classList.remove('add-5-revealed');
  updateDOM();
}

function startBreakNow(skipIntro) {
  state.currentMode = 'break';
  state.lastMinutesElapsed = -1;
  if (skipIntro) {
    state.hasStartedInCurrentMode = true;
    state.timeRemaining = getBreakDurationSeconds();
    state.sessionDurationSeconds = getBreakDurationSeconds();
    if (breakIntroAnimationId) {
      clearInterval(breakIntroAnimationId);
      breakIntroAnimationId = null;
    }
    if (focusIntroAnimationId) {
      clearInterval(focusIntroAnimationId);
      focusIntroAnimationId = null;
    }
    updateDOM();
    return;
  }
  state.hasStartedInCurrentMode = false;
  state.sessionDurationSeconds = getBreakDurationSeconds();
  if (breakIntroAnimationId) {
    clearInterval(breakIntroAnimationId);
    breakIntroAnimationId = null;
  }
  if (focusIntroAnimationId) {
    clearInterval(focusIntroAnimationId);
    focusIntroAnimationId = null;
  }
  state.timeRemaining = 0;
  updateDOM();
  const stepMs = 80;
  const incrementSeconds = 60;
  breakIntroAnimationId = setInterval(() => {
    state.timeRemaining = Math.min(state.timeRemaining + incrementSeconds, getBreakDurationSeconds());
    updateDOM();
    if (state.timeRemaining >= getBreakDurationSeconds()) {
      clearInterval(breakIntroAnimationId);
      breakIntroAnimationId = null;
    }
  }, stepMs);
}

function startFocusNow(skipIntro) {
  state.currentMode = 'focus';
  state.lastMinutesElapsed = -1;
  if (skipIntro) {
    state.hasStartedInCurrentMode = true;
    state.timeRemaining = getWorkDurationSeconds();
    state.sessionDurationSeconds = getWorkDurationSeconds();
    if (breakIntroAnimationId) {
      clearInterval(breakIntroAnimationId);
      breakIntroAnimationId = null;
    }
    if (focusIntroAnimationId) {
      clearInterval(focusIntroAnimationId);
      focusIntroAnimationId = null;
    }
    updateDOM();
    return;
  }
  state.hasStartedInCurrentMode = false;
  if (breakIntroAnimationId) {
    clearInterval(breakIntroAnimationId);
    breakIntroAnimationId = null;
  }
  if (focusIntroAnimationId) {
    clearInterval(focusIntroAnimationId);
    focusIntroAnimationId = null;
  }
  state.timeRemaining = 0;
  updateDOM();
  const stepMs = 80;
  const incrementSeconds = 5 * 60;
  focusIntroAnimationId = setInterval(() => {
    state.timeRemaining = Math.min(state.timeRemaining + incrementSeconds, getWorkDurationSeconds());
    updateDOM();
    if (state.timeRemaining >= getWorkDurationSeconds()) {
      clearInterval(focusIntroAnimationId);
      focusIntroAnimationId = null;
    }
  }, stepMs);
}

function toggleBreakFocus(skipIntro) {
  if (state.currentMode === 'focus') startBreakNow(skipIntro);
  else startFocusNow(skipIntro);
}

// Click or Enter on time value to edit
timeDisplay.addEventListener('click', (e) => {
  if (e.target.classList.contains('pomodoro__time-value')) {
    enterTimeEditMode();
  }
});
timeDisplay.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('pomodoro__time-value')) {
    e.preventDefault();
    enterTimeEditMode();
  }
});

function addMinutes(minutes) {
  const maxSeconds = 99 * 60 + 59;
  state.timeRemaining = Math.min(maxSeconds, state.timeRemaining + minutes * 60);
  if (isTimeEditMode) {
    const input = timeDisplay.querySelector('.pomodoro__time-input');
    if (input) input.value = formatTime(state.timeRemaining);
  } else {
    updateDOM();
  }
}

// Event listeners
btnStartPause.addEventListener('click', startPause);
btnStartBreakNow.addEventListener('click', () => toggleBreakFocus(true));
if (btnSwitchMode) btnSwitchMode.addEventListener('click', () => toggleBreakFocus(false));
btnReset.addEventListener('click', reset);
btnStartBreak.addEventListener('click', startBreakNow);
function preventBlur(e) {
  e.preventDefault();
}
if (btnAdd5) {
  btnAdd5.addEventListener('mousedown', preventBlur);
  btnAdd5.addEventListener('click', () => addMinutes(5));
}
if (btnAdd10) {
  btnAdd10.addEventListener('mousedown', preventBlur);
  btnAdd10.addEventListener('click', () => addMinutes(10));
}
if (btnAdd15) {
  btnAdd15.addEventListener('mousedown', preventBlur);
  btnAdd15.addEventListener('click', () => addMinutes(15));
}
if (btnAdjustTimer) {
  btnAdjustTimer.addEventListener('mousedown', preventBlur);
  btnAdjustTimer.addEventListener('click', () => {
    if (isTimeEditMode) {
      const input = timeDisplay.querySelector('.pomodoro__time-input');
      if (input) {
        const parsed = parseTimeInput(input.value);
        if (parsed !== null && parsed > 0) {
          const maxSeconds = 99 * 60 + 59;
          state.timeRemaining = Math.min(maxSeconds, Math.max(1, parsed));
        }
      }
      isTimeEditMode = false;
      updateDOM();
    } else {
      enterTimeEditMode();
    }
  });
}

// Theme (apply before first paint) and initial render
initTheme();
  initSettingsMenu();
  initAudioToggle();
  initDefaultDurations();
state.timeRemaining = getWorkDurationSeconds();
state.sessionDurationSeconds = getWorkDurationSeconds();
requestAnimationFrame(updateThemeSwitcherIndicator);
updateDOM();
