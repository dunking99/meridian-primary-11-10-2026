// Meridian Configuration
// AI features use Google Gemini (free tier).
// Get a free key at https://aistudio.google.com → "Get API Key" (no card needed).
// You can paste the key in the app's Settings page instead of editing this file.
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
// Model used for all AI features. Pro-series models are paid-only on the free
// tier — stick to a Flash model. If this ever returns a 404, check
// https://ai.google.dev/gemini-api/docs/models for a currently-available one.
export const GEMINI_MODEL = "gemini-3.6-flash";

// Where the Meridian API is. Unset, it is the normal local server on 4001; a
// test instance run beside it (API on 3101, Vite on 5273) sets
// VITE_MERIDIAN_API=http://localhost:3101 so the two never cross.
export const API_BASE = import.meta.env.VITE_MERIDIAN_API || "http://localhost:4001";
