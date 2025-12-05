import React from 'react';
import Scene from './components/Scene';
import Overlay from './components/Overlay';
import WebcamHandler from './components/WebcamHandler';

function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <WebcamHandler />
      <Scene />
      <Overlay />
    </div>
  );
}

export default App;