// Jurisdicciones argentinas. Cada una tiene su Consejo Profesional de
// Ciencias Economicas; el consejo del contador debe coincidir con su provincia.
export const AR_PROVINCES = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Cordoba",
  "Corrientes",
  "Entre Rios",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquen",
  "Rio Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucuman",
] as const

export type ArProvince = (typeof AR_PROVINCES)[number]

export function councilLabel(province: string): string {
  return `Consejo Profesional de Ciencias Economicas de ${province}`
}
