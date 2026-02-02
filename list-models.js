// list-models.js
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.VITE_GEMINI_API_KEY;

async function listModels(version) {
    try {
        const url = `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log(`\nAvailable Models (${version}):`);
        if (data.models) {
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
            });
        } else {
            console.log(`No models found for ${version} or error:`, JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error(`Fetch Error for ${version}:`, error);
    }
}

async function run() {
    await listModels('v1beta');
    await listModels('v1');
}

run();
