import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, Box, Cylinder, Line, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// ── 1. The Ocean of Data (10,000 Instanced Particles) ──
function DataOcean({ view }) {
  const meshRef = useRef();
  const particleCount = 10000;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Distribute particles in a massive surrounding sphere/cloud
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < particleCount; i++) {
      const radius = 30 + Math.random() * 120; // Vast
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi) * (Math.random() * 0.5); // Flattened disk
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      temp.push({ x, y, z, offset: Math.random() * Math.PI * 2 });
    }
    return temp;
  }, [particleCount]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      particles.forEach((p, i) => {
        // Create an organic wave motion
        const yOffset = Math.sin(time * 0.5 + p.offset + p.x * 0.05) * 5;
        dummy.position.set(p.x, p.y + yOffset, p.z);
        // Slow global rotation around Y axis done on the group or mesh
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      // Rotate the entire ocean slowly
      meshRef.current.rotation.y = time * 0.02;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, particleCount]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      {/* Dim blue in landing, slightly darker in dashboard to focus on core */}
      <meshBasicMaterial color="#0ea5e9" transparent opacity={view === 'landing' ? 0.3 : 0.15} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

// ── 2. The Core Topology (The Neural Network) ──
function CyberCore({ results, view, validatedAlerts = [] }) {
  const coreRef = useRef();
  
  // 100% Perfect Enterprise Network Topology (Hub and Spoke)
  const topology = useMemo(() => {
    const pts = [];
    const conns = [];
    
    // Node 0: The Crown Jewel (Mainframe/DB Server)
    pts.push(new THREE.Vector3(0, 0, 0));
    
    // Tier 1: Internal Application Servers (8 nodes)
    const tier1Count = 8;
    const tier1Radius = 7;
    for(let i=0; i<tier1Count; i++) {
        const angle = (i / tier1Count) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(angle)*tier1Radius, (Math.random()-0.5)*3, Math.sin(angle)*tier1Radius));
        conns.push([pts[i+1], pts[0]]); // Connect Tier 1 directly to Core
    }
    
    // Tier 2: Endpoints/Workstations (24 nodes)
    const tier2Count = 24;
    const tier2Radius = 16;
    for(let i=0; i<tier2Count; i++) {
        const angle = (i / tier2Count) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(angle)*tier2Radius, (Math.random()-0.5)*6, Math.sin(angle)*tier2Radius));
        
        // Connect endpoint to a Tier 1 internal server
        const parentIdx = 1 + Math.floor(Math.random() * tier1Count);
        conns.push([pts[pts.length-1], pts[parentIdx]]);
        
        // Add peer-to-peer connections to show Lateral Movement paths
        if (i > 0 && Math.random() > 0.4) {
            const peerIdx = 1 + tier1Count + Math.floor(Math.random() * i);
            conns.push([pts[pts.length-1], pts[peerIdx]]);
        }
    }
    
    return { pts, conns };
  }, []);

  // Determine Threats
  const threats = useMemo(() => {
    if(!results || !results.alerts) return [];
    const activeThreats = [];
    const alerts = results.alerts;
    
    for(let a=0; a < Math.min(alerts.length, 12); a++) {
        // Attack originates from a Tier 2 Endpoint (index > 8)
        const startNodeIdx = 9 + Math.floor(Math.random() * 24);
        let color = '#f59e0b'; // Low Risk
        if(alerts[a].severity === 'Medium') color = '#f97316';
        if(alerts[a].severity === 'High') color = '#ef4444';
        
        activeThreats.push({ idx: startNodeIdx, color, alertIdx: a });
    }
    return activeThreats;
  }, [results]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (coreRef.current) {
        coreRef.current.rotation.y = time * 0.03; // Extremely smooth, slow rotation
        coreRef.current.position.y = Math.sin(time * 0.5) * 0.5; // Gentle floating effect
    }
  });

  const opacityMult = view === 'landing' ? 0.35 : 1.0;
  
  // TrapWeave Calculations
  const hasHoneypot = validatedAlerts.some(v => v.isRealThreat);
  const honeypotPos = new THREE.Vector3(22, -2, 12); // Pushed further out as a rogue decoy

  return (
    <group ref={coreRef}>
      {/* 🔮 TRAPWEAVE HONEYPOT CORE 🔮 */}
      {hasHoneypot && (
          <group position={honeypotPos}>
              <Box args={[3, 3, 3]}>
                  <meshPhysicalMaterial color="#06b6d4" transmission={0.9} opacity={opacityMult} metalness={0.8} roughness={0.2} wireframe />
              </Box>
              <Sphere args={[0.8, 16, 16]}>
                 <meshBasicMaterial color="#06b6d4" transparent opacity={0.8 * opacityMult} blending={THREE.AdditiveBlending} />
              </Sphere>
              <pointLight color="#06b6d4" intensity={4} distance={30} />
          </group>
      )}

      {/* NODE 0: Mainframe / Database (The Crown Jewel) */}
      <group position={topology.pts[0]}>
          <Cylinder args={[1.5, 1.5, 4, 32]}>
              <meshPhysicalMaterial color="#38bdf8" transmission={0.9} opacity={opacityMult} metalness={0.5} roughness={0.1} />
          </Cylinder>
          <Cylinder args={[1.6, 1.6, 4.2, 16]} wireframe>
              <meshBasicMaterial color="#7dd3fc" transparent opacity={0.2 * opacityMult} />
          </Cylinder>
          <pointLight color="#0284c7" intensity={2} distance={20} />
      </group>

      {/* Nodes: Tier 1 & Tier 2 */}
      {topology.pts.slice(1).map((pt, i) => {
          const isTier1 = i < 8; // The first 8 after the core
          const size = isTier1 ? 0.8 : 0.4;
          const color = isTier1 ? "#0ea5e9" : "#64748b";
          return (
              <Box key={`node-${i}`} args={[size, size, size]} position={pt}>
                  <meshPhysicalMaterial color={color} transmission={0.5} opacity={opacityMult} metalness={0.5} roughness={0.2} />
              </Box>
          )
      })}

      {/* Smooth Premium Connecting Lines */}
      {topology.conns.map((line, i) => (
         <Line key={`edge-${i}`} points={line} color="#0ea5e9" lineWidth={1} transparent opacity={0.15 * opacityMult} />
      ))}
      
      {/* 🕸️ TrapWeave Redirection Lines */}
      {hasHoneypot && threats.map((t, idx) => {
          const validation = validatedAlerts.find(v => v.idx === t.alertIdx);
          if (validation && validation.isRealThreat) {
              return <Line key={`trap-edge-${idx}`} points={[topology.pts[t.idx], honeypotPos]} color="#06b6d4" lineWidth={2} transparent opacity={0.5 * opacityMult} />
          }
          return null;
      })}

      {/* Cinematic Lateral Movement Particles (Lightning fast pulses) */}
      {threats.map((t, idx) => {
          const validation = validatedAlerts.find(v => v.idx === t.alertIdx);
          const isFalsePos = validation && !validation.isRealThreat;
          const isTrapped = validation && validation.isRealThreat;
          
          if(isFalsePos) return null; // Eliminated, no longer moves
          
          const targetPos = isTrapped ? honeypotPos : topology.pts[0];
          const pulseColor = isTrapped ? "#06b6d4" : t.color; // Cyan if trapped
          
          return <LightningPulse 
                    key={`pulse-${idx}`} 
                    start={topology.pts[t.idx]} 
                    target={targetPos} 
                    color={pulseColor} 
                    opacity={opacityMult} 
                    isTrapped={isTrapped} 
                 />
      })}
    </group>
  );
}

