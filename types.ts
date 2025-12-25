
export interface ExtractedItem {
  id: string;
  category: 'AI Tool' | 'Code Snippet' | 'Social Media' | 'Website' | 'YouTube Channel' | 'Other';
  title: string;
  content: string;
  link?: string;
  rawText?: string;
  timestamp: number;
}

export enum AppTab {
  EXTRACTION = 'extraction',
  IMAGE_GEN = 'image_gen',
  CHAT = 'chat'
}

export type ImageSize = '1K' | '2K' | '4K';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Global declarations to match environment and resolve type conflicts for injected window properties
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fix: Changed to optional to match existing environment declarations and resolve modifier mismatch errors
    aistudio?: AIStudio;
  }
}
