import React from 'react';
import { Shield, Brain, Crosshair, Network, Cpu, ArrowRight } from 'lucide-react';
import './index.css';

export default function Landing({ onEnter }) {
  return (
    <div className="landing-overlay fade-in transition-all">
      <div className="landing-content">
        <h1 className="landing-title glow-text mx-auto text-center" style={{ fontSize: '4.5rem', marginBottom: '1rem', marginTop: '10vh' }}>
          <Shield size={64} style={{ display:'inline', verticalAlign:'middle', marginRight: 15 }} color="var(--accent)" /> 
          LATERAL SHIELD
        </h1>
        <h2 className="subtitle text-center" style={{ fontSize: '1.2rem', marginBottom: '4rem', color: 'var(--accent)' }}>
          CONTEXT-AWARE LATERAL MOVEMENT ANOMALY DETECTION
        </h2>

        <div className="explainer-grid">
          
          <div className="explainer-card">
            <h3><Network size={20} /> 1. DEFEATING LATERAL MOVEMENT</h3>
            <p>
              Once an attacker breaches initial defenses (via phishing or malware), they don't immediately steal data. 
              Instead, they stealthily traverse internal networks—moving from a compromised workstation to sensitive databases 
              or admin servers. This is called <strong>Lateral Movement</strong>. Our mission is to detect these internal hops using AI.
            </p>
          </div>

          <div className="explainer-card">
            <h3><Brain size={20} /> 2. UNSUPERVISED ISOLATION FOREST</h3>
            <p>
              Traditional rules-based detection fails against zero-day lateral movements. We deployed an <strong>Isolation Forest</strong> model 
              that learns the <em>normal</em> behavior profile of your network. When anomalous internal traffic occurs, it mathematically 
              isolates it, generating an anomaly score without needing labeled attack data.
            </p>
          </div>

          <div className="explainer-card">
            <h3><Crosshair size={20} /> 3. THE FALSE POSITIVE DILEMMA</h3>
            <p>
              Machine Learning in cybersecurity is plagued by a critical problem: <strong>False Positives</strong>. A legitimate employee
              working from a new location might get flagged as an anomaly. Blindly blocking them damages productivity. 
              Our system actively addresses this reality.
            </p>
          </div>

          <div className="explainer-card">
            <h3><Cpu size={20} /> 4. OUR HYBRID SOLUTION</h3>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', opacity: 0.8, fontSize: '0.9rem' }}>
              <li><strong>Risk-Based Thresholds:</strong> Low-risk anomalies are monitored. High-risk actions trigger escalation.</li>
              <li><strong>Human-in-the-Loop:</strong> The AI doesn't dictate; it empowers human analysts to validate threats.</li>
              <li><strong>Continuous Tuning:</strong> Contamination levels are tuned to perfectly balance Recall vs Precision.</li>
            </ul>
          </div>

        </div>

        {/* COMPARISON TABLE */}
        <div style={{ marginTop: '3rem', overflowX: 'auto' }}>
          <h3 style={{ textAlign: 'center', color: 'var(--accent)', fontSize: '1rem', marginBottom: '1rem', letterSpacing: 2 }}>VS. ENTERPRISE TOOLS</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: 'rgba(56,189,248,0.08)' }}>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontWeight: 400 }}>CAPABILITY</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#ef4444', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Darktrace / Splunk</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'center', color: 'var(--accent)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>LateralShield</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Lateral Movement Detection',  '✅ Yes', '✅ Yes'],
                ['Explainable AI (XAI / SHAP)',  '❌ Black Box', '✅ Full SHAP + Narratives'],
                ['Active Deception (Honeypots)', '❌ Not Included', '✅ TrapWeave (Dynamic)'],
                ['MITRE ATT&CK Mapping',         '⚠️ Premium Add-on', '✅ Built-in, Per Alert'],
                ['Agent Installation Required',  '✅ Full Agent Stack', '❌ Agentless'],
                ['Cost',                         '💰 $100k+ / year', '🆓 Open Source, Free'],
                ['Human-in-the-Loop Validation', '❌ Auto-block only', '✅ Core Feature'],
              ].map(([feat, them, us], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <td style={{ padding: '0.5rem 1rem', color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{feat}</td>
                  <td style={{ padding: '0.5rem 1rem', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{them}</td>
                  <td style={{ padding: '0.5rem 1rem', textAlign: 'center', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button className="btn-cyber giant-btn" onClick={onEnter}>
             ENTER DEFENSE GRID <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
