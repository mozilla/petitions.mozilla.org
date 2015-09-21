var Boom = require('boom');
var Campaigns = require('./campaigns');
var Request = require('request');

module.exports = (basketHost) => {
  return (payload, callback) => {
    var campaign = Campaigns[payload.petition];

    if (!campaign) {
      return callback(new Error('No campaign data for "' + payload.petition + '"'));
    }

    Request.post({
      url: campaign.bsd,
      form: {
        firstname: payload.firstname,
        lastname: payload.lastname,
        country: payload.country,
        email: payload.email,
        'custom-3586': payload['privacy-checkbox']
      }
    }, (bsdError, response) => {
      if (bsdError) {
        return callback(Boom.wrap(bsdError, 500, 'Unable to complete BSD signup'));
      }

      if (response.statusCode != 302) {
        return callback(Boom.create(response.statusCode, 'BSD HTTP error', { url: campaign.bsd }));
      }

      if (!payload['signup-mailing']) {
        return callback();
      }

      Request.post({
        url: basketHost + '/news/subscribe/',
        form: {
          format: 'html',
          lang: campaign.lang,
          newsletters: campaign.newsletters,
          trigger_welcome: 'N',
          source_url: campaign.source_url,
          country: payload.country,
          email: payload.email
        },
        json: true
      }, (basketError, response, body) => {
        if (basketError) {
          return callback(Boom.wrap(basketError, 500, 'Unable to complete Basket signup'));
        }

        if (response.statusCode != 200) {
          return callback(Boom.create(response.statusCode, 'Basket HTTP error', body));
        }

        callback();
      });
    });
  };
};
