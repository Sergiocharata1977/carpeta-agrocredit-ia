import { AcceptAccessInvitation } from "@/components/access/AcceptAccessInvitation"

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <AcceptAccessInvitation token={token} />
}
