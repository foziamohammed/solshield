import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Fetch on-chain data for a given Solana address.
 * Returns account info, transaction history, and derived metrics.
 */
export async function getOnChainData(address) {
  try {
    let pubkey;
    try {
      pubkey = new PublicKey(address);
    } catch {
      return {
        valid: false,
        error: 'Invalid Solana address format',
        accountAge: null,
        transactionCount: 0,
        balance: 0,
        isProgram: false,
        hasTokenAccounts: false,
        tokenAccountCount: 0,
      };
    }

    // Fetch account info
    const accountInfo = await connection.getAccountInfo(pubkey);

    // Fetch recent transaction signatures
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 100 });

    // Fetch token accounts
    let tokenAccounts = { value: [] };
    try {
      tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });
    } catch {
      // Not all accounts have token accounts
    }

    // Calculate account age from oldest transaction
    let accountAge = null;
    let oldestTimestamp = null;
    let newestTimestamp = null;
    if (signatures.length > 0) {
      const oldest = signatures[signatures.length - 1];
      const newest = signatures[0];
      oldestTimestamp = oldest.blockTime ? oldest.blockTime * 1000 : null;
      newestTimestamp = newest.blockTime ? newest.blockTime * 1000 : null;
      if (oldestTimestamp) {
        const ageMs = Date.now() - oldestTimestamp;
        accountAge = Math.floor(ageMs / (1000 * 60 * 60 * 24)); // days
      }
    }

    // Analyze transaction patterns
    const txPatterns = analyzeTransactionPatterns(signatures);

    return {
      valid: true,
      address: address,
      balance: accountInfo ? accountInfo.lamports / 1e9 : 0,
      isProgram: accountInfo ? accountInfo.executable : false,
      owner: accountInfo ? accountInfo.owner.toBase58() : null,
      accountAge,
      oldestTransaction: oldestTimestamp ? new Date(oldestTimestamp).toISOString() : null,
      newestTransaction: newestTimestamp ? new Date(newestTimestamp).toISOString() : null,
      transactionCount: signatures.length,
      hasTokenAccounts: tokenAccounts.value.length > 0,
      tokenAccountCount: tokenAccounts.value.length,
      txPatterns,
    };
  } catch (error) {
    console.error('Solana data fetch error:', error.message);
    return {
      valid: true,
      address,
      error: error.message,
      accountAge: null,
      transactionCount: 0,
      balance: 0,
      isProgram: false,
      hasTokenAccounts: false,
      tokenAccountCount: 0,
    };
  }
}

/**
 * Analyze transaction signatures for suspicious patterns
 */
function analyzeTransactionPatterns(signatures) {
  if (!signatures || signatures.length === 0) {
    return {
      burstActivity: false,
      highErrorRate: false,
      errorCount: 0,
      recentActivity: false,
    };
  }

  // Check for burst activity (many txs in short period)
  const timestamps = signatures
    .filter((s) => s.blockTime)
    .map((s) => s.blockTime * 1000)
    .sort((a, b) => b - a);

  let burstActivity = false;
  if (timestamps.length >= 10) {
    const window = timestamps[0] - timestamps[9]; // Time span of last 10 txs
    burstActivity = window < 60 * 1000; // 10 txs in under 1 minute
  }

  // Check error rate
  const errorCount = signatures.filter((s) => s.err !== null).length;
  const highErrorRate = signatures.length > 5 && errorCount / signatures.length > 0.5;

  // Recent activity (within last 24h)
  const recentActivity = timestamps.length > 0 && Date.now() - timestamps[0] < 24 * 60 * 60 * 1000;

  return {
    burstActivity,
    highErrorRate,
    errorCount,
    errorRate: signatures.length > 0 ? (errorCount / signatures.length).toFixed(2) : '0',
    recentActivity,
    transactionsAnalyzed: signatures.length,
  };
}
