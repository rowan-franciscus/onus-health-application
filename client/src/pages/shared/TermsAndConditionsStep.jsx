import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
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
                  <strong>Effective Date: [Date]</strong>
                </p>
                
                <h4>1. Acceptance of Terms</h4>
                <p>
                  By accessing and using the Onus Health digital health record application ("the Service"), 
                  you accept and agree to be bound by the terms and provision of this agreement. If you do not 
                  agree to abide by the above, please do not use this service.
                </p>
                
                <h4>2. Use of Service</h4>
                <p>
                  The Service is designed to help manage and store electronic health records. You must provide 
                  accurate, complete, and current information. You are responsible for maintaining the 
                  confidentiality of your account and password.
                </p>
                
                <h4>3. Privacy and Data Protection</h4>
                <p>
                  Your use of the Service is also governed by our Privacy Policy. We are committed to protecting 
                  your personal health information and maintaining compliance with all applicable healthcare 
                  privacy regulations, including HIPAA where applicable.
                </p>
                
                <h4>4. Medical Disclaimer</h4>
                <p>
                  The Service is not intended to be a substitute for professional medical advice, diagnosis, 
                  or treatment. Always seek the advice of your physician or other qualified health provider 
                  with any questions you may have regarding a medical condition.
                </p>
                
                <h4>5. User Responsibilities</h4>
                <p>
                  You agree to use the Service only for lawful purposes and in accordance with these Terms. 
                  You agree not to use the Service:
                </p>
                <ul>
                  <li>In any way that violates any applicable federal, state, local, or international law or regulation</li>
                  <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail," "chain letter," "spam," or any other similar solicitation</li>
                  <li>To impersonate or attempt to impersonate another user, person, or entity</li>
                  <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
                </ul>
                
                <h4>6. Intellectual Property Rights</h4>
                <p>
                  The Service and its entire contents, features, and functionality are owned by Onus Health, 
                  its licensors, or other providers of such material and are protected by copyright, trademark, 
                  patent, trade secret, and other intellectual property or proprietary rights laws.
                </p>
                
                <h4>7. Termination</h4>
                <p>
                  We may terminate or suspend your account and bar access to the Service immediately, without 
                  prior notice or liability, under our sole discretion, for any reason whatsoever and without 
                  limitation, including but not limited to a breach of the Terms.
                </p>
                
                <h4>8. Disclaimer of Warranties</h4>
                <p>
                  The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided 
                  without warranties of any kind, whether express or implied, including, but not limited to, 
                  implied warranties of merchantability, fitness for a particular purpose, non-infringement, 
                  or course of performance.
                </p>
                
                <h4>9. Limitation of Liability</h4>
                <p>
                  In no event shall Onus Health, nor its directors, employees, partners, agents, suppliers, 
                  or affiliates, be liable for any indirect, incidental, special, consequential, or punitive 
                  damages, including without limitation, loss of profits, data, use, goodwill, or other 
                  intangible losses.
                </p>
                
                <h4>10. Governing Law</h4>
                <p>
                  These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], 
                  without regard to its conflict of law provisions. Our failure to enforce any right or provision 
                  of these Terms will not be considered a waiver of those rights.
                </p>
                
                <h4>11. Changes to Terms</h4>
                <p>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                  If a revision is material, we will provide at least 30 days notice prior to any new terms 
                  taking effect.
                </p>
                
                <h4>12. Contact Information</h4>
                <p>
                  If you have any questions about these Terms, please contact us at:
                  <br />
                  Email: support@onushealth.com
                  <br />
                  Address: [Your Company Address]
                </p>
                
                <hr style={{ margin: '30px 0' }} />
                
                <h3>Privacy Policy</h3>
                <p>
                  <strong>Effective Date: [Date]</strong>
                </p>
                
                <h4>1. Information We Collect</h4>
                <p>
                  We collect information you provide directly to us, such as when you create an account, 
                  fill out forms, or communicate with us. This includes personal information, health information, 
                  and other data necessary to provide our services.
                </p>
                
                <h4>2. How We Use Your Information</h4>
                <p>
                  We use the information we collect to provide, maintain, and improve our services, including 
                  to process transactions, send notifications, and provide customer support.
                </p>
                
                <h4>3. Information Sharing and Disclosure</h4>
                <p>
                  We do not sell, trade, or otherwise transfer your personal health information to third parties 
                  without your consent, except as described in this privacy policy or as required by law.
                </p>
                
                <h4>4. Data Security</h4>
                <p>
                  We implement appropriate technical and organizational measures to protect the security of 
                  your personal information, including encryption, access controls, and secure data storage.
                </p>
                
                <h4>5. Your Rights</h4>
                <p>
                  You have the right to access, correct, or delete your personal information. You may also 
                  have additional rights depending on your jurisdiction.
                </p>
                
                <h4>6. Updates to This Policy</h4>
                <p>
                  We may update this privacy policy from time to time. We will notify you of any changes by 
                  posting the new policy on this page and updating the effective date.
                </p>
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