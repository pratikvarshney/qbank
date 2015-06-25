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
	return Math.floor(Math.random()*Number.MAX_SAFE_INTEGER)%maxval;
}


function secondsToString(sec)
{
	return Math.floor(sec/3600) + ':' + Math.floor((sec%3600)/60) + ':' + (sec%60);
}

function durationToString(sec)
{
	return Math.floor(sec/3600) + ' Hours ' + Math.floor((sec%3600)/60) + ' Minutes ' + (sec%60) + ' Seconds';

}

function diff(a, b)
{
	if(a>b) return a-b;
	return b-a;
}

function minTimeIndex(arr, start, end)
{
	var min=start;
	for(var i=start+1; i<=end; i++)
	{
		if(arr[min].duration>arr[i].duration)
		{
			min = i;
		}
	}
	return min;
}

function maxTimeIndex(arr, start, end)
{
	var max=start;
	for(var i=start+1; i<=end; i++)
	{
		if(arr[max].duration<arr[i].duration)
		{
			max = i;
		}
	}
	return max;
}

function getQuesArr(rows, numQues, totalDuration)
{
	//get random ques
	var quesArr = [];
	for(var i=0; i<numQues; i++)
	{
		var r = random(rows.length);
		quesArr.push(rows.splice(r, 1)[0]);
	}

	//something similar to simulated annealing
	var currentSUM = 0;
	for(var i=0; i<numQues; i++)
	{
		currentSUM += Number(quesArr[i].duration);
	}
	var deletedArr=[];

	while((diff(currentSUM, totalDuration) > (0.10 * totalDuration)) && rows.length>0)
	{
		var maxTry = 10;
		if(currentSUM>totalDuration)
		{
			var maxIndex = maxTimeIndex(quesArr, 0, quesArr.length-1);
			var randomIndex;
			for(var t=0; t<maxTry; t++)
			{
				randomIndex = random(rows.length);
				if(Number(quesArr[maxIndex].duration) > Number(rows[randomIndex].duration))
				{
					break;
				}
			}
			if(Number(quesArr[maxIndex].duration) > Number(rows[randomIndex].duration))
			{
				
				currentSUM -= Number(quesArr[maxIndex].duration);
				currentSUM += Number(rows[randomIndex].duration);
				deletedArr.push(quesArr.splice(maxIndex, 1)[0]);
				quesArr.push(rows.splice(randomIndex, 1)[0]);
			}
			else break;
		}
		else
		{
			var minIndex = minTimeIndex(quesArr, 0, quesArr.length-1);
			var randomIndex;
			for(var t=0; t<maxTry; t++)
			{
				randomIndex = random(rows.length);
				if(Number(quesArr[minIndex].duration) < Number(rows[randomIndex].duration))
				{
					break;
				}
			}
			if(Number(quesArr[minIndex].duration) < Number(rows[randomIndex].duration))
			{
				
				currentSUM -= Number(quesArr[minIndex].duration);
				currentSUM += Number(rows[randomIndex].duration);
				deletedArr.push(quesArr.splice(minIndex, 1)[0]);
				quesArr.push(rows.splice(randomIndex, 1)[0]);
			}
			else break;
		}
	}

	//get ques
	var arr=[];
	for(var i=0; i<quesArr.length; i++)
	{
		arr.push(Number(quesArr[i].qid));
	}
	return arr;
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

	var numSub = Number(req.body.numsub);
	var numMCQ = Number(req.body.nummcq);

	var totalDuration = Number(req.body.dur) * 60;


connection.query('SELECT * from subqbank order by RAND() limit '+ numSub, function(errSub, rowsSub, fieldsSub) {
  if (!errSub)
    console.log('Subjective Query Done.');
  else
    console.log('Error while performing Subjective Query.');

	var totalSubDuration = 0;
	for(var i=0; i<rowsSub.length; i++)
	{
		totalSubDuration += Number(rowsSub[i].duration);
	}
	var totalMCQDuration = totalDuration - totalSubDuration;

connection.query('SELECT qid,duration from mcqbank order by duration', function(errMCQ, rowsMCQ, fieldsMCQ) {
  if (!errMCQ)
    console.log('Query Done.');
  else
    console.log('Error while performing Query.');

	var arr = getQuesArr(rowsMCQ, numMCQ, totalMCQDuration);

	connection.query('SELECT * from mcqbank where qid in (' + arr.toString() + ');', function(err, rows2, fields2) {
	connection.end();
	  if (!err)
	    console.log('Question Query Done.');
	  else
	    console.log('Error while performing Question Query.');

	  //PDF
		var PDFDocument = require('pdfkit');
		var fs = require('fs');
		var doc = new PDFDocument();

		var stream = doc.pipe(fs.createWriteStream('output.pdf'));
		 
		doc.fontSize(40).text('Question Paper', {'align':'center'});
		doc.moveDown().fontSize(20).text('Total MCQ Questions = ' + numMCQ);
		doc.moveDown().fontSize(20).text('Total Subjective Questions = ' + numSub);
		doc.moveDown().fontSize(20).text('Total Duration = ' + durationToString(totalDuration));

		var estimatedMCQDuration = 0;
		for(var i=0; i<rows2.length; i++)
		{
			estimatedMCQDuration += Number(rows2[i].duration);
		}
		
		doc.moveDown().moveDown().fontSize(16).text('Estimated Total Duration = ' + durationToString(estimatedMCQDuration+totalSubDuration));

		doc.addPage();
		doc.fontSize(40).text('Multiple Choice Questions', {'align':'center'});
		doc.fontSize(14);

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

		doc.addPage();
		doc.fontSize(40).text('Subjective Questions', {'align':'center'});
		doc.fontSize(14);

		for(var i=0; i<rowsSub.length; i++)
		{
			doc.moveDown().text('Q ' + (i+1) + ': ' + rowsSub[i].question.toString());
			doc.text(secondsToString(rowsSub[i].duration), {'align':'right'});
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
});

app.listen(3000);