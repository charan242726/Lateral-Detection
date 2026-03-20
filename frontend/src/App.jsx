import React, { useState } from 'react';
import ThreeCanvas from './components/ThreeCanvas';
import Landing from './Landing';
import Dashboard from './Dashboard';
import './index.css';

export default function App() {
  const [view, setView] = useState('landing');
  const [results, setResults] = useState(null);
  const [validatedAlerts, setValidatedAlerts] = useState([]);
  
  return (
    <>
      <ThreeCanvas results={results} view={view} validatedAlerts={validatedAlerts} />
      {view === 'landing' ? (
        <Landing onEnter={() => setView('dashboard')} />
      ) : (
        <Dashboard results={results} setResults={setResults} onBack={() => setView('landing')} validatedAlerts={validatedAlerts} setValidatedAlerts={setValidatedAlerts} />
      )}
    </>
  );
}
