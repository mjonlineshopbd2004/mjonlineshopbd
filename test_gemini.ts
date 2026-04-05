import { GoogleGenAI } from "@google/genai";

async function testKey() {
  const apiKey = process.env.API_KEY || 'AIzaSyCAlK4OVJlp_8181kHlv-a_WXQr33KrkrE';
  console.log('Testing API Key:', apiKey.substring(0, 10) + '...');
  
  try {
    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hello, are you working?",
    });
    console.log('Success! Response:', response.text);
  } catch (error: any) {
    console.error('Failed! Error:', error.message);
  }
}

testKey();
