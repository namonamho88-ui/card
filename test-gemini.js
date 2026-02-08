import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
console.log('API Key length:', apiKey ? apiKey.length : 0);

async function testGemini() {
    const systemInstruction = "You are a helpful assistant.";
    const inputValue = "Hello";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: inputValue }] }],
                system_instruction: { parts: [{ text: systemInstruction }] }
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Full Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testGemini();
