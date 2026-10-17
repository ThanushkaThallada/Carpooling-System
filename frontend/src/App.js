import React, {Component} from 'react';
import {Route, Switch, withRouter, Redirect} from 'react-router-dom';
import {connect} from 'react-redux';
import asyncComponent from './hoc/asyncComponent/asyncComponent';

import Layout from './hoc/Layout/Layout';
import Logout from './containers/Auth/Logout/Logout';
import * as actions from './store/actions/index';
import './App.css';
import Home from './containers/Home/Home';
import TopRatedUsers from "./containers/TopRatedUsers/TopRatedUsers";

const asyncAuth = asyncComponent(() => {
    return import('./containers/Auth/Auth');
});
const asyncCreateTrip = asyncComponent(() => {
    return import('./containers/NewTrip/NewTrip');
});
const asyncFullTrip = asyncComponent(() => {
    return import('./containers/FullTrip/FullTrip');
});
const asyncProfile = asyncComponent(() => {
    return import('./containers/Profile/Profile');
});
const asyncSearchTrips = asyncComponent(() => {
    return import('./containers/SearchTrips/SearchTrips');
});
const asyncMyTrips = asyncComponent(() => {
    return import('./containers/MyTrips/MyTrips');
});
const asyncAdmin = asyncComponent(() => {
    return import('./containers/Admin/Admin');
});
const asyncFullUser = asyncComponent(() => {
    return import('./containers/FullUser/FullUser');
});
const asyncTransactions = asyncComponent(() => {
    return import('./containers/Transactions/Transactions');
});

class App extends Component {
    componentDidMount() {
        this.props.onTryAutoSignup();
        try {
            localStorage.removeItem('carpool_confirmed_trip_undefined');
            localStorage.removeItem('carpool_confirmed_trip_undefined_undefined');
        } catch(e) {}
    }

    render() {
        // Unauthenticated users are redirected to /auth (login) first!
        let routes = (
            <Switch>
                <Route path="/auth" component={asyncAuth}/>
                <Redirect to="/auth"/>
            </Switch>
        );

        let topRated = null;

        if (this.props.isAuthenticated) {
            const isDriver = this.props.userId === 'driver';

            if (this.props.isAdmin) {
                routes = (
                    <Switch>
                        <Route path="/logout" component={Logout}/>
                        <Route path="/admin" component={asyncAdmin}/>
                        <Route path="/fullUser" component={asyncFullUser}/>
                        <Route path="/fullTrip" component={asyncFullTrip}/>
                        <Route path="/createTrip" component={asyncCreateTrip}/>
                        <Route path="/searchTrips" component={asyncSearchTrips}/>
                        <Route path="/myTrips" component={asyncMyTrips}/>
                        <Route path="/transactions" component={asyncTransactions}/>
                        <Route path="/myProfile" component={asyncProfile}/>
                        <Route path="/auth" component={asyncAuth}/>
                        <Route path="/" exact component={Home}/>
                        <Redirect to="/"/>
                    </Switch>
                );
            } else if (isDriver) {
                // Driver account routes
                routes = (
                    <Switch>
                        <Route path="/logout" component={Logout}/>
                        <Route path="/admin" component={asyncAdmin}/>
                        <Route path="/fullUser" component={asyncFullUser}/>
                        <Route path="/fullTrip" component={asyncFullTrip}/>
                        <Route path="/createTrip" component={asyncCreateTrip}/>
                        <Redirect from="/searchTrips" to="/createTrip"/>
                        <Route path="/myTrips" component={asyncMyTrips}/>
                        <Route path="/transactions" component={asyncTransactions}/>
                        <Route path="/myProfile" component={asyncProfile}/>
                        <Route path="/auth" component={asyncAuth}/>
                        <Route path="/" exact component={Home}/>
                        <Redirect to="/"/>
                    </Switch>
                );
            } else {
                // Passenger (and default user) routes
                routes = (
                    <Switch>
                        <Route path="/logout" component={Logout}/>
                        <Route path="/admin" component={asyncAdmin}/>
                        <Route path="/fullUser" component={asyncFullUser}/>
                        <Route path="/fullTrip" component={asyncFullTrip}/>
                        <Redirect from="/createTrip" to="/searchTrips"/>
                        <Route path="/searchTrips" component={asyncSearchTrips}/>
                        <Route path="/myTrips" component={asyncMyTrips}/>
                        <Route path="/transactions" component={asyncTransactions}/>
                        <Route path="/myProfile" component={asyncProfile}/>
                        <Route path="/auth" component={asyncAuth}/>
                        <Route path="/" exact component={Home}/>
                        <Redirect to="/"/>
                    </Switch>
                );
            }
        }

        return (
            <div>
                <Layout>
                    {routes}
                </Layout>
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        isAuthenticated: state.auth.token !== null,
        isAdmin: state.auth.userRole === 'ADMIN' || (state.auth.userId && state.auth.userId.toLowerCase() === 'admin'),
        userId: state.auth.userId
    };
};

const mapDispatchToProps = dispatch => {
    return {
        onTryAutoSignup: () => dispatch(actions.authCheckState())
    };
};

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(App));
