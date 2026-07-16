import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 flex w-fit items-center gap-1.5 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Panel
        </Link>
        <h1 className="text-2xl font-bold text-white">Tu cuenta</h1>
        <p className="text-sm text-gray-400">{user.email}</p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
