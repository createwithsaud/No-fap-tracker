/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, RotateCcw, CheckCircle2, Flame, Trophy, Quote, Play, User, TrendingUp, Calendar as CalendarIcon, AlertCircle, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- CONSTANTS & CONFIGURATION ---

const QUOTES = [
  "Discipline equals freedom.",
  "Suffer the pain of discipline or suffer the pain of regret.",
  "You are entirely up to you.",
  "Don't trade what you want most for what you want now.",
  "Every action you take is a vote for the type of person you wish to become.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "The only bad workout is the one that didn't happen.",
  "Your future is created by what you do today, not tomorrow.",
  "It does not matter how slowly you go as long as you do not stop.",
  "Fall seven times, stand up eight."
];

const URGE_MESSAGES = [
  "Discipline > impulse",
  "You're stronger than this",
  "This is temporary",
  "This urge will pass. Stay strong.",
  "Breathe in. Breathe out. You got this.",
  "Don't trade what you want most for what you want now."
];
const URGE_DURATION = 5 * 60 * 1000; // 5 minutes

// Level configuration based on streak days
const LEVELS = [
  { level: 1, min: 0, max: 2, name: "Beginner", color: "text-zinc-400", bg: "bg-zinc-400", border: "border-zinc-400/20", glow: "" },
  { level: 2, min: 3, max: 6, name: "Getting Control", color: "text-blue-400", bg: "bg-blue-400", border: "border-blue-400/20", glow: "shadow-[0_0_15px_rgba(96,165,250,0.15)]" },
  { level: 3, min: 7, max: 13, name: "Disciplined", color: "text-emerald-400", bg: "bg-emerald-400", border: "border-emerald-400/20", glow: "shadow-[0_0_20px_rgba(52,211,153,0.2)]" },
  { level: 4, min: 14, max: 29, name: "Strong Mind", color: "text-purple-400", bg: "bg-purple-400", border: "border-purple-400/20", glow: "shadow-[0_0_25px_rgba(167,139,250,0.3)]" },
  { level: 5, min: 30, max: 59, name: "Elite", color: "text-orange-400", bg: "bg-orange-400", border: "border-orange-400/20", glow: "shadow-[0_0_30px_rgba(251,146,60,0.4)]" },
  { level: 6, min: 60, max: Infinity, name: "Unstoppable", color: "text-red-500", bg: "bg-red-500", border: "border-red-500/20", glow: "shadow-[0_0_40px_rgba(239,68,68,0.5)] text-glow-red" },
];

const MOCK_LEADERBOARD = [
  { username: "IronWill", bestStreak: 45 },
  { username: "StoicPath", bestStreak: 32 },
  { username: "DisciplineDaily", bestStreak: 21 },
  { username: "MindOverMatter", bestStreak: 14 },
];

// --- MODULAR LOGIC FUNCTIONS ---

const fetchLeaderboard = () => {
  const stored = localStorage.getItem('nofap_leaderboard');
  if (stored) return JSON.parse(stored);
  localStorage.setItem('nofap_leaderboard', JSON.stringify(MOCK_LEADERBOARD));
  return MOCK_LEADERBOARD;
};

const updateLeaderboard = (username: string, bestStreak: number) => {
  let board = fetchLeaderboard();
  const existingIdx = board.findIndex((u: any) => u.username === username);
  
  if (existingIdx >= 0) {
    if (bestStreak > board[existingIdx].bestStreak) {
      board[existingIdx].bestStreak = bestStreak;
    }
  } else {
    board.push({ username, bestStreak });
  }
  
  board.sort((a: any, b: any) => b.bestStreak - a.bestStreak);
  board = board.slice(0, 5);
  localStorage.setItem('nofap_leaderboard', JSON.stringify(board));
  return board;
};

const getCurrentLevel = (days: number) => {
  return LEVELS.find(l => days >= l.min && days <= l.max) || LEVELS[LEVELS.length - 1];
};

const getMotivationalMessage = (days: number) => {
  if (days <= 3) return "You just started. Stay strong.";
  if (days <= 10) return "Momentum is building 🔥";
  if (days <= 30) return "You're building real discipline";
  return "You're ahead of most people.";
};

