import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Support large photo payloads up to 30mb
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Helper to get formatted default date
function getDefaultDate(): string {
  const d = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Fallback postcard design presets in case of API failure or missing key
const fallbackDesigns = [
  {
    caption: '“Best summer days with my favorite human! ☀️🕶️”',
    subcaption: 'Captured in SnapPop Booth #404',
    location: 'SAN FRANCISCO, CA',
    boothNumber: 'BOOTH #404',
    date: getDefaultDate(),
    tapeText: 'SNAP•POP•08',
    tapeColor: '#ffdf9b',
    stamp: {
      type: 'airmail',
      title: 'AIRMAIL',
      symbol: 'favorite',
      price: '50¢',
      color: '#b81120',
    },
    filter: {
      presetName: 'Warm Retro',
      brightness: 1.05,
      contrast: 1.08,
      saturate: 1.15,
      sepia: 0.12,
      hueRotate: 0,
      grain: 0.15,
      lightLeak: 'coral',
    },
    cardBackground: '#ffffff',
    frameBorderColor: '#e4bdba',
    vibeDescription: 'Sunny, vibrant candid memories with nostalgic charm',
  },
  {
    caption: '“Unfiltered laughs & eternal golden hours! ✨🍹”',
    subcaption: '35mm Analog Color Tone',
    location: 'VENICE BEACH, CA',
    boothNumber: 'BOOTH #108',
    date: getDefaultDate(),
    tapeText: 'GOLDEN•HOUR',
    tapeColor: '#fed7aa',
    stamp: {
      type: 'sunny_day',
      title: 'SPECIAL',
      symbol: 'sunny',
      price: '75¢',
      color: '#755700',
    },
    filter: {
      presetName: 'Golden Hour',
      brightness: 1.08,
      contrast: 1.12,
      saturate: 1.25,
      sepia: 0.18,
      hueRotate: 3,
      grain: 0.1,
      lightLeak: 'gold',
    },
    cardBackground: '#fffdfa',
    frameBorderColor: '#fed7aa',
    vibeDescription: 'Warm sunset glow and radiant smiles',
  },
  {
    caption: '“Pure electric energy & midnight memories! ⚡️🪩”',
    subcaption: 'Neon Nightclub Edition',
    location: 'TOKYO • SHIBUYA',
    boothNumber: 'BOOTH #88',
    date: getDefaultDate(),
    tapeText: 'TOKYO•NIGHTS',
    tapeColor: '#a7f3d0',
    stamp: {
      type: 'retro_camera',
      title: 'EXPRESS',
      symbol: 'photo_camera',
      price: '¥120',
      color: '#006c4f',
    },
    filter: {
      presetName: 'Vivid Pop',
      brightness: 1.05,
      contrast: 1.18,
      saturate: 1.35,
      sepia: 0.05,
      hueRotate: -5,
      grain: 0.08,
      lightLeak: 'cyan',
    },
    cardBackground: '#ffffff',
    frameBorderColor: '#51fac1',
    vibeDescription: 'High contrast retro-modern arcade vibe',
  },
];

// POST /api/design-postcard
app.post('/api/design-postcard', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', userPrompt, occasion } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Using curated design.');
      const randomPreset = fallbackDesigns[Math.floor(Math.random() * fallbackDesigns.length)];
      return res.json({
        success: true,
        design: randomPreset,
        aiGenerated: false,
        note: 'Designed with curated vintage preset (Configure GEMINI_API_KEY for custom vision design)',
      });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 parameter' });
    }

    // Clean base64 data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `
You are the creative art director of a nostalgic neo-pop photo booth called "SnapPop".
Analyze the user's photo booth snapshot and design an authentic, tactile 4x6 printed postcard design for it.

Look at the photo:
- People, expressions, smiles, eyes, glasses/accessories, clothing, poses
- Mood, aesthetic, energy, lighting, setting
${userPrompt ? `User instructions / tone preference: ${userPrompt}` : ''}
${occasion ? `Occasion / context: ${occasion}` : ''}

