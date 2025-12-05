import { create } from 'zustand';

export interface OrnamentImage {
  id: string;
  url: string;
  pos: [number, number, number]; // x, y, z
}

interface AppState {
  // 交互状态
  expansion: number; // 0 (紧凑) - 1 (蓬松/炸开)
  isWaving: boolean; // 是否正在剧烈挥手 (触发风吹特效)
  rotationVelocity: number; // 旋转速度 (左右控制)
  verticalVelocity: number; // 垂直速度 (上下控制摄像机升降)
  isOkGesture: boolean; // 是否做出了 OK 手势
  
  // 选中的图片逻辑
  images: OrnamentImage[];
  hoveredImageId: string | null; // 当前视野中心的图片ID
  activeImageId: string | null; // 被打开展示的图片ID
  
  // 系统状态
  isCameraReady: boolean;
  permissionError: boolean;
  isAlbumManagerOpen: boolean; // 相册管理弹窗开关
  
  // Actions
  setExpansion: (val: number) => void;
  setWaving: (val: boolean) => void;
  setRotationVelocity: (val: number) => void;
  setVerticalVelocity: (val: number) => void;
  setOkGesture: (val: boolean) => void;
  setHoveredImageId: (id: string | null) => void;
  setActiveImageId: (id: string | null) => void;
  setCameraReady: (val: boolean) => void;
  setPermissionError: (val: boolean) => void;
  setAlbumManagerOpen: (val: boolean) => void;
  
  addImage: (url: string) => void;
  removeImage: (id: string) => void;
}

// 初始生成 20 张示例图片，用于形成环绕照片墙
const INITIAL_IMAGES: OrnamentImage[] = Array.from({ length: 20 }).map((_, i) => ({
    id: i.toString(),
    // 使用 Picsum 获取随机图片，ID 错开防止重复
    url: `https://picsum.photos/id/${10 + i * 2}/300/300`,
    // 初始位置依然是树上的随机位置 (Compact Mode)
    pos: [
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 7.0, // 分布在树高范围内
        (Math.random() - 0.5) * 3.5
    ]
}));

export const useStore = create<AppState>((set) => ({
  expansion: 0,
  isWaving: false,
  rotationVelocity: 0,
  verticalVelocity: 0,
  isOkGesture: false,
  
  images: INITIAL_IMAGES,
  hoveredImageId: null,
  activeImageId: null,
  
  isCameraReady: false,
  permissionError: false,
  isAlbumManagerOpen: false,
  
  setExpansion: (val) => set({ expansion: val }),
  setWaving: (val) => set({ isWaving: val }),
  setRotationVelocity: (val) => set({ rotationVelocity: val }),
  setVerticalVelocity: (val) => set({ verticalVelocity: val }),
  setOkGesture: (val) => set({ isOkGesture: val }),
  setHoveredImageId: (id) => set({ hoveredImageId: id }),
  setActiveImageId: (id) => set({ activeImageId: id }),
  setCameraReady: (val) => set({ isCameraReady: val }),
  setPermissionError: (val) => set({ permissionError: val }),
  setAlbumManagerOpen: (val) => set({ isAlbumManagerOpen: val }),
  
  addImage: (url) => set((state) => {
    // 简单的随机位置生成算法
    const y = Math.random() * 7 - 3.5;
    const t = (y + 4) / 9; 
    const radiusAtHeight = 3.5 * (1 - t * 0.8);
    const theta = Math.random() * Math.PI * 2;
    const r = radiusAtHeight + 0.2; 
    
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    
    const newImage: OrnamentImage = {
        id: Date.now().toString() + Math.random(),
        url: url,
        pos: [x, y, z]
    };
    
    return { images: [...state.images, newImage] };
  }),

  removeImage: (id) => set((state) => ({
    images: state.images.filter((img) => img.id !== id),
    // 如果删除的是当前打开的图片，则关闭预览
    activeImageId: state.activeImageId === id ? null : state.activeImageId
  })),
}));