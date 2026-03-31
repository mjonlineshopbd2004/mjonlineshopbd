import { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    // Try both GEMINI_API_KEY and API_KEY (some environments use one or the other)
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      console.error('CRITICAL: No Gemini API key found! Please set GEMINI_API_KEY in your environment variables.');
    } else if (apiKey.includes('TODO') || apiKey.length < 10) {
      console.error('CRITICAL: Gemini API key appears to be a placeholder or invalid:', apiKey.substring(0, 10) + '...');
    } else {
      // Log key info safely for debugging
      console.log(`Gemini API Key initialized (Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 6)}...)`);
    }
    
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
};

export const scrapeProduct = async (req: Request, res: Response) => {
  const { url } = req.body;
  console.log('Scraping request received for URL:', url);

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey.includes('TODO') || apiKey.length < 10) {
    console.error('CRITICAL: Gemini API key is missing or invalid!');
    return res.status(500).json({ 
      message: 'Gemini API Key is missing or invalid. Please set GEMINI_API_KEY in your Vercel/Environment settings.',
      error: 'API_KEY_MISSING'
    });
  }

  const ai = getAiClient();

  if (!url) {
    console.warn('Scraping failed: No URL provided');
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    console.log('Fetching URL:', url);
    let html = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9,bn-BD;q=0.8,bn;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
          'Referer': 'https://www.google.com/',
        },
        signal: AbortSignal.timeout(2000), // Reduced from 3000 to allow more time for Gemini fallback
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      html = await response.text();
    } catch (fetchError: any) {
      console.error('Direct fetch failed:', fetchError.message);
      
      // If direct fetch fails (e.g. 403), try to use Gemini with URL Context to find the info
      console.log('Attempting fallback: Using Gemini with URL Context to find product info...');
      try {
        const searchResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Find the EXACT ORIGINAL product details for this URL: ${url}. 
          
          REQUIRED FIELDS:
          1. name: The full original product title.
          2. originalPrice: The price in the original currency (e.g., ¥, $, or local).
          3. price: Convert the original price to BDT (1 CNY = 16 BDT, 1 USD = 115 BDT).
          4. description: A detailed summary of the product features.
          5. images: Extract ALL high-quality product image URLs.
          6. category: The product category.
          7. sizes/colors: Available variations.`,
          config: {
            systemInstruction: "You are a professional product data specialist. Your goal is to find the most accurate and original information. Use Google Search and URL Context to bypass blocks. Return ONLY a valid JSON object. Do not guess; find real data.",
            tools: [{ urlContext: {} }, { googleSearch: {} }],
            toolConfig: { includeServerSideToolInvocations: true },
            responseMimeType: "application/json",
            maxOutputTokens: 1500,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                price: { type: Type.NUMBER },
                originalPrice: { type: Type.STRING },
                category: { type: Type.STRING },
                description: { type: Type.STRING },
                images: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                sizes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                colors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["name", "price", "description", "images", "category"]
            }
          }
        });

        const text = searchResponse.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const searchData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        
        console.log('Gemini Search successfully found data:', searchData.name);
        return res.json({
          ...searchData,
          sourceUrl: url
        });
      } catch (searchError: any) {
        console.error('Gemini Search fallback also failed:', searchError.message);
        throw new Error(`Failed to fetch product data. The site is blocking us and search fallback failed. Error: ${fetchError.message}`);
      }
    }

    const $ = cheerio.load(html);

    // More aggressive cleaning to keep only essential content
    $('script, style, noscript, iframe, header, footer, nav, svg, path, button, input, textarea, select, form').remove();
    
    // Remove empty elements
    $('*').each((i, el) => {
      if ($(el).children().length === 0 && !$(el).text().trim() && el.tagName !== 'img') {
        $(el).remove();
      }
    });

    const cleanHtml = $('body').html() || html;
    // Increase limit to 12000 but with cleaner content
    const textContent = cleanHtml.substring(0, 12000); 

    console.log('Using Gemini to parse product data...');
    
    try {
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract the ORIGINAL product information from this page:
        URL: ${url}
        HTML Snippet: ${textContent}
        
        I need:
        1. The EXACT product name/title.
        2. The ORIGINAL price (e.g., in CNY, USD, or local currency) AND the converted price in BDT (numeric).
        3. A detailed but concise description (max 300 words).
        4. ALL high-quality product image URLs (absolute paths).
        5. Available sizes, colors, and technical specifications.
        6. The product category.`,
        config: {
          systemInstruction: "You are a professional product data extractor. Your goal is to extract the most accurate and original information from the provided HTML. If the price is in a foreign currency (like Chinese Yuan ¥ or USD $), convert it to Bangladeshi Taka (BDT) using current approximate rates (e.g., 1 CNY = 16 BDT, 1 USD = 115 BDT). Return ONLY a valid JSON object.",
          responseMimeType: "application/json",
          maxOutputTokens: 1500,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER, description: "Price converted to BDT (numeric)" },
              originalPrice: { type: Type.STRING, description: "The price in its original currency as seen on the site" },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              images: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              sizes: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              colors: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              specifications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.STRING }
                  },
                  required: ["key", "value"]
                }
              }
            },
            required: ["name", "price", "description", "images", "category"]
          }
        }
      });

      const text = geminiResponse.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      console.log('Gemini successfully parsed data:', data.name);

      // Ensure image URLs are absolute
      const baseUrl = new URL(url).origin;
      const absoluteImages = data.images.map((img: string) => {
        if (img.startsWith('//')) return 'https:' + img;
        if (img.startsWith('/')) return baseUrl + img;
        return img;
      });

      return res.json({
        ...data,
        images: absoluteImages,
        sourceUrl: url
      });
    } catch (geminiError: any) {
      console.error('Gemini parsing failed, falling back to cheerio:', geminiError.message);
      
      // Fallback to basic cheerio selectors
      const name = $('.product-title').text().trim() || $('h1').first().text().trim();
      const priceText = $('.product-price').first().text().trim() || $('.price').first().text().trim();
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
      const description = $('.product-description').html() || $('#description').html() || $('.details').html() || '';
      
      const images: string[] = [];
      $('img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && (src.includes('product') || src.includes('item') || $(el).closest('.gallery, .product-image').length > 0)) {
          if (src.startsWith('//')) images.push('https:' + src);
          else if (src.startsWith('/')) images.push(new URL(url).origin + src);
          else images.push(src);
        }
      });

      return res.json({
        name,
        price,
        description,
        images: Array.from(new Set(images)).slice(0, 10),
        sourceUrl: url
      });
    }
  } catch (error: any) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ message: 'Failed to fetch product data. The site might be blocking us.', error: error.message });
  }
};
