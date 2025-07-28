# RBAC Testing Script for Dhruva Platform

## Overview
This document provides a comprehensive testing script to verify the Role-Based Access Control (RBAC) implementation in the Dhruva Platform frontend.

## Prerequisites
1. Dhruva Platform running locally or on server
2. Test user accounts with different roles:
   - ADMIN user credentials
   - CONSUMER user credentials
3. Browser with developer tools access

## Test Environment Setup

### 1. Clear Browser Storage
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
```

### 2. Check Current User Role
```javascript
// Run in browser console to check current user
console.log('User Role:', localStorage.getItem('user_role'));
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('User ID:', localStorage.getItem('user_id'));
```

## Test Cases

### Test Suite 1: CONSUMER Role Access Control

#### 1.1 Login as CONSUMER
**Steps:**
1. Navigate to `/` (login page)
2. Enter CONSUMER user credentials
3. Click login

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to appropriate dashboard/home page
- ✅ `localStorage.getItem('user_role')` returns `"CONSUMER"`

#### 1.2 Test Accessible Pages for CONSUMER
**Test each URL directly in browser:**

| URL | Expected Result | Status |
|-----|----------------|--------|
| `/testing-ground` | ✅ Access granted | |
| `/testing-ground/developer` | ✅ Access granted | |
| `/testing-ground/user` | ✅ Access granted | |
| `/testing-ground/dev` | ✅ Access granted | |
| `/services` | ✅ Access granted | |
| `/services/view` | ✅ Access granted | |
| `/models` | ✅ Access granted | |
| `/models/view` | ✅ Access granted | |
| `/pipeline` | ✅ Access granted | |
| `/profile` | ✅ Access granted | |

#### 1.3 Test Restricted Pages for CONSUMER
**Test each URL directly in browser:**

| URL | Expected Result | Status |
|-----|----------------|--------|
| `/admin` | ❌ Redirect to `/403` | |
| `/monitoring` | ❌ Redirect to `/403` | |
| `/billing` | ❌ Redirect to `/403` | |

#### 1.4 Test Navigation Menu for CONSUMER
**Check navigation elements:**
- ✅ Testing Ground button/link visible
- ✅ Services link visible  
- ✅ Models link visible
- ✅ Pipeline link visible
- ❌ Admin link hidden
- ❌ Monitoring link hidden
- ❌ Billing link hidden

### Test Suite 2: ADMIN Role Access Control

#### 2.1 Login as ADMIN
**Steps:**
1. Logout current user
2. Navigate to `/` (login page)
3. Enter ADMIN user credentials
4. Click login

**Expected Result:**
- ✅ Login successful
- ✅ `localStorage.getItem('user_role')` returns `"ADMIN"`

#### 2.2 Test All Pages Access for ADMIN
**Test each URL directly in browser:**

| URL | Expected Result | Status |
|-----|----------------|--------|
| `/testing-ground` | ✅ Access granted | |
| `/testing-ground/developer` | ✅ Access granted | |
| `/testing-ground/user` | ✅ Access granted | |
| `/testing-ground/dev` | ✅ Access granted | |
| `/services` | ✅ Access granted | |
| `/services/view` | ✅ Access granted | |
| `/models` | ✅ Access granted | |
| `/models/view` | ✅ Access granted | |
| `/pipeline` | ✅ Access granted | |
| `/profile` | ✅ Access granted | |
| `/admin` | ✅ Access granted | |
| `/monitoring` | ✅ Access granted | |
| `/billing` | ✅ Access granted | |

#### 2.3 Test Navigation Menu for ADMIN
**Check navigation elements:**
- ✅ All navigation items visible
- ✅ Admin link visible and functional
- ✅ Monitoring link visible (if in navigation)
- ✅ Billing link visible (if in navigation)

### Test Suite 3: Authentication Flow

#### 3.1 Unauthenticated Access
**Steps:**
1. Clear localStorage: `localStorage.clear()`
2. Try accessing protected pages

**Test URLs:**

| URL | Expected Result | Status |
|-----|----------------|--------|
| `/testing-ground` | ❌ Redirect to `/` | |
| `/services` | ❌ Redirect to `/` | |
| `/models` | ❌ Redirect to `/` | |
| `/admin` | ❌ Redirect to `/` | |
| `/profile` | ❌ Redirect to `/` | |

#### 3.2 Token Expiration Handling
**Steps:**
1. Login successfully
2. Manually expire token: `localStorage.setItem('access_token', 'expired_token')`
3. Try accessing protected pages

**Expected Result:**
- ❌ Should redirect to login or refresh token automatically

### Test Suite 4: Edge Cases

#### 4.1 Invalid Role in localStorage
**Steps:**
1. Login successfully
2. Manually set invalid role: `localStorage.setItem('user_role', 'INVALID_ROLE')`
3. Try accessing admin pages

**Expected Result:**
- ❌ Should redirect to `/403` for admin pages

#### 4.2 Missing Role in localStorage
**Steps:**
1. Login successfully
2. Remove role: `localStorage.removeItem('user_role')`
3. Try accessing protected pages

**Expected Result:**
- ❌ Should redirect to login or show access denied

#### 4.3 Direct URL Access
**Test direct URL access for all protected routes while logged in with different roles**

### Test Suite 5: Functional Testing

#### 5.1 Testing Ground Functionality
**For CONSUMER and ADMIN users:**
1. Access `/testing-ground/developer`
2. Test API functionality (translation, ASR, TTS)
3. Access `/testing-ground/user`
4. Test chatbot functionality

**Expected Result:**
- ✅ All features work for both roles

#### 5.2 Services and Models Pages
**For CONSUMER and ADMIN users:**
1. Access `/services`
2. Browse available services
3. Access `/models`
4. Browse available models

**Expected Result:**
- ✅ Full functionality for both roles

## Automated Testing Script

### Browser Console Test Script
```javascript
// RBAC Test Script - Run in browser console
async function testRBAC() {
    const currentRole = localStorage.getItem('user_role');
    console.log(`Testing RBAC for role: ${currentRole}`);
    
    const testUrls = [
        { url: '/testing-ground', allowedRoles: ['ADMIN', 'CONSUMER'] },
        { url: '/testing-ground/developer', allowedRoles: ['ADMIN', 'CONSUMER'] },
        { url: '/testing-ground/user', allowedRoles: ['ADMIN', 'CONSUMER'] },
        { url: '/services', allowedRoles: ['ADMIN', 'CONSUMER'] },
        { url: '/models', allowedRoles: ['ADMIN', 'CONSUMER'] },
        { url: '/pipeline', allowedRoles: ['ADMIN', 'CONSUMER'] },
        { url: '/profile', allowedRoles: ['ADMIN', 'CONSUMER'] },
        { url: '/admin', allowedRoles: ['ADMIN'] },
        { url: '/monitoring', allowedRoles: ['ADMIN'] },
        { url: '/billing', allowedRoles: ['ADMIN'] }
    ];
    
    for (const test of testUrls) {
        const shouldHaveAccess = test.allowedRoles.includes(currentRole);
        console.log(`Testing ${test.url} - Should have access: ${shouldHaveAccess}`);
        
        // Note: This would need to be adapted for actual navigation testing
        // window.location.href = test.url;
    }
}

