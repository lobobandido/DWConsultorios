import Link from "next/link";
import { Calendar } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500">
        <Calendar className="h-7 w-7 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white sm:text-4xl">
        DW Consultorios
      </h1>
      <p className="max-w-md text-gray-400">
        Agenda médica para consultorios. Panel del doctor en construcción.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:from-teal-700 hover:to-cyan-700"
      >
        Ir a login
      </Link>
    </div>
  );
}
