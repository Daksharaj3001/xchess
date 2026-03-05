/**
 * Firebase Client Configuration
 * 
 * This module initializes Firebase for browser-side analytics.
 * Firebase is used ONLY for analytics and telemetry in XChess.
 * 
 * All authentication and data storage is handled by Supabase.
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

/**
 * Get or initialize Firebase app
 * Uses singleton pattern to prevent multiple initializations
 */
export function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp()
  }
  return initializeApp(firebaseConfig)
}

/**
 * Get Firebase Analytics instance
 * Only works in browser environment
 * Returns null if analytics is not supported
 */
let analyticsInstance = null

export async function getFirebaseAnalytics() {
  if (typeof window === 'undefined') {
    return null
  }

  if (analyticsInstance) {
    return analyticsInstance
  }

  const supported = await isSupported()
  if (!supported) {
    console.warn('Firebase Analytics is not supported in this environment')
    return null
  }

  const app = getFirebaseApp()
  analyticsInstance = getAnalytics(app)
  return analyticsInstance
}

export default getFirebaseApp
