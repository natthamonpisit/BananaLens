export interface FilterSettings {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  saturation: number; // 0-200, default 100
  sepia: number;      // 0-100, default 0
  grayscale: number;  // 0-100, default 0
  hueRotate: number;  // 0-360, default 0
  blur: number;       // 0-20, default 0
  warmth: number;     // Simulated via sepia/hue mix logic in UI, but simplified here
}

export interface PhotoItem {
  id: string;
  originalUrl: string; // Base64 or Blob URL
  name: string;
  timestamp: number;
  settings: FilterSettings;
  previewUrl?: string; // Optional processed preview
}

export enum ViewMode {
  HOME = 'HOME',
  COLLECTION = 'COLLECTION',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

export interface AnalysisResult {
  reasoning: string;
  suggestedSettings: FilterSettings;
}