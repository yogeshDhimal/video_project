/** Normalize API auth/validation errors for display (toasts, inline). */
export function getAuthErrorMessage(err) {
  const data = err.response?.data;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (Array.isArray(data?.errors) && data.errors[0]?.msg) return data.errors[0].msg;
  const status = err.response?.status;
  if (status === 401) return 'Invalid credentials';
  if (status === 403) return data?.reason ? `Account suspended: ${data.reason}` : 'Access denied';
  if (status === 409) return data?.message || 'This email is already registered';
  if (status === 400) return 'Please check your input and try again';
  return 'Something went wrong. Please try again.';
}
