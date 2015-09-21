require('habitat').load();
var Path = require('path');

var Hapi = require('hapi');
var Good = require('good');

var httpRequest = require('request');

var server = new Hapi.Server();
server.connection({
  host: process.env.HOST,
  port: process.env.PORT
});

server.route([
  {
     method: 'GET',
     path: '/{params*}',
     handler: {
       directory: {
         path: Path.join(__dirname, 'public')
       }
     }
  }, {
    method: 'POST',
    path: '/api/signup',
    handler: function(request, reply) {
      var payload = request.payload || {};
      var mailingList = !!payload['signup-mailing'];
      if (mailingList) {
        httpRequest({
          url: 'https://sendto.mozilla.org/page/signup/EOYFR2014-donor',
          method: "POST",
          form: {
            'opt_in': '1',
            email: payload.email
          }
        }, function(err, httpResponse, body) {
          if (err) {
            return console.error('signup failed:', err);
          }
        });
      }
      httpRequest({
        url: 'https://sendto.mozilla.org/page/s/test-signup',
        method: "POST",
        form: {
          firstname: payload.firstname,
          lastname: payload.lastname,
          country: payload.country,
          email: payload.email,
          'custom-3586': payload['privacy-checkbox']
        }
      }, function(err, httpResponse, body) {
        if (err) {
          return console.error('signature failed:', err);
        }
        reply.redirect("/data-retention/thank-you/");
      });
    }
  }
]);

// This will catch all 404s and redirect them to root URL
// with preserving the pathname for client-side to handle.
server.ext('onPreResponse', function(request, reply) {
  if(request.response.output && [403, 404].indexOf(request.response.output.statusCode) >= 0) {
    return reply.redirect('/data-retention');
  }
  return reply.continue();
});

server.register({
  register: Good,
  options: {
    reporters: [{
      reporter: require('good-console'),
      events: {
        response: '*',
        log: '*'
      }
    }]
  }
}, function (err) {
  if (err) {
    throw err;
  }

  server.start(function () {
    server.log('info', 'Server running at: ' + server.info.uri);
  });
});
