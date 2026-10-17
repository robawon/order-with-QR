'use client';

import React from 'react';
import { I18nProvider } from '../lib/i18n';
import { ToastProvider } from './ui/Toast';

export function Providers({ children }) {
  return (
    <I18nProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </I18nProvider>
  );
}
