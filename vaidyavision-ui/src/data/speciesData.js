export const SPECIES_DATA = {
  Amla: {
    hindiName: "Amalaki (आमलकी)",
    description: "Small, light green pinnate leaves on graceful drooping branches. Rich in Vitamin C.",
    uses: ["Immunity booster", "Hair health", "Digestive aid", "Chyawanprash ingredient"],
    traits: ["Pinnate compound", "Small leaflets", "Light green", "Feathery texture"],
    adulterants: ["Curry leaf (similar pinnate structure)"],
    modelAccuracy: "AI Confidence Score", // ✅ FIXED TEXT
    image: "/leaves/amla.jpg",
    color: "#4ADE80",
  },

  Ashwagandha: {
    hindiName: "Ashwagandha (अश्वगंधा)",
    description: "Oval, elliptic leaves with soft texture. The plant has a distinctive horse-like smell.",
    uses: ["Stress adaptogen", "Testosterone support", "Anti-inflammatory", "Sleep aid"],
    traits: ["Oval/elliptic", "Soft texture", "Hairy surface", "Matte green"],
    adulterants: ["Withania coagulans (similar leaf shape)"],
    modelAccuracy: "AI Confidence Score",
    image: "/leaves/ashwagandha.jpg",
    color: "#A78BFA",
  },

  Bhrami: {
    hindiName: "Brahmi (ब्राह्मी)",
    description: "Small, succulent, rounded leaves. Grows in moist environments near water.",
    uses: ["Memory enhancement", "Anxiety relief", "Neuroprotective", "Cognitive function"],
    traits: ["Small rounded", "Succulent", "Bright green", "Smooth margins"],
    adulterants: ["Mandukparni (very similar appearance)"],
    modelAccuracy: "AI Confidence Score",
    image: "/leaves/brahmi.jpg",
    color: "#22D3EE",
  },

  Curry: {
    hindiName: "Kadi Patta (कड़ी पत्ता)",
    description: "Pinnate leaves with aromatic fragrance. Distinctive curry aroma when crushed.",
    uses: ["Digestive health", "Blood sugar control", "Hair growth", "Antioxidant"],
    traits: ["Pinnate compound", "Aromatic", "Glossy surface", "Dark green"],
    adulterants: ["Neem (most common — very similar pinnate structure)"],
    modelAccuracy: "AI Confidence Score",
    image: "/leaves/curry.jpg",
    color: "#FBBF24",
  },

  Neem: {
    hindiName: "Neem (नीम)",
    description: "Pinnate compound leaves with serrated leaflet margins and bitter taste.",
    uses: ["Antiseptic", "Anti-malarial", "Dental health", "Skin conditions"],
    traits: ["Pinnate compound", "Serrated edges", "Asymmetric base", "Dark glossy"],
    adulterants: ["Curry leaf (frequently confused)"],
    modelAccuracy: "AI Confidence Score",
    image: "/leaves/neem.jpg",
    color: "#34D399",
  },

  Tulsi: {
    hindiName: "Tulsi (तुलसी)",
    description: "Sacred basil with ovate, slightly toothed leaves and strong aromatic scent.",
    uses: ["Immunity booster", "Respiratory health", "Sacred/ritual use", "Adaptogen"],
    traits: ["Ovate shape", "Aromatic", "Purple-tinged stems", "Toothed margins"],
    adulterants: ["Common basil (visually identical to untrained eye)"],
    modelAccuracy: "AI Confidence Score",
    image: "/leaves/tulsi.jpg", 
    color: "#F472B6",
  },
};

// Helper to get species as array
export const getSpeciesList = () => Object.keys(SPECIES_DATA);

// Helper to get a single species
export const getSpecies = (name) => SPECIES_DATA[name] || null;