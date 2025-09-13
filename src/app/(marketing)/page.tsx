import { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { FAQ } from "@/components/landing/faq";
import { SITE_NAME, SITE_DESCRIPTION } from "@/constants";
import CreditTestButton from "@/components/credit-test-button";
export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

export default function Home() {
  return (
    <main>
      <div className="mt-4">
        <CreditTestButton />
      </div>
      <Hero />
      <Features />
      <FAQ />
    </main>
  );
}
