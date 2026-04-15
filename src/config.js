// VaidyaVision Configuration
// Set MOCK_MODE to false when connecting to a real Flask/FastAPI backend

export const MOCK_MODE = true;
export const API_URL = 'http://localhost:5000/api';

// Mock delay in milliseconds (simulates network latency)
export const MOCK_DELAY = 1500;

// Species list (order matters for chart display)
export const SPECIES_LIST = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi'];

// Confidence threshold for "Authentic" vs "Suspicious"
export const AUTH_THRESHOLD = 0.70;
