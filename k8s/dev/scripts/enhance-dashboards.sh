#!/bin/bash
# Enhance Grafana Dashboards
# Adds missing panels and improves existing visualizations

set -e

DASHBOARD_DIR="$(dirname "$0")/../grafana-dashboards"

echo "🎨 Enhancing Grafana Dashboards"
echo "================================"
echo ""

# Backup existing dashboards
echo "📦 Creating backups..."
mkdir -p "${DASHBOARD_DIR}/backups"
cp "${DASHBOARD_DIR}"/*.json "${DASHBOARD_DIR}/backups/" 2>/dev/null || true
echo "✅ Backups created in ${DASHBOARD_DIR}/backups/"
echo ""

# List of enhancements
echo "📋 Planned Enhancements:"
echo "  1. Add Data Sync monitoring panel"
echo "  2. Add Kafka lag monitoring"
echo "  3. Add Cache hit rate panel"
echo "  4. Add Blockchain transaction monitoring"
echo "  5. Add Content upload success rate"
echo "  6. Add API endpoint breakdown"
echo "  7. Add Error rate by endpoint"
echo "  8. Add Database query performance"
echo ""

# Note: Actual panel additions would be done via JSON manipulation
# For now, we'll document what should be added

cat > "${DASHBOARD_DIR}/ENHANCEMENT_NOTES.md" << 'EOF'
# Dashboard Enhancement Notes

## Recommended Additional Panels

### Service Health Dashboard

1. **Data Sync Lag**
   - Metric: `knowton_data_sync_lag_seconds`
   - Type: Gauge
   - Threshold: Warning at 60s, Critical at 300s

2. **Kafka Consumer Lag**
   - Metric: `kafka_consumer_lag`
   - Type: Time series
   - Group by: topic, consumer_group

3. **Cache Hit Rate**
   - Metric: `redis_keyspace_hits / (redis_keyspace_hits + redis_keyspace_misses) * 100`
   - Type: Gauge
   - Target: > 80%

4. **Database Connection Pool**
   - Metric: `pg_stat_activity_count`
   - Type: Time series
   - Show: active, idle, waiting

### Business Metrics Dashboard

1. **Content Upload Success Rate**
   - Metric: `sum(rate(knowton_content_uploads_total{status="success"}[5m])) / sum(rate(knowton_content_uploads_total[5m])) * 100`
   - Type: Gauge
   - Target: > 95%

2. **Average NFT Price**
   - Metric: `sum(knowton_trading_volume_usd) / sum(knowton_marketplace_transactions_total)`
   - Type: Stat
   - Unit: USD

3. **Creator Earnings**
   - Metric: `sum by (creator) (knowton_royalty_payments_total)`
   - Type: Bar chart
   - Top 10 creators

4. **Platform Revenue Breakdown**
   - Metrics:
     - `knowton_marketplace_fees_usd`
     - `knowton_minting_fees_usd`
     - `knowton_subscription_revenue_usd`
   - Type: Pie chart

### Technical Dashboard

1. **API Endpoint Performance**
   - Metric: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))`
   - Type: Table
   - Sort by: P95 latency

2. **Error Rate by Endpoint**
   - Metric: `sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))`
   - Type: Bar chart
   - Threshold: > 0.01 (1%)

3. **Database Query Performance**
   - Metric: `histogram_quantile(0.95, sum(rate(knowton_database_query_duration_seconds_bucket[5m])) by (le, operation))`
   - Type: Time series
   - Group by: operation type

4. **Blockchain Transaction Status**
   - Metrics:
     - `knowton_blockchain_tx_pending`
     - `knowton_blockchain_tx_confirmed`
     - `knowton_blockchain_tx_failed`
   - Type: Stat panels

### Business Dashboard

1. **User Retention Rate**
   - Metric: `(sum(knowton_active_users_total{period="7d"}) / sum(knowton_total_users)) * 100`
   - Type: Gauge
   - Target: > 40%

2. **Content Category Trends**
   - Metric: `sum by (category) (rate(knowton_content_uploads_total[1h]))`
   - Type: Time series
   - Stacked area chart

3. **Geographic Distribution**
   - Metric: `sum by (country) (knowton_active_users_total)`
   - Type: Geomap
   - Requires geo data

4. **Platform Growth Rate**
   - Metrics:
     - `rate(knowton_total_users[7d])`
     - `rate(knowton_total_nfts[7d])`
     - `rate(knowton_total_revenue_usd[7d])`
   - Type: Stat panels with sparklines

## Implementation Priority

### High Priority (P0)
- Data Sync Lag
- Cache Hit Rate
- Content Upload Success Rate
- API Endpoint Performance

### Medium Priority (P1)
- Kafka Consumer Lag
- Error Rate by Endpoint
- Database Query Performance
- Average NFT Price

### Low Priority (P2)
- Creator Earnings
- Platform Revenue Breakdown
- User Retention Rate
- Geographic Distribution

## Testing Checklist

For each new panel:
- [ ] Query returns data in Prometheus
- [ ] Appropriate visualization type selected
- [ ] Thresholds configured (if applicable)
- [ ] Legend is clear and informative
- [ ] Time range works correctly
- [ ] Panel title is descriptive
- [ ] Units are specified
- [ ] Colors are meaningful
- [ ] Tooltip shows useful information
- [ ] Panel is positioned logically

## Maintenance

- Review panel usage monthly
- Remove unused panels
- Update queries for performance
- Add new metrics as features are added
- Keep documentation updated
EOF

echo "✅ Enhancement notes created: ${DASHBOARD_DIR}/ENHANCEMENT_NOTES.md"
echo ""

echo "📝 Summary:"
echo "  - Backups created"
echo "  - Enhancement notes documented"
echo "  - Ready for manual panel additions"
echo ""
echo "Next steps:"
echo "  1. Review ENHANCEMENT_NOTES.md"
echo "  2. Add high-priority panels manually in Grafana UI"
echo "  3. Export updated dashboards to JSON"
echo "  4. Commit changes to version control"
echo ""
echo "✅ Dashboard enhancement preparation complete!"
