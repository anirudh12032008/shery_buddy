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


// gemini
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const genAI = new GoogleGenerativeAI(process.env.API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-pro"});



// User Schema
const userSchema = new mongoose.Schema({
    points: Number,
    username: {
      type: String,
      unique: true
    },
    batches: {
      type: [String]
    },
    languages: {
      type: [String]
    },
    fullname: String,
    password: String,
    solved: [String]
});
// Files Schema
const fileSchema = new mongoose.Schema({
    id: {
      type: String,
      unique: true
    },
    filename: String,
    content: String,
    batch: String,
    author: String,
    createdAt: {
      type: Date,
      default: Date.now
  }
});
// Problem Schema
const probSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true
  },
	title: String,
  points: Number,
	difficulty: String,
	category: String,
  languages: {
    type: [String]
  },
  statement: String,
  tc1: String,
  tc1o: String,
  tc2: String,
  tc2o: String,
  hints: String
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
const File = mongoose.model('File', fileSchema);


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
    let problems = await Prob.find({ languages: { $elemMatch: { $in: req.session.user.languages } } });
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

//  /files/:id
app.get('/files/:id', isLogin, async (req, res) => {
  try {
    const fileId = req.params.id;
    
    const file = await File.findOne({ id: fileId });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.render('file', { user: req.session.user, log: 1, file: file});
  } catch (error) {
    console.error('Error fetching File:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//  /leaderboard/:id
app.get('/leaderboard/:id', isLogin, async (req, res) => {
  try {
    const batch = req.params.id;
    
    const usersWithBatch = await User.find({ batches: batch })
    .sort({ points: -1 })
    .exec();
    if (!usersWithBatch) {
      return res.status(404).json({ message: 'No user' });
    }

    res.render('leaderboard', { user: req.session.user, log: 1, users: usersWithBatch});
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// /user/:id
app.get('/user/:id', async (req, res) => {
  try {
      const userId = req.params.id;
      const user = await User.findOne({username:userId});
      const problems = await Prob.find();

      if (!user) {
          return res.status(404).send('User not found');
      }

      res.render('userdets', { user, problems,log: 1 });
  } catch (err) {
      console.error('Error fetching user details:', err);
      res.status(500).send('Internal Server Error');
  }
});




// register
app.get('/register', async(req,res)=>{
    res.render('register.ejs', {log: 0})
})


// create problem
app.get('/createprob', async(req,res)=>{
    res.render('createprob.ejs', {log: 0})
})


// create file
app.get('/createfile', async(req,res)=>{
    res.render('createfile.ejs', {log: 0})
})


// home
app.get('/home',isLogin, async(req,res)=>{
  let problems = await Prob.find({ languages: { $elemMatch: { $in: req.session.user.languages } } });
  if (problems != []){
    res.render('home', {user: req.session.user, log: 1, problems: problems})
  } else{
    res.render('home', {user: req.session.user, log: 1, problems: ['none']})
  }})


// files
app.get('/files',isLogin, async(req,res)=>{
  let files = await File.find({ batch: { $in: req.session.user.batches } })
  .sort({ createdAt: -1 });
if (files != []){
    res.render('files', {user: req.session.user, log: 1, files: files})
  } else{
    res.render('files', {user: req.session.user, log: 1, files: ['none']})
  }})


// login
app.get('/login', async(req,res)=>{
    res.render('login.ejs', {log: 0})
})

// profile
app.get('/profile', isLogin, (req, res) => {
  res.render('profile', { user: req.session.user , log: 1});
});


// leaderboards
app.get('/leaderboards', isLogin, (req, res) => {
  res.render('leaderboards', { user: req.session.user , log: 1});
});


// POST Routes


// register
app.post('/register', async (req, res) => {
    try {
      if (req.body.admin == process.env.ADMIN){
      const formData = req.body;

const userData = {
  username: formData.username,
  batches: formData.batches.split(','), 
  languages: formData.languages.split(','), 
  fullname: formData.fullname,
  password: formData.password
};
      const user = new User(userData)
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

  app.post('/submit-solution', async (req, res) => {
    const { problemId, pass, points } = req.body; 
    if (pass) {
        try {
            const updatedUser = await User.findOneAndUpdate(
                { _id: req.session.user._id, solved: { $ne: problemId } },
                { 
                    $addToSet: { solved: problemId },
                    $inc: { points: points } 
                },
                { new: true }
            );

            if (updatedUser) {
                req.session.user = updatedUser;
                res.status(200).send('Problem solved successfully');
            } else {
                console.log('Problem already solved by user');
                res.status(200).send('Problem already solved');
            }
        } catch (err) {
            console.error('Error updating user:', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.status(200).send('Problem not solved');
    }
});


// create problem
app.post('/createprob', async (req, res) => {
    try {
      if (req.body.admin == process.env.ADMIN){
      const formData = req.body;

const probData = {
  id: formData.id,
  points: formData.points,
  title: formData.title,
  difficulty: formData.difficulty,
  category: formData.category,
  languages: formData.languages.split(','), 
  statement: formData.statement,
  tc1: formData.tc1,
  tc1o: formData.tc1o,
  tc2: formData.tc2,
  tc2o: formData.tc2o,
  hints: formData.hints
};
      const prob = new Prob(probData)
      await prob.save();
      res.redirect('/createprob');
      } else{
        console.error('NOT ADMIN');
      res.status(500).json({ message: 'NOT ADMIN' });
      }
    } catch (error) {
      console.error('Error creating problem:', error);
      res.status(500).json({ message: 'Error creating problem' });
    }
  });


// create file
app.post('/createfile', async (req, res) => {
    try {
      if (req.body.admin == process.env.ADMIN){
        const { id, filename, content, batch, author, createdAt } = req.body;
        console.log(id, filename, content, batch, author, createdAt);
        let file
        if (createdAt) {
          file = new File({id, filename,content,batch,author,createdAt} )
        } else {
          file = new File({id, filename,content,batch,author} )
        }
      await file.save();
      res.redirect('/createfile');
      } else{
        console.error('NOT ADMIN');
      res.status(500).json({ message: 'NOT ADMIN' });
      }
    } catch (error) {
      console.error('Error creating file:', error);
      res.status(500).json({ message: 'Error creating file' });
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
// app.post('/execute', async (req, res) => {
//   try {
//     console.log("Execute req came");
//       const varData = req.body;

//       const response = await fetch('https://api.jdoodle.com/v1/execute', {
//           method: 'POST',
//           headers: {
//               'Content-Type': 'application/json'
//           },
//           body: JSON.stringify(varData)
//       });

//       if (!response.ok) {
//           throw new Error('Failed to fetch data from API');
//       }

//       const result = await response.json();
//       console.log(result);
//       res.json(result);
//   } catch (error) {
//       console.error('Error processing data:', error.message);
//       res.status(500).json({ error: 'An error occurred while processing the data' });
//   }
// });

// Execute (Gemini)
// app.post('/execute', async (req, res) => {
//   const {script, language} = req.body
//   const prompt = `
//   Given the following information:

//   1. Code:
//   ${script}
  
//   2. Language: ${language}
  
//   3. Test Case 1: [1,2]
  
//   4. Test Case 2: [-10,10]
  
//   Once you have provided the necessary information, please execute the code and obtain the output of the function with both test cases. If there is a compiler or runtime error, show that error as the output. Finally sthe response should only the json in the following JSON format:
  
//   {
//     "test_case_1_output_given_by_the_function": <OUTPUT_OF_TESTCASE1_GIVEN_BY_THE_FUNCTION>,
//     "test_case_2_output_given_by_the_function": <OUTPUT_OF_TESTCASE2_GIVEN_BY_THE_FUNCTION>
//   }
// `  
//   // console.log(script, language);
//   const model = genAI.getGenerativeModel({ model: "gemini-pro"});
//   const result = await model.generateContent(prompt)
//   const response = await result.response;
//   const text = response.text(); 
//   console.log(text);
//   res.json(text)
// })


app.post('/execute', async(req, res)=>{
  const x = await fetch("https://emkc.org/api/v2/piston/execute", {
                method: 'POST',
                body: JSON.stringify({
                    "language": `${req.body.language}`,
                    "version": "3.10.0",
                    "files": [{
                        "content": `${req.body.script}`
                    }]
                }),

            });
            const jsonResult = await x.json();
            res.json(jsonResult)
})

// Server start
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
