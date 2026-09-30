import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { MissingPage } from "@/components/site/missing-page";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main id="main" className="flex-1">
        <MissingPage />
      </main>
      <Footer />
    </div>
  );
}
