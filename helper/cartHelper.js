const mongoose = require('mongoose')
const Schema = mongoose.Schema

const cartSchema = new Schema({
    userId:{
        type: Object,
        required: true
    },
    products:{
        type: Array,
        required: true
    }
})
const cart = mongoose.model('cart',cartSchema)
module.exports = cart