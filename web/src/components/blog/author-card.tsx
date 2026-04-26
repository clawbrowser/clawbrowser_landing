interface AuthorCardProps {
  name: string;
  role?: string;
  github?: string;
  twitter?: string;
}

function SocialIcons({ github, twitter }: Pick<AuthorCardProps, "github" | "twitter">) {
  return (
    <div className="flex items-center gap-2">
      {twitter && (
        <a href={twitter} target="_blank" rel="noopener noreferrer" aria-label="X / Twitter"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
      )}
      {github && (
        <a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
          </svg>
        </a>
      )}
    </div>
  );
}

/** Sticky desktop sidebar */
export function AuthorSidebar({ name, role, github, twitter }: AuthorCardProps) {
  return (
    <aside className="hidden w-44 shrink-0 lg:block">
      <div className="sticky top-24 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Written by
        </p>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-xl font-bold text-white select-none">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug">{name}</p>
          {role && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{role}</p>}
        </div>
        {(twitter || github) && <SocialIcons github={github} twitter={twitter} />}
      </div>
    </aside>
  );
}

/** Compact mobile card — shown below the hero title on small screens */
export function AuthorCard({ name, role, github, twitter }: AuthorCardProps) {
  return (
    <div className="flex items-center gap-3 lg:hidden">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 text-sm font-bold text-white select-none">
        {name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{name}</p>
        {role && <p className="text-xs text-zinc-500 dark:text-zinc-400">{role}</p>}
      </div>
      {(twitter || github) && <SocialIcons github={github} twitter={twitter} />}
    </div>
  );
}
