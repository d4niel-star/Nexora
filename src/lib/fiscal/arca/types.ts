export interface AFIPAuthResponse {
  token: string;
  sign: string;
  expirationTime: string;
}

export interface ArcaInvoicePayload {
  CantReg: number;
  PtoVta: number;
  CbteTipo: number;
  Concepto: number;
  DocTipo: number;
  DocNro: number;
  CbteDesde: number;
  CbteHasta: number;
  CbteFch: string;
  ImpTotal: number;
  ImpTotConc: number;
  ImpNeto: number;
  ImpOpEx: number;
  ImpTrib: number;
  ImpIVA: number;
  FchServDesde?: string;
  FchServHasta?: string;
  FchVtoPago?: string;
  MonId: string;
  MonCotiz: number;
  Iva?: {
    Id: number;
    BaseImp: number;
    Importe: number;
  }[];
}

export interface ArcaInvoiceResult {
  cae: string;
  caeFchVto: string;
  status: "A" | "R" | "P"; // Aprobado, Rechazado, Pendiente
  observations?: string[];
  rawResponse?: any;
}
