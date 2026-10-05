export interface PasswordCriteria {
  label: string;
  met: boolean;
}

export const validatePasswordStrength = (pwd: string) => {
  const hasMinLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  const criteria: PasswordCriteria[] = [
    { label: '8+ characters', met: hasMinLength },
    { label: 'Uppercase letter (A-Z)', met: hasUpper },
    { label: 'Lowercase letter (a-z)', met: hasLower },
    { label: 'Number (0-9)', met: hasNumber },
    { label: 'Special symbol (!@#$... )', met: hasSpecial },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const isValid = metCount === 5;

  let strengthLabel = 'Very Weak';
  let strengthColor = 'bg-red-500';
  let strengthWidth = 'w-1/5';

  if (metCount === 2) {
    strengthLabel = 'Weak';
    strengthColor = 'bg-orange-500';
    strengthWidth = 'w-2/5';
  } else if (metCount === 3) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-amber-500';
    strengthWidth = 'w-3/5';
  } else if (metCount === 4) {
    strengthLabel = 'Good';
    strengthColor = 'bg-blue-500';
    strengthWidth = 'w-4/5';
  } else if (metCount === 5) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-600';
    strengthWidth = 'w-full';
  }

  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    criteria,
    metCount,
    isValid,
    strengthLabel,
    strengthColor,
    strengthWidth,
  };
};
