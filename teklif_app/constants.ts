import { ApplianceType, PipeDiameterRule, RadiatorModel, ApplianceDefinition, ColumnItem, PricingSubItem, PricingItem, SurveyData } from './types';

export const APPLIANCE_DEFINITIONS: ApplianceDefinition[] = [
    { name: 'KOMBİ (24KW)', type: ApplianceType.Combi, consumptionKw: 24 },
    { name: 'OCAK (4 GÖZLÜ)', type: ApplianceType.Stove, consumptionKw: 7 },
    { name: 'DOĞALGAZLI ŞOFBEN', type: ApplianceType.GasWaterHeater, consumptionKw: 11 },
    { name: 'KAZAN (50KW)', type: ApplianceType.Boiler, consumptionKw: 50 },
    { name: 'RADYANT ISITICI', type: ApplianceType.RadiantHeater, consumptionKw: 15 },
    { name: 'ISI POMPASI', type: ApplianceType.HeatPump, consumptionKw: 30 },
    { name: 'KOMBİ DOLABI', type: ApplianceType.Cabinet, consumptionKw: 0 },
];

// Updated Combi List based on the PDF OCR data - ALL UPPERCASE
export const COMBI_MODELS = [
    // DEMİRDÖKÜM
    "DEMİR DÖKÜM NİTROMİX P 24 TAM YOĞUŞMALI KOMBİ (24 KW)",
    "DEMİR DÖKÜM NİTROMİX P 28 TAM YOĞUŞMALI KOMBİ (28 KW)",
    "DEMİR DÖKÜM NİTROMİX P 35 TAM YOĞUŞMALI KOMBİ (35 KW)",
    "DEMİR DÖKÜM NİTROMİX IONİ 24/26 KW TAM YOĞUŞMALI KOMBİ",
    "DEMİR DÖKÜM NİTROMİX IONİ 28/36 KW TAM YOĞUŞMALI KOMBİ",
    "DEMİR DÖKÜM NİTROMİX IONİ 34/36 KW TAM YOĞUŞMALI KOMBİ",
    "DEMİR DÖKÜM ATROMİX P 24 TAM YOĞUŞMALI KOMBİ (24 KW)",
    "DEMİR DÖKÜM ATROMİX P 28 TAM YOĞUŞMALI KOMBİ (28 KW)",
    "DEMİR DÖKÜM ADEMİX 18/24 TAM YOĞUŞMALI KOMBİ (18/24 KW)",
    "DEMİR DÖKÜM ADEMİX 24/28 TAM YOĞUŞMALI KOMBİ (24/28 KW)",
    "DEMİR DÖKÜM VENTOMİX 18/24 TAM YOĞUŞMALI KOMBİ (18/24 KW)",
    "DEMİR DÖKÜM VENTOMİX 24/28 TAM YOĞUŞMALI KOMBİ (24/28 KW)",
    "DEMİR DÖKÜM İSOMİX P 30 TAM YOĞUŞMALI KOMBİ (30 KW)",
    "DEMİR DÖKÜM ATRON CONDENSE (YARI YOĞUŞMALI)",

    // VIESSMANN
    "VIESSMANN TREND 19/27 KW TAM YOĞUŞMALI KOMBİ (19 KW)",
    "VIESSMANN TREND 25/31 KW TAM YOĞUŞMALI KOMBİ (25 KW)",
    "VIESSMANN CONNECT 19/27 KW WİFİ TAM YOĞUŞMALI KOMBİ (19 KW)",
    "VIESSMANN CONNECT 25/31 KW WİFİ TAM YOĞUŞMALI KOMBİ (25 KW)",
    "VIESSMANN CONNECT 32/35 KW WİFİ TAM YOĞUŞMALI KOMBİ (32/35 KW)",
    "VIESSMANN VITODENS 100-W 19/27 TAM YOĞUŞMALI KOMBİ (19/27 KW)",
    "VIESSMANN VITODENS 100-W 25/31 TAM YOĞUŞMALI KOMBİ (25/31 KW)",
    "VIESSMANN VITODENS 100-W 32/35 TAM YOĞUŞMALI KOMBİ (32/35 KW)",

    // VAILLANT
    "VAILLANT INTRO 18/24 TAM YOĞUŞMALI KOMBİ (18/24 KW)",
    "VAILLANT INTRO 24/28 TAM YOĞUŞMALI KOMBİ (24/28 KW)",
    "VAILLANT ECOTEC PURE 236/7-2 TAM YOĞUŞMALI KOMBİ (20 KW)",
    "VAILLANT ECOTEC PURE 286/7-2 TAM YOĞUŞMALI KOMBİ (25 KW)",
    "VAILLANT ECOTEC PRO 236/5-3 TAM YOĞUŞMALI KOMBİ (20 KW)",
    "VAILLANT ECOTEC PRO 286/5-3 TAM YOĞUŞMALI KOMBİ (25 KW)",

    // ECA
    "ECA CITIUS PREMİX 24 TAM YOĞUŞMALI KOMBİ (24 KW)",
    "ECA CITIUS PREMİX 28 TAM YOĞUŞMALI KOMBİ (28 KW)",
    "ECA PROTEUS PREMİX 24 TAM YOĞUŞMALI KOMBİ (24 KW)",
    "ECA PROTEUS PREMİX 28 TAM YOĞUŞMALI KOMBİ (28 KW)",
    "ECA PROTEUS PREMİX 30 TAM YOĞUŞMALI KOMBİ (30 KW)",
    "ECA PROTEUS PREMİX 35 TAM YOĞUŞMALI KOMBİ (35 KW)",
    "ECA PROTEUS PREMİX 42 TAM YOĞUŞMALI KOMBİ (42 KW)",
    "ECA PROTEUS PREMİX 45 TAM YOĞUŞMALI KOMBİ (45 KW)",
    "ECA CONFEO PREMİX PREMİUM 24 SİYAH TAM YOĞUŞMALI KOMBİ (24 KW)",
    "ECA CONFEO PREMİX PREMİUM 30 SİYAH TAM YOĞUŞMALI KOMBİ (30 KW)",
    "ECA CONFEO PREMİX PREMİUM 35 SİYAH TAM YOĞUŞMALI KOMBİ (35 KW)",

    // PROTHERM
    "PROTHERM PUMA CONDENSE 18/24 TAM YOĞUŞMALI KOMBİ (18/24 KW)",
    "PROTHERM LYNX CONDENS 24 KW TAM YOĞUŞMALI KOMBİ (24 KW)",
    "PROTHERM LYNX CONDENS 28 KW TAM YOĞUŞMALI KOMBİ (28 KW)",

    // BAYMAK
    "BAYMAK LAMBERT LPY COMPACT 24 TAM YOĞUŞMALI KOMBİ (24 KW)",
    "BAYMAK LAMBERT LPY COMPACT 30 TAM YOĞUŞMALI KOMBİ (30 KW)",
    "BAYMAK LAMBERT LPY COMPACT 33 TAM YOĞUŞMALI KOMBİ (33 KW)",
    "BAYMAK LAMBERT LPY COMPACT 42 TAM YOĞUŞMALI KOMBİ (42 KW)",
    "BAYMAK LAMBERT LPY COMPACT 45 TAM YOĞUŞMALI KOMBİ (45 KW)",
    "BAYMAK DUOTEC COMPACT 24 TAM YOĞUŞMALI KOMBİ (24 KW)",
    "BAYMAK DUOTEC COMPACT 30 TAM YOĞUŞMALI KOMBİ (30 KW)",

    // WARMHAUS
    "WARMHAUS EWA 24 TAM YOĞUŞMALI KOMBİ (24 KW)"
];