// Run the test
testRBAC();
```

## Manual Testing Checklist

### Pre-Test Setup
- [ ] Platform is running and accessible
- [ ] Test user accounts are available
- [ ] Browser developer tools are open

### CONSUMER Role Tests
- [ ] Login as CONSUMER successful
- [ ] Can access testing-ground pages
- [ ] Can access services pages
- [ ] Can access models pages
- [ ] Can access pipeline page
- [ ] Can access profile page
- [ ] Cannot access admin page (redirects to 403)
- [ ] Cannot access monitoring page (redirects to 403)
- [ ] Cannot access billing page (redirects to 403)
- [ ] Admin navigation items are hidden

### ADMIN Role Tests
- [ ] Login as ADMIN successful
- [ ] Can access all pages including admin-only pages
- [ ] All navigation items are visible
- [ ] Admin functionality works properly

### Authentication Tests
- [ ] Unauthenticated users redirected to login
- [ ] Token refresh works properly
- [ ] Logout clears all authentication data

## Troubleshooting Common Issues

### Issue: "Access Denied" for valid users
**Check:**
1. User role in localStorage: `localStorage.getItem('user_role')`
2. Access token validity: `localStorage.getItem('access_token')`
3. Page AuthGuard configuration

### Issue: Navigation items not showing/hiding properly
**Check:**
1. RoleBasedComponent implementation in navigation
2. User role value matches exactly (case-sensitive)

### Issue: Infinite redirect loops
**Check:**
1. Fallback paths in AuthGuard
2. Login page doesn't require authentication
3. 403 page is accessible without authentication

## Test Results Template

### Test Execution Date: ___________
### Tester: ___________
### Platform Version: ___________

| Test Case | CONSUMER Result | ADMIN Result | Notes |
|-----------|----------------|--------------|-------|
| Login | ✅/❌ | ✅/❌ | |
| Testing Ground Access | ✅/❌ | ✅/❌ | |
| Services Access | ✅/❌ | ✅/❌ | |
| Models Access | ✅/❌ | ✅/❌ | |
| Admin Access | ❌ (Expected) | ✅/❌ | |
| Navigation Visibility | ✅/❌ | ✅/❌ | |

### Overall RBAC Status: ✅ PASS / ❌ FAIL

### Issues Found:
1. ___________
2. ___________
3. ___________
