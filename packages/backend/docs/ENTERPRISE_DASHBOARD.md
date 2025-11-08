# Enterprise Dashboard

## Overview

The Enterprise Dashboard provides comprehensive analytics and management capabilities for enterprise license administrators. It enables monitoring of license usage, seat utilization, user activity, and generation of detailed reports.

## Features

### 1. Dashboard Statistics

Real-time metrics displayed on the dashboard:

- **Total Licenses**: Number of active and inactive licenses
- **Total Seats**: Aggregate seat count across all licenses
- **Used Seats**: Number of currently assigned seats
- **Utilization Rate**: Percentage of seats in use
- **Expiring Licenses**: Licenses expiring within 30 days
- **Total Usage**: Aggregate usage events across all licenses

### 2. Usage Analytics

Visual charts and graphs showing:

- **Seat Utilization**: Doughnut chart showing used vs available seats
- **Usage by Action**: Bar chart of different action types (view, download, share, etc.)
- **Top Users**: Bar chart of most active users
- **Usage Trends**: Time-series data for usage patterns

### 3. License Management

Comprehensive license overview table displaying:

- License key
- Content ID
- Seat allocation (used/total)
- Utilization percentage with visual indicator
- License status (active, expired, suspended)
- Expiration date with color-coded warnings
- Quick access to detailed management

### 4. User Management

Seat assignment and management:

- Assign seats to users by email
- Revoke seats from users
- Track last usage per seat
- View seat assignment history

### 5. Report Generation

Export detailed usage reports in multiple formats:

#### CSV Reports

Includes:
- License summary with seat allocation
- Detailed usage logs with timestamps
- Statistics (utilization, total events)
- Usage breakdown by action type
- Top 10 users by activity

#### PDF Reports

Professional formatted reports with:
- Company information header
- Summary statistics
- License details
- Usage analytics
- Top users list
- Generated timestamp

## API Endpoints

### Get Dashboard Statistics

```http
GET /api/v1/bulk-purchase/enterprises/:enterpriseId/dashboard?period=30d
```

