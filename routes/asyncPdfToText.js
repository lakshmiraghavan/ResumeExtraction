/**
 * Created by Alejandro on 9/4/15.
 */

var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var uuid = require ('uuid');
var async = require('async');
var mv = require('mv');
var Resume = require('../modules/Resume');
var asyncTasks = [];
var pathToPdf = path.join(__dirname, '../pathToPdf/');
var intermediate = path.join(__dirname, '../intermediate/');
var saveTo = path.join(__dirname, '../saveTo/');
var spawn = require('child_process').spawn;
var batch;
var uniqueId;
var arrId = {};
var phoneMatch = /\({0,1}\s*\d{3}?\s*\){0,1}\-*\s*\d{3}?\s*\-*(\-\?)*\s*\d{4}/;
var emailMatch =  /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;

function getPdfToText(file, uniqueId, callback) {
    var fileName = file.slice(0,-4);

    var pdftotext = spawn('pdftotext', [pathToPdf + fileName +'.pdf', saveTo + fileName + '.txt'],  {cwd: 'C:/Program Files/Xpdf/bin64'});
    pdftotext.on('close', function (code) {
        //if(code!=0) callback(code)
        Resume.findByIdAndUpdate(uniqueId, {status:'1'}, function (err, response) {
            if (err) {
                console.log("Something broke", + " " + err);
            } else {

                console.log("Success");
            }
        });
        callback();
    });
}

function updateStatus(id,obj){
    Resume.findByIdAndUpdate(id, obj, function (err, response) {

        if (err) {
            console.log("Something broke while updating status", + " " + err);
        } else {

            console.log("Successfully updated status");
        }
    });

}

function extractDataAndSave(path, id) {
    //log into mongo start of process
    updateStatus(id,{status:'2'});

    fs.readFile(path, "utf-8", function(err, data) {
        if (err) console.log(err);
        console.log('name from extract:', path);
        var phoneNumber;
        var email;
        phoneNumber = phoneMatch.exec(data.toString());
        console.log('nullCheck: ' + (phoneNumber == null));
        if (phoneNumber !== null){
            phoneNumber = phoneNumber[0];
        }
        else phoneNumber = 'NA';
        //console.log('phone number is', phoneNumber);
        email = emailMatch.exec(data.toString())[0];
        //log into mongo end of process
        updateStatus(id,{status:'3', processDate: Date.now(), email: email, phone: phoneNumber });
    });
}

function saveMongo(obj){
    (new Resume(obj)).save(function (err, response) {
        if (err) {
            console.log('Error while inserting: ' + obj.name + " " +err);
        } else {
            console.log('Resume successfully inserted');
        }
    });
    return Resume(obj);
}

function moveFiles(source, destination) {
    fs.readdir(pathToPdf, function (err, files) {
        if (err){
            console.log('Error while reading files');

        }
        else{
            var count = 0;
            files.forEach(function (file) {
                mv(source + file, destination + file, function (err) {
                    if (err) {
                        console.log("Error while moving files")
                    }
                })

            });
        }
    });
    return true;
}

router.get('/', function(req, res, next){

    //moveFiles(pathToPdf, intermediate);

    fs.readdir(pathToPdf, function(err, files) {

        if (err) return;

        var count = 0;
        files.forEach(function(file){
            if( count % 5 === 0){

                batch = uuid.v4();
            }
            count++;

            var filename = file.slice(0,-4);
            var newResumeObj= {name: filename, status: '0', creationDate:Date.now(), uuid:batch };

            newResumeObj = saveMongo(new Resume(newResumeObj));
            uniqueId = newResumeObj._id;
            arrId[filename] = uniqueId ;
            console.log("ID",uniqueId);
            asyncTasks.push(function(callback){
                // Call an async function
                getPdfToText(file,uniqueId,function(){
                    callback();
                });
            });
        });

        async.parallelLimit(asyncTasks,5, function(){
            files.forEach(function(fileName){
                var fileName = fileName.slice(0,-4);
                var path = saveTo + fileName +'.txt';
                var id = arrId[fileName];

                extractDataAndSave(path, id);
            });
            return true;

        });

    });
    res.status(202).render('index',{title: "Resume Extractor"});
});

module.exports = router;