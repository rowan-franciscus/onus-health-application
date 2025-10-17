import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import styles from './FormStep.module.css';

const TermsAndConditionsStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const validationSchema = Yup.object().shape({
    termsAccepted: Yup.boolean()
      .oneOf([true], 'You must accept the terms and conditions to continue')
      .required('You must accept the terms and conditions to continue')
  });

  const initialValues = {
    termsAccepted: formData.termsAccepted || false
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  const handleScroll = (e) => {
    const element = e.target;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (isAtBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Terms and Conditions</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, errors, touched }) => (
          <Form>
            <div className={styles.termsContainer}>
              <div 
                className={styles.termsContent} 
                onScroll={handleScroll}
                style={{ 
                  height: '400px', 
                  overflowY: 'auto', 
                  border: '1px solid #e0e0e0', 
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  marginBottom: '20px'
                }}
              >
                <h3>Terms of Service</h3>
                <p>
                  <strong>Effective Date: July 25, 2025</strong><br />
                  <strong>Last Updated: July 25, 2025</strong><br />
                  <strong>Contact: hello@onus.health</strong>
                </p>
                
                <p>
                  Welcome to Onus, the Electronic Health Record (EHR) platform that empowers patients with ownership of their health data and helps providers deliver better care through access to verified patient records.
                </p>
                
                <h4>Who This Applies To</h4>
                <p>These Terms apply to both:</p>
                <ul>
                  <li>Patients using Onus to store, access, and manage their health data, and</li>
                  <li>Healthcare Providers using Onus to view and update patient records (with proper authorization).</li>
                </ul>
                
                <h4>1. Purpose of Onus</h4>
                <p><strong>Legal:</strong></p>
                <p>Onus provides a secure digital platform enabling:</p>
                <ul>
                  <li>Patients to store, access, and share their electronic health records;</li>
                  <li>Providers to view and input data with patient authorization for informed care decisions;</li>
                  <li>All data is encrypted and securely managed in accordance with international best practices.</li>
                </ul>
                <p>Onus is not a registered healthcare provider, and it does not offer diagnosis, treatment, or medical advice. Any decisions made based on data within Onus remain the sole responsibility of the providers and patients.</p>
                
                <p><strong>Plain-Language:</strong></p>
                <p>Think of Onus like a secure digital vault for your health data. You can view it, share it with your doctor, and keep it for life. Doctors use it to better understand your history and help you more efficiently.</p>
                
                <h4>2. User Responsibilities</h4>
                <p><strong>Patients:</strong></p>
                <ul>
                  <li>Can choose to upload their health data or allow providers to do so.</li>
                  <li>Must authorize providers before they can view or edit records.</li>
                  <li>Are responsible for managing access permissions to their data.</li>
                </ul>
                
                <p><strong>Providers:</strong></p>
                <ul>
                  <li>Must enter data truthfully and maintain medical and professional ethics.</li>
                  <li>May only access patient records with explicit patient authorization.</li>
                  <li>Must keep data confidential and not share it without consent.</li>
                </ul>
                
                <h4>3. Disclaimer of Medical Liability</h4>
                <p><strong>Legal:</strong></p>
                <p>Onus is a data management tool. It does not:</p>
                <ul>
                  <li>Provide medical advice;</li>
                  <li>Verify the accuracy or medical validity of submitted data;</li>
                  <li>Accept liability for health outcomes based on platform data.</li>
                </ul>
                <p>Providers and patients use Onus at their own discretion. Onus assumes no liability for damages arising from incorrect, outdated, or misused data.</p>
                
                <p><strong>Plain-Language:</strong></p>
                <p>We're not doctors - we just help you and your doctor manage data better. Any medical decisions should always be made by you and your healthcare professional.</p>
                
                <h4>4. Suspension & Termination</h4>
                <p><strong>Legal:</strong></p>
                <p>Onus may suspend or terminate any account, without prior notice, if:</p>
                <ul>
                  <li>Fraudulent, illegal, or unethical behavior is detected;</li>
                  <li>Providers share confidential patient data without authorization;</li>
                  <li>Users breach these Terms of Service.</li>
                </ul>
                <p>Suspension may be temporary or permanent, based on the severity of the breach.</p>
                
                <p><strong>Plain-Language:</strong></p>
                <p>If someone breaks the rules or acts shady, we can shut down their account to protect everyone else, including you.</p>
                
                <h4>5. Fees & Payment</h4>
                <p><strong>Legal:</strong></p>
                <p>Currently, Onus is offered free of charge. However:</p>
                <ul>
                  <li>Future fees may be introduced for providers;</li>
                  <li>Patients may be charged for premium features (e.g., analytics or downloadable reports).</li>
                </ul>
                <p>Users will be notified in advance before any pricing changes occur.</p>
                
                <p><strong>Plain-Language:</strong></p>
                <p>Right now, Onus is free! In the future, there might be small charges for extra features - don't worry, we'll always let you know first.</p>
                
                <h4>6. Service Availability & Support</h4>
                <p><strong>Legal:</strong></p>
                <p>Onus is hosted on AWS with a high-availability infrastructure. However, occasional downtimes may occur due to maintenance or unforeseen events.</p>
                <p>Support is available during Namibian business hours: 8am–5pm, Monday to Friday at hello@onus.health.</p>
                
                <p><strong>Plain-Language:</strong></p>
                <p>We're usually up and running, but tech sometimes needs a break. If you need help, we're here during work hours.</p>
                
                <h4>7. Governing Law & Dispute Resolution</h4>
                <p><strong>Legal:</strong></p>
                <p>This Agreement is governed by the laws of the Republic of Namibia. In the event of a dispute:</p>
                <ul>
                  <li>The parties will first attempt to resolve the matter amicably;</li>
                  <li>Failing which, mediation or arbitration will be pursued;</li>
                  <li>If unresolved, legal proceedings may commence in Namibian courts.</li>
                </ul>
                <p>Disputes must be raised within a reasonable period from the event giving rise to the dispute.</p>
                
                <p><strong>Plain-Language:</strong></p>
                <p>Namibian law applies here. If something goes wrong, we'll try to work it out with you and your provider. If not, mediation or court is an option.</p>
                
                <h4>8. Policy Updates & User Rights</h4>
                <p><strong>Legal:</strong></p>
                <p>Onus reserves the right to update this Terms of Service at any time. Users will be informed of material changes and may contact us or close their account if they disagree with any updated terms.</p>
                <p>You may terminate your account at any time and request deletion of your data.</p>
                
                <p><strong>Plain-Language:</strong></p>
                <p>We'll update these terms when necessary. If you don't agree with changes, you're free to terminate your account any time - but we hope to make your time with Onus as good as possible for you to stay!</p>
                
                <h4>9. Contact Us</h4>
                <p>For questions, feedback, or complaints, email: <strong>hello@onus.health</strong></p>
                
                <hr style={{ margin: '30px 0' }} />
                
                <h3>Privacy Policy</h3>
                <p>
                  <strong>Effective Date: July 25, 2025</strong><br />
                  <strong>Last Updated: July 25, 2025</strong><br />
                  <strong>Contact: hello@onus.health</strong>
                </p>
                
                <h4>1. Introduction</h4>
                <p>This Privacy Policy outlines how Onus Technologies ("Onus", "we", "us", or "our") collects, uses, stores, and protects personal data provided by users of the Onus Electronic Health Record (EHR) platform, including both Patients and Healthcare Providers ("you" or "users").</p>
                <p>This Privacy Policy applies to all users located in Namibia, and where applicable, follows international data protection standards, including those aligned with the General Data Protection Regulation (GDPR) and the U.S. HIPAA framework, given the absence of local data protection legislation in Namibia.</p>
                
                <h4>2. Plain Language Summary</h4>
                <p>To make this policy easier to understand, here's a quick summary:</p>
                <ul>
                  <li>We collect your data to provide you with secure, lifetime access to your health information.</li>
                  <li>You control your data and can delete it or withdraw consent at any time.</li>
                  <li>We protect your data using best-in-class security, including end to end encryption.</li>
                  <li>We do not share your health data with third parties unless you explicitly authorize it.</li>
                  <li>We may use anonymized data to improve the platform and contribute to better healthcare in Namibia, as well as draw valuable insights that will benefit you, all anonymized.</li>
                  <li>You can contact us anytime at hello@onus.health for questions or concerns.</li>
                </ul>
                
                <h4>3. Information We Collect</h4>
                <p><strong>3.1 For Patients:</strong></p>
                <ul>
                  <li>Full Name</li>
                  <li>Health Records and Metrics</li>
                  <li>Contact Information</li>
                  <li>Insurance Provider</li>
                  <li>Date of Birth or Age</li>
                  <li>Emergency Contact Information</li>
                </ul>
                
                <p><strong>3.2 For Providers:</strong></p>
                <ul>
                  <li>Full Name</li>
                  <li>Professional Credentials</li>
                  <li>Practice or License Number</li>
                  <li>Contact Information</li>
                  <li>Practice or Institution Details</li>
                </ul>
                
                <p>We may also collect login and usage information, as well as contact details for newsletters and other communications.</p>
                
                <h4>4. How We Use Your Information</h4>
                <p>We use your personal data for the following purposes:</p>
                <ul>
                  <li>To provide secure access to health data for patients.</li>
                  <li>To enable authorized providers to deliver quality care.</li>
                  <li>To verify provider credentials and enable communication.</li>
                  <li>To analyze anonymized and aggregated data for statistical health insights.</li>
                  <li>To improve the Onus platform through usage feedback (e.g., heatmaps or future analytics).</li>
                </ul>
                
                <h4>5. Consent and User Rights</h4>
                <p>When you sign up for Onus, you give Onus consent to this, and prior to processing anonymized data, we will ask for consent for this specifically again.</p>
                <ul>
                  <li>You can withdraw consent at any time by deleting your account.</li>
                  <li>Following deletion, data will remain on backup systems for 6 months, after which it will be permanently erased.</li>
                  <li>You may download your health records before deletion.</li>
                </ul>
                
                <h4>6. Minors and Guardian Consent</h4>
                <p>Individuals under 18 years old must have consent provided by a parent or legal guardian. Guardians may register and manage accounts for minors until they reach the legal age, at which point full access and ownership transfer to the individual should be given.</p>
                
                <h4>7. Data Storage and Security</h4>
                <ul>
                  <li>All data is hosted on Amazon Web Services (AWS), which meets global security compliance standards.</li>
                  <li>Personal and health data is protected via end-to-end encryption, both at rest and in transit.</li>
                  <li>Onus cannot access health data unless it has been anonymized.</li>
                  <li>Access to user data is restricted to authorized patients and providers only.</li>
                </ul>
                
                <h4>8. Sharing Data with Third Parties</h4>
                <ul>
                  <li>Onus does not share health data with third parties unless explicitly authorized by the patient.</li>
                  <li>Personal contact data (e.g., name, email) may be processed by third-party tools for sending newsletters or improving the platform.</li>
                  <li>We do not sell or monetize user data for advertising or profiling.</li>
                </ul>
                
                <h4>9. Anonymized Data Use</h4>
                <p>With patient consent, Onus may use anonymized data to:</p>
                <ul>
                  <li>Identify nationwide health trends.</li>
                  <li>Inform future health initiatives.</li>
                  <li>Deliver personalized analytics to patients and providers (in future updates).</li>
                </ul>
                <p>Anonymized data will never include identifying information and cannot be traced back to individual users.</p>
                
                <h4>10. Access Outside Namibia</h4>
                <p>Currently, Onus is available only to users in Namibia. This policy will be updated once international availability is introduced.</p>
                
                <h4>11. Data Breach Notification</h4>
                <p>While Onus follows best practices in data security, in the unlikely event of a breach:</p>
                <ul>
                  <li>Affected users will be informed promptly and transparently.</li>
                  <li>Onus will provide clear instructions and support where applicable.</li>
                </ul>
                <p>We are in the process of developing a formal breach response plan.</p>
                
                <h4>12. Contact</h4>
                <p>If you have questions, concerns, or requests related to your data, please contact us at:</p>
                <p>📧 <strong>hello@onus.health</strong></p>
              </div>
              
              <div className={styles.checkboxContainer}>
                <label className={styles.checkboxLabel}>
                  <Field
                    type="checkbox"
                    name="termsAccepted"
                    checked={values.termsAccepted}
                    onChange={(e) => setFieldValue('termsAccepted', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>
                    I have read, understood, and agree to the Terms of Service and Privacy Policy
                  </span>
                </label>
                {errors.termsAccepted && touched.termsAccepted && (
                  <div className={styles.errorText}>{errors.termsAccepted}</div>
                )}
              </div>
              
              {!scrolledToBottom && (
                <p className={styles.scrollHint}>
                  Please scroll to the bottom to read all terms and conditions
                </p>
              )}
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={previous}
                className={classNames(styles.button, styles.buttonSecondary)}
              >
                Previous
              </button>
              <button
                type="submit"
                className={classNames(styles.button, styles.buttonPrimary)}
                disabled={isSubmitting}
              >
                Next
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default TermsAndConditionsStep; 