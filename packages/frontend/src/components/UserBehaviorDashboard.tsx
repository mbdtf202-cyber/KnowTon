import React, { useState, useEffect } from 'react';
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
  ScatterChart,
  Scatter,
} from 'recharts';
import { useUserBehaviorAnalytics, TimeRange } from '../hooks/useUserBehaviorAnalytics';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const UserBehaviorDashboard: React.FC = () => {
  const {
    loading,
    error,
    getUserJourneys,
    getFunnelAnalysis,
    getContentHeatmap,
    getCohortAnalysis,
    getEngagementPatterns,
  } = useUserBehaviorAnalytics();

  const [timeRange, setTimeRange] = useState<TimeRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });

  const [activeTab, setActiveTab] = useState<'journeys' | 'funnel' | 'heatmap' | 'cohorts' | 'engagement'>('funnel');
  const [funnelData, setFunnelData] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [cohortData, setCohortData] = useState<any[]>([]);
  const [engagementData, setEngagementData] = useState<any>(null);
  const [journeyData, setJourneyData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      // Load all analytics data
      const [funnel, heatmap, cohorts, engagement, journeys] = await Promise.all([
        getFunnelAnalysis(timeRange),
        getContentHeatmap(timeRange),
        getCohortAnalysis('weekly', 12),
        getEngagementPatterns(timeRange),
        getUserJourneys(timeRange, undefined, 50),
      ]);

      setFunnelData(funnel);
      setHeatmapData(heatmap);
      setCohortData(cohorts);
      setEngagementData(engagement);
      setJourneyData(journeys);
    } catch (err) {
      console.error('Error loading behavior analytics:', err);
    }
  };

  const renderFunnelAnalysis = () => {
    if (!funnelData) return <div className="text-center py-8">Loading funnel data...</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{funnelData.totalUsers.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Conversion Rate</h3>
            <p className="text-3xl font-bold text-green-600">{funnelData.overallConversionRate.toFixed(2)}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Avg. Time to Convert</h3>
            <p className="text-3xl font-bold text-purple-600">
              {Math.floor(funnelData.averageTimeToConvert / 60)}m {funnelData.averageTimeToConvert % 60}s
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Conversion Funnel</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={funnelData.stages} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="users" fill="#8884d8" name="Users" />
              <Bar dataKey="conversionRate" fill="#82ca9d" name="Conversion %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Stage Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dropoff Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {funnelData.stages.map((stage: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                      {stage.stage.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stage.users.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {stage.conversionRate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {stage.dropoffRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderContentHeatmap = () => {
    if (heatmapData.length === 0) return <div className="text-center py-8">Loading heatmap data...</div>;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Content Engagement Heatmap</h3>
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="position.x" name="X" type="number" domain={[0, 1]} />
              <YAxis dataKey="position.y" name="Y" type="number" domain={[0, 1]} />
              <Tooltip
                content={({ payload }) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-4 rounded shadow-lg border">
                        <p className="font-semibold">{data.title}</p>
                        <p className="text-sm text-gray-600">{data.category}</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>Views: {data.views.toLocaleString()}</p>
                          <p>Likes: {data.likes.toLocaleString()}</p>
                          <p>Shares: {data.shares.toLocaleString()}</p>
                          <p>Purchases: {data.purchases.toLocaleString()}</p>
                          <p className="font-semibold">Score: {data.engagementScore.toFixed(0)}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                data={heatmapData}
                fill="#8884d8"
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  const size = Math.min(50, Math.max(10, payload.engagementScore / 100));
                  const opacity = Math.min(1, payload.engagementScore / 1000);
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={size}
                      fill="#8884d8"
                      opacity={opacity}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Top Content by Engagement</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Likes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {heatmapData.slice(0, 10).map((content, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {content.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{content.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {content.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {content.likes.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {content.purchases.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {content.engagementScore.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCohortAnalysis = () => {
    if (cohortData.length === 0) return <div className="text-center py-8">Loading cohort data...</div>;

    // Prepare retention data for chart
    const retentionChartData = cohortData.map((cohort) => {
      const data: any = { cohort: cohort.cohortDate };
      Object.keys(cohort.retention).forEach((key) => {
        data[key] = cohort.retention[key];
      });
      return data;
    });

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Cohort Retention Analysis</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={retentionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cohort" />
              <YAxis label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {Object.keys(cohortData[0]?.retention || {}).map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  name={key.replace('period_', 'Week ')}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Cohort Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  {Object.keys(cohortData[0]?.retention || {}).slice(0, 6).map((key) => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {key.replace('period_', 'W')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cohortData.map((cohort, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cohort.cohortDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cohort.cohortSize.toLocaleString()}
                    </td>
                    {Object.keys(cohort.retention).slice(0, 6).map((key) => (
                      <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 rounded ${
                            cohort.retention[key] > 50
                              ? 'bg-green-100 text-green-800'
                              : cohort.retention[key] > 25
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cohort.retention[key].toFixed(1)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderEngagementPatterns = () => {
    if (!engagementData) return <div className="text-center py-8">Loading engagement data...</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Hourly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData.hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="events" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Day of Week Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData.dayOfWeekActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="events" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Top User Actions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={engagementData.topActions}
                dataKey="count"
                nameKey="action"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {engagementData.topActions.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderUserJourneys = () => {
    if (journeyData.length === 0) return <div className="text-center py-8">Loading journey data...</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Journeys</h3>
            <p className="text-3xl font-bold text-blue-600">{journeyData.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Converted</h3>
            <p className="text-3xl font-bold text-green-600">
              {journeyData.filter((j) => j.converted).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Avg. Duration</h3>
            <p className="text-3xl font-bold text-purple-600">
              {Math.floor(journeyData.reduce((sum, j) => sum + j.duration, 0) / journeyData.length / 60)}m
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Recent User Journeys</h3>
          <div className="space-y-4">
            {journeyData.slice(0, 10).map((journey, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Session: {journey.sessionId.slice(0, 8)}...</p>
                    <p className="text-xs text-gray-500">User: {journey.userAddress.slice(0, 10)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {Math.floor(journey.duration / 60)}m {journey.duration % 60}s
                    </p>
                    {journey.converted && (
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        Converted
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {journey.events.map((event, eventIndex) => (
                    <span
                      key={eventIndex}
                      className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {event.eventType.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">User Behavior Analytics</h1>
        
        {/* Time Range Selector */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() =>
              setTimeRange({
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
              })
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Last 7 Days
          </button>
          <button
            onClick={() =>
              setTimeRange({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
              })
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Last 30 Days
          </button>
          <button
            onClick={() =>
              setTimeRange({
                startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
              })
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Last 90 Days
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          {['funnel', 'heatmap', 'cohorts', 'engagement', 'journeys'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      )}

      {!loading && (
        <>
          {activeTab === 'funnel' && renderFunnelAnalysis()}
          {activeTab === 'heatmap' && renderContentHeatmap()}
          {activeTab === 'cohorts' && renderCohortAnalysis()}
          {activeTab === 'engagement' && renderEngagementPatterns()}
          {activeTab === 'journeys' && renderUserJourneys()}
        </>
      )}
    </div>
  );
};
