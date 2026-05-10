import fetch from 'node-fetch';

/**
 * Text-to-Speech Service using ElevenLabs API
 */
export async function generateSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured on the server');
  }

  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    // Return the audio buffer
    return await response.arrayBuffer();
  } catch (error) {
    console.error('ElevenLabs Service Error:', error);
    throw error;
  }
}
