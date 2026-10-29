import React from 'react';
import './NavigationItems.css';
import NavigationItem from './NavigationItem/NavigationItem';
import { FaBell } from 'react-icons/fa';

const navigationItems = ( props ) => {
    const savedRole = (props.userId && localStorage.getItem('user_role_' + props.userId.toLowerCase())) || props.userRole;
    const isDriver = (props.userId && props.userId.toLowerCase() === 'driver') || savedRole === 'DRIVER';
    const isAdmin = props.isAdmin || (props.userId && props.userId.toLowerCase() === 'admin') || savedRole === 'ADMIN';
    const isPassenger = !isAdmin && !isDriver;

    return (
        <ul className="NavigationItems">
            <NavigationItem link="/" exact>Home</NavigationItem>

            {/* ========================================================= */}
            {/* 1. ADMIN ACCOUNT NAVIGATION (7 Specialized Feature Items)  */}
            {/* ========================================================= */}
            {props.isAuthenticated && isAdmin ? (
                <>
                    <NavigationItem
                        link="/admin?tab=overview"
                        isActive={(match, location) => location && location.pathname === '/admin' && (!location.search || location.search.includes('tab=overview'))}
                    >
                        Overview
                    </NavigationItem>

                    <NavigationItem
                        link="/admin?tab=users"
                        isActive={(match, location) => location && location.pathname === '/admin' && location.search.includes('tab=users')}
                    >
                        Users & Drivers
                    </NavigationItem>

                    <NavigationItem
                        link="/admin?tab=verification"
                        isActive={(match, location) => location && location.pathname === '/admin' && location.search.includes('tab=verification')}
                    >
                        Verification
                    </NavigationItem>

                    <NavigationItem
                        link="/admin?tab=rides"
                        isActive={(match, location) => location && location.pathname === '/admin' && location.search.includes('tab=rides')}
                    >
                        Rides
                    </NavigationItem>

                    <NavigationItem
                        link="/admin?tab=transactions"
                        isActive={(match, location) => location && location.pathname === '/admin' && location.search.includes('tab=transactions')}
                    >
                        Transactions
                    </NavigationItem>

                    <NavigationItem
                        link="/admin?tab=complaints"
                        isActive={(match, location) => location && location.pathname === '/admin' && location.search.includes('tab=complaints')}
                    >
                        Complaints & Safety
                    </NavigationItem>

                    <NavigationItem
                        link="/admin?tab=reports"
                        isActive={(match, location) => location && location.pathname === '/admin' && location.search.includes('tab=reports')}
                    >
                        Reports
                    </NavigationItem>
                </>
            ) : null}

            {/* ========================================================= */}
            {/* 2. PASSENGER ACCOUNT NAVIGATION (Search Trips)            */}
            {/* ========================================================= */}
            {props.isAuthenticated && isPassenger ? (
                <NavigationItem link="/searchTrips">Search Trips</NavigationItem>
            ) : null}

            {/* ========================================================= */}
            {/* 3. DRIVER ACCOUNT NAVIGATION (Create Trip)                */}
            {/* ========================================================= */}
            {props.isAuthenticated && isDriver ? (
                <NavigationItem link="/createTrip">Create Trip</NavigationItem>
            ) : null}

            {/* ========================================================= */}
            {/* 4. PASSENGER & DRIVER COMMON NAVIGATION (My Trips, etc.)  */}
            {/* ========================================================= */}
            {props.isAuthenticated && !isAdmin ? (
                <>
                    <NavigationItem link="/myTrips">My Trips</NavigationItem>
                    <NavigationItem link="/transactions">Transactions</NavigationItem>
                    <NavigationItem link="/myProfile">Profile</NavigationItem>
                </>
            ) : null}

            {/* Notification Bell Icon */}
            {props.isAuthenticated && (
                <li className="NavigationItem" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                        type="button"
                        className="Navbar-bell-icon-btn"
                        onClick={props.openNotifications}
                        title="Ride Notifications & Alerts"
                        aria-label="Notifications"
                    >
                        <FaBell />
                        {props.unreadCount > 0 && (
                            <span className="Navbar-bell-badge">{props.unreadCount}</span>
                        )}
                    </button>
                </li>
            )}

            {!props.isAuthenticated
                ? <NavigationItem link="/auth">Login</NavigationItem>
                : <NavigationItem link="/logout">Logout</NavigationItem>}
        </ul>
    );
};

export default navigationItems;