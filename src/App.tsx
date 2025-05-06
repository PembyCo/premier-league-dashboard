import React, { useState, useEffect, useMemo, useRef } from 'react';

// Interface to inject Plotly into window
interface WindowWithPlotly extends Window {
  Plotly?: any;
}

// Interface for Plotly chart data series
interface PlotlyDataSeries {
  x: any[];
  y: any[];
  mode: string;
  type?: string;
  name: string;
  line?: {
    shape?: string;
    width: number;
    color?: string;
    smoothing?: number;
  };
  marker?: {
    size: number | number[];
    color: string | string[];
    line?: {
      width: number | number[];
      color: string | string[];
    };
  };
  text?: any[];
  textfont?: {
    size?: number;
    color?: string | string[];
  };
  textposition?: string;
  hovertemplate?: string;
  hoverinfo?: string;
  fill?: string;
  fillcolor?: string;
  showlegend?: boolean;
  customdata?: any[][];
}

interface MatchData {
  Wk: number;
  Day: string;
  Date: string;
  Time: string;
  Home: string;
  xG: number;
  Score: string;
  xG_away: number;
  Away: string;
  Attendance: string;
  Venue: string;
  Referee: string;
}

// Interface for PPG data point
interface PPGDataPoint {
  date: string;
  ppg: number;
  points: number;
  matches: number;
  opponent: string;
  venue: string;
  result: string;
  score: string;
  team: string;
}

// Interface for PPG time series data
interface PPGTimeseriesData {
  primaryTeam: PPGDataPoint[];
  compareTeam: PPGDataPoint[];
}

// Helper functions for the new visualizations
const parseScore = (score: string): { homeGoals: number, awayGoals: number } => {
  const parts = score.split('–');
  return {
    homeGoals: parseInt(parts[0], 10) || 0,
    awayGoals: parseInt(parts[1], 10) || 0
  };
};

const defaultData: MatchData[] = [
  { Wk: 1, Day: 'Fri', Date: '2024-08-16', Time: '20:00', Home: 'Manchester Utd', xG: 2.4, Score: '1–0', xG_away: 0.4, Away: 'Fulham', Attendance: '73,297', Venue: 'Old Trafford', Referee: 'Robert Jones' },
  { Wk: 1, Day: 'Sat', Date: '2024-08-17', Time: '12:30', Home: 'Ipswich Town', xG: 0.5, Score: '0–2', xG_away: 2.6, Away: 'Liverpool', Attendance: '30,014', Venue: 'Portman Road Stadium', Referee: 'Tim Robinson' },
  { Wk: 1, Day: 'Sat', Date: '2024-08-17', Time: '15:00', Home: 'Newcastle Utd', xG: 0.3, Score: '1–0', xG_away: 1.8, Away: 'Southampton', Attendance: '52,196', Venue: 'St James\' Park', Referee: 'Craig Pawson' },
  { Wk: 1, Day: 'Sat', Date: '2024-08-17', Time: '15:00', Home: 'Everton', xG: 0.5, Score: '0–3', xG_away: 1.4, Away: 'Brighton', Attendance: '39,217', Venue: 'Goodison Park', Referee: 'Simon Hooper' },
  // Dummy data for additional weeks
  { Wk: 2, Day: 'Sat', Date: '2024-08-24', Time: '15:00', Home: 'Manchester Utd', xG: 1.8, Score: '2–1', xG_away: 1.2, Away: 'Liverpool', Attendance: '74,000', Venue: 'Old Trafford', Referee: 'Anthony Taylor' },
  { Wk: 2, Day: 'Sun', Date: '2024-08-25', Time: '14:00', Home: 'Fulham', xG: 1.0, Score: '1–1', xG_away: 1.5, Away: 'Newcastle Utd', Attendance: '25,000', Venue: 'Craven Cottage', Referee: 'Michael Oliver' },
];

