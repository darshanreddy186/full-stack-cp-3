import React, { useEffect, useRef, useState } from "react";
import {
  Heart,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Sun,
  Gamepad,
  Music,
  Volume2,
  VolumeX,
  Sparkles,
  Timer,
  Target,
} from "lucide-react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function Relaxation(): JSX.Element {
  /* ----------------- Section 1: Breathing ----------------- */
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<
    "inhale" | "hold" | "exhale"
  >("inhale");
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingPattern, setBreathingPattern] = useState<
    "box" | "circle" | "478"
  >("circle");
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const BREATH_PATTERNS = {
    box: {
      name: "Box Breathing",
      subtitle: "4-4-4-4 • Perfect for focus",
      phases: [
        { name: "inhale", duration: 4000 },
        { name: "hold", duration: 4000 },
        { name: "exhale", duration: 4000 },
        { name: "hold", duration: 4000 },
      ],
      color: "blue",
    },
    circle: {
      name: "Natural Flow",
      subtitle: "4-4-6 • Gentle & calming",
      phases: [
        { name: "inhale", duration: 4000 },
        { name: "hold", duration: 4000 },
        { name: "exhale", duration: 6000 },
      ],
      color: "emerald",
    },
    "478": {
      name: "Sleep Helper",
      subtitle: "4-7-8 • For deep relaxation",
      phases: [
        { name: "inhale", duration: 4000 },
        { name: "hold", duration: 7000 },
        { name: "exhale", duration: 8000 },
      ],
      color: "purple",
    },
  } as const;

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.9;
      u.volume = 0.7;
      window.speechSynthesis.speak(u);
    } catch {
      // ignore if speech fails
    }
  };

  useEffect(() => {
    if (!breathingActive) return;
    let cancelled = false;
    let currentTimeout = 0 as any;
    let idx = 0;
    const pattern = BREATH_PATTERNS[breathingPattern];

    const cycle = () => {
      if (cancelled) return;
      const phase = pattern.phases[idx];
      setBreathingPhase(phase.name as any);

      // speak guidance
      if (phase.name === "inhale") speak("Breathe in slowly");
      if (phase.name === "hold") speak("Hold gently");
      if (phase.name === "exhale") speak("Release and let go");

      currentTimeout = window.setTimeout(() => {
        idx = (idx + 1) % pattern.phases.length;
        if (idx === 0) setBreathingCount((c) => c + 1);
        if (!cancelled) cycle();
      }, phase.duration);
    };

    setBreathingCount(0);
    cycle();

    return () => {
      cancelled = true;
      window.clearTimeout(currentTimeout);
      try {
        window.speechSynthesis.cancel();
      } catch {}
      setBreathingPhase("inhale");
    };
  }, [breathingActive, breathingPattern, voiceEnabled]);

  const getBreathingInstruction = () => {
    if (!breathingActive) return "Ready to begin";
    switch (breathingPhase) {
      case "inhale":
        return "Breathe in deeply...";
      case "hold":
        return "Hold gently...";
      case "exhale":
        return "Let it all go...";
    }
  };

  const getCurrentPattern = () => BREATH_PATTERNS[breathingPattern];

  /* ----------------- Section 2: Activities ----------------- */
  const symbols = ["🌸", "🌞", "🌙", "⭐", "🍀", "🌊", "🔥", "❄️"];
  type Card = { id: number; symbol: string; flipped: boolean; matched: boolean };
  const [cards, setCards] = useState<Card[]>([]);
  const [firstPick, setFirstPick] = useState<Card | null>(null);
  const [secondPick, setSecondPick] = useState<Card | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [gameScore, setGameScore] = useState(0);

  const initCards = () => {
    const doubled = [...symbols, ...symbols];
    const shuffled = doubled
      .map((s) => ({ s, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((x, i) => ({ id: i, symbol: x.s, flipped: false, matched: false }));
    setCards(shuffled);
    setFirstPick(null);
    setSecondPick(null);
    setDisabled(false);
    setGameScore(0);
  };

  useEffect(() => {
    initCards();
  }, []);

  const handleCardClick = (card: Card) => {
    if (disabled || card.flipped || card.matched) return;
    const flipped = { ...card, flipped: true };
    setCards((p) => p.map((c) => (c.id === card.id ? flipped : c)));

    if (!firstPick) {
      setFirstPick(flipped);
    } else if (!secondPick) {
      setSecondPick(flipped);
      setDisabled(true);
    }
  };

  useEffect(() => {
    if (!firstPick || !secondPick) return;
    if (firstPick.symbol === secondPick.symbol) {
      setCards((p) => p.map((c) => (c.symbol === firstPick.symbol ? { ...c, matched: true } : c)));
      setGameScore(s => s + 10);
      setTimeout(() => {
        setFirstPick(null);
        setSecondPick(null);
        setDisabled(false);
      }, 400);
    } else {
      const t = window.setTimeout(() => {
        setCards((p) => p.map((c) => (c.id === firstPick.id || c.id === secondPick.id ? { ...c, flipped: false } : c)));
        setFirstPick(null);
        setSecondPick(null);
        setDisabled(false);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [firstPick, secondPick]);

  const allMatched = cards.length > 0 && cards.every((c) => c.matched);

  // Focus tapping
  const [focusNext, setFocusNext] = useState(1);
  const [focusResult, setFocusResult] = useState<string | null>(null);
  const [focusScore, setFocusScore] = useState(0);
  const [focusStreak, setFocusStreak] = useState(0);
  
  const resetFocus = () => {
    setFocusNext(1);
    setFocusResult(null);
    setFocusScore(0);
    setFocusStreak(0);
  };
  
  const handleFocusTap = (value: number) => {
    if (value === focusNext) {
      if (value === 9) {
        setFocusResult("Perfect! Sequence completed! 🎉");
        setFocusScore(s => s + 50 + (focusStreak * 10));
        setFocusStreak(s => s + 1);
        setTimeout(() => {
          setFocusNext(1);
          setFocusResult(null);
        }, 1400);
      } else {
        setFocusNext((n) => n + 1);
        setFocusScore(s => s + 5);
      }
    } else {
      setFocusResult("Focus and try again 🎯");
      setTimeout(() => setFocusResult(null), 1200);
      setFocusNext(1);
    }
  };

  // Stretch prompts
  const stretchPrompts = [
    {
      title: "Neck & Shoulder Release",
      duration: 633,
      icon: "🦢",
      description: "Gentle movements to release tension",
      videoUrl: "https://youtu.be/s-7lyvblFNI?si=xz39Vo54mfKzszCQ",
      youtubeId: "s-7lyvblFNI", // <-- Add YouTube ID
    },
    {
      title: "Seated Spinal Twist",
      duration: 110,
      icon: "🌀",
      description: "Improve spine mobility and posture",
      videoUrl: "https://youtu.be/ciGK6HyYqV4?si=D2Uq5pasJW8NW0WC",
      youtubeId: "ciGK6HyYqV4",
    },
    {
      title: "Standing Hamstring Stretch",
      duration: 62,
      icon: "🦵",
      description: "Lengthen and strengthen your legs",
      videoUrl: "https://youtu.be/tZLqLxmSjjU?si=FqzQ4ysROjfTdJVY",
      youtubeId: "tZLqLxmSjjU",
    },
  ];
  
  const [selectedStretch, setSelectedStretch] = useState<number | null>(null);
  const [stretchActive, setStretchActive] = useState(false);
  const [stretchTimer, setStretchTimer] = useState(0);
  const stretchVideoRef = useRef<HTMLVideoElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  useEffect(() => {
    if (!stretchActive || selectedStretch === null) return;

    // Load YouTube IFrame API if not loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      return;
    }

    youtubePlayerRef.current = new window.YT.Player(`stretch-youtube-player`, {
      events: {
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PAUSED) {
            setIsTimerPaused(true);
          } else if (event.data === window.YT.PlayerState.PLAYING) {
            setIsTimerPaused(false);
          }
        }
      }
    });
  }, [stretchActive, selectedStretch]);

  useEffect(() => {
    if (!stretchActive || stretchTimer <= 0) return;
    if (isTimerPaused) return;

    timerIntervalRef.current = setInterval(() => {
      setStretchTimer((s) => {
        if (s <= 1) {
          clearInterval(timerIntervalRef.current);
          setStretchActive(false);
          setSelectedStretch(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [stretchActive, stretchTimer, isTimerPaused]);

  const startStretch = (i: number) => {
    setSelectedStretch(i);
    setStretchTimer(stretchPrompts[i].duration);
    setStretchActive(true);
    setTimeout(() => {
      try {
        stretchVideoRef.current?.play().catch(() => {});
      } catch {}
    }, 120);
  };

  const stopStretch = () => {
    setStretchActive(false);
    setSelectedStretch(null);
    setStretchTimer(0);
    try {
      if (stretchVideoRef.current) {
        stretchVideoRef.current.pause();
        stretchVideoRef.current.currentTime = 0;
      }
    } catch {}
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /* ----------------- Section 3: Guided ----------------- */
  const videoOptions = [
    {
      title: "5 Min Guided Breathing",
      videoId: "inpok4MKVLM",
      description: "Short breathing practice for instant calm",
      duration: "5 min",
      category: "Breathing"
    },
    {
      title: "10 Min Body Scan Meditation",
      videoId: "nnVCadMo3qI",
      description: "Progressive relaxation to release tension",
      duration: "10 min",
      category: "Body Scan"
    },
    {
      title: "Sleep Story & Gentle Sounds",
      videoId: "2OEL4P1Rz04",
      description: "Soothing bedtime audio for better sleep",
      duration: "20 min",
      category: "Sleep"
    },
  ];
  const [selectedVideo, setSelectedVideo] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-200/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Enhanced Header */}
        <header className="bg-gradient-to-br text-center py-8"style={{backgroundColor:"#d3ebebff",borderRadius:"20px",boxShadow:"0 4px 12px rgba(0, 0, 0, 0.1)"}}>
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
              Relaxation Hub
            </h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Your personal sanctuary for mindfulness, focus, and deep relaxation
          </p>
        </header>

        {/* Enhanced Section 1: Breathing */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-blue-50/50 rounded-3xl backdrop-blur-sm"></div>
          <div className="relative bg-white/60 rounded-3xl shadow-2xl border border-white/50 p-8 md:p-12 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Breathing Circle */}
              <div className="flex-shrink-0 text-center">
                <div className="relative">
                  <div
                    className={`mx-auto w-56 h-56 rounded-full border-4 flex items-center justify-center transition-all duration-700 ease-in-out shadow-2xl
                      ${breathingActive
                        ? breathingPhase === "inhale"
                          ? `scale-110 border-${getCurrentPattern().color}-400 bg-gradient-to-br from-${getCurrentPattern().color}-50 to-${getCurrentPattern().color}-100 shadow-${getCurrentPattern().color}-200/50`
                          : breathingPhase === "hold"
                          ? `scale-105 border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100 shadow-amber-200/50`
                          : `scale-95 border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-100 shadow-emerald-200/50`
                        : "border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-slate-200/30"
                      }`}
                  >
                    <Heart className={`w-20 h-20 transition-colors duration-500 ${
                      breathingActive ? `text-${getCurrentPattern().color}-600` : "text-slate-400"
                    }`} />
                  </div>
                  
                  {/* Breathing rings */}
                  {breathingActive && (
                    <div className="absolute inset-0 rounded-full border-2 border-blue-300/30 animate-ping"></div>
                  )}
                </div>
                
                <div className="mt-6 space-y-2">
                  <p className="text-xl font-semibold text-slate-800">{getBreathingInstruction()}</p>
                  <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      Cycles: {breathingCount}
                    </span>
                    {breathingActive && (
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        {breathingPhase}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(BREATH_PATTERNS).map(([key, pattern]) => (
                    <button
                      key={key}
                      onClick={() => setBreathingPattern(key as any)}
                      className={`p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                        breathingPattern === key
                          ? `border-${pattern.color}-400 bg-${pattern.color}-50 shadow-lg`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                      }`}
                    >
                      <div className="font-semibold text-slate-800">{pattern.name}</div>
                      <div className="text-sm text-slate-600 mt-1">{pattern.subtitle}</div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 p-6 bg-slate-50/50 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setBreathingActive((v) => !v)}
                    className={`px-8 py-4 rounded-xl flex items-center gap-3 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                      breathingActive
                        ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                        : `bg-gradient-to-r from-${getCurrentPattern().color}-500 to-${getCurrentPattern().color}-600 hover:from-${getCurrentPattern().color}-600 hover:to-${getCurrentPattern().color}-700`
                    }`}
                  >
                    {breathingActive ? (
                      <>
                        <Pause className="w-5 h-5" />
                        Stop Session
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Begin Breathing
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setVoiceEnabled(v => !v)}
                    className={`p-4 rounded-xl transition-all duration-200 ${
                      voiceEnabled
                        ? "bg-emerald-500 text-white shadow-lg hover:bg-emerald-600"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                    title={voiceEnabled ? "Voice guidance on" : "Voice guidance off"}
                  >
                    {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => {
                      setBreathingActive(false);
                      setBreathingCount(0);
                      setBreathingPhase("inhale");
                      try { window.speechSynthesis.cancel(); } catch {}
                    }}
                    className="p-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all duration-200"
                    title="Reset session"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-slate-700 leading-relaxed">
                    <strong>How it works:</strong> Follow the expanding circle and gentle voice guidance. 
                    Choose your preferred breathing pattern and let the rhythm guide you to a calmer state.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Section 2: Quick Activities */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-emerald-50/50 rounded-3xl backdrop-blur-sm"></div>
          <div className="relative bg-white/60 rounded-3xl shadow-2xl border border-white/50 p-8 md:p-12 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Quick Focus Games</h2>
                <p className="text-slate-600">Gentle activities to center your mind</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Memory Match */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl p-6 shadow-xl border border-emerald-200">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-emerald-900">Memory Garden</h3>
                    <p className="text-emerald-700 text-sm">Find matching pairs to bloom the garden</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-800">{gameScore}</div>
                    <div className="text-xs text-emerald-600">points</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  {cards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      className={`aspect-square flex items-center justify-center text-2xl font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md ${
                        card.flipped || card.matched
                          ? "bg-white text-slate-800 border-2 border-emerald-300 shadow-lg"
                          : "bg-gradient-to-br from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-transparent shadow-inner"
                      } ${card.matched ? "animate-pulse" : ""}`}
                    >
                      {card.flipped || card.matched ? card.symbol : ""}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  {allMatched ? (
                    <>
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <Sparkles className="w-4 h-4" />
                        Garden complete! Beautiful work! 🌻
                      </div>
                      <button 
                        onClick={initCards} 
                        className="ml-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg"
                      >
                        New Garden
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={initCards} 
                      className="ml-auto px-4 py-2 bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg font-semibold transition-all duration-200"
                    >
                      Shuffle
                    </button>
                  )}
                </div>
              </div>

              {/* Focus Tapping */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl p-6 shadow-xl border border-purple-200">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                      <Gamepad className="w-5 h-5" />
                      Focus Flow
                    </h3>
                    <p className="text-purple-700 text-sm">Tap numbers 1-9 in sequence</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-800">{focusScore}</div>
                    <div className="text-xs text-purple-600">streak: {focusStreak}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => handleFocusTap(n)}
                      className={`aspect-square rounded-xl text-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md ${
                        n === focusNext 
                          ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg animate-pulse" 
                          : n < focusNext
                          ? "bg-emerald-500 text-white shadow-inner"
                          : "bg-white text-slate-700 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {focusResult && (
                  <div className="text-center py-2 mb-2">
                    <p className="text-purple-700 font-semibold">{focusResult}</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="text-sm text-purple-700">
                    Next: <span className="font-bold text-lg">{focusNext}</span>
                  </div>
                  <button 
                    onClick={resetFocus} 
                    className="ml-auto px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg font-semibold transition-all duration-200"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Stretch Section */}
            <div className="space-y-6">
              {stretchActive && selectedStretch !== null && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 shadow-xl border border-orange-200">
                  <div className="max-w-4xl mx-auto">
                    <div className="relative w-full rounded-xl overflow-hidden shadow-2xl" style={{ paddingTop: "56.25%" }}>
                      <iframe
                        id="stretch-youtube-player"
                        title={stretchPrompts[selectedStretch].title}
                        src={`https://www.youtube.com/embed/${stretchPrompts[selectedStretch].youtubeId}?enablejsapi=1&rel=0&modestbranding=1&autoplay=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-4 p-4 bg-white/80 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{stretchPrompts[selectedStretch].icon}</div>
                        <div>
                          <div className="font-bold text-orange-900">{stretchPrompts[selectedStretch].title}</div>
                          <div className="text-orange-700 text-sm">{stretchPrompts[selectedStretch].description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-800">{formatTime(stretchTimer)}</div>
                          <div className="text-xs text-orange-600">remaining</div>
                        </div>
                        <button 
                          onClick={stopStretch} 
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg"
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-amber-50  rounded-2xl p-6 shadow-xl border border-amber-200"  style={{backgroundColor:"#d3ebebff !important"}} >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                    <Sun className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-900">Mindful Movement</h3>
                    <p className="text-amber-700 text-sm">Gentle stretches to release tension</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {stretchPrompts.map((s, i) => (
                    <div key={s.title} className="bg-white/80 rounded-xl p-5 shadow-md border border-amber-200 hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="text-3xl">{s.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-amber-900">{s.title}</h4>
                          <p className="text-sm text-amber-700 mt-1">{s.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <Timer className="w-4 h-4" />
                          {s.duration}s
                        </div>
                      </div>

                      <button
                        onClick={() => startStretch(i)}
                        disabled={stretchActive}
                        className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                      >
                        {stretchActive ? "In Progress..." : "Start Stretch"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Section 3: Guided Relaxation */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-indigo-50/50 rounded-3xl backdrop-blur-sm"></div>
          <div className="relative bg-white/60 rounded-3xl shadow-2xl border border-white/50 p-8 md:p-12 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <Music className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Guided Sessions</h2>
                <p className="text-slate-600">Professional-led relaxation and mindfulness</p>
              </div>
            </div>

            {/* Video Player */}
            <div className="max-w-5xl mx-auto mb-8">
              <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50" style={{ paddingTop: "56.25%" }}>
                <iframe
                  title={videoOptions[selectedVideo].title}
                  src={`https://www.youtube.com/embed/${videoOptions[selectedVideo].videoId}?rel=0&modestbranding=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
            </div>

            {/* Video Selection */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                <div className="grid gap-4 mb-6">
                  {videoOptions.map((video, i) => (
                    <button
                      key={video.videoId}
                      onClick={() => setSelectedVideo(i)}
                      className={`p-4 rounded-xl text-left transition-all duration-200 border-2 transform hover:scale-105 ${
                        selectedVideo === i
                          ? "border-indigo-400 bg-white shadow-lg"
                          : "border-slate-200 bg-white/60 hover:border-indigo-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-800">{video.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                            {video.category}
                          </span>
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                            {video.duration}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm">{video.description}</p>
                    </button>
                  ))}
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    Choose a session that resonates with your current mood
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-sm rounded-full shadow-lg border border-white/50">
            <Heart className="w-5 h-5 text-rose-500" />
            <span className="text-slate-700 font-medium">Take care of yourself, you deserve peace</span>
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Relaxation;