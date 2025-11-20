# 13. Known Issues, Limitations & Technical Debt

This document catalogs known issues, limitations, and technical debt in the Onus Health Application that should be addressed in future development.

---

## Known Issues

### 1. Orphaned Data After User Deletion 🔴

**Priority**: High  
**Category**: Data Integrity

**Issue**: When users are deleted (via database or admin action), related data (connections, consultations, medical records) becomes orphaned.

**Evidence**: `docs/DATABASE_CLEANUP.md` shows **5+ cleanup operations** performed between July-October 2025, removing hundreds of orphaned records.

**Impact**:
- Database bloat (unused data)
- Referential integrity violations
- Potential query errors (populate() fails on deleted references)
- Data inconsistency

**Root Cause**: No cascading deletes implemented when users are removed.

**Current Workaround**: Manual cleanup script (`npm run cleanup:orphaned`)

**Proper Solution**:
1. Implement cascading deletes in `user.controller.js` deleteAccount function:
   ```javascript
   exports.deleteAccount = async (req, res) => {
     const userId = req.user.id;
     
     // Delete related data first
     await Connection.deleteMany({ $or: [{ patient: userId }, { provider: userId }] });
     await Consultation.deleteMany({ $or: [{ patient: userId }, { provider: userId }] });
     await MedicalRecord.deleteMany({ patient: userId });
     
     // Then delete user
     await User.deleteOne({ _id: userId });
   };
   ```

2. Or use soft deletes for users (mark as deleted, not remove):
   ```javascript
   user.isDeleted = true;
   user.deletedAt = Date.now();
   await user.save();
   ```

**Estimated Effort**: 4-8 hours (implement + test)

---

### 2. Console.log Statements in Production Code 🟡

**Priority**: Medium  
**Category**: Code Quality

**Issue**: Many `console.log` and debug statements left in production code.

**Examples**:
- `server/controllers/consultation.controller.js` (lines 132, 187, 561, 574)
- `server/controllers/user.controller.js` (lines 631, 635, 722)
- `client/src/pages/auth/SignUp.jsx` (line 102)
- `client/src/pages/admin/Dashboard.jsx` (line 64)

**Impact**:
- Performance overhead (minimal but unnecessary)
- Security risk (may log sensitive data)
- Cluttered logs

**Solution**:
1. **Replace with Winston logger** (backend):
   ```javascript
   // Instead of:
   console.log('Debug info:', data);
   
   // Use:
   logger.debug('Debug info', { data });
   ```

2. **Remove or guard** (frontend):
   ```javascript
   // Remove or use:
   if (process.env.NODE_ENV !== 'production') {
     console.log('Debug info');
   }
   ```

3. **Add ESLint rule**:
   ```json
   {
     "rules": {
       "no-console": ["warn", { "allow": ["warn", "error"] }]
     }
   }
   ```

**Estimated Effort**: 2-4 hours (find and replace all instances)

---

### 3. Notification Preferences Not Implemented 🟡

**Priority**: Medium  
**Category**: Incomplete Feature

**Issue**: Notification preferences UI exists but functionality not implemented.

**Evidence**: `client/src/pages/provider/Settings.jsx` (lines 53-54, 189-190, 321)

```javascript
// TODO: Implement notification preferences functionality
/* const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    ...
  });
*/
```

**Impact**: Users cannot control email notification preferences (receive all emails).

**Solution**:
1. Add `notificationPreferences` subdocument to User schema
2. Implement `PUT /api/users/notifications` endpoint
3. Check preferences before queuing emails
4. Uncomment and connect frontend UI

**Estimated Effort**: 6-12 hours

---

### 4. Inconsistent API Response Format 🟡

**Priority**: Medium  
**Category**: API Design

**Issue**: Some endpoints return `{ success: true, data: {...} }`, others return data directly.

