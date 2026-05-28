import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const CONFIRM = process.env.SEED_DEMO_DATA_CONFIRM

if (CONFIRM !== "YES") {
  console.error("Abortado. Ejecuta con SEED_DEMO_DATA_CONFIRM=YES para crear datos demo.")
  process.exit(1)
}

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

if (!projectId || !clientEmail || !privateKey) {
  console.error("Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY.")
  process.exit(1)
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

const db = getFirestore()
const now = new Date().toISOString()
const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

const ids = {
  platformOrg: "demo-platform-org",
  producerOrg: "demo-producer-org",
  accountingOrg: "demo-accounting-org",
  bankOrg: "demo-bank-org",
  agroCompanyOrg: "demo-agro-company-org",
  producerUid: "demo-producer-uid",
  accountantUid: "demo-accountant-uid",
  bankUid: "demo-bank-uid",
  agroCompanyUid: "demo-agro-company-uid",
  adminUid: "demo-admin-uid",
  producer: "demo-producer-1",
  accountingFirm: "demo-accounting-firm-1",
  accountantLink: "demo-accountant-link-1",
  period: "demo-period-2025",
  balance: "demo-balance-2025",
  income: "demo-income-2025",
  tax: "demo-tax-iva-2025-12",
  realEstateAsset: "demo-asset-field-1",
  movableAsset: "demo-asset-tractor-1",
  liability: "demo-liability-bank-1",
  document: "demo-document-balance-2025",
  accessRequest: "demo-access-request-1",
  accessGrant: "demo-access-grant-1",
  financingRequest: "demo-financing-request-1",
  notification: "demo-notification-1",
  audit: "demo-audit-1",
}

async function main() {
  const batch = db.batch()

  const organizations = [
    {
      id: ids.platformOrg,
      type: "platform",
      legalName: "AgroCredit IA Demo",
      taxId: "30000000001",
      status: "active",
      plan: "enterprise",
      createdBy: ids.adminUid,
    },
    {
      id: ids.producerOrg,
      type: "producer",
      legalName: "Establecimiento La Esperanza",
      taxId: "20111111112",
      status: "active",
      plan: "pro",
      createdBy: ids.adminUid,
    },
    {
      id: ids.accountingOrg,
      type: "accounting_firm",
      legalName: "Estudio Contable Norte",
      taxId: "30222222223",
      status: "active",
      plan: "pro",
      createdBy: ids.adminUid,
    },
    {
      id: ids.bankOrg,
      type: "bank",
      legalName: "Banco Demo Agro",
      taxId: "30333333334",
      status: "active",
      plan: "enterprise",
      createdBy: ids.adminUid,
    },
    {
      id: ids.agroCompanyOrg,
      type: "agro_company",
      legalName: "Agrocomercial Demo SA",
      taxId: "30444444445",
      status: "active",
      plan: "enterprise",
      createdBy: ids.adminUid,
    },
  ]

  organizations.forEach((org) => {
    batch.set(db.collection("organizations").doc(org.id), {
      ...org,
      createdAt: now,
      updatedAt: now,
    })
  })

  const users = [
    {
      uid: ids.producerUid,
      email: "productor.demo@agrocredit.local",
      displayName: "Productor Demo",
      defaultOrganizationId: ids.producerOrg,
      roles: ["producer"],
    },
    {
      uid: ids.accountantUid,
      email: "contador.demo@agrocredit.local",
      displayName: "Contador Demo",
      defaultOrganizationId: ids.accountingOrg,
      roles: ["accountant"],
    },
    {
      uid: ids.bankUid,
      email: "banco.demo@agrocredit.local",
      displayName: "Analista Banco Demo",
      defaultOrganizationId: ids.bankOrg,
      roles: ["bank_user"],
    },
    {
      uid: ids.agroCompanyUid,
      email: "empresa.demo@agrocredit.local",
      displayName: "Analista Agrocomercial Demo",
      defaultOrganizationId: ids.agroCompanyOrg,
      roles: ["agro_company_user"],
    },
    {
      uid: ids.adminUid,
      email: "admin.demo@agrocredit.local",
      displayName: "Admin Plataforma Demo",
      defaultOrganizationId: ids.platformOrg,
      roles: ["admin_platform"],
    },
  ]

  users.forEach((user) => {
    batch.set(db.collection("users").doc(user.uid), {
      ...user,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    batch.set(db.collection("organization_members").doc(`${user.defaultOrganizationId}_${user.uid}`), {
      organizationId: user.defaultOrganizationId,
      uid: user.uid,
      role: user.roles[0],
      status: "active",
      invitedBy: ids.adminUid,
      createdAt: now,
      updatedAt: now,
    })
  })

  batch.set(db.collection("producers").doc(ids.producer), {
    organizationId: ids.producerOrg,
    taxId: "20111111112",
    legalName: "Establecimiento La Esperanza",
    personType: "physical",
    activity: "mixed",
    province: "Chaco",
    city: "Charata",
    address: "Ruta provincial demo km 12",
    phone: "+54 3731 000000",
    email: "productor.demo@agrocredit.local",
    folderStatus: "in_progress",
    createdAt: now,
    updatedAt: now,
    createdBy: ids.accountantUid,
  })

  batch.set(db.collection("accounting_firms").doc(ids.accountingFirm), {
    organizationId: ids.accountingOrg,
    legalName: "Estudio Contable Norte",
    taxId: "30222222223",
    contactName: "Contador Demo",
    contactEmail: "contador.demo@agrocredit.local",
    contactPhone: "+54 3731 000001",
    status: "active",
    createdAt: now,
    updatedAt: now,
    createdBy: ids.adminUid,
  })

  batch.set(db.collection("producer_accountant_links").doc(ids.accountantLink), {
    producerId: ids.producer,
    accountingFirmId: ids.accountingFirm,
    accountantUid: ids.accountantUid,
    status: "active",
    isMain: true,
    canUpload: true,
    canAuthorize: false,
    createdAt: now,
    updatedAt: now,
    createdBy: ids.adminUid,
  })

  batch.set(db.collection("accounting_periods").doc(ids.period), {
    producerId: ids.producer,
    year: 2025,
    periodType: "fiscal_year",
    status: "closed",
    closedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: ids.accountantUid,
  })

  batch.set(db.collection("balance_sheets").doc(ids.balance), {
    producerId: ids.producer,
    periodId: ids.period,
    assetsTotal: 180000000,
    liabilitiesTotal: 52000000,
    equityTotal: 128000000,
    validationStatus: "validated",
    createdAt: now,
    updatedAt: now,
    createdBy: ids.accountantUid,
  })

  batch.set(db.collection("income_statements").doc(ids.income), {
    producerId: ids.producer,
    periodId: ids.period,
    sales: 95000000,
    grossResult: 28000000,
    netResult: 17500000,
    validationStatus: "validated",
    createdAt: now,
    updatedAt: now,
    createdBy: ids.accountantUid,
  })

  batch.set(db.collection("tax_documents").doc(ids.tax), {
    producerId: ids.producer,
    periodId: ids.period,
    taxType: "iva",
    fiscalPeriod: "2025-12",
    amount: 2450000,
    documentIds: [ids.document],
    createdAt: now,
    updatedAt: now,
    createdBy: ids.accountantUid,
  })

  batch.set(db.collection("assets").doc(ids.realEstateAsset), {
    producerId: ids.producer,
    assetType: "real_estate",
    category: "field",
    description: "Campo agricola demo de 300 ha",
    estimatedValue: 135000000,
    lienStatus: "none",
    documentIds: [],
    createdAt: now,
    updatedAt: now,
    createdBy: ids.accountantUid,
  })

  batch.set(db.collection("assets").doc(ids.movableAsset), {
    producerId: ids.producer,
    assetType: "movable",
    category: "machinery",
    description: "Tractor demo",
    estimatedValue: 18000000,
    lienStatus: "pledged",
    documentIds: [],
    createdAt: now,
    updatedAt: now,
    createdBy: ids.accountantUid,
  })

  batch.set(db.collection("liabilities").doc(ids.liability), {
    producerId: ids.producer,
    creditor: "Banco Demo Agro",
    liabilityType: "bank_loan",
    amount: 22000000,
    currency: "ARS",
    dueDate: "2026-12-31",
    createdAt: now,
    updatedAt: now,
    createdBy: ids.accountantUid,
  })

  batch.set(db.collection("documents").doc(ids.document), {
    producerId: ids.producer,
    periodId: ids.period,
    documentType: "balance_sheet",
    storagePath: `orgs/${ids.producerOrg}/producers/${ids.producer}/periods/${ids.period}/balance_sheet/demo.pdf`,
    hash: "demo-only-no-file",
    visibility: "private",
    uploadedBy: ids.accountantUid,
    createdAt: now,
    updatedAt: now,
  })

  batch.set(db.collection("access_requests").doc(ids.accessRequest), {
    producerId: ids.producer,
    requesterOrganizationId: ids.bankOrg,
    requestedScopes: ["profile_basic", "accounting_summary", "balance_sheets", "assets"],
    purpose: "Evaluacion de linea de capital de trabajo demo",
    requestedExpirationDays: 90,
    status: "approved",
    decidedBy: ids.producerUid,
    decidedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: ids.bankUid,
  })

  batch.set(db.collection("access_grants").doc(ids.accessGrant), {
    producerId: ids.producer,
    accessRequestId: ids.accessRequest,
    grantedToOrganizationId: ids.bankOrg,
    allowedScopes: ["profile_basic", "accounting_summary", "balance_sheets", "assets"],
    purpose: "Evaluacion de linea de capital de trabajo demo",
    startsAt: now,
    expiresAt,
    status: "approved",
    grantedBy: ids.producerUid,
    createdAt: now,
    updatedAt: now,
  })

  batch.set(db.collection("financing_requests").doc(ids.financingRequest), {
    producerId: ids.producer,
    requesterOrganizationId: ids.bankOrg,
    grantId: ids.accessGrant,
    financingType: "working_capital",
    amount: 35000000,
    currency: "ARS",
    termMonths: 18,
    purpose: "Compra de insumos para campania demo",
    status: "in_review",
    observations: "Solicitud demo en analisis.",
    requiredDocuments: ["Balance 2025", "Detalle de deudas", "Constancia fiscal"],
    receivedDocuments: [ids.document],
    statusHistory: [
      {
        status: "requested",
        changedBy: ids.bankUid,
        changedAt: now,
        note: "Solicitud demo creada",
      },
      {
        status: "in_review",
        changedBy: ids.bankUid,
        changedAt: now,
        note: "Pasa a analisis",
      },
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: ids.bankUid,
  })

  batch.set(db.collection("notifications").doc(ids.notification), {
    recipientUid: ids.producerUid,
    organizationId: ids.producerOrg,
    type: "financing_request_received",
    status: "unread",
    payload: {
      financingRequestId: ids.financingRequest,
      producerId: ids.producer,
      requesterOrganizationId: ids.bankOrg,
    },
    createdAt: now,
  })

  batch.set(db.collection("audit_logs").doc(ids.audit), {
    actorUid: ids.bankUid,
    actorOrganizationId: ids.bankOrg,
    action: "financing_request.created",
    targetType: "financing_request",
    targetId: ids.financingRequest,
    producerId: ids.producer,
    metadata: { seed: true },
    createdAt: now,
  })

  await batch.commit()
  console.log("Datos demo creados/actualizados.")
  console.log("Nota: este seed crea perfiles Firestore, no usuarios Firebase Auth.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
