/**
 * Risk Analyzer - Combines all data sources into a structured risk report
 */

/**
 * Generate a comprehensive risk report from all gathered data
 */
export function analyzeAddress(address, onChainData, blacklistResult, onChainFlags, domainResult) {
  const factors = [];
  let riskScore = 0;
  let maxRisk = 0;

  // === Domain/URL Analysis ===
  if (domainResult) {
    if (domainResult.score > 0) {
      riskScore += domainResult.score;
      maxRisk = Math.max(maxRisk, domainResult.score);
      factors.push({
        category: 'Domain Safety',
        label: 'Phishing Detection',
        risk: domainResult.score >= 40 ? 'critical' : (domainResult.score >= 20 ? 'high' : 'medium'),
        score: domainResult.score,
        detail: domainResult.reasons.join('. '),
        icon: '🔗',
      });
    } else {
      factors.push({
        category: 'Domain Safety',
        label: 'Phishing Detection',
        risk: 'safe',
        score: 0,
        detail: 'URL appears to be from a verified or non-suspicious domain',
        icon: '✅',
      });
    }
  }

  // === Blacklist Checks (highest weight) ===
  if (blacklistResult?.flagged) {
    const weight = blacklistResult.riskLevel === 'critical' ? 40 : 25;
    riskScore += weight;
    maxRisk = Math.max(maxRisk, weight);
    factors.push({
      category: 'Blacklist',
      label: 'Known Scam Database',
      risk: blacklistResult.riskLevel === 'critical' ? 'critical' : 'high',
      score: weight,
      detail: `Address found in ${blacklistResult.sources.length} blacklist source(s): ${blacklistResult.sources.join(', ')}`,
      icon: '🚫',
    });
  } else if (!domainResult) { // Only show address blacklist if it's not a domain
    factors.push({
      category: 'Blacklist',
      label: 'Known Scam Database',
      risk: 'safe',
      score: 0,
      detail: 'Not found in any known scam databases',
      icon: '✅',
    });
  }

  // === On-Chain Program Flags ===
  if (onChainFlags?.flagged) {
    riskScore += 30;
    maxRisk = Math.max(maxRisk, 30);
    factors.push({
      category: 'On-Chain Flags',
      label: 'Community Reports',
      risk: 'high',
      score: 30,
      detail: 'This address has been flagged by the SolShield community on-chain',
      icon: '⛓️',
    });
  } else if (!domainResult) {
    factors.push({
      category: 'On-Chain Flags',
      label: 'Community Reports',
      risk: 'safe',
      score: 0,
      detail: 'No on-chain flags from the SolShield community',
      icon: '⛓️',
    });
  }

  // === Account Age Analysis ===
  if (onChainData?.valid) {
    if (onChainData.accountAge !== null) {
      if (onChainData.accountAge < 7) {
        riskScore += 15;
        factors.push({
          category: 'Account Age',
          label: 'Wallet Age',
          risk: 'high',
          score: 15,
          detail: `Account is only ${onChainData.accountAge} day(s) old — very new accounts are often used in scams`,
          icon: '📅',
        });
      } else if (onChainData.accountAge < 30) {
        riskScore += 8;
        factors.push({
          category: 'Account Age',
          label: 'Wallet Age',
          risk: 'medium',
          score: 8,
          detail: `Account is ${onChainData.accountAge} days old — relatively new`,
          icon: '📅',
        });
      } else {
        factors.push({
          category: 'Account Age',
          label: 'Wallet Age',
          risk: 'safe',
          score: 0,
          detail: `Account is ${onChainData.accountAge} days old — established wallet`,
          icon: '📅',
        });
      }
    } else {
      riskScore += 10;
      factors.push({
        category: 'Account Age',
        label: 'Wallet Age',
        risk: 'medium',
        score: 10,
        detail: 'Unable to determine account age — no transaction history found',
        icon: '📅',
      });
    }

    // === Transaction Volume ===
    if (onChainData.transactionCount === 0) {
      riskScore += 10;
      factors.push({
        category: 'Activity',
        label: 'Transaction History',
        risk: 'medium',
        score: 10,
        detail: 'No transaction history found — empty or dormant wallet',
        icon: '📊',
      });
    } else if (onChainData.transactionCount < 5) {
      riskScore += 5;
      factors.push({
        category: 'Activity',
        label: 'Transaction History',
        risk: 'low',
        score: 5,
        detail: `Only ${onChainData.transactionCount} transactions found — very low activity`,
        icon: '📊',
      });
    } else {
      factors.push({
        category: 'Activity',
        label: 'Transaction History',
        risk: 'safe',
        score: 0,
        detail: `${onChainData.transactionCount} transactions found — active wallet`,
        icon: '📊',
      });
    }

    // === Transaction Patterns ===
    if (onChainData.txPatterns?.burstActivity) {
      riskScore += 12;
      factors.push({
        category: 'Patterns',
        label: 'Burst Activity',
        risk: 'high',
        score: 12,
        detail: 'Detected burst transaction activity — potential automated drainer',
        icon: '⚡',
      });
    }

    if (onChainData.txPatterns?.highErrorRate) {
      riskScore += 8;
      factors.push({
        category: 'Patterns',
        label: 'Error Rate',
        risk: 'medium',
        score: 8,
        detail: `High transaction error rate (${(parseFloat(onChainData.txPatterns.errorRate) * 100).toFixed(0)}%) — may indicate malicious probing`,
        icon: '⚠️',
      });
    }

    // === Token Accounts ===
    if (onChainData.tokenAccountCount > 50) {
      riskScore += 5;
      factors.push({
        category: 'Holdings',
        label: 'Token Distribution',
        risk: 'low',
        score: 5,
        detail: `${onChainData.tokenAccountCount} token accounts — unusually high, possible airdrop scammer`,
        icon: '🪙',
      });
    } else {
      factors.push({
        category: 'Holdings',
        label: 'Token Distribution',
        risk: 'safe',
        score: 0,
        detail: `${onChainData.tokenAccountCount || 0} token account(s) — normal range`,
        icon: '🪙',
      });
    }
  } else if (onChainData && !onChainData.valid && !domainResult) {
    // Only flag as "Invalid Solana Address" if it's NOT a domain/URL
    riskScore += 5;
    factors.push({
      category: 'Validity',
      label: 'Address Format',
      risk: 'medium',
      score: 5,
      detail: 'Invalid Solana address format',
      icon: '❌',
    });
  }

  // Cap the score at 100
  riskScore = Math.min(riskScore, 100);

  // Determine overall risk level
  let riskLevel;
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 45) riskLevel = 'high';
  else if (riskScore >= 25) riskLevel = 'medium';
  else if (riskScore >= 10) riskLevel = 'low';
  else riskLevel = 'safe';

  // Generate verdict text for voice reading
  const verdict = generateVerdict(riskLevel, riskScore, factors, address);

  return {
    address,
    riskScore,
    riskLevel,
    verdict,
    factors,
    onChainData: onChainData?.valid
      ? {
          balance: onChainData.balance,
          accountAge: onChainData.accountAge,
          transactionCount: onChainData.transactionCount,
          tokenAccountCount: onChainData.tokenAccountCount,
          isProgram: onChainData.isProgram,
          oldestTransaction: onChainData.oldestTransaction,
          newestTransaction: onChainData.newestTransaction,
        }
      : null,
    blacklistSources: blacklistResult?.details || [],
    timestamp: new Date().toISOString(),
    showSafeRoute: riskLevel === 'critical' || riskLevel === 'high',
  };
}

