import { useColorScheme } from 'react-native';

export interface AppTheme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  danger: string;
  dangerBg: string;
}

const LIGHT_THEME: AppTheme = {
  isDark: false,
  background: '#F6F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F6',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  primary: '#1D5D9B',
  onPrimary: '#FFFFFF',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
};

const DARK_THEME: AppTheme = {
  isDark: true,
  background: '#101318',
  surface: '#171B22',
  surfaceAlt: '#222833',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#2A313D',
  primary: '#38BDF8',
  onPrimary: '#0F172A',
  danger: '#F87171',
  dangerBg: '#3B181C',
};

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK_THEME : LIGHT_THEME;
}
