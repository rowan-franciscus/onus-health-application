import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import styles from './Help.module.css';

/**
 * Help page component
 */
const Help = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determine the dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user) return '/sign-in';
    
    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'provider':
        return '/provider/dashboard';
      case 'patient':
        return '/patient/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className={styles.helpContainer}>
      <div className={styles.header}>
        <h1>Help Center</h1>
        <Button 
          onClick={() => navigate(getDashboardRoute())} 
          className={styles.backButton}
        >
          Back to Dashboard
        </Button>
      </div>

      <div className={styles.content}>
        <Card className={styles.welcomeCard}>
          <h2>Welcome to Onus Help Center</h2>
          <p>
            Find answers to your questions and learn how to make the most of the Onus Digital Health Record platform.
          </p>
        </Card>

        <div className={styles.helpSections}>
          <Card className={styles.helpSection}>
            <h3>Getting Started</h3>
            <ul>
              <li>Creating your account</li>
              <li>Completing your profile</li>
              <li>Understanding your dashboard</li>
              <li>Navigating the platform</li>
            </ul>
          </Card>

          <Card className={styles.helpSection}>
            <h3>For Patients</h3>
            <ul>
              <li>Viewing your consultations</li>
              <li>Accessing medical records</li>
              <li>Managing provider connections</li>
              <li>Updating your profile</li>
            </ul>
          </Card>

          <Card className={styles.helpSection}>
            <h3>For Health Providers</h3>
            <ul>
              <li>Adding new patients</li>
              <li>Creating consultations</li>
              <li>Managing patient records</li>
              <li>Requesting patient access</li>
            </ul>
          </Card>

          <Card className={styles.helpSection}>
            <h3>Security & Privacy</h3>
            <ul>
              <li>Data protection measures</li>
              <li>Privacy controls</li>
              <li>Password management</li>
              <li>Two-factor authentication</li>
            </ul>
          </Card>
        </div>

        <Card className={styles.contactCard}>
          <h2>Need More Help?</h2>
          <p>
            If you can't find the answer you're looking for, please don't hesitate to contact our support team.
          </p>
          <div className={styles.contactInfo}>
            <div className={styles.contactMethod}>
              <h4>Email Support</h4>
              <p>support@onus.health</p>
              <p className={styles.responseTime}>Response time: 24-48 hours</p>
            </div>
            <div className={styles.contactMethod}>
              <h4>Phone Support</h4>
              <p>081 000 0000</p>
              <p className={styles.responseTime}>Monday - Friday, 9AM - 5PM SAST</p>
            </div>
          </div>
        </Card>

        <Card className={styles.faqCard}>
          <h2>Frequently Asked Questions</h2>
          <div className={styles.faqItem}>
            <h4>How do I reset my password?</h4>
            <p>
              Click on "Forgot Password" on the sign-in page and follow the instructions sent to your email.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h4>How do I connect with a health provider?</h4>
            <p>
              Navigate to the Connections page and search for your provider by name or email. Send a connection request and wait for approval.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h4>Is my health data secure?</h4>
            <p>
              Yes, we use industry-standard encryption and security measures to protect your health information. All data is stored securely and accessed only by authorized personnel.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h4>Can I download my medical records?</h4>
            <p>
              Yes, you can download your consultations and medical records in PDF format from the respective pages.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Help; 