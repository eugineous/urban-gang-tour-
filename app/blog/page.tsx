import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import { BLOG_POSTS } from "@/content/blog";

const title = "Urban News — Stories From The Road";
const description = "Urban News: recaps, milestones, and behind-the-scenes stories from every Urban Gang Tour stop across Kenya.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: { title, description, url: "/blog", type: "website" },
};

export default function BlogListPage() {
  const [featured, ...rest] = BLOG_POSTS;
  const ticker = BLOG_POSTS.map((p) => p.title).join("  ✦  ");

  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Urban News",
    url: "https://urbangangtour.co.ke/blog",
    publisher: { "@type": "Organization", name: "Urban Gang Tour" },
    blogPost: BLOG_POSTS.map((p) => ({ "@type": "BlogPosting", headline: p.title, datePublished: p.date, url: `https://urbangangtour.co.ke/blog/${p.slug}` })),
  };

  return (
    <div className="min-h-screen bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }} />
      <Nav />

      <div className="border-b-2 border-ink px-6 py-3 sm:px-10">
        <div className="mx-auto flex max-w-[1160px] flex-wrap justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/55">
          <span>The culture&apos;s paper of record · Est. 2025</span>
          <span>Nairobi · Free forever · <span className="text-magenta">On PPP TV CH 430</span></span>
        </div>
      </div>

      <div className="border-b-4 border-ink px-6 py-9 text-center sm:px-10">
        <h1 className="font-display text-[clamp(50px,10vw,120px)] uppercase leading-[0.85] tracking-[-0.01em]">
          Urban<span className="text-magenta">*</span>News
        </h1>
        <div className="mt-2.5 -rotate-1 font-marker text-[clamp(14px,2vw,19px)]">
          everything the tour did, is doing, and is about to do — reported by the gang itself
        </div>
      </div>

      <div className="overflow-hidden border-b-4 border-gold bg-ink py-2.5">
        <div className="flex w-max animate-marquee-slow whitespace-nowrap font-sans text-[13px] font-bold uppercase text-gold">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="px-6">
              <span className="text-live">● BREAKING</span> {ticker} ✦
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1160px] px-6 pb-3 pt-10 sm:px-10">
        <Link
          href={`/blog/${featured.slug}`}
          className="grid grid-cols-1 overflow-hidden rounded-2xl border-4 border-ink shadow-[10px_10px_0_#E6218C] sm:grid-cols-2"
        >
          <div className="relative min-h-[300px] bg-concrete sm:min-h-[360px]">
            <img src={featured.img} alt={featured.title} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute left-3.5 top-3.5 -rotate-2 rounded-full border-2 border-ink bg-live px-3.5 py-1.5 text-[11px] font-bold uppercase text-white">
              Lead Story
            </span>
          </div>
          <div className="bg-white p-8 sm:p-11">
            <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-magenta">
              {featured.tag} · {featured.dateLabel}
            </div>
            <div className="mt-2.5 font-display text-[clamp(26px,3vw,40px)] uppercase leading-[0.95]">{featured.title}</div>
            <p className="mt-3 text-[14.5px] font-medium leading-relaxed text-ink/75">{featured.teaser}</p>
            <div className="mt-4 text-[12px] font-bold text-ink/50">By Eugine Micah &amp; Lucy Ogunde · Urban News Desk</div>
          </div>
        </Link>
      </div>

      <div className="mx-auto max-w-[1160px] px-6 pb-14 pt-7 sm:px-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-[5px_5px_0_#111] transition-transform duration-150 hover:-translate-y-1">
              <div className="relative h-[180px] w-full border-b-[3px] border-ink bg-concrete">
                <img src={p.img} alt={p.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-magenta">{p.tag} · {p.dateLabel}</div>
                <div className="mt-1.5 font-display text-[18px] uppercase leading-tight">{p.title}</div>
                <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink/65">{p.teaser}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed border-ink/40 bg-gold/20 p-6">
          <div className="min-w-[240px] flex-1">
            <div className="font-display text-lg uppercase">The next story is being written on the road</div>
            <div className="mt-1 text-[13px] text-ink/65">Follow the socials to catch it the moment it drops.</div>
          </div>
          <a href="https://instagram.com/urban_newsgang" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 border-ink bg-magenta px-5 py-3 text-[13px] font-bold text-white">
            @urban_newsgang ↗
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
