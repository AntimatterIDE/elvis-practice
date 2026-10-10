export async function coverFonts(text: string) {
  const [display, sans] = await Promise.all([
    loadFont("Newsreader", text.slice(0, 180)),
    loadFont("Plus+Jakarta+Sans", "Journal The Alignment Clinic Elvis Francois MD"),
  ]);
  const fonts: { name: string; data: ArrayBuffer; style: "normal"; weight: 500 }[] = [];
  if (display) fonts.push({ name: "Newsreader", data: display, style: "normal", weight: 500 });
  if (sans) fonts.push({ name: "Jakarta", data: sans, style: "normal", weight: 500 });
  return fonts;
}

async function loadFont(family: string, text: string) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });
  if (!css.ok) return null;
  const url = (await css.text()).match(/src: url\((https:[^)]+)\)/)?.[1];
  if (!url) return null;
  const file = await fetch(url);
  if (!file.ok) return null;
  return file.arrayBuffer();
}
