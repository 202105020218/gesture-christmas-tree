
import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Image } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, OrnamentImage } from '../store';

const OrnamentItemWrapper: React.FC<{
    data: OrnamentImage,
    index: number,
    totalCount: number,
    rotationRef: React.MutableRefObject<number>,
    isHovered: boolean,
    isActive: boolean
}> = ({ data, index, totalCount, rotationRef, isHovered, isActive }) => {
    const ref = useRef<THREE.Group>(null);
    const meshRef = useRef<any>(null);
    const frameRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (!ref.current) return;
        
        const { expansion } = useStore.getState();
        const t = state.clock.getElapsedTime();

        // --- 1. Compact Mode (树上状态) ---
        const compactX = data.pos[0];
        const compactY = data.pos[1];
        const compactZ = data.pos[2];
        const compactAngle = Math.atan2(compactZ, compactX);
        const compactRadius = Math.sqrt(compactX * compactX + compactZ * compactZ);

        // --- 2. Exploded Mode (圆环相册状态) ---
        // 布局改为水平圆环，围绕摄像机
        const ringRadius = 8.5; 
        
        // 角度分布：均匀分布在圆周上
        const angleStep = (Math.PI * 2) / Math.max(totalCount, 1);
        const ringAngle = index * angleStep;
        
        // 高度分布：压缩在视平线附近 (-1.5 ~ 1.5)
        const heightHash = ((index * 9301 + 49297) % 233280) / 233280.0;
        const ringWorldY = (heightHash - 0.5) * 3.0; // -1.5 到 1.5
        
        // --- 3. 插值计算 ---
        const currentRotation = rotationRef.current;
        
        // 混合 半径
        const finalRadius = THREE.MathUtils.lerp(compactRadius, ringRadius, expansion);
        
        // 混合 高度
        // Visual Local Y needs +2.5 to be at World Y=0 (since Group is at -2.5)
        const targetRingY = ringWorldY + 2.5; 
        const finalY = THREE.MathUtils.lerp(compactY, targetRingY, expansion);
        
        // 混合 角度
        const cX = compactRadius * Math.cos(compactAngle + currentRotation);
        const cZ = compactRadius * Math.sin(compactAngle + currentRotation);
        
        const eX = ringRadius * Math.cos(ringAngle + currentRotation);
        const eZ = ringRadius * Math.sin(ringAngle + currentRotation);
        
        const finalX = THREE.MathUtils.lerp(cX, eX, expansion);
        const finalZ = THREE.MathUtils.lerp(cZ, eZ, expansion);

        // 应用位置
        ref.current.position.set(finalX, finalY, finalZ);
        
        // 4. 浮动动画
        // 炸开时：只在 Y 轴做微量浮动
        // 减慢速度(0.18)和幅度(0.009)以便于选中
        if (expansion > 0.5) {
            const floatOffset = Math.sin(t * 0.18 + index) * 0.009;
            ref.current.position.y += floatOffset;
        } else {
            // 树上挂件受风吹
             ref.current.position.y += Math.sin(t * 2 + index) * 0.02;
        }

        // 5. 缩放逻辑
        // 聚合时(Compact)：作为小挂件，尺寸要小 (0.35)
        // 炸开时(Exploded)：作为照片行星，尺寸要大 (1.0)
        let baseScale = THREE.MathUtils.lerp(0.35, 1.0, expansion);
        let targetScale = baseScale;
        
        if (isHovered && expansion > 0.8) targetScale = 1.2; // 悬停稍微变大
        if (isActive) targetScale = 3.5; // 打开时依然要够大
        
        const currentScale = ref.current.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
        ref.current.scale.set(newScale, newScale, newScale);
        
        // 材质更新
        if (meshRef.current) {
            meshRef.current.material.color.setHex((isHovered && expansion > 0.6) || isActive ? 0xffffff : 0xdddddd);
            meshRef.current.material.opacity = 1.0;
        }

        // 边框发光
        if (frameRef.current) {
            const mat = frameRef.current.material as THREE.MeshStandardMaterial;
            if (isHovered && expansion > 0.6) {
                 mat.emissive.setHex(0xffaa00);
            } else {
                 mat.emissive.setHex(0x000000);
            }
        }
    });

    return (
        <Billboard ref={ref} follow={true}>
            <group>
                {/* 装饰：顶部挂绳 (炸开时隐藏) */}
                <mesh position={[0, 0.6, 0]} visible={useStore.getState().expansion < 0.5}>
                    <cylinderGeometry args={[0.01, 0.01, 0.4]} />
                    <meshStandardMaterial color="#aa8844" metalness={0.8} roughness={0.2} />
                </mesh>
                
                {/* 装饰：顶部小金球 */}
                <mesh position={[0, 0.55, 0]} visible={useStore.getState().expansion < 0.5}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
                </mesh>

                {/* 装饰：金色外框 */}
                <mesh ref={frameRef} position={[0, 0, -0.01]}>
                    <torusGeometry args={[0.55, 0.03, 16, 64]} />
                    <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
                </mesh>

                {/* 图片主体 */}
                <Image ref={meshRef} url={data.url} scale={[1, 1]} transparent radius={0.5} />
                
                {/* Hover 提示光圈 */}
                {(isHovered || isActive) && (
                    <group position={[0, 0, -0.1]}>
                        <mesh>
                            <circleGeometry args={[0.7, 32]} />
                            <meshBasicMaterial color={isActive ? "#ffd700" : "#ffffff"} transparent opacity={0.3} />
                        </mesh>
                    </group>
                )}
            </group>
        </Billboard>
    )
}

