# Enterprise Dashboard - Quick Start Guide

## Overview

The Enterprise Dashboard provides a comprehensive view of license usage, seat allocation, and user activity for enterprise accounts.

## Quick Setup

### 1. Install Dependencies

```bash
cd packages/frontend
npm install chart.js react-chartjs-2
```

### 2. Add Route

Add the dashboard route to your React Router configuration:

```tsx
import { EnterpriseDashboardPage } from './pages/EnterpriseDashboardPage';

// In your routes
<Route path="/enterprise/dashboard" element={<EnterpriseDashboardPage />} />
```

### 3. Access Dashboard

Navigate to `/enterprise/dashboard` in your application. You must be logged in with an enterprise account.

## Key Features

### 📊 Dashboard Statistics

View real-time metrics:
- Total licenses and active count
- Seat allocation and utilization rate
- Expiring licenses (within 30 days)
- Total usage events

### 📈 Visual Analytics

Interactive charts showing:
- Seat utilization (doughnut chart)
- Usage by action type (bar chart)
- Top users by activity (bar chart)

### 📋 License Management

Comprehensive license table with:
- License key and content ID
- Seat usage (used/total)
- Utilization percentage with visual indicator
- Status and expiration date
- Quick access to detailed management

### 👥 User Management

- Assign seats to users by email
- Revoke seats from users
- Track last usage per seat
- View seat assignment history

### 📄 Report Generation

Export detailed reports in:
- **CSV**: Detailed data for analysis
- **PDF**: Professional formatted reports

## API Usage

### Get Dashboard Stats

```bash
curl -X GET \
  'http://localhost:3001/api/v1/bulk-purchase/enterprises/ENTERPRISE_ID/dashboard?period=30d' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Export CSV Report

```bash
curl -X GET \
  'http://localhost:3001/api/v1/bulk-purchase/enterprises/ENTERPRISE_ID/reports/export?format=csv&period=30d' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -o report.csv
```

### Export PDF Report

```bash
curl -X GET \
  'http://localhost:3001/api/v1/bulk-purchase/enterprises/ENTERPRISE_ID/reports/export?format=pdf&period=30d' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -o report.pdf
```

### List Licenses

```bash
curl -X GET \
  'http://localhost:3001/api/v1/bulk-purchase/enterprises/ENTERPRISE_ID/licenses?limit=20&offset=0' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Get License Usage Stats

```bash
curl -X GET \
  'http://localhost:3001/api/v1/bulk-purchase/licenses/LICENSE_ID/stats' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Assign Seat

```bash
curl -X POST \
  'http://localhost:3001/api/v1/bulk-purchase/licenses/LICENSE_ID/seats/assign' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "userEmail": "user@example.com"
  }'
```

### Revoke Seat

```bash
curl -X POST \
  'http://localhost:3001/api/v1/bulk-purchase/seats/SEAT_ID/revoke' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Track Usage

```bash
curl -X POST \
  'http://localhost:3001/api/v1/bulk-purchase/licenses/LICENSE_ID/usage' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "userEmail": "user@example.com",
    "action": "view",
    "metadata": {
      "sessionId": "session-123"
    }
  }'
```

## Testing

### Run Test Script

```bash
cd packages/backend
npx ts-node src/scripts/test-enterprise-dashboard.ts
```

This will:
1. Create test enterprise and licenses
2. Assign seats and track usage
3. Generate dashboard statistics
4. Create CSV and PDF reports
5. Test seat management
6. Clean up test data

### Expected Output

