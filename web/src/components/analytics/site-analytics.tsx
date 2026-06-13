"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const ANALYTICS_EXCLUDED_PATHS = ["/demos-14-06-2026-k7m9q"];

export function SiteAnalytics() {
  const pathname = usePathname();

  if (ANALYTICS_EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-ZT2RLVFSVB" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-ZT2RLVFSVB');
      `}</Script>
      <Script id="yandex-metrika" strategy="afterInteractive">{`
        (function(m,e,t,r,i,k,a){
          m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
        })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=109301966','ym');
        ym(109301966,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
      `}</Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- tracking pixels must remain plain images */}
          <img src="https://mc.yandex.ru/watch/109301966" style={{ position: "absolute", left: "-9999px" }} alt="" />
        </div>
      </noscript>
    </>
  );
}
