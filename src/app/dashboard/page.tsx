import { redirect } from "next/navigation";

/** @deprecated Use /portal instead. This page redirects for backward compatibility. */
export default function DashboardPage() {
  redirect("/portal");
}
