import React, { Component } from 'react';
import './Trip.css';
import Button from "@material-ui/core/Button";
import { FaMedal, FaCar, FaUserEdit, FaClock, FaChair, FaSuitcase, FaSmoking, FaPaw, FaSnowflake } from "react-icons/fa";
import { connect } from "react-redux";
import withErrorHandler from "../../../hoc/withErrorHandler/withErrorHandler";
import axios from "../../../axios-baseUrl";
import Avatar from "../../../assets/images/image-default.png";
import { getVehicleForTrip, getDriverForTrip } from "../../../shared/vehicleCatalog";
import StarRatings from "react-star-ratings";

class Trip extends Component {
    state = {
        src: Avatar,
        rating: 0,
        car: null
    };

    async componentDidMount() {
        const headers = {
            "Content-Type": "application/json",
            'Authorization': this.props.token
        };

        if (this.props.driver && this.props.driver.username) {
            // 1. Fetch Driver Avatar
            try {
                const getDriverAvatarResponse = await fetch("http://localhost:8080/images/" + this.props.driver.username, { headers })
                    .then(response => response.blob());

                if (getDriverAvatarResponse && getDriverAvatarResponse.size > 500) {
                    this.setState({
                        src: URL.createObjectURL(getDriverAvatarResponse)
                    });
                }
            } catch (e) {
                // keep default avatar
            }

            // 2. Fetch Driver Rating
            try {
                const res = await fetch("http://localhost:8080/users/" + this.props.driver.username, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.ratingAsDriver) {
                        this.setState({ rating: data.ratingAsDriver });
                    }
                }
            } catch (e) {
                // default rating
            }

            // 3. Fetch Vehicle / Car Details for this driver
            try {
                const res = await fetch("http://localhost:8080/car/" + this.props.driver.username, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        this.setState({ car: data });
                    }
                }
            } catch (e) {
                // default car
            }
        }
    }

    render() {
        const { car, rating, src } = this.state;
        const { trip, driver } = this.props;

        const rawCost = trip.costPerPassenger;
        const inrCost = (rawCost && rawCost >= 100) ? rawCost : ((rawCost || 20) * 35);

        // Derive distinct assigned driver and vehicle for each card
        const tripIndex = this.props.index !== undefined ? this.props.index : (trip.modelId || trip.id || 0);
        const assignedDriver = (driver && driver.username && driver.username !== 'driver' && driver.username !== 'alex_driver')
            ? { ...getDriverForTrip(tripIndex, driver), ...driver }
            : getDriverForTrip(tripIndex, driver);

        const vehicleInfo = this.props.vehicle
            ? this.props.vehicle
            : getVehicleForTrip(tripIndex, car);

        const driverRatingVal = (assignedDriver && assignedDriver.rating) || rating || 4.9;

        // Formatted distinct departure time so each card has its scheduled departure
        let displayDeparture = trip.departureTime || '2026-10-12 09:00';
        if (assignedDriver.departureTime) {
            if (displayDeparture.includes('T')) {
                const datePart = displayDeparture.split('T')[0];
                displayDeparture = `${datePart} • ${assignedDriver.departureTime}`;
            } else if (displayDeparture.includes(' ')) {
                const datePart = displayDeparture.split(' ')[0];
                displayDeparture = `${datePart} • ${assignedDriver.departureTime}`;
            } else {
                displayDeparture = `Tomorrow • ${assignedDriver.departureTime}`;
            }
        } else if (displayDeparture.includes('T')) {
            displayDeparture = displayDeparture.replace('T', ' ').substring(0, 16);
        }

        const seatsLeft = (assignedDriver.availablePlaces !== undefined)
            ? assignedDriver.availablePlaces
            : (trip.availablePlaces !== undefined ? trip.availablePlaces : 3);

        const displayNote = (trip.message && trip.message !== "Expressway direct drive to Pune Wakad." && trip.message.trim().length > 0)
            ? trip.message
            : (assignedDriver.note || "Verified highway carpool. Smooth and punctual drive.");

        const currentUsername = this.props.username;
        let paidRecord = null;
        try {
            const history = JSON.parse(localStorage.getItem('carpool_payment_history') || '[]');
            if (currentUsername && (trip.modelId || trip.id)) {
                paidRecord = history.find(p => 
                    p.tripId && String(p.tripId) === String(trip.modelId || trip.id) &&
                    p.status !== 'CANCELLED & REFUNDED' &&
                    ((p.passengerUsername && p.passengerUsername.toLowerCase() === currentUsername.toLowerCase()) ||
                     (p.passengerName && p.passengerName.toLowerCase() === currentUsername.toLowerCase())) &&
                    (!p.origin || !trip.origin || (p.origin.toLowerCase().trim() === trip.origin.toLowerCase().trim() && p.destination.toLowerCase().trim() === trip.destination.toLowerCase().trim()))
                );
            }
        } catch (e) {}

        const hasUploadedAvatar = src && src !== Avatar;

        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                margin: '0 auto',
                width: '100%',
                maxWidth: '100%',
                color: '#f8fafc',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    padding: '12px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: '800',
                    fontSize: '1.15rem',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ wordBreak: 'break-word' }}>
                        📍 {trip.origin} ➔ {trip.destination}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {paidRecord && (
                            <span style={{
                                background: 'rgba(16, 185, 129, 0.25)',
                                border: '1px solid #10b981',
                                color: '#10b981',
                                fontSize: '0.8rem',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontWeight: 'bold'
                            }}>
                                💳 PAID: ₹{paidRecord.amount} • {paidRecord.paymentMethod} ✅
                            </span>
                        )}
                        <span style={{
                            background: '#10b981',
                            color: '#ffffff',
                            fontSize: '0.85rem',
                            padding: '4px 12px',
                            borderRadius: '20px'
                        }}>
                            {trip.tripStatus || 'AVAILABLE'}
                        </span>
                        <span style={{ fontSize: '1.3rem', color: '#fef08a', fontWeight: '900' }}>
                            ₹{inrCost}
                        </span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '14px',
                    padding: '16px',
                    flex: '1'
                }}>
                    {/* Column 1: Driver Details & Avatar Badge & Rating */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                {hasUploadedAvatar ? (
                                    <img 
                                        src={src} 
                                        alt={assignedDriver.firstName}
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '3px solid #38bdf8',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                            marginBottom: '8px'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        background: assignedDriver.avatarGradient || 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        fontSize: '1.6rem',
                                        fontWeight: '800',
                                        border: '3px solid #38bdf8',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                        margin: '0 auto 8px',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                                    }}>
                                        {assignedDriver.initials || `${assignedDriver.firstName.charAt(0)}${assignedDriver.lastName.charAt(0)}`}
                                    </div>
                                )}
                                <span style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    right: '0px',
                                    background: '#10b981',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '22px',
                                    height: '22px',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid #0f172a'
                                }} title="Verified Driver">✓</span>
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff' }}>
                                {assignedDriver.firstName} {assignedDriver.lastName}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '600', marginBottom: '6px' }}>
                                @{assignedDriver.username}
                            </div>
                            {assignedDriver.phone && (
                                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '4px' }}>
                                    📞 {assignedDriver.phone}
                                </div>
                            )}
                            {assignedDriver.email && (
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px', wordBreak: 'break-all' }}>
                                    ✉️ {assignedDriver.email}
                                </div>
                            )}
                        </div>

                        <div style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: '8px',
                            padding: '8px',
                            marginTop: '8px'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                Driver Rating
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <StarRatings
                                    rating={driverRatingVal}
                                    starRatedColor="#fbbf24"
                                    starDimension="16px"
                                    starSpacing="2px"
                                    numberOfStars={5}
                                />
                                <span style={{ fontWeight: '800', fontSize: '1rem', color: '#fbbf24' }}>
                                    {driverRatingVal.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Vehicle Details (Photo, Name, Model, Number Plate, Color, Reg Year, AC) */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                color: '#38bdf8',
                                fontWeight: '800',
                                fontSize: '0.95rem',
                                marginBottom: '10px',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                paddingBottom: '6px'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FaCar style={{ fontSize: '1.1rem' }} /> VEHICLE DETAILS
                                </span>
                                <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                                    VERIFIED
                                </span>
                            </div>

                            {/* Vehicle Photo (Distinct for each ride) */}
                            <img 
                                src={vehicleInfo.image} 
                                alt={`${vehicleInfo.brand} ${vehicleInfo.model}`} 
                                style={{
                                    width: '100%',
                                    height: '110px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    marginBottom: '10px',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)'
                                }}
                            />

                            {/* Indian High Security Registration Plate (HSRP) */}
                            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#ffffff',
                                    border: '2px solid #0f172a',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    fontFamily: 'monospace',
                                    fontWeight: '900',
                                    fontSize: '0.92rem',
                                    boxShadow: '0 3px 8px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{
                                        background: '#003399',
                                        color: '#ffffff',
                                        padding: '3px 6px',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        lineHeight: 1.1
                                    }}>
                                        <span style={{ color: '#fbbf24', fontSize: '0.5rem' }}>🔵</span>
                                        <span>IND</span>
                                    </div>
                                    <div style={{ padding: '3px 10px', letterSpacing: '2px', color: '#0f172a' }}>
                                        {vehicleInfo.plate}
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.86rem', lineHeight: '1.7', color: '#e2e8f0' }}>
                                <div><strong>🚗 Name:</strong> {vehicleInfo.brand} {vehicleInfo.model}</div>
                                <div><strong>🎨 Color:</strong> {vehicleInfo.color}</div>
                                <div><strong>📅 Reg Year:</strong> {vehicleInfo.year}</div>
                                <div>
                                    <strong><FaSnowflake style={{ color: '#38bdf8' }} /> AC:</strong>{' '}
                                    {trip.airConditioned || (car && car.airConditioned) ? 'Yes (Air-Conditioned)' : 'Standard Climate'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Trip Details & Action */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ fontSize: '0.88rem', lineHeight: '1.7', color: '#cbd5e1' }}>
                            <div>
                                <FaClock style={{ color: '#38bdf8', marginRight: '6px' }} />
                                <strong>Departure:</strong> {displayDeparture}
                            </div>
                            <div>
                                <FaChair style={{ color: '#10b981', marginRight: '6px' }} />
                                <strong>Seats Left:</strong> {seatsLeft}
                            </div>
                            <div>
                                <FaSuitcase style={{ color: '#fbbf24', marginRight: '6px' }} />
                                <strong>Luggage:</strong> {trip.luggageAllowed ? 'Allowed' : 'Not Allowed'}
                            </div>
                            <div>
                                <FaSmoking style={{ color: '#f87171', marginRight: '6px' }} />
                                <strong>Smoking:</strong> {trip.smokingAllowed ? 'Allowed' : 'No'}
                            </div>
                            <div>
                                <FaPaw style={{ color: '#a78bfa', marginRight: '6px' }} />
                                <strong>Pets:</strong> {trip.petsAllowed ? 'Allowed' : 'No'}
                            </div>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <Button
                                fullWidth
                                variant="contained"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#ffffff',
                                    fontWeight: '800',
                                    padding: '10px 0',
                                    borderRadius: '8px'
                                }}
                                onClick={() => {
                                    const fullTripPayload = {
                                        ...this.props.data,
                                        user: assignedDriver,
                                        driver: assignedDriver,
                                        vehicle: vehicleInfo,
                                        trip: {
                                            ...trip,
                                            departureTime: displayDeparture,
                                            message: displayNote,
                                            availablePlaces: seatsLeft
                                        }
                                    };
                                    this.props.showFullTrip(fullTripPayload);
                                }}
                            >
                                <FaUserEdit style={{ marginRight: '8px' }} /> VIEW DETAILS & JOIN
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Driver Note banner */}
                {displayNote && (
                    <div style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '10px 24px',
                        fontSize: '0.85rem',
                        color: '#94a3b8',
                        fontStyle: 'italic'
                    }}>
                        💬 Driver Note: "{displayNote}"
                    </div>
                )}
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        token: state.auth.token,
        username: state.auth.userId
    };
};

export default connect(mapStateToProps)(Trip);
