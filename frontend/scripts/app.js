/**
 * SolShield — Frontend Application
 * Connects to backend API, renders risk reports, integrates ElevenLabs voice & LI.FI widget
 */

const API_BASE = '/api';

// DOM Elements
const addressInput = document.getElementById('address-input');
const scanBtn = document.getElementById('scan-btn');
const resultsSection = document.getElementById('results-section');
const scoreCircle = document.getElementById('score-circle');
const scoreValue = document.getElementById('score-value');
const riskLevelBadge = document.getElementById('risk-level-badge');
const riskAddress = document.getElementById('risk-address');
const riskVerdict = document.getElementById('risk-verdict');
const factorsGrid = document.getElementById('factors-grid');
const sourcesList = document.getElementById('sources-list');
const onchainSection = document.getElementById('onchain-section');
const onchainGrid = document.getElementById('onchain-grid');
const safeRouteSection = document.getElementById('safe-route-section');
const voiceBtn = document.getElementById('voice-btn');
const reportBtn = document.getElementById('report-btn');
const verdictAudio = document.getElementById('verdict-audio');

let currentReport = null;
let isPlaying = false;

// ===== Event Listeners =====
scanBtn.addEventListener('click', handleScan);
addressInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleScan(); });
voiceBtn.addEventListener('click', handleVoice);
reportBtn.addEventListener('click', handleReport);

// Hint buttons
document.querySelectorAll('.hint-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    addressInput.value = btn.dataset.address;
    handleScan();
  });
});

// ===== Main Scan Handler =====
async function handleScan() {
  const address = addressInput.value.trim();
  if (!address) {
    addressInput.focus();
    shakeElement(document.querySelector('.scanner-input-wrapper'));
    return;
  }

  // Set loading state
  scanBtn.classList.add('loading');
  scanBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || 'Analysis failed');
    }

    currentReport = await response.json();
    renderResults(currentReport);
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Scan error:', error);
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    scanBtn.classList.remove('loading');
    scanBtn.disabled = false;
  }
}

// ===== Render Results =====
function renderResults(report) {
  // Animate score
  animateScore(report.riskScore, report.riskLevel);

  // Risk level badge
  riskLevelBadge.textContent = report.riskLevel.toUpperCase();
  riskLevelBadge.className = `risk-level-badge ${report.riskLevel}`;

  // Address
  riskAddress.textContent = report.address;

  // Verdict
  riskVerdict.textContent = report.verdict;

  // Risk color for header
  const riskHeader = document.getElementById('risk-header');
  riskHeader.style.borderColor = getRiskColor(report.riskLevel, 0.3);

  // Render factor cards
  renderFactors(report.factors);

  // Render source checks
  renderSources(report.blacklistSources);

  // Render on-chain data
  if (report.onChainData) {
    renderOnChainData(report.onChainData);
    onchainSection.style.display = 'block';
  } else {
    onchainSection.style.display = 'none';
  }

  // Safe route section
  if (report.showSafeRoute) {
    safeRouteSection.style.display = 'block';
    loadLiFiWidget();
  } else {
    safeRouteSection.style.display = 'none';
  }
}

