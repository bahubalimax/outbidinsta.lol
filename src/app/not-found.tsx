import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 text-lg font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        That page doesn&apos;t exist. Try the leaderboard.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        Go home
      </Link>
    </div>
  );
}
