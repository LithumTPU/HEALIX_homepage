import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { AlertTriangle } from 'lucide-react';

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDialog({ open, onOpenChange }: AuditLogDialogProps) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;

    const abortCtrl = new AbortController();

    fetch('/api/logs', { signal: abortCtrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const allLogs: any[] = [];
        for (const [patientId, msgs] of Object.entries<any>(data || {})) {
          if (Array.isArray(msgs)) {
            msgs.forEach((msg) => {
              allLogs.push({ patientId, ...msg });
            });
          }
        }
        // sort by timestamp descending if timestamp exists
        allLogs.sort((a, b) => {
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return tb - ta;
        });
        setLogs(allLogs);
      })
      .catch((err) => {
        console.warn('Failed to fetch logs:', err);
        setLogs([]);
      });

    return () => abortCtrl.abort();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Alert Audit Log
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <AlertTriangle className="h-12 w-12 opacity-20" />
              <p className="mt-4">No alerts recorded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={i} className={`rounded-lg border-l-4 bg-slate-50 p-4 shadow-sm ${log.message?.includes('CRITICAL') ? 'border-red-500' : 'border-amber-400'}`}>
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>{log.timestamp}</span>
                    <span className="uppercase">{log.patientId}</span>
                  </div>
                  <div className="mt-1 font-medium text-slate-900">
                    {log.message}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Value: {log.value} ({log.vitalType})
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
