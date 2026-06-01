import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProducerDocumentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documentacion</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Sin checklist documental cargado.
        </p>
      </CardContent>
    </Card>
  )
}
