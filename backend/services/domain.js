/**
 * Domain Service - Analyzes URLs and domains for phishing and malicious patterns
 */

const PHISHING_KEYWORDS = [
  'airdrop', 'claim', 'mint', 'bonus', 'rewards', 'uniswap', 'solana', 'phantom',
  'wallet', 'gift', 'lucky', 'security', 'update', 'verify', 'account', 'login',
  'staking', 'presale', 'whitelist', 'launchpad'
];

const MALICIOUS_TLDS = [
  '.net', '.xyz', '.zip', '.top', '.work', '.click', '.monster', '.support'
];

/**
 * Check if a string looks like a URL or domain
 */
export function isUrlOrDomain(input) {
  const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
  return urlPattern.test(input);
}

/**
 * Analyze a domain for suspicious patterns
 */
export async function analyzeDomain(input) {
  let domain = input.toLowerCase();
  
  // Clean input
  try {
    if (domain.startsWith('http')) {
      const url = new URL(domain);
      domain = url.hostname;
    }
  } catch (e) {
    // If it's just a domain name like "google.com"
  }

  const result = {
    isSuspicious: false,
    reasons: [],
    score: 0
  };

  // 1. Check for common phishing keywords
  const foundKeywords = PHISHING_KEYWORDS.filter(keyword => domain.includes(keyword));
  if (foundKeywords.length >= 2) {
    result.isSuspicious = true;
    result.score += 60; // Increased from 40
    result.reasons.push(`Contains multiple high-risk keywords: ${foundKeywords.join(', ')}`);
  } else if (foundKeywords.length === 1) {
    result.score += 25; // Increased from 15
    result.reasons.push(`Contains suspicious keyword: ${foundKeywords[0]}`);
  }

  // 2. Check for suspicious TLDs
  const foundTld = MALICIOUS_TLDS.find(tld => domain.endsWith(tld));
  if (foundTld) {
    result.score += 20; // Increased from 10
    result.reasons.push(`Uses a high-risk TLD: ${foundTld}`);
  }

  // 3. Check for specific brand impersonation (Look-alike domains)
  if (domain.includes('uniswap') && !domain.endsWith('uniswap.org') && !domain.endsWith('uniswap.com')) {
    result.isSuspicious = true;
    result.score += 70; // Increased from 50
    result.reasons.push('HIGH PARANOIA: Brand impersonation detected (Uniswap)');
  }

  if (domain.includes('solana') && !domain.endsWith('solana.com') && !domain.endsWith('solana.org')) {
    result.score += 40; // Increased from 20
    result.reasons.push('Possible Solana brand impersonation');
  }

  // 4. Check for "claim" or "airdrop" combined with a TLD that isn't .com or .org
  if ((domain.includes('claim') || domain.includes('airdrop')) && !domain.endsWith('.com') && !domain.endsWith('.org')) {
    result.isSuspicious = true;
    result.score += 50; // Increased from 30
    result.reasons.push('Aggressive Detection: Phishing pattern (claim/airdrop + non-standard TLD)');
  }

  // Final score capping
  result.score = Math.min(result.score, 100);
  result.isSuspicious = result.isSuspicious || result.score >= 40;

  return result;
}