const Ornaments: React.FC = () => {
  const { camera } = useThree();
  const { setHoveredImageId, setActiveImageId, hoveredImageId, activeImageId, isOkGesture, images } = useStore();
  
  const lastOkTime = useRef(0);
  const okCooldown = 1500; 

  const rotationRef = useRef(0);
  const currentRotVelocityRef = useRef(0);
  
  useFrame((state, delta) => {
      const { rotationVelocity, expansion } = useStore.getState();
      const t = state.clock.getElapsedTime();
      
      // 旋转逻辑 (带惯性)
      currentRotVelocityRef.current += (rotationVelocity - currentRotVelocityRef.current) * 0.1;
      const autoRotate = expansion > 0.5 ? 0.0 : 0.05;
      const finalVelocity = currentRotVelocityRef.current + autoRotate;
      
      rotationRef.current += finalVelocity * delta;
      
      if (activeImageId) {
           const now = Date.now();
           if (isOkGesture && (now - lastOkTime.current > okCooldown)) {
               lastOkTime.current = now;
               setActiveImageId(null); 
           }
          return;
      }

      const canInteract = expansion > 0.6;
      if (!canInteract) {
          if (hoveredImageId !== null) setHoveredImageId(null);
          return;
      }

      // 寻找离屏幕中心最近的 (2D 投影距离)
      let minDistToCenter = Infinity;
      let closestId: string | null = null;
      
      const totalCount = images.length;
      
      images.forEach((item, index) => {
          // --- 必须与 Wrapper 中的公式完全一致 (保持同步) ---
          
          const compactX = item.pos[0];
          const compactY = item.pos[1];
          const compactZ = item.pos[2];
          const compactAngle = Math.atan2(compactZ, compactX);
          const compactRadius = Math.sqrt(compactX * compactX + compactZ * compactZ);

          const ringRadius = 8.5; // 保持一致
          const angleStep = (Math.PI * 2) / Math.max(totalCount, 1);
          const ringAngle = index * angleStep;
          
          const heightHash = ((index * 9301 + 49297) % 233280) / 233280.0;
          const ringWorldY = (heightHash - 0.5) * 3.0;

          const currentRotation = rotationRef.current;
          
          const targetRingY = ringWorldY + 2.5;
          const finalY = THREE.MathUtils.lerp(compactY, targetRingY, expansion);
          
          const cX = compactRadius * Math.cos(compactAngle + currentRotation);
          const cZ = compactRadius * Math.sin(compactAngle + currentRotation);
          const eX = ringRadius * Math.cos(ringAngle + currentRotation);
          const eZ = ringRadius * Math.sin(ringAngle + currentRotation);
          
          const worldX = THREE.MathUtils.lerp(cX, eX, expansion);
          const worldZ = THREE.MathUtils.lerp(cZ, eZ, expansion);
          
          // 同步浮动计算: 速度0.18, 幅度0.009
          const floatOffset = expansion > 0.5 ? Math.sin(t * 0.18 + index) * 0.009 : 0;
          
          const trueWorldY = (finalY + floatOffset) - 2.5;
          const worldPos = new THREE.Vector3(worldX, trueWorldY, worldZ);

          // 1. 视野剔除: 严格排除摄像机背后和太近的物体 (>1.0米)
          const posInCamera = worldPos.clone().applyMatrix4(camera.matrixWorldInverse);
          if (posInCamera.z > -1.0) return;

          // 2. 投影到屏幕 (NDC: -1 to 1)
          const vec = worldPos.clone().project(camera);
          
          // 计算离屏幕中心的距离
          const distToCenter = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
          
          // 3. 判定半径
          // 0.4: 靶心判定区
          if (distToCenter < 0.4) { 
              if (distToCenter < minDistToCenter) {
                  minDistToCenter = distToCenter;
                  closestId = item.id;
              }
          }
      });
      
      if (closestId !== hoveredImageId) {
          setHoveredImageId(closestId);
      }
      
      const now = Date.now();
      if (canInteract && isOkGesture && closestId && (now - lastOkTime.current > okCooldown)) {
          lastOkTime.current = now;
          setActiveImageId(closestId);
      }
  });

  return (
    <group>
      {images.map((item, index) => (
        <OrnamentItemWrapper 
            key={item.id} 
            data={item} 
            index={index}
            totalCount={images.length}
            rotationRef={rotationRef}
            isHovered={hoveredImageId === item.id}
            isActive={activeImageId === item.id}
        />
      ))}
    </group>
  );
};

export default Ornaments;
