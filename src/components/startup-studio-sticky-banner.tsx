import { Button } from "./ui/button";
import AgenticDevStudioLogo from "./agenticdev-studio-logo";
import { ChevronLeft, X } from "lucide-react";
import { AgenticDevStudioStickyBannerClient } from "./startup-studio-sticky-banner.client";

const STORAGE_KEY = "agenticdev-studio-banner-collapsed";

export function AgenticDevStudioStickyBanner() {
  return (
    <>
      <div
        data-agenticdev-sticky
        data-ready="false"
        data-collapsed="false"
        className="group fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-[100] print:hidden transition-opacity duration-200 data-[ready=false]:opacity-0 data-[collapsed=true]:left-auto data-[collapsed=true]:right-4 data-[collapsed=true]:translate-x-0 pointer-events-none"
      >
        <div className="relative flex items-center w-[90vw] md:max-w-[420px]">
          <Button
            variant="outline"
            size="icon"
            data-expand-btn
            className="absolute top-1/2 -translate-y-1/2 right-[-0.85rem] md:right-[-1.15rem] h-9 w-9 rounded-full shadow-lg bg-background hover:bg-background border-2 hover:border-border opacity-0 pointer-events-none group-data-[collapsed=true]:opacity-100 group-data-[collapsed=true]:pointer-events-auto z-[2]"
            aria-label="Expand AgenticDev banner"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="bg-gray-100 dark:bg-background rounded-lg shadow-xl border-2 relative transition-transform duration-300 ease-in-out group-data-[collapsed=true]:translate-x-[calc(100%+3rem)] pointer-events-auto" data-container>
            <Button
              size="icon"
              data-collapse-btn
              className="h-6 w-6 absolute -top-3 -right-3 rounded-full shadow-md border border-border"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center flex-col py-3 px-3">
              <a
                href="https://agenticdev.agency?ref=saas-template-sticky-banner"
                target="_blank"
                className="flex flex-col items-center font-medium text-sm hover:text-foreground transition-colors"
              >
                <div className="flex items-center">
                  <span className="whitespace-nowrap">Built by</span>
                  <AgenticDevStudioLogo className="h-7 w-7 mx-1.5" />
                  <span className="whitespace-nowrap">AgenticDev</span>
                </div>

                <div className="text-tiny text-muted-foreground mt-3 text-center">
                  Transform operations with AI solutions that adapt to your actual needs—automating routine tasks or solving complex challenges through customized systems. Focus on growth while we handle the tech specifics that matter most to your business.
                </div>
              </a>
              <Button size="sm" className="mt-4" asChild>
                <a href="https://agenticdev.agency?ref=saas-template-sticky-banner" target="_blank">Book a free consultation</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <AgenticDevStudioStickyBannerClient storageKey={STORAGE_KEY} />
    </>
  );
}
