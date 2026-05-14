
export enum ApplianceType {
    Combi = 'KOMBİ',
    Stove = 'OCAK',
    GasWaterHeater = 'DOĞALGAZLI ŞOFBEN',
    Boiler = 'KAZAN',
    RadiantHeater = 'RADYANT ISITICI',
    HeatPump = 'ISI POMPASI',
    Cabinet = 'KOMBİ DOLABI',
}

export enum RadiatorModel {
    Demirdokum = 'DEMİRDÖKÜM',
    Piyasa = 'PİYASA',
}

export type PricingItemType = 'numeric' | 'toggle' | 'selectableToggle' | 'selectable';

export interface PricingSubItem {
    id: string;
    name: string;
    units: number;
    rate: number;
    showInProposal?: boolean;
}

export interface SelectableOption {
    name: string;
    rate: number;
    defaultSubItems?: PricingSubItem[];
}

export interface Appliance {
    id: string;
    type: ApplianceType | string;
    name: string;
    consumptionKw: number;
    count: number;
    price: number;
    subItems?: PricingSubItem[];
}

export interface Radiator {
    id: string;
    length: number;
}

export interface Room {
    id: number;
    name: string;
    width: number;
    length: number;
    height: number;
    heatLossCoefficient: number;
    radiatorModel: string;
    radiatorHeight?: number; // New field for height (400, 500, 600, 900)
    radiators: Radiator[];
    isTowelRail?: boolean;
    towelRailSize?: string;
    towelRailPrice?: number;
}

export interface PricingItem {
    id: number;
    name: string;
    units: number;
    rate: number;
    type: PricingItemType;
    description?: string;
    options?: SelectableOption[];
    selectedOptionName?: string;
    subItems?: PricingSubItem[];
}

export interface ExtraOffer {
    id: string;
    name: string;
    price: number;
}

// --- COLUMN CALCULATION TYPES ---
export interface ColumnItemOption {
    name: string;
    price: number;
}

export interface ColumnItem {
    id: string;
    group: string;
    name: string;
    unit: string;
    quantity: number;
    price: number;
    options?: ColumnItemOption[];
}

export interface ColumnData {
    // Info fields are synced with main SurveyData where possible, but kept here for specific report
    description: string;
    items: ColumnItem[];
    totalCost: number; // Calculated total (Material Cost)
    isIncludedInProposal: boolean; // Toggle to show in main proposal

    // Added missing fields
    customerName?: string;
    phone?: string;
    address?: string;
    date?: string;
    laborCost?: number;
    projectCost?: number;
    paintCost?: number;
    safetyCost?: number;

    agreedColumnPrice?: number; // NEW: Manual price override for the proposal
}

export interface SurveyData {
    customerName: string;
    address: string;
    surveyDate: string;
    technicianName: string;
    phoneNumber: string;
    rooms: Room[];
    appliances: Appliance[];
    pricingItems: PricingItem[];
    radiatorMeterPrice: number;
    radiatorValvePrice: number;
    extraOffers: ExtraOffer[];
    finalBidPrice?: number;
    agreedPrice?: number;
    proposalNote?: string;
    headerImage?: string;
    columnData?: ColumnData; // Added Column Data
}

export interface PipeDiameterRule {
    minKw: number;
    maxKw: number;
    diameter: string;
}

export interface ApplianceDefinition {
    name: string;
    type: string;
    consumptionKw: number;
}
