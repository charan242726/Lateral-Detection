import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';

// Mock Data for gorgeous visualization
const trafficData = Array.from({length: 24}).map((_, i) => ({
    time: `${i}:00`,
    normal: Math.floor(2000 + Math.random() * 5000),
    anomaly: i === 14 ? 12000 : (i === 15 ? 8000 : Math.floor(Math.random() * 500))
}));

const featureImportance = [
    { name: 'SBYTES (Source Bytes)', weight: 0.85 },
    { name: 'DBYTES (Dest Bytes)', weight: 0.72 },
    { name: 'SPKTS (Source Packets)', weight: 0.64 },
    { name: 'RATE (Packets/sec)', weight: 0.51 },
    { name: 'DLOAD (Dest Load)', weight: 0.33 },
];

const riskRadar = [
    { subject: 'Lateral Mvmt', A: 120, fullMark: 150 },
    { subject: 'Data Exfil', A: 98, fullMark: 150 },
    { subject: 'Priv Esc', A: 45, fullMark: 150 },
    { subject: 'C2 Beacon', A: 70, fullMark: 150 },
    { subject: 'DDoS', A: 15, fullMark: 150 }
];

export default function Analytics({ onBack }) {
  return (
    <div className="analytics-overlay fade-in transition-all">
      
      <div className="analytics-header">
         <div className="title"><Cpu color="var(--accent)" /> EXPLAINABLE AI (XAI) METRICS</div>
         <button className="btn-cyber" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }} onClick={onBack}>← RETURN TO GRID</button>
      </div>

      <div className="analytics-grid">
         {/* CHART 1: Area Chart */}
         <div className="hud-panel chart-panel span-2">
            <h3><Activity size={14} style={{display:'inline'}}/> 24-HOUR NETWORK TRAFFIC VOLUME (ISOLATION FOREST OVERLAY)</h3>
            <p className="subtitle" style={{marginBottom: '1rem', color:'var(--text-muted)'}}>Massive spike at 14:00 flagged as highly anomalous Lateral Movement.</p>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <AreaChart data={trafficData}>
                        <defs>
                            <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#475569" fontSize={10} />
                        <YAxis stroke="#475569" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', borderColor: 'var(--border)' }} />
                        <Area type="monotone" dataKey="normal" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorNormal)" />
                        <Area type="monotone" dataKey="anomaly" stroke="#ef4444" fillOpacity={1} fill="url(#colorAnomaly)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* CHART 2: Feature Importance Bar */}
         <div className="hud-panel chart-panel">
            <h3><ShieldAlert size={14} style={{display:'inline'}}/> ISOLATION FOREST SHAP VALUES</h3>
            <p className="subtitle" style={{marginBottom: '1rem', color:'var(--text-muted)'}}>Which features heavily influence anomaly detection?</p>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <BarChart data={featureImportance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" stroke="#475569" fontSize={10} hide />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={100} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', borderColor: 'var(--border)' }} />
                        <Bar dataKey="weight" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>
         
         {/* CHART 3: Radar Risk Vector */}
         <div className="hud-panel chart-panel">
            <h3>TARGET RISK VECTORS</h3>
            <p className="subtitle" style={{marginBottom: '0.5rem', color:'var(--text-muted)'}}>Categorized threat distributions.</p>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskRadar}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar name="Threat Vector" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', borderColor: 'var(--border)' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
         </div>

      </div>
    </div>
  );
}
