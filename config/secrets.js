module.exports = {
    mongodb: process.env.MONGODB || 'mongodb://mongodb:27017/social',

    twitter: {
        consumerKey: process.env.TWITTER_KEY || 'rkiZIklhPqSI51duYcTlFJor1',
        consumerSecret: process.env.TWITTER_SECRET  || 'CsIScvbAWp2whPKg66T34VoraRSbCzGSQXDHM3bptGzsrZtiXl',
        accessToken: process.env.ACCESS_TOKEN || '139363532-8ImkuJ4Ws2akzrXLb8XeZpoOcF50nfjgHheTDUpU',
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET  || '1qQWhpO08yqWo3r2VFvptYnN7aIyaJwFBm6HPgYhegP3b',
        callbackURL: '/auth/twitter/callback',
        passReqToCallback: true
    }
}