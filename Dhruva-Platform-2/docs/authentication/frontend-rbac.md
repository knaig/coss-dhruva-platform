# Frontend Role-Based Access Control (RBAC) Documentation

## Overview

This document outlines the Role-Based Access Control (RBAC) implementation in the Dhruva Platform frontend, including user roles, permissions, and access control mechanisms.

## User Roles

### 1. ADMIN Role
- **Description**: Full system administrator with unrestricted access
- **Capabilities**: 
  - Complete platform management
  - User administration
  - Service and model management
  - Monitoring and analytics
  - Billing management
  - API key management for all users

### 2. CONSUMER Role
- **Description**: Standard platform user with limited access
- **Capabilities**:
  - Service API access and testing
  - Model exploration and usage
  - Personal API key management
  - Inference service consumption
  - Testing ground access

## Page Access Matrix

| Page/Route | ADMIN | CONSUMER | Authentication Required | Role Restriction |
|------------|-------|----------|------------------------|------------------|
| `/` (Login) | ✅ | ✅ | ❌ | None |
| `/testing-ground` | ✅ | ✅ | ✅ | None |
| `/testing-ground/developer` | ✅ | ✅ | ✅ | None |
| `/testing-ground/user` | ✅ | ✅ | ✅ | None |
| `/services` | ✅ | ✅ | ✅ | None |
| `/services/view` | ✅ | ✅ | ✅ | None |
| `/models` | ✅ | ✅ | ✅ | None |
| `/models/view` | ✅ | ✅ | ✅ | None |
| `/pipeline` | ✅ | ✅ | ✅ | None |
| `/profile` | ✅ | ✅ | ✅ | None |
| `/admin` | ✅ | ❌ | ✅ | ADMIN only |
| `/monitoring` | ✅ | ❌ | ✅ | ADMIN only |
| `/billing` | ✅ | ❌ | ✅ | ADMIN only |
| `/403` | ✅ | ✅ | ❌ | None (Error page) |
| `/404` | ✅ | ✅ | ❌ | None (Error page) |

## RBAC Implementation Components

### 1. AuthGuard Component
**Location**: `components/Auth/AuthGuard.tsx`

**Purpose**: Protects routes with authentication and role-based access control

**Props**:
- `requireAuth` (boolean): Whether authentication is required
- `requiredRole` (string, optional): Specific role required for access
- `fallbackPath` (string): Redirect path for unauthorized users

**Usage Examples**:
```tsx
// Authentication only
<AuthGuard requireAuth={true}>
  <ComponentContent />
</AuthGuard>

// Role-specific access
<AuthGuard requireAuth={true} requiredRole="ADMIN">
  <AdminContent />
</AuthGuard>
```

### 2. RoleBasedComponent
**Location**: `components/Auth/RoleBasedComponent.tsx`

**Purpose**: Conditionally renders components based on user roles

**Props**:
- `allowedRoles` (string[]): Array of roles allowed to see the component
- `fallback` (ReactNode, optional): Component to show if access denied

**Usage Example**:
```tsx
<RoleBasedComponent allowedRoles={["ADMIN"]}>
  <AdminOnlyButton />
</RoleBasedComponent>
```

### 3. Navigation Role Filtering
**Location**: `components/Navigation/Sidebar.tsx`, `components/Navigation/SidebarMobile.tsx`

**Implementation**: Admin-only navigation items are wrapped in `RoleBasedComponent`

## Authentication Flow

### 1. Login Process
1. User provides credentials on login page (`/`)
2. Authentication API validates credentials
3. Tokens and user role stored in localStorage:
   - `access_token`
   - `refresh_token`
   - `user_role`
   - `user_id`

### 2. Route Protection
1. `AuthGuard` checks for valid tokens in localStorage
2. If `requiredRole` specified, validates user role matches
3. Redirects to `/403` if role mismatch
4. Redirects to `/` if not authenticated

### 3. Token Management
- Access tokens automatically refreshed via API interceptors
- Logout clears all authentication data from localStorage

