const mongoose = require('mongoose');
const Schema = mongoose.Schema

const orderSchema = new Schema({
    deliveryDetails: {
        mobile: {
            type: Number,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        pincode: {
            type: Number,
            required: true
        }
    },
    userId: {
        type: Object,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    products: {
        type: Array,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now()
    }
})

const order = mongoose.model('order', orderSchema)
module.exports = order