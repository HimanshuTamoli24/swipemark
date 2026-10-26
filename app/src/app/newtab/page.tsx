"use strict";
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Bookmark,
  X,
  Plus,
  Minus,
  Check,
  Play,
  Pause,
  Palette,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  Flower2,
} from "lucide-react";

interface TabSettings {
  enabled: boolean;
  theme: string;
  textColor: string;
  is24Hour: boolean;
  showSeconds: boolean;
  ambientSound: "none" | "white-noise" | "waves" | "ticking";
}

const PRESET_COLORS = [
  { name: "Butter Yellow", bg: "#fef08a", text: "#111827" },
  { name: "Matcha Green", bg: "#dcfce7", text: "#064e3b" },
  { name: "Sky Blue", bg: "#e0f2fe", text: "#0c4a6e" },
  { name: "Soft Peach", bg: "#ffedd5", text: "#7c2d12" },
  { name: "Lavender", bg: "#f3e8ff", text: "#581c87" },
  { name: "Blush Rose", bg: "#ffe4e6", text: "#881337" },
  { name: "Dark Charcoal", bg: "#18181b", text: "#f4f4f5" },
  { name: "Midnight Navy", bg: "#0f172a", text: "#f8fafc" },
];

function isDarkColor(hex: string): boolean {
  if (!hex || hex[0] !== "#") return false;
  let c = hex.substring(1);
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}



