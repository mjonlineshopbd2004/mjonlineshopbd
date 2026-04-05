import { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    // Priority: GEMINI_API_KEY -> API_KEY -> CUSTOM_GEMINI_API_KEY
    let apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.CUSTOM_GEMINI_API_KEY || '').trim();
    
    // Check for common placeholders or invalid keys
    const isPlaceholder = !apiKey || 
                         apiKey.includes('TODO') || 
                         apiKey.includes('YOUR_API_KEY') || 
                         apiKey.includes('Free Tier') ||
                         apiKey.length < 10 ||
                         !apiKey.startsWith('AIzaSy');

    if (isPlaceholder) {
      console.warn('GEMINI_API_KEY is a placeholder or invalid. Checking fallback API_KEY...');
      const fallbackKey = (process.env.API_KEY || process.env.CUSTOM_GEMINI_API_KEY || '').trim();
      if (fallbackKey && fallbackKey.startsWith('AIzaSy')) {
        apiKey = fallbackKey;
        console.log('Using fallback API_KEY.');
      } else {
        console.error('CRITICAL: No valid Gemini API key found.');
      }
    } else {
      console.log(`Gemini AI Client initialized. Key Prefix: ${apiKey.substring(0, 6)}...`);
    }
    
    aiClient = new GoogleGenAI({ apiKey: apiKey });
  }
  return aiClient;
};

export const getScraperStatus = async (req: Request, res: Response) => {
  let apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.CUSTOM_GEMINI_API_KEY || '').trim();
  
  const isPlaceholder = !apiKey || 
                       apiKey.includes('TODO') || 
                       apiKey.includes('YOUR_API_KEY') || 
                       apiKey.includes('Free Tier') ||
                       apiKey.length < 10 ||
                       !apiKey.startsWith('AIzaSy');

  if (isPlaceholder) {
    const fallbackKey = (process.env.API_KEY || process.env.CUSTOM_GEMINI_API_KEY || '').trim();
    if (fallbackKey && fallbackKey.startsWith('AIzaSy')) {
      apiKey = fallbackKey;
    }
  }

  const isConfigured = !!(apiKey && apiKey.startsWith('AIzaSy') && apiKey.length > 10);
  res.json({ configured: isConfigured, prefix: apiKey.substring(0, 6) });
};

