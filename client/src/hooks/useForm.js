import { useFormik } from 'formik';
import * as Yup from 'yup';

/**
 * Custom hook for form handling with Formik and Yup
 * @param {Object} options - Hook options
 * @param {Object} options.initialValues - Initial form values
 * @param {Object} options.validationSchema - Yup validation schema
 * @param {Function} options.onSubmit - Form submission handler
 * @param {boolean} options.enableReinitialize - Enable form value reinitialization
 * @returns {Object} - Formik form state and helpers
 */
const useForm = ({
  initialValues,
  validationSchema,
  onSubmit,
  enableReinitialize = false,
}) => {
  const formik = useFormik({
    initialValues,
    validationSchema: Yup.object().shape(validationSchema),
    onSubmit,
    enableReinitialize,
  });

  // Helper to check if a field has an error and has been touched
  const hasError = (fieldName) =>
    formik.touched[fieldName] && Boolean(formik.errors[fieldName]);

  // Helper to get error message for a field
  const getErrorMessage = (fieldName) =>
    formik.touched[fieldName] && formik.errors[fieldName];

  // Helper to handle field change with custom handling
  const handleCustomChange = (fieldName, value) => {
    formik.setFieldValue(fieldName, value);
  };

  // Helper to handle field blur with custom handling
  const handleCustomBlur = (fieldName) => {
    formik.setFieldTouched(fieldName, true);
  };

  return {
    ...formik,
    hasError,
    getErrorMessage,
    handleCustomChange,
    handleCustomBlur,
  };
};

export default useForm; 