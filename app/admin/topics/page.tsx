import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function AdminTopicsPage() {
  await requireRole(["admin"]);
  redirect("/admin/subjects");
}
