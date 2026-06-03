import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const UNIT_DIMENSIONS = {
  g: 'weight', kg: 'weight',
  mL: 'volume', L: 'volume',
  items: 'count'
};

const CONVERSION_TO_BASE = {
  weight: { base: 'kg', factors: { kg: new Decimal(1), g: new Decimal('0.001') } },
  volume: { base: 'L', factors: { L: new Decimal(1), mL: new Decimal('0.001') } },
  count: { base: 'items', factors: { items: new Decimal(1) } }
};

export function getConversionFactor(fromUnit, toUnit) {
  const fromDim = UNIT_DIMENSIONS[fromUnit];
  const toDim = UNIT_DIMENSIONS[toUnit];

  if (!fromDim || !toDim) return new Decimal(0);
  if (fromDim !== toDim) return new Decimal(0); // Mismatch

  const factors = CONVERSION_TO_BASE[fromDim].factors;
  return factors[fromUnit].div(factors[toUnit]);
}

export function calculateItemPrice(quantity, orderUnit, basePrice, baseUnit) {
  if (!quantity || isNaN(quantity) || !basePrice || isNaN(basePrice)) return new Decimal(0);
  const q = new Decimal(quantity);
  const bp = new Decimal(basePrice);
  
  const factor = getConversionFactor(orderUnit, baseUnit);
  return q.mul(factor).mul(bp);
}

export function formatDecimal(val, places = 5) {
  if (!val) return '0.00000';
  try {
    const d = new Decimal(val.toString());
    return d.toFixed(places);
  } catch (e) {
    return '0.00000';
  }
}

export function formatINR(val) {
  if (!val) return '₹0.00';
  try {
    const num = Number(val);
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5
    });
  } catch (e) {
    return '₹' + val;
  }
}
