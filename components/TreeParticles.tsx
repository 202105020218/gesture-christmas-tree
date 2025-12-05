
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

const vertexShader = `
  uniform float uTime;
  uniform float uExpansion;
  uniform float uWaveIntensity;
  
  attribute float size;
  attribute vec3 initialPos;
  attribute float randomness; 
  attribute float type; // 0=Leaf, 1=Light, 2=Ribbon, 3=Dust
  
  varying vec3 vColor;
  varying float vAlpha;
  
  // 伪随机
  vec3 random3(vec3 c) {
    float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
    vec3 r;
    r.z = fract(512.0*j);
    j *= .125;
    r.x = fract(512.0*j);
    j *= .125;
    r.y = fract(512.0*j);
    return r - 0.5;
  }

  void main() {
    vec3 pos = initialPos;
    
    // --- 交互: 炸开成星空 (Expansion) ---
    // 炸开时，利用 randomness 让粒子向四周发散
    vec3 noiseDir = normalize(initialPos + random3(initialPos) * 2.0);
    float explosionDist = pow(uExpansion, 2.0) * 20.0; 
    
    // 插值位置
    pos = mix(pos, pos + noiseDir * explosionDist, smoothstep(0.1, 1.0, uExpansion));
    
    // 如果还没完全炸开，保留一点原来的动态
    if (uExpansion < 0.8) {
        // --- 交互: 挥手 (Wave) ---
        float windStrength = uWaveIntensity * 0.8;
        float twist = pos.y * 0.5; // 扭曲因子
        float waveOffset = sin(uTime * 4.0 + twist) * windStrength * smoothstep(-5.0, 5.0, pos.y + 4.0);
        pos.x += waveOffset;
        pos.z += cos(uTime * 3.0 + twist) * windStrength * 0.3 * smoothstep(-5.0, 5.0, pos.y + 4.0);
        
        // 基础呼吸: 树叶轻轻起伏
        if (type < 1.5) {
             pos.y += sin(uTime * 1.0 + randomness * 10.0) * 0.05;
        }
        
        // 流光彩带的流动效果
        if (type > 1.5 && type < 2.5) { 
             float flow = sin(uTime * 3.0 - initialPos.y * 2.0);
             pos += normalize(pos) * flow * 0.08;
        }
        
        // 悬浮星尘的漂浮
        if (type > 2.5) {
             pos.y += sin(uTime * 0.5 + randomness * 100.0) * 0.5;
             pos.x += cos(uTime * 0.3 + randomness * 50.0) * 0.2;
        }
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float distanceScale = (200.0 / -mvPosition.z);
    
    // --- 颜色与大小逻辑 ---
    
    if (type < 0.5) {
        // Type 0: 松针 (Leaf)
        // 颜色渐变：内部深绿 -> 外部银白(积雪)
        // 根据粒子离轴心的距离比例
        float h = (initialPos.y + 4.0) / 9.0; // 0 (底) ~ 1 (顶)
        float maxR = 4.0 * (1.0 - h * 0.8);
        float rDist = length(initialPos.xz);
        float tipFactor = smoothstep(maxR * 0.3, maxR, rDist);
        
        vec3 darkGreen = vec3(0.02, 0.25, 0.1);
        vec3 snowy = vec3(0.85, 0.9, 1.0);
        
        // 稍微混一点随机，不那么死板
        tipFactor += (randomness - 0.5) * 0.2;
        vColor = mix(darkGreen, snowy, clamp(tipFactor, 0.0, 1.0));
        
        // 炸开时变白
        vColor = mix(vColor, vec3(1.0), uExpansion * 0.5);
        
        gl_PointSize = size * distanceScale * 0.6;
        vAlpha = 0.9;
        
    } else if (type < 1.5) {
        // Type 1: 彩灯 (Lights)
        // 随机分配颜色：红、金、蓝、绿
        vec3 c1 = vec3(1.0, 0.1, 0.2); // Red
        vec3 c2 = vec3(1.0, 0.8, 0.1); // Gold
        vec3 c3 = vec3(0.2, 0.5, 1.0); // Blue
        vec3 c4 = vec3(0.1, 0.9, 0.4); // Green
        
        if (randomness < 0.25) vColor = c1;
        else if (randomness < 0.5) vColor = c2;
        else if (randomness < 0.75) vColor = c3;
        else vColor = c4;
        
        // 闪烁逻辑
        float blinkSpeed = 3.0 + randomness * 2.0;
        float blink = sin(uTime * blinkSpeed + randomness * 100.0);
        float onOff = smoothstep(0.0, 0.2, blink); // 让闪烁更干脆
        
        vColor *= (0.3 + 2.0 * onOff); // 灭的时候不全黑，亮的时候很亮
        
        gl_PointSize = size * distanceScale * 1.5;
        vAlpha = 1.0;
        
    } else if (type < 2.5) {
        // Type 2: 彩带 (Ribbon) - 金色流光
        vColor = vec3(1.0, 0.9, 0.5);
        // 亮度随时间流动
        float wave = sin(uTime * 2.0 - initialPos.y * 3.0);
        vColor *= (1.0 + wave * 0.5);
        
        gl_PointSize = size * distanceScale * 1.0;
        vAlpha = 1.0;
        
    } else {
        // Type 3: 星尘 (Dust) - 氛围粒子
        vColor = vec3(0.6, 0.7, 1.0);
        gl_PointSize = size * distanceScale * 0.8;
        vAlpha = 0.6 * (0.5 + 0.5 * sin(uTime + randomness * 10.0));
    }

    // 炸开时粒子变小一点
    gl_PointSize *= mix(1.0, 0.5, uExpansion);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    // 辉光效果：中心亮，边缘柔和
    float strength = 1.0 - (dist * 2.0);
    strength = pow(strength, 1.5);
    
    gl_FragColor = vec4(vColor, vAlpha * strength);
  }
`;

