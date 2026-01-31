import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { MediaUpload } from './pages/MediaUpload';
import { AIMonitor } from './pages/AIMonitor';
// REMOVED: import { Timeline } from './pages/Timeline';
import { EmotionPerformance } from './pages/EmotionPerformance';
import { ExportCenter } from './pages/ExportCenter';
import { SemanticSearch } from './pages/SemanticSearch';
import { NeuralVoiceSearch } from './pages/NeuralVoiceSearch';

// Additional Placeholders
import { ReshootRisk } from './pages/ReshootRisk';
import { TrainingLearning } from './pages/TrainingLearning';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<MediaUpload />} />
          <Route path="monitor" element={<AIMonitor />} />
          {/* Timeline removed */}
          <Route path="emotion" element={<EmotionPerformance />} />
          <Route path="search" element={<SemanticSearch />} />
          <Route path="neural-search" element={<NeuralVoiceSearch />} />
          <Route path="risk" element={<ReshootRisk />} />
          <Route path="training" element={<TrainingLearning />} />
          <Route path="export" element={<ExportCenter />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
