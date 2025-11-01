# Creator Qualification System

## Overview

The Creator Qualification System allows creators to submit portfolios for verification and enables admins to review and approve/reject creator applications.

## Features

### 1. Portfolio Upload
- Creators can upload multiple portfolio items (PDFs, images, videos, etc.)
- Each item includes title, description, file URL, type, and size
- Portfolio items are stored in the database with references to the creator

### 2. Verification Queue
- Admins can view all pending creator applications
- Filter by status (pending, approved, rejected) and creator type
- Pagination support for large lists
- Includes portfolio items for each creator

### 3. Admin Approval Interface
- Admins can approve or reject creator applications
- Add notes explaining the decision
- Track which admin made the decision and when

### 4. Email Notifications
- Automatic email sent when creator is approved
- Automatic email sent when creator is rejected (with reason)
- Professional HTML email templates

## Database Schema

### Creator Table Updates
```prisma
model Creator {
  // ... existing fields
  creatorType           String              @default("individual") // individual, institution, enterprise
  verificationStatus    String              @default("pending") // pending, approved, rejected
  verificationNote      String? // Admin notes
  verifiedAt            DateTime?
  verifiedBy            String? // Admin user ID
  portfolioItems        CreatorPortfolio[]
}
```

### New CreatorPortfolio Table
```prisma
model CreatorPortfolio {
  id          String   @id @default(uuid())
  creatorId   String
  title       String
  description String?
  fileUrl     String // S3 or IPFS URL
  fileType    String // pdf, image, video, etc.
  fileSize    Int
  uploadedAt  DateTime @default(now())
  creator     Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### Creator Endpoints

#### Upload Portfolio Item
```
POST /api/v1/creator-qualification/portfolio
Authorization: Bearer <token>

Body:
{
  "creatorId": "uuid",
  "title": "My Portfolio Item",
  "description": "Description of the work",
  "fileUrl": "https://s3.amazonaws.com/...",
  "fileType": "pdf",
  "fileSize": 1024000
}

Response:
{
  "success": true,
  "portfolioItem": {
    "id": "uuid",
    "creatorId": "uuid",
    "title": "My Portfolio Item",
    "fileUrl": "...",
    "uploadedAt": "2024-11-01T..."
  }
}
```

#### Get Creator Portfolio
```
GET /api/v1/creator-qualification/portfolio/:creatorId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "portfolioItems": [...]
}
```

#### Delete Portfolio Item
```
DELETE /api/v1/creator-qualification/portfolio/:portfolioItemId
Authorization: Bearer <token>

Body:
{
  "creatorId": "uuid"
}

Response:
{
  "success": true
}
```

#### Submit for Verification
```
POST /api/v1/creator-qualification/submit/:creatorId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Submitted for verification"
}
```

### Admin Endpoints

#### Get Verification Queue
```
GET /api/v1/creator-qualification/queue?status=pending&limit=50&offset=0
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "creators": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### Get Creator Details
```
GET /api/v1/creator-qualification/details/:creatorId
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "creator": {
    "id": "uuid",
    "displayName": "...",
    "portfolioItems": [...],
    "contents": [...],
    "verificationStatus": "pending"
  }
}
```

#### Approve/Reject Creator
```
POST /api/v1/creator-qualification/verify
Authorization: Bearer <admin-token>

Body:
{
  "creatorId": "uuid",
  "status": "approved", // or "rejected"
  "note": "Optional note explaining the decision"
}

Response:
{
  "success": true,
  "creator": {
    "id": "uuid",
    "verificationStatus": "approved",
    "verifiedAt": "2024-11-01T...",
    "verifiedBy": "admin-user-id"
  }
}
```

#### Get Verification Statistics
```
GET /api/v1/creator-qualification/stats
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "stats": {
    "pending": 25,
    "approved": 150,
    "rejected": 10,
    "total": 185
  }
}
```

## Email Templates

### Approval Email
- Green gradient header with celebration emoji
- Success badge
- List of benefits for approved creators
- Call-to-action button to creator dashboard
- Displays creator's wallet address

### Rejection Email
- Orange gradient header
- Info box with rejection reason
- Guidance on how to improve and reapply
- Call-to-action button to reapply
- Supportive tone encouraging resubmission

## Security

### Authentication
- All endpoints require authentication via JWT token
- Admin endpoints require additional admin role check

### Authorization
- Creators can only manage their own portfolio items
- Only admins can access verification queue and approve/reject creators
- Admin middleware checks user role from database

### Admin Middleware
```typescript
// Checks if authenticated user has admin or moderator role
export const adminMiddleware = async (req, res, next) => {
  // Verifies user role from database
  // Returns 403 if not admin/moderator
}
```

## Usage Flow

### Creator Flow
1. Creator registers and creates profile
2. Creator uploads portfolio items (certificates, work samples, etc.)
3. Creator submits for verification
4. Creator receives email notification of decision

### Admin Flow
1. Admin logs in to admin panel
2. Admin views verification queue
3. Admin clicks on pending creator to view details
4. Admin reviews portfolio items and profile
5. Admin approves or rejects with optional note
6. System sends email notification to creator

## Testing

Run tests with:
```bash
npm test -- creator-qualification.test.ts
```

Note: Requires test database to be configured.

## Migration

Apply database migration:
```bash
npx prisma migrate dev
```

This creates the `creator_portfolio` table and adds verification fields to the `creators` table.

## Future Enhancements

1. **Automated Verification**: Use AI to pre-screen portfolios
2. **Verification Levels**: Bronze, Silver, Gold verification tiers
3. **Portfolio Analytics**: Track which portfolio items lead to approval
4. **Bulk Actions**: Approve/reject multiple creators at once
5. **Verification Expiry**: Require re-verification after certain period
6. **Appeal Process**: Allow creators to appeal rejections
7. **Verification Badges**: Display verification status on creator profiles
