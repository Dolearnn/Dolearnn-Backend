// Original senior-secondary Physics questions. Uses the existing Physics topics.
// Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'physics',
  name: 'Physics',
  sortOrder: 3,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'mechanics', name: 'Mechanics' },
    { slug: 'heat-thermal-physics', name: 'Heat and Thermal Physics' },
    { slug: 'waves-optics', name: 'Waves and Optics' },
    { slug: 'electricity-magnetism', name: 'Electricity and Magnetism' },
    { slug: 'modern-physics', name: 'Modern Physics' },
  ],
  questions: [
    ['mechanics', 'A car accelerates uniformly from rest to 20 m/s in 5 s. Find its acceleration.', ['4 m/s²', '100 m/s²', '0.25 m/s²', '25 m/s²'], 0, 'a = (v − u)/t = (20 − 0)/5 = 4 m/s².'],
    ['mechanics', 'The SI unit of force is the', ['newton', 'joule', 'watt', 'pascal'], 0, 'Force is measured in newtons (1 N = 1 kg m/s²).'],
    ['mechanics', 'Find the kinetic energy of a 2 kg body moving at 3 m/s.', ['9 J', '6 J', '18 J', '3 J'], 0, 'KE = ½mv² = ½ × 2 × 9 = 9 J.'],
    ['mechanics', 'Find the work done when a force of 10 N moves a body 5 m in the direction of the force.', ['50 J', '2 J', '15 J', '0.5 J'], 0, 'W = F × d = 10 × 5 = 50 J.'],
    ['heat-thermal-physics', 'The heat needed to raise the temperature of 1 kg of a substance by 1 K is its', ['specific heat capacity', 'latent heat', 'heat capacity', 'thermal conductivity'], 0, 'Specific heat capacity is per unit mass per unit temperature rise.'],
    ['heat-thermal-physics', 'Heat reaches the earth from the sun mainly by', ['radiation', 'conduction', 'convection', 'evaporation'], 0, 'Radiation needs no medium, so it crosses the vacuum of space.'],
    ['waves-optics', 'A wave has frequency 50 Hz and wavelength 4 m. Find its speed.', ['200 m/s', '12.5 m/s', '54 m/s', '0.08 m/s'], 0, 'v = fλ = 50 × 4 = 200 m/s.'],
    ['waves-optics', 'The bending of light as it passes from one medium into another is', ['refraction', 'reflection', 'diffraction', 'dispersion'], 0, 'Light changes speed between media and bends: refraction.'],
    ['electricity-magnetism', 'A current of 2 A flows through a 6 Ω resistor. Find the potential difference across it.', ['12 V', '3 V', '8 V', '0.33 V'], 0, 'V = IR = 2 × 6 = 12 V.'],
    ['electricity-magnetism', 'Two 4 Ω resistors are connected in parallel. Find their effective resistance.', ['2 Ω', '8 Ω', '4 Ω', '16 Ω'], 0, '1/R = 1/4 + 1/4 = 1/2, so R = 2 Ω.'],
    ['electricity-magnetism', 'The SI unit of electrical power is the', ['watt', 'volt', 'ohm', 'coulomb'], 0, 'Power is measured in watts (1 W = 1 J/s).'],
    ['modern-physics', 'The particle in the nucleus of an atom that has no electric charge is the', ['neutron', 'proton', 'electron', 'positron'], 0, 'Protons are positive, electrons negative and neutrons neutral.'],
  ],
};
