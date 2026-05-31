export type Currency = "ARS" | "USD"

export interface BalanceSheetDetails {
  currentAssets: {
    cashAndBanks: number
    temporaryInvestments: number
    tradeReceivables: number
    otherReceivables: number
    inventories: number
    otherAssets: number
  }
  nonCurrentAssets: {
    tradeReceivables: number
    otherReceivables: number
    inventories: number
    investments: number
    propertyPlantEquipment: number
    investmentProperties: number
    intangibleAssets: number
    biologicalAssets: number
    otherAssets: number
  }
  currentLiabilities: {
    commercialDebts: number
    loans: number
    salariesAndSocialCharges: number
    taxLiabilities: number
    customerAdvances: number
    dividendsPayable: number
    otherDebts: number
    provisions: number
  }
  nonCurrentLiabilities: {
    commercialDebts: number
    loans: number
    salariesAndSocialCharges: number
    taxLiabilities: number
    customerAdvances: number
    dividendsPayable: number
    otherDebts: number
    provisions: number
  }
}

export interface IncomeStatementDetails {
  netSales: number
  costOfGoodsSold: number
  inventoryValuationResult: number
  sellingExpenses: number
  administrativeExpenses: number
  otherExpenses: number
  relatedInvestmentResults: number
  otherInvestmentResults: number
  financialResultsGeneratedByAssets: number
  financialResultsGeneratedByLiabilities: number
  otherIncomeAndExpenses: number
  incomeTax: number
  discontinuedOperationsResult: number
  discontinuedDisposalResult: number
  extraordinaryResults: number
}

export const DEFAULT_BALANCE_SHEET_DETAILS: BalanceSheetDetails = {
  currentAssets: {
    cashAndBanks: 0,
    temporaryInvestments: 0,
    tradeReceivables: 0,
    otherReceivables: 0,
    inventories: 0,
    otherAssets: 0,
  },
  nonCurrentAssets: {
    tradeReceivables: 0,
    otherReceivables: 0,
    inventories: 0,
    investments: 0,
    propertyPlantEquipment: 0,
    investmentProperties: 0,
    intangibleAssets: 0,
    biologicalAssets: 0,
    otherAssets: 0,
  },
  currentLiabilities: {
    commercialDebts: 0,
    loans: 0,
    salariesAndSocialCharges: 0,
    taxLiabilities: 0,
    customerAdvances: 0,
    dividendsPayable: 0,
    otherDebts: 0,
    provisions: 0,
  },
  nonCurrentLiabilities: {
    commercialDebts: 0,
    loans: 0,
    salariesAndSocialCharges: 0,
    taxLiabilities: 0,
    customerAdvances: 0,
    dividendsPayable: 0,
    otherDebts: 0,
    provisions: 0,
  },
}

export const DEFAULT_INCOME_STATEMENT_DETAILS: IncomeStatementDetails = {
  netSales: 0,
  costOfGoodsSold: 0,
  inventoryValuationResult: 0,
  sellingExpenses: 0,
  administrativeExpenses: 0,
  otherExpenses: 0,
  relatedInvestmentResults: 0,
  otherInvestmentResults: 0,
  financialResultsGeneratedByAssets: 0,
  financialResultsGeneratedByLiabilities: 0,
  otherIncomeAndExpenses: 0,
  incomeTax: 0,
  discontinuedOperationsResult: 0,
  discontinuedDisposalResult: 0,
  extraordinaryResults: 0,
}

export const BALANCE_FIELD_GROUPS = [
  {
    title: "Activo corriente",
    path: "currentAssets",
    fields: [
      { name: "cashAndBanks", label: "Caja y bancos" },
      { name: "temporaryInvestments", label: "Inversiones temporarias" },
      { name: "tradeReceivables", label: "Creditos por ventas" },
      { name: "otherReceivables", label: "Otros creditos" },
      { name: "inventories", label: "Bienes de cambio" },
      { name: "otherAssets", label: "Otros activos" },
    ],
  },
  {
    title: "Activo no corriente",
    path: "nonCurrentAssets",
    fields: [
      { name: "tradeReceivables", label: "Creditos por ventas" },
      { name: "otherReceivables", label: "Otros creditos" },
      { name: "inventories", label: "Bienes de cambio" },
      { name: "investments", label: "Inversiones" },
      { name: "propertyPlantEquipment", label: "Bienes de uso" },
      { name: "investmentProperties", label: "Propiedades de inversion" },
      { name: "intangibleAssets", label: "Activos intangibles" },
      { name: "biologicalAssets", label: "Activos biologicos" },
      { name: "otherAssets", label: "Otros activos" },
    ],
  },
  {
    title: "Pasivo corriente",
    path: "currentLiabilities",
    fields: [
      { name: "commercialDebts", label: "Deudas comerciales" },
      { name: "loans", label: "Prestamos" },
      { name: "salariesAndSocialCharges", label: "Remuneraciones y cargas sociales" },
      { name: "taxLiabilities", label: "Cargas fiscales" },
      { name: "customerAdvances", label: "Anticipos de clientes" },
      { name: "dividendsPayable", label: "Dividendos a pagar" },
      { name: "otherDebts", label: "Otras deudas" },
      { name: "provisions", label: "Previsiones" },
    ],
  },
  {
    title: "Pasivo no corriente",
    path: "nonCurrentLiabilities",
    fields: [
      { name: "commercialDebts", label: "Deudas comerciales" },
      { name: "loans", label: "Prestamos" },
      { name: "salariesAndSocialCharges", label: "Remuneraciones y cargas sociales" },
      { name: "taxLiabilities", label: "Cargas fiscales" },
      { name: "customerAdvances", label: "Anticipos de clientes" },
      { name: "dividendsPayable", label: "Dividendos a pagar" },
      { name: "otherDebts", label: "Otras deudas" },
      { name: "provisions", label: "Previsiones" },
    ],
  },
] as const

