// ─── Smoke harness for the single-product extractor ─────────────────────
// Runs a handful of hand-crafted HTML fixtures through the resolver
// helpers and prints (fixture → pageKind + extraction result) so we can
// verify behaviour without depending on a live site.
//
// Run: node --experimental-vm-modules scripts/smoke-single-product.mjs
//      (requires that `npm run build` has been executed at least once;
//       we import the compiled .next/server files would be cleaner but
//       to keep this lightweight we ts-register at runtime via esbuild.)
//
// This harness is intentionally minimal: it exercises resolver-internal
// helpers rather than the HTTP fetcher, so it runs offline.

// Invoked via `npx tsx scripts/smoke-single-product.mjs` — tsx transparently
// handles the .ts imports below. If the script is run with plain `node`
// the imports will fail; that's fine, tsx is the intended runner.
const { detectPageKind } = await import("../src/lib/sourcing/catalog-resolver/detect.ts");
const { extractSingleProductFromHtml } = await import(
  "../src/lib/sourcing/catalog-resolver/extractors/single-product.ts"
);

const FIXTURES = [
  {
    name: "PDP with JSON-LD Product",
    url: "https://shop.example.com/products/camisa-azul",
    html: `
      <!doctype html><html><head>
        <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","name":"Camisa Azul","image":"https://shop.example.com/img/camisa.jpg","offers":{"@type":"Offer","price":"2499.00","priceCurrency":"ARS","availability":"https://schema.org/InStock"},"sku":"CAM-001","brand":{"@type":"Brand","name":"Acme"}}
        </script>
      </head><body><h1>Camisa Azul</h1></body></html>
    `,
  },
  {
    name: "PDP microdata only",
    url: "https://shop.example.com/products/remera-roja",
    html: `
      <!doctype html><html><body>
        <div itemscope itemtype="http://schema.org/Product">
          <span itemprop="name">Remera Roja</span>
          <meta itemprop="image" content="/img/remera.jpg">
          <meta itemprop="sku" content="REM-010">
          <div itemprop="offers" itemscope itemtype="http://schema.org/Offer">
            <meta itemprop="price" content="1800.50">
            <meta itemprop="priceCurrency" content="ARS">
            <link itemprop="availability" href="http://schema.org/InStock">
          </div>
        </div>
      </body></html>
    `,
  },
  {
    name: "PDP heuristic HTML only (no JSON-LD, no microdata)",
    url: "https://shop.example.com/products/pantalon-gris",
    html: `
      <!doctype html><html><head>
        <meta property="og:image" content="https://shop.example.com/img/pantalon.jpg">
        <meta name="description" content="Pantalón gris elegante">
      </head><body>
        <h1>Pantalón Gris</h1>
        <div class="product-price"><span class="price">$3.200,00</span></div>
      </body></html>
    `,
  },
  {
    name: "PDP JS-rendered (empty body)",
    url: "https://shop.example.com/products/zapato",
    html: `
      <!doctype html><html><body>
        <div id="root"></div>
        <script src="/bundle.js"></script>
      </body></html>
    `,
  },
  {
    name: "Category page (catalog)",
    url: "https://shop.example.com/collections/ofertas",
    html: `
      <!doctype html><html><body>
        <h1>Ofertas del día</h1>
        <ul>
          <li><a href="/products/a">A</a></li>
          <li><a href="/products/b">B</a></li>
        </ul>
      </body></html>
    `,
  },
];

for (const fixture of FIXTURES) {
  const pageKind = detectPageKind({
    url: fixture.url,
    contentType: "text/html",
    body: fixture.html,
  });
  const extraction = extractSingleProductFromHtml(fixture.html, fixture.url);
  console.log("────────────────────────────────────");
  console.log("Fixture:", fixture.name);
  console.log("  URL:", fixture.url);
  console.log("  PageKind:", pageKind);
  console.log("  Extraction:", extraction.product
    ? {
        title: extraction.product.title,
        suggestedPrice: extraction.product.suggestedPrice,
        images: extraction.product.imageUrls.slice(0, 2),
        sku: extraction.product.variants[0]?.sku,
        layer: extraction.usedLayer,
      }
    : { failure: extraction.failure });
}
