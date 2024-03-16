require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path')
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = 3000;
const axios = require('axios');


// Express Config
app.set('view engine', 'ejs'); 
app.set('views', __dirname + '/views');  
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
mongoose.connect(process.env.URL, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));    

app.use(bodyParser.json());
app.use(session({ secret: 'ani', resave: false, saveUninitialized: true }));

// User Schema
const userSchema = new mongoose.Schema({
    username: {
      type: String,
      unique: true
    },
    batch: String,
    fullname: String,
    password: String,
});
// Problem Schema
const probSchema = new mongoose.Schema({
  id: String,
	title: String,
	difficulty: String,
	category: String,
  batches: {
    type: [String]
  },
  statement: String,
  tc: String,
  sl: String,
  hint: String
});

// Pre processing for password
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    next();
  });

// Model Initialization
const User = mongoose.model('User', userSchema);
const Prob = mongoose.model('Prob', probSchema);


// isLogin
const isLogin = (req, res, next) => {
  if (!req?.session?.user){
    return res.redirect('/login');
  }
  next();
};


// Home
app.get('/', async(req, res) => {
  if (!req?.session?.user){
    res.render('index.ejs',{log: 0})
  }
  else{
    let problems = await Prob.find({ batches: req.session.user.batch });
    if (problems != []){
      res.render('home', {user: req.session.user, log: 1, problems: problems})
    } else{
      res.render('home', {user: req.session.user, log: 1, problems: 'none'})
    }
  }
})


//  /problems/:id
app.get('/problems/:id', isLogin, async (req, res) => {
  try {
    const problemId = req.params.id;

    const problem = await Prob.findOne({ id: problemId });
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    res.render('problem', { user: req.session.user, log: 1, problem: problem});
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// register
app.get('/register', async(req,res)=>{
    res.render('register.ejs', {log: 0})
})


// home
app.get('/home',isLogin, async(req,res)=>{
  let problems = await Prob.find({ batches: req.session.user.batch });
  if (problems != []){
    res.render('home', {user: req.session.user, log: 1, problems: problems})
  } else{
    res.render('home', {user: req.session.user, log: 1, problems: ['none']})
  }})


// login
app.get('/login', async(req,res)=>{
    res.render('login.ejs', {log: 0})
})

// profile
app.get('/profile', isLogin, (req, res) => {
  res.render('profile', { user: req.session.user , log: 1});
});


// POST Routes


// register
app.post('/register', async (req, res) => {
    try {
      if (req.body.admin == process.env.ADMIN){
      console.log('New User');
      const {username, fullname, batch, password} = req.body;
      const user = new User({username: username, fullname:fullname, batch: batch, password: password})
      await user.save();
      req.session.user = user;
      res.redirect('/profile');
      } else{
        console.error('NOT ADMIN');
      res.status(500).json({ message: 'NOT ADMIN' });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Error creating user' });
    }
  });


// login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({ username });
  
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      req.session.user = user;
      res.redirect('/profile');
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
});


// logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/login'); 
    });
  });

// Execute (JDOODLE)
app.post('/execute', async (req, res) => {
  try {
    console.log("Execute req came");
      const varData = req.body;

      const response = await fetch('https://api.jdoodle.com/v1/execute', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(varData)
      });

      if (!response.ok) {
          throw new Error('Failed to fetch data from XYZ API');
      }

      const result = await response.json();
      console.log(result);
      res.json(result);
  } catch (error) {
      console.error('Error processing data:', error.message);
      res.status(500).json({ error: 'An error occurred while processing the data' });
  }
});



// Server start
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
