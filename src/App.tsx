import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layout, 
  ChevronDown, 
  History, 
  Play, 
  RotateCcw, 
  Volume2, 
  Volume1,
  VolumeX,
  Globe, 
  Monitor, 
  Settings,
  X,
  Clock,
  Zap,
  Target,
  MousePointer2,
  Pause
} from 'lucide-react';
import { Article, TypingStats, TypingRecord } from './types';
import { ARTICLES } from './constants';

// --- Custom Icons ---
const MonkeyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="13" r="8" />
    <path d="M5 11a3 3 0 1 0 0 6" />
    <path d="M19 11a3 3 0 1 1 0 6" />
    <path d="M8 11a4 4 0 0 1 8 0" />
    <circle cx="9.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
    <path d="M10 16s1 1 2 1 2-1 2-1" />
  </svg>
);

const normalizeInput = (input: string, target: string) => {
  let normalized = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const expected = target[i];
    
    if (expected) {
      const pairs: Record<string, string[]> = {
        '"': ['“', '”', '＂'],
        "'": ['‘', '’'],
        '“': ['”', '"', '＂'],
        '”': ['“', '"', '＂'],
        '＂': ['“', '”', '"'],
        '‘': ['’', "'"],
        '’': ['‘', "'"],
        ',': ['，'],
        '，': [','],
        '.': ['。'],
        '。': ['.'],
        '!': ['！'],
        '！': ['!'],
        '?': ['？'],
        '？': ['?'],
        ':': ['：'],
        '：': [':'],
        ';': ['；'],
        '；': [';'],
        '(': ['（'],
        '（': ['('],
        ')': ['）'],
        '）': [')'],
        '\\': ['、'],
        '、': ['\\'],
        '<': ['《'],
        '《': ['<'],
        '>': ['》'],
        '》': ['>'],
        '-': ['—', '——'],
        '_': ['——'],
        '—': ['-'],
        '——': ['-', '_']
      };
      if (pairs[char] && pairs[char].includes(expected)) {
        normalized += expected;
      } else {
        normalized += char;
      }
    } else {
      normalized += char;
    }
  }
  return normalized;
};

// --- Components ---

const SidebarButton = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: (e: React.MouseEvent) => void }) => (
  <button 
    onMouseDown={(e) => e.preventDefault()}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.(e);
    }}
    className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${
      active ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="absolute right-16 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
      {label}
    </span>
  </button>
);

// --- Main App ---