/**
 * Helper to get local date string in YYYY-MM-DD format
 */
const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- MAIN COMPONENT ---

export default function App() {
  // Timer State
  const [startTime, setStartTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  
  // User & Leaderboard State
  const [username, setUsername] = useState<string | null>(null);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  
  // Check-In State
  const [checkIns, setCheckIns] = useState<string[]>([]);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Urge Tracker State
  const [urgeEndTime, setUrgeEndTime] = useState<number | null>(null);
  const [urgeStatus, setUrgeStatus] = useState<'idle' | 'active' | 'defeated'>('idle');
  const [urgeMessage, setUrgeMessage] = useState("");
  const [urgeHistory, setUrgeHistory] = useState<Record<string, number>>({});
  
  // UI State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [quote, setQuote] = useState(QUOTES[0]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialization Effect
  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    setQuote(QUOTES[dayOfYear % QUOTES.length]);

    // Load User Data
    const storedUsername = localStorage.getItem('nofap_username');
    const storedBest = localStorage.getItem('nofap_best_streak');
    
    if (storedUsername) {
      setUsername(storedUsername);
      if (storedBest) setBestStreak(parseInt(storedBest, 10));
    } else {
      setShowUsernamePrompt(true);
    }

    // Load Timer
    const storedStart = localStorage.getItem('nofap_start_time');
    if (storedStart) {
      setStartTime(parseInt(storedStart, 10));
    }
    
    // Load Check-Ins
    const storedCheckIns = localStorage.getItem('nofap_checkins');
    if (storedCheckIns) {
      const parsedCheckIns = JSON.parse(storedCheckIns);
      setCheckIns(parsedCheckIns);
      
      // Check if today is already checked in
      const todayStr = getLocalDateString(new Date());
      if (parsedCheckIns.includes(todayStr)) {
        setHasCheckedInToday(true);
      }
    }
    
    // Load Urge History
    const storedUrgeHistory = localStorage.getItem('nofap_urge_history');
    if (storedUrgeHistory) {
      setUrgeHistory(JSON.parse(storedUrgeHistory));
    }

    // Load Urge Timer
    const storedUrgeEnd = localStorage.getItem('nofap_urge_end_time');
    if (storedUrgeEnd) {
      const end = parseInt(storedUrgeEnd, 10);
      if (Date.now() < end) {
        setUrgeEndTime(end);
        setUrgeStatus('active');
        setUrgeMessage(URGE_MESSAGES[Math.floor(Math.random() * URGE_MESSAGES.length)]);
      } else {
        localStorage.removeItem('nofap_urge_end_time');
        setUrgeStatus('defeated');
      }
    }
    
    // Load Leaderboard
    setLeaderboard(fetchLeaderboard());
    setIsLoading(false);

    // Timer Interval
    const interval = setInterval(() => {
      setNow(Date.now());
      
      // Check for midnight rollover to reset check-in button
      const currentTodayStr = getLocalDateString(new Date());
      setHasCheckedInToday((prev) => {
        // We need to read the latest checkIns from state, but since this is an interval, 
        // we rely on the fact that if it rolls over to a new day, the new day string won't be in the array.
        const stored = localStorage.getItem('nofap_checkins');
        const currentCheckIns = stored ? JSON.parse(stored) : [];
        return currentCheckIns.includes(currentTodayStr);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Save indicator effect
  useEffect(() => {
    if (startTime && !isLoading) {
      setIsSaved(true);
      const timeout = setTimeout(() => setIsSaved(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [startTime, isLoading]);

  // Urge Timer Effect
  useEffect(() => {
    if (urgeStatus === 'active' && urgeEndTime && now >= urgeEndTime) {
      stopUrgeTimer();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [now, urgeEndTime, urgeStatus]);

  // Streak Calculation
  const elapsed = startTime ? Math.max(0, now - startTime) : 0;
  const seconds = Math.floor((elapsed / 1000) % 60);
  const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
  const hours = Math.floor((elapsed / (1000 * 60 * 60)) % 24);
  const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));

  // Auto-update best streak and leaderboard
  useEffect(() => {
    if (username && days > bestStreak) {
      setBestStreak(days);
      localStorage.setItem('nofap_best_streak', days.toString());
      const newBoard = updateLeaderboard(username, days);
      setLeaderboard(newBoard);
    }
  }, [days, username, bestStreak]);

  // Handlers
  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUsername.trim().length < 3) return;
    
    const name = tempUsername.trim();
    setUsername(name);
    localStorage.setItem('nofap_username', name);
    setShowUsernamePrompt(false);
    
    const newBoard = updateLeaderboard(name, bestStreak);
    setLeaderboard(newBoard);
  };

  const handleStart = () => {
    const current = Date.now();
    setStartTime(current);
    localStorage.setItem('nofap_start_time', current.toString());
    
    // Note: We no longer auto check-in here. 
    // This ensures that if a user resets and starts a new streak, 
    // the button correctly shows "✅ I Stayed Clean Today" instead of auto-completing.
  };

  const handleSetCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate) {
      setDateError("Please select a valid date and time.");
      return;
    }
    
    const selectedTimestamp = new Date(customDate).getTime();
    const currentTimestamp = Date.now();
    
    if (isNaN(selectedTimestamp)) {
      setDateError("Invalid date format.");
      return;
    }
    
    if (selectedTimestamp > currentTimestamp) {
      setDateError("Cannot select a future date or time.");
      return;
    }
    
    setStartTime(selectedTimestamp);
    localStorage.setItem('nofap_start_time', selectedTimestamp.toString());
    setShowDatePicker(false);
    setCustomDate("");
    setDateError("");
  };

  /**
   * Updates the check-in UI and storage after a streak reset.
   * Why sync this? If a user relapses and resets their streak, their "clean" status 
   * for today is no longer valid. We must remove today's check-in so they can 
   * start fresh, while preserving their historical calendar data.
   */
  const updateCheckinUI = () => {
    const todayStr = getLocalDateString(new Date());
    
    // Remove ONLY today's date from the array. Past days remain green on the calendar.
    const updatedCheckIns = checkIns.filter(date => date !== todayStr);
    
    // Update React state to immediately refresh the UI (re-enables the check-in button)
    setCheckIns(updatedCheckIns);
    setHasCheckedInToday(false);
    
    // Persist the corrected array to localStorage
    if (updatedCheckIns.length > 0) {
      localStorage.setItem('nofap_checkins', JSON.stringify(updatedCheckIns));
    } else {
      localStorage.removeItem('nofap_checkins'); // Clean up if empty
    }
  };

  const handleReset = () => {
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    
    // 1. Clear streak start time
    setStartTime(null);
    localStorage.removeItem('nofap_start_time');
    
    // 2. Sync check-in data
    updateCheckinUI();
    
    // 3. Reset Urge Timer state
    resetUrgeState();
    
    setShowResetConfirm(false);
  };

  /**
   * Handles the daily check-in logic
   */
  const handleCheckIn = () => {
    const todayStr = getLocalDateString(new Date());
    if (!checkIns.includes(todayStr)) {
      const newCheckIns = [...checkIns, todayStr];
      setCheckIns(newCheckIns);
      setHasCheckedInToday(true);
      localStorage.setItem('nofap_checkins', JSON.stringify(newCheckIns));
      
      if (navigator.vibrate) navigator.vibrate(50);
      
      // Confetti animation for daily check-in
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399', '#ffffff'],
        disableForReducedMotion: true
      });
    }
  };

  /**
   * Starts the Urge Timer.
   * Sets the end time and saves it to localStorage for reload safety.
   */
  const startUrgeTimer = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    
    const end = Date.now() + URGE_DURATION;
    setUrgeEndTime(end);
    setUrgeStatus('active');
    setUrgeMessage(URGE_MESSAGES[Math.floor(Math.random() * URGE_MESSAGES.length)]);
    localStorage.setItem('nofap_urge_end_time', end.toString());
    
    // Increment daily urge count
    const todayStr = getLocalDateString(new Date());
    const newHistory = { ...urgeHistory };
    newHistory[todayStr] = (newHistory[todayStr] || 0) + 1;
    setUrgeHistory(newHistory);
    localStorage.setItem('nofap_urge_history', JSON.stringify(newHistory));
  };

  /**
   * Stops the Urge Timer successfully when time runs out.
   */
  const stopUrgeTimer = () => {
    setUrgeStatus('defeated');
    setUrgeEndTime(null);
    localStorage.removeItem('nofap_urge_end_time');
  };

  /**
   * Fully resets the Urge Tracker state and storage.
   * Called during a full streak reset to ensure no timers continue running.
   * Note on Interval Handling: In this React architecture, the timer is driven by 
   * a single global 'now' state tick. Clearing 'urgeEndTime' effectively stops 
   * the timer without needing to call clearInterval on a specific ID.
   */
  const resetUrgeState = () => {
    // 1. Clear React state to hide UI immediately
    setUrgeEndTime(null);
    setUrgeStatus('idle');
    setUrgeMessage("");
    
    // 2. Clear localStorage so it doesn't resume on reload
    localStorage.removeItem('nofap_urge_end_time');
    
    // 3. Reset today's urge count
    const todayStr = getLocalDateString(new Date());
    const newHistory = { ...urgeHistory };
    if (newHistory[todayStr]) {
      delete newHistory[todayStr];
      setUrgeHistory(newHistory);
      if (Object.keys(newHistory).length > 0) {
        localStorage.setItem('nofap_urge_history', JSON.stringify(newHistory));
      } else {
        localStorage.removeItem('nofap_urge_history');
      }
    }
  };

  if (isLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading...</div>;

  // Level Logic
  const currentLevel = getCurrentLevel(days);
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
  
  let levelProgress = 100;
  if (nextLevel && startTime) {
    const daysInLevel = days - currentLevel.min;
    const totalDaysInLevel = nextLevel.min - currentLevel.min;
    levelProgress = (daysInLevel / totalDaysInLevel) * 100;
  } else if (!startTime) {
    levelProgress = 0;
  }

  const pad = (num: number) => num.toString().padStart(2, '0');

  // Check if missed yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const isAfterStart = startTime ? yesterday.getTime() >= new Date(new Date(startTime).setHours(0,0,0,0)).getTime() : false;
  const missedYesterday = startTime && isAfterStart && !checkIns.includes(yesterdayStr);

  // Render Calendar Grid
  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const todayMidnight = new Date(today).setHours(0,0,0,0);

    const calendarCells = [];
    
    // Empty cells for days before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
      calendarCells.push(<div key={`empty-${i}`} className="aspect-square w-full max-w-[40px]" />);
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dateStr = getLocalDateString(cellDate);
      const isCheckedIn = checkIns.includes(dateStr);
      const isToday = dateStr === todayStr;
      
      const cellTime = cellDate.getTime();
      const isFuture = cellTime > todayMidnight;
      const isAfterStreakStart = startTime ? cellTime >= new Date(new Date(startTime).setHours(0,0,0,0)).getTime() : false;
      
      // It's a missed day if it's in the past, after the streak started, not checked in, and NOT today.
      const isMissed = !isFuture && !isToday && isAfterStreakStart && !isCheckedIn;

      let bgClass = "";
      let tooltip = "";
      const displayDate = cellDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

      if (isFuture) {
        bgClass = "bg-white/5 text-zinc-600";
        tooltip = `Future date`;
      } else if (isCheckedIn) {
        bgClass = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
        tooltip = `Completed on ${displayDate}`;
      } else if (isMissed) {
        bgClass = "bg-red-500/20 text-red-400 border border-red-500/30";
        tooltip = `Missed on ${displayDate}`;
      } else if (!isAfterStreakStart) {
        bgClass = "bg-black/20 text-zinc-700";
        tooltip = `Before streak started`;
      } else if (isToday && !isCheckedIn) {
        bgClass = "bg-white/10 text-zinc-300 border border-white/20 animate-pulse";
        tooltip = `Today - pending check-in`;
      }

      calendarCells.push(
        <div 
          key={d} 
          className={`aspect-square w-full max-w-[40px] rounded-md sm:rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-300 hover:scale-110 cursor-default ${bgClass} ${isToday ? 'ring-2 ring-zinc-400 ring-offset-2 ring-offset-zinc-950' : ''}`}
          title={tooltip}
        >
          {d}
        </div>
      );
    }

    const handlePrevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    return (
      <div className="w-full glass-panel rounded-3xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-zinc-400" />
            <h3 className="font-display font-bold text-zinc-200">Streak Calendar</h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-zinc-200">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm text-zinc-300 font-medium min-w-[110px] text-center">
              {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button 
              onClick={handleNextMonth} 
              disabled={isCurrentMonth}
              className={`p-1 rounded-md transition-colors ${isCurrentMonth ? 'text-zinc-800 cursor-not-allowed' : 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Missed Yesterday Warning */}
        <AnimatePresence>
          {missedYesterday && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>You missed your check-in yesterday. Stay vigilant!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check-In Button */}
        {startTime && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCheckIn}
            disabled={hasCheckedInToday}
            className={`w-full py-4 rounded-xl font-bold tracking-wide transition-all duration-300 mb-6 flex items-center justify-center gap-2 ${
              hasCheckedInToday 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-not-allowed' 
                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
            }`}
          >
            {hasCheckedInToday ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                ✅ Completed Today
              </>
            ) : (
              "✅ I Stayed Clean Today"
            )}
          </motion.button>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 justify-items-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs text-zinc-500 font-medium mb-2 w-full">{day}</div>
          ))}
          {calendarCells}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-50 flex flex-col items-center justify-start p-6 font-sans relative overflow-x-hidden selection:bg-zinc-800 pb-24">
      
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none ambient-gradient-1" />
      <div className="fixed inset-0 pointer-events-none ambient-gradient-2" />
      <div className="fixed inset-0 pointer-events-none ambient-gradient-3" />
      <div className={`fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${currentLevel.bg.replace('bg-', 'bg-').replace('500', '900/20').replace('400', '900/20')}`} />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md text-center z-10 mt-4 mb-6"
      >
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-1.5 tracking-tight">Track Your Discipline</h1>
        <p className="text-zinc-400 text-sm font-medium tracking-wide">Free • Private • No login required</p>
      </motion.div>

      <main className="w-full max-w-md flex flex-col items-center z-10">
        
        {/* Main Counter */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center mb-10 w-full"
        >
          <div className={`font-medium mb-6 tracking-widest uppercase text-sm flex items-center gap-2 px-4 py-1.5 rounded-full border ${currentLevel.border} ${currentLevel.color} glass-button ${currentLevel.glow} transition-all duration-500`}>
            <Flame className="w-4 h-4" />
            Level {currentLevel.level}: {currentLevel.name}
          </div>
          
          <div className="text-center relative">
            <motion.h1 
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={`text-7xl sm:text-8xl font-display font-bold tracking-tighter mb-2 ${currentLevel.level >= 5 ? 'text-glow-red text-zinc-50' : 'text-glow text-zinc-50'}`}
            >
              {days}
            </motion.h1>
            <div className="text-zinc-300 text-lg sm:text-xl font-medium tracking-wide">
              DAYS
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 text-2xl sm:text-3xl font-display font-semibold text-zinc-200 tabular-nums">
            <div className="flex flex-col items-center">
              <span>{pad(hours)}</span>
              <span className="text-[10px] text-zinc-400 tracking-widest mt-1">HRS</span>
            </div>
            <span className="text-zinc-500 -mt-5">:</span>
            <div className="flex flex-col items-center">
              <span>{pad(minutes)}</span>
              <span className="text-[10px] text-zinc-400 tracking-widest mt-1">MIN</span>
            </div>
            <span className="text-zinc-500 -mt-5">:</span>
            <div className="flex flex-col items-center">
              <span className="text-zinc-300">{pad(seconds)}</span>
              <span className="text-[10px] text-zinc-400 tracking-widest mt-1">SEC</span>
            </div>
          </div>
          
          {/* Requested Format Subtitle & Start Date */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="text-zinc-500 font-mono text-sm tracking-wider glass-panel px-4 py-2 rounded-lg">
              Day {days} | {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
            </div>
            {startTime && (
              <div className="text-zinc-500 text-xs font-medium tracking-wider uppercase flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                Started on: {new Date(startTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          <div className="mt-10 max-w-xs text-center flex flex-col gap-2">
            <p className="text-zinc-300 font-medium text-base leading-relaxed tracking-wide">{getMotivationalMessage(days)}</p>
            {startTime && (
              <p className="text-emerald-400/80 text-xs font-bold uppercase tracking-widest animate-pulse">
                Don't break the streak
              </p>
            )}
          </div>
        </motion.div>

        {/* Level Progress */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full glass-panel rounded-3xl p-6 mb-8"
        >
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Current Level</div>
              <div className={`font-medium ${currentLevel.color}`}>{currentLevel.name}</div>
            </div>
            {nextLevel ? (
              <div className="text-right">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Next Level</div>
                <div className="text-zinc-400 flex items-center gap-1.5 justify-end">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Day {nextLevel.min}
                </div>
              </div>
            ) : (
              <div className="text-right">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Status</div>
                <div className="text-red-400 flex items-center gap-1.5 justify-end">
                  <Trophy className="w-3.5 h-3.5" />
                  Max Level
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full ${currentLevel.bg} rounded-full relative`}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex justify-center w-full mb-10"
        >
          {!startTime ? (
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black hover:bg-zinc-200 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <Play className="w-5 h-5 fill-zinc-950" />
                <span className="font-bold tracking-wide">Start Streak</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDatePicker(true)}
                className="group flex items-center justify-center gap-2 px-8 py-3 rounded-full glass-button text-zinc-300 hover:text-white transition-all duration-300"
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="font-medium tracking-wide text-sm">Continue Existing Streak</span>
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowResetConfirm(true)}
              className="group flex items-center gap-2 px-6 py-3 rounded-full glass-button text-zinc-300 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
              <span className="font-medium tracking-wide text-sm">Reset Streak</span>
            </motion.button>
          )}
        </motion.div>

        {/* Stats Block */}
        {startTime && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full glass-panel rounded-3xl p-6 mb-8"
          >
            <h3 className="font-display font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Your Stats
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-2xl font-display font-bold text-white mb-1">{bestStreak}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider text-center">Longest<br/>Streak</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-2xl font-display font-bold text-emerald-400 mb-1">{checkIns.length}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider text-center">Clean<br/>Days</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-2xl font-display font-bold text-amber-400 mb-1">{urgeHistory[getLocalDateString(new Date())] || 0}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider text-center">Urges<br/>Today</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Urge Tracker */}
        {startTime && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="w-full glass-panel rounded-3xl p-6 mb-8 flex flex-col items-center"
          >
            <div className="flex items-center justify-between w-full mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-display font-bold text-zinc-200">Urge Tracker</h3>
              </div>
              <div className="text-sm text-zinc-500 font-medium">
                Urges today: {urgeHistory[getLocalDateString(new Date())] || 0}
              </div>
            </div>

            {urgeStatus === 'active' && urgeEndTime ? (
              <div className="flex flex-col items-center w-full">
                <div className="relative flex items-center justify-center mb-8 mt-4">
                  {/* Breathing Animation */}
                  <motion.div 
                    animate={{ scale: [1, 1.8, 1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-24 h-24 bg-amber-500/10 rounded-full"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-20 h-20 bg-amber-500/20 rounded-full"
                  />
                  <div className="relative z-10 text-4xl font-display font-bold text-amber-400 tabular-nums">
                    {pad(Math.floor(Math.max(0, urgeEndTime - now) / 1000 / 60))}:{pad(Math.floor((Math.max(0, urgeEndTime - now) / 1000) % 60))}
                  </div>
                </div>
                <p className="text-zinc-200 text-center font-medium mb-2 text-lg">{urgeMessage}</p>
                <p className="text-amber-500/70 text-xs text-center uppercase tracking-widest font-bold animate-pulse">Breathe in and out slowly</p>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <AnimatePresence>
                  {urgeStatus === 'defeated' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-6 text-center w-full"
                    >
                      <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                        <CheckCircle2 className="w-5 h-5" />
                        You made it. Urge defeated.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <button
                  onClick={startUrgeTimer}
                  className="w-full py-4 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                >
                  <AlertTriangle className="w-5 h-5" />
                  ⚠️ I Feel an Urge
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Daily Check-In Calendar */}
        {startTime && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="w-full"
          >
            {renderCalendar()}
          </motion.div>
        )}

        {/* Leaderboard Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full mb-8"
        >
          <div className="flex items-center gap-2 mb-4 px-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-display font-bold text-zinc-200">Top Warriors</h2>
          </div>
          
          <div className="glass-panel rounded-3xl overflow-hidden">
            {leaderboard.map((user, index) => {
              const isCurrentUser = user.username === username;
              return (
                <div 
                  key={user.username}
                  className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 ${isCurrentUser ? 'bg-white/10' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 text-center font-display font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-zinc-300' : index === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>
                      #{index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isCurrentUser ? 'text-zinc-100' : 'text-zinc-300'}`}>
                        {user.username}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] uppercase tracking-wider bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-sm">
                    <Flame className={`w-3.5 h-3.5 ${user.bestStreak > 0 ? 'text-orange-500' : 'text-zinc-600'}`} />
                    {user.bestStreak}d
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* User Retention Hook */}
        {startTime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="w-full text-center mt-4 mb-8"
          >
            <p className="text-zinc-500 text-xs font-medium tracking-wide">
              Come back tomorrow to continue your streak
            </p>
          </motion.div>
        )}

      </main>

      {/* Date Picker Modal */}
      <AnimatePresence>
        {showDatePicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowDatePicker(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass-panel rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <CalendarIcon className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-zinc-100 mb-2">Continue Streak</h3>
              <p className="text-zinc-400 mb-2 text-sm leading-relaxed">
                Choose the date when you last relapsed.
              </p>
              <p className="text-zinc-500 mb-6 text-xs italic">
                Are you sure you want to continue from this date?
              </p>
              
              <form onSubmit={handleSetCustomDate} className="flex flex-col gap-4">
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setDateError("");
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all [color-scheme:dark]"
                  autoFocus
                  required
                />
                {dateError && (
                  <div className="text-red-400 text-xs font-medium px-1">{dateError}</div>
                )}
                <div className="flex gap-3 mt-2">
                  <button 
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="flex-1 py-3.5 rounded-xl glass-button text-zinc-300 font-semibold hover:text-white transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!customDate}
                    className="flex-1 py-3.5 rounded-xl bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors duration-200"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Username Prompt Modal */}
      <AnimatePresence>
        {showUsernamePrompt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-sm glass-panel rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <User className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-zinc-100 mb-2">Enter your alias</h3>
              <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                Choose a username for the leaderboard. This will be your identity on the journey.
              </p>
              
              <form onSubmit={handleSaveUsername} className="flex flex-col gap-4">
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  placeholder="e.g. IronWill"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                  autoFocus
                  maxLength={15}
                />
                <button 
                  type="submit"
                  disabled={tempUsername.trim().length < 3}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors duration-200"
                >
                  Join the Ranks
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass-panel rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />
              
              <h3 className="text-2xl font-display font-bold text-zinc-100 mb-3">Reset Streak?</h3>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Are you sure you want to reset your streak? You will lose your current progress.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-3.5 rounded-xl glass-button text-zinc-300 font-semibold hover:text-white transition-all duration-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReset}
                  className="w-full py-3.5 rounded-xl bg-red-500/10 text-red-500 font-semibold hover:bg-red-500 hover:text-white transition-colors duration-200"
                >
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
