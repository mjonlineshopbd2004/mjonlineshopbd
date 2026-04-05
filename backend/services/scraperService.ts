import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from "@google/genai";

const getAi = () => {
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
    } else {
      console.warn('ScraperService: No valid GEMINI_API_KEY or fallback found.');
    }
  }
  
  return new GoogleGenAI({ apiKey });
};

const ai = getAi();

export interface ScrapedProduct {
  name: string;
  price: number;
  discountPrice?: number;
  description: string;
  category: string;
  stock: number;
  images: string[];
  specifications: Record<string, string>;
  sizes: string[];
}

export class ScraperService {
  public async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      console.log(`Scraping URL: ${url}`);
      
      // 1. Fetch HTML
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Remove scripts and styles to reduce token count
      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('footer').remove();

      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000); // Limit text for Gemini

      // 2. Use Gemini to extract structured data
      const prompt = `
        Extract product information from the following text content of a webpage.
        URL: ${url}
        Content: ${bodyText}

        Return the data in the following JSON format:
        {
          "name": "Product Name",
          "price": 123.45,
          "discountPrice": 100.00,
          "description": "Full product description",
          "category": "Category Name",
          "stock": 10,
          "images": ["url1", "url2"],
          "specifications": {"Key": "Value"},
          "sizes": ["S", "M", "L"]
        }
        
        If a field is not found, provide a reasonable default or leave it empty.
        For images, look for high-quality image URLs in the content.
      `;

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER },
              discountPrice: { type: Type.NUMBER },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              stock: { type: Type.NUMBER },
              images: { type: Type.ARRAY, items: { type: Type.STRING } },
              specifications: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } },
              sizes: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "price", "description", "category", "stock", "images"]
          }
        }
      });

      const result = JSON.parse(geminiResponse.text || '{}');
      
      // Ensure images are absolute URLs
      if (result.images) {
        result.images = result.images.map((img: string) => {
          if (img.startsWith('//')) return `https:${img}`;
          if (img.startsWith('/')) {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.host}${img}`;
          }
          return img;
        });
      }

      return result as ScrapedProduct;
    } catch (error: any) {
      console.error('Error in ScraperService:', error.message);
      return null;
    }
  }
}

export const scraperService = new ScraperService();
