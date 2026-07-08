import Nav from "../_components/Nav";

export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />
      <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10">
        <div className="mx-auto h-10 w-72 animate-pulse rounded-full bg-white/10" />
        <div className="mt-10 h-40 animate-pulse rounded-3xl bg-white/[0.06]" />
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}
