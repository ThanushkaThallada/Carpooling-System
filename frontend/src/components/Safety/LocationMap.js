import React, { Component } from 'react';
import './LocationMap.css';
import { 
    FaMapMarkedAlt, FaCarSide, FaShareAlt, FaCompass, 
    FaTachometerAlt, FaRoute, FaRoad, FaExternalLinkAlt, FaClock
} from 'react-icons/fa';

const ROUTE_DATA = {
    'hyderabad-bengaluru': {
        highway: 'NH44 4-Lane Expressway',
        distanceKm: 570,
        totalHours: 8,
        totalMins: 30,
        baseSpeed: 78,
        speedLimit: 100,
        waypoints: [
            { name: 'Hyderabad (Shamshabad)', km: 0, time: 'Start' },
            { name: 'Jadcherla Toll Plaza', km: 85, time: '+1h 10m' },
            { name: 'Kurnool Bypass', km: 215, time: '+3h 05m' },
            { name: 'Anantapur Food Hub', km: 360, time: '+5h 15m' },
            { name: 'Chikkaballapur', km: 510, time: '+7h 35m' },
            { name: 'Bengaluru (Hebbal)', km: 570, time: '+8h 30m' }
        ]
    },
    'bengaluru-hyderabad': {
        highway: 'NH44 4-Lane Expressway',
        distanceKm: 570,
        totalHours: 8,
        totalMins: 30,
        baseSpeed: 80,
        speedLimit: 100,
        waypoints: [
            { name: 'Bengaluru (Hebbal)', km: 0, time: 'Start' },
            { name: 'Chikkaballapur', km: 60, time: '+55m' },
            { name: 'Anantapur Hub', km: 210, time: '+3h 10m' },
            { name: 'Kurnool Toll', km: 355, time: '+5h 25m' },
            { name: 'Jadcherla', km: 485, time: '+7h 20m' },
            { name: 'Hyderabad (Shamshabad)', km: 570, time: '+8h 30m' }
        ]
    },
    'mumbai-pune': {
        highway: 'Mumbai-Pune Yashwantrao Chavan Expressway',
        distanceKm: 150,
        totalHours: 2,
        totalMins: 45,
        baseSpeed: 84,
        speedLimit: 100,
        waypoints: [
            { name: 'Mumbai (Kalamboli)', km: 0, time: 'Start' },
            { name: 'Khalapur Toll Plaza', km: 40, time: '+40m' },
            { name: 'Lonavala Ghat Section', km: 80, time: '+1h 25m' },
            { name: 'Talegaon Toll', km: 120, time: '+2h 10m' },
            { name: 'Pune (Wakad)', km: 150, time: '+2h 45m' }
        ]
    },
    'delhi-jaipur': {
        highway: 'NH48 Delhi-Jaipur Highway',
        distanceKm: 280,
        totalHours: 4,
        totalMins: 30,
        baseSpeed: 76,
        speedLimit: 90,
        waypoints: [
            { name: 'Delhi (Dhaula Kuan)', km: 0, time: 'Start' },
            { name: 'Gurugram Kherki Daula', km: 35, time: '+45m' },
            { name: 'Neemrana Mid-point', km: 130, time: '+2h 10m' },
            { name: 'Shahpura Toll', km: 210, time: '+3h 20m' },
            { name: 'Jaipur (Amer Road)', km: 280, time: '+4h 30m' }
        ]
    },
    'hyderabad-vijayawada': {
        highway: 'NH65 4-Lane Highway',
        distanceKm: 275,
        totalHours: 4,
        totalMins: 45,
        baseSpeed: 77,
        speedLimit: 100,
        waypoints: [
            { name: 'Hyderabad (LB Nagar)', km: 0, time: 'Start' },
            { name: 'Choutuppal Toll', km: 55, time: '+55m' },
            { name: 'Suryapet Food Plaza', km: 135, time: '+2h 15m' },
            { name: 'Nandigama', km: 220, time: '+3h 45m' },
            { name: 'Vijayawada (Benz Circle)', km: 275, time: '+4h 45m' }
        ]
    }
};

class LocationMap extends Component {
    state = {
        carProgress: 42, // percentage along route
        speed: 78,
        showWaypoints: false,
        sharedNotice: false
    };

    componentDidMount() {
        this.interval = setInterval(() => {
            this.setState(prevState => {
                const nextProgress = prevState.carProgress >= 92 ? 20 : prevState.carProgress + 1;
                const baseSpeed = this.getRouteInfo().baseSpeed;
                const speedVariation = baseSpeed + Math.floor(Math.sin(nextProgress * 0.5) * 6);
                return {
                    carProgress: nextProgress,
                    speed: speedVariation
                };
            });
        }, 2500);
    }

