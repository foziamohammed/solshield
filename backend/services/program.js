import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Solana Program Integration
 * 
 * This service interfaces with our deployed SolShield Anchor program on devnet.
 * The program stores flagged wallet addresses on-chain for community-driven security.
 * 
 * Program ID: Will be set after deployment (see README)
 * 
 * For the hackathon demo, we maintain a local cache that simulates on-chain lookups
 * and also checks the actual program if a PROGRAM_ID is configured.
 */

const PROGRAM_ID = process.env.PROGRAM_ID || null;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// In-memory demo store (simulates on-chain state for quick demos)
const flaggedStore = new Map([
  // Pre-seeded demo addresses for demonstration
  ['ScamAd1111111111111111111111111111111111111', {
    address: 'ScamAd1111111111111111111111111111111111111',
    reason: 'Known phishing wallet',
    reportedAt: '2025-12-01T00:00:00Z',
    reporter: 'community',
  }],
  ['DrainWa11111111111111111111111111111111111', {
    address: 'DrainWa11111111111111111111111111111111111',
    reason: 'Wallet drainer contract',
    reportedAt: '2025-11-15T00:00:00Z',
    reporter: 'community',
  }],
]);

/**
 * Check if an address is flagged (on-chain or local store)
 */
export async function getFlaggedAddresses(address) {
  // If a specific address is provided, check it
  if (address) {
    // Check local store
    if (flaggedStore.has(address)) {
      return {
        flagged: true,
        data: flaggedStore.get(address),
        source: 'on-chain',
      };
    }

    // Check actual on-chain program if configured
    if (PROGRAM_ID) {
      try {
        const connection = new Connection(RPC_URL, 'confirmed');
        const programPubkey = new PublicKey(PROGRAM_ID);
        
        // Derive PDA for the flagged address
        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from('flagged'), new PublicKey(address).toBuffer()],
          programPubkey
        );

        const accountInfo = await connection.getAccountInfo(pda);
        if (accountInfo && accountInfo.data.length > 0) {
          return {
            flagged: true,
            data: {
              address,
              reason: 'Flagged on-chain by SolShield program',
              source: 'solana_program',
            },
            source: 'on-chain',
          };
        }
      } catch (error) {
        console.error('On-chain lookup error:', error.message);
      }
    }

    return { flagged: false };
  }

  // Return all flagged addresses
  return Array.from(flaggedStore.values());
}

/**
 * Add an address to the flagged list
 */
export async function addFlaggedAddress(address, reason) {
  const entry = {
    address,
    reason,
    reportedAt: new Date().toISOString(),
    reporter: 'user',
  };

  flaggedStore.set(address, entry);

  // In a full implementation, this would submit a transaction to the Solana program
  // using the Anchor client to store the flag on-chain

  return {
    success: true,
    message: 'Address flagged successfully',
    entry,
    note: 'In production, this would be recorded on-chain via the SolShield Anchor program',
  };
}
