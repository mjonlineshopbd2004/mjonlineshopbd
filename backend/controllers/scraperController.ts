import { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from "@google/genai";

import { getDb } from '../config/firebase';

let aiClient: GoogleGenAI | null = null;

/**
 * Gets or initializes the Gemini AI client.
 * Priority: 
 * 1. Firestore settings (site/geminiApiKey)
 * 2. Environment variables (GEMINI_API_KEY, API_KEY, CUSTOM_GEMINI_API_KEY)
 */
const getAiClient = async () => {
  if (aiClient) return aiClient;

  let apiKey = '';

  // 1. Try Firestore first
  try {
    const db = getDb();
    const settingsDoc = await db.collection('settings').doc('site').get();
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      if (data?.geminiApiKey && data.geminiApiKey.startsWith('AIzaSy')) {
        apiKey = data.geminiApiKey.trim();
        console.log('Using Gemini API Key from Firestore settings');
      }
    }
  } catch (error) {
    console.error('Error fetching Gemini API key from Firestore:', error);
  }

  // 2. Fallback to environment variables
  if (!apiKey) {
    apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.CUSTOM_GEMINI_API_KEY || '').trim();
    
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
  }

  if (!apiKey || !apiKey.startsWith('AIzaSy')) {
    console.error('CRITICAL: No valid Gemini API key found.');
    // We still initialize with whatever we have to let the SDK throw its own error if needed
    // or we can throw here. Let's throw to be explicit.
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables or Admin Settings.');
  }

  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
};

// Function to reset AI client (useful if a key is reported as leaked)
const resetAiClient = () => {
  aiClient = null;
};

