var secrets = require('./config/secrets');
var mongoose = require('mongoose');
var express = require('express');
var async = require('async');
var i = require('./config/i');

var Twitter = require('./models/Twitter');

var app = express();

mongoose.connect(secrets.mongodb);
mongoose.connection.on('error', function() {
    console.error('MongoDB Connection Error. Please make sure that MongoDB is running.',secrets.mongodb);
});
mongoose.connection.on('connected', function(){
    console.log('Connected to MongoDB');
});

app.get('/tw/:username', function(req,res){
    var name = req.params.username;
    getTwitterProfile(name, function(err, profile){
        res.redirect(profile.profile_image_url);
    });
});

app.get('/:username', function(req,res){
    var name = req.params.username;
    var html = '<img src="/tw/' + name + '" />';
    res.send(html);
});

app.listen(80);

function getTwitterProfile(name, cb){

    async.waterfall(
        [
            function(callback) {
                console.log('db search');
                Twitter.findOne({username: name}, function (err, data) {
                    callback(null, data);
                });
            }, function(profile, callback){
            if(profile){
                console.log('using cache');
                callback(null, profile.raw);
            }else{
                console.log('hitting twitter api');
                var twit = i.twit();

                search = {
                    q: name
                };

                twit.get('/users/search', {q: name}, function(err,data,res){
                    data = data[0];

                    var newTwitter = new Twitter();
                    newTwitter.username = data.screen_name;
                    newTwitter.raw = data;
                    newTwitter.save(function(){
                        console.log('new user saved', this.screen_name);
                    });
                    callback(null, data);
                });
            }
        }
        ], function(err, result){
            cb(err, result)
        }
    );
}