    componentWillUnmount() {
        if (this.interval) clearInterval(this.interval);
    }

    getRouteInfo = () => {
        const origin = (this.props.origin || 'Hyderabad').trim().toLowerCase();
        const destination = (this.props.destination || 'Bengaluru').trim().toLowerCase();
        const key = `${origin}-${destination}`;

        if (ROUTE_DATA[key]) {
            return ROUTE_DATA[key];
        }

        // Generic fallback calculation
        return {
            highway: 'National Highway Route',
            distanceKm: 320,
            totalHours: 5,
            totalMins: 15,
            baseSpeed: 75,
            speedLimit: 90,
            waypoints: [
                { name: this.props.origin || 'Origin', km: 0, time: 'Start' },
                { name: 'Midway Highway Stop', km: 160, time: '+2h 30m' },
                { name: this.props.destination || 'Destination', km: 320, time: '+5h 15m' }
            ]
        };
    };

    handleShareLocation = () => {
        const origin = this.props.origin || 'Hyderabad';
        const dest = this.props.destination || 'Bengaluru';
        const info = this.getRouteInfo();
        const shareText = `Live Carpool GPS: ${origin} to ${dest} via ${info.highway}. Speed: ${this.state.speed} km/h. Live Tracking Active.`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText);
        }
        this.setState({ sharedNotice: true });
        setTimeout(() => this.setState({ sharedNotice: false }), 3000);
    };

    openGoogleMaps = () => {
        const origin = this.props.origin || 'Hyderabad';
        const dest = this.props.destination || 'Bengaluru';
        const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
        window.open(url, '_blank');
    };

    toggleWaypoints = () => {
        this.setState(prevState => ({ showWaypoints: !prevState.showWaypoints }));
    };

    render() {
        const origin = this.props.origin || 'Hyderabad';
        const destination = this.props.destination || 'Bengaluru';
        const info = this.getRouteInfo();

        const remainingKm = Math.max(5, Math.round(info.distanceKm * (1 - this.state.carProgress / 100)));
        const totalMinutes = info.totalHours * 60 + info.totalMins;
        const remainingMinutes = Math.max(8, Math.round(totalMinutes * (1 - this.state.carProgress / 100)));
        const remH = Math.floor(remainingMinutes / 60);
        const remM = remainingMinutes % 60;
        const etaText = remH > 0 ? `${remH} hr ${remM} min` : `${remM} min`;

        // SVG curve coordinates
        const startX = 60;
        const startY = 145;
        const endX = 440;
        const endY = 45;
        const progressFraction = this.state.carProgress / 100;
        const currentCarX = startX + (endX - startX) * progressFraction;
        const currentCarY = startY + (endY - startY) * progressFraction - Math.sin(progressFraction * Math.PI) * 45;

        return (
            <div className="LocationMap-container">
                {/* Google Maps Style Header */}
                <div className="LocationMap-header">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ 
                                background: '#10b981', 
                                color: '#ffffff', 
                                fontSize: '0.72rem', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontWeight: 'bold' 
                            }}>
                                FASTEST ROUTE
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                via {info.highway}
                            </span>
                        </div>
                        <h3 className="LocationMap-title">
                            <FaMapMarkedAlt style={{ color: '#38bdf8' }} /> {origin} ➔ {destination}
                        </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="LocationMap-status-badge">
                            <div className="LocationMap-status-pulse"></div>
                            GPS LIVE EN ROUTE
                        </div>
                        <button
                            type="button"
                            onClick={this.openGoogleMaps}
                            className="LocationMap-google-btn"
                            title="Open directions in Google Maps"
                        >
                            <FaExternalLinkAlt /> Open in Google Maps
                        </button>
                    </div>
                </div>

                {/* Google Maps Prominent ETA & Speed Banner */}
                <div style={{
                    background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '16px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid #10b981',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 'bold' }}>EST. TRAVEL TIME</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#10b981' }}>
                                {info.totalHours} hr {info.totalMins} min
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Remaining Journey</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc' }}>
                                ⏳ {etaText} <span style={{ color: '#38bdf8', fontSize: '1rem', fontWeight: '600' }}>({remainingKm} km left)</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '2px' }}>
                                🟢 Light to Moderate Traffic on Highway
                            </div>
                        </div>
                    </div>

                    {/* Speedometer Widget */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        padding: '10px 18px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            border: '3px solid #38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#38bdf8',
                            fontSize: '1.3rem',
                            boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
                        }}>
                            <FaTachometerAlt />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>CRUISING SPEED</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#38bdf8', lineHeight: '1.1' }}>
                                {this.state.speed} <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>km/h</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#fbbf24' }}>
                                Limit: {info.speedLimit} km/h
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Navigation Map Canvas */}
                <div className="LocationMap-canvas-wrapper">
                    <div className="LocationMap-grid-bg"></div>

                    {/* SVG Route Line */}
                    <svg className="LocationMap-route-svg" viewBox="0 0 500 200">
                        {/* Route glow */}
                        <path
                            d={`M ${startX} ${startY} Q 250 25 ${endX} ${endY}`}
                            fill="none"
                            stroke="rgba(56, 189, 248, 0.25)"
                            strokeWidth="12"
                        />
                        {/* Base route */}
                        <path
                            d={`M ${startX} ${startY} Q 250 25 ${endX} ${endY}`}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="5"
                        />
                        {/* Completed portion */}
                        <path
                            d={`M ${startX} ${startY} Q 250 25 ${endX} ${endY}`}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="4"
                            strokeDasharray="6,4"
                        />
                    </svg>

                    {/* Origin Pin */}
                    <div className="LocationMap-marker-origin">
                        <div className="LocationMap-pin LocationMap-pin-origin">A</div>
                        <div className="LocationMap-marker-label">
                            <strong>{origin}</strong> (0 km)
                        </div>
                    </div>

                    {/* Destination Pin */}
                    <div className="LocationMap-marker-dest">
                        <div className="LocationMap-pin LocationMap-pin-dest">B</div>
                        <div className="LocationMap-marker-label">
                            <strong>{destination}</strong> ({info.distanceKm} km)
                        </div>
                    </div>

                    {/* Live Moving Car Marker */}
                    <div
                        className="LocationMap-car-marker"
                        style={{
                            left: `${(currentCarX / 500) * 100}%`,
                            top: `${(currentCarY / 200) * 100}%`
                        }}
                    >
                        <div className="LocationMap-car-bubble">
                            <FaCarSide /> Live GPS: {this.state.speed} km/h
                        </div>
                    </div>
                </div>

                {/* Telemetry Bar */}
                <div className="LocationMap-telemetry-bar">
                    <div className="LocationMap-telemetry-card">
                        <div className="LocationMap-telemetry-label">Vehicle Speed</div>
                        <div className="LocationMap-telemetry-value" style={{ color: '#38bdf8' }}>
                            {this.state.speed} km/h
                        </div>
                    </div>
                    <div className="LocationMap-telemetry-card">
                        <div className="LocationMap-telemetry-label">Total Distance</div>
                        <div className="LocationMap-telemetry-value">
                            {info.distanceKm} km
                        </div>
                    </div>
                    <div className="LocationMap-telemetry-card">
                        <div className="LocationMap-telemetry-label">Remaining Dist.</div>
                        <div className="LocationMap-telemetry-value" style={{ color: '#fbbf24' }}>
                            {remainingKm} km
                        </div>
                    </div>
                    <div className="LocationMap-telemetry-card">
                        <div className="LocationMap-telemetry-label">Expected Arrival</div>
                        <div className="LocationMap-telemetry-value" style={{ color: '#10b981' }}>
                            {etaText}
                        </div>
                    </div>
                </div>

                {/* Waypoints Drawer (Google Maps Turn-by-Turn Milestones) */}
                {this.state.showWaypoints && (
                    <div style={{
                        marginTop: '16px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(56, 189, 248, 0.2)'
                    }}>
                        <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '12px', fontSize: '0.95rem' }}>
                            📍 Route Milestones & Highway Tolls ({info.highway}):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                            {info.waypoints.map((wp, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    borderLeft: '3px solid #38bdf8',
                                    fontSize: '0.85rem'
                                }}>
                                    <div style={{ fontWeight: 'bold', color: '#ffffff' }}>{wp.name}</div>
                                    <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                        <span>{wp.km} km</span>
                                        <span style={{ color: '#38bdf8' }}>{wp.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="LocationMap-actions">
                    <button type="button" className="LocationMap-btn" onClick={this.toggleWaypoints}>
                        <FaCompass /> {this.state.showWaypoints ? 'Hide Waypoints' : 'View Highway Waypoints & Tolls'}
                    </button>
                    <button type="button" className="LocationMap-btn" onClick={this.handleShareLocation}>
                        <FaShareAlt /> {this.state.sharedNotice ? '✓ GPS Link Copied!' : 'Share Live GPS Tracking'}
                    </button>
                    <button type="button" className="LocationMap-btn" onClick={this.openGoogleMaps} style={{ borderColor: '#10b981', color: '#10b981' }}>
                        <FaRoute /> Google Maps Navigation
                    </button>
                </div>
            </div>
        );
    }
}

export default LocationMap;
