export function isGmail(email) {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(email);
}

export const isValidMobileNumber = (number) =>
  /^09\d{9}$/.test(number); 
