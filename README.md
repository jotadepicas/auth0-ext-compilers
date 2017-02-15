This repository contains [webtask compilers](https://webtask.io/docs/webtask-compilers) that enable custom programming models for Auth0 platform extensibility points. 

This module is installed on the webtask platform via the [webtask-mongo](https://github.com/auth0/webtask-mongo) docker image. 

## Creating Auth0 extensions with *wt-cli*

To create a webtask that implements a specific extensibility point, you can use the `wt-cli` tool or a corresponding webtask API call. For example, to create a *client-credentials-exchange* extension you could call: 

```bash
cat > custom_claims.js <<EOF
module.exports = function(client, scope, audience, context, cb) {
  var access_token = {};
  access_token['https://foo.com/claim'] = 'bar';  
  access_token.scope = scope;
  access_token.scope.push('extra');
  cb(null, access_token);  
};
EOF

SECRET=$(openssl rand 32 -base64) && \
wt create custom_claims.js \
    -p default-tjanczuk \
    --meta wt-compiler=auth0-ext-compilers/client-credentials-exchange \
    --meta auth0-extension=runtime \
    --meta auth0-extension-name=client-credentials-exchange \
    --meta auth0-extension-secret=$SECRET \
    --secret auth0-extension-secret=$SECRET
```

## What is an Auth0 extension

An Auth0 extension is a webtask created in the Auth0 tenant's webtask container and associated with specific metadata properties as outlined in the table below. 

|  Name  |  Required?  |  Value  |
| --- | --- | --- |
| `auth0-extension`  | Yes | Must be set to `runtime`. |
| `auth0-extension-name` | Yes | The name of the extensibility point in Auth0. This is used by Auth0 to select the set of webtasks to run in a specific place and circumstances of Auth0 processing. [Available Extensibility Points](#extensibility-points-available) |
| `auth0-extension-client` | No | Auth0 extension points which only wish to execute extensions configured for a particular client_id will use this value to select the webtasks that should be run. |
| `auth0-extension-disabled` | No | If set, disables the webtask. |
| `auth0-extension-order` | No | Webtasks selected to run for a given extension point in Auth0 will be sorted following an increasing order of this numeric metadata property. If not specified, `0` is assumed. Order of webtasks with the same value of `auth0-extension-order` is indeterministic. |
| `auth0-extension-secret` | No | Used to authorize calls from Auth0 to Webtasks. See below. |

## Authorization

Auth0 extensions are executed by issuing an HTTP POST request to the webtask URL from the Auth0 runtime. To ensure that only the Auth0 runtime and/or a specific Auth0 tenant can issue such requests, the requests use a secret-based authorization mechanism. If an extension webtask has been created with the `auth0-extension-secret` secret parameter, the value of that parameter MUST equal to the value of the `Authorization: Bearer {secret}` header of the HTTP POST request. To allow the Auth0 runtime to add the necessary header to the webtask request it is making, the same secret value is stored in the `auth0-extension-secret` metadata property. This setup can be achieved with the following: 

```bash
SECRET=$(openssl rand 32 -base64) && \
wt create {file}.js \
    --meta wt-compiler=auth0-ext-compilers/{specific-compiler} \
    --meta auth0-extension-secret=$SECRET \
    --secret auth0-extension-secret=$SECRET \
    ...
```

The authorization check is implemented as part of the webtask compiler for a specific extensibility point - see next section.

## Custom programming models

Different Auth0 extensibility points may present unique programming models to the end user with the use of [webtask compilers](https://webtask.io/docs/webtask-compilers). Webtask compilers for Auth0 extensibility points are implemented as part of this repository which is installed as a Node.js module in the webtask environment. This allows the use of `wt-compiler` metadata property to select a specific compiler, e.g. with: 

```bash
wt create {file}.js \
    --meta wt-compiler=auth0-ext-compilers/client-credentials-exchange \
    ...
```

Webtask compilers for Auth0 extension points also enforce the authorization check described in the previous section. 

### Extensibility points available
1. [The *client-credentials-exchange* extensibility point](./client-credentials-exchange.md)
2. [The *pre-user-registration* extensibility point](./pre-user-registration.md)
3. [The *post-user-registration* extensibility point](./post-user-registration.md)

### The *generic* programming model for all extensibility points

A generic compiler is provided (`auth0-ext-compilers/generic`) that does not adhere to any extension-specific programming model. Instead, this compiler is a light facade on top of the 2ary and 3ary [webtask programming models](https://webtask.io/docs/model). The compiler provides authorization of the incoming webtask request and then invokes the supplied function.

#### 2ary *generic* extension

```javascript
module.exports = function(ctx, cb) {
  var scope = ctx.body.scope;
  var access_token = {};
  access_token['https://foo.com/claim'] = 'bar';  
  access_token.scope = scope;
  access_token.scope.push('extra');
  cb(null, access_token);  
};
```

#### 3ary *generic* extension

```javascript
module.exports = function(ctx, req, res) {
  var scope = ctx.body.scope;
  var access_token = {};
  access_token['https://foo.com/claim'] = 'bar';  
  access_token.scope = scope;
  access_token.scope.push('extra');
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(access_token));
};
```
