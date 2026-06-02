// Stripe publishable key — distintos modos según build.
//
// El publishable key NO es secreto: aparece embebido en el bundle JS y
// se manda al cliente. Sólo la SECRET key es sensible (vive en el backend
// Laravel, no aquí).
//
// Si en algún momento queremos rotarla sin rebuild, el backend devuelve
// también la publishableKey en la respuesta de /api/checkout/payment-sheet,
// y usamos esa en lugar de esta. Ver CheckoutScreen.tsx.
//
// Placeholder válido (modo test de Stripe) hasta que el cliente nos pase
// la real de la agencia. La app no peta con esto: si se intenta cobrar
// con un PI generado en otra cuenta, Stripe devuelve error legible.
export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_placeholder_real_key_pendiente';
