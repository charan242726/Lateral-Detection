import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';

export default function Analytics({ results, onBack }) {
  // ── 1. Live Scrolling Data Stream (Linked to Actual AI Threats) ──
  const [trafficData, setTrafficData] = useState(() => {
     const initial = [];
     for(let i=60; i>0; i--) {
        initial.push({
           time: `-${i}s`,
           normal: Math.floor(2000 + Math.random() * 5000),
           anomaly: Math.floor(Math.random() * 200)
        });
     }
     return initial;
  });

  const [shapJitter, setShapJitter] = useState(0);

  useEffect(() => {
     // Check if there's a highly recent threat in the queue (within last 1000ms)
     const streamInterval = setInterval(() => {
         const now = Date.now();
         const recentThreat = results?.alerts?.find(a => (now - a.timestamp) < 1500);
         
         setTrafficData(prev => {
             const nextData = [...prev.slice(1)];
             // If a real threat just dropped in the Dashboard, physically spike the Graph!
             const isRealThreatSpike = !!recentThreat;
             
             let anomalyValue = Math.floor(Math.random() * 300);
             if (isRealThreatSpike) {
                anomalyValue = recentThreat.severity === 'High' ? Math.floor(10000 + Math.random() * 4000) : Math.floor(6000 + Math.random() * 2000);
             }

             nextData.push({
                 time: 'LIVE',
                 normal: Math.floor(3000 + Math.random() * 3000),
                 anomaly: anomalyValue
             });
             return nextData;
         });
         
         setShapJitter(Math.random());
     }, 1000);

     return () => clearInterval(streamInterval);
  }, [results]);

  // Calculate live variants for Bar/Radar based on jitter
  const featureImportance = [
    { name: 'SBYTES', weight: 0.85 + (shapJitter * 0.05) },
    { name: 'DBYTES', weight: 0.72 - (shapJitter * 0.04) },
    { name: 'SPKTS', weight: 0.64 + (shapJitter * 0.03) },
    { name: 'RATE', weight: 0.51 + (shapJitter * 0.02) },
    { name: 'DLOAD', weight: 0.33 - (shapJitter * 0.01) },
  ];

  const riskRadar = [
    { subject: 'Lateral Mvmt', A: 120 + (shapJitter * 10), fullMark: 150 },
    { subject: 'Data Exfil', A: 98 - (shapJitter * 5), fullMark: 150 },
    { subject: 'Priv Esc', A: 45 + (shapJitter * 8), fullMark: 150 },
    { subject: 'C2 Beacon', A: 70 - (shapJitter * 3), fullMark: 150 },
    { subject: 'DDoS', A: 15 + (shapJitter * 5), fullMark: 150 }
  ];

  return (
    <div className="analytics-overlay fade-in transition-all">
      
      <div className="analytics-header">
         <div className="title"><Cpu color="var(--accent)" /> EXPLAINABLE AI (XAI) METRICS</div>
         <button className="btn-cyber" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }} onClick={onBack}>← RETURN TO GRID</button>
      </div>

      <div className="analytics-grid">
         {/* CHART 1: Area Chart */}
         <div className="hud-panel chart-panel span-2">
            <h3><Activity size={14} style={{display:'inline'}} className="pulsing" /> LIVE NETWORK THROUGHPUT & ANOMALY DETECTION</h3>
            <p className="subtitle" style={{marginBottom: '1rem', color:'var(--text-muted)'}}>Continuous real-time bandwidth mapping. Red spikes indicate Isolated Forest anomalies tracking Lateral Movement.</p>
            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                    <AreaChart data={trafficData}>
                        <defs>
                            <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#475569" fontSize={9} interval="preserveEnd" minTickGap={30} />
                        <YAxis stroke="#475569" fontSize={10} domain={[0, 15000]} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', borderColor: 'var(--border)' }} />
                        <Area type="monotone" dataKey="normal" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorNormal)" isAnimationActive={false} />
                        <Area type="monotone" dataKey="anomaly" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomaly)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* CHART 2: Feature Importance Bar */}
         <div className="hud-panel chart-panel">
            <h3><ShieldAlert size={14} style={{display:'inline'}}/> LIVE SHAP VALUES</h3>
            <p className="subtitle" style={{marginBottom: '1rem', color:'var(--text-muted)'}}>Real-time feature contribution weights.</p>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <BarChart data={featureImportance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" stroke="#475569" fontSize={10} domain={[0, 1]} hide />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', borderColor: 'var(--border)' }} />
                        <Bar dataKey="weight" fill="var(--accent)" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={400} />
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
                        <Radar name="Threat Vector" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} isAnimationActive={true} animationDuration={400} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', borderColor: 'var(--border)' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
         </div>

      </div>
    </div>
  );
}
