import React from 'react';
import './Toolbar.css';
import NavigationItems from '../NavigationItems/NavigationItems';
import DrawerToggle from '../SideDrawer/DrawerToggle/DrawerToggle';
import { NavLink } from 'react-router-dom';

const toolbar = ( props ) => (
    <header className='Toolbar'>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DrawerToggle clicked={props.drawerToggleClicked} />
            <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🚗</span>
                <span className='Toolbar-title' style={{ color: '#38bdf8', fontWeight: '900', fontSize: '1.35rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    CARPOOLING
                </span>
            </NavLink>
        </div>

        <nav className='DesktopOnly'>
            <NavigationItems 
                isAuthenticated={props.isAuth} 
                isAdmin={props.isAdmin} 
                userId={props.userId}
                openRoleGuide={props.openRoleGuide}
                openNotifications={props.openNotifications}
                unreadCount={props.unreadCount} 
            />
        </nav>
    </header>
);

export default toolbar;