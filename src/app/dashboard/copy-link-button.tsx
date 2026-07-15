"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API puede fallar por permisos del navegador; no es crítico.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-teal-500/50 hover:text-white"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-teal-400" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copiar enlace
        </>
      )}
    </button>
  );
}
