// In-memory stand-ins for native modules that do not exist in the Jest runtime.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      if (typeof v !== 'string') throw new Error('SecureStore only stores strings');
      if (v.length > 2048) throw new Error('Value too large for one SecureStore entry');
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      store.delete(k);
    }),
    __store: store,
  };
});
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()), fetch: jest.fn(async () => ({ isConnected: true })) }));
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test';
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://supabase.test';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
// Icon fonts are native assets; render the icon name as hidden text instead.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }) => React.createElement(Text, { accessibilityElementsHidden: true, importantForAccessibility: 'no' }, `icon:${name}`);
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Image: (props) => React.createElement(View, { accessibilityLabel: props.accessibilityLabel }) };
});
