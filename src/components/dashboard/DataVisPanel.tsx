import React, { useState, useMemo } from 'react';
import { usePatients, BASELINE_VALUES } from '../../lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart2 } from 'lucide-react';

export function DataVisPanel() {
  const { patients } = usePatients();
  const [selection, setSelection] = useState('patient1_temperature');

  const getBaseline = (vital: string) => {
      if (vital.toLowerCase().includes('temp')) return BASELINE_VALUES.temperature;
      if (vital.toLowerCase().includes('heart') || vital.includes('pulse')) return BASELINE_VALUES.heartRate;
      if (vital.toLowerCase().includes('spo2')) return BASELINE_VALUES.spo2;
      if (vital.toLowerCase().includes('resp')) return BASELINE_VALUES.respiratoryRate;
      if (vital.toLowerCase().includes('sys')) return BASELINE_VALUES.systolic;
      if (vital.toLowerCase().includes('dia')) return BASELINE_VALUES.diastolic;
      return null;
  };

  const chartData = useMemo(() => {
    if (!selection) return [];
    const [pid, field] = selection.split('_');
    const p = patients[pid];
    if (!p) return [];

    const timestamps = Array.isArray(p.timestamp) ? p.timestamp : [];
    
    // Handle different field names in DB vs selection
    let values: any[] = [];
    if (field === 'temperature') values = p.temperature || [];
    else if (field === 'heartRate') values = p.heartRate || [];
    else if (field === 'spo2') values = p.spo2 || [];
    else if (field === 'respiratoryRate') values = p.respiratoryRate || [];
    else if (field === 'systolic') values = p.systolic || [];
    else if (field === 'diastolic') values = p.diastolic || [];
    
    return timestamps.map((ts, i) => ({
        time: ts ? ts.split(' ')[1] : i, 
        value: values[i] !== undefined && values[i] !== '' ? Number(values[i]) : 0,
        fullTime: ts
    })).filter(d => d.value !== 0);
  }, [patients, selection]);

  const baseline = getBaseline(selection.split('_')[1]);

  return (
    <Card className="h-full border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <BarChart2 className="h-5 w-5 text-orange-500" />
                Data Visualization
            </CardTitle>
            <select 
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                value={selection}
                onChange={(e) => setSelection(e.target.value)}
            >
                {['patient1', 'patient2', 'patient3'].map(pid => (
                    <optgroup key={pid} label={pid.toUpperCase()}>
                        <option value={`${pid}_temperature`}>Temperature</option>
                        <option value={`${pid}_heartRate`}>Heart Rate</option>
                        <option value={`${pid}_spo2`}>SpO2</option>
                        <option value={`${pid}_respiratoryRate`}>Resp. Rate</option>
                        <option value={`${pid}_systolic`}>BP Systolic</option>
                        <option value={`${pid}_diastolic`}>BP Diastolic</option>
                    </optgroup>
                ))}
            </select>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="time" 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        domain={['auto', 'auto']}
                        width={40}
                    />
                    <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar 
                        name={selection.split('_')[1]}
                        dataKey="value" 
                        fill="#0d9488" 
                        radius={[4, 4, 0, 0]} 
                        barSize={30}
                    />
                    {baseline && (
                        <ReferenceLine 
                            y={baseline} 
                            label={{ value: 'Baseline', position: 'top', fill: '#ef4444', fontSize: 12 }} 
                            stroke="#ef4444" 
                            strokeDasharray="3 3" 
                        />
                    )}
                </BarChart>
            </ResponsiveContainer>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
            Showing latest {chartData.length} records for {selection.replace('_', ' ').toUpperCase()}
        </p>
      </CardContent>
    </Card>
  );
}
