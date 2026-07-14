import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars as DreiStars, Html } from "@react-three/drei";

import * as THREE from "three";
import { Play, Pause, RotateCcw, ChevronRight, HelpCircle, X, SkipForward, SkipBack, Camera as CameraIcon, Eye, Target, Activity } from "lucide-react";

/* ---------- Camera presets ---------- */
type CameraPreset = "free" | "chaser" | "station" | "shoulder" | "telemetry";

const PRESET_LABELS: Record<CameraPreset, string> = {
  free: "Free Orbit",
  chaser: "Chaser POV",
  station: "Dock-Station",
  shoulder: "Over-Shoulder",
  telemetry: "Telemetry",
};

/* ---------- Reusable detail bits ---------- */

function SolarArray({ position, rotation = [0, 0, 0] as [number, number, number], width = 1.6, height = 0.9 }) {
  // panel with cell grid
  const cells = 8;
  const rows = 4;
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[width, 0.02, height]} />
        <meshStandardMaterial color="#0b1a3a" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* cell grid overlay */}
      {Array.from({ length: cells }).map((_, i) =>
        Array.from({ length: rows }).map((__, j) => {
          const w = width / cells;
          const h = height / rows;
          return (
            <mesh
              key={`${i}-${j}`}
              position={[-width / 2 + w * (i + 0.5), 0.012, -height / 2 + h * (j + 0.5)]}
            >
              <boxGeometry args={[w * 0.9, 0.002, h * 0.9]} />
              <meshStandardMaterial
                color="#1e3a8a"
                emissive="#3b82f6"
                emissiveIntensity={0.15}
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
          );
        })
      )}
      {/* frame edges */}
      <mesh>
        <boxGeometry args={[width + 0.04, 0.025, 0.03]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

function HighGainDish({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <sphereGeometry args={[0.18, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.7} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.1, 0.06]}>
        <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0.06]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/* ---------- Articulated robotic arm (4-DOF) ---------- */

// Realistic joint limits (radians) — modelled after Canadarm2-class manipulator envelopes.
export const ARM_LIMITS = {
  shoulder: { min: THREE.MathUtils.degToRad(-150), max: THREE.MathUtils.degToRad(-20) },
  elbow:    { min: THREE.MathUtils.degToRad(-160), max: THREE.MathUtils.degToRad(-15) },
  wrist:    { min: THREE.MathUtils.degToRad(-45),  max: THREE.MathUtils.degToRad(60)  },
  extension:{ min: 0.02, max: 0.96 },
};

export function armJointAngles(extension: number) {
  const e = THREE.MathUtils.clamp(extension, ARM_LIMITS.extension.min, ARM_LIMITS.extension.max);
  return {
    shoulder: THREE.MathUtils.lerp(ARM_LIMITS.shoulder.min, ARM_LIMITS.shoulder.max, e),
    elbow:    THREE.MathUtils.lerp(ARM_LIMITS.elbow.min,    ARM_LIMITS.elbow.max,    e),
    wrist:    THREE.MathUtils.lerp(ARM_LIMITS.wrist.max,    ARM_LIMITS.wrist.min,    e),
    e,
  };
}

function RoboticArm({ extension, grip, holding }: { extension: number; grip: number; holding: boolean }) {
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const wrist = useRef<THREE.Group>(null);
  // Smooth joint targets so scrubbing/animation looks fluid and respects rate limits.
  const state = useRef({ s: 0, el: 0, w: 0, init: false });

  useFrame((_, dt) => {
    const { shoulder: sT, elbow: elT, wrist: wT } = armJointAngles(extension);
    if (!state.current.init) {
      state.current = { s: sT, el: elT, w: wT, init: true };
    } else {
      // Rate-limited joint slew (max ~1.2 rad/s) then clamp to hard limits.
      const maxRate = 1.2 * dt;
      const step = (cur: number, tgt: number) =>
        cur + THREE.MathUtils.clamp(tgt - cur, -maxRate, maxRate);
      state.current.s  = THREE.MathUtils.clamp(step(state.current.s,  sT), ARM_LIMITS.shoulder.min, ARM_LIMITS.shoulder.max);
      state.current.el = THREE.MathUtils.clamp(step(state.current.el, elT), ARM_LIMITS.elbow.min,    ARM_LIMITS.elbow.max);
      state.current.w  = THREE.MathUtils.clamp(step(state.current.w,  wT), ARM_LIMITS.wrist.min,     ARM_LIMITS.wrist.max);
    }
    if (shoulder.current) shoulder.current.rotation.z = state.current.s;
    if (elbow.current)    elbow.current.rotation.z    = state.current.el;
    if (wrist.current)    wrist.current.rotation.z    = state.current.w;
  });

  const segMat = <meshStandardMaterial color="#d1d5db" metalness={0.85} roughness={0.25} />;
  const jointMat = <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />;

  return (
    <group position={[0.35, 0.05, 0]}>
      {/* base mount */}
      <mesh>
        <cylinderGeometry args={[0.07, 0.09, 0.06, 16]} />
        {jointMat}
      </mesh>
      <group ref={shoulder} position={[0, 0.04, 0]}>
        {/* shoulder joint */}
        <mesh>
          <sphereGeometry args={[0.06, 16, 16]} />
          {jointMat}
        </mesh>
        {/* upper segment */}
        <mesh position={[0.25, 0, 0]}>
          <boxGeometry args={[0.5, 0.07, 0.07]} />
          {segMat}
        </mesh>
        <group ref={elbow} position={[0.5, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.055, 16, 16]} />
            {jointMat}
          </mesh>
          {/* fore segment */}
          <mesh position={[0.22, 0, 0]}>
            <boxGeometry args={[0.45, 0.06, 0.06]} />
            {segMat}
          </mesh>
          <group ref={wrist} position={[0.44, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.045, 16, 16]} />
              {jointMat}
            </mesh>
            {/* end effector */}
            <group position={[0.12, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.05, 0.1, 12]} />
                {jointMat}
              </mesh>
              {/* three claw fingers */}
              {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a, i) => (
                <group key={i} rotation={[a, 0, 0]} position={[0.05, 0, 0]}>
                  <mesh position={[0.04, 0.04 + (1 - grip) * 0.05, 0]} rotation={[0, 0, -0.4 - (1 - grip) * 0.5]}>
                    <boxGeometry args={[0.12, 0.015, 0.025]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
                  </mesh>
                </group>
              ))}
              {/* held debris piece */}
              {holding && (
                <mesh position={[0.16, 0, 0]} rotation={[0.4, 0.2, 0.1]}>
                  <cylinderGeometry args={[0.05, 0.06, 0.16, 12]} />
                  <meshStandardMaterial color="#78716c" metalness={0.6} roughness={0.55} />
                </mesh>
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/* ---------- Chaser (DEBRIX) — detailed bus ---------- */

function Chaser({
  position,
  armExtension,
  grip,
  holding,
  thruster,
}: {
  position: THREE.Vector3;
  armExtension: number;
  grip: number;
  holding: boolean;
  thruster: number; // 0..1
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.lerp(position, 0.04);
    ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.15) * 0.1;
  });
  return (
    <group ref={ref}>
      {/* main bus */}
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.5, 0.55]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* multi-layer insulation strips (gold foil look) */}
      {[-0.18, -0.06, 0.06, 0.18].map((y) => (
        <mesh key={y} position={[0, y, 0.276]}>
          <boxGeometry args={[0.62, 0.08, 0.005]} />
          <meshStandardMaterial color="#b08a3a" metalness={0.95} roughness={0.3} emissive="#5a3f10" emissiveIntensity={0.1} />
        </mesh>
      ))}
      {/* panel rivets */}
      {[-0.25, 0.25].map((x) =>
        [-0.2, 0, 0.2].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.278]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.005, 8]} />
            <meshStandardMaterial color="#6b7280" metalness={0.95} />
          </mesh>
        ))
      )}
      {/* star tracker / optics */}
      <mesh position={[-0.2, 0.28, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.12, 16]} />
        <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.2, 0.34, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.01, 16]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.6} />
      </mesh>
      {/* antenna */}
      <HighGainDish position={[0.15, 0.28, 0]} />
      {/* solar arrays on booms */}
      <mesh position={[-0.55, 0, 0]}>
        <boxGeometry args={[0.4, 0.02, 0.02]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} />
      </mesh>
      <SolarArray position={[-1.5, 0, 0]} />
      <mesh position={[0.55, 0, 0]}>
        <boxGeometry args={[0.4, 0.02, 0.02]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} />
      </mesh>
      <SolarArray position={[1.5, 0, 0]} />
      {/* RCS thruster nozzles */}
      {[[-0.35, 0, 0.28], [0.35, 0, 0.28], [0, 0.25, 0.28], [0, -0.25, 0.28]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.025, 0.05, 8, 1, true]} />
          <meshStandardMaterial color="#1f2937" side={THREE.DoubleSide} metalness={0.7} />
        </mesh>
      ))}
      {/* main aft engine */}
      <mesh position={[0, 0, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.09, 0.18, 16, 1, true]} />
        <meshStandardMaterial color="#374151" side={THREE.DoubleSide} metalness={0.85} roughness={0.4} />
      </mesh>
      {/* engine flame */}
      {thruster > 0 && (
        <group position={[0, 0, -0.5]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.08 * thruster, 0.55 * thruster, 16]} />
            <meshStandardMaterial color="#93c5fd" emissive="#3b82f6" emissiveIntensity={3} transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.15]}>
            <coneGeometry args={[0.05 * thruster, 0.8 * thruster, 16]} />
            <meshStandardMaterial color="#fef3c7" emissive="#f59e0b" emissiveIntensity={4} transparent opacity={0.6} />
          </mesh>
          <pointLight color="#60a5fa" intensity={2 * thruster} distance={4} />
        </group>
      )}
      {/* status beacon */}
      <mesh position={[0, 0.26, 0.2]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} />
      </mesh>
      {/* robotic arm on front face */}
      <RoboticArm extension={armExtension} grip={grip} holding={holding} />
    </group>
  );
}

