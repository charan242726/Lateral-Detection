import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, PerspectiveCamera, Icosahedron, Line } from '@react-three/drei';
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
function CyberCore({ results, view }) {
  const coreRef = useRef();
  
  // Visual nodes for the topology
  const NUM_NODES = 60;
  const topology = useMemo(() => {
    const pts = [];
    const conns = [];
    // Central Node (Database)
    pts.push(new THREE.Vector3(0, 0, 0));
    
    for (let i = 1; i < NUM_NODES; i++) {
        const angle = (i / NUM_NODES) * Math.PI * 2 + (Math.random()*0.5);
        const radius = 10 + Math.random() * 8;
        const height = (Math.random() - 0.5) * 10;
        pts.push(new THREE.Vector3(Math.cos(angle)*radius, height, Math.sin(angle)*radius));
        
        // Connect to center 30% of time
        if(Math.random() > 0.7) {
            conns.push([pts[i], pts[0]]);
        }
        // Connect to nearby
        const target = Math.floor(Math.random() * i);
        if(target !== 0) conns.push([pts[i], pts[target]]);
    }
    return { pts, conns };
  }, []);

  // Determine Threats
  const threats = useMemo(() => {
    if(!results || results.flagged === 0) return [];
    
    // Convert backend alerts to 3D visual pulses
    const alerts = results.alerts || [];
    const activeThreats = [];
    
    for(let a=0; a < Math.min(alerts.length, 12); a++) {
        const nodeIdx = Math.floor(Math.random() * (NUM_NODES-1)) + 1;
        let color = '#f59e0b'; // Low Risk
        if(alerts[a].severity === 'Medium') color = '#f97316';
        if(alerts[a].severity === 'High') color = '#ef4444';
        
        activeThreats.push({ idx: nodeIdx, color });
    }
    return activeThreats;
  }, [results]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (coreRef.current) {
        coreRef.current.rotation.y = time * 0.08; // Rotating core
        coreRef.current.position.y = Math.sin(time) * 1; // Floating effect
    }
  });

  // Calculate dynamic colors based on view
  const opacityMult = view === 'landing' ? 0.5 : 1.0;

  return (
    <group ref={coreRef}>
      {/* Geometric Core Element */}
      <Icosahedron args={[2.5, 1]} position={[0,0,0]}>
        <meshStandardMaterial color="#0284c7" wireframe transparent opacity={0.6 * opacityMult} />
      </Icosahedron>
      <Icosahedron args={[1.5, 0]} position={[0,0,0]}>
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9 * opacityMult} blending={THREE.AdditiveBlending} />
      </Icosahedron>

      {/* Node Spheres */}
      {topology.pts.slice(1).map((pos, i) => {
          const nodeIdx = i + 1;
          const threat = threats.find(t => t.idx === nodeIdx);
          const color = threat ? threat.color : "#0ea5e9";
          const scale = threat ? 0.6 : 0.3;
          
          return (
              <group position={pos} key={`node-${i}`}>
                 <Sphere args={[scale, 16, 16]}>
                    <meshBasicMaterial color={color} transparent opacity={0.8 * opacityMult} />
                 </Sphere>
                 {threat && (
                     <mesh>
                         <sphereGeometry args={[scale * 2.5, 16, 16]} />
                         <meshBasicMaterial color={threat.color} transparent opacity={0.2} wireframe />
                     </mesh>
                 )}
              </group>
          )
      })}

      {/* Holographic Connecting Lines */}
      {topology.conns.map((line, i) => (
         <Line key={`edge-${i}`} points={line} color="rgba(56, 189, 248, 0.2)" lineWidth={1} transparent opacity={opacityMult} />
      ))}

      {/* Cinematic Lateral Movement Particles (Lightning fast pulses) */}
      {threats.map((t, idx) => (
          <LightningPulse key={`pulse-${idx}`} start={topology.pts[t.idx]} target={topology.pts[0]} color={t.color} opacity={opacityMult} />
      ))}
    </group>
  );
}

// Intense, fast pulse indicating a cyber attack traversing the graph
function LightningPulse({ start, target, color, opacity }) {
    const meshRef = useRef();
    const speed = 0.5 + Math.random() * 0.8;
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
function CameraDirector({ view }) {
    useFrame((state) => {
        if (view === 'landing') {
            // Far out, panning across the data ocean
            state.camera.position.lerp(new THREE.Vector3(60, 20, 60), 0.02);
            state.camera.lookAt(0, 0, 0);
        } else {
            // Swoop into the cyber core for the dashboard
            state.camera.position.lerp(new THREE.Vector3(0, 15, 35), 0.05);
            state.camera.lookAt(0, 0, 0);
        }
    });
    return null;
}

export default function ThreeCanvas({ results, view }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#020617' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[60, 20, 60]} fov={45} />
        <CameraDirector view={view} />
        
        <fog attach="fog" args={['#020617', 20, 150]} />
        <ambientLight intensity={0.5} />
        
        <DataOcean view={view} />
        <CyberCore results={results} view={view} />
        
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
