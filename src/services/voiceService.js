/**
 * Voice Service: Handles Voice Rhythm, Emotion Modulation, and Speech Configuration
 */
class VoiceService {
  constructor() {
    this.emotionProfiles = {
      warm: {
        name: 'Warm & Affectionate',
        pitch: 1.08,
        rate: 0.98,
        description: 'Gentle, soft cadence with warm emotional pauses (ideal for spouse/family)',
        vocalPauseMultiplier: 1.3
      },
      playful: {
        name: 'Playful & Banter',
        pitch: 1.15,
        rate: 1.12,
        description: 'Upbeat tempo with dynamic pitch variations and playful energy',
        vocalPauseMultiplier: 0.9
      },
      calm: {
        name: 'Calm & Professional',
        pitch: 1.0,
        rate: 1.0,
        description: 'Steady, clear cadence with measured pauses (ideal for support/business)',
        vocalPauseMultiplier: 1.0
      },
      expressive: {
        name: 'Energetic & Expressive',
        pitch: 1.2,
        rate: 1.18,
        description: 'High dynamic range, fast bursts, and expressive emphasis',
        vocalPauseMultiplier: 0.85
      }
    };

    this.languageSpeechMap = {
      tanglish: { asr: 'ta-IN', tts: ['ta-IN', 'en-IN', 'en-GB'], label: 'Tanglish (Tamil + English)' },
      tamil: { asr: 'ta-IN', tts: ['ta-IN'], label: 'Tamil (தமிழ்)' },
      hinglish: { asr: 'hi-IN', tts: ['hi-IN', 'en-IN'], label: 'Hinglish (Hindi + English)' },
      tenglish: { asr: 'te-IN', tts: ['te-IN', 'en-IN'], label: 'Tenglish (Telugu + English)' },
      manglish: { asr: 'ml-IN', tts: ['ml-IN', 'en-IN'], label: 'Manglish (Malayalam + English)' },
      kanglish: { asr: 'kn-IN', tts: ['kn-IN', 'en-IN'], label: 'Kanglish (Kannada + English)' },
      english: { asr: 'en-US', tts: ['en-US', 'en-IN', 'en-GB'], label: 'English' }
    };
  }

  getEmotionProfiles() {
    return this.emotionProfiles;
  }

  getLanguageMap() {
    return this.languageSpeechMap;
  }

  /**
   * Pre-process text to enhance spoken rhythm and natural human cadence
   */
  formatRhythmSpeech(text, emotion = 'warm') {
    if (!text) return '';
    let spoken = text.trim();

    // Strip thinking tags if any remained
    spoken = spoken.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Replace common emojis with brief natural acoustic pauses or expressive words
    spoken = spoken
      .replace(/🥰|❤️|😘/g, ', ')
      .replace(/😂|🤣|💀/g, ' haha, ')
      .replace(/😤|😡/g, ' hmm, ')
      .replace(/🔥/g, ' sema! ')
      .replace(/🙏/g, ' vanakkam! ');

    // Normalize multiple spaces and commas
    spoken = spoken.replace(/,\s*,+/g, ',').replace(/\s+/g, ' ');

    return spoken.trim();
  }
}

module.exports = new VoiceService();
