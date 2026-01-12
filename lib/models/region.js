const generate = require('nanoid/generate')
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoConnections = require('../connections/mongo')

const Region = new mongoose.Schema({
    name: { type: String, required: true },
    nameAlias: {type: String, required: true},
    key: { type: String, require: true },
    order: { type: Number, default: 0 },
    active: { type: Number, default: 1 }, // 1: active, 0: inactive
    location: {
        lat: {type: Number},
        lng: {type: Number}
    },
    createdAt: { type: Number, default: Date.now },
    updatedAt: { type: Number, default: Date.now }
}, { id: false, versionKey: false })



module.exports = mongoConnections('master').model('Region', Region);