// --- DEFAULT LISTS FOR PRICE LIST COMPONENT ---

export const DEFAULT_RADIATOR_ITEMS = [
    "DEMİR DÖKÜM PLUS RADYATÖR (MT)",
    "HAVLUPAN 50/80 CM",
    "HAVLUPAN 50/100 CM",
    "HAVLUPAN 50/120 CM",
    "HAVLUPAN 60/80 CM",
    "HAVLUPAN 60/100 CM",
    "HAVLUPAN 60/120 CM"
];

export const DEFAULT_HEATING_INSTALLATION_ITEMS = [
    "DN32 KOMPOZİT BORU (MT)",
    "DN25 KOMPOZİT BORU (MT)",
    "DN20 KOMPOZİT BORU (MT)",
    "DN32 DİRSEK",
    "DN25 DİRSEK",
    "DN20 DİRSEK",
    "DN32 DİRSEK 45°",
    "DN25 DİRSEK 45°",
    "DN20 DİRSEK 45°",
    "DN32 MANŞON",
    "DN25 MANŞON",
    "DN20 MANŞON",
    "32-25 REDÜKSİYON",
    "25-20 REDÜKSİYON",
    "32-20 REDÜKSİYON",
    "32 OJR TE",
    "25 ORJ TE",
    "20 ORJ TE",
    "32-20-32 TE",
    "25-20-25 TE",
    "32-25-32 TE",
    "32-20-25 TE",
    "DN32 KAVİS",
    "DN25 KAVİS",
    "DN20 KAVİS",
    "İÇ DİŞLİ ADAPTÖR 20-1/2\"",
    "DIŞ DİŞLİ ADAPTÖR 20-1/2\"",
    "İÇ DİŞLİ TE 20-1/2\"-20",
    "İÇ DİŞLİ DİRSEK 20-1/2\"",
    "DIŞ DİŞLİ DİRSEK 20-1/2\"",
    "DN32 TEKLİ KELEPÇE",
    "DN25 TEKLİ KELEPÇE",
    "DN20 TEKLİ KELEPÇE",
    "DN32 ÇİFTLİ KELEPÇE",
    "DN25 ÇİFTLİ KELEPÇE",
    "DN20 ÇİFTLİ KELEPÇE",
    "KOMBİ ALT BAĞLANTI SETİ",
    "5,60 VİDA",
    "ALÇI"
];

