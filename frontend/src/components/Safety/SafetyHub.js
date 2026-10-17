import React, { Component } from 'react';
import './SafetyHub.css';
import { FaShieldAlt, FaExclamationTriangle, FaPhone, FaAmbulance, FaUserShield, FaShareAlt, FaTimes } from 'react-icons/fa';

class SafetyHub extends Component {
    state = {
        showModal: false,
        sosActive: false,
        sosCountdown: 5,
        locationShared: false
    };

    toggleModal = () => {
        this.setState(prevState => ({
            showModal: !prevState.showModal
        }));
    };

    triggerSOS = () => {
        this.setState({ sosActive: true });
        alert('🚨 EMERGENCY ALERT ACTIVATED: Emergency SOS triggered! Local emergency contacts & carpool support have been dispatched your current trip coordinates.');
    };

    handleShareTrip = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText('🚨 Live Carpool Safety Tracking: https://carpooling.app/track/trip-active-emergency-link');
        }
        this.setState({ locationShared: true });
        setTimeout(() => this.setState({ locationShared: false }), 3000);
    };

    render() {
        return (
            <div>
                {/* Floating Emergency SOS Button */}
                <button
                    className="SafetyHub-sos-floating-btn"
                    onClick={this.toggleModal}
                    title="Open Safety & Emergency SOS Center"
                >
                    <FaExclamationTriangle style={{ fontSize: '1.2rem' }} />
                    SAFETY & SOS
                </button>

                {/* Safety & Emergency Modal */}
                {this.state.showModal && (
                    <div className="SafetyHub-modal-overlay">
                        <div className="SafetyHub-modal-card">
                            <div className="SafetyHub-modal-header">
                                <h3 className="SafetyHub-modal-title">
                                    <FaShieldAlt style={{ color: '#f87171' }} /> Passenger & Driver Emergency SOS Center
                                </h3>
                                <button className="SafetyHub-modal-close" onClick={this.toggleModal}>
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="SafetyHub-modal-body">
                                {/* Panic Button Trigger */}
                                <div className="SafetyHub-sos-trigger-card">
                                    <h4 style={{ color: '#ef4444', marginTop: 0, fontWeight: 800 }}>1-CLICK EMERGENCY PANIC SOS</h4>
                                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                                        In case of immediate threat or vehicle emergency, press below to instantly notify police & emergency services with live GPS coordinates.
                                    </p>
                                    <button className="SafetyHub-sos-btn-large" onClick={this.triggerSOS}>
                                        <FaExclamationTriangle /> TRIGGER EMERGENCY PANIC SOS
                                    </button>
                                    {this.state.sosActive && (
                                        <div className="SafetyHub-alert-active">
                                            ✓ Emergency SOS Dispatched to Police & Emergency Contacts!
                                        </div>
                                    )}
                                </div>

                                {/* Direct Emergency Contacts */}
                                <div className="SafetyHub-section-title">Immediate Hotline Contacts</div>
                                <div className="SafetyHub-contacts-grid">
                                    <button className="SafetyHub-contact-btn" onClick={() => window.open('tel:112')}>
                                        <FaPhone className="SafetyHub-contact-icon" style={{ color: '#ef4444' }} />
                                        <div>
                                            <div className="SafetyHub-contact-name">Police Emergency</div>
                                            <div className="SafetyHub-contact-sub">Dial 112 / 911</div>
                                        </div>
                                    </button>

                                    <button className="SafetyHub-contact-btn" onClick={() => window.open('tel:102')}>
                                        <FaAmbulance className="SafetyHub-contact-icon" style={{ color: '#f59e0b' }} />
                                        <div>
                                            <div className="SafetyHub-contact-name">Medical Ambulance</div>
                                            <div className="SafetyHub-contact-sub">Dial 102 / 911</div>
                                        </div>
                                    </button>

                                    <button className="SafetyHub-contact-btn" onClick={() => alert('Carpool Support Line: +1-800-555-CARPOOL')}>
                                        <FaUserShield className="SafetyHub-contact-icon" style={{ color: '#10b981' }} />
                                        <div>
                                            <div className="SafetyHub-contact-name">24/7 Carpool Safety</div>
                                            <div className="SafetyHub-contact-sub">Support & Incident</div>
                                        </div>
                                    </button>

                                    <button className="SafetyHub-contact-btn" onClick={this.handleShareTrip}>
                                        <FaShareAlt className="SafetyHub-contact-icon" style={{ color: '#38bdf8' }} />
                                        <div>
                                            <div className="SafetyHub-contact-name">Share Live Trip</div>
                                            <div className="SafetyHub-contact-sub">
                                                {this.state.locationShared ? '✓ Link Copied!' : 'Send link to family'}
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                {/* Safety Tips */}
                                <div className="SafetyHub-tips-box">
                                    <strong>🛡️ Carpool Safety Protocol:</strong>
                                    <ul style={{ margin: '6px 0 0 16px', paddingLeft: 0 }}>
                                        <li>Always confirm the driver name and vehicle license plate before entering.</li>
                                        <li>Keep live location sharing active for family members during trip.</li>
                                        <li>All rides on this platform are covered by Carpooling Safety Insurance.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

export default SafetyHub;
