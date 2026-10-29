import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import './Home.css';
import axios from '../../axios-baseUrl';
import withErrorHandler from "../../hoc/withErrorHandler/withErrorHandler";
import { 
    FaCar, 
    FaSearch, 
    FaPlusCircle, 
    FaShieldAlt, 
    FaMapMarkedAlt, 
    FaCalculator, 
    FaLeaf, 
    FaGasPump, 
    FaUserCheck, 
    FaExclamationTriangle 
} from 'react-icons/fa';

class Home extends Component {
    state = {
        calcDistance: 250, // km
        calcPassengers: 3,  // people sharing
        fuelPricePerLiter: 102.50, // INR per liter in India
        consumptionPer100km: 6.5, // Liters
        pendingRequests: []
    };

    componentDidMount() {
        this.checkPendingRequests();
        window.addEventListener('carpool_driver_notifications_updated', this.checkPendingRequests);
        window.addEventListener('storage', this.checkPendingRequests);
    }

    componentWillUnmount() {
        window.removeEventListener('carpool_driver_notifications_updated', this.checkPendingRequests);
        window.removeEventListener('storage', this.checkPendingRequests);
    }

    checkPendingRequests = () => {
        try {
            const currentUsername = this.props.userId || '';
            const savedRole = (currentUsername && localStorage.getItem('user_role_' + currentUsername.toLowerCase())) || this.props.userRole;
            const isDriver = (currentUsername && currentUsername.toLowerCase() === 'driver') || savedRole === 'DRIVER';
            const raw = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');

            if (!currentUsername) {
                this.setState({ pendingRequests: [] });
                return;
            }

            let pending = [];
            if (isDriver) {
                pending = raw.filter(n => n && n.driverUsername && n.driverUsername.toLowerCase() === currentUsername.toLowerCase() && n.status === 'PENDING_DRIVER_CONFIRMATION');
            } else {
                pending = raw.filter(n => n && n.passengerUsername && n.passengerUsername.toLowerCase() === currentUsername.toLowerCase() && (n.type === 'MATCHING_RIDE_ALERT' || n.status === 'MATCHING_AVAILABLE'));
            }
            this.setState({ pendingRequests: pending });
        } catch (e) {}
    };

    handleOpenNotifications = () => {
        window.dispatchEvent(new CustomEvent('carpool_open_notifications'));
    };

    handleDistanceChange = (e) => {
        this.setState({ calcDistance: Number(e.target.value) });
    };

    handlePassengersChange = (e) => {
        this.setState({ calcPassengers: Number(e.target.value) });
    };

    render() {
        const { calcDistance, calcPassengers, fuelPricePerLiter, consumptionPer100km, pendingRequests } = this.state;

        // Calculations
        const totalFuelLiters = (calcDistance / 100) * consumptionPer100km;
        const totalSoloCost = Math.round(totalFuelLiters * fuelPricePerLiter);
        const costPerPerson = Math.round(totalSoloCost / (calcPassengers + 1));
        const totalSavings = totalSoloCost - costPerPerson;
        const co2SavedKg = Math.round(calcDistance * 0.12 * calcPassengers);

        const savedRole = (this.props.userId && localStorage.getItem('user_role_' + this.props.userId.toLowerCase())) || localStorage.getItem('userRole');
        const isAdmin = this.props.isAdmin || (this.props.userId && this.props.userId.toLowerCase() === 'admin') || savedRole === 'ADMIN';
        const isDriver = !isAdmin && ((this.props.userId && this.props.userId.toLowerCase() === 'driver') || savedRole === 'DRIVER');
        const isPassenger = !isAdmin && !isDriver;
        const displayName = this.props.userId ? this.props.userId.toUpperCase() : 'TRAVELER';

        let roleLabel = 'PASSENGER';
        if (isAdmin) {
            roleLabel = 'ADMIN';
        } else if (isDriver) {
            roleLabel = 'DRIVER';
        }

        return (
            <div className="Home-wrapper">
                {/* Notification Action Banner for Driver and Passenger */}
                {pendingRequests.length > 0 && (
                    <div 
                        className="Home-driver-alert-banner"
                        onClick={this.handleOpenNotifications}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="Home-driver-alert-left">
                            <span className="Home-driver-alert-icon">🔔</span>
                            <div>
                                <div className="Home-driver-alert-title">
                                    {isDriver 
                                        ? `${pendingRequests.length} Passenger Ride Request${pendingRequests.length > 1 ? 's' : ''} Awaiting Your Decision!`
                                        : `🚗 ${pendingRequests.length} Matching Ride${pendingRequests.length > 1 ? 's' : ''} Available for Your Route!`}
                                </div>
                                <div className="Home-driver-alert-desc">
                                    {isDriver
                                        ? <span>Passengers have requested seats on your trips. As the driver, you can <strong>Confirm</strong> or <strong>Cancel / Decline</strong> each ride.</span>
                                        : <span>Verified drivers are offering rides matching your starting point and destination. You can <strong>Join This Ride</strong> or choose other rides!</span>}
                                </div>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            className="Home-driver-alert-action-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                this.handleOpenNotifications();
                            }}
                        >
                            {isDriver ? 'Review & Decide ➔' : 'Join or Choose Rides ➔'}
                        </button>
                    </div>
                )}

