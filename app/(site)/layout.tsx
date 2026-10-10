import { Footer } from "@/components/site/footer";
import { GoogleTag } from "@/components/site/google-tag";
import { Header } from "@/components/site/header";
import { StickyContact } from "@/components/site/sticky-contact";
import { StructuredData } from "@/components/site/structured-data";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col">
      <StructuredData />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <StickyContact />
      <GoogleTag />
    </div>
  );
}