export const DEFAULT_PIPE_ITEMS = [
    "1\" DOĞALGAZ BORUSU (MT)",
    "3/4\" DOĞALGAZ BORUSU (MT)",
    "1/2\" DOĞALGAZ BORUSU (MT)",
    "1\" DİRSEK",
    "3/4\" DİRSEK",
    "1/2\" DİRSEK",
    "1\" TE",
    "3/4\" TE",
    "1\" KUYRUKLU DİRSEK",
    "3/4\" KUYRUKLU DİRSEK",
    "KELEPÇE (STANDART)",
    "KONSOL"
];

export const DEFAULT_VALVE_ITEMS = [
    "1\" DOĞALGAZ VANASI",
    "3/4\" DOĞALGAZ VANASI",
    "1/2\" DOĞALGAZ VANASI",
    "1\" FLANŞLI DG VANASI",
    "FLANŞLI DEPREM VANASI",
    "3/4\" KİLİTLİ VANA",
    "1/2\" KİLİTLİ VANA",
    "RADYATÖR VANASI (KÖŞE)",
    "RADYATÖR VANASI (DÜZ)",
    "TERMOSTATİK VANA",
    "KOMBİ BAĞLANTI SETİ (DÜZ)",
    "KOMBİ BAĞLANTI SETİ (FİLTRELİ)",
    "30X30 SAÇ DOLAP",
    "60X30 SAÇ DOLAP",
    "KOMBİ DOLABI (STANDART)",
    "GAZ ALARM CİHAZI",
    "EXPROOF GAZ ALARM CİHAZI",
    "BACA UZATMASI 50 CM (YOĞUŞMALI)",
    "BACA UZATMASI 100 CM (YOĞUŞMALI)",
    "BACA DİRSEĞİ 90° (YOĞUŞMALI)",
    "BACA DİRSEĞİ 45° (YOĞUŞMALI)",
    "ODA TERMOSTATI (KABLOLU)",
    "ODA TERMOSTATI (KABLOSUZ)",
    "ODA TERMOSTATI (AKILLI/WIFI)"
];

export const DEFAULT_LABOR_ITEMS = [
    "İÇ GAZ TESİSATI İŞÇİLİĞİ",
    "KALORİFER TESİSATI İŞÇİLİĞİ",
    "RADYATÖR MONTAJI (ADET)",
    "KOMBİ MONTAJI",
    "KOMBİ KOLLEKTÖR MONTAJI",
    "KOMBİ KOLLEKTÖR KIRIMLI",
    "FULL TESİSAT İŞÇİLİĞİ",
    "FULL KIRIMLI İŞÇİLİĞİ",
    "PLASTİKSİZ FULL TESİSAT",
    "KAYNAKLI TESİSAT İŞÇİLİĞİ",
    "EXTRA PETEK MONTAJI",
    "EXTRA TRV MONTAJI",
    "DEMİR BORU KESİMİ",
    "KAZIM İŞÇİLİĞİ",
    "KAYNAK İŞÇİLİĞİ (MT)",
    "PROJE BEDELİ",
    "KAROT",
    "CAM / DUVAR MENFEZİ AÇIMI",
    "TESİSAT BOYAMASI"
];

export const ALL_DEFAULT_ITEMS = [
    ...COMBI_MODELS,
    ...DEFAULT_RADIATOR_ITEMS,
    ...DEFAULT_HEATING_INSTALLATION_ITEMS,
    ...DEFAULT_PIPE_ITEMS,
    ...DEFAULT_VALVE_ITEMS,
    ...DEFAULT_LABOR_ITEMS
];

export const TOWEL_RAIL_SIZES = ['5-10', '6-10', '7-10'];
export const RADIATOR_HEIGHT_OPTIONS = [300, 400, 500, 600, 900];

export const VENTILATION_CONSTANT_CM2_PER_KW = 15;

