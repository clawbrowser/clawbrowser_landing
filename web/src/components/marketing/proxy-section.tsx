export function ProxySection() {
  return (
    <section id="proxy" className="px-6 py-16" aria-labelledby="proxy-heading">
      <div className="mx-auto max-w-3xl space-y-4">
        <h2 id="proxy-heading" className="text-3xl font-bold">
          Proxy routing from the fingerprint profile
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Proxy credentials ride along with the fingerprint payload. Clawbrowser
          does not pick a separate proxy stack at launch—whatever the profile
          contains is what the browser uses for that session.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-zinc-600 dark:text-zinc-400">
          <li>
            Provider-agnostic: residential, datacenter, or other types expressed
            in the profile.
          </li>
          <li>One proxy per launch; no mid-session rotation inside a single run.</li>
          <li>
            If the proxy is broken or expired, relaunch after fixing credentials
            or run with{" "}
            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
              --regenerate
            </code>{" "}
            to fetch a fresh profile from the API.
          </li>
        </ul>
      </div>
    </section>
  );
}
