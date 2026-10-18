// Single source of truth for business data. Everything here is a PLACEHOLDER
// until the client confirms it — never hardcode these values in components.

export const business = {
  name: 'Handy Hab',
  // Wordmark is split so the logo can style the second part in orange.
  wordmark: { main: 'HANDY', accent: 'HAB' },

  phone: {
    display: '(213) 264-8266',
    e164: '+12132648266',
  },
  // Same number as the phone line (confirmed by client).
  whatsapp: '12132648266',
  email: 'HandyHab.hauling@gmail.com',

  address: {
    locality: 'Los Angeles',
    region: 'CA',
    country: 'US',
  },
  geo: { latitude: 34.0522, longitude: -118.2437 },

  // 24h format for schema.org; display text lives in the i18n files.
  hours: { days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], opens: '07:00', closes: '20:00' },

  // Placeholder list — client to confirm.
  serviceArea: [
    'Downtown LA',
    'Hollywood',
    'West Hollywood',
    'Silver Lake',
    'Echo Park',
    'Koreatown',
    'Santa Monica',
    'Venice',
    'Culver City',
    'Beverly Hills',
    'Westwood',
    'Mar Vista',
    'Inglewood',
    'Pasadena',
    'Glendale',
    'Burbank',
    'North Hollywood',
    'Studio City',
    'Sherman Oaks',
    'Van Nuys',
    'Encino',
    'Long Beach',
    'Torrance',
    'East LA',
  ],

  social: {
    instagram: '',
    facebook: '',
    yelp: '',
    google: '',
  },
} as const;

export const telHref = `tel:${business.phone.e164}`;
export const whatsappHref = (text?: string) =>
  `https://wa.me/${business.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
