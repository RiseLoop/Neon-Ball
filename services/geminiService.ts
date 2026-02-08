import { GoogleGenAI } from "@google/genai";
import { GameStats } from '../types.ts';

// Safely access API key, defaulting to empty string if process is undefined
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch {
    return '';
  }
};

const apiKey = getApiKey();

// Initialize Gemini
// Note: We create the client lazily or handle the missing key gracefully in the UI
const getAiClient = () => {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateGameCommentary = async (state: 'GAME_OVER' | 'VICTORY' | 'START' | 'RETRY', stats?: GameStats): Promise<string> => {
  const ai = getAiClient();
  if (!ai) {
    return "AI Module Offline: Please configure API_KEY.";
  }

  let prompt = "";
  
  if (state === 'START') {
    prompt = "Give a short, hyped-up, 1-sentence arcade opening line to start the game. Cyberpunk style.";
  } else if (state === 'GAME_OVER') {
    prompt = `The player decided to quit. They scored ${stats?.score} points. Give a short, sarcastic, 1-sentence comment.`;
  } else if (state === 'VICTORY') {
    prompt = `The player cleared level ${stats?.level}! Score: ${stats?.score}. Give a short, admiring but cool 1-sentence congratulation.`;
  } else if (state === 'RETRY') {
    prompt = `The player lost the ball and is restarting level ${stats?.level}. Give a short, encouraging but slightly teasing 1-sentence comment about trying again.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are NEO, a sentient arcade machine spirit. You are witty, slightly glitchy, and love neon aesthetics. Keep responses under 20 words.",
        temperature: 1.2, // High creativity
      }
    });
    
    return response.text || "Connection terminated...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "System Error... Speech synthesis failed.";
  }
};