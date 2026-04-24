import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';
import Landing from './pages/Landing';
import Authenticate from './pages/Authenticate';
import BulkDetect from './pages/BulkDetect';
import Species from './pages/Species';
import Compare from './pages/Compare';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/authenticate" element={<PageTransition><Authenticate /></PageTransition>} />
        <Route path="/compare" element={<PageTransition><Compare /></PageTransition>} />
        <Route path="/bulk" element={<PageTransition><BulkDetect /></PageTransition>} />
        <Route path="/species" element={<PageTransition><Species /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-surface">
        <Navbar />
        <AnimatedRoutes />
      </div>
    </Router>
  );
}

export default App;