/* ---------- Tumbling debris (rocket upper stage) ---------- */

function Debris({ position, captured }: { position: THREE.Vector3; captured: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!ref.current) return;
    if (!captured) {
      ref.current.position.lerp(position, 0.05);
      ref.current.rotation.x += dt * 0.4;
      ref.current.rotation.y += dt * 0.25;
      ref.current.rotation.z += dt * 0.15;
    } else {
      // hidden — being held by arm
      ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 0, 0.2));
    }
  });
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[0.18, 0.22, 0.9, 16]} />
        <meshStandardMaterial color="#9a8a78" metalness={0.6} roughness={0.7} />
      </mesh>
      {/* dark scorched ring */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.181, 0.181, 0.05, 16]} />
        <meshStandardMaterial color="#3f3a2e" metalness={0.5} roughness={0.9} />
      </mesh>
      {/* broken nozzle */}
      <mesh position={[0, -0.55, 0]} rotation={[0.3, 0, 0.1]}>
        <coneGeometry args={[0.18, 0.25, 16, 1, true]} />
        <meshStandardMaterial color="#5b5346" side={THREE.DoubleSide} metalness={0.7} roughness={0.6} />
      </mesh>
      {/* small protruding antenna stub */}
      <mesh position={[0.15, 0.4, 0]} rotation={[0, 0, 0.6]}>
        <cylinderGeometry args={[0.01, 0.01, 0.3, 6]} />
        <meshStandardMaterial color="#6b7280" metalness={0.9} />
      </mesh>
    </group>
  );
}

