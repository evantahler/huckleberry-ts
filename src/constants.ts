// Firebase configuration for the Huckleberry app (project "simpleintervals").
// The Web API key is public — Huckleberry's security is enforced by Firebase
// Security Rules, not by secrecy of this key. Rules block direct Firestore REST
// calls, so every client must authenticate via the Firebase Auth + SDK path.
// Values sourced verbatim from py-huckleberry-api/src/huckleberry_api/const.py.
export const FIREBASE_API_KEY = "AIzaSyApGVHktXeekGyAt-G6dIeWHUkq2oXqcjg";
export const FIREBASE_PROJECT_ID = "simpleintervals";
export const FIREBASE_APP_ID = "1:219218185774:android:a3e215cc246b92b0";
export const FIREBASE_AUTH_DOMAIN = `${FIREBASE_PROJECT_ID}.firebaseapp.com`;
export const FIREBASE_STORAGE_BUCKET = `${FIREBASE_PROJECT_ID}.appspot.com`;

export const CURATED_FOODS_STORAGE_PATH = "foods/fooddb.json";
