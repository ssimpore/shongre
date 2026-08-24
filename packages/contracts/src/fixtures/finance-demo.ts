import type {
  AccountFinanceDashboard,
  FinanceTransaction,
  PlatformFinanceDashboard,
  ReconciliationCase,
} from "../schemas/finance";
import type { Money } from "../schemas/primitives";

const eur = (amountMinor: number): Money => ({ amountMinor, currency: "EUR" });

const entry = (
  id: string,
  accountCode: string,
  accountLabel: string,
  accountClass:
    "asset" | "liability" | "equity" | "revenue" | "expense" | "contra_revenue",
  side: "debit" | "credit",
  amountMinor: number,
) => ({
  id,
  accountCode,
  accountLabel,
  accountClass,
  side,
  amount: eur(amountMinor),
});

export const DEMO_FINANCE_TRANSACTIONS: readonly FinanceTransaction[] = [
  {
    id: "fin_tx_1842",
    reference: "TX-20260822-1842",
    type: "subscription",
    status: "posted",
    accountId: "org_garage_martin",
    accountLabel: "Garage Martin",
    marketCode: "FR",
    grossAmount: eur(11880),
    netAmount: eur(9700),
    occurredAt: "2026-08-22T19:14:00.000Z",
    postedAt: "2026-08-22T19:14:02.000Z",
    provider: "Stripe",
    providerReference: "pi_3Qx1842",
    invoiceReference: "FAC-2026-1842",
    description: "Abonnement Pro Business — août 2026",
    entries: [
      entry("le_1842_1", "1100", "Liquidités Stripe", "asset", "debit", 11880),
      entry("le_1842_2", "4457", "TVA collectée", "liability", "credit", 1980),
      entry(
        "le_1842_3",
        "4870",
        "Revenus différés",
        "liability",
        "credit",
        9900,
      ),
    ],
  },
  {
    id: "fin_tx_1839",
    reference: "TX-20260822-1839",
    type: "promotion",
    status: "reconciled",
    accountId: "user_claire_dupont",
    accountLabel: "Claire Dupont",
    marketCode: "BE",
    grossAmount: eur(999),
    netAmount: eur(826),
    occurredAt: "2026-08-22T18:52:00.000Z",
    postedAt: "2026-08-22T18:52:01.000Z",
    provider: "Stripe",
    providerReference: "pi_3Qx1839",
    orderReference: "CMD-88420",
    description: "Promotion À la une — 7 jours",
    entries: [
      entry("le_1839_1", "1100", "Liquidités Stripe", "asset", "debit", 999),
      entry(
        "le_1839_2",
        "7061",
        "Revenus promotions",
        "revenue",
        "credit",
        826,
      ),
      entry("le_1839_3", "4457", "TVA collectée", "liability", "credit", 173),
    ],
  },
  {
    id: "fin_tx_1821",
    reference: "TX-20260822-1821",
    type: "commission",
    status: "needs_review",
    accountId: "seller_cocoolis",
    accountLabel: "Cocoolis",
    marketCode: "FR",
    grossAmount: eur(12000),
    netAmount: eur(1398),
    occurredAt: "2026-08-22T17:31:42.000Z",
    postedAt: "2026-08-22T17:31:43.000Z",
    provider: "Stripe",
    providerReference: "pi_3Qx9K2",
    orderReference: "CMD-88421",
    description: "Commission et répartition d’une commande marketplace",
    entries: [
      entry("le_1821_1", "1100", "Liquidités Stripe", "asset", "debit", 12000),
      entry(
        "le_1821_2",
        "7064",
        "Revenus de commission",
        "revenue",
        "credit",
        1200,
      ),
      entry("le_1821_3", "4457", "TVA collectée", "liability", "credit", 240),
      entry(
        "le_1821_4",
        "4670",
        "Dettes envers vendeur",
        "liability",
        "credit",
        10560,
      ),
    ],
  },
  {
    id: "fin_rf_0082",
    reference: "RF-20260822-0082",
    type: "refund",
    status: "refunded",
    accountId: "org_auto_prestige",
    accountLabel: "Auto Prestige",
    marketCode: "FR",
    grossAmount: eur(-4999),
    netAmount: eur(-4999),
    occurredAt: "2026-08-22T16:07:00.000Z",
    postedAt: "2026-08-22T16:07:02.000Z",
    provider: "Stripe",
    providerReference: "re_8A0082",
    reversalOfTransactionId: "fin_tx_1402",
    description: "Remboursement promotion non diffusée",
    entries: [
      entry(
        "le_0082_1",
        "7091",
        "Remboursements",
        "contra_revenue",
        "debit",
        4166,
      ),
      entry("le_0082_2", "4457", "TVA collectée", "liability", "debit", 833),
      entry("le_0082_3", "1100", "Liquidités Stripe", "asset", "credit", 4999),
    ],
  },
  {
    id: "fin_tx_1803",
    reference: "TX-20260822-1803",
    type: "advertising",
    status: "posted",
    accountId: "org_immo_horizon",
    accountLabel: "Immo Horizon",
    marketCode: "FR",
    grossAmount: eur(24000),
    netAmount: eur(19800),
    occurredAt: "2026-08-22T15:46:00.000Z",
    postedAt: "2026-08-22T15:46:01.000Z",
    provider: "Stripe",
    providerReference: "pi_3Qx1803",
    description: "Campagne publicitaire sponsorisée",
    entries: [
      entry("le_1803_1", "1100", "Liquidités Stripe", "asset", "debit", 24000),
      entry(
        "le_1803_2",
        "7063",
        "Revenus publicitaires",
        "revenue",
        "credit",
        20000,
      ),
      entry("le_1803_3", "4457", "TVA collectée", "liability", "credit", 4000),
    ],
  },
  {
    id: "fin_py_0031",
    reference: "PY-20260822-0031",
    type: "seller_payout",
    status: "failed",
    accountId: "org_tech_reuse",
    accountLabel: "Tech Reuse",
    marketCode: "BE",
    grossAmount: eur(-81240),
    netAmount: eur(-81240),
    occurredAt: "2026-08-22T14:18:00.000Z",
    provider: "Stripe",
    providerReference: "po_1Qx0031",
    description: "Virement vendeur rejeté par la banque destinataire",
    entries: [
      entry(
        "le_0031_1",
        "4670",
        "Dettes envers vendeur",
        "liability",
        "debit",
        81240,
      ),
      entry(
        "le_0031_2",
        "5120",
        "Banque — virements en transit",
        "asset",
        "credit",
        81240,
      ),
    ],
  },
];

