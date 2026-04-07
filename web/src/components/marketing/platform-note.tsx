export function PlatformNote() {
  return (
    <section className="border-t border-zinc-200 bg-[#FAFAF8] px-6 py-14" aria-label="Platform support">
      <div className="mx-auto max-w-5xl">
        <p className="rounded-2xl border border-zinc-200 bg-white px-6 py-5 text-center text-sm text-zinc-500 shadow-sm">
          MVP builds target{" "}
          <strong className="font-medium text-zinc-900">macOS</strong>.
          Linux and other platforms are on the roadmap; Windows is explicitly out
          of scope for now.
        </p>
      </div>
    </section>
  );
}
