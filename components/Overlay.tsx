
import React, { useRef } from 'react';
import { useStore } from '../store';

const Overlay: React.FC = () => {
  const { 
      isCameraReady, 
      permissionError, 
      activeImageId, 
      hoveredImageId, 
      isOkGesture, 
      isWaving, 
      expansion, 
      images, 
      addImage, 
      removeImage,
      isAlbumManagerOpen,
      setAlbumManagerOpen
  } = useStore();
  
  const batchInputRef = useRef<HTMLInputElement>(null);
  
  const activeImageUrl = activeImageId 
    ? images.find(i => i.id === activeImageId)?.url 
    : null;

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    addImage(event.target.result as string);
                }
            };
            // Cast file to Blob to satisfy TypeScript strictness
            reader.readAsDataURL(file as Blob);
        });
    }
  };

  const handleDelete = () => {
      if (activeImageId) {
          if (window.confirm("确定要删除这张照片吗？")) {
              removeImage(activeImageId);
          }
      }
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      {/* 顶部标题 */}
      <div className="text-center mt-4">
        <h1 className="text-4xl md:text-6xl text-white font-christmas drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
          Merry Christmas
        </h1>
        <p className="text-gray-300 text-sm mt-2 font-light tracking-widest">
          INTERACTIVE PARTICLE TREE
        </p>
      </div>

      {/* 右上角控制区 */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 items-end pointer-events-auto">
        <button 
            onClick={() => setAlbumManagerOpen(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-white text-xs font-bold transition-all flex items-center gap-2 mb-2 backdrop-blur-md"
        >
            <span>🖼️</span> 相册管理
        </button>

        <div className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${isCameraReady ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {isCameraReady ? "CAMERA ON" : "CAMERA OFF"}
        </div>
        
        {isCameraReady && (
            <>
                {isWaving && (
                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white animate-pulse">
                    🌬️ WINDY
                    </div>
                )}
                {isOkGesture && (
                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-black animate-pulse">
                    👌 OK GESTURE
                    </div>
                )}
            </>
        )}
      </div>

      {/* 相册管理弹窗 (Modal) */}
      {isAlbumManagerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto animate-in fade-in duration-200">
              <div className="bg-[#0f1020]/90 border border-white/20 p-6 rounded-2xl w-[90vw] max-w-4xl h-[80vh] flex flex-col backdrop-blur-xl shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">相册管理</h2>
                        <p className="text-gray-400 text-xs mt-1">共有 {images.length} 张照片</p>
                    </div>
                    <button 
                        onClick={() => setAlbumManagerOpen(false)} 
                        className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {/* 批量上传按钮 */}
                        <div 
                          onClick={() => batchInputRef.current?.click()}
                          className="aspect-square bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:border-yellow-400 group"
                        >
                          <span className="text-4xl text-white/50 group-hover:text-yellow-400 mb-2 transition-colors">+</span>
                          <span className="text-xs text-gray-400 group-hover:text-white transition-colors">批量上传</span>
                        </div>
                        
                        {/* 图片列表 */}
                        {images.map(img => (
                          <div key={img.id} className="relative aspect-square group rounded-xl overflow-hidden bg-black/50 border border-white/10">
                             <img src={img.url} alt="ornament" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                             <button 
                               onClick={(e) => { 
                                   e.stopPropagation();
                                   // 直接删除，提升响应速度
                                   removeImage(img.id);
                               }} 
                               className="absolute top-2 right-2 z-20 bg-red-600 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transform scale-100 transition-all shadow-lg cursor-pointer"
                               title="删除"
                             >
                               ✕
                             </button>
                          </div>
                        ))}
                     </div>
                 </div>
                 
                 <input 
                    type="file" 
                    multiple 
                    ref={batchInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleBatchFileChange} 
                 />
                 
                 <div className="mt-4 pt-4 border-t border-white/10 text-center">
                     <button 
                        onClick={() => setAlbumManagerOpen(false)}
                        className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full text-sm transition-colors"
                     >
                         完成
                     </button>
                 </div>
              </div>
          </div>
      )}

      {/* 全屏图片展示 */}
      {activeImageId && activeImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-500 z-50 pointer-events-auto">
           <div className="relative bg-white p-2 rounded-lg shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-300 flex flex-col items-center">
              <img src={activeImageUrl} alt="Christmas Memory" className="max-w-[85vw] max-h-[70vh] object-contain rounded" />
              
              <div className="flex gap-4 mt-4 w-full justify-center">
                  <button 
                    onClick={() => useStore.getState().setActiveImageId(null)}
                    className="px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-full text-sm font-bold text-gray-800 transition-colors"
                  >
                    关闭
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 rounded-full text-sm font-bold text-white transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    🗑️ 删除照片
                  </button>
              </div>

              <div className="text-white mt-4 text-center">
                 <p className="font-bold text-lg mb-1 animate-pulse">👌 做 "OK" 手势也可关闭</p>
              </div>
           </div>
        </div>
      )}

      {/* 底部操作指南 (左下角) */}
      <div className="absolute bottom-6 left-6 pointer-events-auto z-40 hidden md:block">
        {permissionError ? (
            <div className="bg-red-900/80 text-white px-4 py-3 rounded-xl border border-red-500 text-center backdrop-blur-sm max-w-xs">
                <p className="font-bold text-sm">无法访问摄像头</p>
                <p className="text-xs opacity-80 mt-1">请允许摄像头权限以体验手势交互。</p>
            </div>
        ) : (
            <div className="flex flex-col gap-4 text-left text-white/80 text-xs bg-black/40 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg w-48">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg border border-white/20 shrink-0">
                        👐
                    </div>
                    <span>居中握拳/张手<br/>控制聚散</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg border border-white/20 shrink-0">
                        ↔️
                    </div>
                    <span>手在左右两侧<br/>控制旋转</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg border border-white/20 shrink-0">
                        👌
                    </div>
                    <span>散开后选中<br/>OK手势查看</span>
                </div>
            </div>
        )}
      </div>
      
      {/* 手机端简单的提示 (居中) */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none md:hidden z-30">
          <div className="text-white/60 text-xs bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
             👐 张合控制 · ↔️ 左右旋转 · 👌 OK选中
          </div>
      </div>
      
      {/* 悬停提示 (仅在散开模式下显示) */}
      {!activeImageId && hoveredImageId && expansion > 0.6 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-10 pointer-events-none z-40">
              <div className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-sm font-bold animate-bounce shadow-[0_0_15px_rgba(234,179,8,0.6)]">
                  👌 OK 手势查看/删除
              </div>
          </div>
      )}
    </div>
  );
};

export default Overlay;
