// src/App.js
import { Routes, Route } from 'react-router-dom';
import PortfolioMain from './pages/PortfolioMain';
import SoccerSim from './pages/SoccerSim';

export default function App() {
  return (
    <Routes>
      {/* The main scrolling portfolio */}
      <Route path="/" element={<PortfolioMain />} />

      {/* The standalone simulation app */}
      <Route path="/soccer-sim" element={<SoccerSim />} />
    </Routes>
  );
}