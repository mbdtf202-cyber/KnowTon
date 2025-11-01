# Plagiarism Detection Integration

## Overview

The plagiarism detection system automatically scans uploaded content for similarity to existing content in the platform. It uses AI-powered fingerprinting to detect potential copyright infringement and provides a transparent appeal process for creators.

## Features

### 1. Automatic Detection on Upload
- **Triggered**: Automatically during the upload post-processing phase
- **Content Types**: Images, audio, video, and text documents
- **Thresholds**:
  - **< 85% similarity**: Content approved automatically
  - **85-95% similarity**: Warning shown, upload proceeds
  - **≥ 95% similarity**: Upload rejected, appeal available

### 2. Similarity Analysis
- Uses AI fingerprinting from the Oracle Adapter service
- Compares against all existing content in the database
- Returns list of similar content with confidence scores
- Provides detailed analysis for review

### 3. Appeal Process
- Users can appeal rejected uploads
- Requires detailed reason (minimum 50 characters)
- Optional evidence submission (URLs, documents)
- Admin review within 48 hours
- Transparent status tracking

### 4. Audit Logging
- All detections logged for compliance
- Searchable by upload, user, status, date range
- Supports admin investigations
- Exportable for reporting

## API Endpoints

### Get Detection Results
```http
GET /api/v1/plagiarism/detection/:uploadId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "detection-123",
  "uploadId": "upload-456",
  "isPlagiarism": false,
  "maxSimilarity": 0.88,
  "threshold": 0.85,
  "totalMatches": 2,
  "similarContent": [
    {
      "content_id": "content-789",
      "similarity_score": 0.88,
      "content_type": "image",
      "metadata": {
        "title": "Similar Image",
        "creator": "0x123..."
      }
    }
  ],
  "action": "warning",
  "message": "Warning: Content shows significant similarity..."
}
```

### Submit Appeal
```http
POST /api/v1/plagiarism/appeal
Authorization: Bearer <token>
Content-Type: application/json

{
  "detectionId": "detection-123",
  "reason": "This is my original work. I created it from scratch...",
  "evidence": {
    "urls": [
      "https://example.com/my-portfolio",
      "https://example.com/creation-process"
    ],
    "description": "Additional context about the creation process"
  }
}
```

**Response:**
```json
{
  "id": "appeal-456",
  "status": "pending",
  "message": "Appeal submitted successfully. Our team will review it within 48 hours."
}
```

### Get Appeal Status
```http
GET /api/v1/plagiarism/appeal/:appealId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "appeal-456",
  "detectionId": "detection-123",
  "status": "pending",
  "reason": "This is my original work...",
  "evidence": {
    "urls": ["https://example.com/my-portfolio"],
    "description": "Additional context"
  },
  "submittedAt": "2024-01-15T10:30:00Z",
  "reviewedAt": null,
  "reviewNote": null
}
```

### Get User Appeals
```http
GET /api/v1/plagiarism/appeals?limit=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "appeals": [
    {
      "id": "appeal-456",
      "detectionId": "detection-123",
      "uploadId": "upload-789",
      "filename": "my-content.jpg",
      "status": "pending",
      "reason": "This is my original work...",
      "submittedAt": "2024-01-15T10:30:00Z",
      "reviewedAt": null,
      "reviewNote": null
    }
  ]
}
```

### Review Appeal (Admin Only)
```http
POST /api/v1/plagiarism/appeal/:appealId/review
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "decision": "approved",
  "reviewNote": "Appeal approved after verifying original work evidence"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appeal approved. User has been notified."
}
```

