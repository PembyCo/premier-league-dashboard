import React, { useState, useEffect, useMemo } from 'react';

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

  // Compute unique teams for dropdown
  const teams = useMemo(() => [...new Set(data.map(d => d.Home).concat(data.map(d => d.Away)))], [data]);

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
      });
      setData(rows);
      setError('');
    };
    reader.readAsText(file);
  };

  // xG Timeseries Data
  const timeseriesData = useMemo(() => {
    const filtered = selectedTeam ? data.filter(d => d.Home === selectedTeam || d.Away === selectedTeam) : data;
    return filtered.map(d => ({
      date: d.Date,
      xG: d.Home === selectedTeam ? d.xG : d.xG_away,
      team: d.Home === selectedTeam ? d.Home : d.Away,
    }));
  }, [data, selectedTeam]);

  // xG vs xGA Scatter Data
  const scatterData = useMemo(() => {
    return data.map(d => ({ home: d.Home, away: d.Away, xG: d.xG, xGA: d.xG_away }));
  }, [data]);

  // Plotly configs
  useEffect(() => {
    if (timeseriesData.length && (window as any).Plotly) {
      (window as any).Plotly.newPlot('xg-timeseries', {
        data: [{
          x: timeseriesData.map(t => t.date),
          y: timeseriesData.map(t => t.xG),
          mode: 'lines+markers',
          line: { color: '#FF0088' },
          name: 'xG',
        }],
        layout: { title: 'xG Over Time', paper_bg: '#1f2937', plot_bg: '#1f2937', font: { color: '#fff' }, xaxis: { title: 'Date' }, yaxis: { title: 'xG' } },
      });
    }
    if (scatterData.length && (window as any).Plotly) {
      (window as any).Plotly.newPlot('xg-scatter', {
        data: [{
          x: scatterData.map(s => s.xG),
          y: scatterData.map(s => s.xGA),
          mode: 'markers',
          marker: { color: '#38003C', size: 8 },
          text: scatterData.map(s => `${s.home} vs ${s.away}`),
          name: 'Matches',
        }],
        layout: { title: 'xG vs xGA', paper_bg: '#1f2937', plot_bg: '#1f2937', font: { color: '#fff' }, xaxis: { title: 'xG' }, yaxis: { title: 'xGA' } },
      });
    }
  }, [timeseriesData, scatterData]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#FF0088' }}>Premier League Dashboard</h1>
        <p className="text-gray-400">Season 2024/25 Insights</p>
      </header>

      {/* File Upload */}
      <div className="mb-6">
        <label htmlFor="file-upload" className="block text-sm font-medium mb-2">Upload Match Data (CSV)</label>
        <input id="file-upload" type="file" accept=".csv" onChange={handleFileUpload} className="file:bg-purple-800 file:text-white file:border-0 file:px-4 file:py-2 rounded-md bg-gray-800 text-sm" aria-describedby="file-error" />
        {error && <p id="file-error" className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Team Filter */}
      <div className="mb-6">
        <label htmlFor="team-select" className="block text-sm font-medium mb-2">Filter by Team</label>
        <select id="team-select" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="bg-gray-800 rounded-md p-2 w-full md:w-64 text-white">
          <option value="">All Teams</option>
          {teams.map(team => <option key={team} value={team}>{team}</option>)}
        </select>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#FF0088' }}>xG Over Time</h2>
          <div id="xg-timeseries" className="w-full h-96" role="img" aria-label="xG Timeseries Chart"></div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#FF0088' }}>xG vs xGA</h2>
          <div id="xg-scatter" className="w-full h-96" role="img" aria-label="xG vs xGA Scatter Plot"></div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-md md:col-span-2">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#FF0088' }}>Season Stats</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-2">Week</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Home</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Away</th>
                  <th className="p-2">xG (H)</th>
                  <th className="p-2">xG (A)</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((match, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="p-2">{match.Wk}</td>
                    <td className="p-2">{match.Date}</td>
                    <td className="p-2">{match.Home}</td>
                    <td className="p-2">{match.Score}</td>
                    <td className="p-2">{match.Away}</td>
                    <td className="p-2">{match.xG}</td>
                    <td className="p-2">{match.xG_away}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;