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

app.get('/followers/:username', function(req,res){
    var username = req.params.username;

    getTwitterProfileFollowers(username, function(err, profile){
        if(err){
            res.send(err);
        }else{
            res.send(profile);
        }
    })
});


//loop through users follow and populate profile data
app.get('/followers/:username/populate', function(req,res){
    var username = req.params.username;

    getTwitterProfileFollowers(username, function(err, follower_ids){
        if(err){
            res.send(err);
        }else{
            if(follower_ids.length > 0){
                //start populating user profiles
                //find out which ids are not in db
                Twitter.find({},{id: true}).lean().exec( function(err, docs){
                    db_ids = docs.map(function(doc){
                        return doc.id;
                    });

                    //filter out ids that are in the db
                    populate_ids = follower_ids.reduce(function(prev, curr){
                        exists = db_ids.some( function(id){
                            return id == curr;
                        });

                        if(!exists){
                            prev.push(curr);
                        }

                        return prev;
                    },[]);

                    //break up populate_ids into groups of 100
                    var grouped_ids = [];
                    while( populate_ids.length > 0 ){
                        ids = populate_ids.splice(0,100);
                        grouped_ids.push(ids);
                    }

                    //hit twitter api with each group
                    //count success and stop after 15 per rate limit
                    var twit = i.twit();
                    var success_count = 0;
                    async.eachSeries(grouped_ids, function(ids, callback){
                        if(success_count >=15 ){
                            console.log('should exit');
                            return callback('exit early');
                        }
                        twit.get('/users/lookup', {user_id: ids.join(',')}, function(err, data){
                            if(!err){
                                success_count++;
                            }

                            async.eachSeries(data, function(user, callback){
                                var newTwitter = new Twitter();
                                newTwitter.id = user.id;
                                newTwitter.username = user.screen_name;
                                newTwitter.raw = user;
                                newTwitter.save(function(err,saved){
                                    if(err) console.log(err);
                                    callback();
                                });
                            });

                            //save each profile into db
                            console.log(success_count);
                            callback();
                        });

                    }, function(err){
                        console.log('finished', err);
                        res.send('finished');
                    });
                });
            }
        }
    });

});

app.listen(8080);

function getTwitterProfileFollowers(username, cb){
    async.waterfall(
        [
            function(callback){
                getTwitterProfile(username, callback);
            },
            function(profile,callback){
                //check if db has followers
                //if not pull from twitter
                if (!profile){ return callback('cannot find username'); }

                if(profile.follower_ids.length > 0){
                    callback(null, profile.follower_ids);
                }else{
                    var twit = i.twit();
                    console.log(profile.username);
                    twit.get('/followers/ids', {screen_name: profile.username, count: 5000}, function(err, data){
                        console.log('followers', data.ids.length);
                        profile.follower_ids = data.ids;

                        profile.save(function(err, profile){
                            callback(err, profile.follower_ids);
                        });
                    });
                }
            }
        ],cb
    )
}

function getTwitterProfile(name, cb){

    async.waterfall(
        [
            function(callback) {
                var regex = new RegExp(["^",name,"$"].join(""),"i");
                Twitter.findOne({username: regex}, function (err, data) {
                    callback(null, data);
                });
            }, function(profile, callback){
            if(profile){
                callback(null, profile);
            }else{
                var twit = i.twit();
                twit.get('/users/show', {screen_name: name}, function(err,data,res){
                    if(err){ return callback(err); }
                    var newTwitter = new Twitter();
                    newTwitter.id = data.id;
                    newTwitter.username = data.screen_name;
                    newTwitter.raw = data;
                    newTwitter.save(function(err, profile){
                        console.log('new user saved', data.screen_name);
                        callback(null, profile);
                    });
                });
            }
        }
        ], function(err, result){
            cb(err, result)
        }
    );
}