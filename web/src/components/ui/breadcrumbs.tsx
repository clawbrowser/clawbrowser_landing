import Link from "next/link";

interface Crumb { label: string; href?: string }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500">
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-zinc-600 dark:text-zinc-400">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
