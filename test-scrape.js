import axios from 'axios';

async function findJson() {
    try {
        const { data } = await axios.get('https://www.card-gorilla.com/chart/top100', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log('Searching for JSON data...');
        const match = data.match(/\{"props":.*?\}/);
        if (match) {
            console.log('Found props-like JSON');
            console.log(match[0].substring(0, 100));
        } else {
            const scriptMatch = data.match(/<script>window\.(.*?)=(.*?);<\/script>/);
            if (scriptMatch) {
                console.log(`Found window variable: ${scriptMatch[1]}`);
            } else {
                console.log('No common data patterns found in initial HTML.');
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findJson();
