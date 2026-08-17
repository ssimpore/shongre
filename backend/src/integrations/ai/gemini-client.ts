import { GoogleGenAI } from '@google/genai';
import { logger } from '../../infrastructure/logging/logger.js';

export interface AISafetyAssessment {
  riskScore: number;
  verdict: 'compliant' | 'suspicious' | 'prohibited_item' | 'potential_scam';
  confidence: number;
  summary: string;
  flaggedKeywords: string[];
}

export class GeminiClient {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.length > 5) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (err: any) {
        logger.warn(`Failed to initialize Gemini AI: ${err.message}`);
      }
    }
  }

  async analyzeListingContent(title: string, description: string, price: number): Promise<AISafetyAssessment> {
    const lower = `${title} ${description}`.toLowerCase();
    const banned = ['western union', 'mandat cash', 'crypto', 'contrefacon', 'arme', 'drogue'];
    const matched = banned.filter((b) => lower.includes(b));

    if (matched.length > 0) {
      return {
        riskScore: 85,
        verdict: 'suspicious',
        confidence: 90,
        summary: `Mots-clés suspects détectés: ${matched.join(', ')}`,
        flaggedKeywords: matched,
      };
    }

    if (price <= 0) {
      return {
        riskScore: 40,
        verdict: 'suspicious',
        confidence: 70,
        summary: 'Prix anormalement bas ou nul.',
        flaggedKeywords: [],
      };
    }

    return {
      riskScore: 5,
      verdict: 'compliant',
      confidence: 95,
      summary: 'Annonce conforme aux règles de sécurité Shongre.',
      flaggedKeywords: [],
    };
  }
}

export const geminiClient = new GeminiClient();
