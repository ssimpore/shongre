import { config } from '../../app/config/index.js';
import { IPaymentProvider, DemoPaymentProvider, StripePaymentProvider } from './payment.provider.js';
import { IKYCProvider, DemoKYCProvider, LiveKYCProvider } from './kyc.provider.js';
import { IBusinessRegistryProvider, DemoBusinessRegistryProvider, SiretBusinessRegistryProvider } from './business-registry.provider.js';
import { IAIProvider, DemoAIProvider, GeminiAIProvider } from './ai.provider.js';

export interface ProviderContainer {
  payment: IPaymentProvider;
  kyc: IKYCProvider;
  businessRegistry: IBusinessRegistryProvider;
  ai: IAIProvider;
}

export function createProviderContainer(): ProviderContainer {
  return {
    payment: config.paymentProvider === 'stripe' ? new StripePaymentProvider() : new DemoPaymentProvider(),
    kyc: config.kycProvider === 'live' || config.kycProvider === 'stripe' ? new LiveKYCProvider() : new DemoKYCProvider(),
    businessRegistry: config.businessRegistryProvider === 'siret' ? new SiretBusinessRegistryProvider() : new DemoBusinessRegistryProvider(),
    ai: config.aiProvider === 'gemini' ? new GeminiAIProvider() : new DemoAIProvider(),
  };
}

export const providers: ProviderContainer = createProviderContainer();
