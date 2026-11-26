'use strict';

// PassPilot runs locally: no analytics, requests, or password storage.
const $ = (selector) => document.querySelector(selector);
const input = $('#password-input');
const strengthName = $('#strength-name');
const strengthDescription = $('#strength-description');
const lengthCount = $('#length-count');
const meter = $('#strength-meter');
const meterSegments = [...meter.querySelectorAll('.segment')];
const feedback = $('#feedback');

const commonPatterns = [
  'password', 'passw0rd', 'p@ssword', '123456', '123123', 'qwerty',
  'letmein', 'iloveyou', 'welcome', 'admin', 'abc123', 'asdfgh',
  'qwertyui', 'football', 'monkey', 'secret'
];
const adjacentSequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function hasSequence(password) {
  const normalized = password.toLowerCase();
  for (const sequence of adjacentSequences) {
    for (let index = 0; index < sequence.length - 3; index++) {
      const chunk = sequence.slice(index, index + 4);
      if (normalized.includes(chunk) || normalized.includes([...chunk].reverse().join(''))) return true;
    }
  }
  return false;
}

function analyzePassword(password) {
  const length = [...password].length;
  const common = commonPatterns.some((part) => password.toLowerCase().includes(part));
  const repeated = /(.)\1{3,}/u.test(password) || /(.{2,4})\1{2,}/u.test(password);
  const sequential = hasSequence(password);
  const uniqueWords = password.trim().split(/\s+/u).filter(Boolean);
  const repeatedWords = uniqueWords.length > 1 && new Set(uniqueWords.map((w) => w.toLowerCase())).size < uniqueWords.length;
  const avoidPatterns = !common && !sequential && !repeatedWords;
  const avoidRepeats = !repeated;
  const variety = [/[a-z]/u, /[A-Z]/u, /\d/u, /[^\p{L}\p{N}\s]/u].filter((re) => re.test(password)).length;

  if (!length) return { score: 0, length, rules: [false, false, false, false], message: 'Your password stays on this device. We don\'t save or transmit it.' };
  let score = length >= 20 ? 4 : length >= 16 ? 3 : length >= 12 ? 2 : length >= 8 ? 1 : 0;
  if (length >= 12 && variety >= 3) score = Math.min(score + 1, 4);
  if (common || repeated || repeatedWords) score = Math.min(score, 1);
  if (sequential) score = Math.min(score, 2);
  if (length < 8) score = 0;

  let message = 'Consider a longer, unique password — 16+ characters is a great target.';
  if (common || repeatedWords) message = 'This includes a common or repeated word pattern. Try something less predictable.';
  else if (repeated) message = 'Long repeated character patterns make a password easier to guess.';
  else if (sequential) message = 'Sequences like 1234 or qwert are predictable. Avoid them.';
  else if (length >= 16 && score >= 3) message = 'Nice length! Make sure this password is unique to one account.';
  else if (length >= 12) message = 'Good start. Adding more length improves resistance to guessing.';
  return { score, length, rules: [length >= 12, length >= 16, avoidPatterns, avoidRepeats], message };
}

function renderStrength() {
  const { score, length, rules, message } = analyzePassword(input.value);
  const names = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#a34141', '#b66c3f', '#92712e', '#427c67', '#315e50'];
  strengthName.textContent = length ? names[score] : 'Waiting for input';
  strengthName.style.color = length ? colors[score] : '#67716c';
  lengthCount.textContent = `${length} character${length === 1 ? '' : 's'}`;
  meter.setAttribute('aria-valuenow', String(length ? score : 0));
  meter.setAttribute('aria-valuetext', length ? names[score] : 'No password entered');
  meterSegments.forEach((segment, index) => {
    segment.style.background = length && index < Math.max(1, score) ? colors[score] : '#e7e9e4';
  });
  strengthDescription.textContent = length ? 'An on-device estimate, not a guarantee of security.' : 'Type a password to see an approximate strength estimate.';
  ['#rule-length', '#rule-long', '#rule-common', '#rule-repeat'].forEach((id, index) => {
    $(id).classList.toggle('met', Boolean(length && rules[index]));
  });
  feedback.textContent = message;
}

input.addEventListener('input', renderStrength);
$('#toggle-visibility').addEventListener('click', () => {
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  $('#toggle-visibility').setAttribute('aria-pressed', String(visible));
  $('#toggle-visibility').setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  input.focus();
});

// Accessible tabs, including left/right arrow key navigation.
const tabs = [$('#check-tab'), $('#generate-tab')];
const panels = [$('#check-panel'), $('#generate-panel')];
function chooseTab(index) {
  tabs.forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    panels[i].hidden = i !== index;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => chooseTab(index));
  tab.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      chooseTab(next);
      tabs[next].focus();
    }
  });
});

const lengthSlider = $('#password-length');
lengthSlider.addEventListener('input', () => {
  $('#length-output').textContent = `${lengthSlider.value} characters`;
});

const characterSets = [
  ['#opt-upper', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  ['#opt-lower', 'abcdefghijklmnopqrstuvwxyz'],
  ['#opt-digits', '0123456789'],
  ['#opt-symbols', '!@#$%^&*()-_=+?']
];

// Rejection sampling avoids modulo bias when choosing from any character set.
function randomInt(maxExclusive) {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random generation is unavailable in this browser.');
  const maxUint32 = 0x100000000;
  const limit = Math.floor(maxUint32 / maxExclusive) * maxExclusive;
  const bytes = new Uint32Array(1);
  let value;
  do { globalThis.crypto.getRandomValues(bytes); value = bytes[0]; } while (value >= limit);
  return value % maxExclusive;
}
function secureShuffle(values) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
function generatePassword(length, selectedSets) {
  if (!selectedSets.length) throw new Error('Select at least one character type.');
  const alphabet = selectedSets.join('');
  const result = selectedSets.map((set) => set[randomInt(set.length)]);
  while (result.length < length) result.push(alphabet[randomInt(alphabet.length)]);
  return secureShuffle(result).join('');
}

$('#generate-button').addEventListener('click', () => {
  const selectedSets = characterSets.filter(([id]) => $(id).checked).map(([, chars]) => chars);
  const status = $('#copy-status');
  try {
    const generated = generatePassword(Number(lengthSlider.value), selectedSets);
    $('#generated-password').value = generated;
    $('#generated-wrap').hidden = false;
    status.textContent = 'Generated locally. Save it in a password manager.';
  } catch (error) {
    $('#generated-password').value = '';
    $('#generated-wrap').hidden = false;
    status.textContent = error.message;
  }
});

$('#copy-button').addEventListener('click', async () => {
  const generatedInput = $('#generated-password');
  if (!generatedInput.value) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable');
    await navigator.clipboard.writeText(generatedInput.value);
    $('#copy-status').textContent = 'Copied! Paste it into your password manager. Remember your clipboard may be accessible to other apps.';
  } catch {
    generatedInput.focus();
    generatedInput.select();
    $('#copy-status').textContent = 'Clipboard access was blocked. Press Ctrl+C (or Cmd+C) to copy the selected password.';
  }
});

renderStrength();
