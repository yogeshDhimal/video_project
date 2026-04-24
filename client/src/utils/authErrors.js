export function getAuthErrorMessage(err) {
  if (err.code === 'ERR_NETWORK') {
    return 'Server unreachable. Check your connection or the backend status.';
  }

  const data = err.response?.data;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (Array.isArray(data?.errors) && data.errors[0]?.msg) return data.errors[0].msg;

  const status = err.response?.status;
  if (status === 401) return 'Invalid credentials';
  if (status === 403) return data?.reason ? `Account suspended: ${data.reason}` : 'Access denied';
  if (status === 409) return data?.message || 'This email is already registered';
  if (status === 400) return 'Please check your input and try again';
  if (status === 429) return 'Too many attempts. Please wait a few minutes.';

  return `Something went wrong (Error: ${err.code || status || 'Unknown'}). Please try again.`;

}
