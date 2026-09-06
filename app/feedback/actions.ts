"use server";

import { revalidatePath } from "next/cache";
import { companionApi } from "@/lib/companion-api";

export async function respondToSupportRequest(formData: FormData) {
  const id = String(formData.get("id") || "");
  const response = String(formData.get("response") || "");
  await companionApi(`/api/support-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ response }),
  });
  revalidatePath("/feedback");
}

export async function respondToSupportTicket(formData: FormData) {
  const id = String(formData.get("id") || "");
  const response = String(formData.get("response") || "");
  await companionApi(`/api/admin/support-tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ response, status: "resolved", actorName: "Admin Companion" }),
  });
  revalidatePath("/feedback");
}

export async function updateFeatureRequestStatus(formData: FormData) {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  await companionApi(`/api/admin/feature-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  revalidatePath("/feedback");
}