// ===== Animate Score Ring =====
function animateScore(score, level) {
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (score / 100) * circumference;

  scoreCircle.style.stroke = getRiskColor(level);
  scoreCircle.style.filter = `drop-shadow(0 0 8px ${getRiskColor(level, 0.5)})`;

  // Animate offset
  requestAnimationFrame(() => {
    scoreCircle.style.strokeDashoffset = offset;
  });

  // Animate number
  let current = 0;
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    current = Math.round(eased * score);
    scoreValue.textContent = current;
    scoreValue.style.color = getRiskColor(level);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function getRiskColor(level, alpha) {
  const colors = {
    safe: '0, 230, 118', low: '105, 219, 124', medium: '255, 171, 0',
    high: '255, 107, 53', critical: '255, 61, 113',
  };
  const c = colors[level] || '138, 141, 158';
  return alpha !== undefined ? `rgba(${c}, ${alpha})` : `rgb(${c})`;
}

// ===== Render Factor Cards =====
function renderFactors(factors) {
  factorsGrid.innerHTML = factors.map((f) => `
    <div class="factor-card ${f.risk}">
      <div class="factor-header">
        <span class="factor-icon">${f.icon}</span>
        <span class="factor-score ${f.risk}">${f.risk === 'safe' ? '✓ Safe' : f.risk === 'info' ? 'ℹ Info' : `+${f.score}`}</span>
      </div>
      <div class="factor-label">${f.label}</div>
      <div class="factor-detail">${f.detail}</div>
    </div>
  `).join('');
}

// ===== Render Sources =====
function renderSources(sources) {
  if (!sources || sources.length === 0) {
    sourcesList.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No source data available</p>';
    return;
  }
  sourcesList.innerHTML = sources.map((s) => `
    <div class="source-item">
      <span class="source-status ${s.status}">${s.status}</span>
      <div class="source-info">
        <div class="source-name">${s.source}</div>
        <div class="source-desc">${s.description}</div>
      </div>
    </div>
  `).join('');
}

// ===== Render On-Chain Data =====
function renderOnChainData(data) {
  const items = [
    { value: data.balance !== null ? `${data.balance.toFixed(4)}` : '—', label: 'SOL Balance' },
    { value: data.accountAge !== null ? `${data.accountAge}d` : '—', label: 'Account Age' },
    { value: data.transactionCount || '0', label: 'Transactions' },
    { value: data.tokenAccountCount || '0', label: 'Token Accounts' },
    { value: data.isProgram ? 'Yes' : 'No', label: 'Is Program' },
  ];
  onchainGrid.innerHTML = items.map((i) => `
    <div class="onchain-card">
      <div class="onchain-value">${i.value}</div>
      <div class="onchain-label">${i.label}</div>
    </div>
  `).join('');
}

// ===== ElevenLabs Voice =====
async function handleVoice() {
  if (!currentReport) return;

  if (isPlaying) {
    verdictAudio.pause();
    verdictAudio.currentTime = 0;
    isPlaying = false;
    voiceBtn.classList.remove('playing');
    voiceBtn.querySelector('span').textContent = 'Play Verdict';
    return;
  }

  voiceBtn.classList.add('playing');
  voiceBtn.querySelector('span').textContent = 'Loading...';

  try {
    // Use browser SpeechSynthesis as fallback (always available, no API key needed)
    // For production, replace with ElevenLabs API call below
    await speakWithBrowserTTS(currentReport.verdict);
  } catch (error) {
    console.error('Voice error:', error);
    // Final fallback
    showToast('Voice playback unavailable', 'error');
    voiceBtn.classList.remove('playing');
    voiceBtn.querySelector('span').textContent = 'Play Verdict';
  }
}

/**
 * ElevenLabs API integration
 * To enable: set your API key and uncomment this function call in handleVoice
 */
async function speakWithElevenLabs(text, apiKey) {
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) throw new Error('ElevenLabs API error');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  verdictAudio.src = url;
  verdictAudio.play();
  isPlaying = true;
  voiceBtn.querySelector('span').textContent = 'Stop';

  verdictAudio.onended = () => {
    isPlaying = false;
    voiceBtn.classList.remove('playing');
    voiceBtn.querySelector('span').textContent = 'Play Verdict';
    URL.revokeObjectURL(url);
  };
}

/**
 * Browser TTS fallback (works without API key)
 */
function speakWithBrowserTTS(text) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en-US'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    isPlaying = true;
    voiceBtn.querySelector('span').textContent = 'Stop';

    utterance.onend = () => {
      isPlaying = false;
      voiceBtn.classList.remove('playing');
      voiceBtn.querySelector('span').textContent = 'Play Verdict';
      resolve();
    };
    utterance.onerror = (e) => {
      isPlaying = false;
      voiceBtn.classList.remove('playing');
      voiceBtn.querySelector('span').textContent = 'Play Verdict';
      reject(e);
    };

    window.speechSynthesis.speak(utterance);
  });
}

// ===== LI.FI Widget =====
function loadLiFiWidget() {
  const container = document.getElementById('lifi-widget');
  // Load LI.FI widget via iframe for a clean integration
  container.innerHTML = `
    <iframe 
      src="https://transferto.xyz/swap?fromChain=sol&toChain=sol" 
      style="width:100%;height:500px;border:none;border-radius:10px;"
      title="LI.FI Safe Route Widget"
      allow="clipboard-write"
      loading="lazy"
    ></iframe>
  `;
}

// ===== Report Address =====
async function handleReport() {
  if (!currentReport) return;
  const reason = prompt('Why are you reporting this address?');
  if (!reason) return;

  try {
    const response = await fetch(`${API_BASE}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: currentReport.address, reason }),
    });
    const data = await response.json();
    if (data.success) {
      showToast('Address reported successfully!', 'success');
    } else {
      showToast('Failed to report address', 'error');
    }
  } catch (error) {
    showToast('Error reporting address', 'error');
  }
}

// ===== Utilities =====
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // trigger reflow
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    padding: 14px 24px; border-radius: 10px; font-size: 14px; font-weight: 500;
    color: white; font-family: var(--font);
    animation: fadeInUp 0.3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    ${type === 'success' ? 'background: linear-gradient(135deg, #00c853, #00e676);' : ''}
    ${type === 'error' ? 'background: linear-gradient(135deg, #d50000, #ff3d71);' : ''}
    ${type === 'info' ? 'background: linear-gradient(135deg, #6c5ce7, #a78bfa);' : ''}
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add shake animation to stylesheet
const style = document.createElement('style');
style.textContent = `@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }`;
document.head.appendChild(style);

// Preload voices for TTS
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

console.log('🛡️ SolShield initialized');
