import React from 'react';
import { Bot, Trophy, Layers, BookOpen, Shuffle, Sparkles, Activity, Key } from 'lucide-react';
import { TopicCategory } from '../types/benchmark';

interface NavbarProps {
  currentTab: 'arena' | 'leaderboard' | 'problems' | 'methodology';
  onSelectTab: (tab: 'arena' | 'leaderboard' | 'problems' | 'methodology') => void;
  onRandomChallenge: (topic?: TopicCategory) => void;
  isRunning: boolean;
  onOpenTokens?: () => void;
  configuredKeysCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onRandomChallenge,
  isRunning,
  onOpenTokens,
  configuredKeysCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-slate-900 uppercase dark:text-white">
                DualBlind <span className="text-slate-400 font-normal">v2.0</span>
              </h1>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                BENCHMARK
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Multi-Agent Compute Efficiency Index
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/60 dark:border-slate-700/60 dark:bg-slate-800/80">
          <button
            id="nav-arena-btn"
            onClick={() => onSelectTab('arena')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              currentTab === 'arena'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Benchmark Arena</span>
          </button>

          <button
            id="nav-leaderboard-btn"
            onClick={() => onSelectTab('leaderboard')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              currentTab === 'leaderboard'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Leaderboard & Analytics</span>
          </button>

          <button
            id="nav-problems-btn"
            onClick={() => onSelectTab('problems')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              currentTab === 'problems'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Problem Suite</span>
          </button>

          <button
            id="nav-methodology-btn"
            onClick={() => onSelectTab('methodology')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              currentTab === 'methodology'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Methodology</span>
          </button>
        </nav>

        {/* Live Status & Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* APIs and Tokens Button */}
          {onOpenTokens && (
            <button
              id="nav-tokens-btn"
              onClick={onOpenTokens}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                configuredKeysCount > 0
                  ? 'border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
              title="Manage Provider API Keys and Custom Endpoints"
            >
              <Key className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">APIs & Tokens</span>
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-mono text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                {configuredKeysCount}
              </span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className={`h-2 w-2 rounded-full bg-emerald-500 ${isRunning ? 'animate-ping' : 'animate-pulse'}`} />
            <span>{isRunning ? 'Benchmarking Active' : 'Arena Ready'}</span>
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700" />

          <button
            id="quick-random-btn"
            disabled={isRunning}
            onClick={() => onRandomChallenge()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
            title="Randomly pick 1 of 3 topics (Logic, Strategy, Abstract)"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Random 1 of 3</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="flex md:hidden border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-2 justify-between text-xs overflow-x-auto gap-2">
        <button
          onClick={() => onSelectTab('arena')}
          className={`px-2.5 py-1 rounded-md font-semibold tracking-wide whitespace-nowrap ${currentTab === 'arena' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Arena
        </button>
        <button
          onClick={() => onSelectTab('leaderboard')}
          className={`px-2.5 py-1 rounded-md font-semibold tracking-wide whitespace-nowrap ${currentTab === 'leaderboard' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => onSelectTab('problems')}
          className={`px-2.5 py-1 rounded-md font-semibold tracking-wide whitespace-nowrap ${currentTab === 'problems' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Problems
        </button>
        <button
          onClick={() => onSelectTab('methodology')}
          className={`px-2.5 py-1 rounded-md font-semibold tracking-wide whitespace-nowrap ${currentTab === 'methodology' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}
        >
          Methodology
        </button>
      </div>
    </header>
  );
};