/* ---------- Detection HUD ring around debris ---------- */

function LockOnRing({ active, position }: { active: boolean; position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.z = s.clock.elapsedTime * 1.2;
    const pulse = 0.9 + Math.sin(s.clock.elapsedTime * 4) * 0.1;
    ref.current.scale.setScalar(pulse);
  });
  if (!active) return null;
  return (
    <group ref={ref} position={position}>
      <mesh>
        <torusGeometry args={[0.5, 0.008, 8, 48]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a, i) => (
        <mesh key={i} rotation={[0, 0, a]} position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0]}>
          <boxGeometry args={[0.12, 0.012, 0.012]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Earth ---------- */

function Earth({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.04;
  });
  if (!visible) return null;
  return (
    <group position={[0, -5.5, -3]}>
      <mesh ref={ref}>
        <sphereGeometry args={[3.5, 64, 64]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* land patches */}
      <mesh rotation={[0, 0.6, 0]}>
        <sphereGeometry args={[3.51, 32, 32]} />
        <meshStandardMaterial color="#15803d" transparent opacity={0.35} />
      </mesh>
      {/* atmosphere */}
      <mesh>
        <sphereGeometry args={[3.75, 64, 64]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.95, 64, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ---------- Re-entry plasma trail ---------- */

function ReentryTrail({ active, position }: { active: boolean; position: [number, number, number] }) {
  if (!active) return null;
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.2, 0]}>
        <coneGeometry args={[0.3, 2.5, 16]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.8, 0]}>
        <coneGeometry args={[0.18, 3.2, 16]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.6} />
      </mesh>
      <pointLight color="#fb923c" intensity={3} distance={6} />
    </group>
  );
}

