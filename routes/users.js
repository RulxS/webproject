var express = require('express');
var router = express.Router();
const fs = require('fs');
var multer = require('multer');  // require means include package


// New stuff
var env = require('dotenv').config();
const Client = require('pg').Client;
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
client.connect(); //connect to database

var passport = require('passport');
var bcrypt = require('bcryptjs');
// new stuff ends here







var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploadDir')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.png')
  }
});

var upload = multer({ storage }) // will create a folder nme "uploadDir"


// modify this module
/* GET users listing. */
router.get('/', function (req, res, next) {
  //res.send('respond with a resource');


  res.render('login', { user: req.user }); //display user.hbs
});

// new stuff again
router.get('/logout', function (req, res) {
  req.logout(); //passport provide it
  res.redirect('../'); // Successful. redirect to localhost:3000/users
});

function loggedIn(req, res, next) {
  if (req.user) {
    next(); // req.user exists, go to the next function (right after loggedIn)
  } else {
    res.redirect('/users/login'); // user doesn't exists redirect to localhost:3000/users/login
  }
}

router.get('/home', loggedIn, function (req, res) {
  // req.user: passport middleware adds "user" object to HTTP req object
  images = fs.readdirSync('./public/uploadDir');
  images.forEach(element => {
    console.log(element);
  });
  res.render('home', {
    imagefile: images
  });
});
router.post('/home', loggedIn, function (req, res) {
  // req.user: passport middleware adds "user" object to HTTP req object

  res.render('home');
});
router.get('/createEvent', loggedIn, function (req, res) {
  // req.user: passport middleware adds "user" object to HTTP req object

  res.render('createEvent');
});

router.post('/createEvent', loggedIn, function (req, res) {
  client.query('INSERT INTO events (event, date, description) VALUES($1, $2, $3)', [req.body.event, req.body.date, req.body.paragraph], function (err, result) {
    if (err) {
      console.log("unable to query INSERT");
      return next(err); // throw error to error.hbs.
    }
    console.log("event creation is successful");
    res.redirect('/users/createEvent?success=true');
  });
});

router.get('/carmeets', function(req, response, next) {
  // client object enables issuing SQL queries
  client.query('SELECT * FROM events WHERE event=$1', ["Car Meet"], function(err, result){
    if (err) {next(err);}
    response.render('carmeets',result);
  });
});

router.get('/carshows', function(req, response, next) {
  // client object enables issuing SQL queries
  client.query('SELECT * FROM events WHERE event=$1', ["Car Show"], function(err, result){
    if (err) {next(err);}
    response.render('carshows',result);
  });
});

router.get('/drift', function(req, response, next) {
  // client object enables issuing SQL queries
  client.query('SELECT * FROM events WHERE event=$1', ["Drift"], function(err, result){
    if (err) {next(err);}
    response.render('drift',result);
  });
});

router.get('/drag', function(req, response, next) {
  // client object enables issuing SQL queries
  client.query('SELECT * FROM events WHERE event=$1', ["Drag"], function(err, result){
    if (err) {next(err);}
    response.render('drag',result);
  });
});

router.get('/race', function(req, response, next) {
  // client object enables issuing SQL queries
  client.query('SELECT * FROM events WHERE event=$1', ["Race"], function(err, result){
    if (err) {next(err);}
    response.render('race',result);
  });
});

router.get('/uploadpic', loggedIn, function (req, res) {
  // req.user: passport middleware adds "user" object to HTTP req object

  res.render('uploadpic');
});

router.post('/upload', upload.single('file_up'), function (req, res) {

  res.render('uploadpic', {
    filename: req.file.filename
  });
});


router.get('/profile', loggedIn, function (req, res) {
  // req.user: passport middleware adds "user" object to HTTP req object
  res.render('profile', { person: req.user });
});

function encryptPWD(password) {
  var salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

router.post('/profile', function (req, res, next) {
  var result = bcrypt.compareSync(req.body.current, req.user.password);
  if (result) {
    var check1 = 1;
  }
  else {
    check1 = 0;
  }
  if (req.body.new1 == req.body.new2) {
    var check2 = 1;
  }
  else {
    check2 = 0;
  }
  if (check1 == 1 && check2 == 1) {
    var newpass = encryptPWD(req.body.new1);
    client.query('UPDATE users SET password=$1 WHERE username=$2', [newpass, req.user.username]);
  }
  res.render('profile', {
    user: req.user,
    pass: check1 == 0,
    newpass: check2 == 0,
    success: check1 == 1 && check2 == 1
  });
});

function notLoggedIn(req, res, next) {
  if (!req.user) {
    next();
  } else {
    res.redirect('/users/home');
  }
}

router.get('/login', notLoggedIn, function (req, res) {
  //success is set true in sign up page
  //req.flash('error') is mapped to 'message' from passport middleware
  res.render('login', { success: req.query.success, errorMessage: req.flash('error') });
});

router.post('/login',
  // This is where authentication happens - app.js
  // authentication locally (not using passport-google, passport-twitter, passport-github...)
  passport.authenticate('local', { failureRedirect: 'login', failureFlash: true }),
  function (req, res, next) {
    res.redirect('/users/home'); // Successful. redirect to localhost:3000/users/profile
  });

router.get('/signup', function (req, res) {
  // If logged in, go to profile page
  if (req.user) {
    return res.redirect('/users/home');
  }
  res.render('signup'); // signup.hbs
});

// check if username has spaces, DB will whine about that
function validUsername(username) {
  var login = username.trim(); // remove spaces
  return login !== '' && login.search(/ /) < 0;
}

function createUser(req, res, next) {

  var salt = bcrypt.genSaltSync(10);
  var pwd = bcrypt.hashSync(req.body.password, salt);

  client.query('INSERT INTO users (username, password) VALUES($1, $2)', [req.body.username, pwd], function (err, result) {
    if (err) {
      console.log("unable to query INSERT");
      return next(err); // throw error to error.hbs.
    }
    console.log("User creation is successful");
    res.redirect('/users/home?success=true');
  });
}

router.post('/signup', function (req, res, next) {
  // Reject users
  if (!validUsername(req.body.username)) {
    return res.render('signup');
  }

  client.query('SELECT * FROM users WHERE username=$1', [req.body.username], function (err, result) {
    if (err) {
      console.log("sql error ");
      next(err); // throw error to error.hbs.
    }
    else if (result.rows.length > 0) {
      console.log("user exists");
      res.render('signup', { errorMessage: "true" });
    }
    else {
      console.log("no user with that name");
      createUser(req, res, next);
    }
  });
});
// new stuff ends here

module.exports = router;