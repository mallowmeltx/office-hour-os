import Link from "next/link";
import { HomeLiveList } from "@/components/home-live-list";
import { auth0 } from "@/lib/auth0";

export default function Home() {
  const sessionPromise = auth0.getSession();

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-slate-200 bg-white p-8">
        <h1 className="text-3xl font-semibold text-slate-900">Office Hours OS</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Make virtual office hours easy to discover and join. Follow professors
          and tags, get notified when sessions go live, and keep threaded
          discussion archives for each event.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/calendar" className="rounded bg-slate-900 px-4 py-2 text-white">
            Explore events
          </Link>
          <Link href="/live" className="rounded border border-slate-300 px-4 py-2">
            View live now
          </Link>
          <AuthButton sessionPromise={sessionPromise} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Live now</h2>
        <p className="mt-1 text-sm text-slate-600">
          This list auto-refreshes so students can join quickly.
        </p>
        <div className="mt-4">
          <HomeLiveList />
        </div>
      </section>
    </div>
  );
}

async function AuthButton({
  sessionPromise,
}: {
  sessionPromise: ReturnType<typeof auth0.getSession>;
}) {
  const session = await sessionPromise;
  return !session ? (
    <a href="/auth/login" className="rounded border border-slate-300 px-4 py-2">
      Login with magic link
    </a>
  ) : (
    <a href="/auth/logout" className="rounded border border-slate-300 px-4 py-2">
      Logout
    </a>
  );
}
