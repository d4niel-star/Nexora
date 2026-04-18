export type SourcingImportSource = "csv" | "feed" | "api";

export interface SupplierVariantInput {
  title: string;
  sku: string | null;
  price: number;
  stock: number;
}

export interface SupplierProductInput {
  externalId: string;
  title: string;
  description: string | null;
  category: string | null;
  cost: number;
  suggestedPrice: number | null;
  stock: number;
  imageUrls: string[];
  variants: SupplierVariantInput[];
  leadTimeMinDays: number | null;
  leadTimeMaxDays: number | null;
  raw: Record<string, string | number | null>;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface SourcingImportPreview {
  sourceFormat: "csv" | "json" | "xml";
  totalRows: number;
  validRows: number;
  products: SupplierProductInput[];
  errors: ImportRowError[];
}

export const SOURCING_CSV_TEMPLATE =
  "externalId,title,description,category,cost,suggestedPrice,stock,imageUrl,variantName,variantSku,variantPrice,variantStock,leadTimeMinDays,leadTimeMaxDays\n" +
  "SUP-001,Remera basica premium,Algodon peinado 24/1,Indumentaria,4200,8900,35,https://proveedor.com/remera.jpg,Negro M,SUP-001-NEG-M,8900,12,2,5\n";

type NormalizedRecordKey =
  | "externalId"
  | "title"
  | "description"
  | "category"
  | "cost"
  | "suggestedPrice"
  | "stock"
  | "imageUrl"
  | "variantName"
  | "variantSku"
  | "variantPrice"
  | "variantStock"
  | "leadTimeMinDays"
  | "leadTimeMaxDays";

type NormalizedRecord = Partial<Record<NormalizedRecordKey, string>>;

const HEADER_ALIASES: Record<string, NormalizedRecordKey> = {
  id: "externalId",
  externalid: "externalId",
  external_id: "externalId",
  sku: "externalId",
  productid: "externalId",
  providerid: "externalId",
  title: "title",
  name: "title",
  nombre: "title",
  productname: "title",
  description: "description",
  descripcion: "description",
  category: "category",
  categoria: "category",
  cost: "cost",
  costo: "cost",
  unitcost: "cost",
  pricecost: "cost",
  suggestedprice: "suggestedPrice",
  suggested_price: "suggestedPrice",
  price: "suggestedPrice",
  precio: "suggestedPrice",
  stock: "stock",
  inventory: "stock",
  inventario: "stock",
  quantity: "stock",
  image: "imageUrl",
  imageurl: "imageUrl",
  image_url: "imageUrl",
  images: "imageUrl",
  imagen: "imageUrl",
  variant: "variantName",
  variantname: "variantName",
  variant_name: "variantName",
  varianttitle: "variantName",
  variantsku: "variantSku",
  variant_sku: "variantSku",
  variantprice: "variantPrice",
  variant_price: "variantPrice",
  variantstock: "variantStock",
  variant_stock: "variantStock",
  leadtimemin: "leadTimeMinDays",
  leadtimemindays: "leadTimeMinDays",
  lead_time_min_days: "leadTimeMinDays",
  leadtimemax: "leadTimeMaxDays",
  leadtimemaxdays: "leadTimeMaxDays",
  lead_time_max_days: "leadTimeMaxDays",
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseNumber(value: string | undefined): number | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const decimal = normalized.includes(",") && !normalized.includes(".")
    ? normalized.replace(",", ".")
    : normalized.replace(/,/g, "");
  const parsed = Number(decimal);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | undefined): number | null {
  const parsed = parseNumber(value);
  if (parsed === null || !Number.isInteger(parsed)) return null;
  return parsed;
}

function splitImages(value: string | undefined): string[] {
  return normalizeText(value)
    .split("|")
    .map((url) => url.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseCsvTable(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);

  return rows;
}

function normalizeRecordFromHeaders(headers: string[], row: string[]): NormalizedRecord {
  return headers.reduce<NormalizedRecord>((acc, header, index) => {
    const mapped = HEADER_ALIASES[normalizeHeader(header)];
    if (mapped) acc[mapped] = normalizeText(row[index]);
    return acc;
  }, {});
}

function validateAndCollectProduct(
  productsByExternalId: Map<string, SupplierProductInput>,
  record: NormalizedRecord,
  rowNumber: number,
  errors: ImportRowError[],
): boolean {
  const externalId = normalizeText(record.externalId);
  const title = normalizeText(record.title);
  const cost = parseNumber(record.cost);
  const suggestedPrice = parseNumber(record.suggestedPrice);
  const stock = parseInteger(record.stock);
  const variantPrice = parseNumber(record.variantPrice);
  const variantStock = parseInteger(record.variantStock);
  const leadTimeMinDays = parseInteger(record.leadTimeMinDays);
  const leadTimeMaxDays = parseInteger(record.leadTimeMaxDays);
  const imageUrls = splitImages(record.imageUrl);
  let hasError = false;

  const addError = (field: string, message: string, value?: string) => {
    errors.push({ row: rowNumber, field, message, value });
    hasError = true;
  };

  if (!externalId) addError("externalId", "El campo externalId es obligatorio.");
  if (!title) addError("title", "El campo title es obligatorio.");
  if (cost === null || cost < 0) addError("cost", "El costo debe ser un numero igual o mayor a 0.", record.cost);
  if (stock === null || stock < 0) addError("stock", "El stock debe ser un entero igual o mayor a 0.", record.stock);
  if (suggestedPrice !== null && suggestedPrice <= 0) {
    addError("suggestedPrice", "El precio sugerido debe ser mayor a 0.", record.suggestedPrice);
  }
  if (variantPrice !== null && variantPrice <= 0) {
    addError("variantPrice", "El precio de variante debe ser mayor a 0.", record.variantPrice);
  }
  if (variantStock !== null && variantStock < 0) {
    addError("variantStock", "El stock de variante debe ser un entero igual o mayor a 0.", record.variantStock);
  }
  if (leadTimeMinDays !== null && leadTimeMinDays < 0) {
    addError("leadTimeMinDays", "El lead time minimo debe ser igual o mayor a 0.", record.leadTimeMinDays);
  }
  if (leadTimeMaxDays !== null && leadTimeMaxDays < 0) {
    addError("leadTimeMaxDays", "El lead time maximo debe ser igual o mayor a 0.", record.leadTimeMaxDays);
  }
  if (leadTimeMinDays !== null && leadTimeMaxDays !== null && leadTimeMinDays > leadTimeMaxDays) {
    addError("leadTimeMaxDays", "El lead time maximo no puede ser menor al minimo.", record.leadTimeMaxDays);
  }
  for (const imageUrl of imageUrls) {
    if (!isHttpUrl(imageUrl)) addError("imageUrl", "La imagen debe ser una URL publica http(s).", imageUrl);
  }

  if (hasError || cost === null || stock === null) return false;

  const category = normalizeText(record.category);
  const description = normalizeText(record.description);
  const product = productsByExternalId.get(externalId) ?? {
    externalId,
    title,
    description: description || null,
    category: category ? toTitleCase(category) : null,
    cost,
    suggestedPrice,
    stock,
    imageUrls,
    variants: [],
    leadTimeMinDays,
    leadTimeMaxDays,
    raw: {
      externalId,
      title,
      description: description || null,
      category: category || null,
      cost,
      suggestedPrice,
      stock,
    },
  };

  const variantTitle = normalizeText(record.variantName) || "Default";
  const variantSku = normalizeText(record.variantSku) || externalId;
  const nextVariant: SupplierVariantInput = {
    title: variantTitle,
    sku: variantSku,
    price: variantPrice ?? suggestedPrice ?? cost,
    stock: variantStock ?? stock,
  };

  const duplicateVariant = product.variants.some((variant) => variant.sku === nextVariant.sku);
  if (duplicateVariant) {
    errors.push({
      row: rowNumber,
      field: "variantSku",
      message: "La variante ya existe para ese externalId.",
      value: nextVariant.sku ?? undefined,
    });
    return false;
  }

  product.variants.push(nextVariant);
  if (product.imageUrls.length === 0 && imageUrls.length > 0) product.imageUrls = imageUrls;
  productsByExternalId.set(externalId, product);
  return true;
}

function buildPreview(
  records: Array<{ rowNumber: number; record: NormalizedRecord }>,
  sourceFormat: "csv" | "json" | "xml",
): SourcingImportPreview {
  const errors: ImportRowError[] = [];
  const productsByExternalId = new Map<string, SupplierProductInput>();
  let validRows = 0;

  for (const item of records) {
    if (validateAndCollectProduct(productsByExternalId, item.record, item.rowNumber, errors)) {
      validRows += 1;
    }
  }

  return {
    sourceFormat,
    totalRows: records.length,
    validRows,
    products: Array.from(productsByExternalId.values()),
    errors,
  };
}

export function parseSourcingCsv(csvText: string): SourcingImportPreview {
  const table = parseCsvTable(csvText);
  if (table.length === 0) {
    return {
      sourceFormat: "csv",
      totalRows: 0,
      validRows: 0,
      products: [],
      errors: [{ row: 1, field: "file", message: "El CSV esta vacio." }],
    };
  }

  const [headers, ...rows] = table;
  const mappedHeaders = headers
    .map((header) => HEADER_ALIASES[normalizeHeader(header)])
    .filter((header): header is NormalizedRecordKey => Boolean(header));
  const requiredHeaders: NormalizedRecordKey[] = ["externalId", "title", "cost", "stock"];
  const missingHeaders = requiredHeaders.filter((header) => !mappedHeaders.includes(header));

  if (missingHeaders.length > 0) {
    return {
      sourceFormat: "csv",
      totalRows: rows.length,
      validRows: 0,
      products: [],
      errors: missingHeaders.map((header) => ({
        row: 1,
        field: header,
        message: `Falta la columna obligatoria ${header}.`,
      })),
    };
  }

  return buildPreview(
    rows.map((row, index) => ({
      rowNumber: index + 2,
      record: normalizeRecordFromHeaders(headers, row),
    })),
    "csv",
  );
}

function valueFromObject(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return "";
}

function objectToRecord(source: Record<string, unknown>): NormalizedRecord {
  const rawImages = source.images ?? source.imageUrls;
  const imageUrl = Array.isArray(rawImages)
    ? rawImages.filter((item): item is string => typeof item === "string").join("|")
    : valueFromObject(source, ["imageUrl", "image_url", "image", "featuredImage", "imagen"]);

  return {
    externalId: valueFromObject(source, ["externalId", "external_id", "sku", "id", "productId"]),
    title: valueFromObject(source, ["title", "name", "nombre", "productName"]),
    description: valueFromObject(source, ["description", "descripcion"]),
    category: valueFromObject(source, ["category", "categoria"]),
    cost: valueFromObject(source, ["cost", "costo", "unitCost", "priceCost"]),
    suggestedPrice: valueFromObject(source, ["suggestedPrice", "suggested_price", "price", "precio"]),
    stock: valueFromObject(source, ["stock", "inventory", "inventario", "quantity"]),
    imageUrl,
    variantName: valueFromObject(source, ["variantName", "variant", "variantTitle"]),
    variantSku: valueFromObject(source, ["variantSku", "variant_sku"]),
    variantPrice: valueFromObject(source, ["variantPrice", "variant_price"]),
    variantStock: valueFromObject(source, ["variantStock", "variant_stock"]),
    leadTimeMinDays: valueFromObject(source, ["leadTimeMinDays", "lead_time_min_days"]),
    leadTimeMaxDays: valueFromObject(source, ["leadTimeMaxDays", "lead_time_max_days"]),
  };
}

function findProductArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const objectPayload = payload as Record<string, unknown>;
  for (const key of ["products", "items", "data", "results"]) {
    const value = objectPayload[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function parseJsonProducts(jsonText: string): SourcingImportPreview {
  try {
    const payload = JSON.parse(jsonText) as unknown;
    const items = findProductArray(payload);
    if (items.length === 0) {
      return {
        sourceFormat: "json",
        totalRows: 0,
        validRows: 0,
        products: [],
        errors: [{ row: 1, field: "json", message: "No se encontro un array de products, items, data o results." }],
      };
    }

    return buildPreview(
      items.map((item, index) => ({
        rowNumber: index + 1,
        record: objectToRecord(item && typeof item === "object" ? (item as Record<string, unknown>) : {}),
      })),
      "json",
    );
  } catch {
    return {
      sourceFormat: "json",
      totalRows: 0,
      validRows: 0,
      products: [],
      errors: [{ row: 1, field: "json", message: "El JSON no es parseable." }],
    };
  }
}

function tagValue(xml: string, tags: string[]): string {
  for (const tag of tags) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match?.[1]) return match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  }
  return "";
}

function parseXmlProducts(xmlText: string): SourcingImportPreview {
  const records: Array<{ rowNumber: number; record: NormalizedRecord }> = [];
  const itemRegex = /<(product|item)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let rowNumber = 1;

  while ((match = itemRegex.exec(xmlText))) {
    const itemXml = match[2];
    records.push({
      rowNumber,
      record: {
        externalId: tagValue(itemXml, ["externalId", "external_id", "sku", "id"]),
        title: tagValue(itemXml, ["title", "name", "nombre"]),
        description: tagValue(itemXml, ["description", "descripcion"]),
        category: tagValue(itemXml, ["category", "categoria"]),
        cost: tagValue(itemXml, ["cost", "costo", "unitCost"]),
        suggestedPrice: tagValue(itemXml, ["suggestedPrice", "price", "precio"]),
        stock: tagValue(itemXml, ["stock", "inventory", "inventario"]),
        imageUrl: tagValue(itemXml, ["imageUrl", "image", "imagen"]),
        variantName: tagValue(itemXml, ["variantName", "variant", "variantTitle"]),
        variantSku: tagValue(itemXml, ["variantSku", "variant_sku"]),
        variantPrice: tagValue(itemXml, ["variantPrice", "variant_price"]),
        variantStock: tagValue(itemXml, ["variantStock", "variant_stock"]),
        leadTimeMinDays: tagValue(itemXml, ["leadTimeMinDays", "lead_time_min_days"]),
        leadTimeMaxDays: tagValue(itemXml, ["leadTimeMaxDays", "lead_time_max_days"]),
      },
    });
    rowNumber += 1;
  }

  if (records.length === 0) {
    return {
      sourceFormat: "xml",
      totalRows: 0,
      validRows: 0,
      products: [],
      errors: [{ row: 1, field: "xml", message: "No se encontraron nodos <product> o <item>." }],
    };
  }

  return buildPreview(records, "xml");
}

export function parseSupplierPayload(
  payload: string,
  hints?: { sourceType?: SourcingImportSource; contentType?: string; url?: string },
): SourcingImportPreview {
  const trimmed = payload.trim();
  const contentType = hints?.contentType?.toLowerCase() ?? "";
  const url = hints?.url?.toLowerCase() ?? "";

  if (!trimmed) {
    return {
      sourceFormat: "csv",
      totalRows: 0,
      validRows: 0,
      products: [],
      errors: [{ row: 1, field: "payload", message: "La fuente no devolvio datos." }],
    };
  }

  if (contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonProducts(trimmed);
  }

  if (contentType.includes("xml") || trimmed.startsWith("<")) {
    return parseXmlProducts(trimmed);
  }

  if (contentType.includes("csv") || url.endsWith(".csv") || hints?.sourceType === "csv") {
    return parseSourcingCsv(trimmed);
  }

  return parseSourcingCsv(trimmed);
}

export async function fetchSupplierProducts(input: {
  sourceType: "feed" | "api";
  url: string;
  apiKey?: string;
}): Promise<SourcingImportPreview> {
  if (!isHttpUrl(input.url)) {
    throw new Error("La URL debe ser publica y usar http o https.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(input.url, {
      cache: "no-store",
      signal: controller.signal,
      headers: input.sourceType === "api" && input.apiKey
        ? {
            Authorization: `Bearer ${input.apiKey}`,
            "x-api-key": input.apiKey,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new Error(`El proveedor respondio HTTP ${response.status}.`);
    }

    const payload = await response.text();
    return parseSupplierPayload(payload, {
      sourceType: input.sourceType,
      contentType: response.headers.get("content-type") ?? "",
      url: input.url,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("La fuente tardo demasiado en responder.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
