/**
 * Localization Test Component
 * Demonstrates and tests all localization features including:
 * - Date/time formatting
 * - Currency formatting
 * - Number formatting
 * - RTL support
 * - Layout testing
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalization } from '../i18n';
import { SUPPORTED_LANGUAGES } from '../i18n/config';

const LocalizationTest: React.FC = () => {
  const { i18n } = useTranslation();
  const {
    t,
    locale,
    changeLanguage,
    formatDate,
    formatDateTime,
    formatTime,
    formatRelativeTime,
    formatCurrency,
    formatNumber,
    formatPercentage,
    formatCompactNumber,
    getCurrencySymbol,
    direction,
    isRTL,
    formatFileSize,
    formatDuration,
    formatList,
  } = useLocalization();

  const [testDate] = useState(new Date('2025-01-15T14:30:00'));
  const [testAmount] = useState(1234567.89);
  const [testNumber] = useState(9876543.21);
  const [testPercentage] = useState(0.1234);
  const [testBytes] = useState(1234567890);
  const [testSeconds] = useState(3665);

  const currencies = ['USD', 'EUR', 'CNY', 'JPY', 'GBP'];

  return (
    <div className={`min-h-screen bg-gray-50 p-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={direction}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">
            {t('common.localization') || 'Localization Test'}
          </h1>
          <p className="text-gray-600 mb-4">
            Current Locale: <span className="font-semibold">{locale}</span> | 
            Direction: <span className="font-semibold">{direction.toUpperCase()}</span> | 
            RTL: <span className="font-semibold">{isRTL ? 'Yes' : 'No'}</span>
          </p>

          {/* Language Switcher */}
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  locale === lang.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {lang.nativeName}
              </button>
            ))}
          </div>
        </div>

        {/* Date/Time Formatting */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Date & Time Formatting</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Date (Long)</p>
                <p className="font-semibold">{formatDate(testDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date (Short)</p>
                <p className="font-semibold">
                  {formatDate(testDate, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-semibold">{formatDateTime(testDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time Only</p>
                <p className="font-semibold">{formatTime(testDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Relative Time (2 hours ago)</p>
                <p className="font-semibold">
                  {formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Relative Time (5 days ago)</p>
                <p className="font-semibold">
                  {formatRelativeTime(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Currency Formatting */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Currency Formatting</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currencies.map((currency) => (
                <div key={currency}>
                  <p className="text-sm text-gray-600">
                    {currency} ({getCurrencySymbol(currency)})
                  </p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(testAmount, currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">Compact Currency (USD)</p>
              <p className="font-semibold text-lg">
                {formatCurrency(testAmount, 'USD', { notation: 'compact' })}
              </p>
            </div>
          </div>
        </div>

        {/* Number Formatting */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Number Formatting</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Standard Number</p>
                <p className="font-semibold">{formatNumber(testNumber)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Compact Number</p>
                <p className="font-semibold">{formatCompactNumber(testNumber)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Percentage (12.34%)</p>
                <p className="font-semibold">{formatPercentage(testPercentage)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Percentage (Normalized)</p>
                <p className="font-semibold">{formatPercentage(12.34, true)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">File Size</p>
                <p className="font-semibold">{formatFileSize(testBytes)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-semibold">{formatDuration(testSeconds)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* List Formatting */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">List Formatting</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Conjunction (and)</p>
              <p className="font-semibold">
                {formatList(['Alice', 'Bob', 'Charlie'], 'conjunction')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Disjunction (or)</p>
              <p className="font-semibold">
                {formatList(['Red', 'Green', 'Blue'], 'disjunction')}
              </p>
            </div>
          </div>
        </div>

        {/* RTL Layout Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">RTL Layout Test</h2>
          <div className="space-y-4">
            {/* Flex Layout */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Flex Layout (Auto-reverses in RTL)</p>
              <div className="flex gap-2">
                <div className="bg-blue-500 text-white px-4 py-2 rounded">First</div>
                <div className="bg-green-500 text-white px-4 py-2 rounded">Second</div>
                <div className="bg-red-500 text-white px-4 py-2 rounded">Third</div>
              </div>
            </div>

            {/* Text Alignment */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Text Alignment (Auto-adjusts)</p>
              <div className="border p-4 rounded">
                <p className="text-start">This text aligns to the start (left in LTR, right in RTL)</p>
                <p className="text-end">This text aligns to the end (right in LTR, left in RTL)</p>
              </div>
            </div>

            {/* Grid Layout */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Grid Layout</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-purple-500 text-white p-4 rounded text-center">1</div>
                <div className="bg-purple-500 text-white p-4 rounded text-center">2</div>
                <div className="bg-purple-500 text-white p-4 rounded text-center">3</div>
              </div>
            </div>

            {/* Form Layout */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Form Layout</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="w-24 text-sm">Name:</label>
                  <input
                    type="text"
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Enter name"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-24 text-sm">Email:</label>
                  <input
                    type="email"
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Enter email"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Translation Test */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Translation Test</h2>
          <div className="space-y-2">
            <p><strong>Common.connect:</strong> {t('common.connect')}</p>
            <p><strong>Common.loading:</strong> {t('common.loading')}</p>
            <p><strong>Nav.home:</strong> {t('nav.home')}</p>
            <p><strong>Nav.marketplace:</strong> {t('nav.marketplace')}</p>
            <p><strong>Wallet.balance:</strong> {t('wallet.balance')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalizationTest;
