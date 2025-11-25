import React, { useState, useEffect } from 'react';
import { Activity, Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { formatTime, formatDate } from '../../lib/utils';

export function Header() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Healix Control Panel</h1>
            <p className="text-xs font-medium text-slate-500">Advanced Patient Monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden text-right md:block">
            <div className="text-sm font-semibold text-slate-900 tabular-nums">{formatTime(time)}</div>
            <div className="text-xs font-medium text-slate-500">{formatDate(time)}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
