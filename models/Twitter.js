var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var twit = require('twit');

var twitterSchema = new mongoose.Schema({
    id: { type: Number },
    username: { type: String, index: true, unique: true, required: true },
    follower_ids: [],
    raw: {},
    created_at: { type: Date, default: Date.now() },
    updated_at: { type: Date, default: Date.now(), index: true },
    accessed_at: { type: Date, default: Date.now(), index: true }
});

module.exports = mongoose.model('Twitter', twitterSchema);