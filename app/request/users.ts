import { globalFetch } from '~/lib/fetch';
import type {
  CreateUserRequest,
  DeleteUserRequest,
  EditUserRequest,
  RoleListResponse,
  RolesParams,
  UserDetailsParams,
  UserDetailsResponse,
  UserListParams,
  UserListResponse,
} from '~/types/users';

export const getUserList = async (params: UserListParams) => {
  const response = await globalFetch('/company-management/company-contact/fetch-all', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response as UserListResponse;
};

export const getUserDetails = async (params: UserDetailsParams) => {
  const response = await globalFetch('/company-management/company-contact/get-by-id', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response as UserDetailsResponse;
};

export const deleteUser = async (params: DeleteUserRequest) => {
  const response = await globalFetch('/company-management/company-contact/delete', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response;
};

export const editUser = async (params: EditUserRequest) => {
  const response = await globalFetch('/company-management/contact-role-management/role-assign', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response;
};

export const getRoles = async (params: RolesParams) => {
  const response = await globalFetch('/company-management/contact-role-management/fetch-all', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response as RoleListResponse;
};

export const createUser = async (params: CreateUserRequest) => {
  const response = await globalFetch('/company-management/company-contact/create', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response;
};

export const getCustomerInformation = async (params: { storeName: string; customerId: string }) => {
  const response = await globalFetch('/customer-management/customer/get-by-id', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response;
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

const FEATURE_CACHE_KEY = 'feature_cache';
const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

export const getCachedFeatures = (storeName: string): CacheEntry<any> | null => {
  const cached = localStorage.getItem(`${FEATURE_CACHE_KEY}_${storeName}`);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > parsed.expiresIn) {
      localStorage.removeItem(`${FEATURE_CACHE_KEY}_${storeName}`);
      return null;
    }
    return parsed;
  } catch (e) {
    console.error('Error parsing cached features:', e);
    return null;
  }
};

const setCachedFeatures = (storeName: string, data: any, expiresIn = DEFAULT_CACHE_DURATION) => {
  const cacheEntry: CacheEntry<any> = {
    data,
    timestamp: Date.now(),
    expiresIn,
  };
  localStorage.setItem(`${FEATURE_CACHE_KEY}_${storeName}`, JSON.stringify(cacheEntry));
};

export const getFeatures = async (params: { storeName: string }) => {
  const cached = getCachedFeatures(params.storeName);
  if (cached) {
    return cached.data;
  }

  const response = await globalFetch('/store/features', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  setCachedFeatures(params.storeName, response);
  return response;
};
