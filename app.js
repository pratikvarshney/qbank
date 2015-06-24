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

function random(maxval)
{
	return Math.floor(Math.random()*(maxval-1));
}


function secondsToString(sec)
{
	return Math.floor(sec/3600) + ':' + Math.floor((sec%3600)/60) + ':' + (sec%60);
}

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

var numQues = req.body.numques.toString();
var totalDuration = Number(req.body.dur) * 60;

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
		arr.push(Number(ques[i].qid));
	}

	connection.query('SELECT * from mcqbank where qid in (' + arr.toString() + ');', function(err, rows2, fields2) {
	connection.end();
	  if (!err)
	    console.log('Question Query Done.');
	  else
	    console.log('Error while performing Question Query.');

	  //res.send(rows2);

	  //PDF
		var PDFDocument = require('pdfkit');
		var fs = require('fs');
		var doc = new PDFDocument();

		var stream = doc.pipe(fs.createWriteStream('output.pdf'));
		 
		doc.fontSize(40).text('Question Paper', {'align':'center'});
		doc.moveDown().fontSize(20).text('Total Questions = ' + numQues);
		doc.moveDown().fontSize(20).text('Total Duration = ' + Math.floor(totalDuration/3600) + ' Hours ' + Math.floor((totalDuration%3600)/60) + ' Minutes ' + (totalDuration%60) + ' Seconds');
		 
		doc.addPage().fontSize(20);

		for(var i=0; i<rows2.length; i++)
		{
			doc.moveDown().text('Q ' + (i+1) + ': ' + rows2[i].question.toString());
			doc.text(secondsToString(rows2[i].duration), {'align':'right'});
			doc.moveDown().text('a) ' + rows2[i].opt1);
			doc.moveDown().text('b) ' + rows2[i].opt2);
			doc.moveDown().text('c) ' + rows2[i].opt3);
			doc.moveDown().text('d) ' + rows2[i].opt4);
			doc.moveDown();
		}

		doc.end();

		stream.on('finish', function() {
		  console.log('Done');
		  res.download('output.pdf');
		});
		//End PDF
	});


  });
});

app.listen(3000);