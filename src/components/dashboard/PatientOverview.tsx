import React, { useState, useEffect } from 'react';
import { usePatients, VITAL_THRESHOLDS } from '../../lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Activity, Thermometer, Heart, Wind, Droplets, Mail } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import ConfigBox from '../ui/ConfigBox';
import { toast } from 'sonner';

const EMAIL_SERVICE_URL = 'http://127.0.0.1:5003/api/email-service';

interface PatientOverviewProps {
  onAuditLogClick: () => void;
  emailNotifications: boolean;
  onToggleEmail: (val: boolean) => void;
}

export function PatientOverview({ onAuditLogClick, emailNotifications, onToggleEmail }: PatientOverviewProps) {
  const { patients, loading } = usePatients();
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    const checkEmailServiceStatus = async () => {
      try {
        const resp = await fetch(`${EMAIL_SERVICE_URL}/status`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.enabled !== emailNotifications) {
            onToggleEmail(data.enabled);
          }
        }
      } catch (err) {
        console.warn('Could not check email service status:', err);
      }
    };
    checkEmailServiceStatus();
  }, []);

  const getVitalValues = (patientData: any, vitalType: string) => {
    if (!patientData) return [];
    if (Array.isArray(patientData[vitalType])) return patientData[vitalType];
    return [];
  };

  const assessVitalStatus = (vitalType: string, value: number) => {
    // @ts-ignore
    const thresholds = VITAL_THRESHOLDS[vitalType];
    if (!thresholds) return { level: 'stable', message: 'Normal' };

    if (value < thresholds.criticalMin || value > thresholds.criticalMax) {
      return { level: 'critical', message: `CRITICAL` };
    } else if (value < thresholds.min || value > thresholds.max) {
      return { level: 'concern', message: `WARNING` };
    }
    return { level: 'stable', message: 'Normal' };
  };

  const calculateStatus = (patientData: any) => {
    let worstStatus = 'stable';
    let message = 'All systems normal';
    
    const vitals = ['temperature', 'heartRate', 'spo2', 'respiratoryRate', 'systolic', 'pain_scale'];
    
    for (const vital of vitals) {
      const values = getVitalValues(patientData, vital);
      if (!values.length) continue;
      const latest = values[values.length - 1];
      if (latest === null || latest === undefined || latest === '') continue;
      
      const status = assessVitalStatus(vital, Number(latest));
      
      if (status.level === 'critical') {
        worstStatus = 'critical';
        message = `${vital} Critical`;
        break; 
      } else if (status.level === 'concern' && worstStatus !== 'critical') {
        worstStatus = 'concern';
        message = `${vital} Warning`;
      }
    }

    return { level: worstStatus, message };
  };

  // Helper to get latest single value cleanly
  const getLatest = (pData: any, key: string) => {
    const arr = getVitalValues(pData, key);
    return arr.length ? arr[arr.length - 1] : '--';
  };

  // New helper to show BP nicely
  const getLatestBP = (pData: any) => {
    const s = getLatest(pData, 'systolic');
    const d = getLatest(pData, 'diastolic');
    if (s === '--' && d === '--') return '--';
    return `${s === '--' ? '?' : s}/${d === '--' ? '?' : d} mmHg`;
  };

  // Toggle email service on/off
  const handleEmailToggle = async (enabled: boolean) => {
    try {
      const endpoint = enabled ? `${EMAIL_SERVICE_URL}/enable` : `${EMAIL_SERVICE_URL}/disable`;
      const resp = await fetch(endpoint, { method: 'POST' });
      
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.message || `Server returned ${resp.status}`);
      }
      
      const data = await resp.json();
      console.log(`[PatientOverview] Email service ${enabled ? 'enabled' : 'disabled'}:`, data);
      
      onToggleEmail(enabled);
      
      if (enabled) {
        toast.success("Email alerts enabled - continuous sending started");
      } else {
        toast.success("Email alerts disabled - sending stopped");
      }
    } catch (err) {
      console.error('[PatientOverview] Toggle error:', err);
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} email alerts: ${err}`);
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailNotifications) {
      toast.error("Enable Email Alerts first");
      return;
    }
    try {
      const toastId = toast.loading("Sending test email...");
      const resp = await fetch(`${EMAIL_SERVICE_URL}/send-test`, { method: 'POST' });
      
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.message || `Server returned ${resp.status}`);
      }
      
      toast.dismiss(toastId);
      toast.success("Test email sent successfully");
    } catch (err) {
      console.error('[PatientOverview] Test email error:', err);
      toast.error(`Failed to send test email: ${err}`);
    }
  };

  const handleConfigSave = (cfg: any) => {
    console.log("Configuration saved:", cfg);
    setConfigOpen(false);
    toast.success("Configuration saved");
  };

  const ElegantToggleBar: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => {
    const handleToggle = () => onChange(!checked);
    const handleKey = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(!checked);
      }
    };

    const shadowGlowStyle: React.CSSProperties = {
      boxShadow: '0 6px 18px rgba(34,197,94,0.18)',
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        onKeyDown={handleKey}
        title={checked ? "Email alerts enabled" : "Email alerts disabled"}
        className={cn(
          "relative inline-flex items-center focus:outline-none",
          "w-14 h-8 rounded-full p-0.5 transition-colors duration-300",
          checked ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-slate-200/60 dark:bg-slate-700"
        )}
        style={checked ? shadowGlowStyle : undefined}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none inline-block h-7 w-7 rounded-full bg-white shadow-md transform transition-transform duration-300",
            checked ? "translate-x-6" : "translate-x-0"
          )}
        />
        <span className="sr-only">Toggle Email Alerts</span>
      </button>
    );
  };

  if (loading) {
    return (
      <Card className="border-dashed border-slate-300 bg-slate-50/50">
        <CardContent className="flex min-h-[200px] items-center justify-center text-slate-400">
          Loading patient data...
        </CardContent>
      </Card>
    );
  }

  const patientIds = Object.keys(patients);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Patient Overview</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Email Alerts</span>

            {/* Replaced original Switch with ElegantToggleBar for an Apple-like sleek toggle */}
            <ElegantToggleBar checked={emailNotifications} onChange={handleEmailToggle} />

            {/* Configuration button: pixel-matched to surrounding buttons */}
            <Button
              variant="ghost"
              size="sm"
              className={cn("ml-2 flex items-center gap-2")}
              onClick={() => setConfigOpen(true)}
              aria-label="Open configuration"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12.7v-1.4M3 12.7v-1.4M19.1 7.1l-.98-.98M6.88 18.12l-.98-.98M19.1 16.9l-.98.98M6.88 5.88l-.98.98" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="hidden sm:inline text-xs">Configuration</span>
            </Button>

            {/* small, elegant button to the right of the toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={cn("ml-2 flex items-center gap-2")}
              onClick={handleSendTestEmail}
              disabled={!emailNotifications}
              aria-label="Send test email"
            >
              <Mail className="size-4" />
              <span className="hidden sm:inline text-xs">Test</span>
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onAuditLogClick}>
             Alert Log
          </Button>
        </div>
      </div>

      {/* Configuration Dialog (pop-out) */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-0">
          <DialogHeader className="p-4">
            <DialogTitle className="text-lg font-semibold">Notifications Configuration</DialogTitle>
          </DialogHeader>
          <div className="p-0">
            <ConfigBox onSave={handleConfigSave} />
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {patientIds.map((pid) => {
          const pData = patients[pid];
          const { level, message } = calculateStatus(pData);
          
          const borderColor = level === 'critical' ? 'border-red-500' : level === 'concern' ? 'border-amber-400' : 'border-emerald-500';
          const statusColor = level === 'critical' ? 'text-red-600 bg-red-50' : level === 'concern' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
          
          // Get latest values
          const temp = getLatest(pData, 'temperature');
          const hr = getLatest(pData, 'heartRate');
          const spo2 = getLatest(pData, 'spo2');
          const resp = getLatest(pData, 'respiratoryRate');
          const bp = getLatestBP(pData);
          const pain = getLatest(pData, 'pain_scale');

          return (
            <Card key={pid} className={cn("overflow-hidden transition-all hover:shadow-md border-l-4", borderColor)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold text-slate-800 uppercase">{pid}</CardTitle>
                <Badge variant="outline" className={cn("font-semibold capitalize border-0", statusColor)}>
                  {level}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Temperature</p>
                    <div className="flex items-center gap-1">
                      <Thermometer className="h-3 w-3 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{temp === '--' ? '--' : `${temp}°C`}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Heart Rate</p>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{hr === '--' ? '--' : `${hr} bpm`}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">SpO2</p>
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{spo2 === '--' ? '--' : `${spo2}%`}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Resp. Rate</p>
                    <div className="flex items-center gap-1">
                      <Wind className="h-3 w-3 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{resp === '--' ? '--' : `${resp}`}</span>
                    </div>
                  </div>

                  {/* Blood Pressure */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Blood Pressure</p>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{bp}</span>
                    </div>
                  </div>

                  {/* Pain Scale */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Pain Scale</p>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-start gap-2">
                        <span className="text-sm font-bold text-slate-700">{pain === '--' ? '--' : `${pain}/10`}</span>
                      </div>
                      {/* visual bar */}
                      <div className="w-full rounded-full bg-slate-100 h-2">
                        <div
                          className={cn("h-2 rounded-full", pain && Number(pain) >= 7 ? "bg-red-400" : pain && Number(pain) >= 4 ? "bg-amber-400" : "bg-emerald-400")}
                          style={{ width: pain === '--' ? '0%' : `${Math.min(100, Math.max(0, Number(pain) * 10))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
                <div className={cn("mt-4 rounded-md p-2 text-center text-xs font-medium", statusColor)}>
                  {message}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
