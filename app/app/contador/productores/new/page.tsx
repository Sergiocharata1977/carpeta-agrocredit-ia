import { redirect } from "next/navigation"

// Esta ruta ya no se usa — el formulario vive en el modal de /app/contador/productores
export default function NuevoProductorPage() {
  redirect("/app/contador/productores")
}
