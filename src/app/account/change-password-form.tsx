"use client";

import { useActionState } from "react";
import { KeyRound, Check } from "lucide-react";
import {
  changePassword,
  type ChangePasswordState,
} from "@/lib/actions/account";

const initialState: ChangePasswordState = { error: null, success: false };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState,
  );

  return (
    <form
      action={formAction}
      key={state.success ? "done" : "form"}
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-gray-300">
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-gray-300"
        >
          Confirmar nueva contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="flex items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-sm text-teal-400">
          <Check className="h-4 w-4" />
          Contraseña actualizada.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-fit items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:from-teal-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" />
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
