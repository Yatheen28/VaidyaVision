# VaidyaVision — Project Context

## Project Status: 🟢 COMPLETE (All Pages + Components Built)

## What Has Been Built

### Foundation (✅ Complete)
- [x] Vite + React project initialized
- [x] Tailwind CSS configured with full VaidyaVision theme (colors, fonts, shadows, animations)
- [x] PostCSS + Autoprefixer configured
- [x] Dependencies: framer-motion, recharts, lucide-react, react-router-dom, axios
- [x] `config.js` — MOCK_MODE (true), API_URL, MOCK_DELAY, AUTH_THRESHOLD
- [x] `data/speciesData.js` — all 6 species data with Hindi names, uses, traits, adulterants, accuracy
- [x] `index.html` — SEO meta tags, Google Fonts (Inter + Playfair Display), theme color
- [x] `index.css` — Tailwind directives + glassmorphism classes + button system + scrollbar
- [x] `App.jsx` — React Router v6 with AnimatePresence + all 4 routes
- [x] `main.jsx` — Clean entry point

### Components (✅ All Complete)
- [x] `Navbar.jsx` — Fixed, transparent→white on scroll, animated active indicator, mobile hamburger overlay
- [x] `DropZone.jsx` — Drag-and-drop with Gallery/Camera buttons, preview, drag animation
- [x] `ConfidenceGauge.jsx` — Animated SVG radial gauge (0→value over 1.5s), color-coded
- [x] `AuthBadge.jsx` — Green/red badge with spring pop-in animation
- [x] `SpeciesCard.jsx` — Colored header, leaf decorations, accuracy badge, trait tags
- [x] `SpeciesModal.jsx` — Glassmorphism backdrop, medicinal uses grid, visual markers
- [x] `PredictionChart.jsx` — Recharts horizontal bar chart with highlighted top prediction
- [x] `LoadingLeaf.jsx` — Spinning/pulsing leaf SVG with glow
- [x] `PageTransition.jsx` — Framer Motion fade + slide wrapper

### Pages (✅ All Complete)
- [x] `Landing.jsx` — Hero with floating leaf, count-up stats bar, feature cards, footer
- [x] `Authenticate.jsx` — Upload state, loading, results (badge + gauge + chart + species info)
- [x] `BulkDetect.jsx` — Two-panel layout, canvas-drawn mock annotations, donut chart, stagger table
- [x] `Species.jsx` — 2×3 responsive grid of species cards + detail modal

## What Is Remaining
- Nothing critical — all 4 pages and 9 components are functional
- Optional: VaidyaVision logo image file in public/ (currently using inline SVG)
- Optional: Additional polish/animations

## Design Decisions
- **Color Palette**: Forest green (#1B4332) primary, Sage (#52B788) secondary, Amber (#F4A261) accent
- **Typography**: Playfair Display for headings (serif, premium feel), Inter for body
- **Mock Mode**: Default ON — all API calls use setTimeout(1500) for realistic demo
- **No TypeScript**: Plain JS + JSX as specified
- **Tailwind v3**: Custom theme with glassmorphism shadows, botanical animations
- **Glassmorphism cards**: `glass-card` (blur) and `glass-card-solid` (white, shadow) utility classes
- **Button system**: `.btn-primary`, `.btn-secondary`, `.btn-accent` component classes
- **Inline SVG logo**: Leaf with circuit/AI node pattern to match branding
- **Mock bulk detection**: Canvas-based bounding box drawing when API not available
- **Species cards**: Color-coded per species with letter initial as placeholder

## File Structure
```
vaidyavision-ui/
├── context.md
├── index.html              ← SEO meta, Google Fonts, theme color
├── package.json
├── vite.config.js
├── tailwind.config.js      ← Full VaidyaVision theme
├── postcss.config.js
├── src/
│   ├── main.jsx            ← Entry point
│   ├── App.jsx             ← Router + AnimatePresence
│   ├── index.css           ← Tailwind + glassmorphism + buttons
│   ├── config.js           ← MOCK_MODE, API_URL, thresholds
│   ├── data/
│   │   └── speciesData.js  ← 6 species with full data
│   ├── pages/
│   │   ├── Landing.jsx     ← Hero + Stats + Features + Footer
│   │   ├── Authenticate.jsx ← Upload → Results flow
│   │   ├── BulkDetect.jsx  ← Two-panel + table
│   │   └── Species.jsx     ← Grid + Modal
│   └── components/
│       ├── Navbar.jsx       ← Scroll-aware + mobile menu
│       ├── DropZone.jsx     ← Drag/drop + camera
│       ├── ConfidenceGauge.jsx ← Animated SVG gauge
│       ├── AuthBadge.jsx    ← Green/red status badge
│       ├── SpeciesCard.jsx  ← Color-coded species card
│       ├── SpeciesModal.jsx ← Detail overlay
│       ├── PredictionChart.jsx ← Recharts bar chart
│       ├── LoadingLeaf.jsx  ← Spinning leaf loader
│       └── PageTransition.jsx ← Framer Motion wrapper
```

## Running the App
```bash
cd vaidyavision-ui
npm run dev
# → http://localhost:5173/
```

Mock mode is ON by default. Set `MOCK_MODE = false` in `src/config.js` to connect to real backend.
