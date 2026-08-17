import { VerificationServiceContract, KYBCompanyLookupResult } from '../../contracts/verification.contract';
import { verificationService } from '../../../domains/verification/verification.service';
import { storageService } from '../../../services/storage.service';
import { VerificationState } from '../../../types';
import { simulateNetworkDelay } from '../../client/api-client.config';

export class DemoVerificationService implements VerificationServiceContract {
  async getUserVerificationStatus(userId: string): Promise<{
    state: VerificationState;
    isPhoneVerified: boolean;
    isIdentityVerified: boolean;
    isBusinessVerified: boolean;
    isBankPayoutConfigured: boolean;
  }> {
    await simulateNetworkDelay();
    const user = storageService.getUser(userId) || storageService.getCurrentUser();
    const summary = verificationService.getUserVerificationSummary(user);

    return {
      state: summary.dimensions.identity.state,
      isPhoneVerified: summary.dimensions.phone.state === 'verified',
      isIdentityVerified: summary.dimensions.identity.state === 'verified',
      isBusinessVerified: summary.dimensions.business.state === 'verified',
      isBankPayoutConfigured: summary.dimensions.bank_payout.state === 'verified',
    };
  }

  async submitIdentityDocument(userId: string, docType: string, fileUrl: string): Promise<{ status: 'pending' | 'verified' }> {
    await simulateNetworkDelay();
    const res = verificationService.submitIdentityVerification(
      userId,
      {
        documentType: docType as any,
        issuingCountry: 'FR',
        firstName: 'Jean',
        lastName: 'Dupont',
        birthDate: '1985-01-01',
        frontDocumentUrl: fileUrl,
        selfieUrl: fileUrl,
      },
      true // instant approve in demo mode
    );
    return { status: res.success ? 'verified' : 'pending' };
  }

  async lookupCompanyBySiret(siretOrSiren: string): Promise<KYBCompanyLookupResult | null> {
    await simulateNetworkDelay();
    const res = verificationService.lookupCompanyBySiret(siretOrSiren);
    if (!res) return null;

    return {
      siren: res.siren,
      name: res.companyName,
      legalForm: res.legalForm,
      address: res.address,
      city: res.city,
      postalCode: res.postalCode,
      isActive: res.isActive,
    };
  }

  async submitBusinessRegistration(userId: string, siret: string, representativeName: string): Promise<{ status: 'verified' }> {
    await simulateNetworkDelay();
    verificationService.submitBusinessVerification(
      userId,
      {
        companyName: `ENTREPRISE ${siret.substring(0, 4)}`,
        siret,
        legalForm: 'SAS',
        businessAddress: '10 Rue du Commerce',
        city: 'Paris',
        postalCode: '75001',
        country: 'FR',
        legalRepresentativeName: representativeName,
        legalRepresentativeRole: 'Dirigeant',
        uboDeclarationAccepted: true,
      },
      true
    );
    return { status: 'verified' };
  }

  async submitBankPayoutCoordinates(userId: string, iban: string, bic: string, holderName: string): Promise<{ status: 'configured' }> {
    await simulateNetworkDelay();
    verificationService.submitBankPayoutVerification(
      userId,
      {
        accountHolderName: holderName,
        iban,
        bic,
        bankName: 'Banque Démo Shongre',
        billingAddress: '10 Rue du Commerce',
      }
    );
    return { status: 'configured' };
  }
}

export const demoVerificationService = new DemoVerificationService();
