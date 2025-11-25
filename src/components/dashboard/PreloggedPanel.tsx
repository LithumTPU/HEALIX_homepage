import React, { useState, useMemo, useEffect } from 'react';
import { usePatients } from '../../lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { FileSpreadsheet, Send, Clock, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { db } from '../../lib/firebase';
import { ref, set } from 'firebase/database';

const TTS_API_URL = 'http://127.0.0.1:5001/api/tts';

export function PreloggedPanel() {
  const { patients } = usePatients();
  const [selection, setSelection] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Generate options
  const options = useMemo(() => {
    const opts: { value: string, label: string, pid: string, idx: number }[] = [];
    Object.keys(patients).forEach(pid => {
      const p = patients[pid];
      const timestamps = Array.isArray(p.timestamp) ? p.timestamp : [];
      timestamps.forEach((ts, idx) => {
        opts.push({
          value: `${pid}|${idx}`,
          label: `${pid.toUpperCase()} - ${ts || `Entry ${idx}`}`,
          pid,
          idx
        });
      });
    });
    return opts.reverse();
  }, [patients]);

  // Auto-select most-recent record when available so the Send button isn't blocked by empty selection.
  useEffect(() => {
    if (!selection && options.length > 0) {
      setSelection(options[0].value);
    }
  }, [options, selection]);

  const selectedData = useMemo(() => {
    if (!selection) return null;
    const [pid, idxStr] = selection.split('|');
    const idx = parseInt(idxStr);
    const p = patients[pid];
    if (!p) return null;
    
    const getVal = (arr: any[]) => (Array.isArray(arr) && arr[idx] !== undefined ? arr[idx] : '--');
    
    return {
      pid,
      temp: getVal(p.temperature || []),
      pulse: getVal(p.heartRate || []),
      resp: getVal(p.respiratoryRate || []),
      spo2: getVal(p.spo2 || []),
      pain: getVal(p.pain_scale || []),
      bp: `${getVal(p.systolic || [])}/${getVal(p.diastolic || [])}`,
      food: getVal(p.food || [])
    };
  }, [selection, patients]);

  const handleSendMsg = async () => {
    if (!message.trim()) {
      toast.error('Please type a message before sending');
      return;
    }
    // Determine patient id: prefer explicit selection, otherwise fallback to most-recent option, otherwise "unknown"
    const pid = selection ? selection.split('|')[0] : (options[0]?.pid || 'unknown');
     setSending(true);
     try {
        console.info(`[SendToPatient] Writing message for ${pid}`);
        const firebaseToast = toast.loading('Updating patient feed...', { duration: 4000 });
        await set(ref(db, 'Doctor_message'), message);
        toast.success('Message synced with Firebase', { id: firebaseToast, duration: 2000 });

        console.info('[SendToPatient] Requesting voice playback');
        const voiceToast = toast.loading('Generating WAV...', { duration: 4000 });
        const resp = await fetch(TTS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message, voice: 'Aaliyah-PlayAI' })
        });

        if (!resp.ok) {
          let errText = `TTS server returned ${resp.status}`;
          try {
            const payload = await resp.json();
            errText = payload?.error || errText;
          } catch {
            // ignore
          }
          toast.error(`Audio generation failed: ${errText}`, { id: voiceToast });
          throw new Error(errText);
        }

        const blob = await resp.blob();
        const filename = `healix_message_${pid}_${Date.now()}.wav`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast.success('Voice file downloaded', { id: voiceToast, duration: 2000 });
        toast('Message sent to patient', { duration: 2000 });
        setMessage('');
     } catch (err) {
        console.error('[SendToPatient] flow failed', err);
        toast.error("Failed to send message or start TTS");
     } finally {
         setSending(false);
     }
   };

  const handleExport = () => {
    try {
        const rows: any[] = [];
        Object.keys(patients).forEach(pid => {
            const p = patients[pid];
            const timestamps = Array.isArray(p.timestamp) ? p.timestamp : [];
            timestamps.forEach((ts, i) => {
                rows.push({
                    Patient: pid,
                    Timestamp: ts,
                    Temperature: p.temperature?.[i],
                    HeartRate: p.heartRate?.[i],
                    RespRate: p.respiratoryRate?.[i],
                    SpO2: p.spo2?.[i],
                    BP_Sys: p.systolic?.[i],
                    BP_Dia: p.diastolic?.[i],
                    Pain: p.pain_scale?.[i],
                    Food: p.food?.[i]
                });
            });
        });
        
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Patients');
        XLSX.writeFile(wb, `healix_export_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Export successful");
    } catch (e) {
        toast.error("Export failed");
    }
  };

  return (
    <Card className="h-full border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Clock className="h-5 w-5 text-indigo-600" />
          Historical Data & Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        
        <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Record</label>
            <div className="relative">
                <select 
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={selection}
                    onChange={(e) => setSelection(e.target.value)}
                >
                    <option value="">-- Select Patient / Timestamp --</option>
                    {options.slice(0, 100).map(opt => ( // Limit to 100 recent for perf
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <User className="h-4 w-4" />
                </div>
            </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
            {[
                { label: 'Temperature', value: selectedData?.temp, unit: '°C' },
                { label: 'Pulse', value: selectedData?.pulse, unit: 'bpm' },
                { label: 'Resp. Rate', value: selectedData?.resp, unit: 'br/min' },
                { label: 'SpO2', value: selectedData?.spo2, unit: '%' },
                { label: 'BP', value: selectedData?.bp, unit: '' },
                { label: 'Pain Scale', value: selectedData?.pain, unit: '/10' }
            ].map((item, i) => (
                <div key={i} className="space-y-1">
                    <p className="text-xs font-medium text-slate-400">{item.label}</p>
                    <p className="text-sm font-bold text-slate-800">{item.value || '--'}{item.value && item.value !== '--' ? item.unit : ''}</p>
                </div>
            ))}
            <div className="col-span-2 pt-2 border-t border-slate-200 mt-2">
                 <p className="text-xs font-medium text-slate-400">Food Status</p>
                 <div className="flex items-center gap-2 mt-1">
                     <div className={`h-2 w-2 rounded-full ${selectedData?.food == 1 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                     <span className="text-sm font-bold text-slate-800">{selectedData?.food == 1 ? 'Requested' : 'Not Requested'}</span>
                 </div>
            </div>
        </div>

        <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Send Message</label>
            <div className="relative">
                <Textarea 
                    className="min-h-[80px] resize-none pr-12" 
                    placeholder="Type message for patient..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <Button 
                    type="button"
                    size="icon" 
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={sending || !message.trim()}
                    onClick={handleSendMsg}
                    aria-label="Send message to patient"
                >
                    <Send className="h-4 w-4 text-white" />
                </Button>
             </div>
             <p className="text-center text-xs text-slate-400">Pressing send streams the patient voice message instantly</p>
         </div>
 
         <Button variant="outline" className="w-full" onClick={handleExport}>
             <FileSpreadsheet className="mr-2 h-4 w-4" />
             Export All Data (Excel)
         </Button>
 
       </CardContent>
     </Card>
   );
 }