// Intense, fast pulse indicating a cyber attack traversing the graph
function LightningPulse({ start, target, color, opacity, isTrapped }) {
    const meshRef = useRef();
    const speed = isTrapped ? 0.15 : (0.5 + Math.random() * 0.8); // Trapped nodes move slower
    const offset = Math.random() * 10;
    
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        let progress = ((time * speed) + offset) % 1;
        // Make it snappy (ease in out)
        progress = progress * progress * (3 - 2 * progress);
        
        if(meshRef.current) {
            meshRef.current.position.lerpVectors(start, target, progress);
            const scale = 1 + Math.sin(progress * Math.PI) * 2;
            meshRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <Sphere ref={meshRef} args={[0.3, 16, 16]}>
            <meshBasicMaterial color={color} transparent opacity={0.9 * opacity} blending={THREE.AdditiveBlending} />
        </Sphere>
    );
}

// ── 3. Camera Director ──
// Smoothly animates the camera between the Landing Page view (vast ocean) and Dashboard view (up close)
function CameraDirector({ view, validatedAlerts = [] }) {
    useFrame((state) => {
        const hasHoneypot = validatedAlerts.some(v => v.isRealThreat);
        
        if (view === 'landing') {
            // Far out, panning across the data ocean
            state.camera.position.lerp(new THREE.Vector3(60, 20, 60), 0.02);
            state.camera.lookAt(0, 0, 0);
        } else if (view === 'analytics') {
            // Tactical top-down view for XAI presentation
            state.camera.position.lerp(new THREE.Vector3(0, 45, 0), 0.03);
            state.camera.lookAt(0, 0, 0);
        } else {
            // Dashboard
            if (hasHoneypot) {
                // Swoop dramatically to focus on the newly deployed Honeypot
                state.camera.position.lerp(new THREE.Vector3(12, 5, 20), 0.04);
                state.camera.lookAt(15, -4, 10);
            } else {
                // Normal Cyber Core View
                state.camera.position.lerp(new THREE.Vector3(0, 15, 35), 0.05);
                state.camera.lookAt(0, 0, 0);
            }
        }
    });
    return null;
}

export default function ThreeCanvas({ results, view, validatedAlerts }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#020617' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[60, 20, 60]} fov={45} />
        <CameraDirector view={view} validatedAlerts={validatedAlerts} />
        
        <fog attach="fog" args={['#020617', 20, 150]} />
        <ambientLight intensity={0.5} />
        
        <DataOcean view={view} />
        <CyberCore results={results} view={view} validatedAlerts={validatedAlerts} />

        
        <Stars radius={150} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />
        
        {/* Only enable OrbitControls manually on Dashboard if desired, but automated camera is more cinematic */}
        {view === 'dashboard' && (
            <OrbitControls 
                enablePan={false} 
                maxDistance={50} 
                minDistance={15} 
                autoRotate={false} 
                makeDefault
            />
        )}
      </Canvas>
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        pointerEvents: 'none', 
        background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, #020617 100%)' 
      }} />
    </div>
  );
}
