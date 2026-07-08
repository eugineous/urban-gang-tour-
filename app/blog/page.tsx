import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/content/blog";
import { BlogNav, BlogFooter } from "./_shared";

const title = "Stories from the Road";
const description =
  "Recaps, milestones, and behind-the-scenes stories from every Urban Gang Tour stop across Kenya - the countrywide youth festival experience.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: { title, description, url: "/blog", type: "website" },
};

export default function BlogListPage() {
  const [featured, ...rest] = BLOG_POSTS;

  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Urban Gang Tour Newsroom",
    url: "https://urbangangtour.co.ke/blog",
    publisher: { "@type": "Organization", name: "Urban Gang Tour", logo: "https://urbangangtour.co.ke/assets/brand/logo_transparent.png" },
    blogPost: BLOG_POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      datePublished: p.date,
      url: `https://urbangangtour.co.ke/blog/${p.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-[#150E13] font-[family-name:var(--font-sans)] text-[#FFF7FC]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }} />
      <BlogNav />

      <div
        className="px-6 pb-5 pt-16 text-center sm:px-[clamp(24px,5vw,70px)]"
        style={{ background: "radial-gradient(900px 500px at 50% -20%, rgba(199,35,142,0.42), transparent 65%)" }}
      >
        <div className="inline-flex -rotate-1 rounded-full bg-[#150E13] px-[18px] py-[9px] shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
          <span className="mr-1.5 font-[family-name:var(--font-display)] text-xs uppercase tracking-wide text-[#F5A623]">From the</span>
          <span className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wide text-white">Road</span>
        </div>
        <div className="mt-2.5 -rotate-1 font-[family-name:var(--font-marker)] text-xl text-[#F5A623]">stories from the road</div>
        <h1 className="mt-2.5 font-[family-name:var(--font-display)] text-[clamp(44px,5.6vw,80px)] uppercase leading-none">
          The <span className="text-[#C7238E]">blog</span>
        </h1>
        <p className="mx-auto mt-3.5 max-w-[560px] text-[15.5px] leading-relaxed text-white/70">
          Every stop has a story. We write them down so the country can keep up.
        </p>
      </div>

      <div className="mx-auto max-w-[1280px] px-6 pb-2.5 pt-10 sm:px-[clamp(24px,5vw,70px)]">
        <Link
          href={`/blog/${featured.slug}`}
          className="grid grid-cols-1 overflow-hidden rounded-[26px] border border-[#C7238E]/40 bg-[#1B0F18] transition hover:border-[#C7238E] hover:-translate-y-1 sm:grid-cols-2"
        >
          <div className="relative min-h-[320px] sm:min-h-[380px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={featured.img} alt={featured.title} className="absolute inset-0 h-full w-full bg-[#1B1118] object-cover" />
            <div className="absolute left-[18px] top-[18px] -rotate-2 rounded-full bg-[#F5A623] px-4 py-[7px] font-[family-name:var(--font-display)] text-[13px] uppercase tracking-wide text-[#2E1C00]">
              ★ Latest story
            </div>
          </div>
          <div className="p-8 sm:p-11">
            <div className="text-[13px] font-bold tracking-wide text-white/55">
              {featured.dateLabel} · {featured.tag}
            </div>
            <div className="mt-3 font-[family-name:var(--font-display)] text-[clamp(28px,3vw,42px)] uppercase leading-tight">
              {featured.title}
            </div>
            <p className="mt-3.5 text-[15px] leading-relaxed text-white/70">{featured.teaser}</p>
            <div className="mt-5 inline-flex items-center gap-2 text-[14.5px] font-bold text-[#F5A623]">Read the story →</div>
          </div>
        </Link>
      </div>

      <div className="mx-auto max-w-[1280px] px-6 pb-[60px] pt-7 sm:px-[clamp(24px,5vw,70px)]">
        <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] transition hover:border-[#C7238E] hover:-translate-y-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt={p.title} loading="lazy" className="h-[200px] w-full bg-[#1B1118] object-cover" />
              <div className="p-[22px] pb-6">
                <div className="text-[12.5px] font-bold tracking-wide text-white/55">
                  {p.dateLabel} · {p.tag}
                </div>
                <div className="mt-2 font-[family-name:var(--font-display)] text-[21px] uppercase leading-tight">{p.title}</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">{p.teaser}</p>
                <div className="mt-3.5 text-[13px] font-bold text-[#F5A623]">Read →</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="relative mt-7 flex flex-wrap items-center gap-5 rounded-[20px] border-2 border-dashed border-[#F5A623]/55 bg-[#F5A623]/5 p-7">
          <div className="min-w-[240px] flex-1">
            <div className="font-[family-name:var(--font-display)] text-xl uppercase">
              The next story is being written on the road
            </div>
            <div className="mt-1 text-[13.5px] text-white/65">
              Follow the socials to catch it the moment it drops.
            </div>
          </div>
          <a
            href="https://instagram.com/urban_newsgang"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#C7238E] px-[22px] py-3 text-[13.5px] font-bold text-white transition hover:bg-[#E12FA3]"
          >
            @urban_newsgang ↗
          </a>
        </div>
      </div>

      <BlogFooter />
    </div>
  );
}
