# Search and Filter Functionality Documentation

## Overview
This document describes the complete search and filter functionality implementation across the Onus Health Application for all user types (patients, providers, and admin).

## Implementation Status

### Patient Features

#### 1. Consultations Search
- **Location**: `/patient/consultations`
- **Search Fields**: Type, Specialist, Clinic, Reason, Date
- **Features**: 
  - Real-time search as user types
  - Clear search button
  - Search result count display
  - Empty state handling

#### 2. Connections Search
- **Location**: `/patient/connections`
- **Search Fields**: Provider name, Specialty, Practice
- **Features**:
  - Provider search with debouncing (500ms)
  - Separate sections for searching new providers and managing existing connections
  - Real-time results

#### 3. Medical Records Search
- **Location**: `/patient/medical-records/*`
- **Implementation**: Uses `MedicalRecordTypeView` component
- **Search Fields**: Configured per record type
  - Vitals: Date, Heart Rate, Blood Pressure values
  - Medications: Name, Notes
  - Immunizations: Vaccine Name
  - Lab Results: Test Name, Lab Name
  - Radiology: Type of Scan, Body Part
  - Hospital: Admission Date, Reason
  - Surgery: Type, Date

### Provider Features

#### 1. Patients Search
- **Location**: `/provider/patients`
- **Search Fields**: Name, Email, Phone, Age, Gender
- **Filter Categories**:
  - All Patients
  - Your Patients (with connections)
  - New Requests (pending connections)
- **Features**:
  - Combined search and category filtering
  - Real-time search

#### 2. Consultations Search
- **Location**: `/provider/consultations`
- **Search Fields**: Patient name, Reason for visit
- **Features**:
  - Sort by date, patient name
  - Pagination support

#### 3. Medical Records Search
- **Location**: `/provider/medical-records`
- **Search Fields**: Patient name
- **Features**:
  - Tab-based filtering by record type
  - Pagination per record type

### Admin Features

#### 1. Patients Search
- **Location**: `/admin/patients`
- **Search Fields**: First Name, Last Name, Email, ID
- **Features**:
  - Search result count ("Showing X of Y patients")
  - Table view with sortable columns

#### 2. Health Providers Search
- **Location**: `/admin/health-providers`
- **Search Fields**: Name, Specialty, Practice, Email
- **Filter Tabs**:
  - Verified Providers
  - Verification Requests
- **Features**:
  - Tab-based filtering
  - Pagination support

## Technical Implementation

### Frontend Components

#### 1. SearchBox Component
- **Location**: `client/src/components/common/SearchBox/`
- **Features**:
  - Reusable search input with icon
  - Clear button when text is present
  - Customizable placeholder
  - Accessible (proper ARIA labels)

#### 2. Search Implementation Pattern
```javascript
// Basic search pattern used across pages
const handleSearch = (value) => {
  setSearchTerm(value);
  
  if (!value.trim()) {
    setFilteredResults(allResults);
    return;
  }
  
  const searchLower = value.toLowerCase();
  const filtered = allResults.filter(item => 
    item.field1.toLowerCase().includes(searchLower) ||
    item.field2.toLowerCase().includes(searchLower)
  );
  
  setFilteredResults(filtered);
};
```

#### 3. Debounced Search Pattern
```javascript
// Used in ProviderSearch component
useEffect(() => {
  if (!searchTerm.trim()) {
    setSearchResults([]);
    return;
  }
  
  const delayDebounceFn = setTimeout(async () => {
    try {
      const results = await searchAPI(searchTerm);
      setSearchResults(results);
    } catch (error) {
      handleError(error);
    }
  }, 500);
  
  return () => clearTimeout(delayDebounceFn);
}, [searchTerm]);
```

### Backend Endpoints

#### 1. User Search
- **Endpoint**: `GET /api/admin/users`
- **Parameters**: 
  - `search`: Search term
  - `role`: Filter by role
  - `page`, `limit`: Pagination

#### 2. Provider Search
- **Endpoint**: `GET /api/users/providers/search`
- **Parameters**: 
  - `query`: Search term
- **Access**: Patients only

#### 3. Consultation Filters
- **Endpoint**: `GET /api/consultations`
- **Parameters**:
  - `patient`: Patient ID filter
  - `provider`: Provider ID filter
  - `status`: Status filter
  - `startDate`, `endDate`: Date range

#### 4. Medical Records Search
- **Endpoint**: `GET /api/medical-records/*`
- **Parameters**:
  - `search`: Search term
  - `patientId`: Patient filter
  - `startDate`, `endDate`: Date range

## Search Features

### 1. Real-time Search
- Updates results as user types
- No need to press Enter or click a button
- Immediate feedback

### 2. Clear Functionality
- X button appears when search has text
- Clicking clears search and shows all results
- Keyboard accessible

### 3. Empty States
- Different messages for:
  - No data at all
  - No search results found
  - Clear search option when no results

### 4. Search Persistence
- Search terms remain when:
  - Switching between tabs
  - Applying additional filters
  - Returning from detail views

### 5. Combined Filtering
- Search works alongside:
  - Category filters
  - Date ranges
  - Status filters
  - Tab selections

## Performance Optimizations

### 1. Debouncing
- Provider search uses 500ms debounce
- Reduces API calls while typing
- Provides smoother user experience

### 2. Client-side Filtering
- Most searches filter already-loaded data
- Instant results without server round-trip
- Only initial data fetch from server

### 3. Pagination
- Large result sets are paginated
- Search works within current page
- Backend supports search with pagination

## Accessibility

### 1. Keyboard Navigation
- All search boxes are keyboard accessible
- Clear button can be activated with keyboard
- Proper focus management

### 2. Screen Reader Support
- Descriptive placeholders
- ARIA labels on clear buttons
- Search result announcements

### 3. Visual Feedback
- Focus states on search inputs
- Hover states on clear buttons
- Loading states during searches

## Best Practices

### 1. Search Input Guidelines
- Use descriptive placeholders
- Place search prominently on page
- Show clear button when text present
- Provide visual feedback

### 2. Results Display
- Show result count when searching
- Differentiate "no data" vs "no results"
- Provide clear action to reset search
- Maintain context during search

### 3. Performance
- Implement debouncing for API calls
- Use client-side filtering when possible
- Show loading states for async operations
- Handle errors gracefully

## Future Enhancements

### 1. Advanced Filters
- Date range pickers
- Multi-select filters
- Saved search preferences
- Export filtered results

### 2. Search Improvements
- Search history
- Search suggestions/autocomplete
- Fuzzy matching
- Search across multiple fields with weighting

### 3. User Experience
- Remember last search per page
- Quick filters/tags
- Bulk actions on search results
- Search analytics

## Testing Search Functionality

### Manual Testing Steps
1. Enter search term and verify results update
2. Clear search and verify all results return
3. Test special characters in search
4. Test search with filters/categories
5. Test empty state messages
6. Test search result counts
7. Verify search persistence across navigation

### Automated Testing
- Unit tests for search filter functions
- Integration tests for search endpoints
- E2E tests for search user flows
- Performance tests for large datasets

## Conclusion

The search and filter functionality is fully implemented across all user types and pages where needed. It provides a consistent, accessible, and performant search experience throughout the application. The implementation follows React best practices and is easily maintainable and extensible. 