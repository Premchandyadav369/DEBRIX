import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

function SatelliteModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c0c0c0", metalness: 0.9, roughness: 0.15 }), []);
  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1565c0", metalness: 0.7, roughness: 0.2 }), []);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4fc3f7", emissive: "#4fc3f7", emissiveIntensity: 0.4 }), []);
  const armMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#666", metalness: 0.9, roughness: 0.1 }), []);

  return (
    <group ref={groupRef}>
      <mesh material={bodyMat}>
        <boxGeometry args={[1.2, 0.6, 0.8]} />
      </mesh>
      <mesh position={[-1.8, 0, 0]} material={panelMat}>
        <boxGeometry args={[1.8, 0.05, 0.9]} />
      </mesh>
      <mesh position={[-1.8, 0.03, 0]} material={accentMat}>
        <boxGeometry args={[1.7, 0.02, 0.85]} />
      </mesh>
      <mesh position={[1.8, 0, 0]} material={panelMat}>
        <boxGeometry args={[1.8, 0.05, 0.9]} />
      </mesh>
      <mesh position={[1.8, 0.03, 0]} material={accentMat}>
        <boxGeometry args={[1.7, 0.02, 0.85]} />
      </mesh>
      <mesh position={[-0.8, 0, 0]} material={armMat}>
        <boxGeometry args={[0.4, 0.08, 0.1]} />
      </mesh>
      <mesh position={[0.8, 0, 0]} material={armMat}>
        <boxGeometry args={[0.4, 0.08, 0.1]} />
      </mesh>
      <mesh position={[0, 0.35, 0.2]} material={armMat}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
      </mesh>
      <mesh position={[0, 0.55, 0.2]} material={armMat}>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
      </mesh>
      <mesh position={[0.15, 0.75, 0.2]} rotation={[0, 0, -0.6]} material={armMat}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
      </mesh>
      <mesh position={[0.28, 0.85, 0.2]} material={accentMat}>
        <sphereGeometry args={[0.06, 8, 8]} />
      </mesh>
      <mesh position={[0.4, 0.35, -0.2]} material={bodyMat}>
        <cylinderGeometry args={[0.1, 0.08, 0.15, 8]} />
      </mesh>
      <mesh position={[0.4, 0.43, -0.2]} material={accentMat}>
        <sphereGeometry args={[0.05, 8, 8]} />
      </mesh>
      <mesh position={[0, -0.32, 0]} material={armMat}>
        <cylinderGeometry args={[0.2, 0.15, 0.05, 12]} />
      </mesh>
      <mesh position={[0, 0, -0.42]} material={accentMat}>
        <boxGeometry args={[0.3, 0.3, 0.02]} />
      </mesh>
      <mesh position={[-0.3, 0.4, -0.2]} material={armMat}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 6]} />
      </mesh>
      <mesh position={[-0.3, 0.6, -0.2]} material={accentMat}>
        <sphereGeometry args={[0.03, 6, 6]} />
      </mesh>
    </group>
  );
}

function DebrisParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 100;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#4fc3f7" transparent opacity={0.5} />
    </points>
  );
}

const SatelliteScene = () => {
  return (
    <div className="w-full h-[500px] md:h-[600px]">
      <Canvas camera={{ position: [4, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
        <pointLight position={[-3, 2, -3]} intensity={0.5} color="#22b8cf" />
        <Stars radius={50} depth={50} count={2000} factor={3} saturation={0} fade speed={1} />
        <SatelliteModel />
        <DebrisParticles />
        <OrbitControls enableZoom={true} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};

export default SatelliteScene;
