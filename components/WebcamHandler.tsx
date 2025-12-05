
import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useStore } from '../store';

const WebcamHandler: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const requestRef = useRef<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  
  // --- 状态机与防抖 ---
  // 用于计算挥手速度 (仅用于风吹特效)
  const lastWristXRef = useRef<number | null>(null);
  
  // 用于防抖 (Debounce)
  const currentPoseRef = useRef<'OPEN' | 'FIST' | 'OK' | 'NONE'>('NONE');
  const poseStartTimeRef = useRef<number>(0);
  
  // 目标 Expansion 值 (用于平滑过渡)
  const targetExpansionRef = useRef<number>(0);

  const { 
    setExpansion, 
    setWaving, 
    setRotationVelocity,
    setVerticalVelocity,
    setOkGesture, 
    setCameraReady, 
    setPermissionError,
    activeImageId // 用于互斥锁
  } = useStore();

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        startWebcam();
      } catch (error) {
        console.error("MediaPipe initialization error:", error);
      }
    };

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 } 
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
          setCameraReady(true);
        }
      } catch (err) {
        console.error("Camera permission denied:", err);
        setPermissionError(true);
      }
    };

    initMediaPipe();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;

    const startTimeMs = performance.now();
    
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        processGestures(landmarks);
      } else {
        // 手消失了：停止旋转，不改变形状
        setRotationVelocity(0);
        setVerticalVelocity(0);
        setWaving(false);
        setOkGesture(false);
        
        // 如果手没了，姿态重置
        currentPoseRef.current = 'NONE';
      }
      
      // 平滑更新 expansion
      smoothUpdateExpansion();
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const processGestures = (landmarks: any[]) => {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9]; 
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const now = performance.now();

    // 1. 计算手部移动速度 (Velocity) - 仅用于判定“挥手/风吹”特效
    let rawVelocityX = 0;
    if (lastWristXRef.current !== null) {
        rawVelocityX = (wrist.x - lastWristXRef.current) * 50; 
    }
    lastWristXRef.current = wrist.x;

    // --- Layer 1: 旋转控制 (Joystick Mode - Horizontal) ---
    // wrist.x 范围 0(左) - 1(右)
    const centerX = 0.5;
    const deadZoneX = 0.15;
    const diffX = wrist.x - centerX; 
    
    let rotationInput = 0;
    if (Math.abs(diffX) > deadZoneX) {
        const speed = (Math.abs(diffX) - deadZoneX) * 4.0; 
        const direction = diffX > 0 ? 1 : -1;
        rotationInput = direction * speed; 
    }
    setRotationVelocity(rotationInput);

    // --- Layer 2: 挥手特效 (Wind Effect) ---
    const isWavingNow = Math.abs(rawVelocityX) > 0.8;
    setWaving(isWavingNow);

    // --- Layer 3: 姿态检测 (Shape Detection) ---
    const handSize = distance(wrist, middleMCP);
    const safeHandSize = Math.max(handSize, 0.01);
    
    // 计算手指张开程度
    const spreadDist = distance(thumbTip, pinkyTip);
    const spreadRatio = spreadDist / safeHandSize;
    
    // 计算 OK 手势特征
    const pinchDist = distance(thumbTip, indexTip);
    const isPinching = pinchDist < (safeHandSize * 0.35); 
    const isFingersExtended = (distance(middleTip, wrist) > safeHandSize * 1.3);

    let detectedPose: 'OPEN' | 'FIST' | 'OK' | 'NONE' = 'NONE';

    if (isPinching && isFingersExtended) {
        detectedPose = 'OK';
    } else if (spreadRatio > 1.3) {
        detectedPose = 'OPEN';
    } else if (spreadRatio < 0.8) {
        detectedPose = 'FIST';
    } else {
        detectedPose = 'NONE';
    }

    // --- Layer 4: 状态机 (State Machine) ---
    const isStable = Math.abs(rawVelocityX) < 0.4; 

    if (detectedPose !== currentPoseRef.current) {
        currentPoseRef.current = detectedPose;
        poseStartTimeRef.current = now;
    } else {
        const duration = now - poseStartTimeRef.current;
        const STABLE_THRESHOLD = 400; 

        if (duration > STABLE_THRESHOLD && isStable) {
            const isViewingImage = !!useStore.getState().activeImageId;

            if (detectedPose === 'OK') {
                setOkGesture(true); 
            } else {
                setOkGesture(false);
                
                if (!isViewingImage) {
                    if (detectedPose === 'OPEN') {
                        targetExpansionRef.current = 1.0; // 炸开
                    } else if (detectedPose === 'FIST') {
                        targetExpansionRef.current = 0.0; // 聚合
                    }
                }
            }
        } else {
             setOkGesture(false);
        }
    }
  };

  const smoothUpdateExpansion = () => {
    const current = useStore.getState().expansion;
    const target = targetExpansionRef.current;
    
    if (Math.abs(current - target) > 0.001) {
        const newValue = current + (target - current) * 0.05;
        setExpansion(newValue);
    }
  };

  const distance = (p1: {x: number, y: number, z: number}, p2: {x: number, y: number, z: number}) => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  };

  return (
    <>
        <video
            ref={videoRef}
            className="fixed bottom-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-white/20 opacity-40 z-50 pointer-events-none transform scale-x-[-1] mix-blend-screen"
            autoPlay
            playsInline
            muted
        />
        {/* 视觉引导: 仅保留水平控制 */}
        <div className="fixed bottom-4 right-4 w-32 h-24 z-40 pointer-events-none opacity-40 flex flex-col justify-center items-center py-1">
             <div className="w-full flex justify-between px-1">
                <div className="text-white text-[10px]">←</div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="text-white text-[10px]">→</div>
             </div>
        </div>
    </>
  );
};

export default WebcamHandler;