### Get Detection Logs (Admin Only)
```http
GET /api/v1/plagiarism/logs?isPlagiarism=true&limit=100&offset=0
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `uploadId`: Filter by upload ID
- `userId`: Filter by user ID
- `isPlagiarism`: Filter by plagiarism flag (true/false)
- `status`: Filter by status (detected, appealed, resolved, dismissed)
- `startDate`: Filter by start date (ISO 8601)
- `endDate`: Filter by end date (ISO 8601)
- `limit`: Results per page (1-1000, default 100)
- `offset`: Pagination offset (default 0)

**Response:**
```json
{
  "total": 150,
  "logs": [
    {
      "id": "detection-123",
      "uploadId": "upload-456",
      "userId": "user-789",
      "filename": "content.jpg",
      "filetype": "image/jpeg",
      "contentType": "image",
      "isPlagiarism": true,
      "maxSimilarity": 0.97,
      "threshold": 0.85,
      "totalMatches": 3,
      "status": "appealed",
      "action": "rejected",
      "detectedAt": "2024-01-15T10:30:00Z",
      "resolvedAt": null,
      "appeals": [
        {
          "id": "appeal-456",
          "status": "pending",
          "submittedAt": "2024-01-15T11:00:00Z"
        }
      ]
    }
  ]
}
```

## Integration with Upload Flow

The plagiarism detection is automatically integrated into the upload service:

1. **File Upload**: User uploads content via tus.io resumable upload
2. **Validation**: File is validated (type, size, malware scan)
3. **Metadata Extraction**: Metadata is extracted from the file
4. **Plagiarism Detection**: Content is analyzed for similarity
   - If similarity ≥ 95%: Upload status set to "rejected"
   - If similarity 85-95%: Warning logged, upload proceeds
   - If similarity < 85%: Upload approved
5. **Completion**: Upload marked as completed (unless rejected)

## Database Schema

### plagiarism_detections
```sql
CREATE TABLE plagiarism_detections (
  id UUID PRIMARY KEY,
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  is_plagiarism BOOLEAN DEFAULT FALSE,
  max_similarity FLOAT DEFAULT 0,
  threshold FLOAT DEFAULT 0.85,
  total_matches INT DEFAULT 0,
  similar_content JSONB,
  status VARCHAR(50) DEFAULT 'detected',
  action VARCHAR(50),
  detected_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),
  resolution_note TEXT
);
```

### plagiarism_appeals
```sql
CREATE TABLE plagiarism_appeals (
  id UUID PRIMARY KEY,
  detection_id UUID REFERENCES plagiarism_detections(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  evidence JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255),
  review_note TEXT
);
```

## Frontend Components

### PlagiarismWarning
Displays similarity warnings and rejection notices to users.

**Props:**
- `uploadId`: Upload identifier
- `isPlagiarism`: Whether plagiarism was detected
- `maxSimilarity`: Maximum similarity score (0-1)
- `action`: Action taken (warning, rejected, approved)
- `message`: User-friendly message
- `similarContent`: Array of similar content items
- `onAppeal`: Callback for appeal submission
- `onDismiss`: Callback for dismissing warning

### PlagiarismAppealModal
Modal for submitting appeals.

**Props:**
- `isOpen`: Modal visibility
- `onClose`: Close callback
- `detectionId`: Detection record ID
- `uploadId`: Upload identifier
- `filename`: Original filename
- `onSubmitSuccess`: Success callback

## Usage Example

### Backend Service
```typescript
import { PlagiarismDetectionService } from './services/plagiarism-detection.service';

const service = new PlagiarismDetectionService();

// Detect plagiarism on upload
const result = await service.detectOnUpload(
  uploadId,
  contentUrl,
  'image'
);

if (result.action === 'rejected') {
  console.log('Upload rejected due to high similarity');
} else if (result.action === 'warning') {
  console.log('Warning: Similar content detected');
}

// Submit appeal
const appeal = await service.submitAppeal({
  detectionId: result.id,
  userId: 'user-123',
  reason: 'This is my original work...',
  evidence: {
    urls: ['https://example.com/proof'],
  },
});
```

### Frontend Hook
```typescript
import { usePlagiarismDetection } from '../hooks/usePlagiarismDetection';

function UploadComponent() {
  const { detection, loading, error } = usePlagiarismDetection(uploadId);

  if (detection && detection.action === 'rejected') {
    return (
      <PlagiarismWarning
        {...detection}
        onAppeal={() => setShowAppealModal(true)}
      />
    );
  }

  return <div>Upload successful</div>;
}
```

## Configuration

### Environment Variables
```env
# Oracle Adapter URL for similarity detection
ORACLE_ADAPTER_URL=http://localhost:8001

# Similarity thresholds (optional, defaults shown)
PLAGIARISM_REJECT_THRESHOLD=0.95
PLAGIARISM_WARNING_THRESHOLD=0.85
```

## Testing

Run the plagiarism detection tests:
```bash
npm test -- plagiarism-detection.test.ts
```

## Compliance & Legal

### DMCA Compliance
The plagiarism detection system helps comply with DMCA requirements by:
- Proactively detecting potential copyright infringement
- Providing a transparent appeal process
- Maintaining audit logs for legal purposes
- Enabling quick response to takedown requests

### Data Retention
- Detection records: Retained indefinitely for audit purposes
- Appeal records: Retained for 7 years
- Similar content data: Anonymized after 90 days

## Performance Considerations

- Detection runs asynchronously during upload post-processing
- Does not block the upload completion
- Typical detection time: 5-15 seconds
- Cached results for 24 hours to avoid duplicate processing

## Monitoring

Key metrics to monitor:
- Detection rate (% of uploads flagged)
- False positive rate (appeals approved / total appeals)
- Average detection time
- Appeal resolution time
- Admin review queue size

## Future Enhancements

1. **Machine Learning Improvements**
   - Train custom models on platform-specific content
   - Reduce false positive rate
   - Improve detection accuracy for edge cases

2. **Automated Resolution**
   - Auto-approve appeals with strong evidence
   - Pattern recognition for common false positives
   - Integration with external copyright databases

3. **User Education**
   - In-app guidance on copyright compliance
   - Best practices for original content
   - Examples of acceptable vs. infringing content

4. **Advanced Analytics**
   - Trend analysis for plagiarism patterns
   - Creator reputation scoring
   - Risk assessment for new uploads

## Support

For questions or issues:
- Technical: Check logs in `/api/v1/plagiarism/logs`
- User Support: Review appeals in admin dashboard
- Development: See `plagiarism-detection.service.ts` for implementation details
