
import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import TreeParticles from './TreeParticles';
import Ornaments from './Ornaments';
import { useStore } from '../store';
import * as THREE from 'three';

// 独立的星星组件，跟随树的状态消失
const TopStar = () => {
    const starRef = useRef<THREE.Group>(null);
    
    useFrame(() => {
        if (starRef.current) {
            const { expansion } = useStore.getState();
            const scale = THREE.MathUtils.lerp(1, 0, expansion * 1.5); 
            starRef.current.scale.setScalar(Math.max(0, scale));
            starRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group ref={starRef} position={[0, 5.2, 0]}>
            <mesh>
                <octahedronGeometry args={[0.45, 0]} />
                <meshBasicMaterial color="#ffdd00" />
            </mesh>
            <mesh>
                <sphereGeometry args={[1.2, 16, 16]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
        </group>
    );
};

// 摄像机控制器：负责炸开时的飞入动画
const CameraController = ({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsType> }) => {
    const { camera } = useThree();

    useFrame((state, delta) => {
        const { expansion } = useStore.getState();
        
        // 1. Z轴飞入逻辑: 树(14) -> 星空(0.1)
        // 炸开时，摄像机推进到中心 0.1 处，营造身临其境的感觉
        const targetZ = THREE.MathUtils.lerp(14, 0.1, expansion);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);

        // 2. Y轴锁定逻辑
        // 炸开时，锁定 Y=0 (中心高度)，方便环视照片
        const targetY = THREE.MathUtils.lerp(0, 0, expansion); // 始终为0，这里写全方便理解
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);

        // 同步移动 OrbitControls 的 target，保证摄像机平视
        if (controlsRef.current) {
            controlsRef.current.target.y = camera.position.y;
            controlsRef.current.update();
        }
    });

    return null;
}

const Scene: React.FC = () => {
  const controlsRef = useRef<OrbitControlsType>(null);

  return (
    <div className="w-full h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-[#050510] to-black">
      <Canvas camera={{ position: [0, 0, 14], fov: 45 }}>
        {/* 深色雾气，衔接背景 */}
        <fog attach="fog" args={['#050510', 10, 40]} />
        
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 8, 0]} intensity={1.5} color="#ffaa55" distance={25} decay={2} />
        
        <pointLight position={[10, 0, 10]} intensity={0.8} color="#6688ff" distance={40} />
        <pointLight position={[-10, 2, -5]} intensity={0.5} color="#44ffdd" distance={40} />
        
        <Suspense fallback={null}>
            <group position={[0, -2.5, 0]}>
                <TreeParticles />
                <Ornaments />
                <TopStar />
            </group>
            
            <Stars radius={80} depth={40} count={5000} factor={3} saturation={0.5} fade speed={0.3} />
            
            <Sparkles 
                count={300} 
                scale={[20, 20, 20]} 
                size={3} 
                speed={0.4} 
                opacity={0.6} 
                color="#eef" 
            />
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.5, 0]}>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial 
                    color="#020205" 
                    roughness={0.1} 
                    metalness={0.8} 
                />
            </mesh>
        </Suspense>
        
        <CameraController controlsRef={controlsRef} />

        <OrbitControls 
            ref={controlsRef}
            enablePan={false} 
            enableZoom={true} 
            minDistance={0.1} 
            maxDistance={25}
            autoRotate={false} 
            enableDamping={true}
            dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};

export default Scene;
