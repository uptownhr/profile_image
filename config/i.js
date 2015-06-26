var secrets = require('./secrets');
var Twit = require('twit');


module.exports = {
    twit: function(){
        var twitter_config = {
            consumer_key: secrets.twitter.consumerKey,
            consumer_secret: secrets.twitter.consumerSecret,
            access_token: secrets.twitter.accessToken,
            access_token_secret: secrets.twitter.accessTokenSecret
        };

        console.log(twitter_config);

        var twit = new Twit( twitter_config );

        return twit;
    }
}