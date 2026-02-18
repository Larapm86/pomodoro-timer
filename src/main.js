// Pomodoro Timer
import './style.css';

const WORK_DURATION = 25 * 60;   // 25 minutes in seconds
const BREAK_DURATION = 5 * 60;  // 5 minutes in seconds

const state = {
  timeRemaining: WORK_DURATION,
  isRunning: false,
  currentMode: 'work', // 'work' | 'break'
};

let intervalId = null;

// DOM refs
const app = document.getElementById('app');
const timeDisplay = document.getElementById('time-display');
const modeIndicator = document.getElementById('pomodoro-mode');
const btnStartPause = document.getElementById('btn-start-pause');
const btnReset = document.getElementById('btn-reset');

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDOM() {
  timeDisplay.textContent = formatTime(state.timeRemaining);
  modeIndicator.textContent = state.currentMode === 'work' ? 'Work' : 'Break';
  app.setAttribute('data-mode', state.currentMode);
  btnStartPause.textContent = state.isRunning ? 'Pause' : 'Start';
}

function tick() {
  state.timeRemaining -= 1;
  if (state.timeRemaining <= 0) {
    state.currentMode = state.currentMode === 'work' ? 'break' : 'work';
    state.timeRemaining = state.currentMode === 'work' ? WORK_DURATION : BREAK_DURATION;
  }
  updateDOM();
}

function startPause() {
  state.isRunning = !state.isRunning;
  if (state.isRunning) {
    intervalId = setInterval(tick, 1000);
  } else {
    clearInterval(intervalId);
    intervalId = null;
  }
  updateDOM();
}

function reset() {
  state.isRunning = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  state.timeRemaining = state.currentMode === 'work' ? WORK_DURATION : BREAK_DURATION;
  updateDOM();
}

// Event listeners
btnStartPause.addEventListener('click', startPause);
btnReset.addEventListener('click', reset);

// Initial render
updateDOM();
