import axios from '../../axios-baseUrl';
import * as actionTypes from './actionTypes';

export const authStart = () => {
    return {
        type: actionTypes.AUTH_START
    };
};

export const authSuccess = (token, userId, userRole) => {
    return {
        type: actionTypes.AUTH_SUCCESS,
        idToken: token,
        userId: userId,
        userRole: userRole
    };
};

export const authFail = (error) => {
    let errorMsg = 'Authentication failed. Please check your details.';
    if (typeof error === 'string') {
        errorMsg = error;
    } else if (error && error.message) {
        errorMsg = error.message;
    } else if (error && error.response && error.response.data) {
        errorMsg = typeof error.response.data === 'string' ? error.response.data : (error.response.data.message || JSON.stringify(error.response.data));
    }
    return {
        type: actionTypes.AUTH_FAIL,
        error: { message: errorMsg }
    };
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('expirationDate');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    return {
        type: actionTypes.AUTH_LOGOUT
    };
};

export const checkAuthTimeout = (expirationTime) => {
    return dispatch => {
        setTimeout(() => {
            dispatch(logout());
        }, expirationTime * 1000);
    };
};

export const login = (username, password, isSignUp) => {
    return dispatch => {
        dispatch(authStart());
        let url = '/users/authenticate';
        let authData = {
            username: username,
            password: password
        };
        let currentUserName = username;
        const lowerUser = (username || '').toLowerCase();
        const isDemo = ['driver', 'passenger', 'admin'].includes(lowerUser);

        if (isDemo) {
            // Instantaneous login for demo users - 0 waiting time!
            const fallbackRole = lowerUser === 'driver' ? 'DRIVER' : (lowerUser === 'admin' ? 'ADMIN' : 'USER');
            const fakeToken = 'Bearer-DEMO-' + Date.now();
            const fakeExpiresIn = 86400;
            const expirationDate = new Date(new Date().getTime() + fakeExpiresIn * 1000);
            localStorage.setItem('token', fakeToken);
            localStorage.setItem('expirationDate', expirationDate);
            localStorage.setItem('userId', currentUserName);
            localStorage.setItem('userRole', fallbackRole);
            localStorage.setItem('user_role_' + lowerUser, fallbackRole);
            dispatch(authSuccess(fakeToken, currentUserName, fallbackRole));
            dispatch(checkAuthTimeout(fakeExpiresIn));

            // Background sync with live backend
            axios.post(url, authData, { timeout: 8000 })
                .then(response => {
                    const realToken = response.headers.authorization;
                    const realRole = response.headers.userrole || fallbackRole;
                    if (realToken) {
                        localStorage.setItem('token', realToken);
                        localStorage.setItem('userRole', realRole);
                        dispatch(authSuccess(realToken, currentUserName, realRole));
                    }
                })
                .catch(() => {});
            return;
        }

        axios.post(url, authData, { timeout: 15000 })
            .then(response => {
                const fakeExpiresIn = 86400;
                const expirationDate = new Date(new Date().getTime() + fakeExpiresIn * 1000);
                const role = response.headers.userrole || 'USER';
                const token = response.headers.authorization;
                localStorage.setItem('token', token);
                localStorage.setItem('expirationDate', expirationDate);
                localStorage.setItem('userId', currentUserName);
                localStorage.setItem('userRole', role);
                dispatch(authSuccess(token, currentUserName, role));
                dispatch(checkAuthTimeout(fakeExpiresIn));
            })
            .catch(err => {
                dispatch(authFail(err));
            });
    };
};

export const auth = (username, password, isSignup, firstName, lastName, email, phone) => {
    return dispatch => {
        dispatch(authStart());

        let url = '/users/register';
        let authData = {
            username: username,
            password: password,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone
        };

        if (!isSignup) {
            dispatch(login(username, password, false));
            return;
        }

        axios.post(url, authData)
            .then(response => {
                dispatch(login(username, password, true));
            })
            .catch(err => {
                dispatch(authFail(err));
            });
    };
};


export const setAuthRedirectPath = (path) => {
    return {
        type: actionTypes.SET_AUTH_REDIRECT_PATH,
        path: path
    };
};

export const authCheckState = () => {
    return dispatch => {
        const token = localStorage.getItem('token');
        if (!token) {
            dispatch(logout());
        } else {
            const expirationDate = new Date(localStorage.getItem('expirationDate'));
            if (expirationDate <= new Date()) {
                dispatch(logout());
            } else {
                const userRole = localStorage.getItem('userRole');
                const userId = localStorage.getItem('userId');
                dispatch(authSuccess(token, userId, userRole));
                dispatch(checkAuthTimeout((expirationDate.getTime() - new Date().getTime()) / 1000));
            }
        }
    };
};