## Security Considerations

### 1. Frontend Security Limitations
- Role validation is performed client-side for UI purposes only
- **Critical**: Backend APIs must enforce role-based permissions
- Frontend RBAC is for user experience, not security enforcement

### 2. Token Storage
- Tokens stored in localStorage (consider httpOnly cookies for production)
- Automatic token refresh prevents session expiration
- Logout properly clears all stored authentication data

### 3. Route Protection
- All protected routes wrapped in `AuthGuard`
- Role-specific routes specify `requiredRole` parameter
- Fallback redirects prevent unauthorized access

## Recent RBAC Fixes Applied

### Issue Resolution: Consumer Role Access
**Problem**: Users with "consumer" role were unable to access testing-ground pages and experiencing 403 errors

**Root Cause Analysis**:
1. Missing `AuthGuard` wrappers on testing-ground pages
2. **CRITICAL**: Testing-ground developer page was importing and rendering admin-only pages (MonitoringPage, AdminPage) causing 403 errors for CONSUMER users

**Solution Applied**:
1. Added `AuthGuard requireAuth={true}` to:
   - `/testing-ground/developer.tsx`
   - `/testing-ground/user.tsx`
   - `/testing-ground/dev.tsx`
2. Added role restrictions to admin-only pages:
   - `/monitoring/index.tsx` - Added `requiredRole="ADMIN"`
   - `/billing.tsx` - Added `requiredRole="ADMIN"`
3. **CRITICAL FIX**: Fixed testing-ground developer page:
   - Added `RoleBasedComponent` wrapper around admin tabs
   - Made admin TabPanels role-based to prevent 403 errors
   - Added user role state management

### Current Status
- ✅ All testing-ground pages accessible to authenticated users (both ADMIN and CONSUMER)
- ✅ Admin-only pages properly restricted to ADMIN role
- ✅ Navigation menu shows/hides items based on user role
- ✅ Proper authentication required for all protected routes
- ✅ **FIXED**: No more 403 errors when CONSUMER users access testing-ground pages
- ✅ Admin tabs in testing-ground only visible to ADMIN users

## Testing RBAC Implementation

### Test Cases for CONSUMER Role
1. **Login as CONSUMER** → Should succeed
2. **Access `/testing-ground`** → Should succeed
3. **Access `/testing-ground/developer`** → Should succeed  
4. **Access `/testing-ground/user`** → Should succeed
5. **Access `/services`** → Should succeed
6. **Access `/models`** → Should succeed
7. **Access `/pipeline`** → Should succeed
8. **Access `/admin`** → Should redirect to `/403`
9. **Access `/monitoring`** → Should redirect to `/403`
10. **Access `/billing`** → Should redirect to `/403`

### Test Cases for ADMIN Role
1. **Login as ADMIN** → Should succeed
2. **Access all pages** → Should succeed (no restrictions)
3. **See admin navigation items** → Should be visible
4. **Access admin functionality** → Should work properly

## Troubleshooting Common RBAC Issues

### 1. "Access Denied" for Valid Users
- Check user role in localStorage: `localStorage.getItem("user_role")`
- Verify `AuthGuard` configuration on the page
- Ensure role matches `requiredRole` parameter exactly

### 2. Navigation Items Not Showing
- Check `RoleBasedComponent` wrapper in navigation components
- Verify `allowedRoles` array includes user's role
- Check localStorage for correct role value

### 3. Infinite Redirect Loops
- Verify fallback paths don't create circular redirects
- Check authentication token validity
- Ensure login page (`/`) doesn't require authentication

## Future Enhancements

### 1. Enhanced Security
- Implement httpOnly cookies for token storage
- Add CSRF protection
- Implement proper session management

### 2. Granular Permissions
- Sub-role permissions within ADMIN/CONSUMER
- Feature-specific access control
- API endpoint-level permissions

### 3. Audit and Monitoring
- User access logging
- Role change tracking
- Security event monitoring
