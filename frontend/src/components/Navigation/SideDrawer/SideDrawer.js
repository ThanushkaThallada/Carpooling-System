import React from 'react';

import NavigationItems from '../NavigationItems/NavigationItems';
import './SideDrawer.css';
import Backdrop from '../../UI/Backdrop/Backdrop';
import Auxiliary from '../../../hoc/Auxiliary/Auxiliary';

const sideDrawer = ( props ) => {
    let attachedClasses = ['SideDrawer', 'Close'];
    if (props.open) {
        attachedClasses = ['SideDrawer', 'Open'];
    }
    return (
        <Auxiliary>
            <Backdrop show={props.open} clicked={props.closed}/>
            <div className={attachedClasses.join(' ')} onClick={props.closed}>
                <div style={{ color: '#38bdf8', fontWeight: '800', fontSize: '1.25rem', padding: '15px' }}>
                    CARPOOLING
                </div>
                <nav>
                    <NavigationItems 
                        isAuthenticated={props.isAuth} 
                        isAdmin={props.isAdmin} 
                        userId={props.userId}
                        openRoleGuide={props.openRoleGuide} 
                        openNotifications={props.openNotifications}
                        unreadCount={props.unreadCount}
                    />
                </nav>
            </div>
        </Auxiliary>
    );
};

export default sideDrawer;