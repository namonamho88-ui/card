/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#3182f6",
                "toss-gray-50": "#f9fafb",
                "toss-gray-100": "#f2f4f6",
                "toss-gray-200": "#e5e8eb",
                "toss-gray-600": "#4e5968",
                "toss-gray-700": "#333d4b",
                "toss-gray-800": "#191f28",
            },
            fontFamily: {
                "display": ["Inter", "-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "sans-serif"]
            },
        },
    },
    plugins: [],
}
