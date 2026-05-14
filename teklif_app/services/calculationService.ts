
import { Room, PipeDiameterRule, Appliance } from '../types';
import { RADIATOR_DIVISORS } from '../constants';

export const calculateTotalConsumptionKw = (appliances: Appliance[]): number => {
    return appliances.reduce((total, appliance) => total + (appliance.consumptionKw * appliance.count), 0);
};

export const calculateVentilationArea = (totalConsumptionKw: number, constant: number): number => {
    return totalConsumptionKw * constant;
};

export const calculatePipeDiameter = (totalConsumptionKw: number, pipeLength: number, chart: PipeDiameterRule[]): string => {
    // Note: This is a simplified calculation. Real-world scenarios involve pressure drop, pipe length, and fittings.
    const rule = chart.find(r => totalConsumptionKw > r.minKw && totalConsumptionKw <= r.maxKw);
    return rule ? rule.diameter : 'Hesaplama Dışı';
};

export const calculateRoomVolume = (room: Room): number => {
    return room.width * room.length * room.height;
};

export const calculateRadiatorLength = (room: Room): number => {
    if (!room.heatLossCoefficient || !room.radiatorModel) {
        return 0;
    }
    const volume = calculateRoomVolume(room);
    const heatLoss = volume * room.heatLossCoefficient;
    
    // Determine divisor based on Height and Model
    let divisor = 1250; // Fallback
    const height = room.radiatorHeight || 600;
    const isDemirdokum = room.radiatorModel.toUpperCase().includes('DEMİR');

    if (height === 900) {
        divisor = isDemirdokum ? 1950 : 1700;
    } else if (height === 600) {
        divisor = isDemirdokum ? 1450 : 1250;
    } else if (height === 500) {
        divisor = isDemirdokum ? 1250 : 1000;
    } else if (height === 400) {
        divisor = isDemirdokum ? 1100 : 900;
    } else if (height === 300) {
        // Assuming proportionate reduction for 300 as it wasn't specified, or stick to 400 logic
        divisor = isDemirdokum ? 900 : 700;
    }
    
    if (divisor > 0) {
        return heatLoss / divisor;
    }

    return 0;
};