**Query Parameters:**
- `period`: Time period for analytics (`7d`, `30d`, `90d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLicenses": 10,
    "activeLicenses": 8,
    "totalSeats": 150,
    "usedSeats": 120,
    "utilizationRate": 80.0,
    "expiringLicenses": 2,
    "totalUsage": 1500,
    "usageByAction": [
      { "action": "view", "count": 800 },
      { "action": "download", "count": 400 }
    ],
    "topUsers": [
      { "email": "user@example.com", "count": 150 }
    ]
  }
}
```

### Export Usage Report

```http
GET /api/v1/bulk-purchase/enterprises/:enterpriseId/reports/export?format=csv&period=30d
```

**Query Parameters:**
- `format`: Report format (`csv` or `pdf`)
- `period`: Time period (`7d`, `30d`, `90d`)

**Response:**
- CSV: `text/csv` content type
- PDF: `application/pdf` content type

### List Enterprise Licenses

```http
GET /api/v1/bulk-purchase/enterprises/:enterpriseId/licenses?limit=20&offset=0
```

**Query Parameters:**
- `limit`: Number of licenses per page (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "licenses": [...],
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

### Get License Details

```http
GET /api/v1/bulk-purchase/licenses/:licenseId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "license-id",
    "licenseKey": "LIC-...",
    "enterpriseId": "enterprise-id",
    "contentId": "content-id",
    "totalSeats": 50,
    "usedSeats": 40,
    "status": "active",
    "expiresAt": "2025-12-31T23:59:59Z",
    "seats": [...],
    "usageRecords": [...]
  }
}
```

### Get License Usage Statistics

```http
GET /api/v1/bulk-purchase/licenses/:licenseId/stats?startDate=2025-01-01&endDate=2025-01-31
```

**Query Parameters:**
- `startDate`: Start date for statistics (ISO 8601)
- `endDate`: End date for statistics (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsage": 500,
    "usageByAction": [
      { "action": "view", "_count": 300 },
      { "action": "download", "_count": 200 }
    ],
    "topUsers": [
      { "userEmail": "user@example.com", "_count": 50 }
    ]
  }
}
```

### Assign Seat

```http
POST /api/v1/bulk-purchase/licenses/:licenseId/seats/assign
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "userId": "user-id-optional"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "seat-id",
    "licenseId": "license-id",
    "userEmail": "user@example.com",
    "status": "active",
    "assignedAt": "2025-01-15T10:00:00Z"
  }
}
```

### Revoke Seat

```http
POST /api/v1/bulk-purchase/seats/:seatId/revoke
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "seat-id",
    "status": "revoked",
    "revokedAt": "2025-01-15T11:00:00Z"
  }
}
```

### Track Usage

```http
POST /api/v1/bulk-purchase/licenses/:licenseId/usage
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "action": "view",
  "metadata": {
    "sessionId": "session-123",
    "duration": 300
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usage-id",
    "licenseId": "license-id",
    "userEmail": "user@example.com",
    "action": "view",
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

## Frontend Components

### EnterpriseDashboard Component

Main dashboard component with:
- Key metrics cards
- Interactive charts (Chart.js)
- License table with sorting/filtering
- Period selector (7d, 30d, 90d)
- Export buttons (CSV, PDF)

**Usage:**
```tsx
import { EnterpriseDashboard } from '../components/EnterpriseDashboard';

function DashboardPage() {
  return <EnterpriseDashboard />;
}
```

### EnterpriseDashboardPage Component

Page wrapper with authentication and access control:
```tsx
import { EnterpriseDashboardPage } from '../pages/EnterpriseDashboardPage';

// In your router
<Route path="/enterprise/dashboard" element={<EnterpriseDashboardPage />} />
```

## Testing

Run the test script to verify functionality:

```bash
cd packages/backend
npm run test:enterprise-dashboard
```

Or manually:
```bash
npx ts-node src/scripts/test-enterprise-dashboard.ts
```

The test script will:
1. Create test enterprise account
2. Create multiple licenses
3. Assign seats to users
4. Track usage events
5. Generate dashboard statistics
6. Create CSV and PDF reports
7. Test seat management
8. Clean up test data

## Usage Examples

### Frontend Integration

```tsx
import React, { useEffect, useState } from 'react';

function MyDashboard() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/v1/bulk-purchase/enterprises/my-enterprise-id/dashboard?period=30d')
      .then(res => res.json())
      .then(data => setStats(data.data));
  }, []);
  
  return (
    <div>
      <h1>Dashboard</h1>
      {stats && (
        <div>
          <p>Total Licenses: {stats.totalLicenses}</p>
          <p>Utilization: {stats.utilizationRate.toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}
```

### Export Report

```tsx
async function exportReport(format: 'csv' | 'pdf') {
  const response = await fetch(
    `/api/v1/bulk-purchase/enterprises/my-enterprise-id/reports/export?format=${format}&period=30d`
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report.${format}`;
  a.click();
}
```

## Performance Considerations

1. **Caching**: Dashboard statistics are calculated on-demand. Consider implementing Redis caching for frequently accessed data.

2. **Pagination**: License lists support pagination to handle large datasets efficiently.

3. **Date Ranges**: Usage statistics queries are optimized with date range filters.

4. **Aggregation**: Usage data is aggregated at query time. For very large datasets, consider pre-aggregating data periodically.

## Security

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only access their own enterprise data
3. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
4. **Data Privacy**: Reports only include data for the authenticated enterprise

## Requirements Fulfilled

This implementation fulfills **REQ-1.5.1** from the requirements document:

✅ Show usage statistics per license
✅ Display active licenses and expiration dates
✅ Add user management (add/remove seats)
✅ Generate usage reports (CSV/PDF export)

## Next Steps

1. Add real-time WebSocket updates for live dashboard
2. Implement email notifications for expiring licenses
3. Add custom date range selector
4. Create scheduled report generation
5. Add data export to other formats (Excel, JSON)
6. Implement dashboard customization options
