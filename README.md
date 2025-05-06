# Premier League Dashboard

An interactive dashboard for visualizing Premier League match data with various charts and analytics.

## Features

- Upload and analyze Premier League match data via CSV
- Team selection to focus on specific teams
- Multiple interactive visualizations:
  - Goals per Match by team
  - xG vs xGA Analysis (with zoom capability)
  - Match Outcomes breakdown
  - xG For vs Against Over Time
  - Points Per Game Progression (with team comparison)
  - Full fixture list with week-by-week navigation

## Visualizations

### xG For vs Against Over Time
- Shows a team's expected goals (xG) and expected goals against (xGA) over time
- Blue and pink shading highlight differences between the two metrics

### Team Performance
- Bar chart showing goals per match for all teams
- Alternating colors for better readability
- Selected team is highlighted in Premier League purple

### Match Outcomes
- Donut chart breaking down home wins, away wins, and draws

### xG vs xGA Analysis
- Scatter plot positioning teams by their xG and xGA performance
- Interactive zoom functionality
- Selected team is highlighted for easier identification

### Points Per Game Progression
- Time series chart showing a team's PPG progression over the season
- Compare against another team with color-coded markers for wins/draws/losses

### Match Data Browser
- Week-by-week fixture browser with tabs
- Quick navigation to weeks containing matches for a selected team
- Highlighted rows for the selected team's matches

## Usage

1. Upload a CSV file containing match data
2. Select a team to focus on specific team performance
3. Compare teams using the comparison dropdown in the PPG chart
4. Use the tabs to navigate between match weeks

## Technology

- React
- TypeScript
- Plotly.js for interactive charts
- TailwindCSS for styling

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Project Structure

- `src/App.tsx`: Main application component
- `src/index.tsx`: Entry point of the application

### Data Format

The dashboard expects CSV data with the following columns:
- Wk: Match week number
- Day: Day of the week
- Date: Date of the match
- Time: Match time
- Home: Home team name
- xG: Expected goals for home team
- Score: Match score (format: "homeGoals–awayGoals")
- xG_away: Expected goals for away team
- Away: Away team name
- Attendance: Match attendance
- Venue: Stadium
- Referee: Match referee 