export default function NewTabPage() {
  // Mode: only "watch" | "focus" (World time removed)
  const [mode, setMode] = useState<"watch" | "focus">("watch");

  // Settings (sound default OFF)
  const [settings, setSettings] = useState<TabSettings>({
    enabled: true,
    theme: "#fef08a",
    textColor: "#111827",
    is24Hour: false,
    showSeconds: false,
    ambientSound: "none", // Default OFF
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"appearance" | "preferences" | "audio">("appearance");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Time & Date state (deferred to client to prevent SSR prerender mismatch)
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [daysLeft, setDaysLeft] = useState<{ days: number; year: number }>({
    days: 66,
    year: 2026,
  });

  // Focus Timer state
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFocusSessionActive, setIsFocusSessionActive] = useState(false); // true once started

  // Hold to End state (3s total: 0-50% in 2s slowing, 50-100% in last 1s fast + shake)
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdAnimFrameRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);
  const isHoldingSpaceRef = useRef(false);

  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem("swipemark_newtab_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          ambientSound: parsed.ambientSound || "none",
        }));
      }
    } catch (e) {}
  }, []);

  const updateSettings = (partial: Partial<TabSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem("swipemark_newtab_settings", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Clock tick every second (deferred to client)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now);
      const year = now.getFullYear();
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      const diffMs = endOfYear.getTime() - now.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      setDaysLeft({ days, year });
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Focus countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsFocusSessionActive(false);
            stopAudio();
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  // AUTO-STOP AUDIO WHEN SWITCHING TO ANOTHER TAB OR LOSING FOCUS
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab moved/hidden -> stop audio immediately
        stopAudio();
      }
    };

    const handleBlur = () => {
      stopAudio();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Web Audio Synthesizer
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  const playAudio = (type: "white-noise" | "waves" | "ticking") => {
    if (document.hidden) return; // Do not play if tab is hidden
    initAudio();
    stopAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (type === "white-noise") {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 750;
      const gain = ctx.createGain();
      gain.gain.value = 0.035;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noiseSourceRef.current = noise;
    } else if (type === "waves") {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 350;
      const gain = ctx.createGain();
      gain.gain.value = 0.045;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noiseSourceRef.current = noise;
    } else if (type === "ticking") {
      tickIntervalRef.current = setInterval(() => {
        try {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(900, ctx.currentTime);
          g.gain.setValueAtTime(0.04, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
        } catch (e) {}
      }, 1000);
    }

    setIsPlayingAudio(true);
  };

  const stopAudio = () => {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch (e) {}
      noiseSourceRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const playChime = () => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  const toggleSound = () => {
    if (isPlayingAudio) {
      stopAudio();
    } else {
      const type = settings.ambientSound === "none" ? "white-noise" : settings.ambientSound;
      updateSettings({ ambientSound: type });
      playAudio(type);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Start Focus
  const handleStartFocus = () => {
    setIsFocusSessionActive(true);
    setIsTimerRunning(true);
    if (settings.ambientSound !== "none") {
      playAudio(settings.ambientSound);
    }
  };

  // Pause / Resume Focus
  const handleTogglePause = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      stopAudio();
    } else {
      setIsTimerRunning(true);
      if (settings.ambientSound !== "none") {
        playAudio(settings.ambientSound);
      }
    }
  };

  // End Focus Session
  const handleEndSession = useCallback(() => {
    setIsTimerRunning(false);
    setIsFocusSessionActive(false);
    setSecondsRemaining(focusMinutes * 60);
    stopAudio();
  }, [focusMinutes]);

  // Hold to End Handlers (3s total: 0-50% in 2s slowing down, 50-100% in last 1s fast + shake)
  const startHoldToEnd = useCallback(() => {
    if (!isFocusSessionActive) return;
    if (isHoldingRef.current) return;
    isHoldingRef.current = true;
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = performance.now();
    const TOTAL_MS = 3000; // 3 seconds total

    const loop = (now: number) => {
      if (!isHoldingRef.current) return;
      const elapsed = now - startTime;

      if (elapsed >= TOTAL_MS) {
        setHoldProgress(100);
        isHoldingRef.current = false;
        isHoldingSpaceRef.current = false;
        setIsHolding(false);
        handleEndSession();
        playChime();
        setTimeout(() => setHoldProgress(0), 180);
        return;
      }

      let p = 0;
      if (elapsed <= 2000) {
        // First 2 seconds: 0% to 50%, slowing down (ease-out deceleration)
        const u = elapsed / 2000; // 0 to 1
        p = 50 * (2 * u - u * u);
      } else {
        // Last 1 second: 50% to 100%, accelerating fast!
        const v = (elapsed - 2000) / 1000; // 0 to 1
        p = 50 + 50 * Math.pow(v, 2);
      }

      setHoldProgress(Math.min(100, p));
      holdAnimFrameRef.current = requestAnimationFrame(loop);
    };

    holdAnimFrameRef.current = requestAnimationFrame(loop);
  }, [isFocusSessionActive, handleEndSession]);

  const cancelHoldToEnd = useCallback(() => {
    isHoldingRef.current = false;
    isHoldingSpaceRef.current = false;
    if (holdAnimFrameRef.current) {
      cancelAnimationFrame(holdAnimFrameRef.current);
      holdAnimFrameRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  // Listen for Spacebar hold during active focus session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (mode === "focus" && isFocusSessionActive && !isHoldingSpaceRef.current) {
          isHoldingSpaceRef.current = true;
          startHoldToEnd();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (isHoldingSpaceRef.current) {
          isHoldingSpaceRef.current = false;
          cancelHoldToEnd();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelHoldToEnd();
    };
  }, [mode, isFocusSessionActive, isSettingsOpen, startHoldToEnd, cancelHoldToEnd]);

  // Format Time
  const formatTime = () => {
    if (mode === "focus") {
      const mins = Math.floor(secondsRemaining / 60);
      const secs = secondsRemaining % 60;
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    if (!currentTime) {
      return "--:--";
    }

    let hours = currentTime.getHours();
    const minutes = String(currentTime.getMinutes()).padStart(2, "0");
    const seconds = String(currentTime.getSeconds()).padStart(2, "0");

    if (!settings.is24Hour) {
      hours = hours % 12 || 12;
    }
    const hoursStr = String(hours).padStart(2, "0");

    if (settings.showSeconds && mode === "watch") {
      return `${hoursStr}:${minutes}:${seconds}`;
    }
    return `${hoursStr}:${minutes}`;
  };

  const formatDateBadge = () => {
    if (!currentTime) return "";
    return currentTime.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const isDark = isDarkColor(settings.theme);
  const { days, year } = daysLeft;

  // If user disabled new tab screen
  if (!settings.enabled) {
    return (
      <div className="fixed inset-0 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center p-6 select-none font-sans">
        <div className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 shadow-[6px_6px_0px_#18181b] rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⏱️</div>
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">
            Focus Timer is Paused
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            You disabled the focus new tab screen. You can re-enable it whenever you need it or open the bookmarks app.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => updateSettings({ enabled: true })}
              className="w-full py-3 px-5 rounded-full font-bold text-sm bg-black text-white hover:bg-zinc-800 transition"
            >
              Enable Focus Screen
            </button>
            <Link
              href="/app"
              className="w-full py-3 px-5 rounded-full font-bold text-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 transition"
            >
              Open Bookmarks App ↗
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: settings.theme,
        color: settings.textColor,
      }}
      className="fixed inset-0 w-screen h-screen flex flex-col justify-between p-6 sm:p-9 select-none transition-colors duration-300 font-sans overflow-hidden"
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between w-full z-10">
        {/* Left: Mode Switcher (Clock & Med Focus Aesthetic Icons) */}
        <nav
          className="inline-flex items-center p-1 rounded-full border shadow-sm gap-1 transition-all"
          style={{
            backgroundColor: isDark ? "#27272a" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
          }}
          aria-label="Mode selector"
        >
          <button
            onClick={() => setMode("watch")}
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full transition-all duration-200 ${
              mode === "watch"
                ? "shadow-sm scale-[1.02]"
                : "opacity-65 hover:opacity-100"
            }`}
            style={{
              backgroundColor: mode === "watch" ? settings.textColor : "transparent",
              color: mode === "watch" ? settings.theme : isDark ? "#fafafa" : "#111827",
            }}
            title="Clock Mode"
          >
            <Clock className="w-4 h-4 stroke-[2.2]" />
            <span className="hidden xs:inline">Clock</span>
          </button>
          <button
            onClick={() => setMode("focus")}
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full transition-all duration-200 ${
              mode === "focus"
                ? "shadow-sm scale-[1.02]"
                : "opacity-65 hover:opacity-100"
            }`}
            style={{
              backgroundColor: mode === "focus" ? settings.textColor : "transparent",
              color: mode === "focus" ? settings.theme : isDark ? "#fafafa" : "#111827",
            }}
            title="Meditation & Focus Mode"
          >
            <Flower2
              className={`w-4 h-4 stroke-[2.2] ${
                mode === "focus" ? "animate-pulse text-amber-500" : ""
              }`}
            />
            <span>Med Focus</span>
          </button>
        </nav>

        {/* Center / Bookmarks App Link */}
        <div className="hidden md:flex items-center">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold shadow-sm transition hover:scale-105"
            style={{
              backgroundColor: isDark ? "#27272a" : "#ffffff",
              color: isDark ? "#fafafa" : "#111827",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            }}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarks App</span>
          </Link>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2.5">
          {/* Sound Toggle (Default Off - stops when leaving tab) */}
          <button
            onClick={toggleSound}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border shadow-sm flex items-center justify-center transition hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isDark ? "#27272a" : "#ffffff",
              color: isDark ? "#fafafa" : "#111827",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            }}
            title={isPlayingAudio ? "Mute Ambient Audio" : "Play Ambient Audio (stops if tab switched)"}
          >
            {isPlayingAudio ? (
              <Volume2 className="w-4 h-4 text-sky-500" />
            ) : (
              <VolumeX className="w-4 h-4 opacity-60" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border shadow-sm flex items-center justify-center transition hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isDark ? "#27272a" : "#ffffff",
              color: isDark ? "#fafafa" : "#111827",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            }}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Settings Icon */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border shadow-sm flex items-center justify-center transition hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isDark ? "#27272a" : "#ffffff",
              color: isDark ? "#fafafa" : "#111827",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            }}
            title="Theme & Timer Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Giant Display */}
      <main className="flex-1 flex flex-col items-center justify-center text-center my-auto">
        <h1
          className="font-extrabold tracking-tighter leading-none select-none tabular-nums"
          style={{
            fontSize: "clamp(6.5rem, 22vw, 18rem)",
            letterSpacing: "-0.04em",
          }}
        >
          {formatTime()}
        </h1>

        {/* Watch Mode: show how many days left to end of this year */}
        {mode === "watch" && (
          <div className="mt-4 text-xs sm:text-sm font-bold opacity-75">
            {days} days left in {year}
          </div>
        )}

        {/* Focus Mode: state info */}
        {mode === "focus" && (
          <div className="mt-4 text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
            {isFocusSessionActive
              ? isTimerRunning
                ? "Focus Session in Progress"
                : "Session Paused"
              : "Focus Timer"}
          </div>
        )}
      </main>

      {/* Bottom Bar: Clean centered controls (Zen mode & Date badge removed) */}
      <footer className="flex items-center justify-center w-full z-10 pb-2">
        {mode === "focus" && (
          <div className="flex items-center justify-center">
            {/* If NOT started: show setup buttons (presets, -, +, Start Focus) */}
            {!isFocusSessionActive ? (
              <div className="flex items-center flex-wrap justify-center gap-2">
                {[5, 10, 25].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setFocusMinutes(mins);
                      setSecondsRemaining(mins * 60);
                      setIsTimerRunning(false);
                      stopAudio();
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm transition ${
                      focusMinutes === mins ? "scale-105" : "opacity-75 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor:
                        focusMinutes === mins ? settings.textColor : isDark ? "#27272a" : "#ffffff",
                      color: focusMinutes === mins ? settings.theme : isDark ? "#fafafa" : "#111827",
                      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                    }}
                  >
                    {mins} Min
                  </button>
                ))}

                <button
                  onClick={() => {
                    if (focusMinutes > 1) {
                      const next = focusMinutes - 1;
                      setFocusMinutes(next);
                      setSecondsRemaining(next * 60);
                    }
                  }}
                  className="w-9 h-9 rounded-full border shadow-sm flex items-center justify-center font-bold text-sm hover:scale-105 transition"
                  style={{
                    backgroundColor: isDark ? "#27272a" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                  }}
                  title="Subtract 1 min"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleStartFocus}
                  className="px-5 py-2 rounded-full text-xs sm:text-sm font-extrabold border shadow-sm bg-white text-sky-600 border-sky-200 hover:scale-105 active:scale-95 transition"
                >
                  Start Focus
                </button>

                <button
                  onClick={() => {
                    const next = focusMinutes + 1;
                    setFocusMinutes(next);
                    setSecondsRemaining(next * 60);
                  }}
                  className="w-9 h-9 rounded-full border shadow-sm flex items-center justify-center font-bold text-sm hover:scale-105 transition"
                  style={{
                    backgroundColor: isDark ? "#27272a" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                  }}
                  title="Add 1 min"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* After start: Play/Pause circle and 3s Hold to End with shake */
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-3">
                  {/* Play / Pause circle button */}
                  <button
                    onClick={handleTogglePause}
                    className="w-11 h-11 rounded-full border-2 border-black bg-white text-black shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition"
                    title={isTimerRunning ? "Pause Focus" : "Resume Focus"}
                  >
                    {isTimerRunning ? (
                      <Pause className="w-4 h-4 fill-black" />
                    ) : (
                      <Play className="w-4 h-4 fill-black ml-0.5" />
                    )}
                  </button>

                  {/* Hold to end pill button with animated red progress fill & shake */}
                  <button
                    onMouseDown={startHoldToEnd}
                    onMouseUp={cancelHoldToEnd}
                    onMouseLeave={cancelHoldToEnd}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      startHoldToEnd();
                    }}
                    onTouchEnd={cancelHoldToEnd}
                    onTouchCancel={cancelHoldToEnd}
                    className={`relative px-6 py-2.5 rounded-full border-2 border-black bg-white shadow-md font-extrabold text-xs text-black overflow-hidden select-none hover:translate-y-[-1px] transition active:scale-98 ${
                      isHolding
                        ? holdProgress >= 50
                          ? "shake-fast-anim border-red-600 shadow-[0_0_14px_rgba(239,68,68,0.5)]"
                          : "shake-subtle-anim"
                        : ""
                    }`}
                    style={{ minWidth: 145 }}
                    title="Hold button or hold Spacebar for 3s to end session"
                    aria-label="Hold to end"
                  >
                    <div
                      className="absolute inset-0 bg-red-500 pointer-events-none"
                      style={{
                        width: `${holdProgress}%`,
                        transition: isHolding ? "none" : "width 0.15s ease-out",
                      }}
                    />
                    <span
                      className={`relative z-10 transition-colors ${
                        holdProgress > 45 ? "text-white" : "text-black"
                      }`}
                    >
                      {isHolding ? "Holding to end..." : "Hold to end"}
                    </span>
                  </button>
                </div>

                <span className="text-[10px] font-bold opacity-60 tracking-wider uppercase select-none">
                  Hold button or Spacebar
                </span>
              </div>
            )}
          </div>
        )}
      </footer>

      {/* Embedded keyframe styles for hold button shake */}
      <style jsx>{`
        @keyframes subtleShake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-1.5px, 0.5px) rotate(-0.5deg); }
          40% { transform: translate(1.5px, -0.5px) rotate(0.5deg); }
          60% { transform: translate(-1px, 1px) rotate(0.5deg); }
          80% { transform: translate(1px, -1px) rotate(-0.5deg); }
        }
        @keyframes fastShake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          15% { transform: translate(-3px, 1px) rotate(-1.5deg); }
          30% { transform: translate(3px, -1px) rotate(1.5deg); }
          45% { transform: translate(-2.5px, -1.5px) rotate(-1deg); }
          60% { transform: translate(2.5px, 1.5px) rotate(1deg); }
          75% { transform: translate(-2px, 1px) rotate(-0.5deg); }
          90% { transform: translate(2px, -1px) rotate(0.5deg); }
        }
        .shake-subtle-anim {
          animation: subtleShake 0.18s infinite ease-in-out;
        }
        .shake-fast-anim {
          animation: fastShake 0.1s infinite ease-in-out;
        }
      `}</style>

      {/* Settings Modal (shadcn + Neobrutalism) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-xl rounded-3xl border-[3px] border-black shadow-[10px_10px_0px_#000] overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Neobrutalist Header */}
            <div className="bg-[#fde047] border-b-[3px] border-black p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black text-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  <Settings className="w-5 h-5 text-[#fde047]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg tracking-tight uppercase">
                      Timer & Display Config
                    </h3>
                    <span className="bg-white text-black border border-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-[1px_1px_0px_#000]">
                      TAB
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black/70">
                    Customize background themes, clock & tab behavior
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-9 h-9 rounded-xl border-2 border-black bg-[#fb7185] hover:bg-[#f43f5e] text-black shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center font-black transition-all"
                title="Close Settings"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Segmented Neobrutalist Tabs */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 border-b-2 border-black overflow-x-auto">
              <button
                onClick={() => setActiveSettingsTab("appearance")}
                className={`px-3.5 py-1.5 rounded-xl border-2 border-black text-xs font-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000] ${
                  activeSettingsTab === "appearance"
                    ? "bg-[#38bdf8] text-black translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Theme & Colors</span>
              </button>
              <button
                onClick={() => setActiveSettingsTab("preferences")}
                className={`px-3.5 py-1.5 rounded-xl border-2 border-black text-xs font-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000] ${
                  activeSettingsTab === "preferences"
                    ? "bg-[#fde047] text-black translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Preferences</span>
              </button>
              <button
                onClick={() => setActiveSettingsTab("audio")}
                className={`px-3.5 py-1.5 rounded-xl border-2 border-black text-xs font-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000] ${
                  activeSettingsTab === "audio"
                    ? "bg-[#c084fc] text-black translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio & Zen</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh] bg-zinc-50/50">
              {/* TAB 1: APPEARANCE */}
              {activeSettingsTab === "appearance" && (
                <div className="flex flex-col gap-4">
                  {/* Live Mini Preview Card */}
                  <div
                    className="p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-between transition-colors duration-200"
                    style={{
                      backgroundColor: settings.theme,
                      color: settings.textColor,
                    }}
                  >
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider opacity-75">
                        Live Display Preview
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                        {formatTime()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-black px-2.5 py-1 rounded-full border border-black shadow-[1px_1px_0px_#000]"
                        style={{
                          backgroundColor: isDark ? "#27272a" : "#ffffff",
                          color: isDark ? "#fafafa" : "#111827",
                        }}
                      >
                        {settings.theme.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Preset Swatches Grid */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 block mb-2">
                      Select Preset Theme
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {PRESET_COLORS.map((preset) => {
                        const isSelected =
                          settings.theme.toLowerCase() === preset.bg.toLowerCase();
                        return (
                          <button
                            key={preset.name}
                            onClick={() => {
                              updateSettings({
                                theme: preset.bg,
                                textColor: preset.text,
                              });
                            }}
                            className={`p-2.5 rounded-2xl border-2 border-black transition-all flex items-center gap-2 text-left relative ${
                              isSelected
                                ? "bg-white shadow-[3px_3px_0px_#000] scale-[1.03] ring-2 ring-black"
                                : "bg-white hover:bg-zinc-50 shadow-[2px_2px_0px_#000]"
                            }`}
                          >
                            <span
                              className="w-6 h-6 rounded-lg border border-black flex-shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: preset.bg }}
                            >
                              {isSelected && (
                                <Check
                                  className="w-3.5 h-3.5 stroke-[3]"
                                  style={{ color: preset.text }}
                                />
                              )}
                            </span>
                            <span className="text-xs font-extrabold text-zinc-900 truncate">
                              {preset.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Color Chooser */}
                  <div className="p-3.5 rounded-2xl border-2 border-black bg-white shadow-[2px_2px_0px_#000] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-zinc-900">
                        Pick Any Custom Color
                      </div>
                      <div className="text-[11px] font-semibold text-zinc-500">
                        Choose your exact hex code shade
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme}
                        onChange={(e) => {
                          const bg = e.target.value;
                          const text = isDarkColor(bg) ? "#f8fafc" : "#111827";
                          updateSettings({ theme: bg, textColor: text });
                        }}
                        className="w-9 h-9 rounded-xl border-2 border-black cursor-pointer p-0 bg-transparent shadow-[1px_1px_0px_#000]"
                      />
                      <span className="text-xs font-mono font-black bg-zinc-100 border border-black px-2 py-1 rounded-lg">
                        {settings.theme.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PREFERENCES */}
              {activeSettingsTab === "preferences" && (
                <div className="flex flex-col gap-3">
                  {/* Enable New Tab Screen */}
                  <div className="p-4 rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0px_#000] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-zinc-900 uppercase tracking-wide">
                        Enable Focus New Tab Screen
                      </div>
                      <div className="text-[11px] font-medium text-zinc-500 mt-0.5">
                        Show this minimal timer whenever you open a new tab
                      </div>
                    </div>
                    <button
                      onClick={() => updateSettings({ enabled: !settings.enabled })}
                      className={`w-12 h-7 rounded-full border-2 border-black p-0.5 transition-colors shadow-[1px_1px_0px_#000] relative flex items-center ${
                        settings.enabled ? "bg-[#34d399]" : "bg-zinc-200"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white border border-black shadow-sm transition-transform ${
                          settings.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* 24-Hour Format */}
                  <div className="p-4 rounded-2xl border-2 border-black bg-white shadow-[2px_2px_0px_#000] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-zinc-900 uppercase tracking-wide">
                        24-Hour Clock Format
                      </div>
                      <div className="text-[11px] font-medium text-zinc-500 mt-0.5">
                        Toggle between 12-hour (04:51) and 24-hour (16:51)
                      </div>
                    </div>
                    <button
                      onClick={() => updateSettings({ is24Hour: !settings.is24Hour })}
                      className={`w-12 h-7 rounded-full border-2 border-black p-0.5 transition-colors shadow-[1px_1px_0px_#000] relative flex items-center ${
                        settings.is24Hour ? "bg-[#34d399]" : "bg-zinc-200"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white border border-black shadow-sm transition-transform ${
                          settings.is24Hour ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Seconds */}
                  <div className="p-4 rounded-2xl border-2 border-black bg-white shadow-[2px_2px_0px_#000] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-zinc-900 uppercase tracking-wide">
                        Show Seconds in Watch Mode
                      </div>
                      <div className="text-[11px] font-medium text-zinc-500 mt-0.5">
                        Display seconds counter in real-time
                      </div>
                    </div>
                    <button
                      onClick={() => updateSettings({ showSeconds: !settings.showSeconds })}
                      className={`w-12 h-7 rounded-full border-2 border-black p-0.5 transition-colors shadow-[1px_1px_0px_#000] relative flex items-center ${
                        settings.showSeconds ? "bg-[#34d399]" : "bg-zinc-200"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white border border-black shadow-sm transition-transform ${
                          settings.showSeconds ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: AUDIO & ZEN */}
              {activeSettingsTab === "audio" && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 block mb-2">
                      Ambient Focus Audio (Default Off)
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { id: "none", name: "Off (Silent)", desc: "Quiet concentration" },
                        { id: "white-noise", name: "White Noise", desc: "Constant soothing static" },
                        { id: "waves", name: "Ocean Waves", desc: "Rhythmic tide synth" },
                        { id: "ticking", name: "Clock Ticking", desc: "Gentle rhythmic tick" },
                      ].map((snd) => {
                        const isCurrent = settings.ambientSound === snd.id;
                        return (
                          <button
                            key={snd.id}
                            onClick={() => {
                              const nextSound = snd.id as TabSettings["ambientSound"];
                              updateSettings({ ambientSound: nextSound });
                              if (isPlayingAudio && nextSound !== "none") {
                                playAudio(nextSound as "white-noise" | "waves" | "ticking");
                              } else if (nextSound === "none") {
                                stopAudio();
                              }
                            }}
                            className={`p-3 rounded-2xl border-2 border-black text-left transition-all ${
                              isCurrent
                                ? "bg-[#c084fc] shadow-[3px_3px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                                : "bg-white hover:bg-zinc-50 shadow-[2px_2px_0px_#000]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-zinc-900">
                                {snd.name}
                              </span>
                              {isCurrent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-[10px] font-semibold text-zinc-600 block mt-1">
                              {snd.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auto-Stop Notice Card */}
                  <div className="p-3.5 rounded-2xl border-2 border-black bg-[#fef9c3] shadow-[2px_2px_0px_#000] flex items-start gap-2.5">
                    <span className="text-base">⚡</span>
                    <div className="text-xs text-amber-950 font-bold leading-relaxed">
                      <strong>Smart Silence:</strong> Audio automatically stops the instant you move to another browser tab so it never interrupts you.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Neobrutalist Footer */}
            <div className="p-4 bg-zinc-100 border-t-[3px] border-black flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  updateSettings({
                    enabled: true,
                    theme: "#fef08a",
                    textColor: "#111827",
                    is24Hour: false,
                    showSeconds: false,
                    ambientSound: "none",
                  });
                  stopAudio();
                  handleEndSession();
                }}
                className="px-4 py-2 rounded-xl border-2 border-black bg-white hover:bg-rose-100 text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] font-black text-xs transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2 rounded-xl border-2 border-black bg-[#34d399] hover:bg-emerald-400 text-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-black text-xs transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save & Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
