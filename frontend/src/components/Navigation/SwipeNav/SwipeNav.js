import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import './SwipeNav.css';
import { FaHome, FaSearch, FaPlusCircle, FaCar, FaUser, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

class SwipeNav extends Component {
    scrollRef = React.createRef();
    touchStartX = 0;
    touchEndX = 0;

    handleScroll = (direction) => {
        if (this.scrollRef.current) {
            const scrollAmount = direction === 'left' ? -180 : 180;
            this.scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    handleTouchStart = (e) => {
        this.touchStartX = e.targetTouches[0].clientX;
    };

    handleTouchEnd = (e) => {
        this.touchEndX = e.changedTouches[0].clientX;
        const diffX = this.touchStartX - this.touchEndX;
        if (Math.abs(diffX) > 40) {
            if (diffX > 0) {
                // Swiped left
                this.handleScroll('right');
            } else {
                // Swiped right
                this.handleScroll('left');
            }
        }
    };

    render() {
        if (!this.props.isAuthenticated) return null;

        const isDriver = this.props.userId === 'driver' || this.props.currentMode === 'DRIVER';
        const isPassenger = this.props.userId === 'passenger' || (!this.props.isAdmin && !isDriver);
        const isAdmin = this.props.isAdmin;

        return (
            <div 
                className="SwipeNav-container"
                onTouchStart={this.handleTouchStart}
                onTouchEnd={this.handleTouchEnd}
            >
                <button 
                    className="SwipeNav-arrow-btn" 
                    onClick={() => this.handleScroll('left')} 
                    title="Swipe Left"
                    type="button"
                >
                    <FaChevronLeft />
                </button>

                <div className="SwipeNav-track-wrapper" ref={this.scrollRef}>
                    <NavLink to="/" exact className="SwipeNav-pill" activeClassName="active">
                        <FaHome /> Home
                    </NavLink>

                    {/* Passenger only sees Search Trips */}
                    {(isPassenger || isAdmin) && (
                        <NavLink to="/searchTrips" className="SwipeNav-pill" activeClassName="active">
                            <FaSearch /> Search Trips
                        </NavLink>
                    )}

                    {/* Driver only sees Create Trip */}
                    {(isDriver || isAdmin) && (
                        <NavLink to="/createTrip" className="SwipeNav-pill" activeClassName="active">
                            <FaPlusCircle /> Create Trip
                        </NavLink>
                    )}

                    <NavLink to="/myTrips" className="SwipeNav-pill" activeClassName="active">
                        <FaCar /> My Trips
                    </NavLink>

                    <NavLink to="/myProfile" className="SwipeNav-pill" activeClassName="active">
                        <FaUser /> Profile
                    </NavLink>
                </div>

                <button 
                    className="SwipeNav-arrow-btn" 
                    onClick={() => this.handleScroll('right')} 
                    title="Swipe Right"
                    type="button"
                >
                    <FaChevronRight />
                </button>
            </div>
        );
    }
}

export default SwipeNav;
