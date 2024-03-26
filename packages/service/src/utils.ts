/**
 * Check if target string is a valid domain.
 * @exmaple
 * isDomain('google.com') // => true
 * isDomain('https://google.com') // => false
 * isDomain('localhost') // => false
 * isDomain('localhost', true) // => true
 */
export function isDomain(domain: string, allowLocalhost?: boolean): boolean {
  if (allowLocalhost && domain === 'localhost') {
    return true;
  }
  const regex = /^(?:[-A-Za-z0-9]+\.)+[A-Za-z]{2,}$/;
  return regex.test(domain);
}
