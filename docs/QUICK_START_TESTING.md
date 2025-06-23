# Quick Start Testing Guide - Onus Health Application

## 🚀 Getting Started

### Application URL
https://onus-health-frontend.onrender.com/

### Test Accounts (Pre-configured)
```
Admin:    rowan.franciscus.2@gmail.com    / password@123
Patient:  rowan.franciscus.3@gmail.com  / password@123
Provider: rowan.franciscus.4@gmail.com / password@123
Admin:          admin.test@email.com     / password@123
Patient:        patient.test@email.com   / password@123
Health Provider: provider.test@email.com  / password@123
```

## 📋 Essential Test Scenarios

### Scenario 1: Admin Workflow
1. **Login as Admin**
   - Go to `https://onus-health-frontend.onrender.com/admin/sign-in`
   - Use admin credentials
   - View analytics dashboard

2. **Check Provider Verification** 
   - Click "Health Providers" → "Verification Requests"
   - If any pending, review and approve/reject

3. **View Users**
   - Check "Patients" section
   - Check "Health Providers" → "Verified Providers"
   - Try "View as Patient/Provider" feature

### Scenario 2: New Provider Registration
1. **Register New Provider**
   - Go to `/sign-up`
   - Choose "Health Provider" role
   - Complete registration
   - Check email for verification link

2. **Complete Onboarding**
   - 6-step form with professional details
   - Submit for admin approval

3. **Admin Approval**
   - Login as admin
   - Go to provider verification requests
   - Approve the new provider

4. **Provider Access**
   - Login as the approved provider
   - Explore dashboard and features

### Scenario 3: Patient-Provider Interaction
1. **Login as Provider** (use test provider account)
   - Click "Patients"
   - Click "Add New Patient"
   - Enter: `rowan.franciscus.4@gmail.com`
   - Start creating a consultation

2. **Create Consultation**
   - Fill General tab (required)
   - Add Vitals (blood pressure, heart rate, etc.)
   - Add a Medication
   - Upload a test file in Attachments
   - Click "Save & Complete"

3. **Login as Patient** (use test patient account)
   - View new consultation in list
   - Click to see details
   - Check all medical records added
   - Download attached file

4. **Patient Reviews Connections**
   - Go to "Connections"
   - See connected provider
   - Test "Remove Access" (then re-approve if needed)

### Scenario 4: Medical Records Flow
1. **As Patient:**
   - Click "Medical Records"
   - Navigate each category (Vitals, Medications, etc.)
   - Use search and date filters

2. **As Provider:**
   - View aggregated medical records
   - Create another consultation with different record types

### Scenario 5: New Patient Registration
1. **Register New Patient**
   - Use a new email address
   - Complete 8-step onboarding
   - Explore empty dashboard

2. **Provider Adds This Patient**
   - Login as provider
   - Add patient by email
   - Patient receives email notification
   - Patient approves connection

## ⚡ Quick Feature Tests

### Authentication
- [ ] Password reset flow (click "Forgot Password?")
- [ ] Social login (Google/Facebook)
- [ ] Session timeout (wait 30 minutes)

### Search & Filters
- [ ] Search patients/consultations by name
- [ ] Filter by date ranges
- [ ] Filter consultations by status (Draft/Completed)

### Profile Management
- [ ] Edit profile information
- [ ] Change password
- [ ] Upload profile picture

### File Management
- [ ] Upload PDF to consultation
- [ ] Upload image file
- [ ] Download attachments

## 🔍 What to Look For

### Positive Tests
✅ Smooth navigation between pages  
✅ Forms save data correctly  
✅ Search returns relevant results  
✅ Emails are received (check spam)  
✅ File uploads/downloads work  
✅ Role restrictions enforced  

### Common Issues to Check
❌ Login problems (verify email first)  
❌ Missing data (check if consultation is "Completed")  
❌ Provider can't see patient (check connection status)  
❌ Forms not submitting (check required fields)  

## 📧 Email Testing
Emails should be sent for:
- Registration verification
- Password reset
- Provider approval/rejection  
- New consultation (to patient)
- Connection requests

**Email Account Used:** no-reply@onus.health

## 💡 Pro Tips
1. Use browser DevTools (F12) to check for errors
2. Test on different browsers (Chrome, Firefox, Safari)
3. Try mobile view (responsive design)
4. Create multiple test users to test interactions
5. Save test data before deleting accounts

## 🆘 Need Help?
- Check browser console for errors
- Verify you're using correct URLs
- Ensure you're logged in with correct role
- Check spam folder for emails

---

**Next Steps:** After basic testing, refer to `TESTING_GUIDE.md` for comprehensive feature testing. 