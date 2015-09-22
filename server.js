require('habitat').load();

var Countries = require('country-data').countries.all.map( c => c.alpha2 );
var Good = require('good');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Joi = require('joi');
var Boom = require('boom');
var Path = require('path');
var Signup = require('./lib/signup')(process.env.BASKET_HOST);

Hoek.assert(process.env.BASKET_HOST, 'You must define BASKET_HOST in config');

var server = new Hapi.Server();
server.connection({
  host: process.env.HOST,
  port: process.env.PORT
});

var campaigns = Object.keys(require('./lib/campaigns'));

server.register([
  {
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
  },
  require('inert')
], function (registrationError) {
  Hoek.assert(!registrationError, registrationError);

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
      method: 'GET',
      path: '/',
      handler: function(request, reply) {
        reply.redirect('/data-retention/');
      }
    }, {
      method: 'POST',
      path: '/api/signup',
      config: {
        validate: {
          payload: {
            petition: Joi.string().equal(campaigns),
            firstname: Joi.string(),
            lastname: Joi.string(),
            country: Joi.string().equal(Countries),
            email: Joi.string().email(),
            'privacy-checkbox': Joi.boolean(),
            'signup-mailing': Joi.boolean().default(false)
          }
        }
      },
      handler: function(request, reply) {
        Signup(request.payload, function(signupError) {
          if (signupError) {
            return reply(Boom.wrap(signupError, 500, 'Unable to signup'));
          }

          reply.redirect('/data-retention/thank-you/');
        });
      }
    }
  ]);

  // This will catch all 404s and redirect them to root URL
  // with preserving the pathname for client-side to handle.
  server.ext('onPreResponse', function(request, reply) {
    if (request.response.output && [403, 404].indexOf(request.response.output.statusCode) >= 0) {
      return reply.redirect('/data-retention/');
    }
    return reply.continue();
  });

  server.start(function () {
    server.log('info', 'Server running at: ' + server.info.uri);
  });
});
