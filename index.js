const redis = require('redis');
const async = require('async');
require('redis-scanstreams')(redis);
const connects = [];
const balancer = {
    init : function(configs, done) {
        async.each(
            configs,
            function(config, next_config) {
                var connect = redis.createClient(config)
                    .on('connect', function() {
                        console.log('redis %j connected', config);
                        connects.push(connect);
                        next_config();
                    })
                    .on('reconnecting', function(params) {
                        console.log('redis reconnecting', params);
                    })
                    .on('error', function(err) {
                        console.log('redis error:', err);
                    });
            },
            function() {
                done()
            }
        );
    },
    connect_by_key : function(key) {
        var sum = 0;
        for(var i = 0; i < key.length; i++) sum+=key.substr(i,1).charCodeAt();
        return connects[sum % connects.length];
    }
};
const methods = ["get","set","mset","setex","expire","rpush","lrange","rtrim"];
methods.forEach(function(method) {
    balancer[method] = function() {
        var conn = connect_by_key(arguments[0]);
        return conn[method].apply(conn, arguments);
    };
})

module.exports = balancer
