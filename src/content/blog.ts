export type BlogPost = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  content: string[];
  tags: string[];
  publishedAt: string;
  updatedAt?: string;
  coverImage?: string;
};

const posts: BlogPost[] = [
  {
    slug: "ai-powered-manga-translation-pipeline",
    title: "Building an AI-Powered Manga Translation Pipeline",
    summary:
      "How we blend OCR, LLMs, and a human-friendly review loop to ship reliable manga translations at scale.",
    description:
      "A behind-the-scenes look at the architecture we use to translate manga: OCR, layout analysis, LLM-based translation choices, and a feedback loop tuned for quality.",
    content: [
      "Shipping high-quality translations is more than calling an API. We designed a pipeline that keeps quality predictable while staying fast enough for production releases.",
      "We start with layout-aware OCR to capture text regions and reading order. That structure is passed into a translation layer that can switch between offline models for speed and LLMs for nuance.",
      "Quality hinges on feedback. We log every segment with model choice, confidence, and reviewer overrides. When a reviewer corrects a line, we treat it as labeled data and feed it back into prompt templates and model routing rules.",
      "Finally, we surface the pipeline as an API plus a dashboard. Editors can batch approve pages, re-run only low-confidence segments, and export clean typeset layers. The result: faster cycles and fewer surprises for readers.",
    ],
    tags: ["AI", "translation", "workflow", "SaaS"],
    publishedAt: "2024-12-12",
    updatedAt: "2025-01-02",
    coverImage: "/og-image.png",
  },
];

export function getAllPosts() {
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