const App = (): JSX.Element => {
  const [data, setData] = useState<MatchData[]>(defaultData);
  const [error, setError] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [compareTeam, setCompareTeam] = useState<string>('');
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const chartRef = useRef<HTMLDivElement>(null);
  const timeseriesChartRef = useRef<HTMLDivElement>(null);
  const donutChartRef = useRef<HTMLDivElement>(null);
  const scatterChartRef = useRef<HTMLDivElement>(null);
  const ppgChartRef = useRef<HTMLDivElement>(null);
  const weekTabsRef = useRef<HTMLDivElement>(null);

  // Compute unique teams for dropdown
  const teams = useMemo(() => [...new Set(data.map(d => d.Home).concat(data.map(d => d.Away)))], [data]);

  // Calculate goal statistics by team
  const teamGoals = useMemo(() => {
    const statsByTeam = new Map<string, { goals: number, matches: number }>();
    
    data.forEach(match => {
      const { homeGoals, awayGoals } = parseScore(match.Score);
      
      // Update home team stats
      const homeStats = statsByTeam.get(match.Home) || { goals: 0, matches: 0 };
      homeStats.goals += homeGoals;
      homeStats.matches += 1;
      statsByTeam.set(match.Home, homeStats);
      
      // Update away team stats
      const awayStats = statsByTeam.get(match.Away) || { goals: 0, matches: 0 };
      awayStats.goals += awayGoals;
      awayStats.matches += 1;
      statsByTeam.set(match.Away, awayStats);
    });
    
    // Convert to array for the chart - using Array.from instead of Object.entries
    return Array.from(statsByTeam.entries())
      .filter(([_, stats]) => stats.matches > 0)
      .map(([team, stats]) => ({
        team,
        goalsPerMatch: stats.goals / stats.matches
      }))
      .sort((a, b) => b.goalsPerMatch - a.goalsPerMatch);  // Sort by goals per match
  }, [data]);

  // Get all weeks with matches
  const availableWeeks = useMemo(() => {
    return [...new Set(data.map(match => match.Wk))].sort((a, b) => a - b);
  }, [data]);
  
  // Find weeks containing matches with the selected team
  const weeksWithSelectedTeam = useMemo(() => {
    if (!selectedTeam) return [];
    
    return [...new Set(
      data
        .filter(match => match.Home === selectedTeam || match.Away === selectedTeam)
        .map(match => match.Wk)
    )].sort((a, b) => a - b);
  }, [data, selectedTeam]);

  // xG Timeseries Data
  const timeseriesData = useMemo(() => {
    const filtered = selectedTeam 
      ? data.filter(d => d.Home === selectedTeam || d.Away === selectedTeam) 
      : data;

    return filtered
      .map(d => {
        // If we have a selected team, calculate xG and xGA from that team's perspective
        const isHome = d.Home === selectedTeam;
        const isAway = d.Away === selectedTeam;
        
        if (selectedTeam && (isHome || isAway)) {
          // Calculate values from the perspective of the selected team
          return {
            date: d.Date,
            xG: isHome ? d.xG : d.xG_away,
            xGA: isHome ? d.xG_away : d.xG,
            team: selectedTeam,
            match: `${d.Home} vs ${d.Away}`,
            opponent: isHome ? d.Away : d.Home
          };
        } else {
          // If no team selected, default to showing the home team's perspective 
          return {
            date: d.Date,
            xG: d.xG,
            xGA: d.xG_away,
            team: d.Home,
            match: `${d.Home} vs ${d.Away}`,
            opponent: d.Away
          };
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, selectedTeam]);

  // Match Outcome Data for Donut Chart
  const matchOutcomes = useMemo(() => {
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    
    data.forEach(match => {
      const { homeGoals, awayGoals } = parseScore(match.Score);
      
      if (homeGoals > awayGoals) {
        homeWins++;
      } else if (homeGoals < awayGoals) {
        awayWins++;
      } else {
        draws++;
      }
    });
    
    const total = homeWins + awayWins + draws;
    
    return {
      labels: ['Home Wins', 'Away Wins', 'Draws'],
      values: [homeWins, awayWins, draws],
      percentages: [
        (homeWins / total) * 100,
        (awayWins / total) * 100,
        (draws / total) * 100
      ],
      counts: [homeWins, awayWins, draws],
      total
    };
  }, [data]);

  // xG vs xGA Scatter Plot Data
  const scatterData = useMemo(() => {
    // Calculate average xG and xGA for each team
    const teamStats = new Map<string, { 
      xG: number, 
      xGA: number, 
      matches: number, 
      goalsFor: number, 
      goalsAgainst: number 
    }>();
    
    data.forEach(match => {
      const { homeGoals, awayGoals } = parseScore(match.Score);
      
      // Update home team stats
      const homeStats = teamStats.get(match.Home) || { 
        xG: 0, xGA: 0, matches: 0, goalsFor: 0, goalsAgainst: 0 
      };
      homeStats.xG += match.xG;
      homeStats.xGA += match.xG_away;
      homeStats.goalsFor += homeGoals;
      homeStats.goalsAgainst += awayGoals;
      homeStats.matches += 1;
      teamStats.set(match.Home, homeStats);
      
      // Update away team stats
      const awayStats = teamStats.get(match.Away) || { 
        xG: 0, xGA: 0, matches: 0, goalsFor: 0, goalsAgainst: 0 
      };
      awayStats.xG += match.xG_away;
      awayStats.xGA += match.xG;
      awayStats.goalsFor += awayGoals;
      awayStats.goalsAgainst += homeGoals;
      awayStats.matches += 1;
      teamStats.set(match.Away, awayStats);
    });
    
    // Convert to array for the chart
    return Array.from(teamStats.entries())
      .filter(([_, stats]) => stats.matches > 0)
      .map(([team, stats]) => ({
        team,
        xG: stats.xG / stats.matches,
        xGA: stats.xGA / stats.matches,
        goalsPerMatch: stats.goalsFor / stats.matches,
        concededPerMatch: stats.goalsAgainst / stats.matches,
        matches: stats.matches,
        goalDiff: (stats.goalsFor - stats.goalsAgainst) / stats.matches
      }));
  }, [data]);
  
  // PPG Timeseries Data
  const ppgTimeseriesData = useMemo<PPGTimeseriesData>(() => {
    // Only process data for a selected team
    if (!selectedTeam) return { primaryTeam: [], compareTeam: [] };
    
    console.log('Calculating PPG for team:', selectedTeam);
    
    // Get all matches for the selected team in chronological order
    const teamMatches = data
      .filter(match => match.Home === selectedTeam || match.Away === selectedTeam)
      .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    
    console.log('Team matches found:', teamMatches.length);
    
    // Calculate cumulative points and PPG after each match
    let points = 0;
    let matchesPlayed = 0;
    
    const result = teamMatches.map(match => {
      const { homeGoals, awayGoals } = parseScore(match.Score);
      let matchPoints = 0;
      
      // Calculate points earned in this match
      if (match.Home === selectedTeam) {
        // Team played at home
        if (homeGoals > awayGoals) matchPoints = 3; // Win
        else if (homeGoals === awayGoals) matchPoints = 1; // Draw
      } else {
        // Team played away
        if (awayGoals > homeGoals) matchPoints = 3; // Win
        else if (homeGoals === awayGoals) matchPoints = 1; // Draw
      }
      
      // Update running totals
      points += matchPoints;
      matchesPlayed += 1;
      
      // Return data point for this match
      return {
        date: match.Date,
        ppg: points / matchesPlayed,
        points: points,
        matches: matchesPlayed,
        opponent: match.Home === selectedTeam ? match.Away : match.Home,
        venue: match.Home === selectedTeam ? 'Home' : 'Away',
        result: matchPoints === 3 ? 'Win' : (matchPoints === 1 ? 'Draw' : 'Loss'),
        score: match.Score,
        team: selectedTeam
      };
    });
    
    console.log('PPG data points calculated:', result.length);
    
    // If there's a comparison team, calculate its data as well
    if (compareTeam) {
      console.log('Calculating PPG for comparison team:', compareTeam);
      
      // Get all matches for the comparison team in chronological order
      const compareMatches = data
        .filter(match => match.Home === compareTeam || match.Away === compareTeam)
        .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
      
      console.log('Comparison team matches found:', compareMatches.length);
      
      // Calculate cumulative points and PPG after each match
      let comparePoints = 0;
      let compareMatchesPlayed = 0;
      
      const compareResult = compareMatches.map(match => {
        const { homeGoals, awayGoals } = parseScore(match.Score);
        let matchPoints = 0;
        
        // Calculate points earned in this match
        if (match.Home === compareTeam) {
          // Team played at home
          if (homeGoals > awayGoals) matchPoints = 3; // Win
          else if (homeGoals === awayGoals) matchPoints = 1; // Draw
        } else {
          // Team played away
          if (awayGoals > homeGoals) matchPoints = 3; // Win
          else if (homeGoals === awayGoals) matchPoints = 1; // Draw
        }
        
        // Update running totals
        comparePoints += matchPoints;
        compareMatchesPlayed += 1;
        
        // Return data point for this match
        return {
          date: match.Date,
          ppg: comparePoints / compareMatchesPlayed,
          points: comparePoints,
          matches: compareMatchesPlayed,
          opponent: match.Home === compareTeam ? match.Away : match.Home,
          venue: match.Home === compareTeam ? 'Home' : 'Away',
          result: matchPoints === 3 ? 'Win' : (matchPoints === 1 ? 'Draw' : 'Loss'),
          score: match.Score,
          team: compareTeam
        };
      });
      
      console.log('Compare PPG data points calculated:', compareResult.length);
      
      // Return both datasets
      return {
        primaryTeam: result,
        compareTeam: compareResult
      };
    }
    
    // Return just the primary team data
    return {
      primaryTeam: result,
      compareTeam: []
    };
  }, [data, selectedTeam, compareTeam]);

  // Handle CSV file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError('No file selected');
      return;
    }
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) {
        setError('CSV file is empty or contains only headers');
        return;
      }

      const rows = lines.slice(1).map(line => {
        const [Wk, Day, Date, Time, Home, xG, Score, xG_away, Away, Attendance, Venue, Referee] = line.split(',');
        return { Wk: +Wk, Day, Date, Time, Home, xG: +xG, Score, xG_away: +xG_away, Away, Attendance, Venue, Referee };
      }).filter(row => row.Wk && row.Home && row.Away); // Filter out any incomplete rows
      
      setData(rows);
      
      // Set active week to the first week found in the data
      if (rows.length > 0) {
        const weeks = [...new Set(rows.map(r => r.Wk))].sort((a, b) => a - b);
        if (weeks.length > 0) {
          setActiveWeek(weeks[0]);
        }
      }
      
      setError('');
    };
    reader.readAsText(file);
  };

  // Format helper functions
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatNumber = (num: number): string => {
    return num.toFixed(1);
  };

  // Render the team goals chart
  useEffect(() => {
    // Safe access to Plotly
    const globalWindow = window as unknown as WindowWithPlotly;
    const plotly = globalWindow.Plotly;
    
    if (chartRef.current && teamGoals.length > 0 && plotly) {
      // Clear any existing chart
      chartRef.current.innerHTML = '';
      
      // Prepare the data for the chart
      const chartData = [{
        x: teamGoals.map((t) => t.team),
        y: teamGoals.map((t) => t.goalsPerMatch * (t.team === selectedTeam ? 1.05 : 1)), // Make selected team's bar slightly taller
        type: 'bar',
        marker: {
          color: teamGoals.map((t, i) => {
            if (t.team === selectedTeam) {
              return '#38003C'; // Premier League dark purple for selected team
            }
            return i % 2 === 0 ? '#FF2882' : '#00D3FF'; // Alternate colors for other teams
          }),
          line: {
            width: teamGoals.map((t) => t.team === selectedTeam ? 2 : 0),
            color: teamGoals.map((t) => t.team === selectedTeam ? '#FFFFFF' : 'transparent')
          }
        },
        text: teamGoals.map((t) => {
          const value = t.goalsPerMatch.toFixed(2);
          return t.team === selectedTeam ? `<b>${value}</b>` : value;
        }),
        textfont: {
          color: teamGoals.map((t) => t.team === selectedTeam ? '#FFFFFF' : 'rgba(255,255,255,0.9)')
        },
        textposition: 'auto',
        hovertemplate: '<b>%{x}</b><br>Goals per Match: %{y:.2f}<extra></extra>'
      }];
      
      // Chart layout options
      const layout = {
        title: '',
        font: { 
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#FFFFFF'
        },
        paper_bgcolor: '#1A1E2E',
        plot_bgcolor: '#1A1E2E',
        autosize: true,
        yaxis: {
          title: 'Goals per Match',
          gridcolor: 'transparent'
        },
        xaxis: {
          tickangle: -45,
          tickfont: {
            size: 10
          }
        },
        margin: { t: 40, r: 20, l: 60, b: 140 },
        bargap: 0.15
      };
      
      // Config options
      const config = {
        responsive: true,
        displayModeBar: false
      };
      
      // Render the chart
      plotly.newPlot(chartRef.current, chartData, layout, config);

      console.log('Bar chart rendered:', chartRef.current);
    } else {
      console.log('Bar chart not rendered:', {
        chartRefExists: !!chartRef.current,
        teamGoalsLength: teamGoals.length,
        plotlyExists: !!(window as unknown as WindowWithPlotly).Plotly
      });
    }
  }, [teamGoals, selectedTeam]);

  // Render the xG timeseries chart
  useEffect(() => {
    // Safe access to Plotly
    const globalWindow = window as unknown as WindowWithPlotly;
    const plotly = globalWindow.Plotly;
    
    if (timeseriesChartRef.current && timeseriesData.length > 0 && plotly) {
      // Clear any existing chart
      timeseriesChartRef.current.innerHTML = '';
      
      // Prepare the data for the chart - xG line
      const xGData: PlotlyDataSeries = {
        x: timeseriesData.map(t => t.date),
        y: timeseriesData.map(t => t.xG),
        mode: 'lines+markers',
        type: 'scatter',
        name: 'xG For',
        line: { 
          shape: 'spline',
          width: 3,
          color: '#00D3FF',
          smoothing: 1.3 
        },
        marker: {
          size: 8,
          color: '#00D3FF'
        },
        text: timeseriesData.map(t => `${t.team} vs ${t.opponent}`),
        hovertemplate: '<b>%{text}</b><br>Date: %{x}<br>xG For: %{y:.2f}<extra></extra>',
      };
      
      // xGA line
      const xGAData: PlotlyDataSeries = {
        x: timeseriesData.map(t => t.date),
        y: timeseriesData.map(t => t.xGA),
        mode: 'lines+markers',
        type: 'scatter',
        name: 'xG Against',
        line: { 
          shape: 'spline',
          width: 3,
          color: '#FF2882',
          smoothing: 1.3 
        },
        marker: {
          size: 8,
          color: '#FF2882'
        },
        text: timeseriesData.map(t => `${t.team} vs ${t.opponent}`),
        hovertemplate: '<b>%{text}</b><br>Date: %{x}<br>xG Against: %{y:.2f}<extra></extra>',
      };
      
      // Add a fill to zero for both lines for the shading effect
      xGData.fill = 'none';
      xGAData.fill = 'tonexty';
      
      // Add fill colors with appropriate opacity
      xGData.fillcolor = 'rgba(0, 211, 255, 0.2)'; // Blue with low opacity
      xGAData.fillcolor = 'rgba(255, 40, 130, 0.2)'; // Pink with low opacity
      
      // Create differential shading areas
      const positiveDiff: PlotlyDataSeries = {
        x: timeseriesData.map(t => t.date),
        y: timeseriesData.map(t => t.xG > t.xGA ? t.xG : t.xGA),
        mode: 'none',
        name: 'Positive Difference',
        fill: 'tonexty', 
        fillcolor: 'rgba(0, 211, 255, 0.2)',
        showlegend: false,
        hoverinfo: 'none',
        line: { width: 0 }
      };
      
      // Create a data series with area where xGA > xG (poor performance - pink)
      const negativeDiff: PlotlyDataSeries = {
        x: timeseriesData.map(t => t.date),
        y: timeseriesData.map(t => t.xGA > t.xG ? t.xGA : t.xG),
        mode: 'none',
        name: 'Negative Difference',
        fill: 'tonexty',
        fillcolor: 'rgba(255, 40, 130, 0.2)',
        showlegend: false,
        hoverinfo: 'none',
        line: { width: 0 }
      };
      
      // Add the data series in the correct order for proper fill behavior
      const chartData = [xGData, xGAData, positiveDiff, negativeDiff];
      
      // Chart layout options
      const layout = {
        title: '',
        font: { 
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#FFFFFF'
        },
        paper_bgcolor: '#1A1E2E',
        plot_bgcolor: '#1A1E2E',
        autosize: true,
        xaxis: {
          title: 'Match Date',
          gridcolor: 'transparent',
          tickformat: '%d %b',
          tickangle: -45
        },
        yaxis: {
          title: 'Expected Goals (xG)',
          gridcolor: 'transparent'
        },
        margin: { t: 60, r: 20, l: 60, b: 80 },
        legend: {
          orientation: 'h',
          xanchor: 'center',
          y: 1.02,
          x: 0.5,
          bgcolor: 'rgba(26, 30, 46, 0)',
          bordercolor: 'rgba(255,255,255,0)',
          borderwidth: 0
        },
        shapes: [
          // Add a reference line for xG = xGA
          {
            type: 'line',
            xref: 'paper',
            yref: 'paper',
            y0: 0.5,
            y1: 0.5,
            x0: 0,
            x1: 1,
            line: {
              color: 'rgba(255,255,255,0.3)',
              width: 1,
              dash: 'dot'
            },
            layer: 'below'
          }
        ]
      };
      
      // Config options
      const config = {
        responsive: true,
        displayModeBar: false
      };
      
      // Render the chart
      plotly.newPlot(timeseriesChartRef.current, chartData, layout, config);
    }
  }, [timeseriesData, selectedTeam]);

  // Render the match outcomes donut chart
  useEffect(() => {
    // Safe access to Plotly
    const globalWindow = window as unknown as WindowWithPlotly;
    const plotly = globalWindow.Plotly;
    
    if (donutChartRef.current && matchOutcomes.total > 0 && plotly) {
      // Clear any existing chart
      donutChartRef.current.innerHTML = '';
      
      // Prepare the data for the chart
      const chartData = [{
        values: matchOutcomes.values,
        labels: matchOutcomes.labels,
        type: 'pie',
        hole: 0.6,
        marker: {
          colors: ['#FF2882', '#38003C', '#00D3FF']
        },
        textinfo: 'label+percent',
        textposition: 'outside',
        automargin: true,
        hovertemplate: '%{label}: %{value} matches (%{percent})<extra></extra>',
      }];
      
      // Chart layout options
      const layout = {
        title: '',
        font: { 
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#FFFFFF'
        },
        paper_bgcolor: '#1A1E2E',
        plot_bgcolor: '#1A1E2E',
        autosize: true,
        showlegend: false,
        margin: { t: 20, r: 20, l: 20, b: 20 },
        annotations: [{
          font: {
            size: 20,
            color: '#FFFFFF'
          },
          showarrow: false,
          text: `${matchOutcomes.total}`,
          x: 0.5,
          y: 0.5
        }, {
          font: {
            size: 12,
            color: '#AAAAAA'
          },
          showarrow: false,
          text: 'matches',
          x: 0.5,
          y: 0.4
        }]
      };
      
      // Config options
      const config = {
        responsive: true,
        displayModeBar: false
      };
      
      // Render the chart
      plotly.newPlot(donutChartRef.current, chartData, layout, config);
    }
  }, [matchOutcomes]);

  // Render the xG vs xGA scatter plot
  useEffect(() => {
    // Safe access to Plotly
    const globalWindow = window as unknown as WindowWithPlotly;
    const plotly = globalWindow.Plotly;
    
    if (scatterChartRef.current && scatterData.length > 0 && plotly) {
      // Clear any existing chart
      scatterChartRef.current.innerHTML = '';
      
      // Prepare the data for the chart
      const chartData = [{
        x: scatterData.map((t) => t.xG),
        y: scatterData.map((t) => t.xGA),
        mode: 'markers+text',
        type: 'scatter',
        text: scatterData.map((t) => t.team),
        textposition: scatterData.length > 15 ? 'none' : 'top',
        textfont: {
          size: 9,
          color: scatterData.map((t) => t.team === selectedTeam ? '#FFFFFF' : 'rgba(255,255,255,0.7)')
        },
        marker: {
          size: scatterData.map((t) => {
            // Make selected team larger
            if (t.team === selectedTeam) {
              return Math.min(18, Math.max(12, t.matches * 0.7));
            }
            return Math.min(12, Math.max(6, t.matches * 0.5));
          }),
          color: scatterData.map((t) => {
            if (t.team === selectedTeam) {
              return '#38003C'; // Premier League dark purple for selected team
            }
            return t.goalDiff > 0 ? '#00D3FF' : 
                  t.goalDiff < 0 ? '#FF2882' : 
                  '#FFFFFF';
          }),
          opacity: scatterData.map((t) => t.team === selectedTeam ? 1 : (scatterData.length > 15 ? 0.6 : 0.8)),
          line: {
            color: scatterData.map((t) => t.team === selectedTeam ? '#FFFFFF' : 'rgba(255,255,255,0.3)'),
            width: scatterData.map((t) => t.team === selectedTeam ? 2 : 1)
          }
        },
        hovertemplate: '<b>%{text}</b><br>' +
                        'xG: %{x:.2f}<br>' +
                        'xGA: %{y:.2f}<br>' +
                        'Matches: %{customdata[0]}<br>' +
                        'Goal Diff/Match: %{customdata[1]:.2f}<extra></extra>',
        customdata: scatterData.map((t) => [t.matches, t.goalDiff])
      }];
      
      // Chart layout options
      const layout = {
        title: '',
        font: { 
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#FFFFFF'
        },
        paper_bgcolor: '#1A1E2E',
        plot_bgcolor: '#1A1E2E',
        autosize: true,
        xaxis: {
          title: 'Expected Goals For (xG)',
          gridcolor: 'transparent',
          zeroline: true,
          zerolinecolor: 'rgba(255,255,255,0.2)',
          dtick: 0.5
        },
        yaxis: {
          title: 'Expected Goals Against (xGA)',
          gridcolor: 'transparent',
          zeroline: true,
          zerolinecolor: 'rgba(255,255,255,0.2)',
          dtick: 0.5
        },
        shapes: [{
          type: 'line',
          x0: 0,
          y0: 0,
          x1: 3,
          y1: 3,
          line: {
            color: 'rgba(255,255,255,0.3)',
            width: 1,
            dash: 'dot'
          }
        }],
        annotations: [{
          x: 2.8,
          y: 2.9,
          text: 'xG = xGA',
          showarrow: false,
          font: {
            size: 10,
            color: 'rgba(255,255,255,0.6)'
          }
        }, {
          x: 0.15,
          y: 2.85,
          text: 'Poor Attack<br>Poor Defense',
          showarrow: false,
          align: 'left',
          font: {
            size: 10,
            color: 'rgba(255,255,255,0.6)'
          }
        }, {
          x: 2.85,
          y: 0.2,
          text: 'Good Attack<br>Good Defense',
          showarrow: false,
          align: 'right',
          font: {
            size: 10,
            color: 'rgba(255,255,255,0.6)'
          }
        }],
        margin: { t: 40, r: 20, l: 60, b: 60 },
        hovermode: 'closest'
      };
      
      // Config options
      const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
          format: 'png',
          filename: 'xg_vs_xga_analysis'
        },
        scrollZoom: true
      };
      
      // Render the chart
      plotly.newPlot(scatterChartRef.current, chartData, layout, config);
    }
  }, [scatterData, selectedTeam]);
  
  // Render the PPG timeseries chart
  useEffect(() => {
    // Safe access to Plotly
    const globalWindow = window as unknown as WindowWithPlotly;
    const plotly = globalWindow.Plotly;
    
    console.log('PPG chart render attempt:', {
      chartRefExists: !!ppgChartRef.current,
      hasPrimaryData: ppgTimeseriesData.primaryTeam.length > 0,
      hasCompareData: ppgTimeseriesData.compareTeam.length > 0,
      selectedTeam,
      compareTeam,
      plotlyExists: !!plotly
    });
    
    if (ppgChartRef.current && ppgTimeseriesData.primaryTeam.length > 0 && plotly) {
      try {
        // Clear any existing chart
        ppgChartRef.current.innerHTML = '';
        
        // Prepare the data for the primary team
        const primaryData: PlotlyDataSeries = {
          x: ppgTimeseriesData.primaryTeam.map(t => t.date),
          y: ppgTimeseriesData.primaryTeam.map(t => t.ppg),
          mode: 'lines+markers',
          type: 'scatter',
          name: selectedTeam,
          line: { 
            shape: 'spline',
            width: 3,
            color: '#38003C',
            smoothing: 1.3 
          },
          marker: {
            size: 10,
            color: ppgTimeseriesData.primaryTeam.map(t => 
              t.result === 'Win' ? '#00D3FF' : 
              t.result === 'Draw' ? '#FFFFFF' : 
              '#FF2882'
            )
          },
          text: ppgTimeseriesData.primaryTeam.map(t => `${t.result} vs ${t.opponent}`),
          hovertemplate: '<b>%{text}</b><br>' +
                        'Date: %{x}<br>' +
                        'PPG: %{y:.2f}<br>' +
                        'Total Points: %{customdata[0]}<br>' +
                        'Matches Played: %{customdata[1]}<extra></extra>',
          customdata: ppgTimeseriesData.primaryTeam.map(t => [t.points, t.matches])
        };
        
        // Create the chart data array, starting with primary team
        const chartData = [primaryData];
        
        // Add comparison team data if available
        if (ppgTimeseriesData.compareTeam.length > 0) {
          const compareData: PlotlyDataSeries = {
            x: ppgTimeseriesData.compareTeam.map(t => t.date),
            y: ppgTimeseriesData.compareTeam.map(t => t.ppg),
            mode: 'lines+markers',
            type: 'scatter',
            name: compareTeam,
            line: { 
              shape: 'spline',
              width: 3,
              color: '#FF2882',
              smoothing: 1.3 
            },
            marker: {
              size: 10,
              color: ppgTimeseriesData.compareTeam.map(t => 
                t.result === 'Win' ? '#00D3FF' : 
                t.result === 'Draw' ? '#FFFFFF' : 
                '#FF2882'
              )
            },
            text: ppgTimeseriesData.compareTeam.map(t => `${t.result} vs ${t.opponent}`),
            hovertemplate: '<b>%{text}</b><br>' +
                          'Date: %{x}<br>' +
                          'PPG: %{y:.2f}<br>' +
                          'Total Points: %{customdata[0]}<br>' +
                          'Matches Played: %{customdata[1]}<extra></extra>',
            customdata: ppgTimeseriesData.compareTeam.map(t => [t.points, t.matches])
          };
          
          chartData.push(compareData);
        }
        
        // Chart layout options
        const title = compareTeam 
          ? `Points Per Game: ${selectedTeam} vs ${compareTeam}` 
          : `${selectedTeam} Points Per Game Progression`;
          
        const layout = {
          title: title,
          font: { 
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#FFFFFF'
          },
          paper_bgcolor: '#1A1E2E',
          plot_bgcolor: '#1A1E2E',
          autosize: true,
          xaxis: {
            title: 'Match Date',
            gridcolor: 'transparent',
            tickformat: '%d %b',
            tickangle: -45
          },
          yaxis: {
            title: 'Points Per Game (PPG)',
            gridcolor: 'transparent',
            range: [0, 3.2]
          },
          margin: { t: 40, r: 20, l: 60, b: 80 },
          showlegend: !!compareTeam,
          legend: {
            x: 0.02,
            y: 0.98,
            bgcolor: 'rgba(26, 30, 46, 0.7)',
            bordercolor: 'rgba(255,255,255,0.2)',
            borderwidth: 1
          }
        };
        
        // Config options
        const config = {
          responsive: true,
          displayModeBar: false
        };
        
        // Render the chart
        plotly.newPlot(ppgChartRef.current, chartData, layout, config);

        console.log('PPG chart successfully rendered');
      } catch (error) {
        console.error('Error rendering PPG chart:', error);
      }
    } else {
      console.log('PPG chart not rendered:', {
        chartRefExists: !!ppgChartRef.current,
        hasPrimaryData: ppgTimeseriesData.primaryTeam?.length > 0,
        hasCompareData: ppgTimeseriesData.compareTeam?.length > 0,
        selectedTeam,
        compareTeam,
        plotlyExists: !!plotly
      });
    }
  }, [ppgTimeseriesData, selectedTeam, compareTeam]);

  // Scroll to active week tab when it changes
  useEffect(() => {
    if (weekTabsRef.current) {
      const activeTabIndex = availableWeeks.indexOf(activeWeek);
      if (activeTabIndex >= 0) {
        const activeTabElement = weekTabsRef.current.querySelector(`button:nth-child(${activeTabIndex + 1})`);
        if (activeTabElement) {
          weekTabsRef.current.scrollTo({
            left: (activeTabElement as HTMLElement).offsetLeft - weekTabsRef.current.offsetWidth / 2 + (activeTabElement as HTMLElement).offsetWidth / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [activeWeek, availableWeeks]);

  // Dashboard component structure and styling
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#120829] to-[#2D1F54] text-white p-2 sm:p-4 md:p-6 font-sans">
      <style>
        {`
          /* Hide scrollbar for Webkit browsers */
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for Firefox */
          .hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          /* Make charts responsive */
          .chart-container {
            position: relative;
            height: 50vh;
            max-height: 350px;
            width: 100%;
            min-height: 250px;
          }
          @media (max-width: 640px) {
            .chart-container {
              height: 40vh;
              min-height: 200px;
            }
          }
        `}
      </style>
      <div className="max-w-[1400px] mx-auto bg-[#191D30]/80 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl backdrop-blur-sm border border-[#38003c]/20">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF2882] to-[#E90052] bg-clip-text text-transparent mb-1 sm:mb-2 pb-1">
              Premier League Dashboard
            </h1>
            <p className="text-gray-400 text-sm sm:text-base mt-1">Season 2024/25 Insights</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
            {/* File Upload */}
            <div className="relative flex items-center w-full sm:w-auto">
              <label htmlFor="file-upload" className="cursor-pointer py-2 px-4 bg-[#38003C] hover:bg-[#38003C]/80 rounded-lg text-sm font-medium transition-colors flex items-center justify-center w-full sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload CSV
              </label>
              <input id="file-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" aria-describedby="file-error" />
            </div>
            
            {/* Team Selection */}
            <div className="relative w-full sm:w-auto">
              <select 
                id="team-select" 
                value={selectedTeam} 
                onChange={e => setSelectedTeam(e.target.value)} 
                className="appearance-none bg-[#2D1F54] border border-[#38003C] rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2882] w-full"
              >
                <option value="">All Teams</option>
                {teams.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <svg className="w-4 h-4 text-[#FF2882]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4 sm:mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p id="file-error" className="text-sm">{error}</p>
          </div>
        )}

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
          <div className="bg-gradient-to-br from-[#FF2882]/80 to-[#E90052] p-3 sm:p-5 rounded-xl shadow-lg">
            <div className="text-xs font-medium text-white/80 mb-1 sm:mb-2">Avg First Goal Time</div>
            <div className="flex items-end">
              <div className="text-2xl sm:text-4xl font-bold">30</div>
              <div className="text-base sm:text-xl ml-1 font-medium opacity-80">mins</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#00D3FF]/80 to-[#04BBE9] p-3 sm:p-5 rounded-xl shadow-lg">
            <div className="text-xs font-medium text-white/80 mb-1 sm:mb-2">Avg Goals Per Match</div>
            <div className="flex items-end">
              <div className="text-2xl sm:text-4xl font-bold">{formatNumber(data.reduce((sum, match) => {
                const { homeGoals, awayGoals } = parseScore(match.Score);
                return sum + homeGoals + awayGoals;
              }, 0) / data.length)}</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#38003C]/80 to-[#5F1C9B] p-3 sm:p-5 rounded-xl shadow-lg sm:col-span-2 md:col-span-1">
            <div className="text-xs font-medium text-white/80 mb-1 sm:mb-2">Total Matches Analysed</div>
            <div className="flex items-end">
              <div className="text-2xl sm:text-4xl font-bold">{data.length}</div>
            </div>
          </div>
        </div>

        {/* Charts - First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* xG Timeseries Chart */}
          <div className="bg-[#1A1E2E] rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-800">
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">
                {selectedTeam ? 
                  `${selectedTeam} - xG For vs Against Over Time` : 
                  'xG For vs Against Over Time'}
              </h2>
            </div>
            <div className="p-2 sm:p-4">
              <div 
                ref={timeseriesChartRef} 
                className="chart-container"
              ></div>
            </div>
          </div>

          {/* Team Performance Chart */}
          <div className="bg-[#1A1E2E] rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-800">
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">
                {selectedTeam ? 
                  `Goals per Match - ${selectedTeam} Highlighted` : 
                  'Teams by Goals per Match'}
              </h2>
            </div>
            <div className="p-2 sm:p-4">
              <div 
                ref={chartRef} 
                className="chart-container"
              ></div>
            </div>
          </div>
        </div>

        {/* Charts - Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Match Outcomes Donut Chart */}
          <div className="bg-[#1A1E2E] rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-800">
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">Match Outcomes</h2>
            </div>
            <div className="p-2 sm:p-4">
              <div 
                ref={donutChartRef} 
                className="chart-container"
              ></div>
            </div>
          </div>

          {/* xG vs xGA Scatter Plot */}
          <div className="bg-[#1A1E2E] rounded-xl shadow-lg overflow-hidden md:col-span-2">
            <div className="p-3 sm:p-4 border-b border-gray-800">
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">
                {selectedTeam ? 
                  `xG vs xGA - ${selectedTeam} Highlighted` : 
                  'xG vs xGA Analysis'}
              </h2>
            </div>
            <div className="p-2 sm:p-4">
              <div 
                ref={scatterChartRef} 
                className="chart-container"
              ></div>
            </div>
          </div>
        </div>

        {/* Charts - Third Row (PPG) - Only show when a team is selected */}
        {selectedTeam && (
          <div className="mb-4 sm:mb-6">
            <div className="bg-[#1A1E2E] rounded-xl shadow-lg overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white">Points Per Game Progression</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {compareTeam 
                      ? `Comparing ${selectedTeam} vs ${compareTeam}` 
                      : `Showing cumulative PPG for ${selectedTeam}`
                    }
                  </p>
                </div>
                <div className="relative w-full sm:w-auto">
                  <select 
                    id="compare-team-select" 
                    value={compareTeam} 
                    onChange={e => setCompareTeam(e.target.value)} 
                    className="appearance-none bg-[#2D1F54] border border-[#38003C] rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF2882] w-full"
                  >
                    <option value="">Compare with...</option>
                    {teams
                      .filter(team => team !== selectedTeam)
                      .map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))
                    }
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <svg className="w-4 h-4 text-[#FF2882]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-2 sm:p-4">
                <div 
                  ref={ppgChartRef} 
                  className="chart-container"
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Match Data Table */}
        <div className="bg-[#1A1E2E] rounded-xl shadow-lg overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">Match Data</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4 w-full sm:w-auto">
              {selectedTeam && weeksWithSelectedTeam.length > 0 && (
                <div className="flex w-full sm:w-auto gap-2">
                  <button 
                    className="text-xs bg-[#38003C] text-white px-2 py-1 rounded hover:bg-[#38003C]/80 flex-1 sm:flex-none"
                    onClick={() => {
                      const currentIndex = weeksWithSelectedTeam.indexOf(activeWeek);
                      const prevIndex = currentIndex <= 0 ? weeksWithSelectedTeam.length - 1 : currentIndex - 1;
                      setActiveWeek(weeksWithSelectedTeam[prevIndex]);
                    }}
                  >
                    <span className="hidden sm:inline">← Previous {selectedTeam} Match</span>
                    <span className="sm:hidden">← Prev</span>
                  </button>
                  <button 
                    className="text-xs bg-[#38003C] text-white px-2 py-1 rounded hover:bg-[#38003C]/80 flex-1 sm:flex-none"
                    onClick={() => {
                      const currentIndex = weeksWithSelectedTeam.indexOf(activeWeek);
                      const nextIndex = currentIndex >= weeksWithSelectedTeam.length - 1 ? 0 : currentIndex + 1;
                      setActiveWeek(weeksWithSelectedTeam[nextIndex]);
                    }}
                  >
                    <span className="hidden sm:inline">Next {selectedTeam} Match →</span>
                    <span className="sm:hidden">Next →</span>
                  </button>
                </div>
              )}
              <div className="text-xs text-gray-400 w-full text-center sm:text-right sm:w-auto">
                {data.filter(match => match.Wk === activeWeek).length > 0 
                  ? `Week ${activeWeek} (${data.filter(match => match.Wk === activeWeek).length} matches)` 
                  : `No matches for Week ${activeWeek}`}
              </div>
            </div>
          </div>
          
          {/* Week Tabs */}
          <div 
            ref={weekTabsRef}
            className="flex overflow-x-auto bg-[#1A1E2E] border-b border-[#38003C]/20 py-2 px-1 hide-scrollbar"
          >
            {availableWeeks.map(week => (
              <button
                key={week}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap ${
                  activeWeek === week 
                    ? 'text-white border-b-2 border-[#FF2882]' 
                    : 'text-gray-400 hover:text-white hover:bg-[#2A305E]'
                } ${
                  selectedTeam && weeksWithSelectedTeam.includes(week) 
                    ? 'relative after:content-[""] after:absolute after:top-1 after:right-1 after:w-2 after:h-2 after:bg-[#38003C] after:rounded-full'
                    : ''
                }`}
                onClick={() => setActiveWeek(week)}
              >
                <span className="sm:hidden">W{week}</span>
                <span className="hidden sm:inline">Week {week}</span>
              </button>
            ))}
            {availableWeeks.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-400">No match data available</div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-[#191D30] text-gray-400 uppercase text-xs">
                <tr>
                  <th className="p-2 sm:p-3">Date</th>
                  <th className="p-2 sm:p-3">Home</th>
                  <th className="p-2 sm:p-3">Score</th>
                  <th className="p-2 sm:p-3">Away</th>
                  <th className="p-2 sm:p-3">xG (H)</th>
                  <th className="p-2 sm:p-3">xG (A)</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .filter(match => match.Wk === activeWeek)
                  .map((match, idx) => (
                    <tr key={idx} className={`border-b border-gray-800/50 hover:bg-[#2A305E] ${
                      (match.Home === selectedTeam || match.Away === selectedTeam) 
                        ? 'bg-[#38003C]/20' 
                        : ''
                    }`}>
                      <td className="p-2 sm:p-3 whitespace-nowrap">{formatDate(match.Date)}</td>
                      <td className={`p-2 sm:p-3 font-medium ${match.Home === selectedTeam ? 'text-white' : ''}`}>{match.Home}</td>
                      <td className="p-2 sm:p-3 font-mono">{match.Score}</td>
                      <td className={`p-2 sm:p-3 font-medium ${match.Away === selectedTeam ? 'text-white' : ''}`}>{match.Away}</td>
                      <td className="p-2 sm:p-3">{match.xG.toFixed(1)}</td>
                      <td className="p-2 sm:p-3">{match.xG_away.toFixed(1)}</td>
                    </tr>
                  ))}
                {data.filter(match => match.Wk === activeWeek).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 sm:p-8 text-center text-gray-400">No matches found for Week {activeWeek}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-4 sm:mt-8 text-center text-xs text-gray-500">
          <p>Premier League Dashboard</p>
        </footer>
      </div>
    </div>
  );
};

export default App;