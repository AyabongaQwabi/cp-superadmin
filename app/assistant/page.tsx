import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/auth";
import { AssistantChat } from "@/components/superadmin/AssistantChat";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return <AssistantChat adminName={session?.name} adminEmail={session?.email} />;
}