/* ---------- Mission state derivation (shared by Scene + HUD) ---------- */

function deriveMissionState(phase: number, p: number) {
  const px =
    phase === 0 ? -3 :
    phase === 1 ? THREE.MathUtils.lerp(-3, -1.3, p) :
    phase === 2 ? -1.3 :
    phase === 3 ? -1.3 :
    phase === 4 ? THREE.MathUtils.lerp(-1.3, -0.5, p) :
    THREE.MathUtils.lerp(-0.5, 0.5, p);
  const py = phase >= 4 ? -p * 1.5 - (phase === 5 ? 1 : 0) : 0;
  const chaserPos = new THREE.Vector3(px, py, 0);
  const debrisPos = phase >= 3
    ? new THREE.Vector3(chaserPos.x + 0.95, chaserPos.y + 0.05, 0)
    : new THREE.Vector3(0.6, 0.05, 0);

  const armExtension =
    phase < 2 ? 0 :
    phase === 2 ? p :
    phase === 3 ? 1 - p * 0.7 :
    0.3;
  const grip = phase >= 2 && (phase > 2 || p > 0.7) ? 0 : 1;
  const holding = (phase === 2 && p > 0.85) || phase === 3 || phase === 4 || phase === 5;
  const thruster = phase === 4 ? 1 : phase === 5 ? 0.4 : 0;

  return { chaserPos, debrisPos, armExtension, grip, holding, thruster };
}

/* ---------- Camera presets controller ---------- */

function CameraRig({
  preset,
  chaserPos,
  debrisPos,
}: {
  preset: CameraPreset;
  chaserPos: THREE.Vector3;
  debrisPos: THREE.Vector3;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 1.5, 5.5));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  const tmpLook = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    if (preset === "free") return; // user-controlled via OrbitControls

    const c = chaserPos;
    const d = debrisPos;
    const dir = new THREE.Vector3().subVectors(d, c).normalize();
    // perpendicular in XZ plane (for shoulder offsets)
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    if (preset === "chaser") {
      // First-person from chaser's docking camera, looking at debris
      targetPos.current.set(c.x + dir.x * 0.35, c.y + 0.1, c.z + dir.z * 0.35 + 0.0001);
      targetLook.current.copy(d);
    } else if (preset === "station") {
      // Wide "approach corridor" view from behind the debris looking back at the chaser
      targetPos.current.set(d.x + dir.x * 2.8, d.y + 0.6, d.z + 1.8);
      targetLook.current.lerpVectors(c, d, 0.5);
    } else if (preset === "shoulder") {
      // Over-the-shoulder of the chaser
      targetPos.current.set(c.x - dir.x * 1.4 + side.x * 0.6, c.y + 0.8, c.z - dir.z * 1.4 + 1.2);
      targetLook.current.copy(d);
    } else if (preset === "telemetry") {
      // Cinematic top-down/iso for full telemetry context
      targetPos.current.set((c.x + d.x) / 2 + 0.5, 4.2, 4.5);
      targetLook.current.lerpVectors(c, d, 0.5);
    }

    const k = 1 - Math.exp(-dt * 3.2); // smooth follow
    camera.position.lerp(targetPos.current, k);
    tmpLook.current.copy(camera.getWorldDirection(new THREE.Vector3()))
      .multiplyScalar(0)
      .add(targetLook.current);
    camera.lookAt(tmpLook.current);
  });

  return null;
}