**Examples**:
- `POST /api/auth/login` → Returns `{ user, tokens }` (no success wrapper)
- `POST /api/consultations` → Returns consultation directly
- `POST /api/connections` → Returns `{ success: true, connection, message }`

**Impact**:
- Frontend needs different parsing logic
- Inconsistent error handling
- Harder to standardize

**Solution**: Standardize to one format:

```javascript
// Recommended format
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": { ... } // If applicable
}

// Error format
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ] // Validation errors
}
```

**Estimated Effort**: 16-24 hours (refactor all endpoints + update frontend)

---

## Limitations

### 1. No Consultation Editing After Completion 🟠

**Category**: Business Logic

**Limitation**: Once a consultation is marked "completed", it cannot be edited.

**Rationale**: Data integrity for medical records (prevent tampering).

**Workaround**: Delete and re-create (not ideal).

**User Impact**: Providers cannot fix typos or add missing information after submission.

**Possible Solution**:
1. Add "Amend" feature that creates amendment records
2. Keep original consultation immutable
3. Display amendments alongside original
4. Maintain audit trail

**Estimated Effort**: 20-40 hours

---

### 2. Desktop-First Design (Limited Mobile Support) 🟠

**Category**: UI/UX

**Limitation**: Application designed at 1400x800px for desktop. Mobile responsiveness limited or not fully implemented.

**Evidence**: Fixed sidebar width (250px), main content (1150px) in layout CSS.

**User Impact**: Mobile users may have poor experience (small text, horizontal scrolling).

**Solution**:
1. Add responsive breakpoints (media queries)
2. Convert sidebar to drawer/hamburger menu on mobile
3. Stack elements vertically on small screens
4. Test on actual mobile devices

**Estimated Effort**: 40-80 hours (full responsive redesign)

---

### 3. No Audit Trail for Data Changes 🟠

**Category**: Compliance / Security

**Limitation**: No history of who changed what and when (except createdAt/updatedAt timestamps).

**User Impact**: Cannot track down who modified records, when, or what changed.

**Importance**: **Critical for healthcare compliance** (HIPAA, GDPR require audit trails).

**Solution**:
1. Create `AuditLog` model:
   ```javascript
   {
     userId: ObjectId,
     action: String,  // 'create', 'update', 'delete'
     resourceType: String,  // 'User', 'Consultation', etc.
     resourceId: ObjectId,
     changes: Object,  // What changed
     timestamp: Date
   }
   ```
2. Add pre-save/pre-update hooks to log changes
3. Admin UI to view audit logs

**Estimated Effort**: 24-40 hours

---

### 4. No Multi-Factor Authentication (MFA) 🟠

**Category**: Security

**Limitation**: Only password-based authentication (single factor).

**User Impact**: Account vulnerable if password compromised.

**Importance**: **Critical for healthcare data** (should have MFA for admins minimum).

