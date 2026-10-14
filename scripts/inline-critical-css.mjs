import { readFileSync, writeFileSync } from "node:fs";
import Beasties from "beasties";

function stylesheetLoader(hrefs, scripts) {
  return `(function(){var hrefs=${JSON.stringify(hrefs)};var scripts=${JSON.stringify(scripts)};var done=false;function load(){if(done)return;done=true;for(var i=0;i<hrefs.length;i++){var link=document.createElement("link");link.rel="stylesheet";link.href=hrefs[i];document.head.appendChild(link);}for(var j=0;j<scripts.length;j++){var s=document.createElement("script");s.src=scripts[j];s.async=true;document.body.appendChild(s);}}setTimeout(load,1200);})();`;
}
const file = ".next/server/app/index.html";
const beasties = new Beasties({
  path: ".next/static",
  publicPath: "/_next/static",
  preload: "swap",
  pruneSource: false,
  compress: true,
});

let html = await beasties.process(readFileSync(file, "utf8"));
html = html.replace(/<link rel="stylesheet" href="(\/_next\/static\/chunks\/[^"]+\.css)" data-precedence="next">/g, "");

const stylesheets = [...html.matchAll(/<link rel="preload" href="(\/_next\/static\/chunks\/[^"]+\.css)" data-precedence="next" onload="this\.rel='stylesheet'" as="style">/g)].map((match) => match[1]);
html = html.replace(
  /<link rel="preload" href="\/_next\/static\/chunks\/[^"]+\.css" data-precedence="next" onload="this\.rel='stylesheet'" as="style">/g,
  "",
);
html = html.replace(/<link rel="preload" as="script"[^>]*>/g, "");
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g)].map((match) => match[1]);
html = html.replace(/<script[^>]*src="[^"]+"[^>]*>\s*<\/script>/g, "");
if (stylesheets.length || scripts.length) {
  const loader = `<script>${stylesheetLoader(stylesheets, scripts)}</script>${stylesheets
    .map((href) => `<noscript><link rel="stylesheet" href="${href}"></noscript>`)
    .join("")}`;
  html = html.replace("</head>", `${loader}</head>`);
}

writeFileSync(file, html);
console.log(`Inlined critical CSS for the homepage (${html.length} bytes).`);
