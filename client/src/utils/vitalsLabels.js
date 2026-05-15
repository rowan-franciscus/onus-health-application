export const bloodGlucoseTypeOptions = [
  { value: 'random', label: 'Random / Casual', short: 'Random' },
  { value: 'fasting', label: 'Fasting', short: 'Fasting' },
  { value: 'post-prandial', label: 'Post-Prandial', short: 'Post-Prandial' },
  { value: 'rapid', label: 'Rapid / Point-of-Care', short: 'Rapid' },
];

export const spo2ContextOptions = [
  { value: 'room-air', label: 'Room Air' },
  { value: 'nasal-cannula', label: 'Nasal Cannula' },
  { value: 'face-mask', label: 'Face Mask' },
  { value: 'ventilator', label: 'Ventilator' },
];

const toMap = (opts, key = 'label') =>
  opts.reduce((acc, o) => {
    acc[o.value] = o[key];
    return acc;
  }, {});

export const bloodGlucoseTypeLabels = toMap(bloodGlucoseTypeOptions, 'short');
export const spo2ContextLabels = toMap(spo2ContextOptions);