**Solution**: See [06-Authentication-Authorization-Security.md](./06-Authentication-Authorization-Security.md#known-limitations--security-gaps).

**Estimated Effort**: 40-60 hours

---

### 5. No Offline Support 🟡

**Category**: UX

**Limitation**: Application requires internet connection (no service worker, no offline caching).

**User Impact**: Cannot access app or view cached consultations offline.

**Solution**:
1. Add service worker (CRA supports via `serviceWorker.register()`)
2. Implement cache-first strategy for static assets
3. Cache consultation data in IndexedDB
4. Show offline indicator in UI

**Estimated Effort**: 16-24 hours

---

## Technical Debt

### 1. Missing Automated Tests 🔴

**Priority**: High  
**Category**: Quality Assurance

**Debt**: Only 2% of code covered by automated tests (auth tests only).

**Impact**:
- Regressions go unnoticed
- Fear of refactoring
- Manual testing time-consuming

**Solution**: See [10-Testing-Linting-Quality.md](./10-Testing-Linting-Quality.md#known-testing-gaps).

**Estimated Effort**: 80-120 hours (full test suite)

---

### 2. No Linting Configuration (Backend) 🟡

**Priority**: Medium  
**Category**: Code Quality

**Debt**: Backend has no ESLint configuration.

**Impact**:
- Inconsistent code style
- Potential bugs (unused variables, missing returns)
- Harder code reviews

**Solution**:
```bash
cd server
npm install --save-dev eslint
npx eslint --init
```

**Estimated Effort**: 2-4 hours (setup + fix linting errors)

---

### 3. Unused `common/` Folder 🟡

**Priority**: Low  
**Category**: Architecture

**Debt**: `common/` folder created for shared code but minimally used.

**Current State**:
- Has package.json with yup and date-fns
- Has empty `types/` and `validation/` folders
- Client and server duplicate validation logic

**Solution**:
1. Move shared validation schemas to `common/validation/`
2. Move shared types to `common/types/`
3. Import from common in both client and server
4. Or remove common folder entirely if not needed

**Estimated Effort**: 8-16 hours (refactor validation)

---

### 4. Duplicate Global CSS Files 🟢

**Priority**: Low  
**Category**: Code Quality

**Debt**: Two global CSS files with similar names:
- `client/src/styles/global.css`
- `client/src/styles/globals.css`

**Impact**: Confusion, potential duplicate styles.

**Solution**: Merge into single file or clarify purpose in comments.

**Estimated Effort**: 1 hour

---

### 5. Email Queue Not Cleared After Send 🟡

**Priority**: Medium  
**Category**: Database Growth

**Debt**: Sent emails remain in `emailqueues` collection indefinitely.

**Impact**: Database grows unbounded (emails never deleted).

**Solution**:
1. Add cleanup job to delete emails older than 30 days:
   ```javascript
   const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
   await EmailQueue.deleteMany({ 
     status: 'sent', 
     createdAt: { $lt: thirtyDaysAgo } 
   });
   ```
2. Run as cron job or on server startup

**Estimated Effort**: 4 hours

---

### 6. Hardcoded Admin Emails 🟡

**Priority**: Medium  
**Category**: Configuration

**Debt**: Admin notification emails hardcoded in `email.service.js` (lines 469-470):

```javascript
const adminEmails = ['rowan.franciscus.2@gmail.com', 'julian@onus.health'];
```

**Impact**: Cannot add new admins without code changes.

**Solution**:
1. Move to environment variable: `ADMIN_EMAILS=email1@example.com,email2@example.com`
2. Or query database for all users with `role: 'admin'`

**Estimated Effort**: 2 hours

---

### 7. No Rate Limiting on Non-Auth Endpoints 🟡

**Priority**: Medium  
**Category**: Security

**Debt**: Rate limiting only on `/api/auth/login` and `/api/auth/forgot-password`.

**Impact**: Other endpoints vulnerable to abuse (e.g., consultation creation spam).

**Solution**: Add rate limiting to all endpoints:

```javascript
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,  // 100 requests per 15 minutes
  message: 'Too many requests, please try again later'
});

app.use('/api', generalRateLimiter);
```

**Estimated Effort**: 4-8 hours

---

### 8. File Upload Security Gaps 🟡

**Priority**: Medium  
**Category**: Security

**Debt**:
- No virus scanning on uploaded files
- No file content validation (only extension checking)
- JWT tokens in query parameters (security risk over HTTP)

**Impact**:
- Malicious files could be uploaded
- Files could be accessed via URL sharing

**Solution**:
1. Add virus scanning (ClamAV or cloud service)
2. Validate file content (magic number checking)
3. Implement signed URLs with expiration (S3-style)
4. Move to cloud storage (S3, Google Cloud Storage)

**Estimated Effort**: 16-24 hours

---

## Performance Bottlenecks

### 1. Multiple populate() Calls on Consultations 🟡

**Issue**: Consultation detail query populates 10+ references:

```javascript
const consultation = await Consultation.findById(id)
  .populate('patient')
  .populate('provider')
  .populate('vitals')
  .populate('medications')
  .populate('immunizations')
  .populate('labResults')
  .populate('radiologyReports')
  .populate('hospitalRecords')
  .populate('surgeryRecords');
```

**Impact**: 10+ database queries per consultation view (slow for large datasets).

**Solution**:
1. Use aggregation pipeline with `$lookup`
2. Lazy-load medical records (only fetch when tab clicked)
3. Cache consultation data (Redis)

**Estimated Effort**: 8-16 hours

---

### 2. No Pagination on Some Lists 🟡

**Issue**: Some endpoints return all records without pagination (e.g., medical records by type).

**Impact**: Slow queries and large payloads as data grows.

**Solution**: Add pagination to all list endpoints (limit 20-50 per page).

**Estimated Effort**: 4-8 hours

---

### 3. No API Response Caching 🟡

**Issue**: Every request hits database, even for unchanged data.

**Impact**: Higher database load, slower response times.

**Solution**: Implement caching strategy:
- Redis for frequently accessed data (user profiles, consultations)
- Cache invalidation on updates
- Cache-Control headers for static data

**Estimated Effort**: 16-24 hours

---

## Security Gaps

### Summary from Previous Sections

See [06-Authentication-Authorization-Security.md](./06-Authentication-Authorization-Security.md#known-limitations--security-gaps) for detailed security gaps:

1. ⚠️ **Password Strength Validation** (server-side)
2. ⚠️ **No Account Lockout** (brute-force vulnerable)
3. ⚠️ **No Multi-Factor Authentication**
4. ⚠️ **JWT Secrets Not Rotated**
5. ⚠️ **No Token Blacklisting** (cannot revoke tokens)
6. ⚠️ **Email Enumeration** (registration reveals existing emails)
7. ⚠️ **File Upload Security** (no virus scanning)

**Priority**: High (address before full production launch)

---

## Architecture & Design Debt

### 1. Incomplete Service Layer 🟢

**Debt**: Only email service exists; most business logic in controllers.

**Observation**: Controllers are **fat** (100-200 lines), mixing orchestration with business logic.

**Impact**: Harder to test, harder to reuse logic.

**Solution**: Extract business logic to service layer:
- `consultation.service.js` - Consultation creation logic
- `connection.service.js` - Access control logic
- `analytics.service.js` - Aggregation queries

**Estimated Effort**: 24-40 hours (refactor all controllers)

**Note**: Current pattern works fine for application's scale. Only refactor if growing significantly.

---

### 2. Frontend State Management Overuse 🟢

**Debt**: Some components use Redux for local state (should use useState).

**Observation**: Auth state in Redux (✅ correct), but some page-level data also in Redux (❓ questionable).

**Impact**: Redux store grows, harder to reason about state.

**Solution**: Move page-level state (consultations list, form data) to component state or React Query.

**Estimated Effort**: 8-16 hours

**Note**: Not critical; current approach works.

---

### 3. Dual Authentication Context 🟢

**Debt**: Both Redux (`authSlice.js`) and React Context (`AuthContext.js`) for auth state.

**Observation**: `AuthContext.js` is legacy, mostly superseded by Redux.

**Impact**: Confusion, potential state sync issues.

**Solution**: Remove `AuthContext.js` and migrate all to Redux.

**Estimated Effort**: 4-8 hours

**Current Status**: AuthContext likely unused (verify before removing).

---

## Code Quality Issues

### 1. Inconsistent Naming Conventions 🟢

**Issue**: Some inconsistencies in naming:
- Route files: `auth.routes.js` vs. `user.routes.js` (inconsistent casing)
- Controllers: `authController.js` vs. `user.controller.js` (inconsistent dot placement)
- Models: `User.js` vs. `VitalsRecord.js` (inconsistent suffixing)

**Impact**: Minor confusion, harder to find files.

**Solution**: Standardize naming:
- Routes: `*.routes.js`
- Controllers: `*.controller.js`
- Models: `*.model.js` or just `*.js`

**Estimated Effort**: 2-4 hours (rename files, update imports)

---

### 2. Missing JSDoc Comments 🟢

**Issue**: Many functions lack JSDoc comments.

**Observation**: Some functions have good JSDoc (e.g., `email.service.js`), others have none.

**Impact**: Harder for new developers to understand function parameters and return values.

**Solution**: Add JSDoc to all exported functions:

```javascript
/**
 * Create a new consultation
 * @param {Object} req - Express request object
 * @param {Object} req.body - Consultation data
 * @param {string} req.body.patientEmail - Patient email
 * @param {Object} req.body.general - General consultation info
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.createConsultation = async (req, res) => {
  // ...
};
```

**Estimated Effort**: 16-24 hours (document all functions)

---

### 3. Large Controller Files 🟡

**Issue**: Some controllers are **very large** (1000+ lines):
- `consultation.controller.js` - 1166 lines
- `user.controller.js` - 913 lines

**Impact**: Harder to navigate, harder to test, violation of single responsibility.

**Solution**: Split into smaller files:
- `consultation.controller.js` → Split into `create.js`, `update.js`, `view.js`, `delete.js`
- Or extract business logic to services

**Estimated Effort**: 16-24 hours per file

---

## Documentation Debt

### 1. API Documentation Incomplete 🟡

**Issue**: `server/routes/api.md` exists but is incomplete.

**Impact**: Developers rely on reading code to understand endpoints.

**Solution**:
1. Generate Swagger/OpenAPI documentation
2. Or maintain comprehensive API docs manually
3. Or use Postman collections

**Recommended Tool**: Swagger (swagger-jsdoc + swagger-ui-express)

**Estimated Effort**: 16-24 hours

---

### 2. Outdated Fix Documentation 🟢

**Issue**: Many `*_FIX.md` and `*_FIX_V2.md` files in `docs/` (30+ files).

**Observation**: Historical bug fix documentation, may be outdated.

**Impact**: Confusion about what's fixed vs. current issues.

**Solution**:
1. Archive old fix docs to `docs/archive/`
2. Keep only current, relevant documentation in `docs/`
3. Update README to point to Handover documentation

**Estimated Effort**: 2-4 hours

---

## Scalability Concerns

### 1. Synchronous File Uploads 🟡

**Issue**: Files uploaded synchronously, blocking API response until complete.

**Impact**: Large files (5MB) take 3-5 seconds, blocking server thread.

**Solution**:
1. Use streaming uploads
2. Background processing (upload to temp, process async)
3. Direct-to-S3 upload (client uploads directly to S3, server gets URL)

**Estimated Effort**: 8-16 hours

---

### 2. Email Queue on Database 🟡

**Issue**: Email queue stored in MongoDB (slower than in-memory queue).

**Impact**: Queue processing slower as email count grows.

**Solution**: Move to Redis-based queue (Bull, BullMQ):
- Faster queue operations
- Better retry mechanisms
- Job scheduling
- UI for queue monitoring

**Estimated Effort**: 16-24 hours

---

### 3. No Caching Layer 🟡

**Issue**: No caching (Redis, Memcached) for frequently accessed data.

**Impact**: Every request hits database (higher load, slower responses).

**Solution**: Add Redis caching:
- User profiles (cache for 5 minutes)
- Dashboard statistics (cache for 1 hour)
- Medical records (cache with invalidation on update)

**Estimated Effort**: 24-40 hours

---

## Priority Matrix

### High Priority (Address Soon)

| Issue | Impact | Effort | Recommended Timing |
|-------|--------|--------|--------------------|
| **Orphaned data after deletion** | High | 4-8h | Next sprint |
| **Missing automated tests** | High | 80-120h | Ongoing |
| **Security gaps (MFA, lockout, etc.)** | High | 40-60h | Before production launch |
| **No audit trail** | High (compliance) | 24-40h | Before production launch |

### Medium Priority (Address When Convenient)

| Issue | Impact | Effort | Recommended Timing |
|-------|--------|--------|--------------------|
| **Console.log in production** | Medium | 2-4h | Next sprint |
| **Inconsistent API responses** | Medium | 16-24h | Major refactor |
| **Notification preferences** | Medium | 6-12h | Feature sprint |
| **Backend linting** | Medium | 2-4h | Next sprint |

### Low Priority (Future Improvements)

| Issue | Impact | Effort | Recommended Timing |
|-------|--------|--------|--------------------|
| **Mobile responsiveness** | Medium-Low | 40-80h | Future release |
| **Offline support** | Low | 16-24h | Nice-to-have |
| **API documentation** | Low | 16-24h | As needed |
| **Code refactoring** | Low | 40-80h | Ongoing |

---

## Compatibility & Browser Support

### Tested Browsers

**Confirmed Working**:
- ✅ Chrome 90+ (primary development browser)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Not Tested**:
- ❌ Internet Explorer (not supported)
- ❌ Mobile browsers (limited testing)
- ❌ Opera
- ❌ Brave

**Recommendation**: Add browser testing matrix to QA process.

---

### Node.js Version Compatibility

**Tested Versions**:
- ✅ Node.js 16.x
- ✅ Node.js 18.x

**Not Tested**:
- ❌ Node.js 14.x (minimum required)
- ❌ Node.js 20.x (latest LTS)

**Recommendation**: Add `engines` field to package.json:

```json
{
  "engines": {
    "node": ">=16.0.0 <19.0.0",
    "npm": ">=7.0.0"
  }
}
```

---

## Deprecation Warnings

### 1. React 18 Strict Mode Warnings

**Issue**: Some warnings in development console about deprecated React features.

**Impact**: Future React versions may break compatibility.

**Solution**: Update components to use current React patterns.

**Estimated Effort**: 4-8 hours

---

### 2. Mongoose Deprecation Warnings

**Issue**: Occasional deprecation warnings from Mongoose.

**Example**: `useNewUrlParser`, `useUnifiedTopology` (already migrated in Mongoose 6+)

**Solution**: Update Mongoose connection options if warnings appear.

---

## Summary

### Technical Debt by Category

| Category | High Priority | Medium Priority | Low Priority | Total |
|----------|---------------|-----------------|--------------|-------|
| **Security** | 3 | 2 | 0 | 5 |
| **Data Integrity** | 2 | 1 | 0 | 3 |
| **Code Quality** | 0 | 3 | 3 | 6 |
| **Testing** | 1 | 0 | 0 | 1 |
| **Performance** | 0 | 3 | 1 | 4 |
| **UX/Features** | 0 | 1 | 1 | 2 |
| **Documentation** | 0 | 1 | 1 | 2 |
| **Total** | **6** | **11** | **6** | **23** |

### Estimated Total Effort

- **High Priority**: 148-228 hours (~4-6 weeks)
- **Medium Priority**: 76-132 hours (~2-3 weeks)
- **Low Priority**: 105-189 hours (~3-5 weeks)
- **Total**: **329-549 hours** (~2-3 months full-time)

**Recommendation**: Address high-priority items before full production launch, medium-priority items in subsequent sprints.

---

## Next Steps

To address technical debt:

1. **Review this document** with team and prioritize items
2. **Create Jira/GitHub issues** for each item
3. **Allocate time** in sprints for debt reduction
4. **Track progress** in project management tool
5. **Re-evaluate** quarterly as codebase evolves

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [12-Operations-Maintenance-Debugging.md](./12-Operations-Maintenance-Debugging.md)  
**Handover Complete**: ✅ All 13 sections documented

