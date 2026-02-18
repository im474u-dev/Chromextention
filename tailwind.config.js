/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary': '#0F172A',
                'secondary': '#64748B',
                'accent': '#0EA5E9',
                'success': '#22C55E',
                'error': '#EF4444',
                'warning': '#F59E0B'
            }
        },
    },
    plugins: [],
}
