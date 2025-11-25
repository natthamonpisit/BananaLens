import { GoogleGenAI, Type } from "@google/genai";
import { FilterSettings, AnalysisResult } from "../types";

// Helper to convert Blob/File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CAST A SPELL (Analysis) ---
export const analyzeImageAndGetSettings = async (
  imageBase64: string,
  userPrompt: string = "",
  referenceImageBase64?: string
): Promise<AnalysisResult> => {

  // Strategy: Try Standard Flash first, if Quota fails, try Flash Lite.
  const modelsToTry = ["gemini-2.5-flash", "gemini-flash-lite-latest"];

  let lastError;

  for (const model of modelsToTry) {
    try {
      console.log(`Analyzing with model: ${model}`);
      
      let promptText = `
        You are an expert professional photo editor (Nano Banana). 
        Analyze the technical aspects of this image (exposure, contrast, highlights, shadows, color balance, histogram distribution).
        
        Your goal is to suggest CSS Filter values to improve this specific photo aesthetics.
        
        If the photo is Nature: Enhance saturation slightly, balance exposure for dynamic range.
        If the photo is City/Urban: Enhance contrast, clarity (via contrast), maybe cool tones or gritty look.
        If the photo is Portrait: Focus on skin tones (warmth), soft contrast.
        
        USER INSTRUCTION: ${userPrompt ? userPrompt : "Auto-enhance this image based on its content (Cast a spell)."}
        
        Return a JSON object with:
        1. 'reasoning': A short sentence explaining what you detected and why you chose these settings.
        2. 'suggestedSettings': An object containing numeric values for:
           - brightness (0 to 200, default 100. <100 darkens, >100 brightens)
           - contrast (0 to 200, default 100)
           - saturation (0 to 200, default 100)
           - sepia (0 to 100, default 0)
           - grayscale (0 to 100, default 0)
           - hueRotate (0 to 360, default 0)
           - blur (0 to 10, default 0. Only use if requested for artistic effect)
      `;

      const parts: any[] = [
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
        { text: promptText }
      ];

      if (referenceImageBase64) {
        parts.splice(1, 0, { 
          inlineData: { mimeType: "image/jpeg", data: referenceImageBase64 } 
        });
        parts[2].text += " \n\nAlso, use the second image provided as a style reference/mood board.";
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reasoning: { type: Type.STRING },
              suggestedSettings: {
                type: Type.OBJECT,
                properties: {
                  brightness: { type: Type.NUMBER },
                  contrast: { type: Type.NUMBER },
                  saturation: { type: Type.NUMBER },
                  sepia: { type: Type.NUMBER },
                  grayscale: { type: Type.NUMBER },
                  hueRotate: { type: Type.NUMBER },
                  blur: { type: Type.NUMBER },
                },
                required: ["brightness", "contrast", "saturation"],
              }
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as AnalysisResult;
      }
    } catch (error: any) {
      console.warn(`Model ${model} failed:`, error.message);
      lastError = error;
      // If error is NOT Quota/Service related (e.g. Bad Request), break immediately
      if (!error.message.includes("429") && !error.message.includes("503") && !error.message.includes("Quota")) {
         throw error;
      }
      // Otherwise, loop to next model (Fallback)
    }
  }

  throw lastError || new Error("Failed to analyze image after retries.");
};

// --- MAGIC EDIT (Generative) ---
export const generativeEditImage = async (
  imageBase64: string,
  prompt: string,
  mimeType: string = "image/jpeg"
): Promise<string> => {
  
  // Strategy: Try Nano Banana Pro first (Best Quality). 
  // If it fails (Quota 429), Fallback to Flash Image (Fast/Free-er).
  const modelsToTry = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image"];

  // If user didn't provide a specific prompt, give a generic improvement prompt
  const finalPrompt = prompt || "Enhance the image quality and lighting";
  
  let lastError;

  for (const model of modelsToTry) {
    try {
      console.log(`Magic Edit with model: ${model}`);

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64,
              },
            },
            {
              text: finalPrompt,
            },
          ],
        },
        // Note: responseMimeType is not supported for nano banana series models for image output
      });

      // Iterate through candidates to find the image part
      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
    } catch (error: any) {
       console.warn(`Model ${model} failed:`, error.message);
       lastError = error;
       // If error is NOT Quota related, break. If it IS Quota, try next model.
       if (!error.message.includes("429") && !error.message.includes("503") && !error.message.includes("Quota")) {
         throw error;
       }
    }
  }

  throw lastError || new Error("No image generated by Gemini after retries.");
};