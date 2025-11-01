# Plagiarism Detection - Quick Start Guide

## Overview

This guide will help you quickly understand and use the plagiarism detection system integrated into the KnowTon platform.

## How It Works

1. **Upload Content**: User uploads a file through the platform
2. **Automatic Scan**: System automatically checks for similar content
3. **Action Taken**:
   - **< 85% similar**: ✅ Approved automatically
   - **85-95% similar**: ⚠️ Warning shown, upload proceeds
   - **≥ 95% similar**: ❌ Upload rejected, appeal available

## For Content Creators

### What Happens When You Upload

After uploading your content, the system will:
1. Validate the file (type, size, malware)
2. Extract metadata (title, duration, etc.)
3. **Check for plagiarism** using AI fingerprinting
4. Show you the results

### If Your Upload is Flagged

#### Warning (85-95% similarity)
- Your upload will proceed
- You'll see a warning message
- Review the similar content shown
- Ensure you have proper rights

#### Rejected (≥95% similarity)
- Your upload will be blocked
- You can submit an appeal
- Provide evidence of original work
- Admin will review within 48 hours

### How to Submit an Appeal

1. Click "Submit Appeal" on the rejection notice
2. Write a detailed explanation (minimum 50 characters)
3. Provide evidence:
   - Links to your portfolio
   - Creation process documentation
   - Original work timestamps
   - Any other proof of ownership
4. Submit and wait for review (typically 48 hours)

### Appeal Tips

✅ **Do:**
- Be specific about why it's your original work
- Provide concrete evidence (URLs, documents)
- Explain your creation process
- Include timestamps or version history

❌ **Don't:**
- Submit vague or generic reasons
- Claim ownership without proof
- Appeal multiple times for the same content
- Provide false information

## For Developers

### Quick Integration

The plagiarism detection is already integrated into the upload flow. No additional code needed!

```typescript
// Upload service automatically calls plagiarism detection
// after file validation and metadata extraction

// In upload.service.ts:
const plagiarismResult = await plagiarismService.detectOnUpload(
  uploadId,
  contentUrl,
  contentType
);
```

### Check Detection Results

```typescript
// Frontend: Check if upload was flagged
import { usePlagiarismDetection } from '../hooks/usePlagiarismDetection';

function MyComponent() {
  const { detection, loading } = usePlagiarismDetection(uploadId);
  
  if (detection?.action === 'rejected') {
    return <PlagiarismWarning {...detection} />;
  }
  
  return <UploadSuccess />;
}
```

### Submit Appeal Programmatically

```typescript
// Backend API call
const response = await fetch('/api/v1/plagiarism/appeal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    detectionId: 'detection-123',
    reason: 'Detailed explanation...',
    evidence: {
      urls: ['https://example.com/proof'],
      description: 'Additional context'
    }
  })
});
```

## For Administrators

### Review Appeals

```http
GET /api/v1/plagiarism/appeals?status=pending
```

### Approve/Reject Appeal

```http
POST /api/v1/plagiarism/appeal/:appealId/review
Content-Type: application/json

{
  "decision": "approved",
  "reviewNote": "Verified original work with provided evidence"
}
```

### View Detection Logs

```http
GET /api/v1/plagiarism/logs?isPlagiarism=true&limit=50
```

### Key Metrics to Monitor

- **Detection Rate**: % of uploads flagged
- **False Positive Rate**: Appeals approved / total appeals
- **Average Review Time**: Time to resolve appeals
- **Queue Size**: Pending appeals count

## Testing

### Test Plagiarism Detection

```bash
# Run tests
npm test -- plagiarism-detection.test.ts

# Test API endpoints
curl -X GET http://localhost:3000/api/v1/plagiarism/detection/upload-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Appeal Submission

```bash
curl -X POST http://localhost:3000/api/v1/plagiarism/appeal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "detectionId": "detection-123",
    "reason": "This is my original work created on 2024-01-01...",
    "evidence": {
      "urls": ["https://example.com/portfolio"]
    }
  }'
```

## Common Issues

### Issue: Detection not running
**Solution**: Ensure Oracle Adapter service is running
```bash
# Check service health
curl http://localhost:8001/health
```

### Issue: All uploads being rejected
**Solution**: Check similarity thresholds in environment variables
```env
PLAGIARISM_REJECT_THRESHOLD=0.95
PLAGIARISM_WARNING_THRESHOLD=0.85
```

### Issue: Appeals not showing up
**Solution**: Verify database connection and check logs
```bash
# Check Prisma connection
npx prisma db pull

# View logs
tail -f logs/app.log | grep plagiarism
```

## Configuration

### Environment Variables

```env
# Required
ORACLE_ADAPTER_URL=http://localhost:8001
DATABASE_URL=postgresql://user:pass@localhost:5432/knowton

# Optional (defaults shown)
PLAGIARISM_REJECT_THRESHOLD=0.95
PLAGIARISM_WARNING_THRESHOLD=0.85
PLAGIARISM_APPEAL_REVIEW_TIME_HOURS=48
```

### Adjust Thresholds

Edit `.env` file:
```env
# More strict (fewer false positives, more false negatives)
PLAGIARISM_REJECT_THRESHOLD=0.98
PLAGIARISM_WARNING_THRESHOLD=0.90

# More lenient (more false positives, fewer false negatives)
PLAGIARISM_REJECT_THRESHOLD=0.90
PLAGIARISM_WARNING_THRESHOLD=0.80
```

## Next Steps

1. **Review Documentation**: See `PLAGIARISM_DETECTION.md` for full details
2. **Test the System**: Upload test content and verify detection
3. **Monitor Performance**: Check detection logs and metrics
4. **Adjust Thresholds**: Fine-tune based on false positive rate
5. **Train Team**: Ensure admins know how to review appeals

## Support

- **Documentation**: `/packages/backend/docs/PLAGIARISM_DETECTION.md`
- **API Reference**: See endpoint documentation above
- **Code**: `packages/backend/src/services/plagiarism-detection.service.ts`
- **Tests**: `packages/backend/src/__tests__/services/plagiarism-detection.test.ts`

## Requirements Met

✅ **REQ-1.2.4**: Plagiarism Detection
- Auto-detect similar content on upload
- Similarity threshold: 85% warning, 95% rejection
- Provide similar content list with confidence scores
- Detection time < 10 seconds

✅ **REQ-1.2.5**: DMCA Takedown Process
- Appeal/dispute mechanism implemented
- 72-hour response time (48 hours target)
- Audit logging for all detections
- Admin review workflow

## Task Completion

This implementation completes **TASK-1.3.3: Plagiarism detection integration**:
- ✅ Auto-detect similar content on upload
- ✅ Show similarity warnings in upload UI
- ✅ Implement appeal/dispute process
- ✅ Log all detection results for audit
