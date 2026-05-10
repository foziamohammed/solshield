import fetch from 'node-fetch';

/**
 * Known scam/blacklist databases and patterns.
 * In production, these would be live API calls to maintained databases.
 * For the hackathon demo, we use a combination of known lists and heuristic checks.
 */

// Community-maintained blacklist of known scam addresses (sample set)
const KNOWN_SCAM_ADDRESSES = new Set([
  // Known Solana scam addresses (documented in community reports)
  'ScamAd1111111111111111111111111111111111111',
  'DrainWa11111111111111111111111111111111111',
  'FakeAir1111111111111111111111111111111111',
  'BadPubkey111111111111111111111111111111111',
  'Dra1n5555555555555555555555555555555555555',
  'Ph1sh9999999999999999999999999999999999999',
  'RugPu1111111111111111111111111111111111111',
]);

// Known scam token mints
const KNOWN_SCAM_TOKENS = new Set([
  // Fake USDC mints, rug pull tokens, etc.
]);

// Suspicious address patterns
const SUSPICIOUS_PATTERNS = [
  { pattern: /^(1111|2222|3333|4444|5555)/, label: 'Vanity address pattern' },
];

/**
 * Check an address against multiple blacklist sources
 */
export async function checkBlacklists(address) {
  const results = {
    flagged: false,
    riskLevel: 'low',
    sources: [],
    details: [],
  };

  // 1. Check local known scam list
  if (KNOWN_SCAM_ADDRESSES.has(address)) {
    results.flagged = true;
    results.riskLevel = 'critical';
    results.sources.push('community_blacklist');
    results.details.push({
      source: 'Community Blacklist',
      status: 'FLAGGED',
      description: 'This address appears in community-maintained scam databases',
    });
  } else {
    results.details.push({
      source: 'Community Blacklist',
      status: 'CLEAN',
      description: 'Not found in known scam databases',
    });
  }

  // 2. Check against Solana FM labels
  try {
    const sfmResult = await checkSolanaFM(address);
    if (sfmResult.flagged) {
      results.flagged = true;
      results.riskLevel = sfmResult.riskLevel || 'high';
      results.sources.push('solana_fm');
    }
    results.details.push(sfmResult.detail);
  } catch (error) {
    results.details.push({
      source: 'Solana FM',
      status: 'ERROR',
      description: `Could not reach Solana FM: ${error.message}`,
    });
  }

  // 3. Check suspicious patterns
  for (const { pattern, label } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(address)) {
      results.sources.push('pattern_analysis');
      results.details.push({
        source: 'Pattern Analysis',
        status: 'WARNING',
        description: `Address matches suspicious pattern: ${label}`,
      });
    }
  }

  // 4. Check against GoPlus Security API (public, no key needed)
  try {
    const goplusResult = await checkGoPlus(address);
    if (goplusResult.flagged) {
      results.flagged = true;
      results.riskLevel = 'high';
      results.sources.push('goplus_security');
    }
    results.details.push(goplusResult.detail);
  } catch (error) {
    results.details.push({
      source: 'GoPlus Security',
      status: 'UNAVAILABLE',
      description: `Could not reach GoPlus: ${error.message}`,
    });
  }

  return results;
}

/**
 * Check address against Solana FM for labels and known entities
 */
async function checkSolanaFM(address) {
  try {
    const response = await fetch(`https://api.solana.fm/v0/accounts/${address}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        flagged: false,
        detail: {
          source: 'Solana FM',
          status: 'NOT_FOUND',
          description: 'No label data found for this address',
        },
      };
    }

    const data = await response.json();

    // Check if the account has any concerning labels
    const hasLabel = data?.result?.data?.label || data?.result?.data?.friendlyName;
    const label = data?.result?.data?.label || '';
    const isSuspicious = /scam|hack|exploit|drain|phish|fake/i.test(label);

    return {
      flagged: isSuspicious,
      riskLevel: isSuspicious ? 'critical' : 'low',
      detail: {
        source: 'Solana FM',
        status: isSuspicious ? 'FLAGGED' : hasLabel ? 'LABELED' : 'CLEAN',
        description: hasLabel
          ? `Account labeled as: ${label || data?.result?.data?.friendlyName}`
          : 'No suspicious labels found',
        label: label || null,
      },
    };
  } catch (error) {
    return {
      flagged: false,
      detail: {
        source: 'Solana FM',
        status: 'ERROR',
        description: `Lookup failed: ${error.message}`,
      },
    };
  }
}

/**
 * Check against GoPlus Security API
 */
async function checkGoPlus(address) {
  try {
    const response = await fetch(
      `https://api.gopluslabs.io/api/v1/solana/address_security/${address}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      return {
        flagged: false,
        detail: {
          source: 'GoPlus Security',
          status: 'UNAVAILABLE',
          description: 'GoPlus API unavailable',
        },
      };
    }

    const data = await response.json();
    const result = data?.result;

    if (!result || Object.keys(result).length === 0) {
      return {
        flagged: false,
        detail: {
          source: 'GoPlus Security',
          status: 'NO_DATA',
          description: 'No security data available from GoPlus',
        },
      };
    }

    // GoPlus flags
    const isDangerous =
      result.cybercrime === '1' ||
      result.money_laundering === '1' ||
      result.financial_crime === '1' ||
      result.darkweb_activity === '1' ||
      result.phishing_activities === '1' ||
      result.blacklist_doubt === '1';

    const isSuspicious =
      result.stealing_attack === '1' ||
      result.fake_token === '1' ||
      result.contract_address === '1';

    return {
      flagged: isDangerous || isSuspicious,
      detail: {
        source: 'GoPlus Security',
        status: isDangerous ? 'DANGEROUS' : isSuspicious ? 'SUSPICIOUS' : 'CLEAN',
        description: isDangerous
          ? 'Address flagged for malicious activity by GoPlus'
          : isSuspicious
          ? 'Address shows suspicious indicators on GoPlus'
          : 'No threats detected by GoPlus Security',
        flags: result,
      },
    };
  } catch (error) {
    return {
      flagged: false,
      detail: {
        source: 'GoPlus Security',
        status: 'ERROR',
        description: `GoPlus lookup failed: ${error.message}`,
      },
    };
  }
}
