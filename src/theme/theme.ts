import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

const brand = { primary: '#1B7F5A', secondary: '#4F6358', tertiary: '#3C6472' };

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#A4F2CE',
    onPrimaryContainer: '#002115',
    secondary: brand.secondary,
    tertiary: brand.tertiary,
    background: '#F6FBF6',
    surface: '#F6FBF6',
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#88D6B3',
    onPrimary: '#003826',
    primaryContainer: '#005139',
    onPrimaryContainer: '#A4F2CE',
    secondary: '#B6CCBF',
    tertiary: '#A4CDDC',
    background: '#0F1512',
    surface: '#0F1512',
  },
};
