/* eslint-env node, mocha */

'use strict';

const Assert = require('assert')
const Compilers = require('../index');
const simulate = require('./simulate');
const nodejsCompiler = require('./nodejsCompiler');


describe('user-registration', function () {
    const compiler = Compilers['pre-user-registration'];

    it('compiles to a function with 3 arguments', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(null, user); };'
        }, function (error, func) {
            Assert.ifError(error);
            Assert.equal(typeof func, 'function');
            Assert.equal(func.length, 3);
            done();
        });
    });

    it('success for no-op callback', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(); };'
        }, function (error, func) {
            Assert.ifError(error);

            simulate(func, {
                body: { user: {}, context: { connection: {} } },
                headers: {},
                method: 'POST',
            }, function (error, data) {
                Assert.ifError(error);
                Assert.ok(data);
                Assert.equal(typeof data, 'object');
                Assert.equal(Object.keys(data).length, 0);
                done();
            });
        });
    });

    it('success when setting app_metadata and user_metadata', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(null, { user: { app_metadata: { foo: 1 }, user_metadata: { bar: 2 } } }); };'
        }, function (error, func) {
            Assert.ifError(error);

            simulate(func, {
                body: { user: {}, context: { connection: {} } },
                headers: {},
                method: 'POST',
            }, function (error, data) {
                Assert.ifError(error);
                Assert.ok(data);
                Assert.equal(typeof data, 'object');
                Assert.equal(typeof data.user, 'object');
                Assert.equal(typeof data.user.app_metadata, 'object');
                Assert.equal(data.user.app_metadata.foo, 1);
                Assert.equal(typeof data.user.user_metadata, 'object');
                Assert.equal(data.user.user_metadata.bar, 2);
                done();
            });
        });
    });

    it('rejects calls with invalid payload', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(); };'
        }, function (error, func) {
            Assert.ifError(error);
            simulate(func, {
                body: 'no good',
                headers: {},
                method: 'POST',
            }, function (error, data) {
                Assert.ok(error);
                Assert.equal(error.statusCode, 500);
                Assert.equal(error.message, 'Body received by extensibility point is not an object');
                Assert.equal(data, undefined);
                done();
            });
        });
    });

    it('rejects calls with invalid payload (bad user)', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(); };'
        }, function (error, func) {
            Assert.ifError(error);
            simulate(func, {
                body: { user: 'bad user', context: { connection: {} } },
                headers: {},
                method: 'POST',
            }, function (error, data) {
                Assert.ok(error);
                Assert.equal(error.statusCode, 500);
                Assert.equal(error.message, 'Body.user received by extensibility point is not an object');
                Assert.equal(data, undefined);
                done();
            });
        });
    });

    it('rejects calls with invalid payload (bad context)', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(); };'
        }, function (error, func) {
            Assert.ifError(error);
            simulate(func, {
                body: { user: {}, context: 'bad context' },
                headers: {},
                method: 'POST',
            }, function (error, data) {
                Assert.ok(error);
                Assert.equal(error.statusCode, 500);
                Assert.equal(error.message, 'Body.context received by extensibility point is not an object');
                Assert.equal(data, undefined);
                done();
            });
        });
    });

    it('rejects calls with invalid payload (bad connection)', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(); };'
        }, function (error, func) {
            Assert.ifError(error);
            simulate(func, {
                body: { user: {}, context: { connection: 'bad connection' } },
                headers: {},
                method: 'POST',
            }, function (error, data) {
                Assert.ok(error);
                Assert.equal(error.statusCode, 500);
                Assert.equal(error.message, 'Body.context.connection received by extensibility point is not an object');
                Assert.equal(data, undefined);
                done();
            });
        });
    });

    it('rejects calls without authorization secret', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(); };'
        }, function (error, func) {
            Assert.ifError(error);
            simulate(func, {
                body: { user: {}, context: { connection: {} } },
                secrets: { 'auth0-extension-secret': 'foo' },
                headers: {},
                method: 'POST',
            }, function (error, data) {
                Assert.ok(error);
                Assert.equal(error.statusCode, 500);
                Assert.equal(error.message, 'Unauthorized extensibility point');
                Assert.equal(data, undefined);
                done();
            });
        });
    });

    it('rejects calls with wrong authorization secret', function (done) {
        compiler({
            nodejsCompiler,
            script: 'module.exports = function(user, context, cb) { cb(); };'
        }, function (error, func) {
            Assert.ifError(error);
            simulate(func, {
                body: { user: {}, context: { connection: {} } },
                secrets: { 'auth0-extension-secret': 'foo' },
                headers: { 'authorization': 'Bearer bar' },
                method: 'POST',
            }, function (error, data) {
                Assert.ok(error);
                Assert.equal(error.statusCode, 500);
                Assert.equal(error.message, 'Unauthorized extensibility point');
                Assert.equal(data, undefined);
                done();
            });
        });
    });
});
