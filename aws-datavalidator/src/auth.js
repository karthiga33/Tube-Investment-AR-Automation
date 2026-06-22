import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

// ── Cognito Configuration ─────────────────────────────────────────────────────
const poolData = {
  UserPoolId: 'ap-south-1_KRRZSygPa',   // e.g. ap-south-1_XXXXXXXX
  ClientId:   '3v4b0rh74hq98mb0ec9o95o6ek',
};

const userPool = new CognitoUserPool(poolData);

// ── Sign Up ───────────────────────────────────────────────────────────────────
export function signUp(email, password, name) {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'name',  Value: name }),
    ];
    userPool.signUp(email, password, attributes, null, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// ── Confirm Sign Up (verification code) ──────────────────────────────────────
export function confirmSignUp(email, code) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(code, true, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// ── Sign In ───────────────────────────────────────────────────────────────────
export function signIn(email, password) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
      newPasswordRequired: (userAttributes) => {
        delete userAttributes.email_verified;
        delete userAttributes.email;
        user.completeNewPasswordChallenge(password, userAttributes, {
          onSuccess: (session) => resolve(session),
          onFailure: (err) => reject(err),
          mfaSetup: (challengeName, challengeParameters) => {
            // Skip MFA setup — resolve anyway
            resolve(null);
          },
          mfaRequired: (challengeName, challengeParameters) => {
            reject(new Error('MFA is required. Please contact admin.'));
          },
        });
      },
      mfaSetup: (challengeName, challengeParameters) => {
        // MFA setup required — skip for now
        reject(new Error('MFA setup required. Please contact admin to disable MFA.'));
      },
      mfaRequired: (challengeName, challengeParameters) => {
        reject(new Error('MFA code required. Please contact admin.'));
      },
    });
  });
}

// ── Sign Out ──────────────────────────────────────────────────────────────────
export function signOut() {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

// ── Get Current Session ───────────────────────────────────────────────────────
export function getCurrentSession() {
  return new Promise((resolve, reject) => {
    const user = userPool.getCurrentUser();
    if (!user) return reject(new Error('No user'));
    user.getSession((err, session) => {
      if (err) return reject(err);
      resolve(session);
    });
  });
}

// ── Get Current User Info ─────────────────────────────────────────────────────
export function getCurrentUser() {
  return userPool.getCurrentUser();
}

// ── Get User Attributes (name, email) ─────────────────────────────────────────
export function getUserAttributes() {
  return new Promise((resolve, reject) => {
    const user = userPool.getCurrentUser();
    if (!user) return reject(new Error('No user'));
    user.getSession((err, session) => {
      if (err) return reject(err);
      user.getUserAttributes((err, attrs) => {
        if (err) return reject(err);
        const map = {};
        attrs.forEach(a => { map[a.Name] = a.Value; });
        resolve(map);
      });
    });
  });
}