export const INCOME_FIELD_GROUPS = [
  {
    title: "Operaciones que continuan",
    fields: [
      { name: "netSales", label: "Ventas netas de bienes o servicios" },
      { name: "costOfGoodsSold", label: "Costo de los bienes vendidos o servicios prestados" },
      { name: "inventoryValuationResult", label: "Resultado por valuacion de bienes de cambio al VNR" },
      { name: "sellingExpenses", label: "Gastos de comercializacion" },
      { name: "administrativeExpenses", label: "Gastos de administracion" },
      { name: "otherExpenses", label: "Otros gastos" },
      { name: "relatedInvestmentResults", label: "Resultados de inversiones en entes relacionados" },
      { name: "otherInvestmentResults", label: "Resultados de otras inversiones" },
      { name: "financialResultsGeneratedByAssets", label: "Resultados financieros por tenencia - generados por activos" },
      { name: "financialResultsGeneratedByLiabilities", label: "Resultados financieros por tenencia - generados por pasivos" },
      { name: "otherIncomeAndExpenses", label: "Otros ingresos y egresos" },
      { name: "incomeTax", label: "Impuesto a las ganancias" },
    ],
  },
  {
    title: "Operaciones en discontinuacion y extraordinarias",
    fields: [
      { name: "discontinuedOperationsResult", label: "Resultados de las operaciones en discontinuacion" },
      { name: "discontinuedDisposalResult", label: "Resultados por disposicion de activos y liquidacion de deudas" },
      { name: "extraordinaryResults", label: "Resultados de las operaciones extraordinarias" },
    ],
  },
] as const

function sumObjectValues(values: Record<string, number>): number {
  return Object.values(values).reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
}

export function calculateBalanceTotals(details: BalanceSheetDetails, equityTotal: number) {
  const currentAssetsTotal = sumObjectValues(details.currentAssets)
  const nonCurrentAssetsTotal = sumObjectValues(details.nonCurrentAssets)
  const currentLiabilitiesTotal = sumObjectValues(details.currentLiabilities)
  const nonCurrentLiabilitiesTotal = sumObjectValues(details.nonCurrentLiabilities)
  const assetsTotal = currentAssetsTotal + nonCurrentAssetsTotal
  const liabilitiesTotal = currentLiabilitiesTotal + nonCurrentLiabilitiesTotal

  return {
    currentAssetsTotal,
    nonCurrentAssetsTotal,
    assetsTotal,
    currentLiabilitiesTotal,
    nonCurrentLiabilitiesTotal,
    liabilitiesTotal,
    equityTotal,
    liabilitiesAndEquityTotal: liabilitiesTotal + equityTotal,
  }
}

export function calculateIncomeTotals(details: IncomeStatementDetails) {
  const grossResult = details.netSales - details.costOfGoodsSold
  const continuingBeforeTax =
    grossResult +
    details.inventoryValuationResult -
    details.sellingExpenses -
    details.administrativeExpenses -
    details.otherExpenses +
    details.relatedInvestmentResults +
    details.otherInvestmentResults +
    details.financialResultsGeneratedByAssets +
    details.financialResultsGeneratedByLiabilities +
    details.otherIncomeAndExpenses
  const continuingOrdinaryResult = continuingBeforeTax - details.incomeTax
  const discontinuedResult =
    details.discontinuedOperationsResult + details.discontinuedDisposalResult
  const ordinaryResult = continuingOrdinaryResult + discontinuedResult
  const netResult = ordinaryResult + details.extraordinaryResults

  return {
    grossResult,
    continuingBeforeTax,
    continuingOrdinaryResult,
    discontinuedResult,
    ordinaryResult,
    netResult,
  }
}
