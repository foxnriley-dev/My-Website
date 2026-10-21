import { createApiClient } from '@ife/api-client';
import { Platform } from 'react-native';
import { appConfig } from './config';
import { supabase } from './supabase';

export function createNativeApi(onUnauthenticated: () => void) {
  return createApiClient({
    baseUrl: appConfig.apiBaseUrl,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: appConfig.appVersion,
    getAccessToken: async () => (await supabase().auth.getSession()).data.session?.access_token ?? null,
    onUnauthenticated,
  });
}
