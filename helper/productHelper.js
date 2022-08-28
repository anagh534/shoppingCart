const mongoose = require('mongoose');
const Schema = mongoose.Schema

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    discription: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    }
})

const product = mongoose.model('product', productSchema);
module.exports = product;