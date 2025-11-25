import React, { useState } from 'react';
import { useRealtimeData, useSystem } from '../../lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Activity, Save, Utensils, Heart, Wind, Droplets } from 'lucide-react';
import { db } from '../../lib/firebase';
import { ref, get, update, set } from 'firebase/database';
import { toast } from "sonner";

export function RealTimePanel() {
  const { data } = useRealtimeData();
  const { foodRequest, toggleFoodRequest, setSystemMode, mode } = useSystem();
  
  // Local state for selections
  const [selections, setSelections] = useState<{[key: string]: string}>({
    temp: 'patient1',
    pulse: 'patient1',
    resp: 'patient1',
    spo2: 'patient1',
    bp: 'patient1'
  });
  
  const [foodPatient, setFoodPatient] = useState('patient1');

  const handleSelectionChange = (vital: string, patient: string) => {
    setSelections(prev => ({ ...prev, [vital]: patient }));
  };

  const saveVital = async (vitalKey: string, dbKey: string, label: string) => {
    if (!data) return;
    const patientId = selections[vitalKey];
    const val = data[dbKey]; // Adjust based on incoming data structure
    
    // Flexible data access
    const getVal = (obj: any, keys: string[]) => {
        for (const k of keys) {
            if (obj && obj[k] !== undefined) return obj[k];
        }
        return null;
    };

    // Map vitalKey to actual data keys
    let value: any = null;
    if (vitalKey === 'temp') value = getVal(data, ['temperature', 'temp', 'tempC', 't']);
    if (vitalKey === 'pulse') value = getVal(data, ['heartRate', 'heart_rate', 'hr', 'pulse']);
    if (vitalKey === 'resp') value = getVal(data, ['respiratoryRate', 'resp', 'respiratory_rate', 'rr']);
    if (vitalKey === 'spo2') value = getVal(data, ['spo2', 'SpO2', 'saturation']);
    if (vitalKey === 'bp') {
        const sys = getVal(data, ['systolic', 'sys']);
        const dia = getVal(data, ['diastolic', 'dia']);
        if (sys && dia) value = { sys, dia };
    }

    if (value === null) {
        toast.error(`No data for ${label}`);
        return;
    }

    try {
        const now = new Date();
        // Format to local time YYYY-MM-DD HH:mm:ss to match the clock
        const timestamp = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0') + ' ' + 
            String(now.getHours()).padStart(2, '0') + ':' + 
            String(now.getMinutes()).padStart(2, '0') + ':' + 
            String(now.getSeconds()).padStart(2, '0');

        const patientRef = ref(db, `patients/${patientId}`);
        const snap = await get(patientRef);
        const pData = snap.val() || {};
        
        // Determine index
        const idx = Array.isArray(pData.timestamp) ? pData.timestamp.length : 0;
        
        const updates: any = {};
        updates[`patients/${patientId}/timestamp/${idx}`] = timestamp;
        updates[`patients/${patientId}/patient/${idx}`] = patientId === 'patient1' ? 1 : patientId === 'patient2' ? 2 : 3;

        if (vitalKey === 'bp' && typeof value === 'object') {
            updates[`patients/${patientId}/systolic/${idx}`] = Number(value.sys);
            updates[`patients/${patientId}/diastolic/${idx}`] = Number(value.dia);
        } else if (vitalKey === 'temp') {
            updates[`patients/${patientId}/temperature/${idx}`] = Number(value);
        } else if (vitalKey === 'pulse') {
            updates[`patients/${patientId}/heartRate/${idx}`] = Number(value);
        } else if (vitalKey === 'resp') {
            updates[`patients/${patientId}/respiratoryRate/${idx}`] = Number(value);
        } else if (vitalKey === 'spo2') {
            updates[`patients/${patientId}/spo2/${idx}`] = Number(value);
        }

        await update(ref(db), updates);
        toast.success(`Saved ${label} to ${patientId}`);
    } catch (err) {
        console.error(err);
        toast.error("Failed to save data");
    }
  };

  const handleFoodProvide = async () => {
    const now = new Date();
    const ts = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0') + ':' + 
        String(now.getSeconds()).padStart(2, '0');

    try {
        // Set system request
        await set(ref(db, 'system/foodRequest'), 1);
        
        // Log to patient
        const foodLogRef = ref(db, `patients/${foodPatient}/food_provided`);
        const snap = await get(foodLogRef);
        const arr = Array.isArray(snap.val()) ? snap.val() : [];
        arr.push(ts);
        await set(foodLogRef, arr);

        toast.success(`Food provided for ${foodPatient}`);
        
        // Auto reset after 1.5s
        setTimeout(() => {
            set(ref(db, 'system/foodRequest'), 0);
        }, 1500);
    } catch (err) {
        toast.error("Failed to provide food");
    }
  };

  const getValueDisplay = (keys: string[], unit: string = '') => {
    if (!data) return '--';
    for (const k of keys) {
        if (data[k] !== undefined) return `${Number(data[k]).toFixed(k === 'temperature' ? 1 : 0)}${unit}`;
    }
    return '--';
  };
  
  const getBPDisplay = () => {
      if (!data) return '--';
      const sys = data.systolic || data.sys;
      const dia = data.diastolic || data.dia;
      if (sys && dia) return `${Math.round(sys)}/${Math.round(dia)} mmHg`;
      return '--';
  };

  return (
    <Card className="h-full border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Activity className="h-5 w-5 text-teal-600" />
            Real Time Stream
          </CardTitle>
          {data ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Live</Badge>
          ) : (
            <Badge variant="secondary">Connecting...</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        
        {/* Food Section */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Food Request</span>
                <div className={`h-2 w-2 rounded-full ${foodRequest ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`} />
            </div>
            <div className="flex gap-2">
                <select 
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    value={foodPatient}
                    onChange={(e) => setFoodPatient(e.target.value)}
                >
                    <option value="patient1">Patient 1</option>
                    <option value="patient2">Patient 2</option>
                    <option value="patient3">Patient 3</option>
                </select>
                <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700" onClick={handleFoodProvide}>
                    Provide
                </Button>
            </div>
          </div>
        </div>

        {/* Vitals Rows */}
        <div className="space-y-4">
           {[
               { label: 'Temperature', key: 'temp', unit: '°C', value: getValueDisplay(['temperature', 'temp', 'tempC', 't'], '°C') },
               { label: 'Pulse', key: 'pulse', unit: 'bpm', value: getValueDisplay(['heartRate', 'heart_rate', 'hr', 'pulse'], ' bpm') },
               { label: 'Resp. Rate', key: 'resp', unit: 'br/min', value: getValueDisplay(['respiratoryRate', 'resp', 'rr'], ' br/min') },
               { label: 'SpO2', key: 'spo2', unit: '%', value: getValueDisplay(['spo2', 'saturation'], '%') },
               { label: 'Blood Pressure', key: 'bp', unit: '', value: getBPDisplay() }
           ].map((vital) => (
               <div key={vital.key} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center">
                   <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                            {vital.key === 'temp' && <Activity className="h-5 w-5" />}
                            {vital.key === 'pulse' && <Heart className="h-5 w-5" />}
                            {vital.key === 'resp' && <Wind className="h-5 w-5" />}
                            {vital.key === 'spo2' && <Droplets className="h-5 w-5" />}
                            {vital.key === 'bp' && <Activity className="h-5 w-5" />}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{vital.label}</p>
                            <p className="text-lg font-bold text-slate-900">{vital.value}</p>
                        </div>
                   </div>
                   <div className="flex items-center gap-2">
                        <select 
                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 focus:border-teal-500 focus:outline-none"
                            value={selections[vital.key]}
                            onChange={(e) => handleSelectionChange(vital.key, e.target.value)}
                        >
                            <option value="patient1">Pt 1</option>
                            <option value="patient2">Pt 2</option>
                            <option value="patient3">Pt 3</option>
                        </select>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-teal-600"
                            onClick={() => saveVital(vital.key, vital.key, vital.label)}
                        >
                            <Save className="h-4 w-4" />
                        </Button>
                   </div>
               </div>
           ))}
        </div>

        {/* Modes */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="text-sm font-semibold text-slate-900">System Mode</label>
            <select 
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                value={mode}
                onChange={(e) => setSystemMode(Number(e.target.value))}
            >
                <option value={0}>Select a mode...</option>
                <option value={1}>Hallway Mode</option>
                <option value={2}>Temperature Mode</option>
                <option value={3}>Other Vitals Mode</option>
                <option value={4}>Pain Scale Mode</option>
                <option value={5}>Send Messages Mode</option>
            </select>
        </div>

      </CardContent>
    </Card>
  );
}
