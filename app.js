var express    = require("express");
var mysql      = require('mysql');
var bodyParser = require('body-parser');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'pass',
  database : 'db1'
});
var app = express();

app.use(bodyParser());


connection.connect(function(err){
if(!err) {
    console.log("Database is connected ... \n\n");  
} else {
    console.log("Error connecting database ... \n\n");  
}
});

app.get("/",function(req,res){
res.sendFile(__dirname + '/public/forms/form.html');
});


app.post("/",function(req,res){

var numQues = 10;
var totalDuration = 60 * 60;

connection.query('SELECT qid,duration from mcqbank order by duration', function(err, rows, fields) {
  if (!err)
    console.log('Query Done.');
  else
    console.log('Error while performing Query.');

	//get random ques
	var maxm = rows.length;
	for(var i=0; i<numQues; i++)
	{
		var r = random(maxm);
		//swap
		var temp = rows[i];
		rows[i] = rows[r];
		rows[r] = temp;
	}

	//fix
	//---
	//fix end

	//get ques
	var ques = rows.splice(0, numQues);
	var arr=[];
	for(var i=0; i<ques.length; i++)
	{
		arr.push(Number(ques[i].duration));
	}

	connection.query('SELECT * from mcqbank where qid in (' + arr.toString() + ');', function(err, rows2, fields2) {
	connection.end();
	  if (!err)
	    console.log('Question Query Done.');
	  else
	    console.log('Error while performing Question Query.');

	  res.send(rows2);
	});


  });
});

function random(maxval)
{
	return Math.floor(Math.random()*(maxval-1));
}

app.listen(3000);