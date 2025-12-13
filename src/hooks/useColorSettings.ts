import { useState, useEffect } from 'react';

export interface ColorSettings {
  flightTypes: {
    charter: string;
    schedule: string;
    acmi: string;
  };
  statuses: {
    operational: string;
    aog: string;
    maintenance: string;
    cancelled: string;
  };
  positioning: {
    live_flight: string;
    ferry_flight: string;
  };
}

const defaultColors: ColorSettings = {
  flightTypes: {
    charter: '#8b5cf6', // purple
    schedule: '#3b82f6', // blue
    acmi: '#f97316', // orange
    maintenance: '#eab308', // yellow (same as status)
  },
  statuses: {
    operational: '#22c55e', // green
    aog: '#ef4444', // red
    maintenance: '#eab308', // yellow
    cancelled: '#6b7280', // gray
  },
  positioning: {
    live_flight: '#3b82f6', // blue
    ferry_flight: '#f97316', // orange dashed
  },
};

const STORAGE_KEY = 'aircraft-color-settings';

export function useColorSettings() {
  const [colors, setColors] = useState<ColorSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load color settings:', e);
    }
    return defaultColors;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      console.error('Failed to save color settings:', e);
    }
  }, [colors]);

  const updateColor = (
    category: keyof ColorSettings,
    key: string,
    color: string
  ) => {
    setColors((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: color,
      },
    }));
  };

  const resetColors = () => {
    setColors(defaultColors);
  };

  return { colors, updateColor, resetColors, defaultColors };
}
