import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, Box, Cylinder, Line, Ring, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// ── 1. The Ocean of Data (10,000 Instanced Particles) ──
function DataOcean({ view }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particleCount = 10000;
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < particleCount; i++) {
      const radius = 30 + Math.random() * 120;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      temp.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi) * (Math.random() * 0.5),
        z: radius * Math.sin(phi) * Math.sin(theta),
        offset: Math.random() * Math.PI * 2
      });
    }
    return temp;
  }, []);

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
      meshRef.current.rotation.y = time * 0.02;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, particleCount]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color="#0ea5e9" transparent opacity={view === 'landing' ? 0.35 : 0.12} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

// ── 2. Network Topology ──
function CyberCore({ results, view, validatedAlerts = [] }) {
  const coreRef = useRef();
  const scannerRef = useRef();
  const tier2GroupRef = useRef();

  const topology = useMemo(() => {
    const pts = [];
    const conns = [];
    pts.push(new THREE.Vector3(0, 0, 0)); // Node 0: Core

    // Tier 1: 8 internal servers
    const tier1Count = 8;
    const tier1Radius = 7;
    for (let i = 0; i < tier1Count; i++) {
      const angle = (i / tier1Count) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * tier1Radius, (Math.random() - 0.5) * 3, Math.sin(angle) * tier1Radius));
      conns.push([pts[i + 1], pts[0]]);
    }

    // Tier 2: 32 endpoints
    const tier2Count = 32;
    const tier2Radius = 18;
    for (let i = 0; i < tier2Count; i++) {
      const angle = (i / tier2Count) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * tier2Radius, (Math.random() - 0.5) * 8, Math.sin(angle) * tier2Radius));
      const parentIdx = 1 + Math.floor(Math.random() * tier1Count);
      conns.push([pts[pts.length - 1], pts[parentIdx]]);
      if (i > 0 && Math.random() > 0.5) {
        const peerIdx = 1 + tier1Count + Math.floor(Math.random() * i);
        conns.push([pts[pts.length - 1], pts[peerIdx]]);
      }
    }
    return { pts, conns };
  }, []);

  const threats = useMemo(() => {
    if (!results?.alerts) return [];
    return results.alerts.slice(0, 12).map((a) => {
      const startNodeIdx = 9 + Math.floor(Math.random() * 32);
      const color = a.severity === 'High' ? '#ef4444' : a.severity === 'Medium' ? '#f97316' : '#f59e0b';
      return { idx: startNodeIdx, color, alertIdx: a.alertIdx };
    });
  }, [results]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.05;
      coreRef.current.position.y = Math.sin(time * 0.8) * 0.6;
    }
    if (scannerRef.current) {
      scannerRef.current.position.y = Math.sin(time * 2.5) * 2;
    }
    if (tier2GroupRef.current) {
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
      {/* TrapWeave Honeypot Core */}
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

      {/* Core DB Node */}
      <group position={topology.pts[0]}>
        <Cylinder args={[1.8, 1.8, 5, 32]}>
          <meshPhysicalMaterial color="#38bdf8" transmission={0.9} opacity={opacityMult} metalness={0.7} roughness={0.05} />
        </Cylinder>
        <Cylinder args={[2.0, 2.0, 5.2, 16]} wireframe>
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.3 * opacityMult} blending={THREE.AdditiveBlending} />
        </Cylinder>
        {/* AI Scanner Disk */}
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

      {/* Tier 2 Nodes (Animated) */}
      <group ref={tier2GroupRef}>
        {topology.pts.slice(9).map((pt, i) => (
          <Box key={`t2-${i}`} args={[0.5, 0.5, 0.5]} position={pt}>
            <meshPhysicalMaterial color="#64748b" transmission={0.4} opacity={opacityMult} metalness={0.6} roughness={0.3} />
          </Box>
        ))}
      </group>

      {/* Network Edges */}
      {topology.conns.map((line, i) => (
        <Line key={`e-${i}`} points={line} color={i < 8 ? "#38bdf8" : "#0ea5e9"} lineWidth={i < 8 ? 2 : 1} transparent opacity={(i < 8 ? 0.35 : 0.15) * opacityMult} />
      ))}

      {/* TrapWeave Redirection Lines */}
      {hasHoneypot && threats.map((t, idx) => {
        const v = validatedAlerts.find(v => v.idx === t.alertIdx);
        if (v?.isRealThreat) {
          return <Line key={`trap-${idx}`} points={[topology.pts[t.idx], honeypotPos]} color="#06b6d4" lineWidth={3} transparent opacity={0.7 * opacityMult} />;
        }
        return null;
      })}

      {/* Cinematic Packet Bullets (NOT bouncing balls) */}
      {threats.map((t, idx) => {
        const v = validatedAlerts.find(v => v.idx === t.alertIdx);
        if (v && !v.isRealThreat) return null;
        const targetPos = v?.isRealThreat ? honeypotPos : topology.pts[0];
        const pulseColor = v?.isRealThreat ? "#06b6d4" : t.color;
        return (
          <PacketBullet
            key={`pkg-${idx}`}
            start={topology.pts[t.idx]}
            target={targetPos}
            color={pulseColor}
            opacity={opacityMult}
            isTrapped={!!v?.isRealThreat}
          />
        );
      })}
    </group>
  );
}