export const PIPE_DIAMETER_CHART: PipeDiameterRule[] = [
    { minKw: 0, maxKw: 20, diameter: 'DN20 (3/4")' },
    { minKw: 20, maxKw: 45, diameter: 'DN25 (1")' },
    { minKw: 45, maxKw: 80, diameter: 'DN32 (1 1/4")' },
    { minKw: 80, maxKw: 120, diameter: 'DN40 (1 1/2")' },
    { minKw: 120, maxKw: Infinity, diameter: 'DN50 (2")' },
];

// Replaced simple object with dynamic logic in calculation service
export const RADIATOR_DIVISORS: { [key in RadiatorModel]: number } = {
    [RadiatorModel.Demirdokum]: 1450,
    [RadiatorModel.Piyasa]: 1250,
};

export const DEFAULT_COLUMN_ITEMS: ColumnItem[] = [
    { id: '1', group: 'DG BORUSU', name: '3" BORU', unit: 'M', quantity: 0, price: 653.90 },
    { id: '2', group: 'DG BORUSU', name: '2 1/2" BORU', unit: 'M', quantity: 0, price: 505.46 },
    { id: '3', group: 'DG BORUSU', name: '2" BORU', unit: 'M', quantity: 0, price: 314.29 },
    { id: '4', group: 'DG BORUSU', name: '1 1/2" BORU', unit: 'M', quantity: 0, price: 234.06 },
    { id: '5', group: 'DG BORUSU', name: '1 1/4" BORU', unit: 'M', quantity: 0, price: 199.88 },
    { id: '6', group: 'DG BORUSU', name: '1" BORU', unit: 'M', quantity: 0, price: 155.21 },
    { id: '7', group: 'DG BORUSU', name: '3/4" BORU', unit: 'M', quantity: 0, price: 106.26 },
    { id: '8', group: 'L KONSOLLU KISIM', name: '3" SMNLU KLPÇE + KONSOL', unit: 'ADET', quantity: 0, price: 30.24 },
    { id: '9', group: 'L KONSOLLU KISIM', name: '2 1/2" SMNLU KLPÇE + KONSOL', unit: 'ADET', quantity: 0, price: 28.21 },
    { id: '10', group: 'L KONSOLLU KISIM', name: '2" SMNLU KLPÇE + KONSOL', unit: 'ADET', quantity: 0, price: 19.97 },
    { id: '11', group: 'L KONSOLLU KISIM', name: '1 1/2" SMNLU KLPÇE + KONSOL', unit: 'ADET', quantity: 0, price: 19.07 },
    { id: '12', group: 'L KONSOLLU KISIM', name: '1 1/4" SMNLU KLPÇE + KONSOL', unit: 'ADET', quantity: 0, price: 19.87 },
    { id: '13', group: 'L KONSOLLU KISIM', name: '1" SMNLU KLPÇE + KONSOL', unit: 'ADET', quantity: 0, price: 18.24 },
    { id: '14', group: 'U. KELEPÇE', name: '3" U. KELEPÇE', unit: 'ADET', quantity: 0, price: 10.49 },
    { id: '15', group: 'U. KELEPÇE', name: '2 1/2" U. KELEPÇE', unit: 'ADET', quantity: 0, price: 8.26 },
    { id: '16', group: 'U. KELEPÇE', name: '2" U. KELEPÇE', unit: 'ADET', quantity: 0, price: 5.15 },
    { id: '17', group: 'U. KELEPÇE', name: '1 1/2" U. KELEPÇE', unit: 'ADET', quantity: 0, price: 4.43 },
    { id: '18', group: 'U. KELEPÇE', name: '1 1/4" U. KELEPÇE', unit: 'ADET', quantity: 0, price: 4.15 },
    { id: '19', group: 'U. KELEPÇE', name: '1" U. KELEPÇE', unit: 'ADET', quantity: 0, price: 3.37 },
    { id: '20', group: 'U. KELEPÇE', name: '3/4" U. KELEPÇE', unit: 'ADET', quantity: 0, price: 2.98 },
    { id: '21', group: 'PAT. DİRSEK', name: '3" PAT. DİRSEK', unit: 'ADET', quantity: 0, price: 101.40 },
    { id: '22', group: 'PAT. DİRSEK', name: '2 1/2" PAT. DİRSEK', unit: 'ADET', quantity: 0, price: 85.80 },
    { id: '23', group: 'PAT. DİRSEK', name: '2" PAT. DİRSEK', unit: 'ADET', quantity: 0, price: 49.92 },
    { id: '24', group: 'PAT. DİRSEK', name: '1 1/2" PAT. DİRSEK', unit: 'ADET', quantity: 0, price: 36.66 },
    { id: '25', group: 'PAT. DİRSEK', name: '1 1/4" PAT. DİRSEK', unit: 'ADET', quantity: 0, price: 29.64 },
    { id: '26', group: 'PAT. DİRSEK', name: '1" PAT. DİRSEK', unit: 'ADET', quantity: 0, price: 18.72 },
    { id: '27', group: 'PAT. DİRSEK', name: '3/4" PAT. DİRSEK', unit: 'ADET', quantity: 0, price: 17.16 },
    { id: '28', group: 'SD', name: '1/4" SİYAH DİŞLİ DİRSEK', unit: 'ADET', quantity: 0, price: 57.12 },
    { id: '29', group: 'KF', name: 'KUTU FLEXİ 1 1/4"', unit: 'ADET', quantity: 0, price: 489.24 },
    { id: '30', group: 'PF', name: 'PATENT FITTINGS', unit: 'ADET', quantity: 0, price: 78.00 },
    { id: '31', group: 'DV', name: '2" DİŞLİ DEPREM VANASI', unit: 'ADET', quantity: 0, price: 1038.84, options: [{ name: '2" DİŞLİ DEPREM VANASI', price: 1038.84 }, { name: '1 1/2" DİŞLİ DEPREM VANASI', price: 1038.84 }, { name: '1 1/4" DİŞLİ DEPREM VANASI', price: 1038.84 }, { name: '1" DİŞLİ DEPREM VANASI', price: 1038.84 }] },
    { id: '32', group: 'DG VANASI / TAPA', name: '2" DOĞALGAZ VANASI', unit: 'ADET', quantity: 0, price: 1036.36 },
    { id: '33', group: 'DG VANASI / TAPA', name: '2" TAPA', unit: 'ADET', quantity: 0, price: 63.00 },
    { id: '34', group: 'DG VANASI / TAPA', name: '1 1/2" DOĞALGAZ VANASI', unit: 'ADET', quantity: 0, price: 704.62 },
    { id: '35', group: 'DG VANASI / TAPA', name: '1 1/2" TAPA', unit: 'ADET', quantity: 0, price: 36.12 },
    { id: '36', group: 'DG VANASI / TAPA', name: '1 1/4" DOĞALGAZ VANASI', unit: 'ADET', quantity: 0, price: 470.82 },
    { id: '37', group: 'DG VANASI / TAPA', name: '1 1/4" TAPA', unit: 'ADET', quantity: 0, price: 28.56 },
    { id: '38', group: 'DG VANASI / TAPA', name: '1" DOĞALGAZ VANASI', unit: 'ADET', quantity: 0, price: 295.45 },
    { id: '39', group: 'DG VANASI / TAPA', name: '1" TAPA', unit: 'ADET', quantity: 0, price: 15.96 },
    { id: '40', group: 'DG VANASI / TAPA', name: '3/4" DOĞALGAZ VANASI', unit: 'ADET', quantity: 0, price: 164.85 },
    { id: '41', group: 'RAKOR / NİPEL', name: '2" RAKOR', unit: 'ADET', quantity: 0, price: 264.60 },
    { id: '42', group: 'RAKOR / NİPEL', name: '2" NİPEL', unit: 'ADET', quantity: 0, price: 83.16 },
    { id: '43', group: 'RAKOR / NİPEL', name: '1 1/2" RAKOR', unit: 'ADET', quantity: 0, price: 163.80 },
    { id: '44', group: 'RAKOR / NİPEL', name: '1 1/2" NİPEL', unit: 'ADET', quantity: 0, price: 48.72 },
    { id: '45', group: 'RAKOR / NİPEL', name: '1 1/4" RAKOR', unit: 'ADET', quantity: 0, price: 138.60 },
    { id: '46', group: 'RAKOR / NİPEL', name: '1 1/4" NİPEL', unit: 'ADET', quantity: 0, price: 41.16 },
    { id: '47', group: 'RAKOR / NİPEL', name: '1" RAKOR', unit: 'ADET', quantity: 0, price: 84.00 },
    { id: '48', group: 'RAKOR / NİPEL', name: '1" NİPEL', unit: 'ADET', quantity: 0, price: 22.68 },
    { id: '49', group: 'RAKOR / NİPEL', name: '3/4" RAKOR', unit: 'ADET', quantity: 0, price: 24.57 },
    { id: '50', group: 'RAKOR / NİPEL', name: '3/4" NİPEL', unit: 'ADET', quantity: 0, price: 16.80 },
    { id: '51', group: 'REG. / FLANŞ', name: '1 1/4"-X" SHUT OFF. REG.', unit: 'ADET', quantity: 0, price: 7554.59 },
    { id: '52', group: 'REG. / FLANŞ', name: '3" FLANŞLI DEPREM VANASI', unit: 'ADET', quantity: 0, price: 1662.79 },
    { id: '53', group: 'REG. / FLANŞ', name: '3" FLANŞLI DG VANASI', unit: 'ADET', quantity: 0, price: 2267.59 },
    { id: '54', group: 'REG. / FLANŞ', name: '2 1/2" FLANŞLI DG VANASI', unit: 'ADET', quantity: 0, price: 1892.28 },
    { id: '55', group: 'REG. / FLANŞ', name: 'FLANŞLI VANA İŞÇİLİĞİ', unit: 'ADET', quantity: 0, price: 2400.00 },
    { id: '56', group: 'DOLAP', name: '30 x 30 SAÇ DOLAP', unit: 'ADET', quantity: 0, price: 402.00 },
    { id: '57', group: 'DOLAP', name: '60 x 30 SAÇ DOLAP', unit: 'ADET', quantity: 0, price: 492.00 },
    { id: '58', group: 'DOLAP', name: '60 x 50 SAÇ DOLAP', unit: 'ADET', quantity: 0, price: 972.00 },
    { id: '59', group: 'DOLAP', name: '60 x 60 SAÇ DOLAP', unit: 'ADET', quantity: 0, price: 972.00 },
    { id: '60', group: 'DOLAP', name: '70 x 90 SAÇ DOLAP', unit: 'ADET', quantity: 0, price: 1632.00 },
    { id: '61', group: 'HIRDAVAT', name: 'DÜBEL / VİDA', unit: 'GRUP', quantity: 0, price: 18.00 },
    { id: '62', group: 'HIRDAVAT', name: 'LOKSEL', unit: 'ADET', quantity: 0, price: 252.00 },
    { id: '63', group: 'HIRDAVAT', name: 'SİLİKON / ALÇI', unit: 'KG', quantity: 0, price: 24.00 },
    { id: '64', group: 'HIRDAVAT', name: 'UYARI LEVHASI', unit: 'ADET', quantity: 0, price: 120.00 },
    { id: '65', group: 'HIRDAVAT', name: 'SOĞUK / SICAK SARGI BANDI', unit: 'ADET', quantity: 0, price: 191.52 },
    { id: '66', group: 'HIRDAVAT', name: 'ÇELİK KILIF', unit: 'ADET', quantity: 0, price: 60.00 },
    { id: '67', group: 'HIRDAVAT', name: 'PİMAJ 50 x 500', unit: 'ADET', quantity: 0, price: 48.00 },
    { id: '68', group: 'HIRDAVAT', name: 'TOPRAKLAMA ÇUBUĞU / KABLO', unit: 'ADET', quantity: 0, price: 1020.00 },
    { id: '69', group: 'KMP.', name: 'KOMPANSATÖR SEÇİMİ', unit: 'ADET', quantity: 0, price: 887.76, options: [{ name: '2 1/2" KOMPANSATÖR', price: 887.76 }, { name: '2" KOMPANSATÖR', price: 887.76 }, { name: '1 1/2" KOMPANSATÖR', price: 887.76 }, { name: '1 1/4" KOMPANSATÖR', price: 887.76 }, { name: '1" KOMPANSATÖR', price: 630.72 }] },
    { id: '71', group: 'YER ALTI', name: 'PE KAPLI DG BORUSU SEÇİMİ', unit: 'M', quantity: 0, price: 339.91, options: [{ name: '3" PE KAPLI DG BORUSU', price: 339.91 }, { name: '2 1/2" PE KAPLI DG BORUSU', price: 339.91 }, { name: '2" PE KAPLI DG BORUSU', price: 339.91 }, { name: '1 1/2" PE KAPLI DG BORUSU', price: 339.91 }, { name: '1 1/4" PE KAPLI DG BORUSU', price: 339.91 }, { name: '1" PE KAPLI DG BORUSU', price: 270.42 }] },
    { id: '73', group: 'YER ALTI', name: 'İZOLE MAFSAL SEÇİMİ', unit: 'ADET', quantity: 0, price: 292.32, options: [{ name: '3" İZOLE MAFSAL', price: 292.32 }, { name: '2 1/2" İZOLE MAFSAL', price: 292.32 }, { name: '2" İZOLE MAFSAL', price: 292.32 }, { name: '1 1/2" İZOLE MAFSAL', price: 292.32 }, { name: '1 1/4" İZOLE MAFSAL', price: 292.32 }, { name: '1" İZOLE MAFSAL', price: 292.32 }] },
    { id: '75', group: 'YER ALTI', name: 'MG ANOT (2 LB)', unit: 'ADET', quantity: 0, price: 957.00 },
    { id: '76', group: 'YER ALTI', name: 'KAZIM İŞÇİLİĞİ', unit: 'ADET', quantity: 0, price: 2400.00 },
    { id: '77', group: 'YER ALTI', name: 'SARI KUM / İKAZ BANDI', unit: 'M', quantity: 0, price: 132.00 },
    { id: '78', group: 'YAN İŞ.', name: 'KAROT', unit: 'ADET', quantity: 0, price: 1200.00 },
    { id: '79', group: 'YAN İŞ.', name: 'CAM / DUVAR MENFEZİ', unit: 'ADET', quantity: 0, price: 480.00 },
    { id: '80', group: 'YAN İŞ.', name: 'EX-PROOF GAZ ALARM MONTAJI', unit: 'ADET', quantity: 0, price: 3000.00 },
    { id: '81', group: 'YAN İŞ.', name: 'TESİSAT BOYAMASI', unit: 'ADET', quantity: 0, price: 1200.00 },
    { id: '82', group: 'Kİ', name: 'KAYNAK İŞÇİLİĞİ (ENDÜSTRİYEL)', unit: 'M', quantity: 0, price: 600.00 },
    { id: '83', group: 'Kİ', name: 'KAYNAK İŞÇİLİĞİ (STANDART)', unit: 'M', quantity: 0, price: 480.00 },
    { id: '84', group: 'PR', name: 'PROJE BEDELİ - 2. KONTOL DAHİL', unit: 'ADET', quantity: 0, price: 2250.00 },
    { id: '85', group: 'E', name: 'EMNİYET PAYI', unit: 'ADET', quantity: 0, price: 59.00 },
];

