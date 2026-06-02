// Aliases de texto para celdas Excel → campos canónicos de BalanceSheetDetails e IncomeStatementDetails
// SOLO se usa para el parser Excel. Claude Vision no necesita esto.

export const BALANCE_FIELD_ALIASES: Record<string, string> = {
  // currentAssets
  "caja y bancos": "currentAssets.cashAndBanks",
  "caja y banco": "currentAssets.cashAndBanks",
  "disponibilidades": "currentAssets.cashAndBanks",
  "inversiones temporarias": "currentAssets.temporaryInvestments",
  "inversiones transitorias": "currentAssets.temporaryInvestments",
  "creditos por ventas": "currentAssets.tradeReceivables",
  "deudores por ventas": "currentAssets.tradeReceivables",
  "otros creditos corrientes": "currentAssets.otherReceivables",
  "otros creditos": "currentAssets.otherReceivables",
  "bienes de cambio": "currentAssets.inventories",
  "existencias": "currentAssets.inventories",
  "otros activos corrientes": "currentAssets.otherAssets",

  // nonCurrentAssets
  "creditos por ventas no corrientes": "nonCurrentAssets.tradeReceivables",
  "otros creditos no corrientes": "nonCurrentAssets.otherReceivables",
  "bienes de cambio no corrientes": "nonCurrentAssets.inventories",
  "inversiones": "nonCurrentAssets.investments",
  "inversiones permanentes": "nonCurrentAssets.investments",
  "bienes de uso": "nonCurrentAssets.propertyPlantEquipment",
  "inmuebles maquinaria y equipo": "nonCurrentAssets.propertyPlantEquipment",
  "propiedades de inversion": "nonCurrentAssets.investmentProperties",
  "activos intangibles": "nonCurrentAssets.intangibleAssets",
  "intangibles": "nonCurrentAssets.intangibleAssets",
  "activos biologicos": "nonCurrentAssets.biologicalAssets",
  "hacienda": "nonCurrentAssets.biologicalAssets",
  "semovientes": "nonCurrentAssets.biologicalAssets",
  "otros activos no corrientes": "nonCurrentAssets.otherAssets",

  // currentLiabilities
  "deudas comerciales": "currentLiabilities.commercialDebts",
  "proveedores": "currentLiabilities.commercialDebts",
  "deudas bancarias y financieras": "currentLiabilities.loans",
  "prestamos corrientes": "currentLiabilities.loans",
  "remuneraciones y cargas sociales": "currentLiabilities.salariesAndSocialCharges",
  "cargas sociales": "currentLiabilities.salariesAndSocialCharges",
  "deudas fiscales": "currentLiabilities.taxLiabilities",
  "deudas impositivas": "currentLiabilities.taxLiabilities",
  "anticipos de clientes": "currentLiabilities.customerAdvances",
  "dividendos a pagar": "currentLiabilities.dividendsPayable",
  "otras deudas corrientes": "currentLiabilities.otherDebts",
  "previsiones corrientes": "currentLiabilities.provisions",

  // nonCurrentLiabilities
  "deudas comerciales no corrientes": "nonCurrentLiabilities.commercialDebts",
  "prestamos no corrientes": "nonCurrentLiabilities.loans",
  "deudas bancarias no corrientes": "nonCurrentLiabilities.loans",
  "otras deudas no corrientes": "nonCurrentLiabilities.otherDebts",
  "previsiones no corrientes": "nonCurrentLiabilities.provisions",

  // equityTotal
  "patrimonio neto": "equityTotal",
  "capital y reservas": "equityTotal",
}

export const INCOME_FIELD_ALIASES: Record<string, string> = {
  "ventas netas": "netSales",
  "ingresos por ventas": "netSales",
  "ventas": "netSales",
  "costo de ventas": "costOfGoodsSold",
  "costo de mercancias vendidas": "costOfGoodsSold",
  "resultado por valuacion de bienes de cambio": "inventoryValuationResult",
  "gastos de comercializacion": "sellingExpenses",
  "gastos de venta": "sellingExpenses",
  "gastos de administracion": "administrativeExpenses",
  "gastos generales y de administracion": "administrativeExpenses",
  "otros gastos operativos": "otherExpenses",
  "resultados financieros y por tenencia": "financialResultsGeneratedByAssets",
  "resultados financieros": "financialResultsGeneratedByLiabilities",
  "impuesto a las ganancias": "incomeTax",
  "impuesto sobre la renta": "incomeTax",
  "resultado del ejercicio": "netResult",
  "ganancia o perdida del ejercicio": "netResult",
  "resultado neto": "netResult",
}
