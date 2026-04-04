import { Card, CardContent } from "@/components/ui/card";

export function PlatformNote() {
  return (
    <section className="px-6 py-12" aria-label="Platform support">
      <Card className="mx-auto max-w-3xl border-dashed">
        <CardContent className="pt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          MVP builds target{" "}
          <strong className="text-zinc-950 dark:text-zinc-50">macOS</strong>.
          Linux and other platforms are on the roadmap; Windows is explicitly out
          of scope for now.
        </CardContent>
      </Card>
    </section>
  );
}
