export const LightColors = {
  // Primary palette - warm medical white with orange accent
  background: "#F7F5F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EDE8",
  card: "#FFFFFF",

  // Accent
  accent: "#FF6B35",
  accentLight: "#FFE8DF",
  accentDark: "#E5501A",

  // Semantic health colors
  healthy: "#2D9E6B",
  healthyBg: "#E6F7EF",
  warning: "#F5A623",
  warningBg: "#FEF6E6",
  danger: "#E53E3E",
  dangerBg: "#FEE6E6",

  // Text
  text: "#1A1612",
  textSecondary: "#7C7269",
  textTertiary: "#B5AFA8",
  textInverse: "#FFFFFF",

  // Border
  border: "#E8E3DC",
  borderLight: "#F0ECE6",

  // Tab barr
  tabActive: "#1A1612",
  tabInactive: "#B5AFA8",

  // Dark surfaces
  dark: "#1A1612",
  darkCard: "#231F1A",
};

export const DarkColors = {
  // Primary palette - dark
  background: "#1A1612",
  surface: "#2A2420",
  surfaceAlt: "#34302A",
  card: "#2A2420",

  // Accent
  accent: "#FF7F52",
  accentLight: "#3D2A1F",
  accentDark: "#FF6B35",

  // Semantic health colors
  healthy: "#4CAF87",
  healthyBg: "#1B3D2F",
  warning: "#FFB743",
  warningBg: "#3D2F1A",
  danger: "#FF6B6B",
  dangerBg: "#4D2525",

  // Text
  text: "#F5F5F5",
  textSecondary: "#B8B8B8",
  textTertiary: "#7A7A7A",
  textInverse: "#ffffff",

  // Border
  border: "#3A3530",
  borderLight: "#2F2B26",

  // Tab bar
  tabActive: "#F5F5F5",
  tabInactive: "#7A7A7A",

  // Dark surfaces
  dark: "#0F0D0B",
  darkCard: "#1A1612",
};

export const Colors = LightColors;

export const Typography = {
  // Display numbers
  displayXL: { fontSize: 72, fontWeight: "300" as const, letterSpacing: -3 },
  displayLG: { fontSize: 56, fontWeight: "300" as const, letterSpacing: -2 },
  displayMD: { fontSize: 40, fontWeight: "300" as const, letterSpacing: -1.5 },
  displaySM: { fontSize: 32, fontWeight: "400" as const, letterSpacing: -1 },

  // Headings
  h1: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: "600" as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: "600" as const, letterSpacing: -0.2 },
  h4: { fontSize: 16, fontWeight: "600" as const, letterSpacing: -0.1 },

  // Body
  bodyLG: { fontSize: 17, fontWeight: "400" as const, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodySM: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },

  // Label
  labelLG: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 1.2 },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 1 },
  labelSM: { fontSize: 10, fontWeight: "600" as const, letterSpacing: 0.8 },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radius = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: "#1A1612",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#1A1612",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: "#1A1612",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};
