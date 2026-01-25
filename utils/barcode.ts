import { addYears, addWeeks, startOfYear, differenceInMonths } from 'date-fns';

export interface BarcodeData {
    originalCode: string;
    year: number;
    week: number;
    productionDate: Date;
    expiryDate: Date;
    status: 'safe' | 'warning' | 'expired' | 'invalid';
    monthsLeft: number;
}

export function parseBarcode(code: string): BarcodeData {
    // Basic validation
    code = code.trim();

    if (!code || code.length < 6) {
        return createInvalidData(code);
    }

    // Logic: 21 (prefix) 25 (year) 33 (week) ...
    // Indices: 0,1 prefix; 2,3 Year; 4,5 Week
    const yearStr = code.substring(2, 4);
    const weekStr = code.substring(4, 6);

    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    if (isNaN(year) || isNaN(week)) {
        return createInvalidData(code);
    }

    // Assuming 2000s. 
    const fullYear = 2000 + year;

    // Calculate Production Date: Start of Year + (Week - 1) weeks
    const startOfProdYear = startOfYear(new Date(fullYear, 0, 1));
    const productionDate = addWeeks(startOfProdYear, week - 1);

    // Expiry is 3 years from production
    const expiryDate = addYears(productionDate, 3);

    const now = new Date();
    const monthsLeft = differenceInMonths(expiryDate, now);

    let status: BarcodeData['status'] = 'safe';

    if (monthsLeft <= 0) {
        status = 'expired';
    } else if (monthsLeft <= 6) {
        status = 'warning';
    }

    return {
        originalCode: code,
        year: fullYear,
        week,
        productionDate,
        expiryDate,
        status,
        monthsLeft
    };
}

function createInvalidData(code: string): BarcodeData {
    return {
        originalCode: code,
        year: 0,
        week: 0,
        productionDate: new Date(),
        expiryDate: new Date(),
        status: 'invalid',
        monthsLeft: 0
    };
}

export function getStatusColor(status: BarcodeData['status']): string {
    switch (status) {
        case 'expired':
            return 'bg-red-100 text-red-700 border-red-200';
        case 'warning':
            return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'safe':
            return 'bg-green-100 text-green-700 border-green-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
}
