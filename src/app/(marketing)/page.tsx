import { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { FAQ } from "@/components/landing/faq";
import { SITE_NAME, SITE_DESCRIPTION } from "@/constants";
import CreditTestButton from "@/components/credit-test-button";
import TestPopupPaymentButton from "@/components/test-popup-payment-button";
import GoogleOneTapLoginCard from "@/components/google-one-tap-login-card";
export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

export default function Home() {
  return (
    <main>
      <GoogleOneTapLoginCard />
      <div className="mt-4 px-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <CreditTestButton />
          <TestPopupPaymentButton />
        </div>
      </div>
      <Hero />
      <Features />
      <FAQ />
    </main>
  );
}
