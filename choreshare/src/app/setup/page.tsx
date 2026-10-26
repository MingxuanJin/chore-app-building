import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/family";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const { me } = await getMyProfile();
  if (me.family_id) redirect("/dashboard");
  return <SetupForm name={me.name} />;
}
