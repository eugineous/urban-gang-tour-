import Nav from "../_components/Nav";

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />
      <div className="mx-auto max-w-[1440px] px-6 py-20 sm:px-10">
        <div className="mx-auto h-10 w-64 animate-pulse rounded-full bg-white/10" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              <div className="aspect-square animate-pulse bg-white/[0.06]" />
              <div className="p-6">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
