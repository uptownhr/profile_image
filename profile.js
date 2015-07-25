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

app.get('/:username', function(req,res){
    var name = req.params.username;
    getTwitterProfile(name, function(err, profile){
	if(err){
	    res.status(404).send(err);
	}else{
            res.send(profile);
	}
    });
});

//return users total reach
//count of all of users followers, followers
app.get('/total-reach/:username', function(req,res){
    var username = req.params.username;
    getTwitterProfileFollowers(username, function(err, follower_ids){
	if(!follower_ids){
	    return res.status(404).send(err);
	}
        var query = {
            $match: {
                id: {
                    $in: follower_ids
                }
            }
        };

        var group = {
            $group: {
                _id: null,
                total: { $sum: "$raw.followers_count" }
            }
        };

        var project = {
            $project:{
                _id: 0,
                total: 1
            }
        };

        Twitter.aggregate(query, group, project, function(err, count){
	    if(err || !count){
                res.send([err,count]);
            }else{
                res.send(count[0]);
            }
        });
    });
});

//populate followers for anyone that doesn't have followers populated
//per rate limit of 15
app.get('/followers/populate', function(req,res){
    var rate_limit = 15;
    Twitter.find({follower_ids: {$size: 0}, 'raw.followers_count': {$gt: 0}, 'raw.protected': false}).limit(rate_limit).exec(function(err, profiles) {
        async.eachSeries(profiles, function(profile,callback){
            console.log('populating followers for ', profile.username);

            getTwitterProfileFollowers(profile.username, function(err, follower_ids){
                if(err){
                    console.log('error populating followers for ', profile.username);
                    if(err.statusCode != 429 ){ //429 is rate limit hit
                        profile.remove();
                        return callback();
                    }
                }



                callback(err);
            });
        }, function(err){
            if(err){ return res.send(err); }

            res.send('done');
        });
    });
});

//populate following for anyone that doesn't have following populated
//per rate limit of 15
app.get('/friends/populate', function(req,res){
    console.log('/friends/populate');
    var rate_limit = 15;
    Twitter.find({friend_ids: {$size: 0}, 'raw.friends_count': {$gt: 0}, 'raw.protected': false}).limit(rate_limit).exec(function(err, profiles) {
//why are the same guys showing up
	console.log('profiles count: ', profiles.length);
        async.eachSeries(profiles, function(profile,callback){ //why is this not synchronous?
            console.log('populating friends for ', profile.username);

            getTwitterProfileFriends(profile.username, function(err, follower_ids){
                console.log(err);
                if(err){
                    console.log('error populating friends for ', profile.username);
                    if(err.statusCode != 429 ){ //429 is rate limit hit
                        profile.remove();
                        return callback();
                    }
                }
		console.log('should be once per');
                callback(err);
            });
        }, function(err){
	    console.log('done populate friends');
            if(err){ return res.send(err); }

            res.send('done');
        });
    });
});


//loop through users followers and populate profile data
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
                            if(err){
                                return callback(err);
                            }

                            success_count++;

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

app.listen(8080);

function getTwitterProfileFriends(username, cb){
    async.waterfall(
        [
            function(callback){
                getTwitterProfile(username, callback);
            },
            function(profile,callback){
                //check if db has followers
                //if not pull from twitter
                if (!profile){ return callback('cannot find username'); }

                if(profile.friend_ids.length > 0){
                    callback(null, profile.friend_ids);
                }else{
                    var twit = i.twit();
                    console.log(profile.username);
                    twit.get('/friends/ids', {screen_name: profile.username, count: 5000}, function(err, data){
                        if(err){
                            console.log(err);
                            return callback(err);
                        }
                        console.log('friends', data.ids.length);

			if(data.ids.length == 0){
			    profile.raw.friends_count = 0;
			    profile.markModified('raw');
			}

                        profile.friend_ids = data.ids;

                        profile.save(function(err, profile){
			    console.log(err, profile.raw.friends_count);
                            callback(err, profile.friend_ids);
                        });
                    });
                }
            }
        ],cb
    )
}

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
                        if(err){
                            console.log(err);
                            return callback(err);
                        }
                        console.log('followers', data.ids.length);

			if(data.ids.length == 0){
			    profile.raw.followers_count = 0;
			    profile.markModified('raw');
			}

                        profile.follower_ids = data.ids;

                        profile.save(function(err, profile){
			    console.log( err, profile.raw.followers_count );
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
                    callback(err, data);
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
                        callback(err, profile);
                    });
                });
            }
        }
        ], function(err, result){
            cb(err, result)
        }
    );
}