                {/* Hero Section */}
                <div className="Home-hero-card">
                    {this.props.isAuthenticated && (
                        <div className="Home-badge-user">
                            <FaUserCheck /> Logged in as: {displayName} ( {roleLabel} )
                        </div>
                    )}
                    <h1 className="Home-hero-title">
                        India's Smarter & Safer <span>Carpooling</span> Network
                    </h1>
                    <p className="Home-hero-subtitle">
                        Share intercity rides across Indian National Highways, cut travel expenses by up to 75%, and travel safely with live GPS tracking, HSRP verification, and instant UPI payments.
                    </p>

                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {this.props.isAuthenticated ? (
                            <>
                                {(isPassenger || this.props.isAdmin) && (
                                    <Link to="/searchTrips" style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                        color: '#ffffff',
                                        padding: '12px 24px',
                                        borderRadius: '30px',
                                        fontWeight: '700',
                                        textDecoration: 'none',
                                        boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
                                    }}>
                                        <FaSearch /> Search Available Rides
                                    </Link>
                                )}

                                {(isDriver || this.props.isAdmin) && (
                                    <Link to="/createTrip" style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: '#ffffff',
                                        padding: '12px 24px',
                                        borderRadius: '30px',
                                        fontWeight: '700',
                                        textDecoration: 'none',
                                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
                                    }}>
                                        <FaPlusCircle /> Offer a Ride as Driver
                                    </Link>
                                )}
                            </>
                        ) : (
                            <Link to="/auth" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                color: '#ffffff',
                                padding: '12px 28px',
                                borderRadius: '30px',
                                fontWeight: '700',
                                textDecoration: 'none'
                            }}>
                                Sign In / Get Started
                            </Link>
                        )}
                    </div>
                </div>

                {/* Popular Routes Section (All India) */}
                <h2 style={{ fontSize: '1.4rem', color: '#38bdf8', marginBottom: '14px' }}>
                    🇮🇳 Popular All-India Express Corridors
                </h2>
                <div className="Home-routes-grid">
                    <div className="Home-route-card">
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#ffffff' }}>Hyderabad ➔ Bengaluru</div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Daily • NH 44 • ~8h 30m • 570 km</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#38bdf8' }}>₹750</div>
                            <Link to="/searchTrips" style={{ fontSize: '0.8rem', color: '#fbbf24', textDecoration: 'underline' }}>
                                Find Rides
                            </Link>
                        </div>
                    </div>

                    <div className="Home-route-card">
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#ffffff' }}>Mumbai ➔ Pune</div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Expressway • ~3 hrs • 150 km</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#38bdf8' }}>₹350</div>
                            <Link to="/searchTrips" style={{ fontSize: '0.8rem', color: '#fbbf24', textDecoration: 'underline' }}>
                                Find Rides
                            </Link>
                        </div>
                    </div>

                    <div className="Home-route-card">
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#ffffff' }}>Delhi ➔ Jaipur</div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>NH 48 • ~4h 45m • 280 km</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#38bdf8' }}>₹450</div>
                            <Link to="/searchTrips" style={{ fontSize: '0.8rem', color: '#fbbf24', textDecoration: 'underline' }}>
                                Find Rides
                            </Link>
                        </div>
                    </div>

                    <div className="Home-route-card">
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#ffffff' }}>Chennai ➔ Bengaluru</div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>NH 48 • ~5h 30m • 350 km</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#38bdf8' }}>₹550</div>
                            <Link to="/searchTrips" style={{ fontSize: '0.8rem', color: '#fbbf24', textDecoration: 'underline' }}>
                                Find Rides
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Interactive Cost & Carbon Calculator */}
                <div className="Home-calculator-box">
                    <h3 style={{ margin: '0 0 16px 0', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaCalculator /> Interactive Ride Cost & Fuel Savings Calculator
                    </h3>
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: 0 }}>
                        Calculate how much money you save on fuel by carpooling with passengers:
                    </p>

                    <div className="Home-slider-row">
                        <div className="Home-slider-label">
                            <span><FaCar /> Trip Distance:</span>
                            <span style={{ color: '#38bdf8', fontWeight: '800' }}>{calcDistance} km</span>
                        </div>
                        <input
                            type="range"
                            min="30"
                            max="500"
                            step="10"
                            value={calcDistance}
                            onChange={this.handleDistanceChange}
                            className="Home-slider-input"
                        />
                    </div>

                    <div className="Home-slider-row">
                        <div className="Home-slider-label">
                            <span><FaGasPump /> Number of Passengers Sharing:</span>
                            <span style={{ color: '#fbbf24', fontWeight: '800' }}>{calcPassengers} passengers</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="4"
                            step="1"
                            value={calcPassengers}
                            onChange={this.handlePassengersChange}
                            className="Home-slider-input"
                        />
                    </div>

                    <div className="Home-calc-results">
                        <div className="Home-calc-metric">
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Solo Fuel Cost</div>
                            <div className="Home-calc-val" style={{ color: '#f87171' }}>₹{totalSoloCost}</div>
                        </div>
                        <div className="Home-calc-metric">
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Split Cost Per Person</div>
                            <div className="Home-calc-val" style={{ color: '#38bdf8' }}>₹{costPerPerson}</div>
                        </div>
                        <div className="Home-calc-metric">
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Driver & Passenger Savings</div>
                            <div className="Home-calc-val" style={{ color: '#10b981' }}>₹{totalSavings}</div>
                        </div>
                        <div className="Home-calc-metric">
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>CO2 Footprint Reduced</div>
                            <div className="Home-calc-val" style={{ color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <FaLeaf style={{ fontSize: '1rem' }} /> {co2SavedKg} kg
                            </div>
                        </div>
                    </div>
                </div>

                {/* Safety & Trust Features Grid */}
                <h2 style={{ fontSize: '1.4rem', color: '#38bdf8', marginBottom: '14px' }}>
                    🛡️ Safety Features Built-In
                </h2>
                <div className="Home-grid-2">
                    <div className="Home-feature-card">
                        <div>
                            <div className="Home-feature-header" style={{ color: '#10b981' }}>
                                <FaShieldAlt /> 100% Verified Members
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Every driver profile includes license verification, vehicle details (AC, luggage, smoking rules), and authentic user ratings.
                            </p>
                        </div>
                    </div>

                    <div className="Home-feature-card">
                        <div>
                            <div className="Home-feature-header" style={{ color: '#38bdf8' }}>
                                <FaMapMarkedAlt /> Built-in Live GPS Route View
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Never switch between navigation apps. Track route waypoints, speed telemetry, and arrival times directly in-app.
                            </p>
                        </div>
                    </div>

                    <div className="Home-feature-card">
                        <div>
                            <div className="Home-feature-header" style={{ color: '#ef4444' }}>
                                <FaExclamationTriangle /> 1-Click Emergency SOS
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Instant safety hub available on every screen: trigger panic alerts, dial emergency hotlines (112 / 911), or share live trip links with loved ones.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Community Stats Bar */}
                <div className="Home-stats-bar">
                    <div>
                        <div className="Home-stat-num">14,800+</div>
                        <div className="Home-stat-label">Trips Completed</div>
                    </div>
                    <div>
                        <div className="Home-stat-num">28,500+</div>
                        <div className="Home-stat-label">Happy Carpoolers</div>
                    </div>
                    <div>
                        <div className="Home-stat-num">95,000 kg</div>
                        <div className="Home-stat-label">CO2 Prevented</div>
                    </div>
                    <div>
                        <div className="Home-stat-num">4.9 / 5.0</div>
                        <div className="Home-stat-label">Driver Safety Rating</div>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        isAuthenticated: state.auth.token !== null,
        token: state.auth.token,
        userId: state.auth.userId,
        isAdmin: state.auth.userRole === 'ADMIN'
    };
};

export default connect(mapStateToProps)(withErrorHandler(Home, axios));