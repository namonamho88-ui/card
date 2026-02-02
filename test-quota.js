// test-quota.js
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.VITE_GEMINI_API_KEY;

async function testModel(version, model) {
    try {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
            })
        });
        const data = await response.json();
        console.log(`\nTesting ${version}/${model}:`);
        console.log('Status:', response.status);
        if (data.error) {
            console.log('Error:', data.error.message);
            console.log('Details:', JSON.stringify(data.error.details, null, 2));
        } else {
            console.log('Success! Response:', data.candidates?.[0]?.content?.parts?.[0]?.text);
        }
    } catch (error) {
        console.error(`Fetch Error for ${model}:`, error);
    }
}

async function run() {
    await testModel('v1beta', 'gemini-1.5-flash');
    await testModel('v1beta', 'gemini-flash-latest');
    await testModel('v1', 'gemini-1.5-flash');
}

run();
