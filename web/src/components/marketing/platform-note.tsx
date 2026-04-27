export function PlatformNote() {
  return (
    <section className="border-t border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-[#0c0c0e] px-6 py-14" aria-label="Platform support">
      <div className="mx-auto max-w-5xl">
        <p className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5 text-center text-sm text-zinc-500 dark:text-zinc-400 shadow-sm">
          Available as a{" "}
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">macOS</strong>
          {" "}desktop app and{" "}
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">Linux</strong>
          {" "}container/headless runtime.
          Windows support is on the roadmap.
        </p>
      </div>
    </section>
  );
}
