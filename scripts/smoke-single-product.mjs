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
