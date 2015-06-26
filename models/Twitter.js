var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var twit = require('twit');

var twitterSchema = new mongoose.Schema({
    username: { type: String, index: true, unique: true, required: true },
    raw: {},
    created_at: { type: Date, default: Date.now() },
    updated_at: { type: Date, default: Date.now(), index: true },
    accessed_at: { type: Date, default: Date.now(), index: true }
});

module.exports = mongoose.model('Twitter', twitterSchema);