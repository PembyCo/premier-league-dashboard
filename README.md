# Premier League Dashboard

A React TypeScript application with Tailwind CSS via CDN.

## Project Structure

```
premier-league-dashboard/
├── public/
│   └── index.html      # HTML template with Tailwind CDN
├── src/
│   ├── App.tsx         # Main App component
│   └── index.tsx       # Entry point
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── webpack.config.js   # Webpack configuration
└── README.md           # This file
```

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Development:
   ```
   npm start
   ```
   This will start the development server at http://localhost:3000

3. Production build:
   ```
   npm run build
   ```
   This will create optimized files in the `dist` folder

## CodeSandbox

To test in CodeSandbox:
1. Create a new sandbox with this repository
2. Or import the project files directly

## Notes

- Tailwind CSS is included via CDN in the HTML file
- TypeScript is set up with React JSX support 