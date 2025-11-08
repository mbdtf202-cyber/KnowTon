import React, { useEffect, useState } from 'react';
import { useRevenueForecast } from '../hooks/useRevenueForecast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const RevenueForecastDashboard: React.FC = () => {
  const { report, loading, error, generateReport, exportToPDF, exportToCSV } = useRevenueForecast();
  const [historicalDays, setHistoricalDays] = useState(90);
  const [forecastDays, setForecastDays] = useState(30);

  useEffect(() => {
    generateReport(historicalDays, forecastDays);
  }, []);

  const handleGenerate = () => {
    generateReport(historicalDays, forecastDays);
  };

  const handleExportPDF = () => {
    exportToPDF(historicalDays, forecastDays);
  };

  const handleExportCSV = () => {
    exportToCSV(historicalDays, forecastDays);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No forecast data available</p>
      </div>
    );
  }

  // Prepare chart data
  const forecastChartData = report.forecast.predictions.map((pred) => ({
    date: new Date(pred.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: pred.value,
  }));

  const categoryChartData = report.breakdown.byCategory.map((cat) => ({
    name: cat.category,
    historical: cat.historicalRevenue,
    forecasted: cat.forecastedRevenue,
  }));

  const paymentMethodChartData = report.breakdown.byPaymentMethod.map((pm) => ({
    name: pm.method,
    value: pm.forecastedRevenue,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Revenue Forecast</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Export PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex space-x-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Historical Days
            </label>
            <input
              type="number"
              value={historicalDays}
              onChange={(e) => setHistoricalDays(parseInt(e.target.value))}
              min="7"
              max="365"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forecast Days
            </label>
            <input
              type="number"
              value={forecastDays}
              onChange={(e) => setForecastDays(parseInt(e.target.value))}
              min="1"
              max="90"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Generate
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Generated: {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Historical Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">
            ${report.summary.totalHistoricalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Forecasted Revenue</h3>
          <p className="text-2xl font-bold text-blue-600">
            ${report.summary.totalForecastedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Growth Rate</h3>
          <p className={`text-2xl font-bold ${report.summary.projectedGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {report.summary.projectedGrowthRate.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Confidence</h3>
          <p className="text-2xl font-bold text-gray-900">
            {report.summary.confidence}%
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                report.summary.confidence >= 80
                  ? 'bg-green-600'
                  : report.summary.confidence >= 60
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${report.summary.confidence}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Forecast</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecastChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#0088FE"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Forecasted Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown */}
      {report.breakdown.byCategory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="historical" fill="#8884D8" name="Historical" />
              <Bar dataKey="forecasted" fill="#82CA9D" name="Forecasted" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment Method Distribution */}
      {report.breakdown.byPaymentMethod.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Forecasted Revenue by Payment Method
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethodChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentMethodChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Seasonal Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seasonal Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Peak Days</h4>
            <div className="flex flex-wrap gap-2">
              {report.seasonalInsights.peakDays.map((day) => (
                <span
                  key={day}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Low Days</h4>
            <div className="flex flex-wrap gap-2">
              {report.seasonalInsights.lowDays.map((day) => (
                <span
                  key={day}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
        <ul className="space-y-2">
          {report.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                {index + 1}
              </span>
              <span className="text-gray-700">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