You must return a JSON object with:
1. "caption": A short, memorable, playful photo-booth quote enclosed in curly quotes with 1-2 fitting emojis. E.g. “Best summer days with my favorite human! ☀️🕶️” or “Two peas in a very chic pod 🥑💕”
2. "subcaption": Brief tag or subtitle (e.g. "Postcard assembled & primed" or "Captured in SnapPop Booth #404")
3. "location": City / state or cool location inspired by the vibe (in uppercase, e.g. "SAN FRANCISCO, CA", "BROOKLYN, NY", "MALIBU, CA", "TOKYO, JP", "PARIS, FR")
4. "boothNumber": Vintage booth identifier, e.g. "BOOTH #404", "BOOTH #107", "BOOTH #22"
5. "date": Date string formatted as DD-MMM-YYYY, e.g. "24-AUG-2024" or current date
6. "tapeText": Text printed on the top-left decorative washi tape (in uppercase with bullet dots, e.g. "SNAP•POP•08", "SUMMER•VIBES", "GOOD•TIMES", "GOLDEN•HOUR")
7. "tapeColor": Hex color string for the washi tape, warm pastel (e.g. "#ffdf9b", "#fed7aa", "#a7f3d0", "#bae6fd", "#fbcfe8")
8. "stamp": An object containing:
   - "type": "airmail" | "special_delivery" | "vintage_seal" | "sunny_day" | "retro_camera" | "love_letter"
   - "title": Header text in stamp e.g. "AIRMAIL", "SPECIAL", "EXPRESS", "SOUVENIR"
   - "symbol": A valid Material Icon name suitable for postage: "favorite" | "sunny" | "photo_camera" | "flight" | "local_florist" | "star" | "diamond" | "pets" | "beach_access" | "celebration"
   - "price": Vintage postage price e.g. "50¢", "75¢", "1st", "¥120", "32¢"
   - "color": Hex color string for stamp background (e.g. deep vintage cherry "#b81120", teal "#006c4f", cobalt "#1e40af", amber "#b45309", purple "#7e22ce")
9. "filter": An object containing retro photo filter styling values:
   - "presetName": "Warm Retro" | "Vivid Pop" | "Analog Film" | "Golden Hour" | "Cyber Neon" | "B&W Noir" | "Pastel Dream"
   - "brightness": number between 0.9 and 1.25 (default 1.05)
   - "contrast": number between 0.95 and 1.30 (default 1.1)
   - "saturate": number between 0.8 and 1.45 (default 1.15)
   - "sepia": number between 0.0 and 0.35 (default 0.1)
   - "hueRotate": number between -15 and 15 (default 0)
   - "grain": number between 0.05 and 0.3 (default 0.15)
   - "lightLeak": "coral" | "gold" | "cyan" | "rainbow" | "none"
10. "cardBackground": Hex code for card paper (e.g. "#ffffff", "#fdfbf7", "#faf8f5", "#fffafa")
11. "frameBorderColor": Subtle border accent hex (e.g. "#e4bdba", "#d9d8ec", "#fed7aa")
12. "vibeDescription": A 1-sentence description of the mood detected in the photo.
`;

    let design = null;
    let aiGenerated = false;

    // Call Gemini with quick retry on transient 503
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType || 'image/jpeg',
                },
              },
              { text: promptText },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                caption: { type: Type.STRING },
                subcaption: { type: Type.STRING },
                location: { type: Type.STRING },
                boothNumber: { type: Type.STRING },
                date: { type: Type.STRING },
                tapeText: { type: Type.STRING },
                tapeColor: { type: Type.STRING },
                stamp: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    title: { type: Type.STRING },
                    symbol: { type: Type.STRING },
                    price: { type: Type.STRING },
                    color: { type: Type.STRING },
                  },
                  required: ['type', 'title', 'symbol', 'price', 'color'],
                },
                filter: {
                  type: Type.OBJECT,
                  properties: {
                    presetName: { type: Type.STRING },
                    brightness: { type: Type.NUMBER },
                    contrast: { type: Type.NUMBER },
                    saturate: { type: Type.NUMBER },
                    sepia: { type: Type.NUMBER },
                    hueRotate: { type: Type.NUMBER },
                    grain: { type: Type.NUMBER },
                    lightLeak: { type: Type.STRING },
                  },
                  required: ['presetName', 'brightness', 'contrast', 'saturate', 'sepia'],
                },
                cardBackground: { type: Type.STRING },
                frameBorderColor: { type: Type.STRING },
                vibeDescription: { type: Type.STRING },
              },
              required: [
                'caption',
                'location',
                'boothNumber',
                'date',
                'tapeText',
                'tapeColor',
                'stamp',
                'filter',
              ],
            },
          },
        });

        const text = response.text;
        if (text) {
          design = JSON.parse(text);
          aiGenerated = true;
          break;
        }
      } catch (callErr: any) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          console.warn('Gemini call error on second attempt:', callErr?.message);
        }
      }
    }

    if (!design) {
      design = fallbackDesigns[Math.floor(Math.random() * fallbackDesigns.length)];
    }

    return res.json({
      success: true,
      design,
      aiGenerated,
    });
  } catch (error: any) {
    console.error('Error generating postcard design with Gemini:', error);
    // Return graceful fallback so user experience remains flawless
    const randomPreset = fallbackDesigns[Math.floor(Math.random() * fallbackDesigns.length)];
    return res.json({
      success: true,
      design: randomPreset,
      aiGenerated: false,
      errorNotice: error?.message || 'AI service fallback',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
  });
});

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SnapPop Photo Booth server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
