import { redirect } from "next/navigation";

export default function Page() {
  redirect("/feedback?tab=admin");
}
