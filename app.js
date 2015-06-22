var express    = require("express");
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'pass',
  database : 'db1'
});
var app = express();

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
connection.query('SELECT * from mcqbank', function(err, rows, fields) {
connection.end();
  if (!err)
    console.log('The solution is: ', rows);
  else
    console.log('Error while performing Query.');

	var result = rows[0].question.toString();
	res.send(rows);

  });
});

app.listen(3000);