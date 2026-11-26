// Shared Tailwind class strings, so focus and button styles stay consistent.

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

export const primaryButton = `inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const secondaryButton = `inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const textLink = `text-blue-700 underline hover:text-blue-900 ${focusRing}`;
