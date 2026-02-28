import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import './LiveMatchTimeControl.css'

/**
 * Professional Football Match Clock Control
 * Features:
 * - Manual mode: User-set minute and stoppage time
 * - Auto-detect mode: Real-time calculation from kickoff UTC
 * - Professional match phases: 1st Half, 2nd Half, Halftime, Full Time
 * - Pause/resume for official delays
 */
const LiveMatchTimeControl = ({ fixture, onUpdate, isAdmin = false }) => {
  // UI State
  const [mode, setMode] = useState(fixture?.liveMatchTime?.mode || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  
  // Manual mode state
  const [manualMinute, setManualMinute] = useState(fixture?.liveMatchTime?.currentMinute || 0)
  const [manualStoppage, setManualStoppage] = useState(fixture?.liveMatchTime?.stoppageTime || 0)
  
  // Auto mode state
  const [matchState, setMatchState] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const updateIntervalRef = useRef(null)
  
  // Fetch auto-detect state
  const fetchAutoDetectState = useCallback(async () => {
    try {
      const response = await axios.get(`/fixtures/${fixture._id}/auto-detect-state`)
      setMatchState(response.data.matchState)
      setError(null)
    } catch (err) {
      console.error('Error fetching auto-detect state:', err)
      setError('Failed to fetch match state')
    }
  }, [fixture._id])
  
  // Setup auto-update for auto mode
  useEffect(() => {
    if (mode === 'auto') {
      // Initial fetch
      fetchAutoDetectState()
      
      // Update every second
      updateIntervalRef.current = setInterval(() => {
        fetchAutoDetectState()
      }, 1000)
      
      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current)
        }
      }
    }
  }, [mode, fixture._id, fetchAutoDetectState])
  
  // Switch to manual mode
  const handleSwitchToManual = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`/fixtures/${fixture._id}/live-time`, {
        mode: 'manual',
        currentMinute: manualMinute,
        stoppageTime: manualStoppage
      })
      
      setMode('manual')
      setSuccessMessage('Switched to Manual Mode')
      onUpdate && onUpdate(response.data.fixture)
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch to manual mode')
    } finally {
      setLoading(false)
    }
  }
  
  // Switch to auto-detect mode
  const handleStartAutoDetect = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`/fixtures/${fixture._id}/auto-detect/start`)
      
      setMode('auto')
      setMatchState(response.data.matchState)
      setIsPaused(false)
      setSuccessMessage('Auto-Detect Mode Started')
      onUpdate && onUpdate(response.data.fixture)
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start auto-detect')
    } finally {
      setLoading(false)
    }
  }
  
  // Pause match (auto mode)
  const handlePauseMatch = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`/fixtures/${fixture._id}/auto-detect/pause`)
      
      setIsPaused(true)
      setSuccessMessage('Match Paused')
      onUpdate && onUpdate(response.data.fixture)
      
      setTimeout(() => setSuccessMessage(null), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to pause match')
    } finally {
      setLoading(false)
    }
  }
  
  // Resume match (auto mode)
  const handleResumeMatch = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`/fixtures/${fixture._id}/auto-detect/resume`)
      
      setIsPaused(false)
      setSuccessMessage('Match Resumed')
      onUpdate && onUpdate(response.data.fixture)
      
      setTimeout(() => setSuccessMessage(null), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resume match')
    } finally {
      setLoading(false)
    }
  }
  
  // Advance to next half
  const handleNextHalf = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`/fixtures/${fixture._id}/auto-detect/next-half`)
      
      setSuccessMessage('Advancing to Next Half')
      onUpdate && onUpdate(response.data.fixture)
      
      // Refresh state
      await fetchAutoDetectState()
      setTimeout(() => setSuccessMessage(null), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to advance to next half')
    } finally {
      setLoading(false)
    }
  }
  
  // Update manual time
  const handleUpdateManualTime = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`/fixtures/${fixture._id}/live-time`, {
        mode: 'manual',
        currentMinute: manualMinute,
        stoppageTime: manualStoppage
      })
      
      setSuccessMessage('Match Time Updated')
      onUpdate && onUpdate(response.data.fixture)
      
      setTimeout(() => setSuccessMessage(null), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update match time')
    } finally {
      setLoading(false)
    }
  }
  
  // If not admin, show read-only display
  if (!isAdmin) {
    if (!mode) {
      return (
        <div className="live-match-time-display">
          <div className="no-control">Match clock not started</div>
        </div>
      )
    }
    
    if (mode === 'manual') {
      return (
        <div className="live-match-time-display manual-display">
          <div className="time-display">
            <span className="minute">{manualMinute}'</span>
            {manualStoppage > 0 && <span className="stoppage">+{manualStoppage}</span>}
          </div>
        </div>
      )
    }
    
    // Auto mode display
    if (!matchState) {
      return <div className="live-match-time-display loading">Loading...</div>
    }
    
    return (
      <div className="live-match-time-display auto-display">
        <div className="match-info">
          <div className="status">{matchState.matchStatus}</div>
          <div className="phase">{matchState.matchPhase}</div>
        </div>
        <div className="time-display">
          <span className="minute">{matchState.displayMinute}</span>
          {matchState.displaySecond > 0 && (
            <span className="second">{String(matchState.displaySecond).padStart(2, '0')}"</span>
          )}
        </div>
      </div>
    )
  }
  
  // Admin control UI
  return (
    <div className="live-match-time-control">
      <div className="control-header">
        <h3>Live Match Time Control</h3>
        <div className="fixture-info">
          <span>{fixture.homeTeam} vs {fixture.awayTeam}</span>
          <span className="time-utc">Kickoff: {new Date(fixture.matchTimeUTC).toUTCString()}</span>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {/* Mode Selection */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={handleSwitchToManual}
          disabled={loading || mode === 'manual'}
        >
          🎮 Manual Control
        </button>
        <button
          className={`mode-btn ${mode === 'auto' ? 'active' : ''}`}
          onClick={handleStartAutoDetect}
          disabled={loading || mode === 'auto'}
        >
          ⏱️ Auto-Detect
        </button>
      </div>
      
      {/* Manual Mode Controls */}
      {mode === 'manual' && (
        <div className="manual-controls">
          <div className="control-group">
            <label>Current Minute (0-90)</label>
            <div className="input-group">
              <input
                type="number"
                min="0"
                max="90"
                value={manualMinute}
                onChange={(e) => setManualMinute(Math.max(0, Math.min(90, parseInt(e.target.value) || 0)))}
                disabled={loading}
              />
              <span className="unit">minute</span>
            </div>
          </div>
          
          <div className="control-group">
            <label>Stoppage Time (Minutes)</label>
            <div className="input-group">
              <input
                type="number"
                min="0"
                max="10"
                value={manualStoppage}
                onChange={(e) => setManualStoppage(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                disabled={loading}
              />
              <span className="unit">minutes</span>
            </div>
          </div>
          
          <div className="time-preview">
            <span className="label">Display:</span>
            <span className="preview">
              {manualMinute}'{manualStoppage > 0 ? `+${manualStoppage}` : ''}
            </span>
          </div>
          
          <button
            className="update-btn"
            onClick={handleUpdateManualTime}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Time'}
          </button>
        </div>
      )}
      
      {/* Auto-Detect Mode Controls */}
      {mode === 'auto' && matchState && (
        <div className="auto-controls">
          <div className="match-state-display">
            <div className="state-card">
              <div className="label">Status</div>
              <div className="value status">{matchState.matchStatus}</div>
            </div>
            
            <div className="state-card">
              <div className="label">Match Phase</div>
              <div className="value phase">{matchState.matchPhase}</div>
            </div>
            
            <div className="state-card">
              <div className="label">Current Minute</div>
              <div className="value minute">{matchState.currentMinute}'</div>
            </div>
            
            {matchState.stoppageTime > 0 && (
              <div className="state-card">
                <div className="label">Stoppage Time</div>
                <div className="value stoppage">+{matchState.stoppageTime}</div>
              </div>
            )}
          </div>
          
          <div className="time-display-large">
            <span className="minute">{matchState.displayMinute}</span>
            {matchState.displaySecond > 0 && (
              <span className="second">{String(matchState.displaySecond).padStart(2, '0')}"</span>
            )}
          </div>
          
          <div className="pause-controls">
            {!isPaused ? (
              <button
                className="pause-btn"
                onClick={handlePauseMatch}
                disabled={loading || matchState.state === 'HALFTIME' || matchState.state === 'NOT_STARTED'}
              >
                ⏸️ Pause (VAR/Injury/Delay)
              </button>
            ) : (
              <button
                className="resume-btn"
                onClick={handleResumeMatch}
                disabled={loading}
              >
                ▶️ Resume Match
              </button>
            )}
            
            {matchState.state === 'FIRST_HALF_STOPPAGE' && (
              <button
                className="next-half-btn"
                onClick={handleNextHalf}
                disabled={loading}
              >
                👉 Go to 2nd Half
              </button>
            )}
          </div>
          
          <div className="pause-info">
            <p>⏱️ 1st Half Paused: {Math.floor(matchState.totalFirstHalfStoppage / 60)}m {matchState.totalFirstHalfStoppage % 60}s</p>
            <p>⏱️ 2nd Half Paused: {Math.floor(matchState.totalSecondHalfStoppage / 60)}m {matchState.totalSecondHalfStoppage % 60}s</p>
          </div>
        </div>
      )}
      
      {mode === 'auto' && !matchState && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Initializing match clock...</p>
        </div>
      )}
    </div>
  )
}

export default LiveMatchTimeControl
