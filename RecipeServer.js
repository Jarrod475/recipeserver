//for everything else...
import express  from "express";
import cors from "cors";
import 'dotenv/config';
import { OAuth2Client }  from "google-auth-library";
//for the database stuff
import pg from "pg";

var currentUser = "";

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
    const data = (await db.query('SELECT COUNT(1) FROM users WHERE email = $1',[email])).rows[0];
    if (data.count == 0){
      await db.query('INSERT INTO users (email,name) VALUES ($1,$2)',[email,name]);
      console.log("user registered : ", name);
    }else{
      console.log("user logged in : ", name);
    }
    currentUser = email;
  }

  async function getRecipes(){
    const data = await  db.query("SELECT id , name,ingredients, instructions FROM recipe_list WHERE owner_email = $1",[currentUser]);
    console.log(data.rows);
    return data.rows;
  }

const app = express();
const PORT = 5000;
const CLIENT_ID = "1022244509768-97geajdtudjrotncr2urjmrdeuuqkmkv.apps.googleusercontent.com"
const client = new OAuth2Client(CLIENT_ID);
const corsOptions = {
    origin: 'http://localhost:3000', // Allow requests from this origin
    methods: ['GET', 'POST','DELETE'], // Specify allowed HTTP methods
    allowedHeaders: ['Content-Type','Authorization','token'], // Allow these headers in requests
  };

app.use(express.json());
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
        registerUser(req.user.email,req.user.name);
        res.json({success: true});
        
      });
      //handles the recipes route, returning all the recipes of the current user.
      app.get('/recipes',async(req,res)=>{ 
       res.json({recipes : await getRecipes()});
       console.log('recipes are now :', await getRecipes());  
      });

      //handles the new recipes added by the user.
      app.post('/add',async(req,res)=>{
        await db.query('INSERT INTO recipe_list (name, instructions,ingredients,owner_email) VALUES ($1,$2,$3,$4)', [req.body.Name,req.body.Instructions,req.body.Ingredients,currentUser]);
        res.send({message : "successfully added new recipe"})
        console.log("recipe added successfully to owner : ", currentUser);
      });

      //handles the changed recipes
      app.post('/edit',async(req,res)=>{  
        console.log("data is : ", req.body.data.recipe , req.body.data.recipeID)
        await db.query('UPDATE recipe_list SET  name = $1 , instructions = $2 ,ingredients = $3 WHERE id = $4', [req.body.data.recipe.Name,req.body.data.recipe.Instructions,req.body.data.recipe.Ingredients,req.body.data.recipeID  ]);
        res.send({message : "successfully added new recipe"})
        console.log("recipe added successfully to owner : ", currentUser);
      });

      app.delete('/delete',async(req,res)=>{
        await db.query('DELETE FROM recipe_list WHERE id = $1', [req.body.recipeID]);
        res.send({message: "recipe Successfully deleted..."});
      });


      //start the app!
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));