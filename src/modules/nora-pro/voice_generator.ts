export async function generateNoraAudio(text: string): Promise<string | null> {
  // If the API key is not present, we gracefully degrade and return null (no audio)
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    // We request the voice es-AR-Neural2-F as specified
    const requestBody = {
      input: {
        text: text,
      },
      voice: {
        languageCode: "es-US",
        name: "es-US-Neural2-A", // Voz femenina neural latinoamericana
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error("[TTS] Google Cloud TTS API Error:", await response.text());
      return null;
    }

    const data = await response.json();
    // Google TTS returns the audio content as a base64 string
    return data.audioContent || null;

  } catch (error) {
    console.error("[TTS] Error generating Nora voice:", error);
    return null;
  }
}

