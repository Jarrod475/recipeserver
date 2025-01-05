//for everything else...
import express  from "express";
import cors from "cors";
import 'dotenv/config';
import { OAuth2Client }  from "google-auth-library";
//for the database stuff
import pg from "pg";

//connecting to the Postgres database...
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "recipes",
    password: "password",
    port: 5432
  });
  db.connect();

  async function registerUser(email, name){
    await db.query('INSERT INTO users (email,name) VALUES ($1,$2)',[email,name]);
    console.log("user registered!!!");
  }


const app = express();
const PORT = 5000;
const CLIENT_ID = "1022244509768-97geajdtudjrotncr2urjmrdeuuqkmkv.apps.googleusercontent.com"
const client = new OAuth2Client(CLIENT_ID);
const corsOptions = {
    origin: 'http://localhost:3000', // Allow requests from this origin
    methods: ['GET', 'POST'], // Specify allowed HTTP methods
    allowedHeaders: ['Content-Type','Authorization','token'], // Allow these headers in requests
  };

app.use(cors(corsOptions));


//With this verifytoken function we are creating our own middleware.
        // usefull info :
        //"Middleware, such as the verifyToken function, processes the request, 
        // verifies the token, and attaches the user data to req.user."
const verifyToken = async (req, res, next) => {
    const token = req.headers.token;
    //checks to see if a token is attached!
    if (!token) {
        console.log("NO TOKEN!!!");
      return res.status(401).json({ error: 'Token missing or malformed!' });
    }

    try {
        // Verify the token is legit
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: CLIENT_ID, // Ensure token is meant for your app!!!
        });

    
        // Extract user data from the payload
        const payload = ticket.getPayload();
        //HERE IS ATTACHES IT TO THE REQ!
        req.user = {
          googleId: payload.sub, 
          email: payload.email,
          name: payload.name,
        };
       


        next(); 
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Invalid token' });
    }}


      // request to verify user.
      app.post('/auth', verifyToken, (req,res) => {
        // ------------------------CONTINUE FROM HERE!!!  ---------------------------------- 
        res.json({message: `welcome ${req.user.name}`});
        registerUser(req.user.email,req.user.name);
      });

      //start the app!
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));