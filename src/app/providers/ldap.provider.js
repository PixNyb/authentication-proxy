const LdapStrategy = require('passport-ldapauth').Strategy;
const { AUTH_PREFIX } = require("../utils/constants");

const ldapProvider = (id, keyName) => ({
  name: `ldap_${id}`,
  type: 'ldap',
  strategy: LdapStrategy,
  params: {
    server: {
      url: process.env[`LDAP_${keyName}_URL`],
      bindDN: process.env[`LDAP_${keyName}_BIND_DN`],
      bindCredentials: process.env[`LDAP_${keyName}_BIND_CREDENTIALS`],
      searchBase: process.env[`LDAP_${keyName}_SEARCH_BASE`],
      searchFilter: process.env[`LDAP_${keyName}_SEARCH_FILTER`] || '(uid={{username}})',
    },
    loginURL: `${AUTH_PREFIX}/_ldap/${id}`,
    callbackURL: `${AUTH_PREFIX}/_ldap/${id}/callback`,
    callbackMethod: 'POST',
    displayName: process.env[`LDAP_${keyName}_DISPLAY_NAME`] || id,
    fontAwesomeIcon: process.env[`LDAP_${keyName}_ICON`] || 'fas fa-server',
  },
  verify: (user, done) => {
    return done(null, {
      id: user.uid,
      strategy: `ldap_${id}`,
      profile: user,
    });
  },
});

module.exports = ldapProvider;