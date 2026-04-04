import Link from "next/link";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Sign up</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Registration will connect to your billing and API key flow when the
        backend dashboard is live.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block font-medium text-zinc-950 underline dark:text-zinc-50"
      >
        ← Home
      </Link>
    </div>
  );
}
