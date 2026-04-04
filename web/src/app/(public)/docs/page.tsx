import Link from "next/link";

export const metadata = {
  title: "Documentation",
  description: "Clawbrowser documentation and guides.",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Documentation</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Full docs will live here (MDX, API reference, agent guides). For now, see
        the product spec in the repository and the agent integration guide in{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">docs/SKILL.md</code>.
      </p>
      <p className="mt-6">
        <Link href="/" className="font-medium text-zinc-950 underline dark:text-zinc-50">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
