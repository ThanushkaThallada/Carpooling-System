import React from 'react';
import './RoleGuideModal.css';
import { FaCar, FaUserFriends, FaInfoCircle, FaTimes, FaRoute, FaSearch, FaCheckCircle, FaStar } from 'react-icons/fa';

const roleGuideModal = (props) => {
    if (!props.show) return null;

    return (
        <div className="RoleGuide-overlay">
            <div className="RoleGuide-card">
                <div className="RoleGuide-header">
                    <h3 className="RoleGuide-title">
                        <FaInfoCircle /> How Driver & Passenger Modes Work
                    </h3>
                    <button className="RoleGuide-close" onClick={props.closed}>
                        <FaTimes />
                    </button>
                </div>

                <div className="RoleGuide-body">
                    <p style={{ marginTop: 0, fontSize: '0.95rem', color: '#cbd5e1' }}>
                        In this Carpooling platform, accounts can act as both <strong>Driver</strong> and <strong>Passenger</strong> depending on the action you take!
                    </p>

                    <div className="RoleGuide-grid">
                        {/* Driver Role */}
                        <div className="RoleGuide-column RoleGuide-column-driver">
                            <div className="RoleGuide-role-header RoleGuide-role-driver-title">
                                <FaCar style={{ fontSize: '1.3rem' }} /> 🚗 DRIVER ROLE
                            </div>
                            <ul className="RoleGuide-feature-list">
                                <li>
                                    <strong><FaRoute /> Create a Trip:</strong> Publish your route (e.g. Origin, Destination, Departure Time, Cost, Available Seats).
                                </li>
                                <li>
                                    <strong><FaCheckCircle /> Manage Requests:</strong> Accept or Deny incoming seat requests from interested passengers.
                                </li>
                                <li>
                                    <strong><FaCar /> Vehicle Details:</strong> Set your car brand, model, air conditioning, luggage, and smoking rules.
                                </li>
                                <li>
                                    <strong>🚦 Trip Status:</strong> Control trip status (AVAILABLE ➔ ONGOING ➔ DONE / CANCELED).
                                </li>
                            </ul>
                        </div>

                        {/* Passenger Role */}
                        <div className="RoleGuide-column RoleGuide-column-passenger">
                            <div className="RoleGuide-role-header RoleGuide-role-passenger-title">
                                <FaUserFriends style={{ fontSize: '1.3rem' }} /> 👤 PASSENGER ROLE
                            </div>
                            <ul className="RoleGuide-feature-list">
                                <li>
                                    <strong><FaSearch /> Search Trips:</strong> Find available rides matching your origin, destination, and departure date.
                                </li>
                                <li>
                                    <strong>📩 Request Seat:</strong> Click <em>"JOIN TRIP"</em> to request a seat from the driver.
                                </li>
                                <li>
                                    <strong>🗺️ In-App Live Map:</strong> View real-time GPS location tracking and route progress directly in the app without switching apps!
                                </li>
                                <li>
                                    <strong><FaStar /> Rate & Feedback:</strong> Leave star ratings and comments for the driver after the trip is completed.
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="RoleGuide-note">
                        💡 <strong>Single Unified Account:</strong> You don't need separate registrations! Logging in with <code>driver</code> or <code>passenger</code> allows you to create rides OR join available rides anytime.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default roleGuideModal;