export const scrapeProduct = async (req: Request, res: Response) => {
  const { url } = req.body;
  console.log('Scraping request received for URL:', url);

  const ai = getAiClient();

  if (!url) {
    console.warn('Scraping failed: No URL provided');
    return res.status(400).json({ message: 'URL is required' });
  }

  let html = '';
  try {
    console.log('Fetching URL:', url);
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
        signal: AbortSignal.timeout(10000), // Increased from 2000 to allow more time for slow sites
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      html = await response.text();
      
      // If the HTML is very short or looks like a challenge/block page, try search fallback
      if (html.length < 1000 || html.toLowerCase().includes('captcha') || html.toLowerCase().includes('challenge-platform') || html.toLowerCase().includes('security check')) {
        console.warn('HTML content looks suspicious or too short, triggering search fallback...');
        return await performSearchFallback(url, res, ai);
      }
    } catch (fetchError: any) {
      console.error('Direct fetch failed:', fetchError.message);
      return await performSearchFallback(url, res, ai);
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
      const $el = $(el);
      if ($el.children().length === 0 && !$el.text().trim() && !$el.is('img')) {
        $el.remove();
      }
    });

    const cleanHtml = $('body').html() || html;
    // Combine cleaned HTML with JSON-LD data
    const textContent = (jsonLdData.join('\n') + '\n' + cleanHtml).substring(0, 30000); 

    // If the text content is still too thin after cleaning, trigger search fallback
    if (textContent.length < 300) {
      console.warn('Cleaned text content is too short, triggering search fallback...');
      return await performSearchFallback(url, res, ai);
    }

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
        4. description: A detailed summary of the product features (max 500 words).
        5. images: Extract ALL high-quality product image URLs. Look for 'image', 'og:image', or large images in the HTML.
        6. videoUrl: Extract the product video URL if available (e.g., YouTube, direct mp4 link).
        7. category: The product category.
        8. sizes/colors: Available variations (e.g., ["S", "M", "L"], ["Red", "Blue"]).
        9. specifications: Key-value pairs of product specs (e.g., [{"key": "Material", "value": "Cotton"}]).`,
        config: {
          systemInstruction: "You are a professional product data extractor. Your goal is to extract the most accurate and original information. Look specifically for JSON-LD scripts or meta tags for price and images. If the price is in a foreign currency (like Chinese Yuan ¥ or USD $), convert it to Bangladeshi Taka (BDT) using current approximate rates (e.g., 1 CNY = 16 BDT, 1 USD = 115 BDT). If the price is 0 or missing, try to find it in the text. Return ONLY a valid JSON object.",
          responseMimeType: "application/json",
          maxOutputTokens: 3000,
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
              },
              specifications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.STRING }
                  }
                }
              },
              videoUrl: { type: Type.STRING }
            },
            required: ["name", "images"]
          }
        }
      });

      const text = geminiResponse.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      
      // If price is 0 or no images, it's likely a failure, trigger search fallback
      if ((!data.price || data.price === 0) || !data.images || data.images.length === 0) {
        console.warn('Gemini parsed 0 price or no images, triggering search fallback...');
        return await performSearchFallback(url, res, ai);
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
      console.error('Gemini parsing failed, triggering search fallback:', geminiError.message);
      return await performSearchFallback(url, res, ai);
    }
  } catch (error: any) {
    console.error('Scraping error:', error.message);
    // Last resort: Cheerio fallback if everything else fails
    return await performCheerioFallback(url, res, html || '');
  }
};

// Helper function for Gemini Search Fallback
async function performSearchFallback(url: string, res: Response, ai: any) {
  console.log('Attempting Gemini Search fallback for URL:', url);
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
      6. videoUrl: Extract the product video URL if available (e.g., YouTube, direct mp4 link).
      7. category: The product category.
      8. sizes/colors: Available variations.`,
      config: {
        systemInstruction: "You are a professional product data specialist. Your goal is to find the most accurate and original information. Use Google Search and URL Context to bypass blocks. Return ONLY a valid JSON object. Do not guess; find real data.",
        tools: [{ urlContext: {} }, { googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
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
            },
            videoUrl: { type: Type.STRING }
          },
          required: ["name", "images"]
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
    console.error('Gemini Search fallback failed:', searchError.message);
    // If search fails, try Cheerio as absolute last resort
    return await performCheerioFallback(url, res, '');
  }
}

// Helper function for Cheerio Fallback
async function performCheerioFallback(url: string, res: Response, html: string) {
  console.log('Attempting Cheerio fallback for URL:', url);
  try {
    const $ = cheerio.load(html);
    const name = $('.product-title').text().trim() || $('h1').first().text().trim() || $('title').text().trim() || $('.title').first().text().trim();
    
    let priceText = '';
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      if (content.includes('price') && content.includes('currency')) {
        const match = content.match(/"price":\s*"?(\d+(\.\d+)?)"?/);
        if (match) priceText = match[1];
      }
    });

    if (!priceText) {
      priceText = $('.product-price').first().text().trim() || $('.price').first().text().trim() || $('[data-price]').first().attr('data-price') || $('.current-price').text().trim() || '';
    }
    
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    const description = $('.product-description').html() || $('#description').html() || $('.details').html() || $('.product-details').html() || $('.desc').html() || $('.item-description').html() || '';
    
    const images: string[] = [];
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.push(ogImage);

    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('original-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original') || $(el).attr('data-actual-src');
      if (src && (
        src.includes('product') || 
        src.includes('item') || 
        src.includes('detail') || 
        src.includes('offer') || 
        src.includes('main') ||
        $(el).closest('.gallery, .product-image, .main-image, .swiper-slide, .preview, .thumb').length > 0
      )) {
        if (src.startsWith('//')) images.push('https:' + src);
        else if (src.startsWith('/')) images.push(new URL(url).origin + src);
        else images.push(src);
      }
    });

    const finalImages = Array.from(new Set(images)).filter(img => img && img.startsWith('http')).slice(0, 10);

    return res.json({
      name: name || 'Unknown Product',
      price: price || 0,
      description: description ? description.substring(0, 1000) : 'No description found.',
      images: finalImages.length > 0 ? finalImages : ['https://picsum.photos/seed/product/800/800'],
      category: 'Imported',
      sourceUrl: url,
      message: 'Limited data extracted via fallback.'
    });
  } catch (e: any) {
    return res.status(500).json({ message: 'All extraction methods failed.', error: e.message });
  }
}
