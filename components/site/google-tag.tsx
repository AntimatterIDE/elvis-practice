import Script from "next/script";
import { googleMeasurementId } from "@/lib/ads/config";

export function GoogleTag() {
  const measurementId = googleMeasurementId();
  if (!measurementId || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="lazyOnload" />
      <Script id="google-tag" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');`}
      </Script>
    </>
  );
}
