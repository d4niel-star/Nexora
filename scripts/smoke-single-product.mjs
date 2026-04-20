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
const { extractSingleProductFromHtml, extractProductsFromHtmlPage } = await import(
  "../src/lib/sourcing/catalog-resolver/extractors/single-product.ts"
);
const { parseSupplierPayload } = await import(
  "../src/lib/sourcing/import-parsers.ts"
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
  {
    name: "PDP JSON-LD with hasVariant + additionalProperty + BreadcrumbList",
    url: "https://shop.example.com/products/zapatilla-running",
    html: `
      <!doctype html><html><head>
        <link rel="canonical" href="https://shop.example.com/products/zapatilla-running" />
        <script type="application/ld+json">
        [
          {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
            {"@type":"ListItem","position":1,"item":{"@id":"https://shop.example.com/","name":"Inicio"}},
            {"@type":"ListItem","position":2,"item":{"@id":"https://shop.example.com/cat/deportes","name":"Deportes"}},
            {"@type":"ListItem","position":3,"item":{"@id":"https://shop.example.com/cat/deportes/running","name":"Running"}}
          ]},
          {"@context":"https://schema.org","@type":"Product","name":"Zapatilla Running Pro",
            "brand":{"@type":"Brand","name":"Acme"},
            "description":"Zapatilla ultraliviana con amortiguación DynaFoam.",
            "image":["https://shop.example.com/img/zap-1.jpg","https://shop.example.com/img/zap-2.jpg","https://shop.example.com/img/zap-3.jpg"],
            "sku":"ZAP-RUN-001",
            "mpn":"ACM-ZRP-001",
            "gtin13":"7791234567890",
            "category":["Deportes","Running"],
            "additionalProperty":[
              {"@type":"PropertyValue","name":"Peso","value":"260g"},
              {"@type":"PropertyValue","name":"Drop","value":"8mm"},
              {"@type":"PropertyValue","name":"Uso","value":"Asfalto"}
            ],
            "hasVariant":[
              {"@type":"Product","sku":"ZAP-RUN-001-38","size":"38","offers":{"@type":"Offer","price":"49999.00","priceCurrency":"ARS","availability":"https://schema.org/InStock","priceSpecification":[{"@type":"ListPrice","price":"69999.00","priceCurrency":"ARS"}]}},
              {"@type":"Product","sku":"ZAP-RUN-001-40","size":"40","offers":{"@type":"Offer","price":"49999.00","priceCurrency":"ARS","availability":"https://schema.org/InStock"}},
              {"@type":"Product","sku":"ZAP-RUN-001-42","size":"42","offers":{"@type":"Offer","price":"49999.00","priceCurrency":"ARS","availability":"https://schema.org/OutOfStock"}}
            ]
          }
        ]
        </script>
      </head><body><h1>Zapatilla Running Pro</h1></body></html>
    `,
  },
  {
    name: "PDP JSON-LD with multiple Offer[] (no hasVariant)",
    url: "https://shop.example.com/products/remera-basic",
    html: `
      <!doctype html><html><head>
        <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","name":"Remera Basic",
          "image":"https://shop.example.com/img/r.jpg",
          "brand":"Acme",
          "offers":[
            {"@type":"Offer","sku":"REM-S","price":"2500","priceCurrency":"ARS","itemOffered":{"size":"S"},"availability":"https://schema.org/InStock"},
            {"@type":"Offer","sku":"REM-M","price":"2500","priceCurrency":"ARS","itemOffered":{"size":"M"},"availability":"https://schema.org/InStock"},
            {"@type":"Offer","sku":"REM-L","price":"2700","priceCurrency":"ARS","itemOffered":{"size":"L"},"availability":"https://schema.org/InStock"}
          ]}
        </script>
      </head><body></body></html>
    `,
  },
  {
    name: "PDP with only __NEXT_DATA__ (embedded-JSON layer)",
    url: "https://shop.example.com/products/auricular-bt",
    html: `
      <!doctype html><html><body>
        <script id="__NEXT_DATA__" type="application/json">
        {"props":{"pageProps":{"product":{
          "id":"AUR-BT-100","name":"Auricular Bluetooth 100",
          "brand":{"name":"Acme"},
          "price":15999,"compareAtPrice":19999,"currency":"ARS",
          "featuredImage":{"src":"https://shop.example.com/img/auricular.jpg"},
          "images":[{"src":"https://shop.example.com/img/auricular.jpg"},{"src":"https://shop.example.com/img/auricular-2.jpg"}],
          "variants":[
            {"id":"v1","title":"Negro","sku":"AUR-BT-100-BK","price":"15999","available":true,"option1":"Negro"},
            {"id":"v2","title":"Blanco","sku":"AUR-BT-100-WH","price":"15999","available":true,"option1":"Blanco"},
            {"id":"v3","title":"Azul","sku":"AUR-BT-100-BL","price":"15999","available":false,"option1":"Azul"}
          ],
          "specifications":[{"name":"Batería","value":"30h"},{"name":"BT","value":"5.3"}]
        }}}}
        </script>
      </body></html>
    `,
  },
  {
    name: "PDP HTML with spec <table> + <del> compareAt + select size",
    url: "https://shop.example.com/products/campera-roble",
    html: `
      <!doctype html><html><head>
        <meta property="og:image" content="https://shop.example.com/img/campera.jpg" />
      </head><body>
        <nav class="breadcrumb"><a>Inicio</a><a>Ropa</a><a>Camperas</a></nav>
        <h1>Campera Roble Impermeable</h1>
        <div class="price"><del>$89.999</del> <span>$59.999</span></div>
        <select name="option[size]">
          <option value="">Elegí un talle</option>
          <option value="s">S</option>
          <option value="m">M</option>
          <option value="l">L</option>
        </select>
        <table class="spec-table">
          <tr><th>Material</th><td>Poliéster laminado</td></tr>
          <tr><th>Impermeable</th><td>10.000 mm</td></tr>
          <tr><th>Peso</th><td>480g</td></tr>
        </table>
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
  if (extraction.product) {
    const p = extraction.product;
    console.log("  Extraction:", {
      title: p.title,
      brand: p.brand,
      price: p.suggestedPrice,
      compareAtPrice: p.compareAtPrice,
      currency: p.currency,
      images: p.imageUrls.length,
      variants: p.variants.length,
      variantTitles: p.variants.slice(0, 6).map((v) => `${v.title}${v.sku ? ` (${v.sku})` : ""}`),
      attributes: p.attributes?.map((a) => `${a.key}=${a.value}`) ?? [],
      breadcrumbs: p.breadcrumbs ?? [],
      identifiers: p.identifiers,
      layers: p.extraction?.extractedFrom ?? [],
      confidence: p.extraction?.confidence,
      missing: p.extraction?.missingCriticalFields,
    });
  } else {
    console.log("  Extraction:", { failure: extraction.failure });
  }
}

// ─── Unified HTML-page helper ────────────────────────────────────────────
// Confirms that PDP pages discovered via sitemap / html-catalog paths now
// receive the full 5-layer rich treatment, and that multi-Product listing
// pages keep the legacy one-product-per-JSON-LD-node behavior.
console.log("\n════════════════════════════════════");
console.log("extractProductsFromHtmlPage (sitemap/catalog entry point)");
console.log("════════════════════════════════════");

const HTML_PAGE_FIXTURES = [
  {
    name: "Single-PDP with embedded JSON (previously dropped by catalog path)",
    url: "https://shop.example.com/products/auricular-bt",
    // No JSON-LD, only __NEXT_DATA__ — the legacy extractor returned
    // nothing for this; the unified helper must now yield a rich product.
    html: `<!doctype html><html><body>
      <script id="__NEXT_DATA__" type="application/json">
      {"props":{"pageProps":{"product":{
        "id":"AUR-BT-100","name":"Auricular Bluetooth 100",
        "brand":{"name":"Acme"},"price":15999,"compareAtPrice":19999,"currency":"ARS",
        "featuredImage":{"src":"https://shop.example.com/img/a.jpg"},
        "variants":[
          {"id":"v1","title":"Negro","sku":"AUR-BT-100-BK","price":"15999","available":true,"option1":"Negro"},
          {"id":"v2","title":"Blanco","sku":"AUR-BT-100-WH","price":"15999","available":false,"option1":"Blanco"}
        ]
      }}}}
      </script>
    </body></html>`,
  },
  {
    name: "Multi-product listing page (legacy behavior preserved)",
    url: "https://shop.example.com/collections/ofertas",
    html: `<!doctype html><html><head>
      <script type="application/ld+json">
      [
        {"@context":"https://schema.org","@type":"Product","name":"A","sku":"A-1","image":"https://shop.example.com/a.jpg","offers":{"@type":"Offer","price":"100","priceCurrency":"ARS"}},
        {"@context":"https://schema.org","@type":"Product","name":"B","sku":"B-1","image":"https://shop.example.com/b.jpg","offers":{"@type":"Offer","price":"200","priceCurrency":"ARS"}}
      ]
      </script>
    </head><body></body></html>`,
  },
  {
    name: "HTML-only PDP (previously dropped by catalog path)",
    url: "https://shop.example.com/products/campera-roble",
    // No JSON-LD, no embedded JSON — the legacy extractor returned nothing.
    // The unified helper should yield a rich product via heuristic +
    // microdata + OpenGraph merge.
    html: `<!doctype html><html><head>
      <meta property="og:type" content="product" />
      <meta property="og:title" content="Campera Roble Impermeable" />
      <meta property="og:image" content="https://shop.example.com/img/campera.jpg" />
    </head><body>
      <h1>Campera Roble Impermeable</h1>
      <div class="price"><del>$89.999</del> <span>$59.999</span></div>
      <select name="option[size]">
        <option value="s">S</option>
        <option value="m">M</option>
        <option value="l">L</option>
      </select>
      <table class="spec-table">
        <tr><th>Material</th><td>Poliéster laminado</td></tr>
      </table>
    </body></html>`,
  },
];

for (const fixture of HTML_PAGE_FIXTURES) {
  const products = extractProductsFromHtmlPage(fixture.html, fixture.url);
  console.log("────────────────────────────────────");
  console.log("Fixture:", fixture.name);
  console.log("  URL:", fixture.url);
  console.log("  Products:", products.length);
  for (const [i, p] of products.entries()) {
    console.log(`  [${i}]`, {
      title: p.title,
      price: p.suggestedPrice,
      compareAtPrice: p.compareAtPrice,
      brand: p.brand,
      variants: p.variants.length,
      attrs: p.attributes?.length ?? 0,
      layers: p.extraction?.extractedFrom ?? [],
      confidence: p.extraction?.confidence,
    });
  }
}

// ─── Feed enrichment smoke ───────────────────────────────────────────────
// Confirms that feeds now preserve compareAtPrice, brand, gtin, mpn,
// currency and availability when the payload provides them. Previously
// these fields were silently dropped by HEADER_ALIASES / objectToRecord.
console.log("\n════════════════════════════════════");
console.log("parseSupplierPayload (feed enrichment)");
console.log("════════════════════════════════════");

const FEED_FIXTURES = [
  {
    name: "CSV with compareAtPrice + brand + gtin",
    contentType: "text/csv",
    body:
      "externalId,title,cost,stock,price,compareAtPrice,brand,gtin,currency,availability\n" +
      "SKU-1,Remera Basic,4200,10,8900,12900,Acme,7791234567890,ARS,in_stock\n" +
      "SKU-2,Remera Oversize,5100,0,11900,,Acme,,ARS,out_of_stock\n",
  },
  {
    name: "JSON feed with rich keys",
    contentType: "application/json",
    body: JSON.stringify({
      products: [
        {
          sku: "SKU-J1",
          title: "Zapatilla",
          cost: 30000,
          stock: 4,
          price: 49999,
          compareAtPrice: 69999,
          currency: "ARS",
          brand: "Acme",
          gtin: "7791234567891",
          availability: "InStock",
        },
      ],
    }),
  },
  {
    name: "XML feed with Google Merchant namespaced tags",
    contentType: "application/xml",
    body: `<?xml version="1.0"?><feed>
      <item>
        <sku>SKU-X1</sku><title>Campera</title><cost>20000</cost><stock>2</stock>
        <g:price>35000</g:price><g:list_price>45000</g:list_price>
        <g:brand>Acme</g:brand><g:gtin>7791234567892</g:gtin>
        <g:availability>in stock</g:availability>
      </item>
    </feed>`,
  },
];

for (const fixture of FEED_FIXTURES) {
  const preview = parseSupplierPayload(fixture.body, { contentType: fixture.contentType });
  console.log("────────────────────────────────────");
  console.log("Fixture:", fixture.name);
  console.log("  Rows:", preview.totalRows, "valid:", preview.validRows);
  for (const [i, p] of preview.products.entries()) {
    console.log(`  [${i}]`, {
      title: p.title,
      price: p.suggestedPrice,
      compareAtPrice: p.compareAtPrice,
      currency: p.currency,
      brand: p.brand,
      identifiers: p.identifiers,
      availability: p.availability,
    });
  }
  if (preview.errors.length > 0) console.log("  Errors:", preview.errors);
}
