import React, { Component } from 'react';
import { connect } from 'react-redux';

import Auxiliary from '../Auxiliary/Auxiliary';
import './Layout.css';
import Toolbar from '../../components/Navigation/Toolbar/Toolbar';
import SideDrawer from '../../components/Navigation/SideDrawer/SideDrawer';
import SafetyHub from '../../components/Safety/SafetyHub';
import NotificationCenter from '../../components/Notifications/NotificationCenter';

class Layout extends Component {
    state = {
        showSideDrawer: false,
        showNotifications: false,
        notifications: [],
        unreadCount: 0,
        isDriver: false
    };

    componentDidMount() {
        this.loadNotifications();
        window.addEventListener('carpool_driver_notifications_updated', this.loadNotifications);
        window.addEventListener('carpool_open_notifications', this.openNotificationsHandler);
        window.addEventListener('storage', this.loadNotifications);
    }

    componentWillUnmount() {
        window.removeEventListener('carpool_driver_notifications_updated', this.loadNotifications);
        window.removeEventListener('carpool_open_notifications', this.openNotificationsHandler);
        window.removeEventListener('storage', this.loadNotifications);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.userId !== this.props.userId) {
            this.loadNotifications();
        }
    }

    openNotificationsHandler = () => {
        this.setState({ showNotifications: true });
    };

    loadNotifications = () => {
        try {
            const currentUsername = this.props.userId || '';
            const savedRole = (currentUsername && localStorage.getItem('user_role_' + currentUsername.toLowerCase())) || this.props.userRole;
            const isDriver = (currentUsername && currentUsername.toLowerCase() === 'driver') || savedRole === 'DRIVER';
            let raw = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');

            let userNotifs = [];
            if (!currentUsername) {
                userNotifs = [];
            } else if (isDriver) {
                const activeRoute = JSON.parse(localStorage.getItem('carpool_active_driver_route') || 'null');
                const savedTrips = JSON.parse(localStorage.getItem('carpool_created_trips') || '[]');
                const latestTrip = (savedTrips && savedTrips.length > 0 && savedTrips[0].trip) ? savedTrips[0].trip : null;
                const actOrigin = (activeRoute && activeRoute.origin) || (latestTrip && latestTrip.origin) || '';
                const actDest = (activeRoute && activeRoute.destination) || (latestTrip && latestTrip.destination) || '';

                // Driver ONLY receives ride requests from passengers for their active trip
                userNotifs = raw.filter(n => {
                    if (!n) return false;
                    const matchesDriver = (n.driverUsername && n.driverUsername.toLowerCase() === currentUsername.toLowerCase()) || (n.forRole === 'DRIVER');
                    if (!matchesDriver || n.type === 'MATCHING_RIDE_ALERT' || n.forRole === 'PASSENGER') return false;
                    if (actOrigin && actDest && n.origin && n.destination) {
                        return n.origin.toLowerCase() === actOrigin.toLowerCase() && n.destination.toLowerCase() === actDest.toLowerCase();
                    }
                    return true;
                });
            } else {
                // Passenger receives alerts and booking confirmations for their account
                userNotifs = raw.filter(n => 
                    n && n.passengerUsername && n.passengerUsername.toLowerCase() === currentUsername.toLowerCase() &&
                    n.type !== 'PASSENGER_REQUEST' && 
                    n.forRole !== 'DRIVER'
                );
            }

            const unread = isDriver 
                ? Math.min(4, userNotifs.filter(n => n.status === 'PENDING_DRIVER_CONFIRMATION').length)
                : userNotifs.length;

            this.setState({ notifications: userNotifs, unreadCount: unread, isDriver: isDriver });
        } catch (e) {
            console.error("Error loading notifications in Layout:", e);
        }
    };

    sideDrawerClosedHandler = () => {
        this.setState( { showSideDrawer: false } );
    };

    sideDrawerToggleHandler = () => {
        this.setState( ( prevState ) => {
            return { showSideDrawer: !prevState.showSideDrawer };
        } );
    };

    toggleNotificationsHandler = () => {
        this.setState( ( prevState ) => {
            return { showNotifications: !prevState.showNotifications };
        } );
    };

    render () {
        return (
            <Auxiliary>
                <Toolbar
                    isAuth={this.props.isAuthenticated}
                    isAdmin={this.props.isAdmin}
                    userId={this.props.userId}
                    drawerToggleClicked={this.sideDrawerToggleHandler}
                    openNotifications={this.toggleNotificationsHandler}
                    unreadCount={this.state.unreadCount}
                />
                <SideDrawer
                    isAuth={this.props.isAuthenticated}
                    isAdmin={this.props.isAdmin}
                    userId={this.props.userId}
                    open={this.state.showSideDrawer}
                    closed={this.sideDrawerClosedHandler}
                    openNotifications={this.toggleNotificationsHandler}
                    unreadCount={this.state.unreadCount}
                />

                <NotificationCenter 
                    show={this.state.showNotifications}
                    closed={this.toggleNotificationsHandler}
                    notifications={this.state.notifications}
                    isDriver={this.state.isDriver}
                    userId={this.props.userId}
                />

                {this.props.isAuthenticated && <SafetyHub />}

                <main className="Content">
                    {this.props.children}
                </main>
            </Auxiliary>
        )
    }
}

const mapStateToProps = state => {
    return {
        isAuthenticated: state.auth.token !== null,
        isAdmin: state.auth.userRole === 'ADMIN' || (state.auth.userId && state.auth.userId.toLowerCase() === 'admin'),
        userId: state.auth.userId
    };
};

export default connect( mapStateToProps )( Layout );