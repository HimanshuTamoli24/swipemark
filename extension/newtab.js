// Minimalist Focus & Time New Tab Screen Script

(function () {
  'use strict';

  // --- STATE ---
  const state = {
    mode: 'watch', // 'watch' | 'focus'
    enabled: true,
    theme: '#fef08a',
    textColor: '#111827',
    is24Hour: false,
    showSeconds: false,
    ambientSound: 'none', // Default OFF
    isPlayingSound: false,
    zenMode: false,
    
    // Focus Timer State
    focusDurationMinutes: 25,
    focusSecondsRemaining: 25 * 60,
    focusInterval: null,
    isFocusRunning: false,
    isFocusSessionActive: false, // true once user starts, until ended
  };

  // --- DOM ELEMENTS ---
  const appBody = document.getElementById('appBody');
  const mainContainer = document.getElementById('mainContainer');
  const disabledScreen = document.getElementById('disabledScreen');
  const timeDisplay = document.getElementById('timeDisplay');
  const subTextDisplay = document.getElementById('subTextDisplay');
  const dateBadge = document.getElementById('dateBadge');
  
  // Modes & Controls
  const modeWatch = document.getElementById('modeWatch');
  const modeFocus = document.getElementById('modeFocus');
  const focusControls = document.getElementById('focusControls');
  const focusSetupControls = document.getElementById('focusSetupControls');
  const focusActiveControls = document.getElementById('focusActiveControls');
  
  // Focus setup buttons
  const presetBtns = document.querySelectorAll('.preset-btn');
  const decrementMinBtn = document.getElementById('decrementMinBtn');
  const incrementMinBtn = document.getElementById('incrementMinBtn');
  const startFocusBtn = document.getElementById('startFocusBtn');
  const startFocusLabel = document.getElementById('startFocusLabel');

  // Focus active buttons (After start only show these)
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  const pauseIcon = document.getElementById('pauseIcon');
  const playIcon = document.getElementById('playIcon');
  const holdToEndBtn = document.getElementById('holdToEndBtn');
  const holdProgressFill = document.getElementById('holdProgressFill');

  // Top Actions
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIconOff = document.getElementById('soundIconOff');
  const soundIconOn = document.getElementById('soundIconOn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const airplaneBtn = document.getElementById('airplaneBtn');
  const airplaneLabel = document.getElementById('airplaneLabel');

  // Settings Modal
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsDoneBtn = document.getElementById('saveSettingsDoneBtn');
  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  const enableNewTabToggle = document.getElementById('enableNewTabToggle');
  const customBgColor = document.getElementById('customBgColor');
  const customColorHex = document.getElementById('customColorHex');
  const format24Toggle = document.getElementById('format24Toggle');
  const showSecondsToggle = document.getElementById('showSecondsToggle');
  const ambientSoundSelect = document.getElementById('ambientSoundSelect');
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const reEnableBtn = document.getElementById('reEnableBtn');

  // Hold-to-end timer
  let holdInterval = null;
  let holdProgress = 0;

  // --- DAYS LEFT IN YEAR CALCULATION ---
  function getDaysLeftInYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    const msDiff = endOfYear.getTime() - now.getTime();
    const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    return { days, year: currentYear };
  }

  // --- STORAGE HELPERS ---
  function saveSettings() {
    const dataToSave = {
      enabled: state.enabled,
      theme: state.theme,
      textColor: state.textColor,
      is24Hour: state.is24Hour,
      showSeconds: state.showSeconds,
      ambientSound: state.ambientSound,
      lastMode: state.mode,
      focusDurationMinutes: state.focusDurationMinutes,
    };

    try {
      localStorage.setItem('swipemark_newtab_settings', JSON.stringify(dataToSave));
    } catch (e) {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ swipemark_newtab_settings: dataToSave });
    }
  }

  function loadSettings() {
    const handleLoadedData = (settings) => {
      if (!settings) return;
      if (typeof settings.enabled === 'boolean') state.enabled = settings.enabled;
      if (settings.theme) state.theme = settings.theme;
      if (settings.textColor) state.textColor = settings.textColor;
      if (typeof settings.is24Hour === 'boolean') state.is24Hour = settings.is24Hour;
      if (typeof settings.showSeconds === 'boolean') state.showSeconds = settings.showSeconds;
      if (settings.ambientSound) state.ambientSound = settings.ambientSound;
      if (settings.lastMode && (settings.lastMode === 'watch' || settings.lastMode === 'focus')) {
        state.mode = settings.lastMode;
      }
      if (settings.focusDurationMinutes) {
        state.focusDurationMinutes = settings.focusDurationMinutes;
        state.focusSecondsRemaining = settings.focusDurationMinutes * 60;
      }

      applySettingsToUI();
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['swipemark_newtab_settings'], (result) => {
        if (result && result.swipemark_newtab_settings) {
          handleLoadedData(result.swipemark_newtab_settings);
        } else {
          loadFromLocalStorage();
        }
      });
    } else {
      loadFromLocalStorage();
    }

    function loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem('swipemark_newtab_settings');
        if (raw) handleLoadedData(JSON.parse(raw));
        else applySettingsToUI();
      } catch (e) {
        applySettingsToUI();
      }
    }
  }

  // --- APPLY SETTINGS ---
  function applySettingsToUI() {
    // 1. Enabled / Disabled state ("user choose then need or not")
    if (state.enabled) {
      disabledScreen.classList.add('hidden');
      mainContainer.classList.remove('hidden');
      enableNewTabToggle.checked = true;
    } else {
      disabledScreen.classList.remove('hidden');
      mainContainer.classList.add('hidden');
      enableNewTabToggle.checked = false;
    }

    // 2. Background and text color ("bg choose own from setting ico top rignt")
    appBody.style.setProperty('--bg-color', state.theme);
    appBody.style.setProperty('--text-color', state.textColor);
    
    // Auto-adjust pill and contrast for dark themes
    const isDark = isColorDark(state.theme);
    if (isDark) {
      appBody.style.setProperty('--pill-bg', '#27272a');
      appBody.style.setProperty('--pill-text', '#fafafa');
      appBody.style.setProperty('--pill-border', 'rgba(255, 255, 255, 0.12)');
      appBody.style.setProperty('--pill-shadow', '0 4px 20px rgba(0, 0, 0, 0.4)');
    } else {
      appBody.style.setProperty('--pill-bg', '#ffffff');
      appBody.style.setProperty('--pill-text', '#111827');
      appBody.style.setProperty('--pill-border', 'rgba(0, 0, 0, 0.08)');
      appBody.style.setProperty('--pill-shadow', '0 4px 14px rgba(0, 0, 0, 0.06)');
    }

    customBgColor.value = state.theme;
    customColorHex.textContent = state.theme.toUpperCase();

    // Update Live Preview Card in Settings
    const previewCard = document.getElementById('previewCard');
    const previewTag = document.getElementById('previewTag');
    if (previewCard) {
      previewCard.style.backgroundColor = state.theme;
      previewCard.style.color = state.textColor;
    }
    if (previewTag) {
      previewTag.textContent = state.theme.toUpperCase();
    }
    
    colorSwatches.forEach((swatch) => {
      const swatchBg = swatch.getAttribute('data-bg');
      if (swatchBg.toLowerCase() === state.theme.toLowerCase()) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });

    format24Toggle.checked = state.is24Hour;
    showSecondsToggle.checked = state.showSeconds;
    ambientSoundSelect.value = state.ambientSound;

    setMode(state.mode);
    updateDisplay();
  }

  function isColorDark(hex) {
    if (!hex || hex[0] !== '#') return false;
    let c = hex.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128;
  }

  // --- MODE SWITCHER (WATCH & FOCUS) ---
  function setMode(mode) {
    state.mode = mode;
    [modeWatch, modeFocus].forEach((tab) => {
      if (tab.getAttribute('data-mode') === mode) tab.classList.add('active');
      else tab.classList.remove('active');
    });

    if (mode === 'focus') {
      focusControls.classList.remove('hidden');
      updateFocusControlsVisibility();
    } else {
      // Watch mode: show how many days left to end of this year
      focusControls.classList.add('hidden');
      const { days, year } = getDaysLeftInYear();
      subTextDisplay.textContent = `${days} days left in ${year}`;
    }

    saveSettings();
    updateDisplay();
  }

  function updateFocusControlsVisibility() {
    if (state.isFocusSessionActive) {
      // After start only show these button: Play/Pause circle and Hold to end
      focusSetupControls.classList.add('hidden');
      focusActiveControls.classList.remove('hidden');
      subTextDisplay.textContent = state.isFocusRunning ? 'Focus Session in Progress' : 'Session Paused';
    } else {
      // Before start: Show setup buttons (presets, -, +, Start Focus)
      focusSetupControls.classList.remove('hidden');
      focusActiveControls.classList.add('hidden');
      subTextDisplay.textContent = 'Focus Mode';
    }
  }

  // --- TIME & CLOCK LOGIC ---
  function updateDisplay() {
    const now = new Date();

    // Date Badge (if present)
    const dateOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    if (dateBadge) {
      dateBadge.textContent = now.toLocaleDateString('en-US', dateOptions);
    }

    if (state.mode === 'watch') {
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      if (!state.is24Hour) {
        hours = hours % 12 || 12;
      }
      const hoursStr = String(hours).padStart(2, '0');

      if (state.showSeconds) {
        timeDisplay.textContent = `${hoursStr}:${minutes}:${seconds}`;
      } else {
        timeDisplay.textContent = `${hoursStr}:${minutes}`;
      }

      // Show days left to end of year on watch mode
      const { days, year } = getDaysLeftInYear();
      subTextDisplay.textContent = `${days} days left in ${year}`;
    } else if (state.mode === 'focus') {
      const mins = Math.floor(state.focusSecondsRemaining / 60);
      const secs = state.focusSecondsRemaining % 60;
      timeDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }

  // --- FOCUS TIMER CONTROLS ---
  function startFocus() {
    state.isFocusSessionActive = true;
    state.isFocusRunning = true;
    updateFocusControlsVisibility();

    pauseIcon.classList.remove('hidden');
    playIcon.classList.add('hidden');

    if (state.ambientSound !== 'none') {
      playAudio(state.ambientSound);
    }

    clearInterval(state.focusInterval);
    state.focusInterval = setInterval(() => {
      if (state.focusSecondsRemaining > 0) {
        state.focusSecondsRemaining--;
        updateDisplay();
      } else {
        // Finished
        endFocusSession();
        subTextDisplay.textContent = '🎉 Session Completed!';
        playCompletionTone();
      }
    }, 1000);
  }

  function togglePauseFocus() {
    if (state.isFocusRunning) {
      // Pause
      clearInterval(state.focusInterval);
      state.isFocusRunning = false;
      pauseIcon.classList.add('hidden');
      playIcon.classList.remove('hidden');
      subTextDisplay.textContent = 'Session Paused';
      stopAudio();
    } else {
      // Resume
      state.isFocusRunning = true;
      pauseIcon.classList.remove('hidden');
      playIcon.classList.add('hidden');
      subTextDisplay.textContent = 'Focus Session in Progress';
      if (state.ambientSound !== 'none') {
        playAudio(state.ambientSound);
      }
      state.focusInterval = setInterval(() => {
        if (state.focusSecondsRemaining > 0) {
          state.focusSecondsRemaining--;
          updateDisplay();
        } else {
          endFocusSession();
          subTextDisplay.textContent = '🎉 Session Completed!';
          playCompletionTone();
        }
      }, 1000);
    }
  }

  function endFocusSession() {
    clearInterval(state.focusInterval);
    state.isFocusRunning = false;
    state.isFocusSessionActive = false;
    state.focusSecondsRemaining = state.focusDurationMinutes * 60;
    stopAudio();
    updateFocusControlsVisibility();
    updateDisplay();
  }

  function setPresetMinutes(mins) {
    state.focusDurationMinutes = mins;
    state.focusSecondsRemaining = mins * 60;
    presetBtns.forEach((btn) => {
      if (parseInt(btn.getAttribute('data-min'), 10) === mins) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    endFocusSession();
    saveSettings();
  }

  // --- HOLD TO END INTERACTION (3s: 0-50% in 2s slowing, 50-100% in last 1s fast + shake) ---
  let holdRafId = null;
  let isHoldingActive = false;
  let isHoldingSpace = false;

  function startHoldToEnd() {
    if (!state.isFocusSessionActive) return;
    if (isHoldingActive) return;
    isHoldingActive = true;
    holdProgress = 0;
    holdProgressFill.style.width = '0%';
    holdToEndBtn.classList.add('holding');
    const holdLabel = document.getElementById('holdLabelText');
    if (holdLabel) holdLabel.textContent = 'Holding to end...';

    const startTime = performance.now();
    const TOTAL_MS = 3000; // 3 seconds total

    function step(now) {
      if (!isHoldingActive) return;
      const elapsed = now - startTime;

      if (elapsed >= TOTAL_MS) {
        holdProgress = 100;
        holdProgressFill.style.width = '100%';
        isHoldingActive = false;
        isHoldingSpace = false;
        holdToEndBtn.classList.remove('holding', 'shake-subtle', 'shake-fast');
        if (holdLabel) holdLabel.textContent = 'Hold to end';
        playCompletionTone();
        endFocusSession();
        setTimeout(() => {
          holdProgressFill.style.width = '0%';
        }, 150);
        return;
      }

      let p = 0;
      if (elapsed <= 2000) {
        // First 2 seconds: 0% to 50%, slowing down
        const u = elapsed / 2000;
        p = 50 * (2 * u - u * u);
        holdToEndBtn.classList.add('shake-subtle');
        holdToEndBtn.classList.remove('shake-fast');
      } else {
        // Last 1 second: 50% to 100%, fast rush!
        const v = (elapsed - 2000) / 1000;
        p = 50 + 50 * Math.pow(v, 2);
        holdToEndBtn.classList.add('shake-fast');
        holdToEndBtn.classList.remove('shake-subtle');
      }

      holdProgress = Math.min(100, p);
      holdProgressFill.style.width = `${holdProgress}%`;
      holdRafId = requestAnimationFrame(step);
    }

    holdRafId = requestAnimationFrame(step);
  }

  function cancelHoldToEnd() {
    isHoldingActive = false;
    isHoldingSpace = false;
    if (holdRafId) {
      cancelAnimationFrame(holdRafId);
      holdRafId = null;
    }
    holdProgress = 0;
    holdProgressFill.style.width = '0%';
    holdToEndBtn.classList.remove('holding', 'shake-subtle', 'shake-fast');
    const holdLabel = document.getElementById('holdLabelText');
    if (holdLabel) holdLabel.textContent = 'Hold to end';
  }

  // --- AMBIENT SOUND GENERATOR (WEB AUDIO API) ---
  let audioCtx = null;
  let noiseNode = null;
  let gainNode = null;
  let tickInterval = null;

  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playAudio(type) {
    // If tab is hidden, do NOT start sound
    if (document.hidden) return;

    initAudioContext();
    stopAudio();

    if (type === 'none') return;

    if (type === 'white-noise') {
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = buffer;
      noiseNode.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.04;

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      noiseNode.start();
    } else if (type === 'waves') {
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = buffer;
      noiseNode.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 350;

      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.05;

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      noiseNode.start();
    } else if (type === 'ticking') {
      tickInterval = setInterval(() => {
        try {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
          g.gain.setValueAtTime(0.04, audioCtx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
          osc.connect(g);
          g.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.05);
        } catch (e) {}
      }, 1000);
    }

    state.isPlayingSound = true;
    soundIconOff.classList.add('hidden');
    soundIconOn.classList.remove('hidden');
  }

  function stopAudio() {
    if (noiseNode) {
      try { noiseNode.stop(); } catch (e) {}
      noiseNode = null;
    }
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    state.isPlayingSound = false;
    soundIconOff.classList.remove('hidden');
    soundIconOn.classList.add('hidden');
    if (airplaneBtn) airplaneBtn.classList.remove('active');
    if (airplaneLabel) airplaneLabel.textContent = 'Zen mode off';
  }

  function playCompletionTone() {
    try {
      initAudioContext();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      g.gain.setValueAtTime(0.12, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {}
  }

  // --- AUTOMATICALLY STOP AUDIO WHEN MOVING TO ANOTHER TAB ---
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // User switched to another tab: STOP audio immediately!
      stopAudio();
    }
  });

  window.addEventListener('blur', () => {
    // Window lost focus: STOP audio
    stopAudio();
  });

  // --- FULLSCREEN TOGGLE ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  // --- EVENT LISTENERS ---
  function setupListeners() {
    // Mode tabs
    modeWatch.addEventListener('click', () => setMode('watch'));
    modeFocus.addEventListener('click', () => setMode('focus'));

    // Preset buttons
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.getAttribute('data-min'), 10);
        setPresetMinutes(mins);
      });
    });

    // Add / Subtract minutes
    decrementMinBtn.addEventListener('click', () => {
      if (state.focusDurationMinutes > 1) {
        state.focusDurationMinutes -= 1;
        state.focusSecondsRemaining = state.focusDurationMinutes * 60;
        updateDisplay();
        saveSettings();
      }
    });

    incrementMinBtn.addEventListener('click', () => {
      state.focusDurationMinutes += 1;
      state.focusSecondsRemaining = state.focusDurationMinutes * 60;
      updateDisplay();
      saveSettings();
    });

    // Start Focus
    startFocusBtn.addEventListener('click', startFocus);

    // Active Controls (Play/Pause & Hold to end)
    pauseResumeBtn.addEventListener('click', togglePauseFocus);

    // Hold to end event listeners (desktop & mobile)
    holdToEndBtn.addEventListener('mousedown', startHoldToEnd);
    holdToEndBtn.addEventListener('mouseup', cancelHoldToEnd);
    holdToEndBtn.addEventListener('mouseleave', cancelHoldToEnd);

    holdToEndBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startHoldToEnd();
    }, { passive: false });
    holdToEndBtn.addEventListener('touchend', cancelHoldToEnd);
    holdToEndBtn.addEventListener('touchcancel', cancelHoldToEnd);

    // Spacebar Hold to End Listener
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.mode === 'focus' && state.isFocusSessionActive && !isHoldingSpace) {
          isHoldingSpace = true;
          startHoldToEnd();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (isHoldingSpace) {
          isHoldingSpace = false;
          cancelHoldToEnd();
        }
      }
    });

    // Audio & Fullscreen
    soundToggleBtn.addEventListener('click', () => {
      if (state.isPlayingSound) {
        stopAudio();
      } else {
        const soundType = state.ambientSound === 'none' ? 'white-noise' : state.ambientSound;
        state.ambientSound = soundType;
        ambientSoundSelect.value = soundType;
        playAudio(soundType);
      }
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Zen / Airplane Mode Toggle Pill (if present)
    if (airplaneBtn) {
      airplaneBtn.addEventListener('click', () => {
        state.zenMode = !state.zenMode;
        if (state.zenMode) {
          airplaneBtn.classList.add('active');
          if (airplaneLabel) airplaneLabel.textContent = 'Zen mode on';
          if (!state.isPlayingSound) {
            playAudio(state.ambientSound === 'none' ? 'waves' : state.ambientSound);
          }
        } else {
          airplaneBtn.classList.remove('active');
          if (airplaneLabel) airplaneLabel.textContent = 'Zen mode off';
          stopAudio();
        }
      });
    }

    // Settings Modal
    settingsBtn.addEventListener('click', () => {
      settingsBackdrop.classList.remove('hidden');
    });

    // Segmented Tabs Switching in Settings
    const tabThemeBtn = document.getElementById('tabThemeBtn');
    const tabPrefBtn = document.getElementById('tabPrefBtn');
    const tabAudioBtn = document.getElementById('tabAudioBtn');
    const sectionTheme = document.getElementById('sectionTheme');
    const sectionPrefs = document.getElementById('sectionPrefs');
    const sectionAudio = document.getElementById('sectionAudio');

    function switchSettingsTab(tabName) {
      [tabThemeBtn, tabPrefBtn, tabAudioBtn].forEach(b => b?.classList.remove('active'));
      [sectionTheme, sectionPrefs, sectionAudio].forEach(s => s?.classList.add('hidden'));

      if (tabName === 'theme') {
        tabThemeBtn?.classList.add('active');
        sectionTheme?.classList.remove('hidden');
      } else if (tabName === 'prefs') {
        tabPrefBtn?.classList.add('active');
        sectionPrefs?.classList.remove('hidden');
      } else if (tabName === 'audio') {
        tabAudioBtn?.classList.add('active');
        sectionAudio?.classList.remove('hidden');
      }
    }

    tabThemeBtn?.addEventListener('click', () => switchSettingsTab('theme'));
    tabPrefBtn?.addEventListener('click', () => switchSettingsTab('prefs'));
    tabAudioBtn?.addEventListener('click', () => switchSettingsTab('audio'));

    closeSettingsBtn.addEventListener('click', () => {
      settingsBackdrop.classList.add('hidden');
    });

    saveSettingsDoneBtn.addEventListener('click', () => {
      settingsBackdrop.classList.add('hidden');
    });

    settingsBackdrop.addEventListener('click', (e) => {
      if (e.target === settingsBackdrop) {
        settingsBackdrop.classList.add('hidden');
      }
    });

    // Settings - Enable/Disable New Tab Toggle ("user choose then need or not")
    enableNewTabToggle.addEventListener('change', (e) => {
      state.enabled = e.target.checked;
      saveSettings();
      applySettingsToUI();
    });

    reEnableBtn.addEventListener('click', () => {
      state.enabled = true;
      saveSettings();
      applySettingsToUI();
    });

    // Settings - Swatches
    colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const bg = swatch.getAttribute('data-bg');
        const text = swatch.getAttribute('data-text');
        state.theme = bg;
        state.textColor = text;
        saveSettings();
        applySettingsToUI();
      });
    });

    // Settings - Custom Color Picker ("bg choose own from setting ico top rignt")
    customBgColor.addEventListener('input', (e) => {
      state.theme = e.target.value;
      state.textColor = isColorDark(state.theme) ? '#f4f4f5' : '#111827';
      customColorHex.textContent = state.theme.toUpperCase();
      saveSettings();
      applySettingsToUI();
    });

    // 24 Hour Toggle
    format24Toggle.addEventListener('change', (e) => {
      state.is24Hour = e.target.checked;
      saveSettings();
      updateDisplay();
    });

    // Seconds Toggle
    showSecondsToggle.addEventListener('change', (e) => {
      state.showSeconds = e.target.checked;
      saveSettings();
      updateDisplay();
    });

    // Ambient Sound Select
    ambientSoundSelect.addEventListener('change', (e) => {
      state.ambientSound = e.target.value;
      if (state.isPlayingSound) {
        playAudio(state.ambientSound);
      }
      saveSettings();
    });

    // Reset Defaults
    resetDefaultsBtn.addEventListener('click', () => {
      state.enabled = true;
      state.theme = '#fef08a';
      state.textColor = '#111827';
      state.is24Hour = false;
      state.showSeconds = false;
      state.ambientSound = 'none'; // Default off
      state.focusDurationMinutes = 25;
      state.focusSecondsRemaining = 25 * 60;
      stopAudio();
      endFocusSession();
      saveSettings();
      applySettingsToUI();
    });

    // Keyboard shortcuts (Space = Start/Pause, W = Watch, F = Focus)
    document.addEventListener('keydown', (e) => {
      if (settingsBackdrop.classList.contains('hidden')) {
        if (e.code === 'Space' && state.mode === 'focus') {
          e.preventDefault();
          if (state.isFocusSessionActive) {
            togglePauseFocus();
          } else {
            startFocus();
          }
        } else if (e.key === 'w' || e.key === 'W') {
          setMode('watch');
        } else if (e.key === 'f' || e.key === 'F') {
          setMode('focus');
        }
      } else if (e.key === 'Escape') {
        settingsBackdrop.classList.add('hidden');
      }
    });
  }

  // Dynamic App Links according to configured server URL (Production or Local)
  function updateAppLinks() {
    function setLinks(serverUrl) {
      const base = (serverUrl || 'https://swipemark.himanshutamoli.site').trim().replace(/\/+$/, '');
      const fullAppUrl = `${base}/app`;
      const goToAppBtn = document.getElementById('goToAppBtn');
      const topAppQuickLink = document.getElementById('topAppQuickLink');
      if (goToAppBtn) goToAppBtn.href = fullAppUrl;
      if (topAppQuickLink) topAppQuickLink.href = fullAppUrl;
    }

    if (chrome?.storage?.sync) {
      chrome.storage.sync.get(['serverUrl'], (syncRes) => {
        if (!chrome.runtime.lastError && syncRes && syncRes.serverUrl) {
          setLinks(syncRes.serverUrl);
        } else if (chrome?.storage?.local) {
          chrome.storage.local.get(['serverUrl'], (localRes) => {
            if (localRes && localRes.serverUrl) setLinks(localRes.serverUrl);
          });
        }
      });
    } else if (chrome?.storage?.local) {
      chrome.storage.local.get(['serverUrl'], (localRes) => {
        if (localRes && localRes.serverUrl) setLinks(localRes.serverUrl);
      });
    }
  }

  // --- INITIALIZATION ---
  loadSettings();
  setupListeners();
  updateDisplay();
  updateAppLinks();

  // Tick clock every second
  setInterval(() => {
    updateDisplay();
  }, 1000);

})();