const metric = (
  amountMinor: number,
  definition: string,
  changeBps?: number,
) => ({
  amount: eur(amountMinor),
  definition,
  changeBps,
});

export const DEMO_PLATFORM_FINANCE_DASHBOARD: PlatformFinanceDashboard = {
  scope: { period: "30d", marketCode: "ALL", currency: "EUR" },
  asOf: "2026-08-22T21:45:00.000Z",
  isPeriodClosed: true,
  metrics: {
    platformRevenue: metric(
      4_286_000,
      "Revenus Shongre reconnus hors TVA et fonds dus aux vendeurs.",
      1240,
    ),
    netRevenue: metric(
      3_974_200,
      "Revenus plateforme diminués des frais fournisseurs et remboursements.",
      1010,
    ),
    gmv: metric(
      12_640_000,
      "Valeur brute des transactions marketplace confirmées.",
      1530,
    ),
    grossCollected: metric(
      17_260_000,
      "Sommes brutes encaissées, incluant TVA et fonds vendeurs.",
      1180,
    ),
    taxCollected: metric(
      857_200,
      "TVA collectée et due aux administrations fiscales.",
    ),
    sellerPayable: metric(
      10_684_000,
      "Montants acquis aux vendeurs mais non encore versés.",
    ),
    outstanding: metric(
      846_000,
      "Factures et paiements attendus à la date d’arrêté.",
    ),
    deferredRevenue: metric(
      1_190_000,
      "Encaissements d’abonnement restant à reconnaître sur les périodes futures.",
    ),
    providerFees: metric(
      287_800,
      "Frais Stripe et autres fournisseurs de paiement.",
    ),
    refunds: metric(
      24_000,
      "Remboursements et avoirs comptabilisés sur la période.",
    ),
    mrr: metric(
      1_842_000,
      "Revenu mensuel récurrent des abonnements actifs.",
      870,
    ),
    arr: metric(22_104_000, "MRR annualisé à situation constante."),
  },
  revenueSources: [
    {
      key: "subscriptions",
      label: "Abonnements Pro",
      amount: eur(1_840_000),
      shareBps: 4293,
    },
    {
      key: "promotions",
      label: "Promotions",
      amount: eur(1_320_000),
      shareBps: 3080,
    },
    {
      key: "advertising",
      label: "Publicité sponsorisée",
      amount: eur(690_000),
      shareBps: 1610,
    },
    {
      key: "commissions",
      label: "Commissions & frais",
      amount: eur(436_000),
      shareBps: 1017,
    },
  ],
  timeSeries: [
    ["2026-07-24", 98000, 88000],
    ["2026-07-28", 124000, 112000],
    ["2026-08-01", 151000, 136000],
    ["2026-08-05", 132000, 119000],
    ["2026-08-09", 184000, 165000],
    ["2026-08-13", 141000, 127000],
    ["2026-08-17", 166000, 149000],
    ["2026-08-22", 152000, 138000],
  ].map(([date, platformRevenue, netRevenue]) => ({
    date: String(date),
    platformRevenue: eur(Number(platformRevenue)),
    netRevenue: eur(Number(netRevenue)),
  })),
  subscriptionHealth: {
    paidAccounts: 214,
    newSubscriptions: 18,
    churnBps: 280,
    arppu: eur(8607),
  },
  exceptions: [
    {
      key: "failed_payments",
      label: "Paiements échoués",
      count: 12,
      severity: "critical",
      amountImpact: eur(118_400),
    },
    {
      key: "reconciliation_gaps",
      label: "Écarts de rapprochement",
      count: 3,
      severity: "warning",
      amountImpact: eur(6),
    },
    {
      key: "failed_payouts",
      label: "Virements en échec",
      count: 2,
      severity: "critical",
      amountImpact: eur(113_260),
    },
  ],
  markets: [
    {
      marketCode: "FR",
      label: "France",
      platformRevenue: eur(3_214_000),
      netRevenue: eur(2_971_000),
      gmv: eur(9_830_000),
    },
    {
      marketCode: "BE",
      label: "Belgique",
      platformRevenue: eur(1_072_000),
      netRevenue: eur(1_003_200),
      gmv: eur(2_810_000),
    },
  ],
  verticals: [
    {
      verticalId: "general",
      label: "Shongre Pro",
      revenue: eur(400_000),
      mrr: eur(310_000),
      activeTrials: 8,
      payingSubscriptions: 44,
      cancelledSubscriptions: 3,
      trialsStarted: 31,
      convertedAccounts: 23,
      conversionBps: 7419,
    },
    {
      verticalId: "auto",
      label: "Shongre Auto",
      revenue: eur(520_000),
      mrr: eur(470_000),
      activeTrials: 12,
      payingSubscriptions: 57,
      cancelledSubscriptions: 4,
      trialsStarted: 46,
      convertedAccounts: 34,
      conversionBps: 7391,
    },
    {
      verticalId: "immo",
      label: "Shongre Immo",
      revenue: eur(440_000),
      mrr: eur(410_000),
      activeTrials: 7,
      payingSubscriptions: 49,
      cancelledSubscriptions: 2,
      trialsStarted: 28,
      convertedAccounts: 22,
      conversionBps: 7857,
    },
    {
      verticalId: "emploi",
      label: "Shongre Emploi",
      revenue: eur(300_000),
      mrr: eur(270_000),
      activeTrials: 5,
      payingSubscriptions: 38,
      cancelledSubscriptions: 2,
      trialsStarted: 19,
      convertedAccounts: 14,
      conversionBps: 7368,
    },
    {
      verticalId: "education",
      label: "Shongre Education",
      revenue: eur(180_000),
      mrr: eur(382_000),
      activeTrials: 3,
      payingSubscriptions: 26,
      cancelledSubscriptions: 1,
      trialsStarted: 13,
      convertedAccounts: 10,
      conversionBps: 7692,
    },
  ],
};

