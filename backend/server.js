import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeAddress } from './services/analyzer.js';
import { getOnChainData } from './services/solana.js';
import { checkBlacklists } from './services/blacklist.js';
import { getFlaggedAddresses, addFlaggedAddress } from './services/program.js';
import { generateSpeech } from './services/tts.js';
import { analyzeDomain, isUrlOrDomain } from './services/domain.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'solshield-api', timestamp: new Date().toISOString() });
});

// Main risk analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Valid address is required' });
    }

    const trimmed = address.trim();

    // Perform all checks in parallel
    const [onChainData, blacklistResult, onChainFlags, domainResult] = await Promise.all([
      getOnChainData(trimmed),
      checkBlacklists(trimmed),
      getFlaggedAddresses(trimmed),
      isUrlOrDomain(trimmed) ? analyzeDomain(trimmed) : Promise.resolve(null)
    ]);

    // Build the risk report
    const report = analyzeAddress(trimmed, onChainData, blacklistResult, onChainFlags, domainResult);

    res.json(report);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze address', details: error.message });
  }
});

// Get flagged addresses from on-chain program
app.get('/api/flagged', async (req, res) => {
  try {
    const flags = await getFlaggedAddresses();
    res.json({ flaggedAddresses: flags });
  } catch (error) {
    console.error('Flagged addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged addresses' });
  }
});

// Report an address (add to on-chain flagged list)
app.post('/api/report', async (req, res) => {
  try {
    const { address, reason } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    const result = await addFlaggedAddress(address.trim(), reason || 'User reported');
    res.json(result);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to report address' });
  }
});

// Text-to-speech endpoint (proxied to ElevenLabs)
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await generateSpeech(text);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength,
    });
    
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate speech' });
  }
});

// Only start the server if we are running the file directly (not in a serverless env)
if (process.env.NODE_ENV !== 'production' || process.argv[1].includes('server.js')) {
  app.listen(PORT, () => {
    console.log(`\n🛡️  SolShield API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Analyze: POST http://localhost:${PORT}/api/analyze\n`);
  });
}

export default app;
