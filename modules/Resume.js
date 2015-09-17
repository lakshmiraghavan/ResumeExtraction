/**
 * Created by lakshmi on 9/9/15.
 */
var mongoose = require('mongoose');
var Resume = mongoose.model('resume', {
    name:  {
        type: String,
        unique: true,
        require: true
    },
    creationDate:Date,
    processDate:Date,
    status:String,
    email: String,
    phone: String,
    uuid: String

});
module.exports = Resume;


