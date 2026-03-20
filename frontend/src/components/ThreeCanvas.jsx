import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, Box, Cylinder, Line, Ring, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// ── 1. The Ocean of Data (10,000 Instanced Particles) ──
function DataOcean({ view }) {
  const meshRef = useRef();
  const particleCount = 10000;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
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
        const yOffset = Math.sin(time * 0.5 + p.offset + p.x * 0.05) * 5;
        dummy.position.set(p.x, p.y + yOffset, p.z);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      meshRef.current.rotation.y = time * 0.02; // Very slow majestic rotation
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, particleCount]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color="#0ea5e9" transparent opacity={view === 'landing' ? 0.35 : 0.12} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

// ── 2. The Core Topology (The Neural Network) ──
function CyberCore({ results, view, validatedAlerts = [] }) {
  const coreRef = useRef();
  const scannerRef = useRef();
  const tier2GroupRef = useRef();
  
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
    
    // Tier 2: Endpoints/Workstations (32 nodes - increased density for wow factor)
    const tier2Count = 32;
    const tier2Radius = 18;
    for(let i=0; i<tier2Count; i++) {
        const angle = (i / tier2Count) * Math.PI * 2;
        // Endpoints spread out
        pts.push(new THREE.Vector3(Math.cos(angle)*tier2Radius, (Math.random()-0.5)*8, Math.sin(angle)*tier2Radius));
        
        // Connect endpoint to a Tier 1 internal server
        const parentIdx = 1 + Math.floor(Math.random() * tier1Count);
        conns.push([pts[pts.length-1], pts[parentIdx]]);
        
        // Add peer-to-peer connections to show Lateral Movement paths
        if (i > 0 && Math.random() > 0.5) {
            const peerIdx = 1 + tier1Count + Math.floor(Math.random() * i);
            conns.push([pts[pts.length-1], pts[peerIdx]]);
        }
    }
    
    return { pts, conns };
  }, []);

  const threats = useMemo(() => {
    if(!results || !results.alerts) return [];
    const activeThreats = [];
    const alerts = results.alerts;
    
    for(let a=0; a < Math.min(alerts.length, 12); a++) {
        const startNodeIdx = 9 + Math.floor(Math.random() * 32);
        let color = '#f59e0b';
        if(alerts[a].severity === 'Medium') color = '#f97316';
        if(alerts[a].severity === 'High') color = '#ef4444';
        
        activeThreats.push({ idx: startNodeIdx, color, alertIdx: alerts[a].alertIdx });
    }
    return activeThreats;
  }, [results]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (coreRef.current) {
        // Entire topology slowly rotates like a hologram (subtle)
        coreRef.current.rotation.y = time * 0.05; 
        coreRef.current.position.y = Math.sin(time * 0.8) * 0.6;
    }
    if (scannerRef.current) {
        // AI Tracking Scanner moves vertically across the central database
        scannerRef.current.position.y = Math.sin(time * 2.5) * 2;
    }
    if (tier2GroupRef.current) {
        // Make endpoints bob up and down asynchronously
        tier2GroupRef.current.children.forEach((child, i) => {
           child.position.y = topology.pts[9 + i].y + Math.sin(time * 1.5 + i) * 0.7;
        });
    }
  });

  const opacityMult = view === 'landing' ? 0.30 : 1.0;
  const hasHoneypot = validatedAlerts.some(v => v.isRealThreat);
  const honeypotPos = new THREE.Vector3(25, 4, 15);

  return (
    <group ref={coreRef}>
      {/* 🔮 TRAPWEAVE HONEYPOT CORE 🔮 */}
      {hasHoneypot && (
          <group position={honeypotPos}>
              <Box args={[3.5, 3.5, 3.5]}>
                  <meshPhysicalMaterial color="#06b6d4" transmission={0.9} opacity={opacityMult} metalness={0.9} roughness={0.1} wireframe />
              </Box>
              <Sphere args={[1.2, 32, 32]}>
                 <meshBasicMaterial color="#06b6d4" transparent opacity={0.8 * opacityMult} blending={THREE.AdditiveBlending} />
              </Sphere>
              <pointLight color="#06b6d4" intensity={8} distance={40} />
          </group>
      )}

      {/* NODE 0: Mainframe / Database (The Crown Jewel) */}
      <group position={topology.pts[0]}>
          <Cylinder args={[1.8, 1.8, 5, 32]}>
              <meshPhysicalMaterial color="#38bdf8" transmission={0.9} opacity={opacityMult} metalness={0.7} roughness={0.05} />
          </Cylinder>
          <Cylinder args={[2.0, 2.0, 5.2, 16]} wireframe>
              <meshBasicMaterial color="#7dd3fc" transparent opacity={0.3 * opacityMult} blending={THREE.AdditiveBlending} />
          </Cylinder>
          
          {/* AI Tracking Scanner (Moving Disk) */}
          <group ref={scannerRef}>
              <Ring args={[2.2, 3.2, 32]} rotation={[-Math.PI / 2, 0, 0]}>
                 <meshBasicMaterial color="#ef4444" transparent opacity={0.6 * opacityMult} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
              </Ring>
              <pointLight color="#ef4444" intensity={2} distance={10} />
          </group>

          <pointLight color="#0284c7" intensity={3} distance={25} />
      </group>

      {/* Tier 1 Nodes */}
      {topology.pts.slice(1, 9).map((pt, i) => (
          <Box key={`t1-${i}`} args={[1, 1, 1]} position={pt}>
              <meshPhysicalMaterial color="#0ea5e9" transmission={0.7} opacity={opacityMult} metalness={0.8} roughness={0.1} />
          </Box>
      ))}

      {/* Tier 2 Nodes (Animated via group ref) */}
      <group ref={tier2GroupRef}>
          {topology.pts.slice(9).map((pt, i) => (
              <Box key={`t2-${i}`} args={[0.5, 0.5, 0.5]} position={pt}>
                  <meshPhysicalMaterial color="#64748b" transmission={0.4} opacity={opacityMult} metalness={0.6} roughness={0.3} />
              </Box>
          ))}
      </group>

      {/* Glowing Hex-Grid Paths */}
      {topology.conns.map((line, i) => (
         <Line key={`edge-${i}`} points={line} color={i < 8 ? "#38bdf8" : "#0ea5e9"} lineWidth={i < 8 ? 2 : 1} transparent opacity={(i < 8 ? 0.3 : 0.15) * opacityMult} />
      ))}
      
      {/* 🕸️ TrapWeave Redirection Lines */}
      {hasHoneypot && threats.map((t, idx) => {
          const validation = validatedAlerts.find(v => v.idx === t.alertIdx);
          if (validation && validation.isRealThreat) {
              return <Line key={`trap-edge-${idx}`} points={[topology.pts[t.idx], honeypotPos]} color="#06b6d4" lineWidth={3} transparent opacity={0.7 * opacityMult} />
          }
          return null;
      })}

      {/* Cinematic Lateral Movement Particles */}
      {threats.map((t, idx) => {
          const validation = validatedAlerts.find(v => v.idx === t.alertIdx);
          const isFalsePos = validation && !validation.isRealThreat;
          const isTrapped = validation && validation.isRealThreat;
          
          if(isFalsePos) return null;
          
          const targetPos = isTrapped ? honeypotPos : topology.pts[0];
          const pulseColor = isTrapped ? "#06b6d4" : t.color;
          
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

function LightningPulse({ start, target, color, opacity, isTrapped }) {
    const meshRef = useRef();
    const speed = isTrapped ? 0.15 : (0.5 + Math.random() * 0.8);
    const offset = Math.random() * 10;
    
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        let progress = ((time * speed) + offset) % 1;
        progress = progress * progress * (3 - 2 * progress);
        
        if(meshRef.current) {
            meshRef.current.position.lerpVectors(start, target, progress);
            const scale = 1 + Math.sin(progress * Math.PI) * 2.5;
            meshRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <Sphere ref={meshRef} args={[0.35, 16, 16]}>
            <meshBasicMaterial color={color} transparent opacity={1.0 * opacity} blending={THREE.AdditiveBlending} />
        </Sphere>
    );
}

// ── 3. Camera Director (Cinematic Drifting) ──
function CameraDirector({ view, validatedAlerts = [] }) {
    useFrame((state) => {
        const hasHoneypot = validatedAlerts.some(v => v.isRealThreat);
        const time = state.clock.getElapsedTime();
        
        if (view === 'landing') {
            state.camera.position.lerp(new THREE.Vector3(60, 20 + Math.sin(time*0.2)*5, 60), 0.02);
            state.camera.lookAt(0, 0, 0);
        } else if (view === 'analytics') {
            // Tactical top-down, strictly centered
            state.camera.position.lerp(new THREE.Vector3(0, 45, 10), 0.03);
            state.camera.lookAt(0, 0, 0);
        } else {
            if (hasHoneypot) {
                // Intense pan locked onto honeypot
                state.camera.position.lerp(new THREE.Vector3(12, 5, 25), 0.04);
                state.camera.lookAt(25, 4, 15); // Look directly at honeypotPos
            } else {
                // Dashboard View: Perfectly centered, extremely subtle hover (no violent panning)
                state.camera.position.lerp(new THREE.Vector3(Math.sin(time * 0.2) * 2, 16, 40), 0.05);
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
        
        <fog attach="fog" args={['#020617', 25, 160]} />
        <ambientLight intensity={0.6} />
        
        <DataOcean view={view} />
        <CyberCore results={results} view={view} validatedAlerts={validatedAlerts} />
        
        <Stars radius={150} depth={50} count={4000} factor={4} saturation={1} fade speed={1.5} />
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
