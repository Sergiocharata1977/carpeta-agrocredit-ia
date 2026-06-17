import { NextRequest } from "next/server"
import { runWorkerGlobal } from "@/lib/credito-hub/process-jobs"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workerId = `credito-hub-cron-${Date.now()}`
  const processed = await runWorkerGlobal(workerId)
  return Response.json({ processed })
}