export const LABOR_SUB_ITEMS_DEFAULT: PricingSubItem[] = [
    { id: 's-kirim', name: 'KIRIM', units: 0, rate: 1000, showInProposal: false },
    { id: 's-kaynak', name: 'KAYNAKLI DIŞ BAĞLANTI', units: 0, rate: 1500, showInProposal: false }
];

export const DEFAULT_PRICING_ITEMS: PricingItem[] = [
    { 
        id: 1, 
        name: 'İÇ TESİSAT MALZEMESİ', 
        units: 1, 
        rate: 0, 
        type: 'toggle', 
        subItems: [
            { id: 's-boru', name: 'DOĞALGAZ TESİSAT MALZEMESİ VE BORULAMA', units: 1, rate: 0, showInProposal: true },
            { id: 's-proje', name: 'MÜHENDİSLİK HİZMETLERİ (PROJE ÇİZİMİ VE GAZ AÇIMI)', units: 1, rate: 1500, showInProposal: true },
            { id: 's-menfez', name: 'CAM MENFEZİ VE ELEKTRİK ŞALTERİ MONTAJI', units: 1, rate: 250, showInProposal: true },
            { id: 's-exproof', name: 'EXPROOF GAZ ALARM CİHAZI (SELENOİD VANA BAĞLANTILI) MONTAJI', units: 0, rate: 1200, showInProposal: true }
        ]
    },
    { 
        id: 3, 
        name: 'ISITMA TESİSATI', 
        units: 1,
        rate: 0, 
        type: 'selectableToggle', 
        description: '(KOMBİ KOLLEKTÖR, KOMBİ MONTAJI, FULL TESİSAT, RADYATÖR MONTAJI, İÇ GAZ KOMBİ MONTAJI, ISI POMPASI MONTAJI)',
        options: [
            { 
                name: 'KOMBİ KOLLEKTÖR', 
                rate: 0, 
                defaultSubItems: [
                    { id: 's1', name: 'KOMBİ KOLLEKTÖR MALZEMESİ', units: 1, rate: 0, showInProposal: false },
                    { id: 's2', name: 'DN32 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
                    { id: 's3', name: 'DN25 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
                    { id: 's4', name: 'DN20 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
                ]
            },
            { 
                name: 'KOMBİ MONTAJI', 
                rate: 0,
                defaultSubItems: [
                    { id: 's5', name: 'KOMBİ MONTAJ MALZEMESİ', units: 1, rate: 1500, showInProposal: false },
                    { id: 's6', name: 'FLEX GRUBU(OCAK,KOMBİ,SAYAÇ BAĞLANTI FLEXİ)', units: 1, rate: 400, showInProposal: false },
                    { id: 's7', name: 'EXPROOF GAZ ALARM CİHAZI(SELENOİD VANA BAĞLANTILI)', units: 0, rate: 1200, showInProposal: false }
                ]
            },
            { name: 'FULL TESİSAT', rate: 35000 },
            { 
                name: 'PLASTİKSİZ FULL TESİSAT MONTAJI', 
                rate: 0,
                defaultSubItems: [
                    { id: 's10', name: 'KOMBİ MONTAJ MALZEMESİ', units: 1, rate: 0, showInProposal: false },
                    { id: 's11', name: 'RADYATÖR MONTAJ MALZEMESİ', units: 1, rate: 0, showInProposal: false },
                    { id: 's12', name: 'DN32 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
                    { id: 's13', name: 'DN25 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
                    { id: 's14', name: 'DN20 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
                ]
            },
            { 
                name: 'RADYATÖR MONTAJI', 
                rate: 5000,
                defaultSubItems: [
                    { id: 's15', name: 'DN20 - 1/2 DIŞ DİŞLİ ADAPTÖR', units: 1, rate: 5000, showInProposal: false }
                ]
            },
            {
                name: 'İÇ GAZ KOMBİ MONTAJI',
                rate: 3500,
                defaultSubItems: [
                    { id: 's16', name: 'KOMBİ MONTAJ MALZEMESİ', units: 1, rate: 3500, showInProposal: false }
                ]
            },
            {
                name: 'ISI POMPASI MONTAJI',
                rate: 5000,
                defaultSubItems: [
                    { id: 's17', name: 'ISI POMPASI MONTAJ MALZEMESİ', units: 1, rate: 0, showInProposal: false },
                    { id: 's18', name: 'BUFFER TANK', units: 1, rate: 0, showInProposal: false },
                    { id: 's19', name: 'GENLEŞME TANKI', units: 1, rate: 0, showInProposal: false },
                    { id: 's20', name: 'DENGE KABI', units: 1, rate: 0, showInProposal: false }
                ]
            }
        ],
        selectedOptionName: 'KOMBİ KOLLEKTÖR',
        subItems: [
            { id: '1-1', name: 'KOMBİ KOLLEKTÖR MALZEMESİ', units: 1, rate: 0, showInProposal: false },
            { id: '1-2', name: 'DN32 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
            { id: '1-3', name: 'DN25 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
            { id: '1-4', name: 'DN20 PPRC BORU (METRE)', units: 1, rate: 0, showInProposal: false },
        ]
    },
    { 
        id: 6, 
        name: 'İŞÇİLİK', 
        units: 1,
        rate: 5000, 
        type: 'selectableToggle',
        description: '(FULL TESİSAT, KOMBİ KOLLEKTÖR, PLASTİKSİZ FULL TESİSAT, KOMBİ MONTAJI, İÇ GAZ TESİSATI, İÇ GAZ KOMBİ MONTAJI, RADYATÖR MONTAJI, ISI POMPASI MONTAJI)',
        options: [
            { name: 'FULL TESİSAT', rate: 5000, defaultSubItems: [...LABOR_SUB_ITEMS_DEFAULT] },
            { name: 'KOMBİ KOLLEKTÖR', rate: 2000, defaultSubItems: [...LABOR_SUB_ITEMS_DEFAULT] },
            { name: 'PLASTİKSİZ FULL TESİSAT', rate: 6000, defaultSubItems: [...LABOR_SUB_ITEMS_DEFAULT] },
            { name: 'KOMBİ MONTAJI', rate: 1000, defaultSubItems: [...LABOR_SUB_ITEMS_DEFAULT] },
            { name: 'İÇ GAZ TESİSATI', rate: 2500, defaultSubItems: [...LABOR_SUB_ITEMS_DEFAULT] },
            { name: 'İÇ GAZ KOMBİ MONTAJI', rate: 3500, defaultSubItems: [...LABOR_SUB_ITEMS_DEFAULT] },
            { name: 'RADYATÖR MONTAJI', rate: 1500, defaultSubItems: [...LABOR_SUB_ITEMS_DEFAULT] },
            { name: 'ISI POMPASI MONTAJI', rate: 3000, defaultSubItems: [...LABOR_SUB_ITEMS_DEFAULT] },
        ],
        selectedOptionName: 'FULL TESİSAT',
        subItems: [...LABOR_SUB_ITEMS_DEFAULT]
    },
];

export const DEFAULT_MASTER_TEMPLATE: SurveyData = {
    customerName: '',
    address: '',
    surveyDate: new Date().toISOString().split('T')[0],
    technicianName: '',
    phoneNumber: '',
    radiatorMeterPrice: 0,
    radiatorValvePrice: 0,
    extraOffers: [],
    finalBidPrice: undefined,
    agreedPrice: undefined,
    rooms: [],
    appliances: [],
    pricingItems: DEFAULT_PRICING_ITEMS,
    proposalNote: '',
    headerImage: undefined,
    columnData: {
        description: '', items: DEFAULT_COLUMN_ITEMS, totalCost: 0, isIncludedInProposal: false,
        customerName: '', phone: '', address: '', date: new Date().toLocaleDateString('tr-TR'),
        laborCost: 0, projectCost: 0, paintCost: 0, safetyCost: 0, agreedColumnPrice: 0
    }
};