const TreeParticles: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const currentRotVelocityRef = useRef(0);
  const waveIntensityRef = useRef(0);

  const particleCount = 20000; 
  
  const { positions, initialPos, sizes, randomness, types } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const init = new Float32Array(particleCount * 3);
    const sz = new Float32Array(particleCount);
    const rnd = new Float32Array(particleCount);
    const typ = new Float32Array(particleCount);
    
    let idx = 0;
    
    // --- 1. 构建松树层级结构 (Layers) ---
    // 模拟真实的松树，一层一层的树枝
    const layers = 15; // 层数
    const treeHeight = 9.0;
    const bottomY = -4.0;
    
    const treeParticleCount = 15000;
    
    for (let i = 0; i < treeParticleCount; i++) {
        // 随机选择一层
        const layerIdx = Math.floor(Math.pow(Math.random(), 0.8) * layers);
        const t = layerIdx / (layers - 1); // 0(顶) ~ 1(底) -> 实际上我们要 0(底) ~ 1(顶)
        const heightProgress = 1.0 - t; // 1.0 是顶，0.0 是底
        
        // 每层的高度
        const layerY = bottomY + heightProgress * treeHeight;
        // 每层稍微有点厚度
        const y = layerY + (Math.random() - 0.5) * 0.6;
        
        // 半径：越往下越大
        const maxRadius = 4.5 * (1.0 - heightProgress * 0.9) + 0.1;
        
        // 粒子在圆盘内的分布：倾向于边缘(树枝尖端)和中心(树干)
        // 使用 sqrt 保证均匀分布，但我们加一点 bias 让树枝更明显
        let rRatio = Math.sqrt(Math.random());
        // 聚类：让树枝有一簇一簇的感觉
        rRatio = rRatio + (Math.sin(Math.random() * Math.PI * 10) * 0.05);
        
        const r = maxRadius * rRatio;
        const theta = Math.random() * Math.PI * 2;
        
        pos[idx*3] = r * Math.cos(theta);
        pos[idx*3+1] = y;
        pos[idx*3+2] = r * Math.sin(theta);
        
        sz[idx] = Math.random() * 0.6 + 0.4;
        rnd[idx] = Math.random();
        
        // 决定类型：大部分是叶子(0)，少部分是灯(1)
        // 越靠外(rRatio大)越容易积雪(在Shader里处理)，灯挂在树枝末端
        if (Math.random() < 0.1 && rRatio > 0.6) {
            typ[idx] = 1.0; // Light
            sz[idx] *= 2.0; // 灯大一点
        } else {
            typ[idx] = 0.0; // Leaf
        }
        idx++;
    }
    
    // --- 2. 螺旋彩带 (Spiral Ribbon) ---
    const ribbonCount = 3000;
    for (let i = 0; i < ribbonCount; i++) {
        const t = i / ribbonCount; 
        const turns = 6.0;
        const angle = t * Math.PI * 2 * turns;
        
        const y = t * 9.0 - 4.0;
        const baseR = 4.6 * (1.0 - t) + 0.4; 
        
        // 加一点宽度，像一条带子
        const widthOffset = (Math.random() - 0.5) * 0.3;
        const r = baseR + widthOffset;
        
        pos[idx*3] = r * Math.cos(angle);
        pos[idx*3+1] = y;
        pos[idx*3+2] = r * Math.sin(angle);
        
        sz[idx] = Math.random() * 0.8 + 0.5;
        rnd[idx] = Math.random();
        typ[idx] = 2.0; // Ribbon
        idx++;
    }
    
    // --- 3. 悬浮星尘 (Ambient Dust) ---
    const dustCount = particleCount - idx;
    for (let i = 0; i < dustCount; i++) {
        // 散布在树周围的空间
        const r = Math.random() * 8.0;
        const theta = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 12.0;
        
        pos[idx*3] = r * Math.cos(theta);
        pos[idx*3+1] = y;
        pos[idx*3+2] = r * Math.sin(theta);
        
        sz[idx] = Math.random() * 0.5 + 0.2;
        rnd[idx] = Math.random();
        typ[idx] = 3.0; // Dust
        idx++;
    }
    
    for(let i=0; i<particleCount*3; i++) init[i] = pos[i];
    
    return { positions: pos, initialPos: init, sizes: sz, randomness: rnd, types: typ };
  }, []);

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;
    
    const { expansion, isWaving, rotationVelocity } = useStore.getState();
    const time = state.clock.getElapsedTime();
    
    // 惯性旋转
    currentRotVelocityRef.current += (rotationVelocity - currentRotVelocityRef.current) * 0.1;
    const autoRotate = 0.05; // 基础慢速自转
    const finalVelocity = currentRotVelocityRef.current + autoRotate;
    meshRef.current.rotation.y += finalVelocity * delta;

    // 挥手特效平滑过渡
    const targetWave = isWaving ? 1.0 : 0.0;
    waveIntensityRef.current += (targetWave - waveIntensityRef.current) * 0.05;

    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uExpansion.value = expansion;
    materialRef.current.uniforms.uWaveIntensity.value = waveIntensityRef.current;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-initialPos" count={particleCount} array={initialPos} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={particleCount} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-randomness" count={particleCount} array={randomness} itemSize={1} />
        <bufferAttribute attach="attributes-type" count={particleCount} array={types} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uExpansion: { value: 0 },
          uWaveIntensity: { value: 0 }
        }}
      />
    </points>
  );
};

export default TreeParticles;