// Helper for calling Gemini with retry logic
async function callGeminiWithRetry(ai: any, params: any, maxRetries = 1) {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      lastError = error;
      const isQuota = error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED' || error.code === 429;
      const isTransient = error.status === 'UNAVAILABLE' || error.code === 503 || error.code === 504;
      
      if (isQuota) {
        // Try to extract retry delay if available
        let retryDelaySec = 0;
        try {
          if (error.details && Array.isArray(error.details)) {
            const retryInfo = error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
            if (retryInfo && retryInfo.retryDelay) {
              retryDelaySec = parseInt(retryInfo.retryDelay.replace('s', ''));
            }
          }
        } catch (e) {}

        // If delay is reasonable (less than 60s) and we have retries left, wait and retry
        if (retryDelaySec > 0 && retryDelaySec <= 60 && i < maxRetries) {
          console.log(`Quota reached, but retry delay is reasonable (${retryDelaySec}s). Waiting...`);
          await new Promise(resolve => setTimeout(resolve, (retryDelaySec + 1) * 1000));
          continue;
        }
        
        throw error; // Otherwise throw to handle via fallback
      }
      
      if (isTransient && i < maxRetries) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`Transient error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw lastError;
}

export const getScraperStatus = async (req: Request, res: Response) => {
  try {
    const ai = await getAiClient();
    
    // Perform a minimal test call
    try {
      await callGeminiWithRetry(ai, {
        model: "gemini-3.1-flash-lite-preview",
        contents: "hi",
        config: { maxOutputTokens: 1 }
      }, 0); // No retries for status check
    } catch (error: any) {
      const isQuota = error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED' || error.code === 429;
      if (isQuota) {
        return res.json({ 
          configured: true, 
          status: 'quota_exceeded',
          error: 'Gemini API quota exceeded (Free Tier). AI features are limited.'
        });
      }
      throw error;
    }
    
    res.json({ 
      configured: true, 
      status: 'active'
    });
  } catch (error: any) {
    console.error('AI Key test failed:', error.message);
    
    const isLeaked = error.message?.includes('leaked') || error.status === 'PERMISSION_DENIED' || error.code === 403;
    const isQuota = error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED' || error.code === 429;
    const isMissing = error.message?.includes('not configured');

    if (isMissing) {
      return res.json({ configured: false, status: 'missing' });
    }
    
    if (isLeaked) {
      resetAiClient();
      return res.json({ 
        configured: true, 
        status: 'leaked',
        error: 'Your API key has been reported as leaked. Please use another API key.'
      });
    }
    
    if (isQuota) {
      return res.json({ 
        configured: true, 
        status: 'quota_exceeded',
        error: 'API quota exceeded. Please try again later.'
      });
    }

    res.json({ 
      configured: true, 
      status: 'error',
      error: error.message
    });
  }
};

export const scrapeProduct = async (req: Request, res: Response) => {
  const { url } = req.body;
  console.log('Scraping request received for URL:', url);

  const ai = await getAiClient();

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
        return await performSearchFallback(url, res, ai, html);
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
      return await performSearchFallback(url, res, ai, html);
    }

    console.log('Using Gemini to parse product data (Content length:', textContent.length, ')...');
    
    try {
      const ai = await getAiClient();
      const geminiResponse = await callGeminiWithRetry(ai, {
        model: "gemini-3.1-flash-lite-preview",
        contents: `Extract the ORIGINAL product information from this page:
        URL: ${url}
        HTML/Data Snippet: ${textContent}
        
        I need:
        1. name: The full original product title.
        2. originalPrice: The price in the original currency (e.g., ¥, $, ৳, or local).
        3. price: Convert the original price to BDT (numeric). If it's already in BDT/৳, just provide the number.
        4. description: A detailed summary of the product features (max 500 words).
        5. images: Extract ALL high-quality product image URLs. IGNORE any images that are logos, icons, headers, footers, or advertisements. Only extract actual product photos from the main product gallery or description.
        6. videoUrl: Extract the product video URL if available (e.g., YouTube, direct mp4 link).
        7. category: The product category.
        8. sizes/colors: Available variations (e.g., ["S", "M", "L"], ["Red", "Blue"]).
        9. specifications: Key-value pairs of product specs (e.g., [{"key": "Material", "value": "Cotton"}]).`,
        config: {
          systemInstruction: "You are a professional product data extractor. Your goal is to extract the most accurate and original information. Look specifically for JSON-LD scripts or meta tags for price and images. IGNORE LOGOS AND SITE ICONS. If the price is in a foreign currency (like Chinese Yuan ¥ or USD $), convert it to Bangladeshi Taka (BDT) using current approximate rates (e.g., 1 CNY = 16 BDT, 1 USD = 115 BDT). If the price is 0 or missing, try to find it in the text. Return ONLY a valid JSON object.",
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
        return await performSearchFallback(url, res, ai, html);
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
      
      // Check for leaked key error
      if (geminiError.message?.includes('leaked') || geminiError.status === 'PERMISSION_DENIED') {
        console.error('CRITICAL: Gemini API key reported as leaked.');
        resetAiClient();
        return res.status(400).json({ 
          message: 'Your Gemini API key has been reported as leaked by Google. Please update your API key in the Settings menu.',
          error: 'API_KEY_LEAKED'
        });
      }

      return await performSearchFallback(url, res, ai, html);
    }
  } catch (error: any) {
    console.error('Scraping error:', error.message);
    // Last resort: Cheerio fallback if everything else fails
    return await performCheerioFallback(url, res, html || '');
  }
};

// Helper function for Gemini Search Fallback
async function performSearchFallback(url: string, res: Response, ai: any, html?: string) {
  console.log('Attempting Gemini Search fallback for URL:', url);
  try {
    const searchResponse = await callGeminiWithRetry(ai, {
      model: "gemini-3.1-flash-lite-preview",
      contents: `Find the EXACT ORIGINAL product details for this URL: ${url}. 
      
      REQUIRED FIELDS:
      1. name: The full original product title.
      2. originalPrice: The price in the original currency (e.g., ¥, $, or local).
      3. price: Convert the original price to BDT (1 CNY = 16 BDT, 1 USD = 115 BDT).
      4. description: A detailed summary of the product features.
      5. images: Extract ALL high-quality product image URLs. DO NOT include logos, site banners, or unrelated icons. Focus on the product gallery.
      6. videoUrl: Extract the product video URL if available (e.g., YouTube, direct mp4 link).
      7. category: The product category.
      8. sizes/colors: Available variations.`,
      config: {
        systemInstruction: "You are a professional product data specialist. Your goal is to find the most accurate and original information. Use Google Search and URL Context to bypass blocks. IGNORE LOGOS AND SITE ICONS. Return ONLY a valid JSON object. Do not guess; find real data.",
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
    
    // Check for leaked key error
    if (searchError.message?.includes('leaked') || searchError.status === 'PERMISSION_DENIED') {
      console.error('CRITICAL: Gemini API key reported as leaked in fallback.');
      resetAiClient();
      return res.status(400).json({ 
        message: 'Your Gemini API key has been reported as leaked by Google. Please update your API key in the Settings menu.',
        error: 'API_KEY_LEAKED'
      });
    }

    const isQuotaError = searchError.message?.includes('quota') || 
                        searchError.message?.includes('429') || 
                        searchError.status === 'RESOURCE_EXHAUSTED';

    if (isQuotaError) {
      console.warn('Gemini API quota exceeded. Falling back to basic extraction.');
      
      // Extract retry info if possible
      let retryMsg = 'AI quota exceeded (Free Tier limit: 20/day). Please try again later.';
      try {
        if (searchError.message?.includes('limit: 20')) {
          retryMsg = 'AI Quota Exceeded: You have reached the 20 requests per day limit for the Gemini Free Tier. Please wait until tomorrow or use a different API key.';
        }
      } catch (e) {}

      // If we have HTML, try basic extraction
      if (html && html.length > 500) {
        return await performCheerioFallback(url, res, html, retryMsg);
      } else {
        return res.status(429).json({ 
          message: retryMsg,
          error: 'QUOTA_EXCEEDED',
          retryAfter: searchError.details?.[0]?.retryDelay || '60s'
        });
      }
    }
    
    // If search fails for other reasons, try Cheerio as absolute last resort
    return await performCheerioFallback(url, res, html || '');
  }
}

// Helper function for Cheerio Fallback
async function performCheerioFallback(url: string, res: Response, html: string, customMessage?: string) {
  console.log('Attempting Cheerio fallback for URL:', url);
  try {
    if (!html || html.length < 100) {
      return res.status(404).json({ 
        message: customMessage || 'Could not fetch website content and AI fallback failed.',
        error: 'FETCH_FAILED'
      });
    }

    const $ = cheerio.load(html);
    
    // Improved Amazon specific extraction
    let name = '';
    let price = 0;
    let originalPrice = '';
    let description = '';
    const images: string[] = [];

    if (url.includes('amazon.')) {
      name = $('#productTitle').text().trim();
      const priceWhole = $('.a-price-whole').first().text().trim();
      const priceFraction = $('.a-price-fraction').first().text().trim();
      if (priceWhole) price = parseFloat(priceWhole.replace(/[^0-9.]/g, '')) + (parseFloat(priceFraction) / 100 || 0);
      const amazonOriginalPrice = $('.a-text-strike').first().text().trim();
      if (amazonOriginalPrice) originalPrice = amazonOriginalPrice;
      description = $('#feature-bullets').text().trim() || $('#productDescription').text().trim();
      
      // Amazon main images
      const landingImage = $('#landingImage').attr('src') || $('#landingImage').attr('data-old-hires');
      if (landingImage) images.push(landingImage);
    } else if (url.includes('daraz.')) {
      name = $('.pdp-mod-product-badge-title').text().trim() || $('#pdp-product-title').text().trim();
      const darazPriceText = $('.pdp-price_type_normal').text().trim() || $('.pdp-price').first().text().trim();
      if (darazPriceText) price = parseFloat(darazPriceText.replace(/[^0-9.]/g, ''));
      const darazOriginalPrice = $('.pdp-price_type_deleted').first().text().trim();
      if (darazOriginalPrice) originalPrice = darazOriginalPrice;
      description = $('.pdp-product-detail').text().trim() || $('.pdp-common-info').text().trim();
      
      // Daraz images
      $('.pdp-mod-common-image').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) images.push(src);
      });
    } else if (url.includes('1688.com')) {
      name = $('.d-title').text().trim() || $('h1').first().text().trim();
      const priceText = $('.price-text').first().text().trim() || $('.price-num').first().text().trim() || $('.mod-detail-price .price').text().trim();
      if (priceText) {
        const prices = priceText.match(/\d+(\.\d+)?/g);
        if (prices && prices.length > 0) {
          price = parseFloat(prices[0]) * 16; // CNY to BDT
        }
      }
      description = $('.desc-lazyload-container').text().trim() || $('.content-detail').text().trim() || $('#mod-detail-attributes').text().trim();
      
      // 1688 images
      $('.tab-content img, .vertical-img img, .mod-detail-gallery img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-lazy-src') || $(el).attr('data-src');
        if (src && (src.includes('img.alicdn.com') || src.includes('cbu01.alicdn.com'))) {
          let finalSrc = src;
          if (src.startsWith('//')) finalSrc = 'https:' + src;
          images.push(finalSrc);
        }
      });
    }

    // Extract Sizes and Colors
    const sizes: string[] = [];
    const colors: string[] = [];
    
    // Common patterns for sizes/colors
    $('.sku-item, .sku-value, .prop-item, .size-item, .color-item, button, span, .pdp-mod-product-info-section-item').each((i, el) => {
      const text = $(el).text().trim();
      if (!text || text.length > 30) return;
      
      const lower = text.toLowerCase();
      const isSize = lower.match(/^(s|m|l|xl|xxl|xxxl|[2-4]xl|[0-9]{2,3})$/) || 
                     $(el).closest('[class*="size"], [id*="size"]').length > 0;
      const isColor = $(el).closest('[class*="color"], [id*="color"]').length > 0 || 
                      $(el).css('background-color') || $(el).find('[style*="background"]').length > 0;

      if (isSize && !sizes.includes(text)) sizes.push(text);
      if (isColor && !colors.includes(text)) colors.push(text);
    });

    // Fallback: Extract from description text
    if (sizes.length === 0 || colors.length === 0) {
      const descText = description.replace(/<[^>]*>/g, ' ');
      if (sizes.length === 0) {
        const sizeMatch = descText.match(/size[:\s]+([^\s,;.]+)/i);
        if (sizeMatch && sizeMatch[1]) sizes.push(sizeMatch[1]);
      }
      if (colors.length === 0) {
        const colorMatch = descText.match(/colou?r[:\s]+([^\s,;.]+)/i);
        if (colorMatch && colorMatch[1]) colors.push(colorMatch[1]);
      }
    }

    // General JSON-LD extraction (very reliable for e-commerce)
    if (!name || price === 0) {
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const data = JSON.parse($(el).html() || '{}');
          const product = Array.isArray(data) ? data.find(item => item['@type'] === 'Product') : (data['@type'] === 'Product' ? data : null);
          
          if (product) {
            if (!name) name = product.name;
            if (price === 0 && product.offers) {
              const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
              if (offer.price) price = parseFloat(offer.price);
            }
            if (!description) description = product.description;
            if (product.image) {
              if (Array.isArray(product.image)) images.push(...product.image);
              else images.push(product.image);
            }
          }
        } catch (e) {}
      });
    }

    if (!name) name = $('.product-title').text().trim() || $('h1').first().text().trim() || $('title').text().trim() || $('.title').first().text().trim();
    
    if (price === 0) {
      let priceText = '';
      
      // Try common price selectors
      const priceSelectors = [
        '.pdp-price', '.pdp-price_type_normal', '.price-text', '.price-num', 
        '.current-price', '.product-price', '.price', '.a-price-whole',
        '[data-price]', '.sku-price', '.item-price', '.sale-price',
        '.pdp-mod-product-price .pdp-price', '.product-info-price .price',
        '.price-container .price', '.product-single__price', '.product-price-value'
      ];
      
      for (const selector of priceSelectors) {
        const text = $(selector).first().text().trim();
        if (text) {
          const val = parseFloat(text.replace(/[^0-9.]/g, ''));
          if (val > 0) {
            price = val;
            break;
          }
        }
      }

      if (price === 0) {
        $('script').each((i, el) => {
          const content = $(el).html() || '';
          if (content.includes('price') && content.includes('currency')) {
            const match = content.match(/"price":\s*"?(\d+(\.\d+)?)"?/);
            if (match) price = parseFloat(match[1]);
          }
        });
      }
    }

    if (!originalPrice) {
      const originalPriceSelectors = [
        '.pdp-price_type_deleted', '.a-text-strike', '.original-price', 
        '.old-price', '.list-price', '.strike-price', '.price-old',
        '.compare-at-price', '.product-price-old', '.was-price'
      ];
      for (const selector of originalPriceSelectors) {
        const text = $(selector).first().text().trim();
        if (text) {
          originalPrice = text;
          break;
        }
      }
    }

    if (!description) description = $('.product-description').html() || $('#description').html() || $('.details').html() || $('.product-details').html() || $('.desc').html() || $('.item-description').html() || '';
    
    // Extract Category from breadcrumbs
    let category = 'Imported';
    const breadcrumbs: string[] = [];
    $('.breadcrumb-item, .breadcrumb, .breadcrumbs, .breadcrumb-list li').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 50) breadcrumbs.push(text);
    });
    if (breadcrumbs.length > 1) {
      category = breadcrumbs[breadcrumbs.length - 2] || breadcrumbs[1];
    } else if (url.includes('daraz.')) {
      category = $('.breadcrumb_item_anchor').last().text().trim() || 'Imported';
    }

    // Extract Video URL
    let videoUrl = '';
    $('iframe, video, source').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && (src.includes('youtube.com') || src.includes('vimeo.com') || src.includes('.mp4'))) {
        videoUrl = src;
        if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
        return false; // break
      }
    });

    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && !ogImage.toLowerCase().includes('logo') && !ogImage.toLowerCase().includes('icon')) {
      images.push(ogImage);
    }

    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('original-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original') || $(el).attr('data-actual-src');
      
      if (src) {
        let finalSrc = src;
        if (src.startsWith('//')) finalSrc = 'https:' + src;
        else if (src.startsWith('/')) finalSrc = new URL(url).origin + src;
        
        const lowerSrc = finalSrc.toLowerCase();
        const isLogo = lowerSrc.includes('logo') || lowerSrc.includes('icon') || lowerSrc.includes('banner') || lowerSrc.includes('sprite') || lowerSrc.includes('nav-') || lowerSrc.includes('footer') || lowerSrc.includes('mobile-nav');
        
        // Amazon specific image patterns
        const isAmazonProduct = lowerSrc.includes('images/i/') || lowerSrc.includes('media-amazon.com/images/p/');
        
        if (!isLogo && (
          isAmazonProduct ||
          lowerSrc.includes('product') || 
          lowerSrc.includes('item') || 
          lowerSrc.includes('detail') || 
          lowerSrc.includes('offer') || 
          lowerSrc.includes('main') ||
          lowerSrc.includes('gallery') ||
          lowerSrc.includes('media') ||
          $(el).closest('.gallery, .product-image, .main-image, .swiper-slide, .preview, .thumb, .product-gallery, .image-viewer, #imgTagWrapperId, .imgTagWrapper, .image-container, .photo-container').length > 0
        )) {
          if (!images.includes(finalSrc)) {
            images.push(finalSrc);
          }
        }
      }
    });

    // Deduplicate, filter and limit
    const finalImages = Array.from(new Set(images))
      .filter(img => img && img.startsWith('http'))
      .filter(img => {
        const lower = img.toLowerCase();
        return !lower.includes('logo') && !lower.includes('icon') && !lower.includes('banner') && !lower.includes('sprite');
      })
      .slice(0, 10);

    return res.json({
      name: name || 'Unknown Product',
      price: price || 0,
      originalPrice: originalPrice || '',
      description: description ? description.substring(0, 1000) : 'No description found.',
      images: finalImages.length > 0 ? finalImages : ['https://picsum.photos/seed/product/800/800'],
      category: category || 'Imported',
      sizes: sizes.length > 0 ? sizes : [],
      colors: colors.length > 0 ? colors : [],
      videoUrl: videoUrl || '',
      sourceUrl: url,
      message: customMessage || 'Limited data extracted via fallback.'
    });
  } catch (e: any) {
    return res.status(500).json({ message: 'All extraction methods failed.', error: e.message });
  }
}
