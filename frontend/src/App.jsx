import React, { useState } from 'react';
import { Target, Activity, PieChart, Info, Network } from 'lucide-react';
import ThreeCanvas from './components/ThreeCanvas';
import Landing from './Landing';
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import './index.css';

export default function App() {
  const [view, setView] = useState('landing');
  const [results, setResults] = useState(null);
  const [validatedAlerts, setValidatedAlerts] = useState([]);
  
  return (
    <>
      <ThreeCanvas results={results} view={view} validatedAlerts={validatedAlerts} />
      
      {/* GLOBAL NAVIGATION SIDEBAR */}
      {view !== 'landing' && (
          <div className="nav-sidebar">
              <div className="nav-logo" onClick={() => setView('landing')} title="Briefing"><Network size={28} color="var(--accent)" /></div>
              <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')} title="Defense Grid">
                  <Activity size={24} />
                  <span>GRID</span>
              </button>
              <button className={`nav-btn ${view === 'analytics' ? 'active' : ''}`} onClick={() => setView('analytics')} title="Model Analytics">
                  <PieChart size={24} />
                  <span>XAI</span>
              </button>
          </div>
      )}

      {view === 'landing' && <Landing onEnter={() => setView('dashboard')} />}
      {view === 'dashboard' && <Dashboard results={results} setResults={setResults} onBack={() => setView('landing')} validatedAlerts={validatedAlerts} setValidatedAlerts={setValidatedAlerts} />}
      {view === 'analytics' && <Analytics onBack={() => setView('dashboard')} />}
    </>
  );
}
