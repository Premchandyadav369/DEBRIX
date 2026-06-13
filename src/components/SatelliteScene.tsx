import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useState } from "react";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";

/* ============================================================
   DEBRI-X V3 — Autonomous SSA + Debris Mitigation Spacecraft
   ------------------------------------------------------------
   Visual language: servicing satellite (OSAM-1, MEV-1) +
   inspector spacecraft + Canadarm-class manipulator.
   Palette: white / light-gray / metallic silver, dark navy
   structural, NASA gold MLI, faint orange trajectory accents.
   ============================================================ */

// ---- Shared materials (created once) ----
const useDebrixMaterials = () =>
  useMemo(() => {
    const white = new THREE.MeshStandardMaterial({ color: "#eef0f2", metalness: 0.25, roughness: 0.55 });
    const lightGray = new THREE.MeshStandardMaterial({ color: "#b8bcc2", metalness: 0.55, roughness: 0.4 });
    const silver = new THREE.MeshStandardMaterial({ color: "#9ea4ad", metalness: 0.92, roughness: 0.18 });
    const navy = new THREE.MeshStandardMaterial({ color: "#101b2e", metalness: 0.6, roughness: 0.35 });
    const carbon = new THREE.MeshStandardMaterial({ color: "#1a1d22", metalness: 0.7, roughness: 0.45 });
    const gold = new THREE.MeshStandardMaterial({
      color: "#c9a14a",
      metalness: 0.95,
      roughness: 0.28,
      emissive: "#3a2a08",
      emissiveIntensity: 0.25,
    });
    const lens = new THREE.MeshStandardMaterial({
      color: "#0a1a26",
      metalness: 0.6,
      roughness: 0.1,
      emissive: "#1b3c52",
      emissiveIntensity: 0.45,
    });
    const solarCell = new THREE.MeshStandardMaterial({
      color: "#0c1a3a",
      metalness: 0.8,
      roughness: 0.25,
      emissive: "#0a1830",
      emissiveIntensity: 0.15,
    });
    const solarFrame = new THREE.MeshStandardMaterial({ color: "#cfd2d6", metalness: 0.9, roughness: 0.2 });
    const thrusterCone = new THREE.MeshStandardMaterial({ color: "#6e6a64", metalness: 0.9, roughness: 0.25 });
    const accentOrange = new THREE.MeshStandardMaterial({
      color: "#d97a2c",
      metalness: 0.5,
      roughness: 0.4,
      emissive: "#3a1a08",
      emissiveIntensity: 0.3,
    });
    return { white, lightGray, silver, navy, carbon, gold, lens, solarCell, solarFrame, thrusterCone, accentOrange };
  }, []);

type Mats = ReturnType<typeof useDebrixMaterials>;

