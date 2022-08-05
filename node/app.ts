import express from "express";

const app = express();

app.use(()=>{
    console.log("Bonjour les amis");
});

app.listen(3000,()=>{
    console.log(`Server listening on port 3000`);
});