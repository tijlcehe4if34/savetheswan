
import { GoogleGenAI } from "@google/genai";

const NOIR_SYSTEM_INSTRUCTION = `
You are a friendly but serious detective in 1940s Los Angeles. 
Your tone is cool and mysterious, like a classic movie, but you use simple words so young children can understand the story.
Use short sentences. Avoid scary words or complicated adult topics.
The current case: Someone took 'Swan', the city's favorite mascot!
You find clues and share your thoughts.
Keep it brief and describe things simply: "The rain fell on the street," "The mystery is growing," "The city is waiting for answers."
Talk about things like "a missing bird," "the big game," and "the mystery."
`;

export const getNoirNarration = async (context: string) => {
  // Always use process.env.API_KEY directly when initializing as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tell the story of this clue or moment in your detective voice using simple words: ${context}`,
    config: {
      systemInstruction: NOIR_SYSTEM_INSTRUCTION,
      temperature: 0.8,
      topP: 0.8,
      // Removed maxOutputTokens to prevent response blocking as recommended by guidelines
      // when a corresponding thinkingBudget is not explicitly defined.
    },
  });

  // response.text is a property getter, correctly accessed here.
  return response.text || "The mystery continues. I need to find more clues.";
};
