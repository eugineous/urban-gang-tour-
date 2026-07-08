import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, findBlogPost } from "@/content/blog";
import { BlogNav, BlogFooter } from "../_shared";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findBlogPost(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.teaser,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.teaser,
      url,
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.img, width: 1200, height: 630, alt: post.title }],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findBlogPost(slug);
  if (!post) notFound();

  const idx = BLOG_POSTS.findIndex((p) => p.slug === slug);
  const nextPost = BLOG_POSTS[(idx + 1) % BLOG_POSTS.length];

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.teaser,
    image: [`https://urbangangtour.co.ke${post.img}`],
    datePublished: post.date,
    dateModified: post.date,
    author: [{ "@type": "Organization", name: "Urban Gang Tour", url: "https://urbangangtour.co.ke" }],
    publisher: {
      "@type": "Organization",
      name: "Urban Gang Tour",
      logo: { "@type": "ImageObject", url: "https://urbangangtour.co.ke/assets/brand/logo_transparent.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://urbangangtour.co.ke/blog/${post.slug}` },
    articleSection: post.tag,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://urbangangtour.co.ke/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://urbangangtour.co.ke/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://urbangangtour.co.ke/blog/${post.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-[#150E13] font-[family-name:var(--font-sans)] text-[#FFF7FC]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <BlogNav />

      <article className="mx-auto max-w-[880px] px-6 pb-[60px] pt-12 sm:px-[clamp(24px,5vw,70px)]">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5A623] transition hover:-translate-x-1">
          ← All stories
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-[#C7238E] px-3.5 py-1.5 font-[family-name:var(--font-display)] text-xs uppercase tracking-wide text-white">
            {post.tag}
          </div>
          <time dateTime={post.date} className="text-[13.5px] font-semibold text-white/55">
            {post.dateLabel} · by the Urban Gang Tour desk
          </time>
        </div>

        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(36px,4.6vw,58px)] uppercase leading-[1.05]">
          {post.title}
        </h1>

        <div className="relative mt-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.img} alt={post.title} className="block max-h-[460px] w-full rounded-[18px] bg-[#1B1118] object-cover" />
        </div>

        {post.paras.map((p, i) => (
          <p key={i} className="mt-[22px] text-[16.5px] leading-[1.85] text-white/85">
            {p}
          </p>
        ))}

        <blockquote className="mt-[30px] rounded-r-2xl border-l-[5px] border-[#F5A623] bg-[#F5A623]/[0.07] px-[26px] py-[22px] font-[family-name:var(--font-marker)] text-xl leading-normal text-[#FFE9C7]">
          {post.quote}
        </blockquote>

        <div className="mt-[30px] grid grid-cols-3 gap-3">
          {post.strip.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={s} alt="" className="h-[180px] w-full rounded-xl bg-[#1B1118] object-cover" />
          ))}
        </div>

        <div className="mt-[34px] flex flex-wrap gap-3">
          <Link
            href="/gallery"
            className="rounded-full border border-white/20 bg-white/[0.06] px-5 py-3 text-[13.5px] font-bold text-white transition hover:border-[#C7238E]"
          >
            More in the Gallery
          </Link>
          <Link
            href="/book"
            className="rounded-full bg-[#C7238E] px-5 py-3 text-[13.5px] font-bold text-white transition hover:bg-[#E12FA3]"
          >
            Bring the tour to your institution →
          </Link>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <div className="text-xs font-bold uppercase tracking-wide text-white/45">Next story</div>
          <Link href={`/blog/${nextPost.slug}`} className="mt-2 block font-[family-name:var(--font-display)] text-2xl uppercase leading-tight transition hover:text-[#F5A623]">
            {nextPost.title} →
          </Link>
        </div>
      </article>

      <BlogFooter />
    </div>
  );
}
