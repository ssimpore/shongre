import { geminiClient, AISafetyAssessment } from '../ai/gemini-client.js';

export interface IAIProvider {
  analyzeListingContent(title: string, description: string, price: number): Promise<AISafetyAssessment>;
}

export class DemoAIProvider implements IAIProvider {
  async analyzeListingContent(title: string, description: string, price: number): Promise<AISafetyAssessment> {
    return geminiClient.analyzeListingContent(title, description, price);
  }
}

export class GeminiAIProvider implements IAIProvider {
  async analyzeListingContent(title: string, description: string, price: number): Promise<AISafetyAssessment> {
    return geminiClient.analyzeListingContent(title, description, price);
  }
}