/* ---------- Scene orchestration ---------- */

function Scene({ phase, p, preset }: { phase: number; p: number; preset: CameraPreset }) {
  const { chaserPos, debrisPos, armExtension, grip, holding, thruster } = useMemo(
    () => deriveMissionState(phase, p),
    [phase, p]
  );

  return (
    <Canvas shadows camera={{ position: [0, 1.5, 5.5], fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={["#04070f"]} />
      <fog attach="fog" args={["#04070f", 12, 22]} />

      <ambientLight intensity={0.18} />
      <directionalLight position={[6, 4, 5]} intensity={1.4} color="#ffffff" castShadow />
      <directionalLight position={[-5, -2, -3]} intensity={0.25} color="#1e3a8a" />
      <hemisphereLight args={["#93c5fd", "#020617", 0.2]} />

      <DreiStars radius={60} depth={40} count={3500} factor={3} fade speed={0.3} />

      <Chaser
        position={chaserPos}
        armExtension={armExtension}
        grip={grip}
        holding={holding}
        thruster={thruster}
      />
      {!holding && <Debris position={debrisPos} captured={false} />}
      <LockOnRing active={phase === 0 || phase === 1} position={[0.6, 0.05, 0]} />

      <Earth visible={phase >= 4} />
      <ReentryTrail active={phase === 5} position={[chaserPos.x, chaserPos.y, 0]} />

      <CameraRig preset={preset} chaserPos={chaserPos} debrisPos={debrisPos} />

      <OrbitControls
        enabled={preset === "free"}
        enableZoom
        enablePan={false}
        autoRotate={preset === "free" && phase === 0}
        autoRotateSpeed={0.4}
        maxDistance={9}
        minDistance={3}
      />
    </Canvas>
  );
}


/* ---------- Phase definitions ---------- */

const phases = [
  {
    title: "Detection",
    short: "Step 1 · Detect",
    desc: "Onboard YOLOv8 vision stack identifies and classifies the target rocket body. Range and attitude logged.",
    metric: "Range",
    unit: "km",
    startVal: 14.2,
    endVal: 6.4,
    tip: "The chaser uses onboard cameras — no Earth uplink needed.",
  },
  {
    title: "Approach & Lock-On",
    short: "Step 2 · Approach",
    desc: "UKF + SGP4 propagator guides closing maneuver. MPC controller holds sub-meter alignment under collision-avoidance constraints.",
    metric: "Closing",
    unit: "m/s",
    startVal: 2.4,
    endVal: 0.05,
    tip: "Closing rate is slowed to centimeters per second before contact.",
  },
  {
    title: "Capture",
    short: "Step 3 · Capture",
    desc: "4-DOF manipulator extends and performs soft-capture using impedance control. Claw closes around the debris attachment ring.",
    metric: "Reach",
    unit: "m",
    startVal: 0,
    endVal: 1.2,
    tip: "Impedance control keeps the arm compliant so it doesn’t push the debris away.",
  },
  {
    title: "Stow & Secure",
    short: "Step 4 · Stow",
    desc: "Arm retracts and berths the debris into the payload bay. Mass properties are re-estimated for the combined stack.",
    metric: "Stow",
    unit: "%",
    startVal: 0,
    endVal: 100,
    tip: "After stowing, the chaser recalculates its center of mass before any burn.",
  },
  {
    title: "Deorbit Burn",
    short: "Step 5 · Burn",
    desc: "Main engine fires retrograde. ΔV is computed for re-entry over the South Pacific Ocean Uninhabited Area (SPOUA).",
    metric: "ΔV",
    unit: "m/s",
    startVal: 0,
    endVal: 160,
    tip: "A small retrograde burn is enough to drop the perigee into the atmosphere.",
  },
  {
    title: "Atmospheric Re-entry",
    short: "Step 6 · Re-entry",
    desc: "Combined stack enters the upper atmosphere. Friction heating disintegrates both chaser and debris over the target ocean zone.",
    metric: "Altitude",
    unit: "km",
    startVal: 120,
    endVal: 0,
    tip: "Everything burns up — nothing reaches the ground inhabited areas.",
  },
];

const PHASE_COUNT = phases.length;

const DockDumpSection = () => {
  const [phase, setPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [p, setP] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [preset, setPreset] = useState<CameraPreset>("free");

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setP((cur) => {
        if (cur >= 1) {
          setPhase((prev) => {
            if (prev >= PHASE_COUNT - 1) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          });
          return 0;
        }
        return Math.min(1, cur + 0.012 * speed);
      });
    }, 50);
    return () => clearInterval(id);
  }, [isPlaying, speed]);

  const goTo = (i: number) => {
    setPhase(Math.max(0, Math.min(PHASE_COUNT - 1, i)));
    setP(0);
    setIsPlaying(false);
  };
  const reset = () => goTo(0);

  const current = phases[phase];
  const liveValue = current.startVal + (current.endVal - current.startVal) * p;
  const formatVal = (v: number) =>
    Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  // Docking metrics HUD — derived from mission state for a realistic instrument cluster.
  const { chaserPos, debrisPos, armExtension, grip, holding } = useMemo(
    () => deriveMissionState(phase, p),
    [phase, p]
  );
  const range = Math.max(0, chaserPos.distanceTo(debrisPos) * 1000 - 250); // metres, sub-step distance
  const closingRate =
    phase === 1 ? THREE.MathUtils.lerp(2.4, 0.05, p) :
    phase === 2 ? THREE.MathUtils.lerp(0.05, 0.01, p) :
    phase >= 3 ? 0 : 4.8;
  const lateralOffset =
    phase === 1 ? THREE.MathUtils.lerp(1.8, 0.04, p) :
    phase === 2 ? THREE.MathUtils.lerp(0.04, 0.005, p) :
    phase >= 3 ? 0 : 6.2;
  const attitudeErr =
    phase === 1 ? THREE.MathUtils.lerp(8.5, 0.6, p) :
    phase === 2 ? THREE.MathUtils.lerp(0.6, 0.1, p) :
    phase >= 3 ? 0.05 : 14.0;
  const gripForce = holding ? 42 + Math.sin(p * 8) * 3 : grip < 1 ? p * 18 : 0;
  const armReach = armExtension * 1.2; // metres
  const dockingMetrics = [
    { label: "Range", value: range >= 1000 ? (range / 1000).toFixed(2) : range.toFixed(0), unit: range >= 1000 ? "km" : "m", tone: "primary" as const },
    { label: "Closing", value: closingRate.toFixed(2), unit: "m/s", tone: closingRate < 0.1 ? "good" : closingRate > 1 ? "warn" : "primary" as const },
    { label: "Lateral", value: lateralOffset.toFixed(2), unit: "m", tone: lateralOffset < 0.05 ? "good" : "primary" as const },
    { label: "Attitude", value: attitudeErr.toFixed(2), unit: "°", tone: attitudeErr < 0.5 ? "good" : attitudeErr > 5 ? "warn" : "primary" as const },
    { label: "Arm Reach", value: armReach.toFixed(2), unit: "m", tone: "primary" as const },
    { label: "Grip Force", value: gripForce.toFixed(0), unit: "N", tone: gripForce > 0 ? "good" : "muted" as const },
  ];
  const toneClass = (t: string) =>
    t === "good" ? "text-emerald-300 border-emerald-400/40" :
    t === "warn" ? "text-amber-300 border-amber-400/40" :
    t === "muted" ? "text-muted-foreground border-border/40" :
    "text-primary border-primary/40";


  return (
    <section id="dock-dump" className="relative z-10">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <p className="font-display text-xs tracking-[0.3em] text-primary mb-3 uppercase">Simulation</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Dock &amp; Dump — Mission Replay</h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            A realistic six-step walkthrough of an autonomous debris removal mission: from first detection to atmospheric burn-up.
            Drag to orbit the scene, scroll to zoom, and use the timeline to scrub any phase.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* 3D Viewport */}
          <div className="lg:col-span-3 glass-card p-1 overflow-hidden relative">
            <div className="w-full h-[460px] md:h-[540px] rounded-xl overflow-hidden relative bg-[#04070f]">
              <Scene phase={phase} p={p} preset={preset} />

              {/* Top HUD */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background/70 backdrop-blur-md border border-border/40 pointer-events-auto">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isPlaying ? "bg-primary" : "bg-muted-foreground"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          isPlaying ? "bg-primary" : "bg-muted-foreground"
                        }`}
                      />
                    </span>
                    <span className="text-[10px] font-display tracking-widest uppercase text-foreground/80">
                      {isPlaying ? `Live · ${speed}x` : "Standby"}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-background/70 backdrop-blur-md border border-primary/30 text-[10px] font-display tracking-widest uppercase text-primary">
                    {current.short}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 items-end">
                  <button
                    onClick={() => setShowHelp((v) => !v)}
                    aria-label="Toggle help overlay"
                    className="pointer-events-auto w-8 h-8 rounded-md bg-background/70 backdrop-blur-md border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {showHelp ? <X className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
                  </button>
                  <div className="px-2.5 py-1 rounded-md bg-background/70 backdrop-blur-md border border-border/40 text-[10px] font-display tracking-widest uppercase text-muted-foreground">
                    {current.metric}
                  </div>
                  <div className="px-3 py-1.5 rounded-md bg-background/85 backdrop-blur-md border border-primary/40 text-primary text-base font-mono tabular-nums">
                    {formatVal(liveValue)}
                    <span className="text-[10px] text-muted-foreground ml-1">{current.unit}</span>
                  </div>
                </div>
              </div>

              {/* Camera preset chips */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-md bg-background/80 backdrop-blur-md border border-border/40 pointer-events-auto">
                {([
                  { id: "free" as CameraPreset, icon: <CameraIcon className="w-3 h-3" />, label: "Free" },
                  { id: "chaser" as CameraPreset, icon: <Eye className="w-3 h-3" />, label: "Chaser POV" },
                  { id: "station" as CameraPreset, icon: <Target className="w-3 h-3" />, label: "Dock View" },
                  { id: "shoulder" as CameraPreset, icon: <Eye className="w-3 h-3" />, label: "Over-Shoulder" },
                  { id: "telemetry" as CameraPreset, icon: <Activity className="w-3 h-3" />, label: "Telemetry" },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPreset(opt.id)}
                    title={PRESET_LABELS[opt.id]}
                    aria-pressed={preset === opt.id}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-display tracking-wider uppercase transition-colors ${
                      preset === opt.id
                        ? "bg-primary/30 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.icon}
                    <span className="hidden md:inline">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Docking Metrics HUD — left rail */}
              <div className="absolute left-3 top-24 w-[148px] hidden sm:block pointer-events-none">
                <div className="p-2 rounded-md bg-background/80 backdrop-blur-md border border-border/40">
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <Activity className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-display tracking-[0.2em] uppercase text-primary">Docking HUD</span>
                  </div>
                  <div className="space-y-1">
                    {dockingMetrics.map((m) => (
                      <div
                        key={m.label}
                        className={`flex items-baseline justify-between gap-1 px-1.5 py-1 rounded border bg-background/40 ${toneClass(m.tone)}`}
                      >
                        <span className="text-[9px] font-display tracking-wider uppercase text-muted-foreground/90">
                          {m.label}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums">
                          {m.value}
                          <span className="text-[8px] text-muted-foreground ml-0.5">{m.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>



              {/* Help overlay */}
              <AnimatePresence>
                {showHelp && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/85 backdrop-blur-sm p-5 md:p-8 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-sm tracking-widest uppercase text-primary">How to use this simulation</h3>
                      <button
                        onClick={() => setShowHelp(false)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Close help"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground leading-relaxed">
                      <div className="p-3 rounded-md border border-border/40 bg-card/40">
                        <p className="text-foreground font-display tracking-wider text-[11px] uppercase mb-1">Camera</p>
                        Drag to orbit · scroll to zoom · phase 1 auto-rotates.
                      </div>
                      <div className="p-3 rounded-md border border-border/40 bg-card/40">
                        <p className="text-foreground font-display tracking-wider text-[11px] uppercase mb-1">Playback</p>
                        Play/pause, step ±, reset, or change speed (1×/2×/4×).
                      </div>
                      <div className="p-3 rounded-md border border-border/40 bg-card/40">
                        <p className="text-foreground font-display tracking-wider text-[11px] uppercase mb-1">Timeline</p>
                        Click any segment to jump to that mission phase.
                      </div>
                      <div className="p-3 rounded-md border border-border/40 bg-card/40">
                        <p className="text-foreground font-display tracking-wider text-[11px] uppercase mb-1">Telemetry</p>
                        Top-right value reflects the current phase metric in real time.
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-md border border-primary/30 bg-primary/5 text-xs text-foreground">
                      <span className="font-display tracking-wider text-[11px] uppercase text-primary mr-2">In plain English:</span>
                      {current.tip}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom controls */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 p-2 rounded-lg bg-background/85 backdrop-blur-md border border-border/40">
                <button
                  onClick={() => goTo(phase - 1)}
                  disabled={phase === 0}
                  aria-label="Previous step"
                  className="w-8 h-8 rounded-md bg-secondary/50 text-muted-foreground flex items-center justify-center hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsPlaying((v) => !v)}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="w-9 h-9 rounded-md bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => goTo(phase + 1)}
                  disabled={phase === PHASE_COUNT - 1}
                  aria-label="Next step"
                  className="w-8 h-8 rounded-md bg-secondary/50 text-muted-foreground flex items-center justify-center hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={reset}
                  aria-label="Reset"
                  className="w-8 h-8 rounded-md bg-secondary/50 text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 flex items-center gap-1 px-1">
                  {phases.map((ph, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Jump to ${ph.title}`}
                      className="flex-1 group"
                    >
                      <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-200"
                          style={{
                            width: phase > i ? "100%" : phase === i ? `${p * 100}%` : "0%",
                            backgroundColor:
                              phase >= i ? "hsl(var(--primary))" : "transparent",
                          }}
                        />
                      </div>
                      <div className={`text-[9px] mt-1 font-display tracking-wider uppercase truncate text-center ${
                        phase === i ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                      }`}>
                        {i + 1}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-0.5 ml-1 p-0.5 rounded-md bg-secondary/40 border border-border/40">
                  {[1, 2, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-1.5 py-0.5 text-[10px] font-display rounded ${
                        speed === s ? "bg-primary/30 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label={`Playback speed ${s}x`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step list */}
          <div className="lg:col-span-2 space-y-2">
            {phases.map((ph, i) => (
              <motion.button
                key={i}
                onClick={() => goTo(i)}
                whileHover={{ x: 2 }}
                className={`w-full text-left p-3.5 rounded-lg border transition-all duration-300 ${
                  phase === i
                    ? "bg-primary/10 border-primary/40 shadow-[0_0_25px_hsl(var(--primary)/0.08)]"
                    : i < phase
                    ? "bg-accent/5 border-accent/20"
                    : "bg-card/40 border-border/50 hover:border-primary/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-7 h-7 flex-shrink-0 rounded-md flex items-center justify-center text-[11px] font-display font-bold ${
                      phase === i
                        ? "bg-primary text-primary-foreground"
                        : i < phase
                        ? "bg-accent/30 text-accent"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`font-display text-sm tracking-wide ${
                          phase === i ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {ph.title}
                      </span>
                      {phase === i && <ChevronRight className="w-4 h-4 text-primary animate-pulse flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{ph.desc}</p>
                    {phase === i && (
                      <div className="w-full h-0.5 bg-secondary/50 rounded mt-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded transition-all"
                          style={{ width: `${p * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DockDumpSection;