```
🧪 Testing Enterprise Dashboard...

1️⃣ Creating test enterprise account...
✅ Enterprise created: enterprise-id

2️⃣ Creating test licenses...
✅ License 1 created: LIC-...
✅ License 2 created: LIC-...
✅ License 3 created: LIC-...

3️⃣ Assigning seats to users...
✅ Assigned 5 seats to license LIC-...

4️⃣ Tracking usage events...
✅ Tracked 60 usage events across all licenses

5️⃣ Fetching dashboard statistics...
Dashboard Stats:
  - Total Licenses: 3
  - Active Licenses: 3
  - Total Seats: 35
  - Used Seats: 15
  - Utilization Rate: 42.86%
  - Expiring Licenses: 0
  - Total Usage: 60

6️⃣ Fetching license usage statistics...
License LIC-...:
  - Total Usage: 20
  - Actions: 5 types
  - Top Users: 5

7️⃣ Generating CSV report...
✅ CSV report saved to: test-reports/enterprise-report.csv

8️⃣ Generating PDF report...
✅ PDF report saved to: test-reports/enterprise-report.pdf

✅ All Enterprise Dashboard tests passed!
```

## Frontend Integration Example

```tsx
import React from 'react';
import { EnterpriseDashboard } from '../components/EnterpriseDashboard';

function MyDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EnterpriseDashboard />
      </div>
    </div>
  );
}
```

## Common Use Cases

### 1. Monitor License Utilization

Check which licenses are underutilized:
- View utilization percentage in the license table
- Color-coded indicators (green < 50%, yellow 50-80%, red > 80%)
- Identify licenses with low usage

### 2. Track User Activity

Identify most active users:
- View "Top Users" chart
- Export detailed usage reports
- Analyze usage patterns by action type

### 3. Manage Expiring Licenses

Stay ahead of license renewals:
- "Expiring Soon" metric shows licenses expiring within 30 days
- Color-coded expiration dates in license table
- Export reports for renewal planning

### 4. Add/Remove Users

Manage seat assignments:
1. Click "Manage" on a license
2. Click "Assign Seat" button
3. Enter user email
4. Click "Assign"

To revoke:
1. Find user in seats table
2. Click "Revoke" button
3. Confirm action

### 5. Generate Reports

For compliance or analysis:
1. Select time period (7d, 30d, 90d)
2. Click "Export CSV" or "Export PDF"
3. Report downloads automatically

## Troubleshooting

### Dashboard Not Loading

**Issue**: Dashboard shows loading spinner indefinitely

**Solution**:
- Check browser console for errors
- Verify API endpoint is accessible
- Ensure user has enterprise account
- Check authentication token is valid

### No Data Showing

**Issue**: Dashboard loads but shows zero for all metrics

**Solution**:
- Verify enterprise has licenses created
- Check database for license records
- Ensure correct enterprise ID is being used

### Export Fails

**Issue**: Report export returns error

**Solution**:
- Check backend logs for errors
- Verify PDFKit is installed: `npm install pdfkit`
- Ensure write permissions for temp files
- Check disk space availability

### Charts Not Rendering

**Issue**: Charts show blank or error

**Solution**:
- Verify Chart.js is installed: `npm install chart.js react-chartjs-2`
- Check browser console for Chart.js errors
- Ensure data format matches chart requirements

## Performance Tips

1. **Use Pagination**: For enterprises with many licenses, use pagination in API calls
2. **Cache Results**: Consider caching dashboard stats for 5-10 minutes
3. **Limit Date Ranges**: Use shorter periods (7d, 30d) for faster queries
4. **Async Loading**: Load charts and tables independently for faster initial render

## Security Notes

1. **Authentication Required**: All endpoints require valid JWT token
2. **Enterprise Isolation**: Users can only access their own enterprise data
3. **Rate Limiting**: API calls are rate-limited to prevent abuse
4. **Audit Logging**: All seat assignments and revocations are logged

## Next Steps

1. Explore detailed license management at `/enterprise/licenses/:id`
2. Set up automated reports via email
3. Configure alerts for expiring licenses
4. Integrate with your billing system
5. Customize dashboard metrics

## Support

For issues or questions:
- Check the full documentation: `ENTERPRISE_DASHBOARD.md`
- Review API reference
- Run test script to verify setup
- Check backend logs for errors

## Requirements Fulfilled

✅ **REQ-1.5.1**: Bulk Purchase & Licensing
- Show usage statistics per license
- Display active licenses and expiration dates
- Add user management (add/remove seats)
- Generate usage reports (CSV/PDF export)