// ── Packet Bullet: looks like a speeding network data packet, not a ball ──
function PacketBullet({ start, target, color, opacity, isTrapped }) {
  const groupRef = useRef();
  const trailRef1 = useRef();
  const trailRef2 = useRef();
  const speed = isTrapped ? 0.12 : (0.35 + Math.random() * 0.5);
  const offset = Math.random() * Math.PI * 2;

  // Direction quaternion — makes the cone "point" toward the target
  const quaternion = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(target, start).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [start, target]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    let t = ((time * speed) + offset) % 1;
    t = t * t * (3 - 2 * t); // smooth ease

    if (groupRef.current) {
      groupRef.current.position.lerpVectors(start, target, t);
    }
    if (trailRef1.current) {
      const t1 = Math.max(0, t - 0.04);
      trailRef1.current.position.lerpVectors(start, target, t1);
    }
    if (trailRef2.current) {
      const t2 = Math.max(0, t - 0.09);
      trailRef2.current.position.lerpVectors(start, target, t2);
    }
  });

  return (
    <>
      {/* Lead bullet — a sharp cone pointing toward target */}
      <group ref={groupRef} quaternion={quaternion}>
        <mesh>
          <coneGeometry args={[0.15, 0.9, 6]} />
          <meshBasicMaterial color={color} transparent opacity={1.0 * opacity} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      {/* Trail ghost 1 */}
      <group ref={trailRef1} quaternion={quaternion}>
        <mesh>
          <coneGeometry args={[0.1, 0.6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.5 * opacity} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      {/* Trail ghost 2 */}
      <group ref={trailRef2} quaternion={quaternion}>
        <mesh>
          <coneGeometry args={[0.06, 0.4, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.2 * opacity} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </>
  );
}

// ── 3. Camera Director ──
// Handles non-dashboard views. Dashboard is 100% free via OrbitControls.
// Honeypot swoop fires ONCE for 3 seconds, then releases to the user.
function CameraDirector({ view, validatedAlerts = [] }) {
  const honeypotStartTime = useRef(null);

  useFrame((state) => {
    const hasHoneypot = validatedAlerts.some(v => v.isRealThreat);
    const time = state.clock.getElapsedTime();

    if (view === 'landing') {
      state.camera.position.lerp(new THREE.Vector3(60, 20 + Math.sin(time * 0.2) * 5, 60), 0.02);
      state.camera.lookAt(0, 0, 0);
    } else if (view === 'analytics') {
      state.camera.position.lerp(new THREE.Vector3(0, 45, 10), 0.03);
      state.camera.lookAt(0, 0, 0);
    } else {
      // Dashboard — only the honeypot swoop moves the camera, and only once
      if (hasHoneypot) {
        if (honeypotStartTime.current === null) {
          honeypotStartTime.current = time; // Record first detection time
        }
        const elapsed = time - honeypotStartTime.current;
        if (elapsed < 3.0) {
          // Brief 3-second dramatic swoop towards honeypot
          state.camera.position.lerp(new THREE.Vector3(12, 5, 28), 0.04);
          state.camera.lookAt(25, 4, 15);
        }
        // After 3s → do NOTHING → OrbitControls takes full control
      } else {
        honeypotStartTime.current = null; // Reset when honeypot gone
      }
      // No camera movement when no honeypot — OrbitControls handles it all
    }
  });
  return null;
}

export default function ThreeCanvas({ results, view, validatedAlerts }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#020617' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 16, 42]} fov={45} />
        <CameraDirector view={view} validatedAlerts={validatedAlerts} />

        <fog attach="fog" args={['#020617', 25, 160]} />
        <ambientLight intensity={0.6} />

        <DataOcean view={view} />
        <CyberCore results={results} view={view} validatedAlerts={validatedAlerts} />
        <Stars radius={150} depth={50} count={4000} factor={4} saturation={1} fade speed={1.5} />

        {/* Full interactive control — user can drag/spin/zoom the 3D topology */}
        {view === 'dashboard' && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxDistance={150}
            minDistance={5}
            autoRotate={true}
            autoRotateSpeed={0.5}
            makeDefault
          />
        )}
      </Canvas>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, #020617 100%)'
      }} />
    </div>
  );
}
