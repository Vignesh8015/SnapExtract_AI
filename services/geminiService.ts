
import { GoogleGenAI, Type, GenerateContentResponse, Blob } from "@google/genai";
import { ExtractedItem, ImageSize } from "../types";

export const UNIVERSAL_EXTRACTION_PROMPT = `
You are a technical information extraction AI. 
The user will upload screenshots (reels, posts, code editors, websites).

Your task is to scan the images and extract technical entities. 
Entities can be:
- AI Tools/Software (Names, URLs)
- Program Code (Extract code snippets exactly)
- YouTube Channels (Name, Handle)
- Social Media Profiles (Technical influencers)
- Websites/Platforms (Docs, Pricing, GitHub)

RULES:
- Extract ONLY what is visible.
- If it's code, preserve formatting.
- If it's a URL, ensure it is full or a clean domain.
- Group related information into single objects.
- Use the category: 'AI Tool', 'Code Snippet', 'Social Media', 'Website', 'YouTube Channel', or 'Other'.

OUTPUT:
Return a JSON array of objects.
`;

const EXTRACTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      category: { 
        type: Type.STRING, 
        description: "The type of entity found (AI Tool, Code Snippet, Social Media, Website, YouTube Channel, Other)" 
      },
      title: { type: Type.STRING, description: "Name of the tool, channel, or title of the code block" },
      content: { type: Type.STRING, description: "Main text, code content, or description" },
      link: { type: Type.STRING, description: "Relevant URL if found" },
    },
    required: ["category", "title", "content"],
  },
};

export class GeminiService {
  async extractFromImages(base64Images: string[]): Promise<ExtractedItem[]> {
    // Initializing right before the call to pick up the latest injected API key from environment
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts = base64Images.map(img => {
      // Robustly extract mimeType and data from data URI if present, fallback to image/png
      const match = img.match(/^data:(image\/[a-z]+);base64,/);
      const mimeType = match ? match[1] : "image/png";
      const data = img.includes('base64,') ? img.split('base64,')[1] : img;
      
      return {
        inlineData: {
          mimeType,
          data
        } as Blob
      };
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...parts, { text: "Perform universal extraction on these images. Identify code, tools, channels, and sites." }] },
      config: {
        systemInstruction: UNIVERSAL_EXTRACTION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
      }
    });

    try {
      const raw = JSON.parse(response.text || '[]');
      const now = Date.now();
      return raw.map((item: any, idx: number) => ({
        ...item,
        id: `ext-${now}-${idx}`,
        timestamp: now
      }));
    } catch (e) {
      console.error("Extraction parse error", e);
      return [];
    }
  }

  async generateImage(prompt: string, size: ImageSize): Promise<string | null> {
    // Initializing right before the call to pick up the latest injected API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: { 
        imageConfig: { 
          aspectRatio: "1:1", 
          imageSize: size 
        } 
      }
    });

    // Iterate through candidates and parts to find the generated image as per guidelines
    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  }

  async *streamChat(message: string, history: any[]) {
    // Initializing right before the call to pick up the latest injected API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: { systemInstruction: "Helpful assistant for technical data extraction." },
      history
    });
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      yield c.text || '';
    }
  }
}

export const gemini = new GeminiService();
