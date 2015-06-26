# profile_image
Getting you the latest profile images so you don't have to

# Getting Started
First and foremost, you will have to update the config/secrets twitter keys with your own.

Get a mongo database up or if you have docker working, use the command
`docker-compose up`

# API Endpoints
`/tw/:username` Will redirect you to the user's profile image

`/:username` shows an example of the user's profile image

# Demo
Checkout the api @ [images.jlee.biz](http://images.jlee.biz) and pass in a username. 

Redirect: [http://images.jlee.biz/tw/jleebiz](http://images.jlee.biz/tw/jleebiz)

Sample: [http://images.jlee.biz/jleebiz](http://images.jlee.biz/jleebiz)