// ---- Solar array (deployable wing) ----
function SolarWing({ side, mats }: { side: 1 | -1; mats: Mats }) {
  // Boom + 3 segmented panels per wing — large, like servicing spacecraft.
  const panelW = 1.1;
  const panelH = 0.02;
  const panelD = 0.85;
  return (
    <group position={[side * 0.78, 0, 0]}>
      {/* Yoke / boom */}
      <mesh position={[side * 0.18, 0, 0]} material={mats.silver}>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 12]} />
        <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
      </mesh>
      <mesh position={[side * 0.36, 0, 0]} material={mats.lightGray}>
        <boxGeometry args={[0.08, 0.18, 0.18]} />
      </mesh>
      {/* 3 panel segments */}
      {[0, 1, 2].map((i) => {
        const x = side * (0.55 + i * (panelW + 0.04));
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh material={mats.solarFrame}>
              <boxGeometry args={[panelW, panelH, panelD]} />
            </mesh>
            <mesh position={[0, panelH / 2 + 0.001, 0]} material={mats.solarCell}>
              <boxGeometry args={[panelW - 0.06, 0.005, panelD - 0.06]} />
            </mesh>
            <mesh position={[0, -panelH / 2 - 0.001, 0]} material={mats.solarCell}>
              <boxGeometry args={[panelW - 0.06, 0.005, panelD - 0.06]} />
            </mesh>
            {/* Cell grid lines */}
            {[-0.25, 0, 0.25].map((zg) => (
              <mesh key={zg} position={[0, panelH / 2 + 0.003, zg]} material={mats.solarFrame}>
                <boxGeometry args={[panelW - 0.08, 0.002, 0.005]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

// ---- Main bus (cuboid) ----
function MainBus({ mats }: { mats: Mats }) {
  // ~1.8 x 1.2 x 1.0 scene units. White/light-gray MLI with navy structural ribs.
  const W = 1.8;
  const H = 1.2;
  const D = 1.0;
  return (
    <group>
      {/* Primary body */}
      <mesh material={mats.white}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      {/* MLI gold blanket panels on Earth-facing face (+Z back) and -Y nadir */}
      <mesh position={[0, -H / 2 - 0.001, 0]} material={mats.gold}>
        <boxGeometry args={[W - 0.1, 0.005, D - 0.1]} />
      </mesh>
      <mesh position={[0, 0, -D / 2 - 0.001]} material={mats.gold}>
        <boxGeometry args={[W - 0.15, H - 0.15, 0.005]} />
      </mesh>
      {/* Structural ribs (navy) on top and sides */}
      {[-W / 2 + 0.05, 0, W / 2 - 0.05].map((x) => (
        <mesh key={`rib-${x}`} position={[x, H / 2 + 0.005, 0]} material={mats.navy}>
          <boxGeometry args={[0.04, 0.015, D - 0.08]} />
        </mesh>
      ))}
      {[-D / 2 + 0.05, 0, D / 2 - 0.05].map((z) => (
        <mesh key={`ribz-${z}`} position={[0, H / 2 + 0.005, z]} material={mats.navy}>
          <boxGeometry args={[W - 0.08, 0.015, 0.04]} />
        </mesh>
      ))}
      {/* DEBRI-X branding stripe (orange accent) on +X face */}
      <mesh position={[W / 2 + 0.001, 0.35, 0]} material={mats.accentOrange}>
        <boxGeometry args={[0.005, 0.08, D - 0.2]} />
      </mesh>
      {/* Hand-rails / grapple fixtures (silver) along top edges */}
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <group key={`rail-${x}`} position={[x, H / 2 + 0.04, 0.35]}>
          <mesh material={mats.silver}>
            <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
          </mesh>
        </group>
      ))}
      {/* Star trackers (two, on +Y top face, pointing up-back) */}
      {[-0.4, 0.4].map((x) => (
        <group key={`st-${x}`} position={[x, H / 2 + 0.06, -0.3]}>
          <mesh material={mats.carbon}>
            <cylinderGeometry args={[0.07, 0.07, 0.14, 16]} />
          </mesh>
          <mesh position={[0, 0.08, 0]} material={mats.lens}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- Sensor deck (front +X face) — SSA cameras, LiDAR, thermal, HRT ----
function SensorDeck({ mats }: { mats: Mats }) {
  const X = 0.91; // outside +X face of bus
  return (
    <group position={[X, 0, 0]}>
      {/* Deck plate */}
      <mesh material={mats.lightGray}>
        <boxGeometry args={[0.04, 1.0, 0.85]} />
      </mesh>
      {/* High-resolution tracking camera (large center barrel) */}
      <group position={[0.18, 0.12, 0]}>
        <mesh material={mats.carbon}>
          <cylinderGeometry args={[0.13, 0.13, 0.32, 24]} />
          <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
        </mesh>
        <mesh position={[0.17, 0, 0]} material={mats.lens}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
          <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
        </mesh>
        <mesh position={[0.18, 0, 0]} material={mats.silver}>
          <torusGeometry args={[0.115, 0.012, 8, 24]} />
          <primitive object={new THREE.Euler(0, Math.PI / 2, 0)} attach="rotation" />
        </mesh>
      </group>
      {/* Wide-angle SSA cameras: top, left, right (front already covered by HRT) */}
      {([
        { p: [0.08, 0.42, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
        { p: [0.08, -0.05, 0.35] as [number, number, number], rot: [0, 0.6, 0] as [number, number, number] },
        { p: [0.08, -0.05, -0.35] as [number, number, number], rot: [0, -0.6, 0] as [number, number, number] },
        { p: [0.08, -0.32, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
      ]).map((cam, i) => (
        <group key={i} position={cam.p} rotation={cam.rot}>
          <mesh material={mats.carbon}>
            <cylinderGeometry args={[0.05, 0.05, 0.09, 16]} />
            <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
          </mesh>
          <mesh position={[0.055, 0, 0]} material={mats.lens}>
            <cylinderGeometry args={[0.038, 0.038, 0.012, 16]} />
            <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
          </mesh>
        </group>
      ))}
      {/* LiDAR (boxy unit, lower) */}
      <group position={[0.1, -0.18, 0.18]}>
        <mesh material={mats.navy}>
          <boxGeometry args={[0.14, 0.12, 0.12]} />
        </mesh>
        <mesh position={[0.075, 0, 0]} material={mats.lens}>
          <boxGeometry args={[0.01, 0.08, 0.08]} />
        </mesh>
        <mesh position={[0.075, 0.04, 0]} material={mats.silver}>
          <boxGeometry args={[0.012, 0.012, 0.08]} />
        </mesh>
      </group>
      {/* Thermal camera (small, separate enclosure) */}
      <group position={[0.1, -0.18, -0.22]}>
        <mesh material={mats.silver}>
          <boxGeometry args={[0.12, 0.1, 0.1]} />
        </mesh>
        <mesh position={[0.065, 0, 0]} material={mats.lens}>
          <cylinderGeometry args={[0.035, 0.035, 0.012, 16]} />
          <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
        </mesh>
      </group>
    </group>
  );
}

// ---- 6-DOF Robotic Arm (front-right) with adaptive gripper ----
function RoboticArm({ mats, t }: { mats: Mats; t: number }) {
  // Gentle inspection motion — shoulder yaw, elbow flex, wrist roll.
  const shoulderYaw = Math.sin(t * 0.35) * 0.4;
  const shoulderPitch = -0.25 + Math.sin(t * 0.5) * 0.15;
  const elbowFlex = -1.1 + Math.sin(t * 0.6) * 0.2;
  const wristRoll = Math.sin(t * 0.9) * 0.5;
  const gripperOpen = 0.5 + Math.sin(t * 0.4) * 0.35; // 0..1

  return (
    <group position={[0.95, -0.35, 0.4]}>
      {/* Base mount on bus */}
      <mesh material={mats.silver}>
        <cylinderGeometry args={[0.09, 0.11, 0.08, 16]} />
      </mesh>
      <group rotation={[0, shoulderYaw, 0]}>
        {/* Shoulder joint housing */}
        <mesh position={[0, 0.08, 0]} material={mats.carbon}>
          <sphereGeometry args={[0.085, 16, 12]} />
        </mesh>
        <group position={[0, 0.08, 0]} rotation={[0, 0, shoulderPitch]}>
          {/* Upper arm */}
          <mesh position={[0.32, 0, 0]} material={mats.white}>
            <cylinderGeometry args={[0.05, 0.055, 0.6, 16]} />
            <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
          </mesh>
          {/* MLI gold wrap stripe */}
          <mesh position={[0.32, 0, 0]} material={mats.gold}>
            <cylinderGeometry args={[0.057, 0.057, 0.06, 16]} />
            <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
          </mesh>
          {/* Elbow */}
          <group position={[0.62, 0, 0]}>
            <mesh material={mats.carbon}>
              <sphereGeometry args={[0.07, 16, 12]} />
            </mesh>
            <group rotation={[0, 0, elbowFlex]}>
              {/* Forearm */}
              <mesh position={[0.28, 0, 0]} material={mats.white}>
                <cylinderGeometry args={[0.04, 0.045, 0.52, 16]} />
                <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
              </mesh>
              <mesh position={[0.28, 0, 0]} material={mats.gold}>
                <cylinderGeometry args={[0.047, 0.047, 0.05, 16]} />
                <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
              </mesh>
              {/* Wrist */}
              <group position={[0.54, 0, 0]} rotation={[wristRoll, 0, 0]}>
                <mesh material={mats.silver}>
                  <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
                  <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
                </mesh>
                {/* End effector — adaptive 3-finger gripper */}
                <group position={[0.07, 0, 0]}>
                  <mesh material={mats.carbon}>
                    <cylinderGeometry args={[0.055, 0.045, 0.06, 16]} />
                    <primitive object={new THREE.Euler(0, 0, Math.PI / 2)} attach="rotation" />
                  </mesh>
                  {/* Wrist camera (eye-in-hand) */}
                  <mesh position={[0.04, 0.05, 0]} material={mats.lens}>
                    <sphereGeometry args={[0.018, 12, 8]} />
                  </mesh>
                  {/* 3 fingers */}
                  {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a, i) => {
                    const fx = 0.07 + Math.cos(a) * 0.025 * gripperOpen;
                    const fy = Math.sin(a) * 0.045 * gripperOpen;
                    const fz = Math.cos(a + Math.PI / 2) * 0.045 * gripperOpen;
                    return (
                      <group key={i} position={[fx, fy, fz]} rotation={[0, 0, -gripperOpen * 0.5]}>
                        <mesh material={mats.silver}>
                          <boxGeometry args={[0.06, 0.012, 0.018]} />
                        </mesh>
                        <mesh position={[0.035, -0.005, 0]} material={mats.carbon}>
                          <boxGeometry args={[0.025, 0.01, 0.022]} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ---- Debris Storage Bay (next to arm base) ----
function StorageBay({ mats }: { mats: Mats }) {
  return (
    <group position={[0.6, -0.65, 0.3]}>
      {/* Bay enclosure */}
      <mesh material={mats.lightGray}>
        <boxGeometry args={[0.55, 0.18, 0.45]} />
      </mesh>
      {/* Door (slightly open, navy interior visible) */}
      <mesh position={[0, 0.095, 0.04]} rotation={[-0.35, 0, 0]} material={mats.white}>
        <boxGeometry args={[0.52, 0.01, 0.42]} />
      </mesh>
      <mesh position={[0, 0.09, 0]} material={mats.navy}>
        <boxGeometry args={[0.5, 0.005, 0.4]} />
      </mesh>
      {/* Hinges */}
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.09, 0.21]} material={mats.silver}>
          <cylinderGeometry args={[0.012, 0.012, 0.04, 8]} />
        </mesh>
      ))}
      {/* Bay label stripe */}
      <mesh position={[0, 0, 0.226]} material={mats.accentOrange}>
        <boxGeometry args={[0.4, 0.02, 0.002]} />
      </mesh>
    </group>
  );
}

// ---- Antennas (Earth-facing -Z) ----
function AntennaCluster({ mats }: { mats: Mats }) {
  return (
    <group position={[0, -0.3, -0.55]}>
      {/* High-gain dish */}
      <group position={[-0.35, 0, -0.12]} rotation={[0.4, -0.2, 0]}>
        <mesh material={mats.silver}>
          <cylinderGeometry args={[0.01, 0.01, 0.18, 8]} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.white}>
          <sphereGeometry args={[0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
        </mesh>
        <mesh position={[0, 0.13, 0.06]} material={mats.carbon}>
          <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
        </mesh>
      </group>
      {/* Medium-gain antenna (patch) */}
      <mesh position={[0.35, 0, -0.05]} material={mats.gold}>
        <boxGeometry args={[0.16, 0.02, 0.16]} />
      </mesh>
      <mesh position={[0.35, 0.015, -0.05]} material={mats.lightGray}>
        <boxGeometry args={[0.12, 0.005, 0.12]} />
      </mesh>
      {/* Omni stub */}
      <mesh position={[0.05, 0.05, -0.08]} material={mats.silver}>
        <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
      </mesh>
    </group>
  );
}

// ---- RCS Thruster Cluster (8 corners × small clusters) ----
function ThrusterClusters({ mats }: { mats: Mats }) {
  const W = 0.9;
  const H = 0.6;
  const D = 0.5;
  const positions: [number, number, number][] = [
    [W, H, D], [-W, H, D], [W, H, -D], [-W, H, -D],
    [W, -H, D], [-W, -H, D], [W, -H, -D], [-W, -H, -D],
  ];
  return (
    <group>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          {/* Mounting block */}
          <mesh material={mats.carbon}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
          </mesh>
          {/* Two cones angled outward */}
          {([
            [0.08, 0, 0, 0, 0, -Math.PI / 2],
            [0, 0.08, 0, 0, 0, 0],
            [0, 0, 0.08, Math.PI / 2, 0, 0],
          ] as [number, number, number, number, number, number][])
            .slice(0, 2)
            .map(([x, y, z, rx, ry, rz], j) => (
              <group key={j} position={[Math.sign(p[0]) * 0.06, Math.sign(p[1]) * 0.04, 0]}>
                <mesh material={mats.thrusterCone} rotation={[rx, ry, rz]}>
                  <coneGeometry args={[0.025, 0.06, 12, 1, true]} />
                </mesh>
              </group>
            ))}
        </group>
      ))}
    </group>
  );
}

// ---- AI Compute / heat-pipe radiators (visible side stripes) ----
function Radiators({ mats }: { mats: Mats }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * 0.51]}>
          <mesh material={mats.white}>
            <boxGeometry args={[1.4, 0.9, 0.01]} />
          </mesh>
          {/* Heat-pipe grooves */}
          {[-0.3, -0.1, 0.1, 0.3].map((y) => (
            <mesh key={y} position={[0, y, s * 0.006]} material={mats.lightGray}>
              <boxGeometry args={[1.3, 0.015, 0.003]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ---- Spacecraft root ----
function DebrixSpacecraft({ onPart }: { onPart: (n: string | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const mats = useDebrixMaterials();
  const [t, setT] = useState(0);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.18;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
    }
    setT(state.clock.elapsedTime);
  });

  return (
    <group ref={group}>
      <group onPointerOver={() => onPart("Main Bus")} onPointerOut={() => onPart(null)}>
        <MainBus mats={mats} />
      </group>
      <group onPointerOver={() => onPart("Radiator Panels")} onPointerOut={() => onPart(null)}>
        <Radiators mats={mats} />
      </group>
      <group onPointerOver={() => onPart("Solar Array (Port)")} onPointerOut={() => onPart(null)}>
        <SolarWing side={-1} mats={mats} />
      </group>
      <group onPointerOver={() => onPart("Solar Array (Starboard)")} onPointerOut={() => onPart(null)}>
        <SolarWing side={1} mats={mats} />
      </group>
      <group onPointerOver={() => onPart("Sensor Deck — SSA cams, LiDAR, thermal, HRT")} onPointerOut={() => onPart(null)}>
        <SensorDeck mats={mats} />
      </group>
      <group onPointerOver={() => onPart("6-DOF Inspection & Capture Arm")} onPointerOut={() => onPart(null)}>
        <RoboticArm mats={mats} t={t} />
      </group>
      <group onPointerOver={() => onPart("Debris Storage Bay")} onPointerOut={() => onPart(null)}>
        <StorageBay mats={mats} />
      </group>
      <group onPointerOver={() => onPart("Comms — High & Medium Gain Antennas")} onPointerOut={() => onPart(null)}>
        <AntennaCluster mats={mats} />
      </group>
      <group onPointerOver={() => onPart("RCS Thruster Clusters (×8)")} onPointerOut={() => onPart(null)}>
        <ThrusterClusters mats={mats} />
      </group>
    </group>
  );
}

// ---- Distant debris dust (subtle context) ----
function DebrisField() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const n = 220;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 8 + Math.random() * 14;
      const th = Math.random() * Math.PI * 2;
      const ph = (Math.random() - 0.5) * 0.6;
      a[i * 3] = Math.cos(th) * r;
      a[i * 3 + 1] = Math.sin(ph) * r * 0.3;
      a[i * 3 + 2] = Math.sin(th) * r;
    }
    return a;
  }, []);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.01;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#9aa5b2" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

const SatelliteScene = () => {
  const [part, setPart] = useState<string | null>(null);
  return (
    <div className="w-full h-[500px] md:h-[640px] relative">
      {/* Mission Control HUD overlay */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="px-3 py-2 rounded-md bg-background/60 backdrop-blur border border-border/40 font-mono text-[10px] tracking-wider">
          <div className="text-[9px] text-muted-foreground">SPACECRAFT</div>
          <div className="text-primary font-bold text-sm leading-tight">DEBRI-X V3</div>
          <div className="text-[9px] text-muted-foreground mt-0.5">SSA · INSPECTION · MITIGATION</div>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10 pointer-events-none">
        <div className="px-3 py-2 rounded-md bg-background/60 backdrop-blur border border-border/40 font-mono text-[10px]">
          <div className="text-[9px] text-muted-foreground">BUS</div>
          <div className="text-foreground">1.8 × 1.2 × 1.0 m</div>
          <div className="text-[9px] text-muted-foreground mt-1">ARM</div>
          <div className="text-foreground">6-DOF · 1.8 m reach</div>
          <div className="text-[9px] text-muted-foreground mt-1">SENSORS</div>
          <div className="text-foreground">4× SSA · LiDAR · IR · HRT</div>
        </div>
      </div>
      {part && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-primary text-xs font-mono">
            {part}
          </div>
        </div>
      )}
      <Canvas camera={{ position: [4.5, 2.2, 5.2], fov: 38 }} dpr={[1, 2]} shadows>
        <color attach="background" args={["#05070d"]} />
        <fog attach="fog" args={["#05070d", 18, 38]} />
        <ambientLight intensity={0.18} />
        {/* Sun key light */}
        <directionalLight position={[6, 4, 3]} intensity={1.6} color="#fff8e8" castShadow />
        {/* Earth-bounce fill (cool) */}
        <hemisphereLight args={["#3a6b9a", "#0a0d18", 0.45]} />
        {/* Rim accent */}
        <pointLight position={[-5, 1, -4]} intensity={0.6} color="#5fb3d4" />
        <Stars radius={70} depth={50} count={3500} factor={3.5} saturation={0} fade speed={0.6} />
        <DebrisField />
        <DebrixSpacecraft onPart={setPart} />
        <OrbitControls
          enableZoom
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.35}
          minDistance={3.5}
          maxDistance={12}
        />
      </Canvas>
    </div>
  );
};

export default SatelliteScene;
