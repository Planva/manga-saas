import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/content/blog";
import { getSystemSettings } from "@/utils/system-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getSystemSettings();
  if (!settings.blogEnabled) return {};

  const post = getPostBySlug(slug);
  if (!post) return {};

  const url = `/blog/${post.slug}`;

  const published = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
  const updated = post.updatedAt ? new Date(post.updatedAt).toISOString() : published;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      tags: post.tags,
      publishedTime: published,
      modifiedTime: updated,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const settings = await getSystemSettings();
  if (!settings.blogEnabled) return notFound();

  const post = getPostBySlug(slug);
  if (!post) return notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    keywords: post.tags.join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `/blog/${post.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">Blog</p>
      <h1 className="mt-2 text-4xl font-bold text-foreground">{post.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{new Date(post.publishedAt).toLocaleDateString("en")}</span>
        {post.updatedAt && (
          <span>
            Updated{" "}
            <time dateTime={post.updatedAt}>{new Date(post.updatedAt).toLocaleDateString("en")}</time>
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            #{tag}
          </span>
        ))}
      </div>

      <article className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
        {post.content.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
