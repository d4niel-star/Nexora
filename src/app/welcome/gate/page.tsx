import { redirect } from "next/navigation";
import { resolvePostAuthDestination } from "@/lib/onboarding-commercial/actions";

export default async function GatePage() {
  const { destination } = await resolvePostAuthDestination();
  redirect(destination);
}
