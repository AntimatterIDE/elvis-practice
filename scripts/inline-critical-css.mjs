import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Beasties from "beasties";

function stylesheetLoader(hrefs, scripts) {
  return `(function(){var hrefs=${JSON.stringify(hrefs)};var scripts=${JSON.stringify(scripts)};var done=false;function load(){if(done)return;done=true;for(var i=0;i<hrefs.length;i++){var link=document.createElement("link");link.rel="stylesheet";link.href=hrefs[i];document.head.appendChild(link);}for(var j=0;j<scripts.length;j++){var s=document.createElement("script");s.src=scripts[j];s.async=true;document.body.appendChild(s);}}setTimeout(load,1200);})();`;
}

function walk(directory, found = []) {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "cache") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, found);
    else if (entry.isFile() && (entry.name.endsWith(".html") || entry.name.endsWith(".body"))) found.push(path);
  }
  return found;
}

function transform(html) {
  const beasties = new Beasties({
    path: ".next/static",
    publicPath: "/_next/static",
    preload: "swap",
    pruneSource: false,
    compress: true,
  });
  return beasties.process(html).then((inlined) => {
    let next = inlined;
    const stylesheets = [
      ...new Set(
        [
          ...next.matchAll(
            /<link rel="preload" href="(\/_next\/static\/chunks\/[^"]+\.css)" data-precedence="next" onload="this\.rel='stylesheet'" as="style">/g,
          ),
          ...next.matchAll(/<link rel="stylesheet" href="(\/_next\/static\/chunks\/[^"]+\.css)"[^>]*>/g),
        ].map((match) => match[1]),
      ),
    ];
    next = next.replace(
      /<link rel="preload" href="\/_next\/static\/chunks\/[^"]+\.css" data-precedence="next" onload="this\.rel='stylesheet'" as="style">/g,
      "",
    );
    next = next.replace(/<link rel="stylesheet" href="\/_next\/static\/chunks\/[^"]+\.css"[^>]*>/g, "");
    next = next.replace(/<link rel="preload" as="script"[^>]*>/g, "");
    const scripts = [...next.matchAll(/<script[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g)].map((match) => match[1]);
    next = next.replace(/<script[^>]*src="[^"]+"[^>]*>\s*<\/script>/g, "");
    if (stylesheets.length || scripts.length) {
      const loader = `<script>${stylesheetLoader(stylesheets, scripts)}</script>${stylesheets
        .map((href) => `<noscript><link rel="stylesheet" href="${href}"></noscript>`)
        .join("")}`;
      next = next.replace("</head>", `${loader}</head>`);
    }
    return next;
  });
}

const seen = new Set();
const homepageFiles = [".next", ".vercel/output"].flatMap((root) => walk(root)).filter((file) => {
  const info = statSync(file);
  if (!info.isFile() || info.size > 5_000_000 || seen.has(info.ino)) return false;
  const html = readFileSync(file, "utf8");
  if (!html.includes("home-hero-art") || !html.includes('rel="stylesheet"') || html.includes("setTimeout(load,1200)")) return false;
  seen.add(info.ino);
  return true;
});

if (homepageFiles.length === 0) {
  console.error("Could not find the prerendered homepage HTML to inline critical CSS.");
  process.exit(1);
}

for (const file of homepageFiles) {
  const html = await transform(readFileSync(file, "utf8"));
  writeFileSync(file, html);
  console.log(`Inlined critical CSS for ${file} (${html.length} bytes).`);
}
