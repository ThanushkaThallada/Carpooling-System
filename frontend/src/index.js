import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import thunk from 'redux-thunk';

import './index.css';
import App from './App';
import authReducer from './store/reducers/auth';
import  tripReducer from './store/reducers/trip';
import  carReducer from './store/reducers/car';
import  userReducer from './store/reducers/user';
import { API_BASE_URL } from './axios-baseUrl';

// Redirect any raw window.fetch calls targeting localhost:8080 to the live backend URL
if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = function(resource, init) {
        if (typeof resource === 'string') {
            resource = resource.replace(/http:\/\/localhost:8080\/?/g, API_BASE_URL + '/');
        } else if (resource && resource.url) {
            const newUrl = resource.url.replace(/http:\/\/localhost:8080\/?/g, API_BASE_URL + '/');
            resource = new Request(newUrl, resource);
        }
        return originalFetch.call(this, resource, init);
    };
}





const composeEnhancers = (process.env.NODE_ENV === 'development' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;


const rootReducer = combineReducers({
    auth: authReducer,
    trip : tripReducer,
    car: carReducer,
    user : userReducer
});

const store =  createStore(rootReducer, composeEnhancers(
    applyMiddleware(thunk)
));

const app = (
    <Provider store={store}>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </Provider>
);

ReactDOM.render( app, document.getElementById( 'root' ) );
