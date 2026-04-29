// VaidyaVision Configuration
// Set MOCK_MODE to true to demo without backend, false to use real API

export const MOCK_MODE = false;

// Dynamic API URL: works from both localhost and LAN (mobile demo)
// When accessed via LAN IP (e.g., 192.168.x.x), API also uses that IP
const backendPort = 8000;
export const API_URL = `http://${window.location.hostname}:${backendPort}`;

// Mock delay in milliseconds (simulates network latency)
export const MOCK_DELAY = 1500;

// Species list (order matters for chart display)
export const SPECIES_LIST = ['Amla', 'Ashwagandha', 'Bhrami', 'Curry', 'Neem', 'Tulsi'];

// Confidence threshold for "Authentic" vs "Suspicious"
export const AUTH_THRESHOLD = 0.55;
