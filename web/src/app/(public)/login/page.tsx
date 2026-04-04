import Link from "next/link";

export const metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Dashboard auth (e.g. Auth0) will be wired here when the customer app is
        deployed.
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