/**
 * Generate a human-readable verdict for voice reading
 */
function generateVerdict(riskLevel, riskScore, factors, address) {
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const highRiskFactors = factors.filter((f) => f.risk === 'critical' || f.risk === 'high');
  const mediumRiskFactors = factors.filter((f) => f.risk === 'medium');

  switch (riskLevel) {
    case 'critical':
      return `Warning! This wallet ${shortAddr} has a critical risk score of ${riskScore} out of 100. ${
        highRiskFactors.length > 0
          ? `Key concerns: ${highRiskFactors.map((f) => f.detail).join('. ')}.`
          : ''
      } We strongly recommend avoiding any transactions with this address. A safe alternative route is shown below.`;

    case 'high':
      return `Caution! This wallet ${shortAddr} has a high risk score of ${riskScore} out of 100. ${
        highRiskFactors.length > 0
          ? `Reasons include: ${highRiskFactors.map((f) => f.detail).join('. ')}.`
          : ''
      } Exercise extreme caution before interacting with this address. We've provided a safe route alternative below.`;

    case 'medium':
      return `This wallet ${shortAddr} has a moderate risk score of ${riskScore} out of 100. ${
        mediumRiskFactors.length > 0
          ? `Some concerns: ${mediumRiskFactors.map((f) => f.detail).join('. ')}.`
          : ''
      } Proceed with caution and verify the identity of this wallet before transacting.`;

    case 'low':
      return `This wallet ${shortAddr} has a low risk score of ${riskScore} out of 100. Minor concerns were noted but nothing critical was found. Standard precautions are recommended.`;

    case 'safe':
      return `Good news! This wallet ${shortAddr} appears safe with a risk score of ${riskScore} out of 100. No threats were detected across our security checks. Always exercise standard caution with any transaction.`;

    default:
      return `Analysis complete for wallet ${shortAddr}. Risk score: ${riskScore} out of 100.`;
  }
}
