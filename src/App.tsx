import React, { useState, useEffect } from 'react';
import { Header } from './components/dashboard/Header';
import { PatientOverview } from './components/dashboard/PatientOverview';
import { RealTimePanel } from './components/dashboard/RealTimePanel';
import { PreloggedPanel } from './components/dashboard/PreloggedPanel';
import { VideoPanel } from './components/dashboard/VideoPanel';
import { ChatbotPanel } from './components/dashboard/ChatbotPanel';
import { DataVisPanel } from './components/dashboard/DataVisPanel';
import { AuditLogDialog } from './components/dashboard/AuditLogDialog';
import { Toaster } from './components/ui/sonner';
import { usePatients, VITAL_THRESHOLDS } from './lib/hooks';

export default function App() {
  const [auditOpen, setAuditOpen] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const { patients } = usePatients();

  // Persist email setting
  useEffect(() => {
    const stored = localStorage.getItem('healix_email_notifications');
    if (stored) setEmailEnabled(stored === 'true');
  }, []);

  const handleEmailToggle = (val: boolean) => {
    setEmailEnabled(val);
    localStorage.setItem('healix_email_notifications', String(val));
  };

  // Logic to detect critical states and log them (Background Monitor)
  useEffect(() => {
    const logAlert = (patientId: string, vital: string, val: number, msg: string) => {
        const logs = JSON.parse(localStorage.getItem('healix_audit_log') || '[]');
        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
        
        // Debounce: Don't log same alert for same patient within 5 mins
        const recent = logs.find((l: any) => 
            l.patientId === patientId && 
            l.vitalType === vital && 
            (now.getTime() - new Date(l.timestamp).getTime()) < 300000
        );

        if (!recent) {
            logs.unshift({ timestamp, patientId, vitalType: vital, value: val, message: msg });
            if (logs.length > 1000) logs.pop(); // Limit size
            localStorage.setItem('healix_audit_log', JSON.stringify(logs));
        }
    };

    Object.keys(patients).forEach(pid => {
        const p = patients[pid];
        ['temperature', 'heartRate', 'spo2', 'respiratoryRate'].forEach(vital => {
            // @ts-ignore
            const arr = p[vital];
            if (Array.isArray(arr) && arr.length > 0) {
                const val = Number(arr[arr.length - 1]);
                // @ts-ignore
                const thresh = VITAL_THRESHOLDS[vital];
                if (thresh) {
                    if (val < thresh.criticalMin || val > thresh.criticalMax) {
                        logAlert(pid, vital, val, `CRITICAL: ${vital} at ${val}`);
                    }
                }
            }
        });
    });
  }, [patients]);

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      <Header />
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Top Row: Overview */}
        <section>
          <PatientOverview 
            onAuditLogClick={() => setAuditOpen(true)} 
            emailNotifications={emailEnabled}
            onToggleEmail={handleEmailToggle}
          />
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            
            {/* Left Column: Realtime & Controls */}
            <div className="space-y-6 lg:col-span-4">
                <div className="min-h-[500px]">
                    <RealTimePanel />
                </div>
                <div className="h-auto">
                     <PreloggedPanel />
                </div>
            </div>

            {/* Right Column: Video, Chat, Charts */}
            <div className="space-y-6 lg:col-span-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="min-h-[300px]">
                         <VideoPanel />
                    </div>
                    <div className="min-h-[400px]">
                         <ChatbotPanel />
                    </div>
                </div>
                <div className="min-h-[400px]">
                    <DataVisPanel />
                </div>
            </div>

        </div>
      </main>

      <AuditLogDialog open={auditOpen} onOpenChange={setAuditOpen} />
      <Toaster position="top-right" />
    </div>
  );
}
