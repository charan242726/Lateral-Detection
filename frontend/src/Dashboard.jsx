import React, { useState } from 'react';
import axios from 'axios';
import { Shield, Zap, RefreshCw, Cpu, AlertTriangle, Settings, UserCheck, ShieldCheck, Activity, Target } from 'lucide-react';

const API_BASE = '/api';

export default function Dashboard({ results, setResults, onBack }) {
  const [dataSrc, setDataSrc] = useState('synthetic');
  const [file, setFile] = useState(null);
  const [contamination, setContamination] = useState(0.10);
  const [ctxWeight, setCtxWeight] = useState(0.25);
  const [sampleSize, setSampleSize] = useState(20000);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validatedAlerts, setValidatedAlerts] = useState([]);

  const handleRun = async () => {
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('data_source', dataSrc);
      fd.append('contamination', contamination);
      fd.append('context_weight', ctxWeight);
      fd.append('sample_size', sampleSize);
      if (dataSrc === 'file' && file) fd.append('file', file);
      
      const res = await axios.post(`${API_BASE}/run-detection`, fd);
      if (res.data.status === 'success') {
        setResults({
          metrics: res.data.metrics,
          alerts: res.data.alerts,
          total: res.data.total_events,
          flagged: res.data.flagged_events
        });
        setValidatedAlerts([]);
      }
    } catch (err) {
      console.warn("Backend Unreachable. Engaging Interactive Demo Mode for GitHub Pages.");
      const mockAlerts = [];
      const sev = ['High', 'High', 'Medium', 'Medium', 'Low'];
      for(let i=0; i<35; i++) {
         mockAlerts.push({
             severity: sev[Math.floor(Math.random()*sev.length)],
             anomaly_score: (0.15 + Math.random()*0.1).toFixed(4),
             sbytes: 1000 + Math.random()*50000,
             dbytes: 500 + Math.random()*20000,
             spkts: Math.floor(10 + Math.random()*100),
             true_label: Math.random() > 0.3 ? 1 : 0
         });
      }
      setResults({
          metrics: { f1_score: 0.9102, auc_roc: 0.9544, fpr: 0.0381, precision: 0.8842 },
          alerts: mockAlerts.sort((a,b) => b.anomaly_score - a.anomaly_score),
          total: sampleSize,
          flagged: Math.floor(sampleSize * contamination * 1.1)
      });
      setValidatedAlerts([]);
      setError("SERVER OFFLINE. ACTIVE DEMO MODE ENGAGED.");
    } finally {
      setLoading(false);
    }
  };

  const validateAlert = (idx, isRealThreat) => {
      setValidatedAlerts(prev => [...prev, { idx, isRealThreat }]);
  };

  return (
    <div className="hud-overlay fade-in transition-all">
      {/* TOP LEFT: PROJECT MOTIVE & TITLE */}
      <div className="hud-panel hud-top-left">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="title"><Shield color="var(--accent)" /> LATERAL SHIELD</div>
              <div className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: results ? 'var(--success)' : 'var(--accent)', boxShadow: `0 0 10px ${results ? 'var(--success)' : 'var(--accent)'}` }} className="pulsing" />
                AI DEFENSE GRID: {results ? 'ACTIVE' : 'STANDBY'}
              </div>
            </div>
            <button onClick={onBack} style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.75rem', textDecoration:'underline' }}>
                [ RETURN TO BRIEFING ]
            </button>
        </div>
        
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
           <div style={{ background: 'rgba(56, 189, 248, 0.05)', borderLeft: '2px solid var(--accent)', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
               <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}><Target size={12} style={{display:'inline'}}/> MISSION OBJECTIVE</strong>
               Detecting attackers moving between internal network nodes to reach sensitive databases (Lateral Movement).
           </div>
           
           <div style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '2px solid var(--warn)', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
               <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}><UserCheck size={12} style={{display:'inline'}}/> FALSE POSITIVE MANAGEMENT</strong>
               Risk-based analysis prevents blind blocking of legitimate employees. Low risk anomalies are monitored, High risk are escalated for Human validation.
           </div>
        </div>
      </div>
      
      {/* BOTTOM LEFT: AI THRESHOLD TUNING ENGINE */}
      <div className="hud-panel hud-bottom-left">
        <h3><Settings size={14} style={{ display:'inline', verticalAlign:'middle'}} /> AI THRESHOLD & SENSITIVITY (TUNING)</h3>
        
        <div className="field">
          <div className="field-row"><span>DATA_INGEST_SOURCE</span><span style={{ color:'var(--text-muted)' }}>{dataSrc.toUpperCase()}</span></div>
          <select className="input-hud" value={dataSrc} onChange={e=>setDataSrc(e.target.value)}>
            <option value="synthetic">SIM_TRAFFIC (Synthetic)</option>
            <option value="file">INGEST_STREAM (PCAP/CSV)</option>
          </select>
        </div>

        <div className="field">
          <div className="field-row">
            <span>DETECTION_SENSITIVITY (Contamination)</span>
            <span>{(contamination*100).toFixed(0)}%</span>
          </div>
          <input type="range" min={0.01} max={0.30} step={0.01} value={contamination} onChange={e=>setContamination(parseFloat(e.target.value))} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Adjust sensitivity to balance Precision vs Recall (False Positives)</span>
        </div>

        {error && <div style={{ fontSize:'0.75rem', color:'var(--danger)', padding:'0.5rem', background:'rgba(248,113,113,0.1)', border:'1px solid var(--danger)', borderRadius:4 }}>{error}</div>}

        <button className="btn-cyber" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleRun} disabled={loading}>
          {loading ? <RefreshCw size={16} className="spinning" /> : <Activity size={16} />}
          {loading ? 'ANALYZING TOPOLOGY...' : 'EXECUTE ISOLATION FOREST'}
        </button>
      </div>

      {/* TOP RIGHT: LATERAL MOVEMENT METRICS */}
      <div className="hud-panel hud-top-right">
        <h3><Cpu size={14} style={{ display:'inline', verticalAlign:'middle'}} /> DETECTION TELEMETRY</h3>
        {results ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>F1_SCORE (ACCURACY)</div>
              <div className="mono" style={{ fontSize:'1.6rem', color:'var(--accent)', textShadow:'0 0 10px var(--accent-glow)' }}>{results.metrics.f1_score}</div>
            </div>
            <div>
              <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>FALSE_POSITIVE_RATE</div>
              <div className="mono" style={{ fontSize:'1.6rem', color:'var(--warn)', textShadow:'0 0 10px rgba(245, 158, 11, 0.4)' }}>{results.metrics.fpr}</div>
            </div>
            <div>
              <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>EVENTS_SCANNED</div>
              <div className="mono" style={{ fontSize:'1.4rem', color:'var(--text-muted)' }}>{results.total.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>ANOMALIES_CAUGHT</div>
              <div className="mono" style={{ fontSize:'1.6rem', color:'var(--danger)', textShadow:'0 0 10px var(--danger-glow)' }}>{results.flagged}</div>
            </div>
          </div>
        ) : (
           <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>[ AWAITING EXECUTION ]</p>
        )}
      </div>

      {/* BOTTOM RIGHT: RISK-BASED HUMAN VALIDATION QUEUE */}
      <div className="hud-panel hud-bottom-right" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '0.5rem' }}>
          <h3><AlertTriangle size={14} style={{ display:'inline', verticalAlign:'middle'}} /> RISK-BASED ALERT QUEUE</h3>
          {results && <div style={{ fontSize:'0.65rem', color:'var(--danger)' }} className="pulsing">HUMAN REVIEW REQUIRED</div>}
        </div>
        
        <div className="alert-list" style={{ flex: 1 }}>
          {!results ? (
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', marginTop:'3rem' }}>
                  [ NO ACTIVE THREATS TRACED ]
              </div>
          ) : (results.alerts.length === 0 ? (
              <div style={{ fontSize:'0.75rem', color:'var(--success)', textAlign:'center', marginTop:'3rem' }}>
                  <ShieldCheck size={32} style={{ margin: '0 auto 1rem' }} />
                  NETWORK SECURE — 0 ANOMALIES DETECTED
              </div>
          ) : (
              results.alerts.slice(0, 15).map((a, i) => {
                  const validation = validatedAlerts.find(v => v.idx === i);
                  const riskColor = a.severity === 'High' ? 'var(--danger)' : (a.severity === 'Medium' ? 'var(--warn)' : 'var(--text-muted)');
                  
                  return (
                  <div className="alert-item" key={i} style={{ borderLeftColor: riskColor }}>
                      <div style={{ flex: 1 }}>
                         <div style={{ color: '#fff', fontSize:'0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                             <span>{a.severity.toUpperCase()} RISK EVENT</span>
                             <span className="alert-score" style={{ color: riskColor }}>{Number(a.anomaly_score).toFixed(3)}</span>
                         </div>
                         <div style={{ color:'var(--text-muted)', fontSize:'0.6rem', marginTop:'0.3rem' }}>
                             LATERAL PATH: Node_A → Node_B <br/>
                             {Math.round(a.sbytes)} BYTES TRANSFERRED
                         </div>
                         
                         {/* Human-in-the-loop verification UI */}
                         <div style={{ marginTop: '0.6rem', borderTop: '1px dotted rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                             {validation ? (
                                 <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: validation.isRealThreat ? 'var(--danger)' : 'var(--success)' }}>
                                     {validation.isRealThreat ? '🚨 ESCALATED TO SOC' : '✅ MARKED AS FALSE POSITIVE'}
                                 </span>
                             ) : (
                                 <div style={{ display: 'flex', gap: '0.5rem' }}>
                                     <button onClick={() => validateAlert(i, false)} style={{ flex: 1, background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 4, cursor: 'pointer', padding: '0.2rem', fontSize: '0.6rem' }}>
                                         Allow (False Pos)
                                     </button>
                                     {a.severity !== 'Low' && (
                                         <button onClick={() => validateAlert(i, true)} style={{ flex: 1, background: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 4, cursor: 'pointer', padding: '0.2rem', fontSize: '0.6rem' }}>
                                             Block Threat
                                         </button>
                                     )}
                                 </div>
                             )}
                         </div>
                      </div>
                  </div>
              )})
          ))}
        </div>
      </div>
    </div>
  );
}
