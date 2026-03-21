/* api.js */

export const Api = {
  async computeFare({ mode, distanceKm, discountType = 'none' }) {
    const rounded = Math.round(distanceKm * 1000) / 1000;
    let baseFare;

    if (mode === 'trike') {
      // Ordinance-based fare: ₱15 for first 4 km, then ₱1/km
      baseFare = rounded <= 4 ? 15 : 15 + Math.ceil(rounded - 4) * 1;
    } else if (mode === 'bus' || mode === 'jeep') {
      // Variable fare for bus/jeep rides inside GenSan
      baseFare = 30; // Minimum fare
    } else {
      throw new Error('Unsupported mode');
    }

    // Apply 20% discount for special passengers (PWD, Senior Citizens, Students)
    let discountAmount = 0;
    let finalFare = baseFare;
    
    if (discountType === 'special') {
      discountAmount = Math.round(baseFare * 0.2);
      finalFare = baseFare - discountAmount;
    }

    // Simulate async delay for consistency
    await new Promise(r => setTimeout(r, 200));
    
    return { 
      mode, 
      distanceKm: rounded, 
      baseFare,
      discountType,
      discountAmount,
      fare: finalFare
    };
  }
};
