
import { User, Doctor, Pharmacy, Product, Region, VisitReport, ClientAlert, SystemSettings, WeeklyPlan } from '../types';

// Cache configuration
const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
const CACHE_PREFIX = 'sanivita_crm_cache_';

// Cache item structure
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// Cache storage
const cacheStore: Record<string, CacheItem<any>> = {};

// Helper functions
const isExpired = (cacheItem: CacheItem<any>): boolean => {
  return Date.now() > cacheItem.expiry;
};

const getCacheKey = (key: string): string => {
  return `${CACHE_PREFIX}${key}`;
};

// Cache API
export const cacheService = {
  // Get data from cache
  get: <T>(key: string): T | null => {
    const cacheKey = getCacheKey(key);
    const cacheItem = cacheStore[cacheKey];

    if (!cacheItem) {
      return null;
    }

    if (isExpired(cacheItem)) {
      delete cacheStore[cacheKey];
      return null;
    }

    return cacheItem.data as T;
  },

  // Set data in cache
  set: <T>(key: string, data: T, customExpiry?: number): void => {
    const cacheKey = getCacheKey(key);
    const expiry = customExpiry || (Date.now() + CACHE_EXPIRY_TIME);

    cacheStore[cacheKey] = {
      data,
      timestamp: Date.now(),
      expiry
    };
  },

  // Remove specific item from cache
  remove: (key: string): void => {
    const cacheKey = getCacheKey(key);
    delete cacheStore[cacheKey];
  },

  // Clear all cache
  clear: (): void => {
    Object.keys(cacheStore).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        delete cacheStore[key];
      }
    });
  },

  // Check if item exists and is not expired
  has: (key: string): boolean => {
    const cacheKey = getCacheKey(key);
    const cacheItem = cacheStore[cacheKey];

    if (!cacheItem) {
      return false;
    }

    if (isExpired(cacheItem)) {
      delete cacheStore[cacheKey];
      return false;
    }

    return true;
  }
};

// Cache keys
export const CacheKeys = {
  USERS: 'users',
  REGIONS: 'regions',
  DOCTORS: 'doctors',
  PHARMACIES: 'pharmacies',
  PRODUCTS: 'products',
  VISITS: 'visits',
  ALERTS: 'alerts',
  SYSTEM_SETTINGS: 'system_settings',
  WEEKLY_PLAN: 'weekly_plan',
  // Dynamic keys
  USER_PROFILE: (userId: string) => `user_profile_${userId}`,
  DOCTORS_BY_REGION: (regionId: number) => `doctors_region_${regionId}`,
  PHARMACIES_BY_REGION: (regionId: number) => `pharmacies_region_${regionId}`,
  VISITS_BY_DATE_RANGE: (startDate: string, endDate: string) => `visits_${startDate}_${endDate}`,
  VISITS_BY_REP: (repId: string) => `visits_rep_${repId}`,
};
