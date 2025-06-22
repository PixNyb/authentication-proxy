# Role-Based Access Control (RBAC)

The authentication proxy now supports Role-Based Access Control (RBAC) for fine-grained permissions management while still maintaining the option for stateless operation.

## Enabling RBAC

To enable RBAC functionality, set the following environment variable:

```
RBAC_ENABLED=true
```

## Configuration Options

| Environment Variable | Description                                                       | Default   |
| -------------------- | ----------------------------------------------------------------- | --------- |
| `RBAC_ENABLED`       | Enables or disables RBAC functionality                            | `false`   |
| `DEFAULT_ROLE`       | The default role assigned to users if no specific mapping applies | `user`    |
| `ROLES_CONFIG`       | JSON string defining roles and their permissions                  | See below |

Default `ROLES_CONFIG`:
```json
{
  "admin": {
    "permissions": ["*"]
  },
  "user": {
    "permissions": []
  }
}
```

## Role Mapping

You can map users to roles based on their authentication provider and attributes. Configure role mappings using environment variables:

```
STRATEGY_ID_ROLES={"admin":{"type":"email","pattern":".*@yourdomain.com"},"user":{"type":"attribute","attribute":"organization","value":"partner"}}
```

For example, to map Google authentication:

```
GOOGLE_MAIN_ROLES={"admin":{"type":"email","pattern":".*@admin.example.com"},"support":{"type":"email","pattern":".*@support.example.com"}}
```

## Permission Checking

### In External Applications

External applications can verify permissions in two ways:

1. Via headers sent by the authentication proxy:
   - `X-Forwarded-User`: The username
   - `X-Forwarded-Role`: The user's role
   - `X-Forwarded-Permissions`: JSON array of the user's permissions

2. Via request parameters during authorization:
   - Send `X-Required-Permission` header or `requiredPermission` query parameter
   - Send `X-Required-Permissions` header or `requiredPermissions` query parameter with JSON array

Example with curl:
```bash
# Check single permission
curl -H "X-Required-Permission: read:users" https://your-app/api/users

# Check multiple permissions
curl -H "X-Required-Permissions: [\"read:users\", \"write:users\"]" https://your-app/api/users
```

### In Internal Applications

For internal applications using the authentication proxy middleware:

```javascript
const { permissionCheck } = require('./middlewares');

// Check single permission
app.get('/api/users', permissionCheck('read:users'), (req, res) => {
  // Only users with 'read:users' permission can access this route
});

// Check multiple permissions
app.post('/api/users', permissionCheck(['read:users', 'write:users']), (req, res) => {
  // Only users with both permissions can access this route
});
```

## Stateless Operation

When RBAC is enabled, the authentication system remains stateless - all role and permission information is stored in the JWT token. This means:

1. No database is required for RBAC
2. Permission changes require re-login to generate a new token
3. Fine-grained permissions are maintained across domains

## Wildcard Permission

The special permission `*` grants access to all protected resources. By default, the `admin` role has this permission.
