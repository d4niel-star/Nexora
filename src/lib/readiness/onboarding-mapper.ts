import { ReadinessItem, StoreReadiness } from "./store-readiness";

export type OnboardingStepStatus =
  | "complete"
  | "blocked"
  | "in_progress"
  | "recommended"
  | "optional";

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  priority: number;
  progress: number;
  blockingCount: number;
  recommendedCount: number;
  items: ReadinessItem[];
  primaryActionLabel?: string;
  primaryActionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
};

export type NextBestAction = {
  title: string;
  description: string;
  href: string;
  label: string;
  reason: string;
};

export interface MerchantOnboarding {
  overallStatus: StoreReadiness["overallStatus"];
  score: number;
  steps: OnboardingStep[];
  nextAction: NextBestAction | null;
}

const STEP_DEFINITIONS = [
  {
    id: "step_1_account",
    title: "Configurá tu tienda",
    description: "Verificá tu cuenta y definí la identidad pública de tu negocio.",
    categories: ["Cuenta", "Identidad"],
  },
  {
    id: "step_2_catalog",
    title: "Cargá productos",
    description: "Creá los productos que vas a vender con precios válidos y variantes.",
    categories: ["Catálogo"],
  },
  {
    id: "step_3_stock",
    title: "Gestioná el stock",
    description: "Asegurate de que tus productos tengan stock o permitan backorder.",
    categories: ["Stock"],
  },
  {
    id: "step_4_payments",
    title: "Activá pagos",
    description: "Conectá tu cuenta de Mercado Pago para empezar a cobrar.",
    categories: ["Pagos"],
  },
  {
    id: "step_5_delivery",
    title: "Configurá entrega",
    description: "Definí cómo los clientes reciben sus productos (envío o retiro).",
    categories: ["Entrega", "Local físico"],
  },
  {
    id: "step_6_communication",
    title: "Configurá comunicación",
    description: "Establecé canales de contacto y habilitá emails automáticos.",
    categories: ["Comunicación", "Emails"],
  },
  {
    id: "step_7_storefront",
    title: "Publicá / revisá storefront",
    description: "Revisá que la tienda esté accesible y conectá tus pixels.",
    categories: ["Storefront", "Tracking"],
  },
  // We can add an operation step if we had operation items, but for now we map categories.
];

export function buildMerchantOnboarding(readiness: StoreReadiness): MerchantOnboarding {
  const steps: OnboardingStep[] = [];

  for (let i = 0; i < STEP_DEFINITIONS.length; i++) {
    const def = STEP_DEFINITIONS[i];
    
    // Group items for this step
    const items = readiness.items.filter((item) => def.categories.includes(item.category) && item.status !== "not_applicable");
    
    // Calculate metrics
    const blocking = items.filter((item) => item.severity === "blocking");
    const blockingMissing = blocking.filter((item) => item.status === "missing");
    
    const recommended = items.filter((item) => item.severity === "recommended");
    const recommendedMissing = recommended.filter((item) => item.status === "missing" || item.status === "warning");

    const total = items.length;
    const completed = items.filter((item) => item.status === "complete").length;
    
    const progress = total > 0 ? Math.round((completed / total) * 100) : 100;

    // Derive status
    let status: OnboardingStepStatus = "in_progress";
    if (total === 0 || completed === total) {
      status = "complete";
    } else if (blockingMissing.length > 0) {
      status = "blocked";
    } else if (recommendedMissing.length > 0) {
      status = "recommended";
    } else {
      status = "optional";
    }

    // Determine primary action from the first missing blocking or recommended item
    let primaryActionItem = blockingMissing[0] || recommendedMissing[0] || items.find(i => i.status === "missing");

    steps.push({
      id: def.id,
      title: `Paso ${i + 1} — ${def.title}`,
      description: def.description,
      status,
      priority: i + 1,
      progress,
      blockingCount: blockingMissing.length,
      recommendedCount: recommendedMissing.length,
      items,
      primaryActionLabel: primaryActionItem?.actionLabel,
      primaryActionHref: primaryActionItem?.actionHref,
    });
  }

  const nextAction = determineNextBestAction(readiness.items, steps);

  return {
    overallStatus: readiness.overallStatus,
    score: readiness.score,
    steps,
    nextAction,
  };
}

function determineNextBestAction(items: ReadinessItem[], steps: OnboardingStep[]): NextBestAction | null {
  // 1. First look for blocking items by specific category priority:
  // pagos, entrega, catálogo, stock, storefront, contacto.
  const blockingPriority = ["Pagos", "Entrega", "Catálogo", "Stock", "Storefront", "Comunicación", "Cuenta", "Identidad"];
  
  const blockingMissing = items.filter(i => i.severity === "blocking" && i.status === "missing");
  
  for (const cat of blockingPriority) {
    const item = blockingMissing.find(i => i.category === cat);
    if (item) {
      return {
        title: item.label,
        description: getReasonForAction(item),
        href: item.actionHref || "#",
        label: item.actionLabel || "Revisar",
        reason: "blocking",
      };
    }
  }

  // If there's any other blocking item
  if (blockingMissing.length > 0) {
    const item = blockingMissing[0];
    return {
      title: item.label,
      description: getReasonForAction(item),
      href: item.actionHref || "#",
      label: item.actionLabel || "Revisar",
      reason: "blocking",
    };
  }

  // 2. Look for recommended items
  const recommendedMissing = items.filter(i => i.severity === "recommended" && (i.status === "missing" || i.status === "warning"));
  if (recommendedMissing.length > 0) {
    const item = recommendedMissing[0];
    return {
      title: item.label,
      description: getReasonForAction(item),
      href: item.actionHref || "#",
      label: item.actionLabel || "Mejorar",
      reason: "recommended",
    };
  }

  // 3. Look for optional items
  const optionalMissing = items.filter(i => i.severity === "optional" && i.status === "missing");
  if (optionalMissing.length > 0) {
    const item = optionalMissing[0];
    return {
      title: item.label,
      description: getReasonForAction(item),
      href: item.actionHref || "#",
      label: item.actionLabel || "Configurar",
      reason: "optional",
    };
  }

  return null;
}

function getReasonForAction(item: ReadinessItem): string {
  switch (item.id) {
    case "payment_operational": return "Porque tu tienda no puede cobrar todavía.";
    case "delivery_method": return "Porque los clientes necesitan saber cómo recibir sus pedidos.";
    case "catalog_active": return "Necesitás productos para poder vender.";
    case "stock_availability": return "Tus productos activos necesitan stock disponible.";
    case "storefront_accessible": return "La tienda debe estar publicada para recibir clientes.";
    case "comm_contact": return "Es vital ofrecer un canal de contacto confiable.";
    default: return item.description;
  }
}