export default function App() {
  // State
  const [currentArticle, setCurrentArticle] = useState<Article>(() => {
    const randomIndex = Math.floor(Math.random() * ARTICLES.length);
    return ARTICLES[randomIndex];
  });
  const [userInput, setUserInput] = useState('');
  const [inputValue, setInputValue] = useState('');
  const isComposing = useRef(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<'全部' | '简单' | '困难'>('全部');
  const [isFocused, setIsFocused] = useState(true);
  const [records, setRecords] = useState<TypingRecord[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [lastPauseTime, setLastPauseTime] = useState<number | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(50);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeTimeoutRef = useRef<number | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [inputPos, setInputPos] = useState({ top: 0, left: 0 });

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playClick = () => {
    if (!audioCtxRef.current || volumeLevel === 0) return;
    const ctx = audioCtxRef.current;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
    
    const volume = (volumeLevel / 100) * 0.5; // Max volume 0.5
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  const playSuccess = () => {
    if (!audioCtxRef.current || volumeLevel === 0) return;
    const ctx = audioCtxRef.current;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1); // C#5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3); // A5
    
    const volume = (volumeLevel / 100) * 0.8;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime + 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1);
  };

  const handleVolumeMouseEnter = () => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    setShowVolumeSlider(true);
  };

  const handleVolumeMouseLeave = () => {
    volumeTimeoutRef.current = window.setTimeout(() => {
      setShowVolumeSlider(false);
    }, 1000);
  };

  // Load records from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('typing_monkey_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse records", e);
      }
    }
  }, []);

  // Save records to localStorage
  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem('typing_monkey_records', JSON.stringify(records));
    }
  }, [records]);

  // Update input position to follow cursor
  useEffect(() => {
    if (activeCharRef.current && containerRef.current) {
      const charRect = activeCharRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      setInputPos({
        // Move the input field below the character to prevent IME from covering the text
        top: charRect.top - containerRect.top + 40, 
        left: charRect.left - containerRect.left
      });
    }
  }, [userInput.length, currentArticle, showModal, showHistory]);

  // Timer logic
  useEffect(() => {
    let interval: number;
    if (isStarted && !isFinished && startTime) {
      interval = window.setInterval(() => {
        setNow(Date.now());
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isStarted, isFinished, startTime]);

  // Handle Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished) return;
    initAudio();
    playClick();

    let value = e.target.value;
    
    if (!isComposing.current) {
      let processedValue = value;
      
      // Fix for IME auto-paired punctuation (e.g., typing " outputs “”)
      const autoPairs = ['“”', '""', '‘’', "''", '《》', '<>', '（）', '()', '【】', '[]', '{}', '｛｝'];
      for (const pair of autoPairs) {
        if (processedValue.endsWith(pair)) {
          const expectedChar = currentArticle.content[processedValue.length - 1];
          const isPunctuation = ['"', "'", '“', '”', '‘', '’', '《', '》', '<', '>', '（', '）', '(', ')', '【', '】', '[', ']', '{', '}', '｛', '｝', '＂'].includes(expectedChar);
          if (!isPunctuation) {
            processedValue = processedValue.slice(0, -1);
            value = value.slice(0, -1); // Remove from raw value as well so next input appends correctly
            break;
          }
        }
      }

      processedValue = normalizeInput(processedValue, currentArticle.content);

      if (processedValue.length > currentArticle.content.length) {
        processedValue = processedValue.slice(0, currentArticle.content.length);
        value = value.slice(0, currentArticle.content.length); // Also truncate raw value to prevent infinite growth
      }
      
      setInputValue(value);
      setUserInput(processedValue);

      // Start timer on first keystroke
      if (!isStarted && (processedValue.length > 0 || startTime)) {
        setIsStarted(true);
        if (!startTime) {
          setStartTime(Date.now());
          setNow(Date.now());
          setTotalPausedTime(0);
        } else if (lastPauseTime) {
          setTotalPausedTime(prev => prev + (Date.now() - lastPauseTime));
          setLastPauseTime(null);
        }
      }

      // Check if finished
      if (processedValue.length === currentArticle.content.length) {
        handleFinish(processedValue);
        playSuccess();
      }
    } else {
      setInputValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent arrow keys to maintain linear typing experience
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposing.current = false;
    initAudio();
    playClick();
    
    let value = e.currentTarget.value;
    let processedValue = value;
    
    // Fix for IME auto-paired punctuation
    const autoPairs = ['“”', '""', '‘’', "''", '《》', '<>', '（）', '()', '【】', '[]', '{}', '｛｝'];
    for (const pair of autoPairs) {
      if (processedValue.endsWith(pair)) {
        const expectedChar = currentArticle.content[processedValue.length - 1];
        const isPunctuation = ['"', "'", '“', '”', '‘', '’', '《', '》', '<', '>', '（', '）', '(', ')', '【', '】', '[', ']', '{', '}', '｛', '｝', '＂'].includes(expectedChar);
        if (!isPunctuation) {
          processedValue = processedValue.slice(0, -1);
          value = value.slice(0, -1); // Remove from raw value as well
          break;
        }
      }
    }
    
    if (isFinished) return;

    processedValue = normalizeInput(processedValue, currentArticle.content);

    if (processedValue.length > currentArticle.content.length) {
      processedValue = processedValue.slice(0, currentArticle.content.length);
      value = value.slice(0, currentArticle.content.length);
    }

    setInputValue(value);
    setUserInput(processedValue);

    if (!isStarted && (processedValue.length > 0 || startTime)) {
      setIsStarted(true);
      if (!startTime) {
        setStartTime(Date.now());
        setNow(Date.now());
        setTotalPausedTime(0);
      } else if (lastPauseTime) {
        setTotalPausedTime(prev => prev + (Date.now() - lastPauseTime));
        setLastPauseTime(null);
      }
    }

    if (processedValue.length === currentArticle.content.length) {
      handleFinish(processedValue);
      playSuccess();
    }
  };

  const stats = useMemo(() => {
    const elapsedSeconds = startTime && now ? Math.max(0, (now - startTime - totalPausedTime) / 1000) : 0;
    const elapsedMinutes = elapsedSeconds / 60;
    
    let correctCount = 0;
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === currentArticle.content[i]) {
        correctCount++;
      }
    }

    const cpm = elapsedMinutes > 0 ? Math.round(correctCount / elapsedMinutes) : 0;
    const accuracy = userInput.length > 0 ? Math.round((correctCount / userInput.length) * 100) : 100;

    return {
      time: elapsedSeconds,
      cpm,
      accuracy,
      correctCount,
      total: currentArticle.content.length,
      progress: userInput.length
    };
  }, [userInput, currentArticle, startTime, now]);

  const handleFinish = (finalInput: string) => {
    const endTime = Date.now();
    const durationSeconds = startTime ? Math.max(0, (endTime - startTime - totalPausedTime) / 1000) : 0;
    
    let correctCount = 0;
    for (let i = 0; i < finalInput.length; i++) {
      if (finalInput[i] === currentArticle.content[i]) {
        correctCount++;
      }
    }

    const cpm = durationSeconds > 0 ? Math.round(correctCount / (durationSeconds / 60)) : 0;
    const accuracy = Math.round((correctCount / finalInput.length) * 100);

    setIsFinished(true);
    setNow(endTime);

    // Save record
    const newRecord: TypingRecord = {
      id: Math.random().toString(36).substr(2, 9),
      articleTitle: currentArticle.title,
      articleAuthor: currentArticle.author,
      timeSpent: Math.round(durationSeconds),
      cpm,
      accuracy,
      timestamp: endTime
    };
    setRecords(prev => [newRecord, ...prev].slice(0, 50));
  };

  const handleReset = () => {
    setUserInput('');
    setInputValue('');
    setIsStarted(false);
    setIsFinished(false);
    setStartTime(null);
    setNow(null);
    setTotalPausedTime(0);
    setLastPauseTime(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleArticleSelect = (article: Article) => {
    setCurrentArticle(article);
    setShowModal(false);
    handleReset();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredArticles = useMemo(() => {
    if (difficultyFilter === '全部') return ARTICLES;
    return ARTICLES.filter(a => a.difficulty === difficultyFilter);
  }, [difficultyFilter]);

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden bg-[#f8f9fa]" 
    >
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-8 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6366f1] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <MonkeyIcon className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800">打字猴</h1>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm hover:border-indigo-200 transition-all text-sm font-bold text-gray-700"
          >
            <span className="max-w-[200px] truncate">{currentArticle.author} - 《{currentArticle.title}》</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory(true);
            }}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <History className="w-4 h-4" />
            <span>记录</span>
          </button>

          <button 
            onClick={handleReset}
            className="px-8 py-2 bg-[#6366f1] text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-[#4f46e5] hover:scale-105 active:scale-95 transition-all"
          >
            {isFinished ? '再来一次' : 'START'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main 
        ref={containerRef} 
        className="flex-1 flex flex-col items-center justify-center px-8 relative"
        onClick={() => {
          if (!showModal && !showHistory) {
            inputRef.current?.focus();
            setIsFocused(true);
          }
        }}
      >
        {/* Hidden input for capturing keystrokes */}
        <input
          ref={inputRef}
          type="text"
          className="absolute opacity-0 pointer-events-none z-0 caret-transparent"
          style={{ 
            top: inputPos.top, 
            left: inputPos.left,
            width: '1px',
            height: '1.2em'
          }}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onBlur={() => {
            setIsFocused(false);
            if (isStarted && !isFinished) {
              setIsStarted(false);
              setLastPauseTime(Date.now());
            }
          }}
          onFocus={() => setIsFocused(true)}
          disabled={isFinished || showModal || showHistory}
          autoFocus
        />

        {/* Blur Overlay */}
        <AnimatePresence>
          {!isFocused && !showModal && !showHistory && !isFinished && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-white/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer"
            >
              <div className="flex flex-col items-center gap-4 text-gray-500">
                <MousePointer2 className="w-8 h-8 animate-bounce" />
                <p className="text-lg font-medium">点击此处继续练习</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator */}
        {!isFinished && (
          <div className="mb-12 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-2">
              Target Progress: {userInput.length} / {currentArticle.content.length}
            </p>
            <div className="w-64 h-1 bg-gray-100 rounded-full overflow-hidden mx-auto">
              <motion.div 
                className="h-full bg-[#6366f1]"
                initial={{ width: 0 }}
                animate={{ width: `${(userInput.length / currentArticle.content.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Typing Area */}
        {isFinished ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 bg-white rounded-[40px] shadow-sm border border-gray-50 w-full max-w-4xl"
          >
            <div className="text-6xl mb-6">🏆</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-12">修行圆满完成！</h2>
            
            <div className="flex gap-16 mb-12">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">SPEED CPM</p>
                <p className="text-4xl font-bold text-gray-800">{stats.cpm}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">ACCURACY</p>
                <p className="text-4xl font-bold text-gray-800">{stats.accuracy}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">DURATION</p>
                <p className="text-4xl font-bold text-gray-800">{formatTime(stats.time)}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleReset}
                className="px-8 py-3 bg-[#6366f1] text-white rounded-full font-medium shadow-lg shadow-indigo-200 hover:bg-[#4f46e5] hover:scale-105 active:scale-95 transition-all"
              >
                再来一局
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="px-8 py-3 bg-gray-50 text-gray-600 rounded-full font-medium hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all"
              >
                文库
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="max-w-4xl w-full relative">
            <div className="text-3xl leading-[1.8] font-bold tracking-wide text-justify select-none font-sans">
              {currentArticle.content.split('').map((char, index) => {
                let status = 'char-default';
                if (index < userInput.length) {
                  status = userInput[index] === char ? 'char-correct' : 'char-error';
                } else if (index === userInput.length) {
                  status = 'char-current';
                }

                return (
                  <span 
                    key={index} 
                    ref={index === userInput.length ? activeCharRef : null}
                    className={`relative transition-colors duration-200 ${status}`}
                  >
                    {index === userInput.length && !isFinished && isFocused && (
                      <motion.span 
                        className="absolute left-0 top-0 w-[2px] h-[1.2em] bg-[#6366f1]"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    )}
                    {char}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Real-time Stats Bar */}
        {!isFinished && (
          <div className="mt-16 bg-white/80 backdrop-blur-sm px-12 py-6 rounded-full border border-gray-100 shadow-sm flex items-center gap-16">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{formatTime(stats.time)}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">用时</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[#6366f1]">{stats.cpm}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">CPM</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-500">{stats.accuracy}%</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">准确率</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.correctCount}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">正确数</p>
            </div>
          </div>
        )}
      </main>

      {/* Floating Sidebar */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
        <SidebarButton icon={isStarted && !isFinished ? Pause : Play} label={isStarted && !isFinished ? "暂停" : "继续"} active={isStarted && !isFinished} onClick={() => {
          if (isStarted && !isFinished) {
            setIsStarted(false);
            setLastPauseTime(Date.now());
            inputRef.current?.blur();
          } else {
            if (lastPauseTime) {
              setTotalPausedTime(prev => prev + (Date.now() - lastPauseTime));
              setLastPauseTime(null);
            }
            setIsStarted(true);
            inputRef.current?.focus();
          }
        }} />
        <SidebarButton icon={RotateCcw} label="重新开始" onClick={handleReset} />
        
        <div 
          className="relative flex items-center justify-end"
          onMouseEnter={handleVolumeMouseEnter}
          onMouseLeave={handleVolumeMouseLeave}
        >
          <AnimatePresence>
            {showVolumeSlider && (
              <motion.div 
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 140 }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-14 bg-white h-12 rounded-2xl shadow-lg border border-gray-50 flex items-center px-4 gap-3 overflow-hidden"
              >
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={volumeLevel}
                  onChange={(e) => {
                    initAudio();
                    setVolumeLevel(Number(e.target.value));
                    playClick();
                  }}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6366f1]"
                />
                <span className="text-xs font-bold text-gray-400 w-8">音效</span>
              </motion.div>
            )}
          </AnimatePresence>
          <SidebarButton 
            icon={volumeLevel === 0 ? VolumeX : volumeLevel < 50 ? Volume1 : Volume2} 
            label="音量控制" 
            onClick={() => {
              initAudio();
              if (volumeLevel > 0) {
                setVolumeLevel(0);
              } else {
                setVolumeLevel(50);
                playClick();
              }
            }}
          />
        </div>
      </div>

      {/* Article Selection Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-gray-900/20 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">选择练习文章</h2>
                  <div className="flex items-center gap-4 mt-3">
                    {(['全部', '简单', '困难'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setDifficultyFilter(filter)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          difficultyFilter === filter 
                            ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-200' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArticles.map((article) => (
                    <motion.div
                      key={article.id}
                      whileHover={{ y: -5 }}
                      onClick={() => handleArticleSelect(article)}
                      className={`group p-6 rounded-[32px] border-2 cursor-pointer transition-all duration-300 ${
                        currentArticle.id === article.id 
                          ? 'border-[#6366f1] bg-indigo-50/30' 
                          : 'border-gray-50 bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                          currentArticle.id === article.id ? 'bg-[#6366f1] text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-400'
                        }`}>
                          <MonkeyIcon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{article.category}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            article.difficulty === '简单' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {article.difficulty}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-[#6366f1] transition-colors line-clamp-1">《{article.title}》</h3>
                      <p className="text-sm text-gray-400 mb-4 font-medium">{article.author}</p>
                      <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                        {article.content.substring(0, 80)}...
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-gray-900/20 backdrop-blur-md"
            onClick={() => setShowHistory(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">历史打字记录</h2>
                  <p className="text-gray-400 text-sm mt-1">回顾你的每一次进步</p>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {records.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
                    <History className="w-12 h-12 opacity-20" />
                    <p>暂无练习记录，快去开始第一次练习吧！</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-gray-300 font-bold border-b border-gray-50">
                        <th className="pb-6 pl-4">文章标题</th>
                        <th className="pb-6">用时</th>
                        <th className="pb-6">速度 (CPM)</th>
                        <th className="pb-6">正确率</th>
                        <th className="pb-6 pr-4 text-right">时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {records.map((record) => (
                        <tr key={record.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-6 pl-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-700 group-hover:text-[#6366f1] transition-colors">《{record.articleTitle}》</span>
                              <span className="text-xs text-gray-400">{record.articleAuthor}</span>
                            </div>
                          </td>
                          <td className="py-6 text-sm text-gray-500 font-medium">{formatTime(record.timeSpent)}</td>
                          <td className="py-6">
                            <span className="text-lg font-bold text-[#6366f1]">{record.cpm}</span>
                          </td>
                          <td className="py-6">
                            <span className={`text-sm font-bold ${record.accuracy >= 95 ? 'text-emerald-500' : 'text-orange-400'}`}>
                              {record.accuracy}%
                            </span>
                          </td>
                          <td className="py-6 pr-4 text-right text-xs text-gray-400 font-medium">
                            {new Date(record.timestamp).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-60" />
      </div>
    </div>
  );
}
