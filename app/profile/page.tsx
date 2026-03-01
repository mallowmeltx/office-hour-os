import { redirect } from "next/navigation";
import { RoleSwitcher } from "@/components/role-switcher";
import { getCurrentUser } from "@/lib/current-user";
import { requirePageSession } from "@/lib/require-page-session";

export default async function ProfilePage() {
  await requirePageSession("/profile");
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=%2Fprofile");
  }

  return (
    <section className="space-y-4">
      <div className="rounded border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.name ?? "User"} ({user.email})
        </p>
      </div>
      <RoleSwitcher currentRole={user.role} />
    </section>
  );
}
