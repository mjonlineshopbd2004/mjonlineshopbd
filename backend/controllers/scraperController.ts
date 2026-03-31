import { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    // Try both GEMINI_API_KEY and API_KEY, and TRIM them to prevent whitespace errors
    const rawKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const apiKey = rawKey.trim();
    
    if (!apiKey) {
      console.error('CRITICAL: No Gemini API key found! Please set GEMINI_API_KEY in your environment variables.');
    } else if (apiKey.includes('TODO') || apiKey.length < 10) {
      console.error('CRITICAL: Gemini API key appears to be a placeholder or invalid:', apiKey.substring(0, 10) + '...');
    } else {
      // Log key info safely for debugging
      console.log(`Gemini AI Client initialized. Key Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 6)}..., Suffix: ...${apiKey.slice(-4)}`);
    }
    
    aiClient = new GoogleGenAI({ apiKey: apiKey });
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

    // Extract JSON-LD data before cleaning, as it often contains the most accurate info
    const jsonLdData: string[] = [];
    $('script[type="application/ld+json"]').each((i, el) => {
      jsonLdData.push($(el).html() || '');
    });

    // More aggressive cleaning but preserve essential text and structure
    $('script:not([type="application/ld+json"]), style, noscript, iframe, header, footer, nav, svg, path, button, input, textarea, select, form').remove();
    
    // Remove empty elements
    $('*').each((i, el) => {
      if ($(el).children().length === 0 && !$(el).text().trim() && el.tagName !== 'img') {
        $(el).remove();
      }
    });

    const cleanHtml = $('body').html() || html;
    // Combine cleaned HTML with JSON-LD data
    const textContent = (jsonLdData.join('\n') + '\n' + cleanHtml).substring(0, 15000); 

    console.log('Using Gemini to parse product data (Content length:', textContent.length, ')...');
    
    try {
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract the ORIGINAL product information from this page:
        URL: ${url}
        HTML/Data Snippet: ${textContent}
        
        I need:
        1. name: The full original product title.
        2. originalPrice: The price in the original currency (e.g., ¥, $, ৳, or local).
        3. price: Convert the original price to BDT (numeric). If it's already in BDT/৳, just provide the number.
        4. description: A detailed summary of the product features (max 300 words).
        5. images: Extract ALL high-quality product image URLs. Look for 'image', 'og:image', or large images in the HTML.
        6. category: The product category.
        7. sizes/colors: Available variations.`,
        config: {
          systemInstruction: "You are a professional product data extractor. Your goal is to extract the most accurate and original information. Look specifically for JSON-LD scripts or meta tags for price and images. If the price is in a foreign currency (like Chinese Yuan ¥ or USD $), convert it to Bangladeshi Taka (BDT) using current approximate rates (e.g., 1 CNY = 16 BDT, 1 USD = 115 BDT). If the price is 0 or missing, try to find it in the text. Return ONLY a valid JSON object.",
          responseMimeType: "application/json",
          maxOutputTokens: 2000,
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

      const text = geminiResponse.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      
      // If price is 0, it's likely a failure, trigger search fallback
      if (data.price === 0 || !data.images || data.images.length === 0) {
        console.warn('Gemini parsed 0 price or no images, triggering search fallback...');
        throw new Error('Incomplete data extracted');
      }

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
      
      const isApiKeyError = geminiError.message.includes('API key not valid') || geminiError.message.includes('API_KEY_INVALID');
      
      // Fallback to basic cheerio selectors
      const name = $('.product-title').text().trim() || $('h1').first().text().trim() || $('title').text().trim();
      
      // Special Daraz/Lazada price extraction from scripts
      let priceText = '';
      $('script').each((i, el) => {
        const content = $(el).html() || '';
        if (content.includes('price') && content.includes('currency')) {
          const match = content.match(/"price":\s*"?(\d+(\.\d+)?)"?/);
          if (match) priceText = match[1];
        }
      });

      if (!priceText) {
        priceText = $('.product-price').first().text().trim() || $('.price').first().text().trim() || $('[data-price]').first().attr('data-price') || '';
      }
      
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
      const description = $('.product-description').html() || $('#description').html() || $('.details').html() || '';
      
      const images: string[] = [];
      // Try to find images in meta tags first
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) images.push(ogImage);

      $('img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('original-src');
        if (src && (src.includes('product') || src.includes('item') || src.includes('detail') || $(el).closest('.gallery, .product-image, .main-image').length > 0)) {
          if (src.startsWith('//')) images.push('https:' + src);
          else if (src.startsWith('/')) images.push(new URL(url).origin + src);
          else images.push(src);
        }
      });

      const finalImages = Array.from(new Set(images)).filter(img => img.startsWith('http')).slice(0, 10);

      return res.json({
        name,
        price,
        description: description.substring(0, 500),
        images: finalImages.length > 0 ? finalImages : ['https://picsum.photos/seed/product/800/800'],
        sourceUrl: url,
        error: isApiKeyError ? 'GEMINI_API_KEY_INVALID' : null,
        message: isApiKeyError ? 'Your Gemini API Key is invalid. Please check your Vercel environment variables.' : null
      });
    }
  } catch (error: any) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ message: 'Failed to fetch product data. The site might be blocking us.', error: error.message });
  }
};
