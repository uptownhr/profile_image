module.exports = {
    mongodb: process.env.MONGODB || 'mongodb://mongodb:27017/profile_images',

    twitter: {
        consumerKey: process.env.TWITTER_KEY || 'BdGgSkPiq6GD7ZZRGxaMnuekt',
        consumerSecret: process.env.TWITTER_SECRET  || 'omLfyHPQiB535QARrr1WI43Mp03mLBuRtCoREVoatfRzZVqgsV',
        accessToken: process.env.ACCESS_TOKEN || '1408850774-2DLs1IfDT9Vpy3dnAuJU2kxakzsirUsZWBrnzyt',
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET  || '0KA0mtKiDJc6mPEaoBWY0XuMsyCULR3uCJtmutlvkpaDe',
        callbackURL: '/auth/twitter/callback',
        passReqToCallback: true
    }
}