import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
if (!process.env.GEMINI_API_KEY) {
  console.error('CRITICAL: GEMINI_API_KEY is not set in the environment!');
} else {
  console.log('GEMINI_API_KEY is set (length:', process.env.GEMINI_API_KEY.length, ')');
}

export const scrapeProduct = async (req: Request, res: Response) => {
  const { url } = req.body;
  console.log('Scraping request received for URL:', url);

  if (!url) {
    console.warn('Scraping failed: No URL provided');
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    console.log('Fetching URL:', url);
    let html = '';
    try {
      const response = await axios.get(url, {
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
        timeout: 20000
      });
      html = response.data;
    } catch (fetchError: any) {
      console.error('Direct fetch failed:', fetchError.message);
      
      // If direct fetch fails (e.g. 403), try to use Gemini with Google Search to find the info
      console.log('Attempting fallback: Using Gemini with Google Search to find product info...');
      try {
        const searchResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Find product information for this URL: ${url}. 
          I need the product name, price in BDT (numeric), a good description, and at least 3 high-quality product image URLs.
          If you can't access the URL directly, use Google Search to find the product details from other sources or cached versions.`,
          config: {
            systemInstruction: "You are a product data extractor. You MUST return ONLY a valid JSON object matching the requested schema. Do not include any conversational text, markdown formatting, or explanations.",
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
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

    // Remove scripts, styles, and other non-content elements to reduce token usage
    $('script, style, noscript, iframe, header, footer, nav').remove();
    const cleanHtml = $('body').html() || html;
    const textContent = cleanHtml.substring(0, 30000); // Limit text to avoid token limits

    console.log('Using Gemini to parse product data...');
    
    try {
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract product information from the following HTML content of a product page. 
        URL: ${url}
        
        HTML Content:
        ${textContent}
        
        Return the data in JSON format with the following fields:
        - name: string (The product title)
        - price: number (numeric value only, convert to BDT if needed. 1 CNY = 16 BDT, 1 USD = 110 BDT)
        - originalPrice: string (The price as seen on the website, e.g. "¥15.00" or "$10.00")
        - category: string (A suitable category name)
        - description: string (HTML or plain text, summarized)
        - images: string[] (absolute URLs of product images)
        - sizes: string[] (available sizes)
        - colors: string[] (available colors)
        - specifications: { key: string, value: string }[] (key-value pairs of product details)`,
        config: {
          systemInstruction: "You are a product data extractor. You MUST return ONLY a valid JSON object matching the requested schema. Do not include any conversational text, markdown formatting, or explanations.",
          responseMimeType: "application/json",
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