export const DEMO_RECONCILIATION_CASES: readonly ReconciliationCase[] = [
  {
    id: "rec_20260822_001",
    transactionId: "fin_tx_1821",
    status: "open",
    expectedAmount: eur(42),
    actualAmount: eur(40),
    difference: eur(2),
    reason: "Frais fournisseur reçus différents du montant attendu.",
    openedAt: "2026-08-22T17:34:00.000Z",
  },
];

export function createDemoAccountFinanceDashboard(
  accountId: string,
  accountLabel: string,
  accountKind: "individual" | "professional",
  hasSellerActivity = accountKind === "professional",
): AccountFinanceDashboard {
  const representative = structuredClone(
    accountKind === "professional"
      ? DEMO_FINANCE_TRANSACTIONS[0]
      : DEMO_FINANCE_TRANSACTIONS[1],
  );
  representative.id = `account_${accountId}_${representative.id}`;
  representative.reference =
    accountKind === "professional" ? "TX-20260801-0412" : "TX-20260822-1839";
  representative.accountId = accountId;
  representative.accountLabel = accountLabel;
  return {
    accountId,
    accountLabel,
    accountKind,
    asOf: DEMO_PLATFORM_FINANCE_DASHBOARD.asOf,
    metrics: {
      spending: metric(
        accountKind === "professional" ? 14_256 : 999,
        "Achats et abonnements payés à Shongre.",
      ),
      sellerEarnings: metric(
        accountKind === "professional"
          ? 183_420
          : hasSellerActivity
            ? 25_000
            : 0,
        "Produit net des ventes après commissions et remboursements.",
      ),
      availableForPayout: metric(
        accountKind === "professional"
          ? 64_280
          : hasSellerActivity
            ? 12_600
            : 0,
        "Solde acquis et disponible pour virement.",
      ),
      pendingPayout: metric(
        accountKind === "professional" ? 81_240 : 0,
        "Virements initiés ou temporairement retenus.",
      ),
      refunded: metric(
        accountKind === "professional" ? 4_999 : 0,
        "Remboursements reçus ou émis sur la période.",
      ),
    },
    transactions: [representative],
  };
}
